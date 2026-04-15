/**
 * API Key Authentication Middleware
 * Validates API Key and checks permissions
 */

import { Context } from 'hono'
import { validateApiKey, checkPermission, updateLastUsed } from '../lib/api-key/validator'
import { consumeRateLimit } from '../lib/api-key/rate-limiter'
import { logApiKeyUsage } from '../lib/api-key/logger'

interface ApiKeyAuthOptions {
  requiredPermission: string
}

/**
 * Create API Key authentication middleware
 * @param options Configuration options
 * @returns Middleware function
 */
export function requireApiKey(options: ApiKeyAuthOptions) {
  return async (c: Context, next: () => Promise<void>) => {
    const { requiredPermission } = options

    // 1. Extract API Key
    const apiKey = c.req.header('X-API-Key')

    if (!apiKey) {
      return c.json(
        {
          error: {
            code: 'MISSING_API_KEY',
            message: 'API Key is required. Please provide X-API-Key header.',
          },
        },
        401
      )
    }

    // 2. Validate API Key
    const validation = await validateApiKey(apiKey, c.env.DB)

    if (!validation.valid || !validation.data || !validation.permissions) {
      return c.json(
        {
          error: {
            code: 'INVALID_API_KEY',
            message: validation.error || 'Invalid API Key',
          },
        },
        401
      )
    }

    const { data: keyData, permissions } = validation

    // 3. Check permissions
    if (!checkPermission(permissions, requiredPermission)) {
      return c.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Missing required permission: ${requiredPermission}`,
            required: requiredPermission,
            available: permissions,
          },
        },
        403
      )
    }

    // 4. Rate limiting (D1 based)
    const rateLimitResult = await consumeRateLimit(keyData.id, c.env.DB)
    if (!rateLimitResult.allowed) {
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retry_after: rateLimitResult.retryAfter || 0,
          },
        },
        429,
        {
          'Retry-After': String(rateLimitResult.retryAfter || 0),
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.reset / 1000)),
        }
      )
    }

    // 5. Get request IP
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null

    // 6. Update last used timestamp
    await updateLastUsed(keyData.id, ip, c.env.DB)

    // 7. Set context variables
    c.set('user_id', keyData.user_id)
    c.set('api_key_id', keyData.id)
    c.set('api_key_permissions', permissions)

    // 8. Continue to next handler
    await next()

    // 9. Log API usage
    const status = c.res.status
    const endpoint = c.req.path
    const method = c.req.method

    await logApiKeyUsage(
      {
        api_key_id: keyData.id,
        user_id: keyData.user_id,
        endpoint,
        method,
        status,
        ip,
      },
      c.env.DB
    )
  }
}

/**
 * Optional API Key authentication middleware
 * Validates API Key if present, continues without auth if not provided
 */
export function optionalApiKey() {
  return async (c: Context, next: () => Promise<void>) => {
    const apiKey = c.req.header('X-API-Key')

    if (apiKey) {
      const validation = await validateApiKey(apiKey, c.env.DB)

      if (validation.valid && validation.data && validation.permissions) {
        c.set('user_id', validation.data.user_id)
        c.set('api_key_id', validation.data.id)
        c.set('api_key_permissions', validation.permissions)
      }
    }

    await next()
  }
}
