/**
 * API Key Authentication Middleware for Cloudflare Pages Functions
 * Validates API Key and checks permissions for Pages Functions routes
 */
import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../lib/types'
import { validateApiKey } from '../lib/api-key/validator'
import { consumeRateLimit } from '../lib/api-key/rate-limiter'
import { logApiKeyUsage } from '../lib/api-key/logger'
import { unauthorized, forbidden, tooManyRequests } from '../lib/response'
import { hasPermission } from '../../shared/permissions'
export interface ApiKeyAuthContext extends Record<string, unknown> {
  user_id: string
  api_key_id: string
  api_key_permissions: string[]
}
/**
 * Create API Key authentication middleware
 * @param requiredPermission Required permission string
 */
export function requireApiKeyAuth(
  requiredPermission: string
): PagesFunction<Env, RouteParams, ApiKeyAuthContext> {
  return async (context) => {
    const request = context.request
    try {
      // 1. Extract API Key
      const apiKey = request.headers.get('X-API-Key')
      if (!apiKey) {
        return unauthorized({
          code: 'MISSING_API_KEY',
          message: 'API Key is required. Please provide X-API-Key header.',
        })
      }
      // 2. Validate API Key
      const validation = await validateApiKey(apiKey, context.env.DB)
      if (!validation.valid || !validation.data || !validation.permissions) {
        return unauthorized({
          code: 'INVALID_API_KEY',
          message: validation.error || 'Invalid API Key',
        })
      }
      const { data: keyData, permissions } = validation
      // 3. Check permissions
      if (!hasPermission(permissions, requiredPermission)) {
        return forbidden({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Missing required permission: ${requiredPermission}`,
          required: requiredPermission,
          available: permissions,
        })
      }
      // 4. Rate limiting (D1 based)
      const rateLimitResult = await consumeRateLimit(keyData.id, context.env.DB)
      const rateLimitHeaders: Record<string, string> = {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.reset / 1000)),
      }
      if (!rateLimitResult.allowed) {
        const retryAfter = rateLimitResult.retryAfter || 0
        return tooManyRequests(
          {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
          {
            'Retry-After': String(retryAfter),
            ...rateLimitHeaders,
          }
        )
      }
      // 5. Get request IP
      const ip =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        null
      // 6. Pass user info to context.data (for downstream handlers)
      context.data.user_id = keyData.user_id
      context.data.api_key_id = keyData.id
      context.data.api_key_permissions = permissions
      // 8. Update last used info (async, non-blocking)
      context.waitUntil(
        (async () => {
          try {
            await context.env.DB.prepare(
              `UPDATE api_keys SET last_used_at = datetime('now'), last_used_ip = ? WHERE id = ?`
            )
              .bind(ip, keyData.id)
              .run()
          } catch (error) {
            console.error('Failed to update last_used:', error)
          }
        })()
      )
      // 9. Log API usage (async, non-blocking)
      context.waitUntil(
        (async () => {
          try {
            await logApiKeyUsage(
              {
                api_key_id: keyData.id,
                user_id: keyData.user_id,
                endpoint: new URL(request.url).pathname,
                method: request.method,
                status: 200, // Default status, actual status logged after response
                ip,
              },
              context.env.DB
            )
          } catch (error) {
            console.error('Failed to log API usage:', error)
          }
        })()
      )
      // 10. Continue to next handler (may return undefined, next() handles it)
      // Note: Pages Functions middleware can return undefined
      const response = await context.next()
      const headers = new Headers(response.headers)
      Object.entries(rateLimitHeaders).forEach(([k, v]) => headers.set(k, v))
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      console.error('API Key auth middleware error:', error)
      return unauthorized({
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      })
    }
  }
}
