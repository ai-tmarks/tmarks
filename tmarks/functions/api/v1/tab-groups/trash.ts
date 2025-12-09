/**
 * 回收站 API
 * 路径: /api/v1/tab-groups/trash
 * 认证: JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../lib/types'
import { success, internalError } from '../../../lib/response'
import { requireAuth, AuthContext } from '../../../middleware/auth'

interface TabGroupRow {
  id: string
  user_id: string
  title: string
  color: string | null
  tags: string | null
  parent_id: string | null
  is_folder: number
  is_deleted: number
  deleted_at: string | null
  position: number
  created_at: string
  updated_at: string
}

// GET /api/v1/tab-groups/trash - 获取回收站中的标签页组
export const onRequestGet: PagesFunction<Env, string, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id

    try {
      // Get deleted tab groups
      const { results: groups } = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE user_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC'
      )
        .bind(userId)
        .all<TabGroupRow>()

      // Get item counts for each group
      const groupsWithCounts = await Promise.all(
        (groups || []).map(async (group) => {
          const { results: items } = await context.env.DB.prepare(
            'SELECT COUNT(*) as count FROM tab_group_items WHERE group_id = ?'
          )
            .bind(group.id)
            .all<{ count: number }>()

          let tags: string[] | null = null
          if (group.tags) {
            try {
              tags = JSON.parse(group.tags)
            } catch {
              tags = null
            }
          }

          return {
            ...group,
            tags,
            item_count: items?.[0]?.count || 0,
          }
        })
      )

      return success({
        tab_groups: groupsWithCounts,
        total: groupsWithCounts.length,
      })
    } catch (error) {
      console.error('Get trash error:', error)
      return internalError('Failed to load trash')
    }
  },
]
