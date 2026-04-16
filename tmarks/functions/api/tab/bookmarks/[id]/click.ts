/**
 *  API - 
 * : /api/tab/bookmarks/:id/click
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../../middleware/api-key-auth-pages'

// POST /api/tab/bookmarks/:id/click - 
export const onRequestPost: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.update'),
  async (context) => {
    const userId = context.data.user_id
    const bookmarkId = context.params.id

    try {
      const db = context.env.DB
      const now = new Date().toISOString()

      // 
      const bookmark = await db.prepare(
        'SELECT id FROM bookmarks WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
      )
        .bind(bookmarkId, userId)
        .first()

      if (!bookmark) {
        return notFound('Bookmark not found')
      }

      // ，
      await db.batch([
        db.prepare(
          'UPDATE bookmarks SET click_count = click_count + 1, last_clicked_at = ? WHERE id = ?'
        ).bind(now, bookmarkId),
        db.prepare(
          'INSERT INTO bookmark_click_events (bookmark_id, user_id, clicked_at) VALUES (?, ?, ?)'
        ).bind(bookmarkId, userId, now),
      ])

      return success({
        message: 'Click recorded successfully',
        clicked_at: now,
      })
    } catch (error) {
      console.error('Record bookmark click error:', error)
      return internalError('Failed to record click')
    }
  },
]
