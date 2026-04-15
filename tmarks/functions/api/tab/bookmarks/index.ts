/**
 *  API - 
 * : /api/tab/bookmarks
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, BookmarkRow, RouteParams } from '../../../lib/types'
import { success, badRequest, created, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { isValidUrl, sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'
import { normalizeBookmark } from '../../../lib/bookmark-utils'
import { invalidatePublicShareCache } from '../../shared/cache'
import { uploadCoverImageToR2 } from '../../../lib/image-upload'
import { createOrLinkTags } from '../../../lib/tags'
import { 
  buildBookmarkListQuery, 
  fetchBookmarkTags, 
  createBookmarkPageCursor,
  BookmarkListRow,
  BookmarkWithTags
} from './bookmark-list'
import { handleBatchCreate } from './bookmark-batch'

interface CreateBookmarkRequest {
  title?: string
  url?: string
  description?: string
  cover_image?: string
  favicon?: string
  tag_ids?: string[]  // ：
  tags?: string[]     // ：（
  is_pinned?: boolean
  is_public?: boolean
  bookmarks?: Array<{  // 
    title: string
    url: string
    description?: string
    cover_image?: string
    favicon?: string
    tags?: string[]
    is_pinned?: boolean
    is_archived?: boolean
    is_public?: boolean
  }>
}

// GET /api/bookmarks - 
export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)

    try {
      const { query, params, pageSize, sortBy } = buildBookmarkListQuery(userId, url)
      const { results } = await context.env.DB.prepare(query).bind(...params).all<BookmarkListRow>()

      const hasMore = results.length > pageSize
      const bookmarks = hasMore ? results.slice(0, pageSize) : results
      const nextCursor = hasMore && bookmarks.length > 0
        ? createBookmarkPageCursor(bookmarks[bookmarks.length - 1], sortBy)
        : null

      const bookmarkIds = bookmarks.map(b => b.id)
      const tagsByBookmarkId = await fetchBookmarkTags(context.env.DB, bookmarkIds)

      const bookmarksWithTags: BookmarkWithTags[] = bookmarks.map(row => {
        const normalized = normalizeBookmark(row)
        return {
          ...normalized,
          tags: tagsByBookmarkId.get(row.id) || [],
        }
      })

      return success({
        bookmarks: bookmarksWithTags,
        meta: {
          page_size: pageSize,
          count: bookmarks.length,
          next_cursor: nextCursor,
          has_more: hasMore,
        },
      })
    } catch (error) {
      console.error('Get bookmarks error:', error)
      return internalError('Failed to get bookmarks')
    }
  },
]

export const onRequestPost: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.create'),
  async (context) => {
    const userId = context.data.user_id

    try {
      const body = (await context.request.json()) as CreateBookmarkRequest

      // 
      if (body.bookmarks && Array.isArray(body.bookmarks) && body.bookmarks.length > 0) {
        if (body.bookmarks.length > 100) {
          return badRequest('Cannot create more than 100 bookmarks at once')
        }

        const now = new Date().toISOString()
        const result = await handleBatchCreate(context.env.DB, userId, body.bookmarks, now)
        await invalidatePublicShareCache(context.env, userId)
        return success(result)
      }

      // 
      if (!body.title || !body.url) {
        return badRequest({
          message: 'Title and URL are required',
          code: 'MISSING_FIELDS'
        })
      }

      if (!isValidUrl(body.url)) {
        return badRequest('Invalid URL format')
      }

      const title = sanitizeString(body.title, 500)
      const url = sanitizeString(body.url, 2000)
      const description = body.description ? sanitizeString(body.description, 1000) : null
      let coverImage = body.cover_image ? sanitizeString(body.cover_image, 2000) : null
      const favicon = body.favicon ? sanitizeString(body.favicon, 2000) : null

      const existing = await context.env.DB.prepare(
        'SELECT id, deleted_at FROM bookmarks WHERE user_id = ? AND url = ?'
      )
        .bind(userId, url)
        .first<{ id: string; deleted_at: string | null }>()

      const now = new Date().toISOString()
      let bookmarkId: string
      const isPinned = body.is_pinned ? 1 : 0
      const isPublic = body.is_public ? 1 : 0

      //  R2 bucket， R2
      let coverImageId: string | null = null
      if (coverImage && context.env.SNAPSHOTS_BUCKET && context.env.R2_PUBLIC_URL) {
        const tempBookmarkId = existing?.id || generateUUID()
        const uploadResult = await uploadCoverImageToR2(
          coverImage,
          userId,
          tempBookmarkId,
          context.env.SNAPSHOTS_BUCKET,
          context.env.DB,
          context.env.R2_PUBLIC_URL,
          context.env
        )

        if (uploadResult.success && uploadResult.r2Url) {
          coverImage = uploadResult.r2Url
          coverImageId = uploadResult.imageId || null
        }
      }

      if (existing) {
        if (!existing.deleted_at) {
          // 
          const bookmarkRow = await context.env.DB.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_id = ?')
            .bind(existing.id, userId)
            .first<BookmarkRow>()

          const { results: tags } = await context.env.DB.prepare(
            `SELECT t.id, t.name, t.color
             FROM tags t
             INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
             WHERE bt.bookmark_id = ? AND bt.user_id = ?`
          )
            .bind(existing.id, userId)
            .all<{ id: string; name: string; color: string | null }>()

          const snapshotCountResult = await context.env.DB.prepare(
            `SELECT COUNT(*) as count FROM bookmark_snapshots WHERE bookmark_id = ? AND user_id = ?`
          )
            .bind(existing.id, userId)
            .first<{ count: number }>()

          const snapshotCount = snapshotCountResult?.count || 0

          if (!bookmarkRow) {
            return internalError('Failed to retrieve bookmark')
          }

          const bookmark = normalizeBookmark(bookmarkRow)
          return success(
            {
              bookmark: {
                ...bookmark,
                tags: tags || [],
                snapshot_count: snapshotCount,
                has_snapshot: snapshotCount > 0,
              },
            },
            {
              message: 'Bookmark already exists',
              code: 'BOOKMARK_EXISTS',
            }
          )
        }

        // 
        bookmarkId = existing.id
        await context.env.DB.prepare(
          `UPDATE bookmarks
           SET title = ?, description = ?, cover_image = ?, favicon = ?,
               is_pinned = ?, is_public = ?,
               deleted_at = NULL, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
          .bind(title, description, coverImage, favicon, isPinned, isPublic, now, bookmarkId, userId)
          .run()

        await context.env.DB.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ? AND user_id = ?')
          .bind(bookmarkId, userId)
          .run()
      } else {

        bookmarkId = generateUUID()
        await context.env.DB.prepare(
          `INSERT INTO bookmarks (id, user_id, title, url, description, cover_image, cover_image_id, favicon, is_pinned, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(bookmarkId, userId, title, url, description, coverImage, coverImageId, favicon, isPinned, isPublic, now, now)
          .run()
      }

      // 
      if (body.tags && body.tags.length > 0) {
        await createOrLinkTags(context.env.DB, bookmarkId, body.tags, userId)
      } else if (body.tag_ids && body.tag_ids.length > 0) {
        for (const tagId of body.tag_ids) {
          await context.env.DB.prepare(
            'INSERT INTO bookmark_tags (bookmark_id, tag_id, user_id, created_at) VALUES (?, ?, ?, ?)'
          )
            .bind(bookmarkId, tagId, userId, now)
            .run()
        }
      }

      const bookmarkRow = await context.env.DB.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_id = ?')
        .bind(bookmarkId, userId)
        .first<BookmarkRow>()

      const { results: tags } = await context.env.DB.prepare(
        `SELECT t.id, t.name, t.color
         FROM tags t
         INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
         WHERE bt.bookmark_id = ? AND bt.user_id = ?`
      )
        .bind(bookmarkId, userId)
        .all<{ id: string; name: string; color: string | null }>()

      if (!bookmarkRow) {
        return internalError('Failed to load bookmark after creation')
      }

      await invalidatePublicShareCache(context.env, userId)

      return created({
        bookmark: {
          ...normalizeBookmark(bookmarkRow),
          tags: tags || [],
        },
      })
    } catch (error) {
      console.error('Create bookmark error:', error)
      return internalError('Failed to create bookmark')
    }
  },
]
