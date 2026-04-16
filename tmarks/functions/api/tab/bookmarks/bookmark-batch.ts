import type { D1Database } from '../../../lib/types'
import { isValidUrl, sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'
import { replaceBookmarkTags, replaceBookmarkTagsByNames } from '../../../lib/tags'

export type BatchCreateResult = {
  success: number
  failed: number
  skipped: number
  total: number
  errors?: Array<{ index: number; url: string; error: string }>
  created_bookmarks: Array<{ id: string; url: string; title: string }>
}

export async function handleBatchCreate(
  db: D1Database,
  userId: string,
  bookmarks: Array<{
    title: string
    url: string
    description?: string
    cover_image?: string
    favicon?: string
    tags?: string[]
    is_pinned?: boolean
    is_archived?: boolean
    is_public?: boolean
  }>,
  now: string
): Promise<BatchCreateResult> {
  const result: BatchCreateResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    total: bookmarks.length,
    errors: [],
    created_bookmarks: [],
  }

  for (let i = 0; i < bookmarks.length; i++) {
    const item = bookmarks[i]

    try {
      if (!item.title || !item.url) {
        result.failed++
        result.errors.push({
          index: i,
          url: item.url || '',
          error: 'Title and URL are required',
        })
        continue
      }

      if (!isValidUrl(item.url)) {
        result.failed++
        result.errors.push({
          index: i,
          url: item.url,
          error: 'Invalid URL format',
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

      const existing = await db.prepare(
        'SELECT id, deleted_at FROM bookmarks WHERE user_id = ? AND url = ?'
      )
        .bind(userId, url)
        .first<{ id: string; deleted_at: string | null }>()
      const restoredDeletedBookmark = Boolean(existing?.deleted_at)

      let bookmarkId: string

      if (existing) {
        if (!existing.deleted_at) {
          result.skipped++
          continue
        }

        bookmarkId = existing.id
        await db.prepare(
          `UPDATE bookmarks
           SET title = ?, description = ?, cover_image = ?, favicon = ?,
               is_pinned = ?, is_archived = ?, is_public = ?,
               deleted_at = NULL, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
          .bind(title, description, coverImage, favicon, isPinned, isArchived, isPublic, now, bookmarkId, userId)
          .run()
      } else {
        bookmarkId = generateUUID()
        await db.prepare(
          `INSERT INTO bookmarks (id, user_id, title, url, description, cover_image, cover_image_id, favicon, is_pinned, is_archived, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(bookmarkId, userId, title, url, description, coverImage, null, favicon, isPinned, isArchived, isPublic, now, now)
          .run()
      }

      if (item.tags !== undefined) {
        await replaceBookmarkTagsByNames(db, bookmarkId, item.tags, userId, now)
      } else if (restoredDeletedBookmark) {
        await replaceBookmarkTags(db, bookmarkId, userId, [], now)
      }

      result.success++
      result.created_bookmarks.push({ id: bookmarkId, url, title })
    } catch (error) {
      result.failed++
      result.errors.push({
        index: i,
        url: item.url || '',
        error: 'Failed to create bookmark',
      })
      console.error(`[Batch] Failed to create bookmark ${i}:`, error)
    }
  }

  if (result.errors.length === 0) {
    delete result.errors
  }

  if (result.success > 0) {
    await db.prepare(
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

  return result
}
