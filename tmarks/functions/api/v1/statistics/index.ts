/**
 * 统计数据 API
 * 路径: /api/v1/statistics
 * 认证: JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../lib/types'
import { success, internalError } from '../../../lib/response'
import { requireAuth, AuthContext } from '../../../middleware/auth'

interface DomainCount {
  domain: string
  count: number
}

// GET /api/v1/statistics - 获取使用统计
export const onRequestGet: PagesFunction<Env, string, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)
    const days = parseInt(url.searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    try {
      // 🚀 并行执行所有查询 - 性能优化
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
        // 1. 活跃标签页组计数
        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_groups WHERE user_id = ? AND is_deleted = 0'
        )
          .bind(userId)
          .all<{ count: number }>(),

        // 2. 已删除标签页组计数
        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_groups WHERE user_id = ? AND is_deleted = 1'
        )
          .bind(userId)
          .all<{ count: number }>(),

        // 3. 标签页项目计数
        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_group_items WHERE group_id IN (SELECT id FROM tab_groups WHERE user_id = ?)'
        )
          .bind(userId)
          .all<{ count: number }>(),

        // 4. 分享计数
        context.env.DB.prepare(
          'SELECT COUNT(*) as count FROM tab_group_shares WHERE group_id IN (SELECT id FROM tab_groups WHERE user_id = ?)'
        )
          .bind(userId)
          .all<{ count: number }>(),

        // 5. 标签页组创建趋势
        context.env.DB.prepare(
          `SELECT DATE(created_at) as date, COUNT(*) as count 
           FROM tab_groups 
           WHERE user_id = ? AND DATE(created_at) >= ? 
           GROUP BY DATE(created_at) 
           ORDER BY date ASC`
        )
          .bind(userId, startDateStr)
          .all<{ date: string; count: number }>(),

        // 6. 标签页项目创建趋势
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

        // 7. 热门域名 Top 10
        context.env.DB.prepare(
          `SELECT 
            CASE 
              WHEN INSTR(SUBSTR(url, INSTR(url, '://') + 3), '/') > 0 
              THEN SUBSTR(SUBSTR(url, INSTR(url, '://') + 3), 1, INSTR(SUBSTR(url, INSTR(url, '://') + 3), '/') - 1)
              ELSE SUBSTR(url, INSTR(url, '://') + 3)
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

        // 8. 标签页组大小分布
        context.env.DB.prepare(
          `SELECT 
            CASE 
              WHEN item_count = 0 THEN '0'
              WHEN item_count BETWEEN 1 AND 5 THEN '1-5'
              WHEN item_count BETWEEN 6 AND 10 THEN '6-10'
              WHEN item_count BETWEEN 11 AND 20 THEN '11-20'
              WHEN item_count BETWEEN 21 AND 50 THEN '21-50'
              ELSE '50+'
            END as range,
            COUNT(*) as count
           FROM (
             SELECT tg.id, COUNT(tgi.id) as item_count
             FROM tab_groups tg
             LEFT JOIN tab_group_items tgi ON tg.id = tgi.group_id
             WHERE tg.user_id = ? AND tg.is_deleted = 0 AND tg.is_folder = 0
             GROUP BY tg.id
           )
           GROUP BY range
           ORDER BY 
             CASE range
               WHEN '0' THEN 0
               WHEN '1-5' THEN 1
               WHEN '6-10' THEN 2
               WHEN '11-20' THEN 3
               WHEN '21-50' THEN 4
               ELSE 5
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
