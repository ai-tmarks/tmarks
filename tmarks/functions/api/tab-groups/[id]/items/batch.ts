/**
 * 内部 API - 批量添加标签页项到分组
 * 路径: /api/tab-groups/:id/items/batch
 * 认证: JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { sanitizeString } from '../../../../lib/validation'
import { generateUUID } from '../../../../lib/crypto'

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

// POST /api/tab-groups/:id/items/batch - 批量添加标签页项
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

      // 验证分组存在且属于当前用户
      const group = await context.env.DB.prepare(
        'SELECT id, user_id, title FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      // 获取当前最大 position
      const maxPositionResult = await context.env.DB.prepare(
        'SELECT MAX(position) as max_position FROM tab_group_items WHERE group_id = ?'
      )
        .bind(groupId)
        .first<{ max_position: number | null }>()

      let currentPosition = (maxPositionResult?.max_position ?? -1) + 1

      // 批量插入标签页项
      const timestamp = new Date().toISOString()
      const insertPromises = body.items.map((item) => {
        const itemId = generateUUID()
        const itemTitle = sanitizeString(item.title, 500)
        const itemUrl = sanitizeString(item.url, 2000)
        const favicon = item.favicon ? sanitizeString(item.favicon, 2000) : null

        const promise = context.env.DB.prepare(
          'INSERT INTO tab_group_items (id, group_id, title, url, favicon, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(itemId, groupId, itemTitle, itemUrl, favicon, currentPosition, timestamp)
          .run()

        currentPosition++
        return promise
      })

      await Promise.all(insertPromises)

      // 获取添加后的所有标签页项
      const { results: items } = await context.env.DB.prepare(
        'SELECT * FROM tab_group_items WHERE group_id = ? ORDER BY position ASC'
      )
        .bind(groupId)
        .all()

      return success({
        message: `Successfully added ${body.items.length} items`,
        added_count: body.items.length,
        total_items: items?.length || 0,
        items: items || [],
      })
    } catch (error) {
      console.error('Batch add items error:', error)
      return internalError('Failed to batch add items')
    }
  },
]
