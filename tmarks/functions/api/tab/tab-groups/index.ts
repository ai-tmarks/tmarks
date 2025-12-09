/**
 * 对外 API - 标签页组操作
 * 路径: /api/tab/tab-groups
 * 认证: API Key (X-API-Key header) 或 JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../../lib/types'
import { success, created, internalError } from '../../../lib/response'
import { requireDualAuth, DualAuthContext } from '../../../middleware/dual-auth'
import { sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'

interface TabGroupRow {
  id: string
  user_id: string
  title: string
  color: string | null
  tags: string | null
  parent_id: string | null
  is_folder: number
  is_deleted: number
  deleted_at: string | null
  position: number
  created_at: string
  updated_at: string
}

interface TabGroupItemRow {
  id: string
  group_id: string
  title: string
  url: string
  favicon: string | null
  position: number
  created_at: string
}

interface CreateTabGroupRequest {
  title?: string
  parent_id?: string | null
  is_folder?: boolean
  items?: Array<{
    title: string
    url: string
    favicon?: string
  }>
}

// GET /api/tab/tab-groups - 获取标签页组列表
export const onRequestGet: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)

    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '30'), 100)
    const pageCursor = url.searchParams.get('page_cursor') || ''

    try {
      // Try to query with is_deleted column first
      let groups: TabGroupRow[] = []
      try {
        let query = `
          SELECT *
          FROM tab_groups
          WHERE user_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
        `
        const params: SQLParam[] = [userId]

        // Pagination
        if (pageCursor) {
          query += ` AND created_at < ?`
          params.push(pageCursor)
        }

        query += ` ORDER BY created_at DESC LIMIT ?`
        params.push(pageSize + 1)

        const result = await context.env.DB.prepare(query)
          .bind(...params)
          .all<TabGroupRow>()
        groups = result.results
      } catch {
        // Fallback: query without is_deleted column
        let query = `
          SELECT *
          FROM tab_groups
          WHERE user_id = ?
        `
        const params: SQLParam[] = [userId]

        // Pagination
        if (pageCursor) {
          query += ` AND created_at < ?`
          params.push(pageCursor)
        }

        query += ` ORDER BY created_at DESC LIMIT ?`
        params.push(pageSize + 1)

        const result = await context.env.DB.prepare(query)
          .bind(...params)
          .all<TabGroupRow>()
        groups = result.results
      }

      const hasMore = groups.length > pageSize
      const tabGroups = hasMore ? groups.slice(0, pageSize) : groups
      const nextCursor = hasMore ? tabGroups[tabGroups.length - 1].created_at : undefined

      // Get items for each group (with user_id verification for security)
      const groupsWithItems = await Promise.all(
        tabGroups.map(async (group) => {
          const { results: items } = await context.env.DB.prepare(
            `SELECT tgi.*
             FROM tab_group_items tgi
             JOIN tab_groups tg ON tgi.group_id = tg.id
             WHERE tgi.group_id = ? AND tg.user_id = ?
             ORDER BY COALESCE(tgi.is_pinned, 0) DESC, tgi.position ASC`
          )
            .bind(group.id, userId)
            .all<TabGroupItemRow>()

          // Parse tags
          let tags: string[] | null = null
          if (group.tags) {
            try {
              tags = JSON.parse(group.tags)
            } catch {
              tags = null
            }
          }

          return {
            ...group,
            tags,
            items: items || [],
            item_count: items?.length || 0,
          }
        })
      )

      return success({
        tab_groups: groupsWithItems,
        meta: {
          page_size: pageSize,
          next_cursor: nextCursor,
        },
      })
    } catch (error) {
      console.error('Get tab groups error:', error)
      return internalError('Failed to get tab groups')
    }
  },
]

// POST /api/tab/tab-groups - 创建标签页组
export const onRequestPost: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.create'),
  async (context) => {
    const userId = context.data.user_id

    try {
      const body = (await context.request.json()) as CreateTabGroupRequest

      const isFolder = body.is_folder || false

      // Validate: folders don't need items, but regular groups can be empty
      // 允许创建空的标签页组，用户可以稍后添加项目
      // if (!isFolder && (!body.items || body.items.length === 0)) {
      //   return badRequest('At least one tab item is required for non-folder groups')
      // }

      // Generate title if not provided (timestamp format for groups, "新文件夹" for folders)
      const now = new Date()
      const defaultTitle = body.title || (isFolder ? '新文件夹' : now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace(/\//g, '-'))

      const title = sanitizeString(defaultTitle, 200)
      const groupId = generateUUID()
      const timestamp = now.toISOString()
      const parentId = body.parent_id || null

      console.log('[TabGroups API tab] Creating tab group:', { 
        groupId, 
        userId, 
        authType: context.data.auth_type,
        title, 
        isFolder, 
        itemCount: body.items?.length || 0 
      })

      // Insert tab group or folder
      await context.env.DB.prepare(
        'INSERT INTO tab_groups (id, user_id, title, parent_id, is_folder, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
      )
        .bind(groupId, userId, title, parentId, isFolder ? 1 : 0, timestamp, timestamp)
        .run()

      console.log('[TabGroups API tab] Tab group inserted successfully')

      // Insert tab group items (only for non-folder groups)
      if (!isFolder && body.items && body.items.length > 0) {
        const itemInserts = body.items.map((item, index) => {
          const itemId = generateUUID()
          const itemTitle = sanitizeString(item.title, 500)
          const itemUrl = sanitizeString(item.url, 2000)
          const favicon = item.favicon ? sanitizeString(item.favicon, 2000) : null

          return context.env.DB.prepare(
            'INSERT INTO tab_group_items (id, group_id, title, url, favicon, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
            .bind(itemId, groupId, itemTitle, itemUrl, favicon, index, timestamp)
            .run()
        })

        await Promise.all(itemInserts)
        console.log('[TabGroups API tab] Inserted', body.items.length, 'items')
      }

      // Get created tab group with items
      const groupRow = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ?'
      )
        .bind(groupId)
        .first<TabGroupRow>()

      // Get items (with user_id verification for security)
      const { results: items } = await context.env.DB.prepare(
        `SELECT tgi.*
         FROM tab_group_items tgi
         JOIN tab_groups tg ON tgi.group_id = tg.id
         WHERE tgi.group_id = ? AND tg.user_id = ?
         ORDER BY tgi.position ASC`
      )
        .bind(groupId, userId)
        .all<TabGroupItemRow>()

      return created({
        tab_group: {
          ...groupRow,
          items: items || [],
          item_count: items?.length || 0,
        },
      })
    } catch (error) {
      console.error('Create tab group error:', error)
      return internalError('Failed to create tab group')
    }
  },
]

