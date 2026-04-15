import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../lib/types'
import { extractJWT, verifyJWT } from '../lib/jwt'
import { unauthorized } from '../lib/response'

export interface AuthContext extends Record<string, unknown> {
  user_id: string
  session_id?: string
}

/**
 * Authentication Middleware - Requires valid JWT token
 */
export const requireAuth: PagesFunction<Env, RouteParams, AuthContext> = async (context) => {
  const token = extractJWT(context.request)

  if (!token) {
    return unauthorized('Missing authorization token')
  }

  try {
    const payload = await verifyJWT(token, context.env.JWT_SECRET)

    // Pass user info to context.data
    context.data.user_id = payload.sub
    context.data.session_id = payload.session_id

    return context.next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token'
    return unauthorized(message)
  }
}

/**
 * Optional Authentication Middleware - Validates token if present, continues if not
 */
export const optionalAuth: PagesFunction<Env, RouteParams, Partial<AuthContext>> = async (context) => {
  const token = extractJWT(context.request)

  if (token) {
    try {
      const payload = await verifyJWT(token, context.env.JWT_SECRET)
      context.data.user_id = payload.sub
      context.data.session_id = payload.session_id
    } catch {
      // Ignore invalid token, continue without auth
    }
  }

  return context.next()
}
