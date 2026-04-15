import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../lib/types'
import { badRequest, unauthorized, success, internalError } from '../../../lib/response'
import { hashRefreshToken, generateUUID } from '../../../lib/crypto'
import { generateJWT } from '../../../lib/jwt'
import { getJwtAccessTokenExpiresIn } from '../../../lib/config'

interface RefreshRequest {
  refresh_token: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as RefreshRequest

    if (!body.refresh_token) {
      return badRequest('Refresh token is required')
    }

    // 
    const tokenHash = await hashRefreshToken(body.refresh_token)

    // 
    const tokenRecord = await context.env.DB.prepare(
      `SELECT id, user_id, expires_at, revoked_at
       FROM auth_tokens
       WHERE refresh_token_hash = ?`
    )
      .bind(tokenHash)
      .first<{
        id: number
        user_id: string
        expires_at: string
        revoked_at: string | null
      }>()

    if (!tokenRecord) {
      return unauthorized('Invalid refresh token')
    }

    // 
    if (tokenRecord.revoked_at) {
      return unauthorized('Refresh token has been revoked')
    }

    const expiresAt = new Date(tokenRecord.expires_at)
    if (expiresAt < new Date()) {
      return unauthorized('Refresh token has expired')
    }

    //  session_id
    const sessionId = generateUUID()

    // 
    const accessToken = await generateJWT(
      { sub: tokenRecord.user_id, session_id: sessionId },
      context.env.JWT_SECRET,
      getJwtAccessTokenExpiresIn(context.env)
    )

    // 
    type DbUser = { id: string; username: string; email: string | null; role?: string | null }

    let user: DbUser | null = null

    try {
      user = await context.env.DB.prepare(
        'SELECT id, username, email, role FROM users WHERE id = ?'
      )
        .bind(tokenRecord.user_id)
        .first<DbUser>()
    } catch (error) {
      if (error instanceof Error && /no such column: role/i.test(error.message)) {
        user = await context.env.DB.prepare(
          'SELECT id, username, email FROM users WHERE id = ?'
        )
          .bind(tokenRecord.user_id)
          .first<DbUser>()
      } else {
        throw error
      }
    }

    if (!user) {
      return unauthorized('User not found')
    }

    const role = user.role ?? 'user'

    // 
    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
    await context.env.DB.prepare(
      `INSERT INTO audit_logs (user_id, event_type, payload, ip, created_at)
       VALUES (?, 'auth.token_refreshed', ?, ?, ?)`
    )
      .bind(
        tokenRecord.user_id,
        JSON.stringify({ session_id: sessionId }),
        ip,
        new Date().toISOString()
      )
      .run()

    return success({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: parseExpiresInToSeconds(getJwtAccessTokenExpiresIn(context.env)),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
      },
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return internalError('Token refresh failed')
  }
}

function parseExpiresInToSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(s|m|h|d)$/)
  if (!match) return 31536000
  const value = parseInt(match[1], 10)
  switch (match[2]) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return 31536000
  }
}
