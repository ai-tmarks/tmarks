/**

 * : /api/tab/bookmarks/trash/empty
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../../lib/types'
import { success, internalError } from '../../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../../middleware/api-key-auth-pages'

export const onRequestDelete: PagesFunction<Env, string, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.delete'),
  async (context) => {
    const userId = context.data.user_id

    try {

      const { results: trashBookmarks } = await context.env.DB.prepare(
        'SELECT id FROM bookmarks WHERE user_id = ? AND deleted_at IS NOT NULL'
      )
        .bind(userId)
        .all<{ id: string }>()

      if (trashBookmarks.length === 0) {
        return success({ message: 'Trash is already empty', count: 0 })
      }

      const bookmarkIds = trashBookmarks.map(b => b.id)

      // 
      for (const id of bookmarkIds) {
        await context.env.DB.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?')
          .bind(id)
          .run()
      }

      // 
      for (const id of bookmarkIds) {
        await context.env.DB.prepare('DELETE FROM bookmark_snapshots WHERE bookmark_id = ?')
          .bind(id)
          .run()
      }

      // 
      await context.env.DB.prepare(
        'DELETE FROM bookmarks WHERE user_id = ? AND deleted_at IS NOT NULL'
      )
        .bind(userId)
        .run()

      return success({
        message: 'Trash emptied successfully',
        count: bookmarkIds.length,
      })
    } catch (error) {
      console.error('Empty trash error:', error)
      return internalError('Failed to empty trash')
    }
  },
]
