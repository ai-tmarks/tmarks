/**
 * 对外 API - 单个标签页组操作
 * 路径: /api/v1/tab-groups/:id
 * 认证: API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import { success, badRequest, notFound, noContent, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { sanitizeString } from '../../../lib/validation'

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

interface UpdateTabGroupRequest {
  title?: string
}

// GET /api/v1/tab-groups/:id - 获取单个标签页组详情
export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Get tab group
      const groupRow = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!groupRow) {
        return notFound('Tab group not found')
      }

      // Get tab group items
      const { results: items } = await context.env.DB.prepare(
        'SELECT * FROM tab_group_items WHERE group_id = ? ORDER BY position ASC'
      )
        .bind(groupId)
        .all<TabGroupItemRow>()

      return success({
        tab_group: {
          ...groupRow,
          items: items || [],
          item_count: items?.length || 0,
        },
      })
    } catch (error) {
      console.error('Get tab group error:', error)
      return internalError('Failed to get tab group')
    }
  },
]

// PATCH /api/v1/tab-groups/:id - 更新标签页组
export const onRequestPatch: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.update'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      const body = (await context.request.json()) as UpdateTabGroupRequest

      // Check if tab group exists and belongs to user
      const groupRow = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!groupRow) {
        return notFound('Tab group not found')
      }

      // Build update query
      const updates: string[] = []
      const params: any[] = []

      if (body.title !== undefined) {
        updates.push('title = ?')
        params.push(sanitizeString(body.title, 200))
      }

      if (updates.length === 0) {
        return badRequest('No valid fields to update')
      }

      // Always update updated_at
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())

      // Add WHERE clause params
      params.push(groupId, userId)

      await context.env.DB.prepare(
        `UPDATE tab_groups SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
      )
        .bind(...params)
        .run()

      // Fetch updated group with items
      const updatedGroup = await context.env.DB.prepare('SELECT * FROM tab_groups WHERE id = ?')
        .bind(groupId)
        .first<TabGroupRow>()

      const { results: items } = await context.env.DB.prepare(
        'SELECT * FROM tab_group_items WHERE group_id = ? ORDER BY position ASC'
      )
        .bind(groupId)
        .all<TabGroupItemRow>()

      if (!updatedGroup) {
        return internalError('Failed to load tab group after update')
      }

      return success({
        tab_group: {
          ...updatedGroup,
          items: items || [],
          item_count: items?.length || 0,
        },
      })
    } catch (error) {
      console.error('Update tab group error:', error)
      return internalError('Failed to update tab group')
    }
  },
]

// DELETE /api/v1/tab-groups/:id - 删除标签页组
export const onRequestDelete: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.delete'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Check if tab group exists and belongs to user
      const groupRow = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!groupRow) {
        return notFound('Tab group not found')
      }

      // Delete tab group (items will be cascade deleted)
      await context.env.DB.prepare('DELETE FROM tab_groups WHERE id = ? AND user_id = ?')
        .bind(groupId, userId)
        .run()

      return noContent()
    } catch (error) {
      console.error('Delete tab group error:', error)
      return internalError('Failed to delete tab group')
    }
  },
]

