/**
 *  API
 * : /api/tab/tab-groups/:id/share
 * : API Key (X-API-Key header)  JWT Token (Bearer)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../../lib/types'
import { success, notFound, internalError } from '../../../../lib/response'
import { requireDualAuth, DualAuthContext } from '../../../../middleware/dual-auth'
import { generateUUID } from '../../../../lib/crypto'

interface TabGroupRow {
  id: string
  user_id: string
  is_deleted: number
}

interface ShareRow {
  id: string
  group_id: string
  user_id: string
  share_token: string
  is_public: number
  view_count: number
  created_at: string
  expires_at: string | null
}

interface CreateShareRequest {
  is_public?: boolean
  expires_in_days?: number
}

// POST /api/tab/tab-groups/:id/share - 
export const onRequestPost: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.update'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      const body = (await context.request.json().catch(() => ({}))) as CreateShareRequest

      // Check if tab group exists and belongs to user
      const groupRow = await context.env.DB.prepare(
        'SELECT * FROM tab_groups WHERE id = ? AND user_id = ? AND is_deleted = 0'
      )
        .bind(groupId, userId)
        .first<TabGroupRow>()

      if (!groupRow) {
        return notFound('Tab group not found')
      }

      // Check if share already exists
      const existingShare = await context.env.DB.prepare(
        'SELECT * FROM shares WHERE group_id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<ShareRow>()

      if (existingShare) {
        return success({
          share: existingShare,
          share_url: `${new URL(context.request.url).origin}/share/${existingShare.share_token}`,
        })
      }

      // Generate share token
      const shareToken = generateUUID().replace(/-/g, '').substring(0, 16)
      const shareId = generateUUID()
      const now = new Date().toISOString()
      const isPublic = body.is_public !== false ? 1 : 0

      let expiresAt: string | null = null
      if (body.expires_in_days && body.expires_in_days > 0) {
        const expiresDate = new Date()
        expiresDate.setDate(expiresDate.getDate() + body.expires_in_days)
        expiresAt = expiresDate.toISOString()
      }

      // Create share
      await context.env.DB.prepare(
        'INSERT INTO shares (id, group_id, user_id, share_token, is_public, view_count, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(shareId, groupId, userId, shareToken, isPublic, 0, now, expiresAt)
        .run()

      const share = {
        id: shareId,
        group_id: groupId,
        user_id: userId,
        share_token: shareToken,
        is_public: isPublic,
        view_count: 0,
        created_at: now,
        expires_at: expiresAt,
      }

      return success({
        share,
        share_url: `${new URL(context.request.url).origin}/share/${shareToken}`,
      })
    } catch (error) {
      console.error('Create share error:', error)
      return internalError('Failed to create share')
    }
  },
]

// GET /api/tab/tab-groups/:id/share - 
export const onRequestGet: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.read'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Get share
      const share = await context.env.DB.prepare(
        'SELECT * FROM shares WHERE group_id = ? AND user_id = ?'
      )
        .bind(groupId, userId)
        .first<ShareRow>()

      if (!share) {
        return notFound('Share not found')
      }

      return success({
        share,
        share_url: `${new URL(context.request.url).origin}/share/${share.share_token}`,
      })
    } catch (error) {
      console.error('Get share error:', error)
      return internalError('Failed to get share')
    }
  },
]

// DELETE /api/tab/tab-groups/:id/share - 
export const onRequestDelete: PagesFunction<Env, RouteParams, DualAuthContext>[] = [
  requireDualAuth('tab_groups.delete'),
  async (context) => {
    const userId = context.data.user_id
    const groupId = context.params.id

    try {
      // Delete share
      await context.env.DB.prepare('DELETE FROM shares WHERE group_id = ? AND user_id = ?')
        .bind(groupId, userId)
        .run()

      return new Response(null, { status: 204 })
    } catch (error) {
      console.error('Delete share error:', error)
      return internalError('Failed to delete share')
    }
  },
]

