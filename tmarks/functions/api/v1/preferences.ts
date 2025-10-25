import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../lib/types'
import { success, badRequest, notFound, internalError } from '../../lib/response'
import { requireAuth, AuthContext } from '../../middleware/auth'

interface UserPreferences {
  user_id: string
  theme: 'light' | 'dark'
  page_size: number
  view_mode: 'list' | 'card' | 'minimal' | 'title'
  density: 'compact' | 'normal' | 'comfortable'
  tag_layout?: 'grid' | 'masonry'
  updated_at: string
}

interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark'
  page_size?: number
  view_mode?: 'list' | 'card' | 'minimal' | 'title'
  density?: 'compact' | 'normal' | 'comfortable'
  tag_layout?: 'grid' | 'masonry'
}

async function hasTagLayoutColumn(db: D1Database): Promise<boolean> {
  try {
    await db.prepare('SELECT tag_layout FROM user_preferences LIMIT 1').first()
    return true
  } catch (error) {
    if (error instanceof Error && /no such column: tag_layout/i.test(error.message)) {
      return false
    }
    throw error
  }
}

// GET /api/v1/preferences - 获取用户偏好
export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const userId = context.data.user_id

      const preferences = await context.env.DB.prepare(
        'SELECT * FROM user_preferences WHERE user_id = ?'
      )
        .bind(userId)
        .first<UserPreferences>()

      if (!preferences) {
        return notFound('Preferences not found')
      }

      return success({
        preferences: {
          theme: preferences.theme,
          page_size: preferences.page_size,
          view_mode: preferences.view_mode,
          density: preferences.density,
          tag_layout: preferences.tag_layout ?? 'grid',
          updated_at: preferences.updated_at,
        },
      })
    } catch (error) {
      console.error('Get preferences error:', error)
      return internalError('Failed to get preferences')
    }
  },
]

// PATCH /api/v1/preferences - 更新用户偏好
export const onRequestPatch: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const userId = context.data.user_id
      const body = await context.request.json() as UpdatePreferencesRequest
      const tagLayoutSupported = await hasTagLayoutColumn(context.env.DB)

      // 验证输入
      if (body.theme && !['light', 'dark'].includes(body.theme)) {
        return badRequest('Invalid theme value')
      }

      if (body.page_size && (body.page_size < 10 || body.page_size > 100)) {
        return badRequest('Page size must be between 10 and 100')
      }

      if (body.view_mode && !['list', 'card', 'minimal', 'title'].includes(body.view_mode)) {
        return badRequest('Invalid view mode')
      }

      if (body.density && !['compact', 'normal', 'comfortable'].includes(body.density)) {
        return badRequest('Invalid density value')
      }

      if (body.tag_layout && !['grid', 'masonry'].includes(body.tag_layout)) {
        return badRequest('Invalid tag layout value')
      }

      // 构建更新语句
      const updates: string[] = []
      const values: SQLParam[] = []

      if (body.theme !== undefined) {
        updates.push('theme = ?')
        values.push(body.theme)
      }

      if (body.page_size !== undefined) {
        updates.push('page_size = ?')
        values.push(body.page_size)
      }

      if (body.view_mode !== undefined) {
        updates.push('view_mode = ?')
        values.push(body.view_mode)
      }

      if (body.density !== undefined) {
        updates.push('density = ?')
        values.push(body.density)
      }

      if (body.tag_layout !== undefined && tagLayoutSupported) {
        updates.push('tag_layout = ?')
        values.push(body.tag_layout)
      }

      if (updates.length === 0) {
        if (body.tag_layout !== undefined && !tagLayoutSupported) {
          const preferences = await context.env.DB.prepare(
            'SELECT * FROM user_preferences WHERE user_id = ?'
          )
            .bind(userId)
            .first<UserPreferences>()

          if (!preferences) {
            return internalError('Failed to load preferences')
          }

          return success({
            preferences: {
              theme: preferences.theme,
              page_size: preferences.page_size,
              view_mode: preferences.view_mode,
              density: preferences.density,
              tag_layout: preferences.tag_layout ?? 'grid',
              updated_at: preferences.updated_at,
            },
          })
        }

        return badRequest('No valid fields to update')
      }

      const now = new Date().toISOString()
      updates.push('updated_at = ?')
      values.push(now)
      values.push(userId)

      await context.env.DB.prepare(
        `UPDATE user_preferences
         SET ${updates.join(', ')}
         WHERE user_id = ?`
      )
        .bind(...values)
        .run()

      // 获取更新后的偏好
      const preferences = await context.env.DB.prepare(
        'SELECT * FROM user_preferences WHERE user_id = ?'
      )
        .bind(userId)
        .first<UserPreferences>()

      if (!preferences) {
        return internalError('Failed to load preferences after update')
      }

      return success({
        preferences: {
          theme: preferences.theme,
          page_size: preferences.page_size,
          view_mode: preferences.view_mode,
          density: preferences.density,
          tag_layout: preferences.tag_layout ?? 'grid',
          updated_at: preferences.updated_at,
        },
      })
    } catch (error) {
      console.error('Update preferences error:', error)
      return internalError('Failed to update preferences')
    }
  },
]
