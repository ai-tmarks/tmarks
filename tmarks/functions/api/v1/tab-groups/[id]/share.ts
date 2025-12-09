/**
 * 分享标签页组 API
 * 路径: /api/v1/tab-groups/:id/share
 * 认证: JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { generateUUID } from '../../../../lib/crypto'

interface TabGroupRow {
  id: string
  user_id: string
  title: string
}

interface ShareRow {
  id: string
  group_id: string
  share_token: string
  is_public: number
  expires_at: string | null
  created_at: string
}

interface CreateShareRequest {
  is_public?: boolean
  expires_in_days?: number
}

// POST /api/v1/tab-groups/:id/share - 创建分享链接
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      const body = (await context.request.json()) as CreateShareRequest

      // Verify group exists and belongs to user
      const group = await context.env.DB.prepare(
        'SELECT id, user_id, title FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      // Check if share already exists
      const existingShare = await context.env.DB.prepare(
        'SELECT * FROM tab_group_shares WHERE group_id = ?'
      )
        .bind(groupId)
        .first<ShareRow>()

      if (existingShare) {
        // Update existing share
        const expiresAt = body.expires_in_days
          ? new Date(Date.now() + body.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
          : null

        await context.env.DB.prepare(
          'UPDATE tab_group_shares SET is_public = ?, expires_at = ? WHERE id = ?'
        )
          .bind(body.is_public ? 1 : 0, expiresAt, existingShare.id)
          .run()

        return success({
          share_token: existingShare.share_token,
          is_public: body.is_public ?? false,
          expires_at: expiresAt,
          share_url: `${new URL(context.request.url).origin}/share/${existingShare.share_token}`,
        })
      }

      // Create new share
      const shareId = generateUUID()
      const shareToken = generateUUID()
      const isPublic = body.is_public ?? false
      const expiresAt = body.expires_in_days
        ? new Date(Date.now() + body.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : null
      const now = new Date().toISOString()

      await context.env.DB.prepare(
        `INSERT INTO tab_group_shares (id, group_id, share_token, is_public, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(shareId, groupId, shareToken, isPublic ? 1 : 0, expiresAt, now)
        .run()

      return success({
        share_token: shareToken,
        is_public: isPublic,
        expires_at: expiresAt,
        share_url: `${new URL(context.request.url).origin}/share/${shareToken}`,
      })
    } catch (error) {
      console.error('Create share error:', error)
      return internalError('Failed to create share')
    }
  },
]

// GET /api/v1/tab-groups/:id/share - 获取分享信息
export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Verify group exists and belongs to user
      const group = await context.env.DB.prepare(
        'SELECT id, user_id FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      // Get share info
      const share = await context.env.DB.prepare(
        'SELECT * FROM tab_group_shares WHERE group_id = ?'
      )
        .bind(groupId)
        .first<ShareRow>()

      if (!share) {
        return notFound('Share not found')
      }

      return success({
        share_token: share.share_token,
        is_public: share.is_public === 1,
        expires_at: share.expires_at,
        share_url: `${new URL(context.request.url).origin}/share/${share.share_token}`,
        created_at: share.created_at,
      })
    } catch (error) {
      console.error('Get share error:', error)
      return internalError('Failed to get share info')
    }
  },
]

// DELETE /api/v1/tab-groups/:id/share - 删除分享
export const onRequestDelete: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Verify group exists and belongs to user
      const group = await context.env.DB.prepare(
        'SELECT id, user_id FROM tab_groups WHERE id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!group) {
        return notFound('Tab group not found')
      }

      // Delete share
      await context.env.DB.prepare('DELETE FROM tab_group_shares WHERE group_id = ?')
        .bind(groupId)
        .run()

      return success({ message: 'Share deleted successfully' })
    } catch (error) {
      console.error('Delete share error:', error)
      return internalError('Failed to delete share')
    }
  },
]
