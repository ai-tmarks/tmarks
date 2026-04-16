/**
 *  API
 * : /api/tab/tab-groups/:id/restore
 * : API Key (X-API-Key header)  JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireDualAuth, DualAuthContext } from '../../../../middleware/dual-auth'

interface TabGroupRow {
  id: string
  user_id: string
  is_deleted: number
}

// POST /api/tab/tab-groups/:id/restore - 
export const onRequestPost: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.update'),
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

      // Restore tab group
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

