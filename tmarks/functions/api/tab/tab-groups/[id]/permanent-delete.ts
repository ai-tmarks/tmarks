/**
 *  API
 * : /api/tab/tab-groups/:id/permanent-delete
 * : API Key (X-API-Key header)  JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { notFound, internalError } from '../../../../lib/response'
import { requireDualAuth, DualAuthContext } from '../../../../middleware/dual-auth'

interface TabGroupRow {
  id: string
  user_id: string
  is_deleted: number
}

// DELETE /api/tab/tab-groups/:id/permanent-delete - 
export const onRequestDelete: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.delete'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Check if tab group exists and is deleted
      const groupRow = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ? AND user_id = ? AND is_deleted = 1'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!groupRow) {
        return notFound('Tab group not found in trash')
      }

      // Delete tab group items first
      await context.env.DB.prepare('DELETE FROM tab_group_items WHERE group_id = ?')
        .bind(groupId)
        .run()

      // Delete shares
      await context.env.DB.prepare('DELETE FROM shares WHERE group_id = ?')
        .bind(groupId)
        .run()

      // Permanently delete tab group
      await context.env.DB.prepare('DELETE FROM tab_groups WHERE id = ?')
        .bind(groupId)
        .run()

      return new Response(null, { status: 204 })
    } catch (error) {
      console.error('Permanent delete tab group error:', error)
      return internalError('Failed to permanently delete tab group')
    }
  },
]

