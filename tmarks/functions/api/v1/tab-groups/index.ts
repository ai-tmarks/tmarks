/**
 *  API - 
 * : /api/v1/tab-groups
 * : JWT Token
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

// GET /api/v1/tab-groups
export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)

    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '30', 10) || 30, 100)
    const pageCursor = url.searchParams.get('page_cursor') || ''

    try {
      let query = `
        SELECT *
        FROM tab_groups
        WHERE user_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
      `
      const params: SQLParam[] = [userId]

      if (pageCursor) {
        query += ' AND created_at < ?'
        params.push(pageCursor)
      }

      query += ' ORDER BY created_at DESC LIMIT ?'
      params.push(pageSize + 1)

      const { results } = await context.env.DB.prepare(query)
        .bind(...params)
        .all<TabGroupRow>()

      const hasMore = results.length > pageSize
      const tabGroups = hasMore ? results.slice(0, pageSize) : results
      const nextCursor = hasMore ? tabGroups[tabGroups.length - 1].created_at : null

      // Batch fetch all items for returned groups (avoids N+1)
      const groupIds = tabGroups.map((g) => g.id)
      let allItems: TabGroupItemRow[] = []

      if (groupIds.length > 0) {
        const placeholders = groupIds.map(() => '?').join(',')
        const { results: items } = await context.env.DB.prepare(
          `SELECT tgi.*
           FROM tab_group_items tgi
           JOIN tab_groups tg ON tgi.group_id = tg.id
           WHERE tgi.group_id IN (${placeholders}) AND tg.user_id = ?
           ORDER BY COALESCE(tgi.is_pinned, 0) DESC, tgi.position ASC`
        )
          .bind(...groupIds, userId)
          .all<TabGroupItemRow>()
        allItems = items || []
      }

      // Group items by group_id in memory
      const itemsByGroup = new Map<string, TabGroupItemRow[]>()
      for (const item of allItems) {
        const arr = itemsByGroup.get(item.group_id) || []
        arr.push(item)
        itemsByGroup.set(item.group_id, arr)
      }

      const groupsWithItems = tabGroups.map((group) => {
        const items = itemsByGroup.get(group.id) || []
        return {
          ...group,
          items,
          item_count: items.length,
        }
      })

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

// POST /api/v1/tab-groups
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id

    try {
      const body = (await context.request.json()) as CreateTabGroupRequest

      const isFolder = body.is_folder || false

      const now = new Date()
      const defaultTitle = body.title || (isFolder ? '' : now.toLocaleString('zh-CN', {
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

      // Build all statements for atomic batch execution
      const stmts = [
        context.env.DB.prepare(
          'INSERT INTO tab_groups (id, user_id, title, parent_id, is_folder, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
        ).bind(groupId, userId, title, parentId, isFolder ? 1 : 0, timestamp, timestamp),
      ]

      if (!isFolder && body.items && body.items.length > 0) {
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i]
          const itemId = generateUUID()
          const itemTitle = sanitizeString(item.title, 500)
          const itemUrl = sanitizeString(item.url, 2000)
          const favicon = item.favicon ? sanitizeString(item.favicon, 2000) : null

          stmts.push(
            context.env.DB.prepare(
              'INSERT INTO tab_group_items (id, group_id, title, url, favicon, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(itemId, groupId, itemTitle, itemUrl, favicon, i, timestamp)
          )
        }
      }

      await context.env.DB.batch(stmts)

      // Fetch the created group with items
      const groupRow = await context.env.DB.prepare('SELECT * FROM tab_groups WHERE id = ?')
        .bind(groupId)
        .first<TabGroupRow>()

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
