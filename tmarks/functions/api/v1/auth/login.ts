import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, User } from '../../../lib/types'
import { badRequest, unauthorized, success, internalError } from '../../../lib/response'
import { verifyPassword, generateToken, hashRefreshToken, generateUUID } from '../../../lib/crypto'
import { generateJWT, parseExpiry } from '../../../lib/jwt'
import { loginRateLimiter } from '../../../lib/rate-limit'
import { getJwtAccessTokenExpiresIn, getJwtRefreshTokenExpiresIn } from '../../../lib/config'

interface LoginRequest {
  username: string
  password: string
  remember_me?: boolean
}

export const onRequestPost: PagesFunction<Env>[] = [
  loginRateLimiter,
  async (context) => {
  try {
    const body = await context.request.json() as LoginRequest

    if (!body.username || !body.password) {
      return badRequest('Username and password are required')
    }

    // （）
    type DbUser = User & { role?: string | null }

    let user: DbUser | null = null

    try {
      user = await context.env.DB.prepare(
        `SELECT id, username, email, password_hash, role
         FROM users
         WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`
      )
        .bind(body.username, body.username)
        .first<DbUser>()
    } catch (error) {
      if (error instanceof Error && /no such column: role/i.test(error.message)) {
        user = await context.env.DB.prepare(
          `SELECT id, username, email, password_hash
           FROM users
           WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`
        )
          .bind(body.username, body.username)
          .first<DbUser>()
      } else {
        throw error
      }
    }

    if (!user) {

      const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
      await context.env.DB.prepare(
        `INSERT INTO audit_logs (event_type, payload, ip, created_at)
         VALUES ('auth.login_failed', ?, ?, ?)`
      )
        .bind(
          JSON.stringify({ username: body.username, reason: 'user_not_found' }),
          ip,
          new Date().toISOString()
        )
        .run()

      return unauthorized('Invalid username or password')
    }

    // 
    const isValid = await verifyPassword(body.password, user.password_hash)

    if (!isValid) {

      const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
      await context.env.DB.prepare(
        `INSERT INTO audit_logs (user_id, event_type, payload, ip, created_at)
         VALUES (?, 'auth.login_failed', ?, ?, ?)`
      )
        .bind(
          user.id,
          JSON.stringify({ username: body.username, reason: 'invalid_password' }),
          ip,
          new Date().toISOString()
        )
        .run()

      return unauthorized('Invalid username or password')
    }

    //  session_id
    const sessionId = generateUUID()

    const role = user.role ?? 'user'

    // （）
    const accessTokenExpiresInStr = getJwtAccessTokenExpiresIn(context.env)
    const accessTokenExpiresIn = parseExpiry(accessTokenExpiresInStr)

    const accessToken = await generateJWT(
      { sub: user.id, session_id: sessionId },
      context.env.JWT_SECRET,
      accessTokenExpiresInStr
    )

    // 
    const refreshToken = generateToken(32)
    const refreshTokenHash = await hashRefreshToken(refreshToken)

    // 
    const refreshTokenExpiresInStr = getJwtRefreshTokenExpiresIn(context.env)
    const refreshTokenExpiresIn = parseExpiry(refreshTokenExpiresInStr)
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000)

    // 
    await context.env.DB.prepare(
      `INSERT INTO auth_tokens (user_id, refresh_token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(user.id, refreshTokenHash, refreshTokenExpiresAt.toISOString(), new Date().toISOString())
      .run()

    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
    const userAgent = context.request.headers.get('User-Agent') || 'unknown'

    await context.env.DB.prepare(
      `INSERT INTO audit_logs (user_id, event_type, payload, ip, user_agent, created_at)
       VALUES (?, 'auth.login_success', ?, ?, ?, ?)`
    )
      .bind(
        user.id,
        JSON.stringify({ session_id: sessionId, remember_me: body.remember_me }),
        ip,
        userAgent,
        new Date().toISOString()
      )
      .run()

    return success({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: accessTokenExpiresIn,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return internalError('Login failed')
  }
},
]
