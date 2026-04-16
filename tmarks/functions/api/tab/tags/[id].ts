/**
 *  API - 
 * : /api/tab/tags/:id
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../../lib/types'
import { success, badRequest, notFound, noContent, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { sanitizeString } from '../../../lib/validation'

interface UpdateTagRequest {
  name?: string
  color?: string
}

// GET /api/tags/:id - 
export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('tags.read'),
  async (context) => {
    const userId = context.data.user_id
    const tagId = context.params.id

    try {
      const tag = await context.env.DB.prepare(
        `SELECT
          t.id,
          t.name,
          t.color,
          t.created_at,
          t.updated_at,
          COUNT(bt.bookmark_id) as bookmark_count
        FROM tags t
        LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id AND bt.user_id = t.user_id
        LEFT JOIN bookmarks b ON bt.bookmark_id = b.id AND b.deleted_at IS NULL
        WHERE t.id = ? AND t.user_id = ? AND t.deleted_at IS NULL
        GROUP BY t.id`
      )
        .bind(tagId, userId)
        .first()

      if (!tag) {
        return notFound('Tag not found')
      }

      return success({ tag })
    } catch (error) {
      console.error('Get tag error:', error)
      return internalError('Failed to get tag')
    }
  },
]

// PATCH /api/tags/:id - 
export const onRequestPatch: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('tags.update'),
  async (context) => {
    const userId = context.data.user_id
    const tagId = context.params.id

    try {
      const existing = await context.env.DB.prepare(
        'SELECT id FROM tags WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
      )
        .bind(tagId, userId)
        .first()

      if (!existing) {
        return notFound('Tag not found')
      }

      const body = (await context.request.json()) as UpdateTagRequest
      const updates: string[] = []
      const values: SQLParam[] = []

      // 
      if (body.name !== undefined) {
        if (!body.name.trim()) {
          return badRequest('Tag name cannot be empty')
        }
        const name = sanitizeString(body.name, 50)

        // 
        const duplicate = await context.env.DB.prepare(
          'SELECT id FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id != ? AND deleted_at IS NULL'
        )
          .bind(userId, name, tagId)
          .first()

        if (duplicate) {
          return badRequest('Tag with this name already exists')
        }

        updates.push('name = ?')
        values.push(name)
      }

      // 
      if (body.color !== undefined) {
        updates.push('color = ?')
        values.push(body.color ? sanitizeString(body.color, 20) : null)
      }

      if (updates.length === 0) {
        return badRequest('No fields to update')
      }

      const now = new Date().toISOString()
      updates.push('updated_at = ?')
      values.push(now)
      values.push(tagId, userId)

      await context.env.DB.prepare(
        `UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
      )
        .bind(...values)
        .run()

      const tag = await context.env.DB.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
        .bind(tagId, userId)
        .first()

      return success({ tag })
    } catch (error) {
      console.error('Update tag error:', error)
      return internalError('Failed to update tag')
    }
  },
]

// DELETE /api/tags/:id - 
export const onRequestDelete: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('tags.delete'),
  async (context) => {
    const userId = context.data.user_id
    const tagId = context.params.id

    try {
      const existing = await context.env.DB.prepare(
        'SELECT id FROM tags WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
      )
        .bind(tagId, userId)
        .first()

      if (!existing) {
        return notFound('Tag not found')
      }

      const now = new Date().toISOString()

      // 
      await context.env.DB.prepare(
        'UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?'
      )
        .bind(now, now, tagId, userId)
        .run()

      await context.env.DB.prepare('DELETE FROM bookmark_tags WHERE tag_id = ? AND user_id = ?')
        .bind(tagId, userId)
        .run()

      return noContent()
    } catch (error) {
      console.error('Delete tag error:', error)
      return internalError('Failed to delete tag')
    }
  },
]
