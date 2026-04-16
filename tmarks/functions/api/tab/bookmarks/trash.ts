/**

 * : /api/tab/bookmarks/trash
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, BookmarkRow } from '../../../lib/types'
import { success, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { normalizeBookmark } from '../../../lib/bookmark-utils'

interface TrashQueryParams {
  page_size?: string
  page_cursor?: string
  sort?: string
}

export const onRequestGet: PagesFunction<Env, string, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)
    
    const params: TrashQueryParams = {
      page_size: url.searchParams.get('page_size') || undefined,
      page_cursor: url.searchParams.get('page_cursor') || undefined,
      sort: url.searchParams.get('sort') || undefined,
    }

    try {
      const pageSize = Math.min(Math.max(parseInt(params.page_size || '20', 10) || 20, 1), 100)
      const sort = params.sort === 'deleted_at_asc' ? 'ASC' : 'DESC'

      let query = `
        SELECT * FROM bookmarks 
        WHERE user_id = ? AND deleted_at IS NOT NULL
      `
      const queryParams: (string | number)[] = [userId]

      // 
      if (params.page_cursor) {
        query += ` AND deleted_at < ?`
        queryParams.push(params.page_cursor)
      }

      query += ` ORDER BY deleted_at ${sort} LIMIT ?`
      queryParams.push(pageSize + 1)

      const { results: bookmarks } = await context.env.DB.prepare(query)
        .bind(...queryParams)
        .all<BookmarkRow>()

      const hasMore = bookmarks.length > pageSize
      const items = hasMore ? bookmarks.slice(0, pageSize) : bookmarks

      const bookmarksWithTags = await Promise.all(
        items.map(async (bookmark) => {
          const { results: tags } = await context.env.DB.prepare(
            `SELECT t.id, t.name, t.color
             FROM tags t
             INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
             WHERE bt.bookmark_id = ? AND t.deleted_at IS NULL`
          )
            .bind(bookmark.id)
            .all<{ id: string; name: string; color: string | null }>()

          return {
            ...normalizeBookmark(bookmark),
            tags: tags || [],
          }
        })
      )

      // 
      const countResult = await context.env.DB.prepare(
        'SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ? AND deleted_at IS NOT NULL'
      )
        .bind(userId)
        .first<{ count: number }>()

      return success({
        bookmarks: bookmarksWithTags,
        meta: {
          total: countResult?.count || 0,
          page_size: pageSize,
          has_more: hasMore,
          next_cursor: hasMore && items.length > 0 ? items[items.length - 1].deleted_at : null,
        },
      })
    } catch (error) {
      console.error('Get trash bookmarks error:', error)
      return internalError('Failed to get trash bookmarks')
    }
  },
]
