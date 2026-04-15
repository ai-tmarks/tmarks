import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import { badRequest, noContent, internalError } from '../../../lib/response'
import { hashRefreshToken } from '../../../lib/crypto'
import { requireAuth, AuthContext } from '../../../middleware/auth'

interface LogoutRequest {
  refresh_token: string
  revoke_all?: boolean // 
}

export const onRequest: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const body = await context.request.json() as LogoutRequest

      if (!body.refresh_token) {
        return badRequest('Refresh token is required')
      }

      const userId = context.data.user_id
      const now = new Date().toISOString()

      if (body.revoke_all) {

          `UPDATE auth_tokens
           SET revoked_at = ?
           WHERE user_id = ? AND revoked_at IS NULL`
        )
          .bind(now, userId)
          .run()

        // 
        const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
        await context.env.DB.prepare(
          `INSERT INTO audit_logs (user_id, event_type, payload, ip, created_at)
           VALUES (?, 'auth.logout_all_devices', ?, ?, ?)`
        )
          .bind(userId, JSON.stringify({ revoked_count: 'all' }), ip, now)
          .run()
      } else {
        // 
        const tokenHash = await hashRefreshToken(body.refresh_token)

        await context.env.DB.prepare(
          `UPDATE auth_tokens
           SET revoked_at = ?
           WHERE refresh_token_hash = ? AND user_id = ? AND revoked_at IS NULL`
        )
          .bind(now, tokenHash, userId)
          .run()

        // 
        const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
        await context.env.DB.prepare(
          `INSERT INTO audit_logs (user_id, event_type, payload, ip, created_at)
           VALUES (?, 'auth.logout', ?, ?, ?)`
        )
          .bind(userId, JSON.stringify({ single_device: true }), ip, now)
          .run()
      }

      return noContent()
    } catch (error) {
      console.error('Logout error:', error)
      return internalError('Logout failed')
    }
  },
]
