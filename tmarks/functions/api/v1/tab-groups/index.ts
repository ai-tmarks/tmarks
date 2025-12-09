/**
 * 对外 API - 标签页组操作
 * 路径: /api/v1/tab-groups
 * 认证: JWT Token
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../../lib/types'
import { success, created, internalError } from '../../../lib/response'
import { requireAuth, AuthContext } from '../../../middleware/auth'
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

// 注意：此接口已与 /api/tab/tab-groups 保持完全一致

interface TabGroupItemRow {
  id: string
  group_id: string
  title: string
  url: string
  favicon: string | null
  position: number
  created_at: string
  is_pinned?: number
  is_todo?: number
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

// GET /api/v1/tab-groups - 获取标签页组列表
export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)

    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '30'), 100)
    const pageCursor = url.searchParams.get('page_cursor') || ''

    try {
      // Build query - 获取所有字段，过滤已删除的记录
      let query = `
        SELECT *
        FROM tab_groups
        WHERE user_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
      `
      const params: SQLParam[] = [userId]

      // Cursor pagination
      if (pageCursor) {
        query += ' AND created_at < ?'
        params.push(pageCursor)
      }

      query += ' ORDER BY created_at DESC LIMIT ?'
      params.push(pageSize + 1)

      console.log('[TabGroups API v1] Query params:', { userId, pageSize, pageCursor })
      console.log('[TabGroups API v1] Full query:', query)
      
      const { results } = await context.env.DB.prepare(query)
        .bind(...params)
        .all<TabGroupRow>()

      console.log('[TabGroups API v1] Found groups:', results.length)

      const hasMore = results.length > pageSize
      const tabGroups = hasMore ? results.slice(0, pageSize) : results
      const nextCursor = hasMore ? tabGroups[tabGroups.length - 1].created_at : null

      // Get items for each group
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

          console.log(`[TabGroups API v1] Group ${group.id} (${group.title}): ${items?.length || 0} items`)

          return {
            ...group,
            items: items || [],
            item_count: items?.length || 0,
          }
        })
      )

      return success({
        tab_groups: groupsWithItems,
        meta: {
          page_size: pageSize,
          count: tabGroups.length,
          next_cursor: nextCursor,
          has_more: hasMore,
        },
      })
    } catch (error) {
      console.error('Get tab groups error:', error)
      return internalError('Failed to get tab groups')
    }
  },
]

// POST /api/v1/tab-groups - 创建标签页组
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
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

      // Insert tab group or folder
      await context.env.DB.prepare(
        'INSERT INTO tab_groups (id, user_id, title, parent_id, is_folder, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
      )
        .bind(groupId, userId, title, parentId, isFolder ? 1 : 0, timestamp, timestamp)
        .run()

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
      }

      // Fetch the created group with items
      const groupRow = await context.env.DB.prepare('SELECT * FROM tab_groups WHERE id = ?')
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

      if (!groupRow) {
        return internalError('Failed to load tab group after creation')
      }

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

