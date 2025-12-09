/**
 * 内部 API - 单个标签页组操作
 * 路径: /api/tab/tab-groups/:id
 * 认证: API Key (X-API-Key header) 或 JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../lib/response'
import { requireDualAuth, DualAuthContext } from '../../../middleware/dual-auth'
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
}

interface UpdateTabGroupRequest {
  title?: string
  color?: string | null
  tags?: string[] | null
  parent_id?: string | null
  position?: number
}

// GET /api/tab/tab-groups/:id - 获取单个标签页组详情
export const onRequestGet: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.read'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Get tab group (exclude deleted by default)
      let groupRow: TabGroupRow | null = null
      try {
        groupRow = await context.env.DB.prepare(
          'SELECT * FROM tab_groups WHERE id = ? AND user_id = ? AND (is_deleted IS NULL OR is_deleted = 0)'
        )
          .bind(groupId, userId)
          .first<TabGroupRow>()
      } catch {
        // Fallback: query without is_deleted column
        groupRow = await context.env.DB.prepare(
          'SELECT * FROM tab_groups WHERE id = ? AND user_id = ?'
        )
          .bind(groupId, userId)
          .first<TabGroupRow>()
      }

      if (!groupRow) {
        return notFound('Tab group not found')
      }

      // Parse tags if exists
      let tags: string[] | null = null
      if (groupRow.tags) {
        try {
          tags = JSON.parse(groupRow.tags)
        } catch {
          tags = null
        }
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
          tags,
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

// PATCH /api/tab/tab-groups/:id - 更新标签页组
export const onRequestPatch: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.update'),
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

      // Update tab group
      const updates: string[] = []
      const params: (string | number | null)[] = []

      if (body.title !== undefined) {
        updates.push('title = ?')
        params.push(sanitizeString(body.title, 200))
      }

      // Only add color/tags if they exist in the request
      // Try to update, if column doesn't exist, skip silently
      let hasColorOrTags = false
      if (body.color !== undefined) {
        updates.push('color = ?')
        params.push(body.color)
        hasColorOrTags = true
      }

      if (body.tags !== undefined) {
        updates.push('tags = ?')
        params.push(body.tags ? JSON.stringify(body.tags) : null)
        hasColorOrTags = true
      }

      if (body.parent_id !== undefined) {
        updates.push('parent_id = ?')
        params.push(body.parent_id)
      }

      if (body.position !== undefined) {
        updates.push('position = ?')
        params.push(body.position)
      }

      if (updates.length === 0) {
        return badRequest('No fields to update')
      }

      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(groupId)

      // Add user_id to WHERE clause params
      params.push(userId)

      try {
        await context.env.DB.prepare(
          `UPDATE tab_groups SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        )
          .bind(...params)
          .run()
      } catch (e) {
        // If update fails (likely due to missing columns), try without color/tags
        if (hasColorOrTags && body.title !== undefined) {
          await context.env.DB.prepare(
            'UPDATE tab_groups SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?'
          )
            .bind(sanitizeString(body.title, 200), new Date().toISOString(), groupId, userId)
            .run()
        } else {
          throw e
        }
      }

      // Get updated tab group with items
      const updatedGroup = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ?'
      )
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

// DELETE /api/tab/tab-groups/:id - 软删除标签页组（移到回收站）
export const onRequestDelete: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.delete'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Check if tab group exists and belongs to user
      let groupRow: TabGroupRow | null = null
      try {
        groupRow = await context.env.DB.prepare(
          'SELECT * FROM tab_groups WHERE id = ? AND user_id = ? AND (is_deleted IS NULL OR is_deleted = 0)'
        )
          .bind(groupId, userId)
          .first<TabGroupRow>()
      } catch {
        // Fallback: query without is_deleted column
        groupRow = await context.env.DB.prepare(
          'SELECT * FROM tab_groups WHERE id = ? AND user_id = ?'
        )
          .bind(groupId, userId)
          .first<TabGroupRow>()
      }

      if (!groupRow) {
        return notFound('Tab group not found')
      }

      // Soft delete - mark as deleted (only if column exists)
      try {
        await context.env.DB.prepare(
          'UPDATE tab_groups SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?'
        )
          .bind(new Date().toISOString(), new Date().toISOString(), groupId)
          .run()
      } catch {
        // If is_deleted column doesn't exist, do hard delete
        await context.env.DB.prepare('DELETE FROM tab_groups WHERE id = ?')
          .bind(groupId)
          .run()
      }

      return new Response(null, { status: 204 })
    } catch (error) {
      console.error('Delete tab group error:', error)
      return internalError('Failed to delete tab group')
    }
  },
]

