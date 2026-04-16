/**
 *  API - 
 * : /api/v1/tab-groups/items/:id
 * : JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { sanitizeString } from '../../../../lib/validation'

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
  is_archived?: number
}

interface UpdateTabGroupItemRequest {
  title?: string
  is_pinned?: boolean
  is_todo?: boolean
  is_archived?: boolean
  position?: number
}

// PATCH /api/v1/tab-groups/items/:id - 
export const onRequestPatch: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const itemId = context.params.id

    try {
      const body = (await context.request.json()) as UpdateTabGroupItemRequest

      // Check if item exists and user has permission
      const item = await context.env.DB.prepare(
        `SELECT tgi.*, tg.user_id 
         FROM tab_group_items tgi
         JOIN tab_groups tg ON tgi.group_id = tg.id
         WHERE tgi.id = ?`
      )
        .bind(itemId)
        .first<TabGroupItemRow & { user_id: string }>()

      if (!item) {
        return notFound('Tab group item not found')
      }

      if (item.user_id !== userId) {
        return notFound('Tab group item not found')
      }

      // Build update query
      const updates: string[] = []
      const params: (string | number)[] = []

      if (body.title !== undefined) {
        updates.push('title = ?')
        params.push(sanitizeString(body.title, 500))
      }

      if (body.is_pinned !== undefined) {
        updates.push('is_pinned = ?')
        params.push(body.is_pinned ? 1 : 0)
        
        // If pinning, set position to 0 and shift others
        if (body.is_pinned) {
          await context.env.DB.prepare(
            'UPDATE tab_group_items SET position = position + 1 WHERE group_id = ? AND id != ?'
          )
            .bind(item.group_id, itemId)
            .run()
          
          updates.push('position = ?')
          params.push(0)
        }
      }

      if (body.is_todo !== undefined) {
        updates.push('is_todo = ?')
        params.push(body.is_todo ? 1 : 0)
      }

      if (body.is_archived !== undefined) {
        updates.push('is_archived = ?')
        params.push(body.is_archived ? 1 : 0)
      }

      if (body.position !== undefined) {
        updates.push('position = ?')
        params.push(body.position)
      }

      if (updates.length === 0) {
        return badRequest('No fields to update')
      }

      // Add item ID to params — use subquery to enforce ownership
      params.push(itemId, item.group_id, userId)

      // Execute update with ownership check via group
      await context.env.DB.prepare(
        `UPDATE tab_group_items SET ${updates.join(', ')} WHERE id = ? AND group_id IN (SELECT id FROM tab_groups WHERE id = ? AND user_id = ?)`
      )
        .bind(...params)
        .run()

      // Get updated item
      const updatedItem = await context.env.DB.prepare(
        `SELECT tgi.* FROM tab_group_items tgi
         JOIN tab_groups tg ON tgi.group_id = tg.id
         WHERE tgi.id = ? AND tg.user_id = ?`
      )
        .bind(itemId, userId)
        .first<TabGroupItemRow>()

      if (!updatedItem) {
        return internalError('Failed to load item after update')
      }

      return success({
        item: updatedItem,
        message: 'Item updated successfully',
      })
    } catch (error) {
      console.error('Update tab group item error:', error)
      return internalError('Failed to update tab group item')
    }
  },
]

// DELETE /api/v1/tab-groups/items/:id - 
export const onRequestDelete: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const itemId = context.params.id

    try {
      // Check if item exists and user has permission
      const item = await context.env.DB.prepare(
        `SELECT tgi.*, tg.user_id 
         FROM tab_group_items tgi
         JOIN tab_groups tg ON tgi.group_id = tg.id
         WHERE tgi.id = ?`
      )
        .bind(itemId)
        .first<TabGroupItemRow & { user_id: string }>()

      if (!item) {
        return notFound('Tab group item not found')
      }

      if (item.user_id !== userId) {
        return notFound('Tab group item not found')
      }

      // Delete item with ownership check
      await context.env.DB.prepare(
        'DELETE FROM tab_group_items WHERE id = ? AND group_id IN (SELECT id FROM tab_groups WHERE id = ? AND user_id = ?)'
      )
        .bind(itemId, item.group_id, userId)
        .run()

      // Reorder remaining items
      await context.env.DB.prepare(
        'UPDATE tab_group_items SET position = position - 1 WHERE group_id = ? AND position > ?'
      )
        .bind(item.group_id, item.position)
        .run()

      return success({
        message: 'Item deleted successfully',
      })
    } catch (error) {
      console.error('Delete tab group item error:', error)
      return internalError('Failed to delete tab group item')
    }
  },
]
