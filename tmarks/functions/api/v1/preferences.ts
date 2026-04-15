import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../lib/types'
import { success, badRequest, notFound, internalError } from '../../lib/response'
import { requireAuth, AuthContext } from '../../middleware/auth'
import {
  UserPreferences,
  UpdatePreferencesRequest,
  hasTagLayoutColumn,
  hasSortByColumn,
  hasAutomationColumns,
  mapPreferences,
  validatePreferences
} from './preferences-helpers'

// GET /api/v1/preferences - Retrieve user preferences
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
        preferences: mapPreferences(preferences),
      })
    } catch (error) {
      console.error('Get preferences error:', error)
      return internalError('Failed to get preferences')
    }
  },
]

// PATCH /api/v1/preferences - Update user preferences
export const onRequestPatch: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const userId = context.data.user_id
      const body = await context.request.json() as UpdatePreferencesRequest
      const tagLayoutSupported = await hasTagLayoutColumn(context.env.DB)
      const sortBySupported = await hasSortByColumn(context.env.DB)
      const automationSupported = await hasAutomationColumns(context.env.DB)

      const validationError = validatePreferences(body)
      if (validationError) {
        return badRequest(validationError)
      }

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

      if (body.sort_by !== undefined && sortBySupported) {
        updates.push('sort_by = ?')
        values.push(body.sort_by)
      }

      if (automationSupported) {
        if (body.search_auto_clear_seconds !== undefined) {
          updates.push('search_auto_clear_seconds = ?')
          values.push(body.search_auto_clear_seconds)
        }

        if (body.tag_selection_auto_clear_seconds !== undefined) {
          updates.push('tag_selection_auto_clear_seconds = ?')
          values.push(body.tag_selection_auto_clear_seconds)
        }

        if (body.enable_search_auto_clear !== undefined) {
          updates.push('enable_search_auto_clear = ?')
          values.push(body.enable_search_auto_clear ? 1 : 0)
        }

        if (body.enable_tag_selection_auto_clear !== undefined) {
          updates.push('enable_tag_selection_auto_clear = ?')
          values.push(body.enable_tag_selection_auto_clear ? 1 : 0)
        }
      }

      if (automationSupported) {
        if (body.default_bookmark_icon !== undefined) {
          updates.push('default_bookmark_icon = ?')
          values.push(body.default_bookmark_icon)
        }

        if (body.snapshot_retention_count !== undefined) {
          updates.push('snapshot_retention_count = ?')
          values.push(body.snapshot_retention_count)
        }

        if (body.snapshot_auto_create !== undefined) {
          updates.push('snapshot_auto_create = ?')
          values.push(body.snapshot_auto_create ? 1 : 0)
        }

        if (body.snapshot_auto_dedupe !== undefined) {
          updates.push('snapshot_auto_dedupe = ?')
          values.push(body.snapshot_auto_dedupe ? 1 : 0)
        }

        if (body.snapshot_auto_cleanup_days !== undefined) {
          updates.push('snapshot_auto_cleanup_days = ?')
          values.push(body.snapshot_auto_cleanup_days)
        }
      }

      if (updates.length === 0) {
        if ((body.tag_layout !== undefined && !tagLayoutSupported) ||
            (body.sort_by !== undefined && !sortBySupported)) {
          const preferences = await context.env.DB.prepare(
            'SELECT * FROM user_preferences WHERE user_id = ?'
          )
            .bind(userId)
            .first<UserPreferences>()

          if (!preferences) {
            return internalError('Failed to load preferences')
          }

          return success({
            preferences: mapPreferences(preferences),
          })
        }

        return badRequest('No valid fields to update')
      }

      const now = new Date().toISOString()
      updates.push('updated_at = ?')
      values.push(now)
      values.push(userId)

      const insertStmt = context.env.DB.prepare(
        `INSERT INTO user_preferences (user_id)
         VALUES (?)
         ON CONFLICT(user_id) DO NOTHING`
      ).bind(userId)

      const updateStmt = context.env.DB.prepare(
        `UPDATE user_preferences
         SET ${updates.join(', ')}
         WHERE user_id = ?`
      ).bind(...values)

      await context.env.DB.batch([insertStmt, updateStmt])

      const preferences = await context.env.DB.prepare(
        'SELECT * FROM user_preferences WHERE user_id = ?'
      )
        .bind(userId)
        .first<UserPreferences>()

      if (!preferences) {
        return internalError('Failed to load preferences after update')
      }

      return success({
        preferences: mapPreferences(preferences),
      })
    } catch (error) {
      console.error('Update preferences error:', error)
      return internalError('Failed to update preferences')
    }
  },
]
