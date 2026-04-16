import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, BookmarkRow, RouteParams, SQLParam } from '../../../lib/types'
import { success, badRequest, internalError } from '../../../lib/response'
import { requireAuth, AuthContext } from '../../../middleware/auth'
import { fetchFullBookmarks } from '../../../lib/data-fetchers'

export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const { env, request, data } = context
    const db = env.DB
    const userId = data.user_id

    if (!userId) {
      return badRequest('User not authenticated')
    }

    try {
      const url = new URL(request.url)
      const keyword = url.searchParams.get('keyword')
      const tagIds = url.searchParams.get('tagIds')?.split(',').filter(Boolean)
      const groupId = url.searchParams.get('groupId')
      const sortBy = url.searchParams.get('sortBy') || 'created_at'
      const sortOrder = url.searchParams.get('sortOrder') || 'DESC'
      const limit = parseInt(url.searchParams.get('limit') || '50', 10) || 50
      const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0

      let query = `
        SELECT DISTINCT b.*
        FROM bookmarks b
        LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
        WHERE b.user_id = ?
      `
      const params: SQLParam[] = [userId]

      const conditions: string[] = []
      const conditionParams: SQLParam[] = []

      if (keyword) {
        conditions.push('(b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ?)')
        const searchPattern = `%${keyword}%`
        conditionParams.push(searchPattern, searchPattern, searchPattern)
      }

      if (tagIds && tagIds.length > 0) {
        conditions.push(`bt.tag_id IN (${tagIds.map(() => '?').join(',')})`)
        conditionParams.push(...tagIds)
      }

      if (groupId) {
        if (groupId === 'none') {
          conditions.push('b.group_id IS NULL')
        } else {
          conditions.push('b.group_id = ?')
          conditionParams.push(groupId)
        }
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ')
      }

      const countQuery = `SELECT COUNT(DISTINCT b.id) as total FROM bookmarks b LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id WHERE b.user_id = ? ${conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''}`
      const totalResult = await db.prepare(countQuery).bind(userId, ...conditionParams).first<{ total: number }>()
      const total = totalResult?.total || 0

      const validSortFields = ['created_at', 'updated_at', 'title']
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
      const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      query += ` ORDER BY b.${sortField} ${direction} LIMIT ? OFFSET ?`
      params.push(...conditionParams, limit, offset)

      const { results: rows } = await db.prepare(query).bind(...params).all<BookmarkRow>()

      const bookmarks = await fetchFullBookmarks(db, rows, userId)

      return success({
        bookmarks,
        pagination: {
          total,
          limit,
          offset,
        },
      })
    } catch (error: unknown) {
      console.error('Fetch bookmarks error:', error)
      return internalError('Failed to fetch bookmarks')
    }
  },
]
