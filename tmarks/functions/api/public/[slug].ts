import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, BookmarkRow, PublicProfile } from '../../lib/types'
import { notFound, success, internalError } from '../../lib/response'
import { normalizeBookmark } from '../../lib/bookmark-utils'
import { CacheService } from '../../lib/cache'
import { generateCacheKey } from '../../lib/cache/strategies'

interface PublicSharePayload {
  profile: {
    username: string
    title: string | null
    description: string | null
    slug: string
  }
  bookmarks: Array<ReturnType<typeof normalizeBookmark> & { tags: Array<{ id: string; name: string; color: string | null }> }>
  tags: Array<{ id: string; name: string; color: string | null; bookmark_count: number }>
  generated_at: string
}

interface PublicSharePaginatedPayload {
  profile: {
    username: string
    title: string | null
    description: string | null
    slug: string
  }
  bookmarks: Array<ReturnType<typeof normalizeBookmark> & { tags: Array<{ id: string; name: string; color: string | null }> }>
  tags: Array<{ id: string; name: string; color: string | null; bookmark_count: number }>
  meta: {
    page_size: number
    count: number
    next_cursor: string | null
    has_more: boolean
  }
}



export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = (context.params.slug as string | undefined)?.toLowerCase()

  if (!slug) {
    return notFound('Share link not found')
  }

  const url = new URL(context.request.url)
  const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '30', 10) || 30, 100)
  const pageCursor = url.searchParams.get('page_cursor') || ''

  // ，（）
  const usePagination = url.searchParams.has('page_size') || url.searchParams.has('page_cursor')

  // 
  const cache = new CacheService(context.env)
  const cacheKey = usePagination
    ? generateCacheKey('publicShare', slug, { page_cursor: pageCursor || 'first', page_size: pageSize })
    : generateCacheKey('publicShare', slug)

  try {
    // 
    const user = await context.env.DB.prepare(
      `SELECT id as user_id, username, public_share_enabled, public_slug, public_page_title, public_page_description
       FROM users
       WHERE LOWER(public_slug) = ? AND public_share_enabled = 1`
    )
      .bind(slug)
      .first<PublicProfile>()

    if (!user || !user.public_share_enabled || !user.public_slug) {
      return notFound('Share link not found')
    }

    // 
    const cached = await cache.get<PublicSharePayload | PublicSharePaginatedPayload>('publicShare', cacheKey)
    if (cached) {
      return success({
        ...cached,
        _cached: true, // 
      })
    }

    // 
    let bookmarkQuery = `
      SELECT *
      FROM bookmarks
      WHERE user_id = ?
        AND is_public = 1
        AND deleted_at IS NULL
    `
    const bookmarkParams: (string | number)[] = [user.user_id]

    // 
    if (usePagination && pageCursor) {
      bookmarkQuery += ' AND id < ?'
      bookmarkParams.push(pageCursor)
    }

    bookmarkQuery += ' ORDER BY is_pinned DESC, created_at DESC'

    // ， LIMIT
    if (usePagination) {
      bookmarkQuery += ' LIMIT ?'
      bookmarkParams.push(pageSize + 1) // 
    }

    const { results: bookmarkRows } = await context.env.DB.prepare(bookmarkQuery)
      .bind(...bookmarkParams)
      .all<BookmarkRow>()

    // （）
    const hasMore = usePagination && bookmarkRows.length > pageSize
    const bookmarksToProcess = usePagination && hasMore
      ? bookmarkRows.slice(0, pageSize)
      : bookmarkRows
    const nextCursor = usePagination && hasMore && bookmarksToProcess.length > 0
      ? String(bookmarksToProcess[bookmarksToProcess.length - 1].id)
      : null

    const bookmarkIds = bookmarksToProcess.map((row) => row.id)

    let allTags: Array<{ bookmark_id: string; id: string; name: string; color: string | null }> = []

    if (bookmarkIds.length > 0) {
      const placeholders = bookmarkIds.map(() => '?').join(',')
      const { results: tagRows } = await context.env.DB.prepare(
        `SELECT bt.bookmark_id, t.id, t.name, t.color
         FROM bookmark_tags bt
         INNER JOIN tags t ON t.id = bt.tag_id
         WHERE bt.bookmark_id IN (${placeholders})
           AND t.deleted_at IS NULL
         ORDER BY t.name`
      )
        .bind(...bookmarkIds)
        .all<{ bookmark_id: string; id: string; name: string; color: string | null }>()

      allTags = tagRows || []
    }

    const tagsByBookmark = new Map<string, Array<{ id: string; name: string; color: string | null }>>()

    for (const tag of allTags) {
      if (!tagsByBookmark.has(tag.bookmark_id)) {
        tagsByBookmark.set(tag.bookmark_id, [])
      }
      const tags = tagsByBookmark.get(tag.bookmark_id)
      if (tags) {
        tags.push({ id: tag.id, name: tag.name, color: tag.color })
      }
    }

    const bookmarks = bookmarksToProcess.map((row) => ({
      ...normalizeBookmark(row),
      tags: tagsByBookmark.get(row.id) || [],
    }))

    // （）
    let tags: Array<{ id: string; name: string; color: string | null; bookmark_count: number }> = []

    if (!usePagination || !pageCursor) {
      const tagsCacheKey = generateCacheKey('publicShare', `${slug}:tags`)
      
      // 
      const cachedTags = await cache.get<typeof tags>('publicShare', tagsCacheKey)

      if (cachedTags) {
        tags = cachedTags
      } else {
        // 
        const { results: tagStats } = await context.env.DB.prepare(
          `SELECT t.id, t.name, t.color, COUNT(DISTINCT bt.bookmark_id) as bookmark_count
           FROM tags t
           INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
           INNER JOIN bookmarks b ON bt.bookmark_id = b.id
           WHERE b.user_id = ?
             AND b.is_public = 1
             AND b.deleted_at IS NULL
             AND t.deleted_at IS NULL
           GROUP BY t.id, t.name, t.color
           ORDER BY t.name`
        )
          .bind(user.user_id)
          .all<{ id: string; name: string; color: string | null; bookmark_count: number }>()

        tags = tagStats || []

        // （30）
        if (tags.length > 0) {
          await cache.set('publicShare', tagsCacheKey, tags, { async: true })
        }
      }
    }

    // 
    if (usePagination) {
      const paginatedPayload: PublicSharePaginatedPayload = {
        profile: {
          username: user.username,
          title: user.public_page_title,
          description: user.public_page_description,
          slug: user.public_slug,
        },
        bookmarks,
        tags,
        meta: {
          page_size: pageSize,
          count: bookmarks.length,
          next_cursor: nextCursor,
          has_more: hasMore,
        },
      }

      //  (30 TTL, Level 0 )
      await cache.set('publicShare', cacheKey, paginatedPayload, { async: true })

      return success(paginatedPayload)
    } else {
      const payload: PublicSharePayload = {
        profile: {
          username: user.username,
          title: user.public_page_title,
          description: user.public_page_description,
          slug: user.public_slug,
        },
        bookmarks,
        tags,
        generated_at: new Date().toISOString(),
      }

      //  (30 TTL, Level 0 )
      await cache.set('publicShare', cacheKey, payload, { async: true })

      return success(payload)
    }
  } catch (error) {
    console.error('Public share error:', error)
    return internalError('Failed to load shared bookmarks')
  }
}
