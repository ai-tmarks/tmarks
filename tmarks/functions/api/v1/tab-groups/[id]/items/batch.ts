/**
 * 公开 API - 批量添加标签页项到分组
 * 路径: /api/v1/tab-groups/:id/items/batch
 * 认证: JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../../middleware/auth'
import { sanitizeString } from '../../../../../lib/validation'
import { generateUUID } from '../../../../../lib/crypto'

interface TabGroupRow {
  id: string
  user_id: string
  title: string
}

interface BatchAddItemsRequest {
  items: Array<{
    title: string
    url: string
    favicon?: string
  }>
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

// POST /api/v1/tab-groups/:id/items/batch - 批量添加标签页项
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      const body = (await context.request.json()) as BatchAddItemsRequest

      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return badRequest('items array is required and must not be empty')
      }

      // Verify group exists and belongs to user
      const group = await context.env.DB.prepare(
        'SELECT id, user_id, title FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      // Get current max position
      const maxPositionResult = await context.env.DB.prepare(
        'SELECT MAX(position) as max_position FROM tab_group_items WHERE group_id = ?'
      )
        .bind(groupId)
        .first<{ max_position: number | null }>()

      let currentPosition = (maxPositionResult?.max_position ?? -1) + 1

      // Insert items
      const insertedItems: TabGroupItemRow[] = []
      const now = new Date().toISOString()

      for (const item of body.items) {
        if (!item.url || !item.title) {
          continue // Skip invalid items
        }

        const itemId = generateUUID()
        const sanitizedTitle = sanitizeString(item.title, 500)
        const sanitizedUrl = sanitizeString(item.url, 2000)
        const sanitizedFavicon = item.favicon ? sanitizeString(item.favicon, 2000) : null

        await context.env.DB.prepare(
          `INSERT INTO tab_group_items (id, group_id, title, url, favicon, position, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(itemId, groupId, sanitizedTitle, sanitizedUrl, sanitizedFavicon, currentPosition, now)
          .run()

        insertedItems.push({
          id: itemId,
          group_id: groupId,
          title: sanitizedTitle,
          url: sanitizedUrl,
          favicon: sanitizedFavicon,
          position: currentPosition,
          created_at: now,
        })

        currentPosition++
      }

      return success({
        message: 'Items added successfully',
        added_count: insertedItems.length,
        total_items: currentPosition,
        items: insertedItems,
      })
    } catch (error) {
      console.error('Batch add items error:', error)
      return internalError('Failed to add items to group')
    }
  },
]
