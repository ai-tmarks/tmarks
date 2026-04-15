import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, Tag, RouteParams } from '../../../lib/types'
import { success, badRequest, created, conflict, internalError } from '../../../lib/response'
import { requireAuth, AuthContext } from '../../../middleware/auth'
import { sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'

interface CreateTagRequest {
  name: string
  color?: string
}

interface TagWithCount extends Tag {
  bookmark_count: number
}

// GET /api/v1/tags - Retrieve all tags
export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const userId = context.data.user_id
      const url = new URL(context.request.url)

      const sortBy = url.searchParams.get('sort') || 'usage' 

      let query = `
        SELECT
          t.*,
          COUNT(bt.bookmark_id) as bookmark_count
        FROM tags t
        LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
        WHERE t.user_id = ? AND t.deleted_at IS NULL
        GROUP BY t.id
      `

      if (sortBy === 'name') {
        query += ' ORDER BY LOWER(t.name) ASC'
      } else if (sortBy === 'clicks') {
        query += ' ORDER BY t.click_count DESC, LOWER(t.name) ASC'
      } else {
        
        query += ' ORDER BY bookmark_count DESC, LOWER(t.name) ASC'
      }

      const { results } = await context.env.DB.prepare(query)
        .bind(userId)
        .all<TagWithCount>()

      return success({
        tags: results || [],
      })
    } catch (error) {
      console.error('Get tags error:', error)
      return internalError('Failed to get tags')
    }
  },
]

// POST /api/v1/tags - Create a new tag
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const userId = context.data.user_id
      const body = await context.request.json() as CreateTagRequest

      if (!body.name) {
        return badRequest('Tag name is required')
      }

      const name = sanitizeString(body.name, 50)
      const color = body.color ? sanitizeString(body.color, 20) : null

      const existing = await context.env.DB.prepare(
        'SELECT id FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?) AND deleted_at IS NULL'
      )
        .bind(userId, name)
        .first()

      if (existing) {
        return conflict('Tag with this name already exists')
      }

      const now = new Date().toISOString()
      const tagUuid = generateUUID()

      await context.env.DB.prepare(
        `INSERT INTO tags (id, user_id, name, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(tagUuid, userId, name, color, now, now)
        .run()

      const tag = await context.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
        .bind(tagUuid)
        .first<Tag>()

      return created({ tag })
    } catch (error) {
      console.error('Create tag error:', error)
      return internalError('Failed to create tag')
    }
  },
]
