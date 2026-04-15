/**

 */

import type { EventContext } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import type { ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { success, badRequest } from '../../../lib/response'
import { isValidUrl, sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'
import { invalidatePublicShareCache } from '../../shared/cache'

interface BatchCreateBookmarkItem {
  title: string
  url: string
  description?: string
  cover_image?: string
  favicon?: string
  tags?: string[]
  is_pinned?: boolean
  is_archived?: boolean
  is_public?: boolean
}

interface BatchCreateResult {
  success: number
  failed: number
  skipped: number
  total: number
  errors?: Array<{
    index: number
    url: string
    error: string
  }>
  created_bookmarks: Array<{
    id: string
    url: string
    title: string
  }>
}

export async function batchCreateBookmarks(
  context: EventContext<Env, RouteParams, ApiKeyAuthContext>,
  userId: string,
  bookmarks: BatchCreateBookmarkItem[]
): Promise<Response> {
  console.log('[Batch Handler] Starting batch create')
  console.log('[Batch Handler] User ID:', userId)
  console.log('[Batch Handler] Bookmarks count:', bookmarks?.length)

  if (!bookmarks || !Array.isArray(bookmarks) || bookmarks.length === 0) {
    return badRequest('bookmarks array is required and cannot be empty')
  }

  // 
  if (bookmarks.length > 100) {
    return badRequest('Cannot create more than 100 bookmarks at once')
  }

  const result: BatchCreateResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    total: bookmarks.length,
    errors: [],
    created_bookmarks: []
  }

  const now = new Date().toISOString()

  // 
  for (let i = 0; i < bookmarks.length; i++) {
    const item = bookmarks[i]

    try {
      // 
      if (!item.title || !item.url) {
        result.failed++
        result.errors!.push({
          index: i,
          url: item.url || '',
          error: 'Title and URL are required'
        })
        continue
      }

      //  URL 
      if (!isValidUrl(item.url)) {
        result.failed++
        result.errors!.push({
          index: i,
          url: item.url,
          error: 'Invalid URL format'
        })
        continue
      }

      const title = sanitizeString(item.title, 500)
      const url = sanitizeString(item.url, 2000)
      const description = item.description ? sanitizeString(item.description, 1000) : null
      const coverImage = item.cover_image ? sanitizeString(item.cover_image, 2000) : null
      const favicon = item.favicon ? sanitizeString(item.favicon, 2000) : null
      const isPinned = item.is_pinned ? 1 : 0
      const isArchived = item.is_archived ? 1 : 0
      const isPublic = item.is_public ? 1 : 0

      const existing = await context.env.DB.prepare(
        'SELECT id, deleted_at FROM bookmarks WHERE user_id = ? AND url = ?'
      )
        .bind(userId, url)
        .first<{ id: string; deleted_at: string | null }>()

      let bookmarkId: string

      if (existing) {
        if (!existing.deleted_at) {
          // ，
          result.skipped++
          continue
        }

        // 
        bookmarkId = existing.id
        await context.env.DB.prepare(
          `UPDATE bookmarks
           SET title = ?, description = ?, cover_image = ?, favicon = ?,
               is_pinned = ?, is_archived = ?, is_public = ?,
               deleted_at = NULL, updated_at = ?
           WHERE id = ?`
        )
          .bind(
            title,
            description,
            coverImage,
            favicon,
            isPinned,
            isArchived,
            isPublic,
            now,
            bookmarkId
          )
          .run()

        await context.env.DB.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?')
          .bind(bookmarkId)
          .run()
      } else {

        bookmarkId = generateUUID()
        await context.env.DB.prepare(
          `INSERT INTO bookmarks (id, user_id, title, url, description, cover_image, cover_image_id, favicon, is_pinned, is_archived, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            bookmarkId,
            userId,
            title,
            url,
            description,
            coverImage,
            null, // cover_image_id
            favicon,
            isPinned,
            isArchived,
            isPublic,
            now,
            now
          )
          .run()
      }

      // 
      if (item.tags && item.tags.length > 0) {
        const { createOrLinkTags } = await import('../../../lib/tags')
        await createOrLinkTags(context.env.DB, bookmarkId, item.tags, userId)
      }

      result.success++
      result.created_bookmarks.push({
        id: bookmarkId,
        url,
        title
      })

    } catch (error) {
      result.failed++
      console.error(`[Batch Handler] Failed to create bookmark ${i}:`, error)
      result.errors!.push({
        index: i,
        url: item.url || '',
        error: 'Failed to create bookmark'
      })
    }
  }

  if (result.errors!.length === 0) {
    delete result.errors
  }

  //  usage_count
  if (result.success > 0) {
    await context.env.DB.prepare(
      `UPDATE tags
       SET usage_count = (
         SELECT COUNT(*) FROM bookmark_tags
         WHERE tag_id = tags.id AND user_id = ?
       )
       WHERE user_id = ? AND deleted_at IS NULL`
    )
      .bind(userId, userId)
      .run()
  }

  // 
  await invalidatePublicShareCache(context.env, userId)

  console.log('[Batch Handler] Complete:', result)
  return success(result)
}
