/**
 * 永久删除标签页组 API
 * 路径: /api/v1/tab-groups/:id/permanent-delete
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

// DELETE /api/v1/tab-groups/:id/permanent-delete - 永久删除标签页组
export const onRequestDelete: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Check if group exists and is in trash
      const group = await context.env.DB.prepare(
        'SELECT id, user_id, is_deleted FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      if (group.is_deleted !== 1) {
        return notFound('Tab group must be in trash before permanent deletion')
      }

      // Delete all items in the group
      await context.env.DB.prepare('DELETE FROM tab_group_items WHERE group_id = ?')
        .bind(groupId)
        .run()

      // Delete the group
      await context.env.DB.prepare('DELETE FROM tab_groups WHERE id = ?')
        .bind(groupId)
        .run()

      return success({ message: 'Tab group permanently deleted' })
    } catch (error) {
      console.error('Permanent delete tab group error:', error)
      return internalError('Failed to permanently delete tab group')
    }
  },
]
