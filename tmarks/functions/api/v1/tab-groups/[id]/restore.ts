/**
 * 恢复标签页组 API
 * 路径: /api/v1/tab-groups/:id/restore
 * 认证: JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'

interface TabGroupRow {
  id: string
  user_id: string
  is_deleted: number
}

// POST /api/v1/tab-groups/:id/restore - 恢复标签页组
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Check if group exists and is deleted
      const group = await context.env.DB.prepare(
        'SELECT id, user_id, is_deleted FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      if (group.is_deleted !== 1) {
        return success({ message: 'Tab group is not in trash' })
      }

      // Restore the group
      await context.env.DB.prepare(
        'UPDATE tab_groups SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?'
      )
        .bind(new Date().toISOString(), groupId)
        .run()

      return success({ message: 'Tab group restored successfully' })
    } catch (error) {
      console.error('Restore tab group error:', error)
      return internalError('Failed to restore tab group')
    }
  },
]
