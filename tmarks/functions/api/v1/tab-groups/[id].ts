/**
 * 对外 API - 单个标签页组操作
 * 路径: /api/v1/tab-groups/:id
 * 认证: JWT Token
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import { success, badRequest, notFound, noContent, internalError } from '../../../lib/response'
import { requireAuth, AuthContext } from '../../../middleware/auth'
import { sanitizeString } from '../../../lib/validation'

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

interface UpdateTabGroupRequest {
  title?: string
  color?: string | null
  tags?: string[] | null
  parent_id?: string | null
  position?: number
}

// GET /api/v1/tab-groups/:id - 获取单个标签页组详情
export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
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

      // Get tab group items (with user_id verification for security)
      const { results: items } = await context.env.DB.prepare(
        `SELECT tgi.*
         FROM tab_group_items tgi
         JOIN tab_groups tg ON tgi.group_id = tg.id
         WHERE tgi.group_id = ? AND tg.user_id = ?
         ORDER BY COALESCE(tgi.is_pinned, 0) DESC, tgi.position ASC`
      )
        .bind(groupId, userId)
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
export const onRequestPatch: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      let body: UpdateTabGroupRequest
      try {
        body = (await context.request.json()) as UpdateTabGroupRequest
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError)
        return badRequest('Invalid request body: ' + (parseError instanceof Error ? parseError.message : 'JSON parse error'))
      }

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
      const params: Array<string | number | null> = []

      if (body.title !== undefined) {
        updates.push('title = ?')
        params.push(sanitizeString(body.title, 200))
      }

      if (body.parent_id !== undefined) {
        updates.push('parent_id = ?')
        params.push(body.parent_id)
      }

      if (body.position !== undefined) {
        updates.push('position = ?')
        params.push(body.position)
      }

      if (body.color !== undefined) {
        updates.push('color = ?')
        params.push(body.color)
      }

      if (body.tags !== undefined) {
        updates.push('tags = ?')
        params.push(body.tags ? JSON.stringify(body.tags) : null)
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
        `SELECT tgi.*
         FROM tab_group_items tgi
         JOIN tab_groups tg ON tgi.group_id = tg.id
         WHERE tgi.group_id = ? AND tg.user_id = ?
         ORDER BY tgi.position ASC`
      )
        .bind(groupId, userId)
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
export const onRequestDelete: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
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

