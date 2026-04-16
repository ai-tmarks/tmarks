/**
 *  API - 
 * : /api/tab/bookmarks/:id/trash
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../../middleware/api-key-auth-pages'

// PATCH /api/tab/bookmarks/:id/trash - （）
export const onRequestPatch: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.delete'),
  async (context) => {
    const userId = context.data.user_id
    const bookmarkId = context.params.id

    try {
      // 
      const existing = await context.env.DB.prepare(
        'SELECT id FROM bookmarks WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
      )
        .bind(bookmarkId, userId)
        .first()

      if (!existing) {
        return notFound('Bookmark not found')
      }

      const now = new Date().toISOString()

      // ： deleted_at
      await context.env.DB.prepare(
        'UPDATE bookmarks SET deleted_at = ?, updated_at = ? WHERE id = ?'
      )
        .bind(now, now, bookmarkId)
        .run()

      return success({ message: 'Bookmark moved to trash' })
    } catch (error) {
      console.error('Trash bookmark error:', error)
      return internalError('Failed to trash bookmark')
    }
  },
]
