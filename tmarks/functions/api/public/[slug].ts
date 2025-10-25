import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, BookmarkRow, PublicProfile } from '../../lib/types'
import { notFound, success, internalError } from '../../lib/response'
import { normalizeBookmark } from '../bookmarks/utils'

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

const CACHE_PREFIX = 'public-share:'
const CACHE_TAGS_PREFIX = 'public-share-tags:'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = (context.params.slug as string | undefined)?.toLowerCase()

  if (!slug) {
    return notFound('Share link not found')
  }

  const url = new URL(context.request.url)
  const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '30'), 100)
  const pageCursor = url.searchParams.get('page_cursor') || ''

  // 如果没有分页参数，返回旧版本的完整数据（向后兼容）
  const usePagination = url.searchParams.has('page_size') || url.searchParams.has('page_cursor')

  const cacheKey = usePagination
    ? `${CACHE_PREFIX}${slug}:page:${pageCursor || 'first'}:${pageSize}`
    : `${CACHE_PREFIX}${slug}`
  const tagsCacheKey = `${CACHE_TAGS_PREFIX}${slug}`

  try {
    // 验证用户和分享设置
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

    // 如果使用分页，检查分页缓存
    if (usePagination && context.env.PUBLIC_SHARE_KV) {
      const cached = await context.env.PUBLIC_SHARE_KV.get(cacheKey, 'json')
      if (cached) {
        return success(cached as PublicSharePaginatedPayload)
      }
    }

    // 如果不使用分页，检查完整数据缓存
    if (!usePagination && context.env.PUBLIC_SHARE_KV) {
      const cached = await context.env.PUBLIC_SHARE_KV.get(cacheKey, 'json')
      if (cached) {
        return success(cached as PublicSharePayload)
      }
    }

    // 构建书签查询
    let bookmarkQuery = `
      SELECT *
      FROM bookmarks
      WHERE user_id = ?
        AND is_public = 1
        AND deleted_at IS NULL
    `
    const bookmarkParams: (string | number)[] = [user.user_id]

    // 游标分页
    if (usePagination && pageCursor) {
      bookmarkQuery += ' AND id < ?'
      bookmarkParams.push(pageCursor)
    }

    bookmarkQuery += ' ORDER BY is_pinned DESC, created_at DESC'

    // 如果使用分页，添加 LIMIT
    if (usePagination) {
      bookmarkQuery += ' LIMIT ?'
      bookmarkParams.push(pageSize + 1) // 多获取一条以判断是否有下一页
    }

    const { results: bookmarkRows } = await context.env.DB.prepare(bookmarkQuery)
      .bind(...bookmarkParams)
      .all<BookmarkRow>()

    // 判断是否有下一页（仅分页模式）
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

    // 获取所有标签统计（仅在非分页或第一页时计算）
    let tags: Array<{ id: string; name: string; color: string | null; bookmark_count: number }> = []

    if (!usePagination || !pageCursor) {
      // 尝试从缓存获取标签
      let cachedTags: typeof tags | null = null
      if (context.env.PUBLIC_SHARE_KV) {
        const cached = await context.env.PUBLIC_SHARE_KV.get(tagsCacheKey, 'json')
        if (cached) {
          cachedTags = cached as typeof tags
        }
      }

      if (cachedTags) {
        tags = cachedTags
      } else {
        // 计算标签统计
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

        // 缓存标签统计（30分钟）
        if (context.env.PUBLIC_SHARE_KV && tags.length > 0) {
          await context.env.PUBLIC_SHARE_KV.put(
            tagsCacheKey,
            JSON.stringify(tags),
            { expirationTtl: 1800 }
          )
        }
      }
    }

    // 返回分页数据或完整数据
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

      // 缓存分页数据（5分钟）
      if (context.env.PUBLIC_SHARE_KV) {
        await context.env.PUBLIC_SHARE_KV.put(
          cacheKey,
          JSON.stringify(paginatedPayload),
          { expirationTtl: 300 }
        )
      }

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

      // 缓存完整数据（10分钟）
      if (context.env.PUBLIC_SHARE_KV) {
        await context.env.PUBLIC_SHARE_KV.put(
          cacheKey,
          JSON.stringify(payload),
          { expirationTtl: 600 }
        )
      }

      return success(payload)
    }
  } catch (error) {
    console.error('Public share error:', error)
    return internalError('Failed to load shared bookmarks')
  }
}
