

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../lib/types'
import { success, internalError } from '../../../lib/response'
import { requireDualAuth, DualAuthContext } from '../../../middleware/dual-auth'

interface DomainCount {
  domain: string
  count: number
}

// GET /api/tab/statistics - Retrieve tab statistics
export const onRequestGet: PagesFunction<Env, string, DualAuthContext>[] = [
  requireDualAuth('tab_groups.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)
    const days = parseInt(url.searchParams.get('days') || '30', 10) || 30

    try {

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      const [
        groupsResult,
        deletedGroupsResult,
        itemsResult,
        sharesResult,
        groupsTrend,
        itemsTrend,
        domains,
        groupSizes
      ] = await Promise.all([

        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_groups WHERE user_id = ? AND is_deleted = 0'
        )
          .bind(userId)
          .all<{ count: number }>(),

        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_groups WHERE user_id = ? AND is_deleted = 1'
        )
          .bind(userId)
          .all<{ count: number }>(),

        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_group_items WHERE group_id IN (SELECT id FROM tab_groups WHERE user_id = ?)'
        )
          .bind(userId)
          .all<{ count: number }>(),

        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM shares WHERE user_id = ?'
        )
          .bind(userId)
          .all<{ count: number }>(),

        context.env.DB.prepare(
          `SELECT DATE(created_at) as date, COUNT(*) as count 
           FROM tab_groups 
           WHERE user_id = ? AND DATE(created_at) >= ? 
           GROUP BY DATE(created_at) 
           ORDER BY date ASC`
        )
          .bind(userId, startDateStr)
          .all<{ date: string; count: number }>(),

        context.env.DB.prepare(
          `SELECT DATE(created_at) as date, COUNT(*) as count 
           FROM tab_group_items 
           WHERE group_id IN (SELECT id FROM tab_groups WHERE user_id = ?) 
           AND DATE(created_at) >= ? 
           GROUP BY DATE(created_at) 
           ORDER BY date ASC`
        )
          .bind(userId, startDateStr)
          .all<{ date: string; count: number }>(),

        context.env.DB.prepare(
          `SELECT 
            CASE 
              WHEN url LIKE 'http://%' THEN SUBSTR(url, 8, INSTR(SUBSTR(url, 8), '/') - 1)
              WHEN url LIKE 'https://%' THEN SUBSTR(url, 9, INSTR(SUBSTR(url, 9), '/') - 1)
              ELSE url
            END as domain,
            COUNT(*) as count
           FROM tab_group_items 
           WHERE group_id IN (SELECT id FROM tab_groups WHERE user_id = ?)
           GROUP BY domain
           ORDER BY count DESC
           LIMIT 10`
        )
          .bind(userId)
          .all<DomainCount>(),

        context.env.DB.prepare(
          `SELECT 
            CASE 
              WHEN item_count = 0 THEN '0'
              WHEN item_count <= 5 THEN '1-5'
              WHEN item_count <= 10 THEN '6-10'
              WHEN item_count <= 20 THEN '11-20'
              WHEN item_count <= 50 THEN '21-50'
              ELSE '50+'
            END as range,
            COUNT(*) as count
           FROM (
             SELECT g.id, COUNT(i.id) as item_count
             FROM tab_groups g
             LEFT JOIN tab_group_items i ON g.id = i.group_id
             WHERE g.user_id = ? AND g.is_deleted = 0
             GROUP BY g.id
           )
           GROUP BY range
           ORDER BY 
             CASE range
               WHEN '0' THEN 1
               WHEN '1-5' THEN 2
               WHEN '6-10' THEN 3
               WHEN '11-20' THEN 4
               WHEN '21-50' THEN 5
               ELSE 6
             END`
        )
          .bind(userId)
          .all<{ range: string; count: number }>()
      ])

      return success({
        summary: {
          total_groups: groupsResult.results?.[0]?.count || 0,
          total_deleted_groups: deletedGroupsResult.results?.[0]?.count || 0,
          total_items: itemsResult.results?.[0]?.count || 0,
          total_shares: sharesResult.results?.[0]?.count || 0,
        },
        trends: {
          groups: groupsTrend.results || [],
          items: itemsTrend.results || [],
        },
        top_domains: domains.results || [],
        group_size_distribution: groupSizes.results || [],
      })
    } catch (error) {
      console.error('Get statistics error:', error)
      return internalError('Failed to get statistics')
    }
  },
]
