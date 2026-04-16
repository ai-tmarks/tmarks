/**
 *  API - 
 * : /api/tab/tags/:id/click
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../../middleware/api-key-auth-pages'

// PATCH /api/tags/:id/click - 
export const onRequestPatch: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('tags.update'),
  async (context) => {
    const userId = context.data.user_id
    const tagId = context.params.id

    try {
      // 
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
        `UPDATE tags 
         SET click_count = click_count + 1, 
             last_clicked_at = ?,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
        .bind(now, now, tagId, userId)
        .run()

      return success({ message: 'Click count incremented' })
    } catch (error) {
      console.error('Increment tag click count error:', error)
      return internalError('Failed to increment click count')
    }
  },
]
