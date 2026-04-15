import type { Bookmark, BookmarkRow, SQLParam, D1Database } from '../../../lib/types'

export interface BookmarkWithTags extends Bookmark {
  tags: Array<{ id: string; name: string; color: string | null }>
}

export interface BookmarkListRow extends BookmarkRow {
  pin_order?: number | null
}

export interface BookmarkPageCursor {
  id: string
  isPinned: boolean
  pinOrder: number | null
  sortValue: string
}

export function parseBookmarkPageCursor(raw: string | null): BookmarkPageCursor | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<BookmarkPageCursor>
    if (
      typeof parsed?.id === 'string' &&
      typeof parsed?.isPinned === 'boolean' &&
      typeof parsed?.sortValue === 'string' &&
      (typeof parsed?.pinOrder === 'number' || parsed?.pinOrder === null || parsed?.pinOrder === undefined)
    ) {
      return {
        id: parsed.id,
        isPinned: parsed.isPinned,
        pinOrder: typeof parsed.pinOrder === 'number' ? parsed.pinOrder : null,
        sortValue: parsed.sortValue,
      }
    }
  } catch {
    return null
  }

  return null
}

export function createBookmarkPageCursor(row: BookmarkListRow, sortBy: 'created' | 'updated' | 'pinned'): string {
  return JSON.stringify({
    id: row.id,
    isPinned: Boolean(row.is_pinned),
    pinOrder: row.is_pinned ? Number(row.pin_order ?? 0) : null,
    sortValue: sortBy === 'updated' ? row.updated_at : row.created_at,
  } satisfies BookmarkPageCursor)
}

export function buildBookmarkListQuery(
  userId: string,
  url: URL
): { query: string; params: SQLParam[]; pageSize: number; sortBy: 'created' | 'updated' | 'pinned' } {
  const keyword = url.searchParams.get('keyword')
  const tags = url.searchParams.get('tags')
  const pageSize = Math.max(1, Math.min(parseInt(url.searchParams.get('page_size') || '100') || 100, 200))
  const pageCursor = url.searchParams.get('page_cursor')
  const parsedCursor = parseBookmarkPageCursor(pageCursor)
  const sortBy = (url.searchParams.get('sort') as 'created' | 'updated' | 'pinned') || 'created'
  const pinnedParam = url.searchParams.get('pinned')
  const pinned = pinnedParam ? pinnedParam === 'true' : undefined
  const sortField = sortBy === 'updated' ? 'b.updated_at' : 'b.created_at'

  // 
  let query = `
    SELECT DISTINCT b.*
    FROM bookmarks b
    WHERE b.user_id = ? AND b.deleted_at IS NULL
  `
  const params: SQLParam[] = [userId]

  // 
  if (pinned !== undefined) {
    query += ` AND b.is_pinned = ?`
    params.push(pinned ? 1 : 0)
  }

    query += ` AND (b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ?)`
    const searchPattern = `%${keyword}%`
    params.push(searchPattern, searchPattern, searchPattern)
  }

  // （：）
  if (tags) {
    const tagIds = tags.split(',').filter(Boolean)
    if (tagIds.length > 0) {
      query += ` AND b.id IN (
        SELECT bt.bookmark_id
        FROM bookmark_tags bt
        WHERE bt.tag_id IN (${tagIds.map(() => '?').join(',')})
        GROUP BY bt.bookmark_id
        HAVING COUNT(DISTINCT bt.tag_id) = ?
      )`
      params.push(...tagIds, tagIds.length)
    }
  }

  // 
  if (parsedCursor) {
    if (pinned === true) {
      query += ` AND (
        b.pin_order > ?
        OR (b.pin_order = ? AND (${sortField} < ? OR (${sortField} = ? AND b.id < ?)))
      )`
      params.push(
        parsedCursor.pinOrder ?? 0,
        parsedCursor.pinOrder ?? 0,
        parsedCursor.sortValue,
        parsedCursor.sortValue,
        parsedCursor.id
      )
    } else if (pinned === false) {
      query += ` AND (
        ${sortField} < ?
        OR (${sortField} = ? AND b.id < ?)
      )`
      params.push(parsedCursor.sortValue, parsedCursor.sortValue, parsedCursor.id)
    } else if (parsedCursor.isPinned) {
      query += ` AND (
        b.is_pinned = 0
        OR (
          b.is_pinned = 1 AND (
            b.pin_order > ?
            OR (b.pin_order = ? AND (${sortField} < ? OR (${sortField} = ? AND b.id < ?)))
          )
        )
      )`
      params.push(
        parsedCursor.pinOrder ?? 0,
        parsedCursor.pinOrder ?? 0,
        parsedCursor.sortValue,
        parsedCursor.sortValue,
        parsedCursor.id
      )
    } else {
      query += ` AND b.is_pinned = 0 AND (
        ${sortField} < ?
        OR (${sortField} = ? AND b.id < ?)
      )`
      params.push(parsedCursor.sortValue, parsedCursor.sortValue, parsedCursor.id)
    }
  } else if (pageCursor) {
    query += ` AND b.id < ?`
    params.push(pageCursor)
  }

  switch (sortBy) {
    case 'updated':
      orderBy = 'ORDER BY b.is_pinned DESC, CASE WHEN b.is_pinned = 1 THEN b.pin_order ELSE NULL END ASC, b.updated_at DESC, b.id DESC'
      break
    case 'pinned':
      orderBy = 'ORDER BY b.is_pinned DESC, CASE WHEN b.is_pinned = 1 THEN b.pin_order ELSE NULL END ASC, b.created_at DESC, b.id DESC'
      break
    case 'created':
    default:
      orderBy = 'ORDER BY b.is_pinned DESC, CASE WHEN b.is_pinned = 1 THEN b.pin_order ELSE NULL END ASC, b.created_at DESC, b.id DESC'
      break
  }

  query += ` ${orderBy} LIMIT ?`
  params.push(pageSize + 1)

  return { query, params, pageSize, sortBy }
}

export async function fetchBookmarkTags(
  db: D1Database,
  bookmarkIds: string[]
): Promise<Map<string, Array<{ id: string; name: string; color: string | null }>>> {
  const tagsByBookmarkId = new Map<string, Array<{ id: string; name: string; color: string | null }>>()
  if (bookmarkIds.length === 0) return tagsByBookmarkId

  const placeholders = bookmarkIds.map(() => '?').join(',')
  const { results: tagResults } = await db.prepare(
    `SELECT
       bt.bookmark_id,
       t.id,
       t.name,
       t.color
     FROM tags t
     INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
     WHERE bt.bookmark_id IN (${placeholders})
       AND t.deleted_at IS NULL
     ORDER BY bt.bookmark_id, t.name`
  )
    .bind(...bookmarkIds)
    .all<{ bookmark_id: string; id: string; name: string; color: string | null }>()

  const allTags = tagResults ?? []
  for (const tag of allTags) {
    if (!tagsByBookmarkId.has(tag.bookmark_id)) {
      tagsByBookmarkId.set(tag.bookmark_id, [])
    }
    tagsByBookmarkId.get(tag.bookmark_id)!.push({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })
  }
  return tagsByBookmarkId
}
