/**
 *  API
 * : /api/v1/bookmarks/:id/restore
 * : JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, BookmarkRow, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { normalizeBookmark } from '../../../../lib/bookmark-utils'

// PATCH /api/v1/bookmarks/:id/restore - 
export const onRequestPatch: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const bookmarkId = context.params.id

    try {
      // 
      const existing = await context.env.DB.prepare(
        'SELECT id FROM bookmarks WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL'
      )
        .bind(bookmarkId, userId)
        .first()

      if (!existing) {
        return notFound('Bookmark not found in trash')
      }

      const now = new Date().toISOString()

      // ： deleted_at
      await context.env.DB.prepare(
        'UPDATE bookmarks SET deleted_at = NULL, updated_at = ? WHERE id = ?'
      )
        .bind(now, bookmarkId)
        .run()

      // 
      const bookmarkRow = await context.env.DB.prepare(
        'SELECT * FROM bookmarks WHERE id = ?'
      )
        .bind(bookmarkId)
        .first<BookmarkRow>()

      if (!bookmarkRow) {
        return internalError('Failed to load bookmark after restore')
      }

      // 
      const { results: tags } = await context.env.DB.prepare(
        `SELECT t.id, t.name, t.color
         FROM tags t
         INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
         WHERE bt.bookmark_id = ? AND t.deleted_at IS NULL`
      )
        .bind(bookmarkId)
        .all<{ id: string; name: string; color: string | null }>()

      return success({
        bookmark: {
          ...normalizeBookmark(bookmarkRow),
          tags: tags || [],
        },
      })
    } catch (error) {
      console.error('Restore bookmark error:', error)
      return internalError('Failed to restore bookmark')
    }
  },
]
