/**
 * 对外 API - 标签页组操作
 * 路径: /api/v1/tab-groups
 * 认证: API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../../lib/types'
import { success, badRequest, created, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'

interface TabGroupRow {
  id: string
  user_id: string
  title: string
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
  is_pinned?: number
  is_todo?: number
}

interface CreateTabGroupRequest {
  title?: string
  items: Array<{
    title: string
    url: string
    favicon?: string
  }>
}

// GET /api/v1/tab-groups - 获取标签页组列表
export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)

    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '30'), 100)
    const pageCursor = url.searchParams.get('page_cursor') || ''

    try {
      // Build query
      let query = `
        SELECT
          tg.id,
          tg.user_id,
          tg.title,
          tg.created_at,
          tg.updated_at,
          COUNT(tgi.id) as item_count
        FROM tab_groups tg
        LEFT JOIN tab_group_items tgi ON tg.id = tgi.group_id
        WHERE tg.user_id = ?
      `
      const params: SQLParam[] = [userId]

      // Cursor pagination
      if (pageCursor) {
        query += ' AND tg.created_at < ?'
        params.push(pageCursor)
      }

      query += ' GROUP BY tg.id ORDER BY tg.created_at DESC LIMIT ?'
      params.push(pageSize + 1)

      const { results } = await context.env.DB.prepare(query)
        .bind(...params)
        .all<TabGroupRow & { item_count: number }>()

      const hasMore = results.length > pageSize
      const tabGroups = hasMore ? results.slice(0, pageSize) : results
      const nextCursor = hasMore ? tabGroups[tabGroups.length - 1].created_at : null

      return success({
        tab_groups: tabGroups.map((tg) => ({
          id: tg.id,
          user_id: tg.user_id,
          title: tg.title,
          created_at: tg.created_at,
          updated_at: tg.updated_at,
          item_count: tg.item_count,
        })),
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
export const onRequestPost: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.create'),
  async (context) => {
    const userId = context.data.user_id

    try {
      const body = (await context.request.json()) as CreateTabGroupRequest

      if (!body.items || body.items.length === 0) {
        return badRequest('At least one tab item is required')
      }

      // Generate title if not provided (timestamp format)
      const now = new Date()
      const defaultTitle = body.title || now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace(/\//g, '-')

      const title = sanitizeString(defaultTitle, 200)
      const groupId = generateUUID()
      const timestamp = now.toISOString()

      // Insert tab group
      await context.env.DB.prepare(
        'INSERT INTO tab_groups (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(groupId, userId, title, timestamp, timestamp)
        .run()

      // Insert tab group items
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

      // Fetch the created group with items
      const groupRow = await context.env.DB.prepare('SELECT * FROM tab_groups WHERE id = ?')
        .bind(groupId)
        .first<TabGroupRow>()

      const { results: items } = await context.env.DB.prepare(
        'SELECT * FROM tab_group_items WHERE group_id = ? ORDER BY position ASC'
      )
        .bind(groupId)
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

