/**
 * 对外 API - 全局搜索
 * 路径: /api/search
 * 认证: API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, Bookmark, RouteParams } from '../lib/types'
import { success, badRequest, internalError } from '../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../middleware/api-key-auth-pages'

// GET /api/search - 全局搜索书签和标签
type BookmarkWithTags = Bookmark & {
  tags: Array<{ id: string; name: string; color: string | null }>
}

export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)
    const query = url.searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return badRequest('Search query is required')
    }

    const searchTerm = `%${query.trim()}%`
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)

    try {
      // 搜索书签
      const { results: bookmarks } = await context.env.DB.prepare(
        `SELECT b.*
         FROM bookmarks b
         WHERE b.user_id = ? AND b.deleted_at IS NULL
         AND (b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ?)
         ORDER BY b.is_pinned DESC, b.updated_at DESC
         LIMIT ?`
      )
        .bind(userId, searchTerm, searchTerm, searchTerm, limit)
        .all<Bookmark>()

      // 优化：使用单次查询获取所有书签的标签
      let bookmarksWithTags: BookmarkWithTags[] = (bookmarks || []).map(bookmark => ({
        ...bookmark,
        tags: [],
      }))

      if (bookmarksWithTags.length > 0) {
        const bookmarkIds = bookmarksWithTags.map(b => b.id)

        // 一次性获取所有书签的标签
        const { results: allTags } = await context.env.DB.prepare(
          `SELECT
             bt.bookmark_id,
             t.id,
             t.name,
             t.color
           FROM tags t
           INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
           WHERE bt.bookmark_id IN (${bookmarkIds.map(() => '?').join(',')})
             AND t.deleted_at IS NULL
           ORDER BY bt.bookmark_id, t.name`
        )
          .bind(...bookmarkIds)
          .all<{ bookmark_id: string; id: string; name: string; color: string | null }>()

        // 将标签按书签ID分组
        const tagsByBookmarkId = new Map<string, Array<{ id: string; name: string; color: string | null }>>()
        for (const tag of allTags || []) {
          if (!tagsByBookmarkId.has(tag.bookmark_id)) {
            tagsByBookmarkId.set(tag.bookmark_id, [])
          }
          const tags = tagsByBookmarkId.get(tag.bookmark_id)
          if (tags) {
            tags.push({
              id: tag.id,
              name: tag.name,
              color: tag.color,
            })
          }
        }

        // 组装书签和标签数据
        bookmarksWithTags = bookmarksWithTags.map(bookmark => ({
          ...bookmark,
          tags: tagsByBookmarkId.get(bookmark.id) || [],
        }))
      }

      // 搜索标签
      const { results: tags } = await context.env.DB.prepare(
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
        WHERE t.user_id = ? AND t.deleted_at IS NULL
        AND t.name LIKE ?
        GROUP BY t.id
        ORDER BY t.name ASC
        LIMIT ?`
      )
        .bind(userId, searchTerm, limit)
        .all()

      return success({
        query,
        results: {
          bookmarks: bookmarksWithTags,
          tags: tags || [],
        },
        meta: {
          bookmark_count: bookmarksWithTags.length,
          tag_count: (tags || []).length,
        },
      })
    } catch (error) {
      console.error('Search error:', error)
      return internalError('Failed to search')
    }
  },
]
