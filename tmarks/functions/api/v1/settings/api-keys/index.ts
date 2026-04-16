

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../lib/types'
import { success, badRequest, created, internalError } from '../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { generateApiKey } from '../../lib/api-key/generator'
import { PERMISSION_TEMPLATES } from '../../../../../shared/permissions'

interface CreateApiKeyRequest {
  name: string
  description?: string
  permissions?: string[]
  template?: 'READ_ONLY' | 'BASIC' | 'FULL'
  expires_at?: string | null
}

async function getUserApiKeyLimit(_db: D1Database, _userId: string): Promise<number> {
  
  void _db
  void _userId
  return 999
}

// GET /api/v1/settings/api-keys - Retrieve API keys
interface ApiKeyRow {
  id: string
  key_prefix: string
  name: string
  description: string | null
  permissions: string
  status: string
  expires_at: string | null
  last_used_at: string | null
  last_used_ip: string | null
  created_at: string
  updated_at: string
}

export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id

    try {
      const keys = await context.env.DB.prepare(
        `SELECT id, key_prefix, name, description, permissions, status,
                expires_at, last_used_at, last_used_ip, created_at, updated_at
         FROM api_keys
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
        .bind(userId)
        .all<ApiKeyRow>()

      const quota = await context.env.DB.prepare(
        `SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND status = 'active'`
      )
        .bind(userId)
        .first<{ count: number }>()

      const used = quota?.count || 0
      const limit = await getUserApiKeyLimit(context.env.DB, userId)

      return success({
        keys: (keys.results ?? []).map((key) => ({
          ...key,
          permissions: JSON.parse(key.permissions) as string[],
        })),
        quota: {
          used,
          limit,
        },
      })
    } catch (error) {
      console.error('Failed to list API keys:', error)
      return internalError('Failed to list API keys')
    }
  },
]

// POST /api/v1/settings/api-keys - Create new API Key
export const onRequestPost: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id

    try {
      
      const quota = await context.env.DB.prepare(
        `SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND status = 'active'`
      )
        .bind(userId)
        .first<{ count: number }>()

      const used = quota?.count || 0
      const limit = await getUserApiKeyLimit(context.env.DB, userId)

      if (used >= limit) {
        return badRequest({
          code: 'QUOTA_EXCEEDED',
          message: `Maximum ${limit} API keys allowed per user`,
          quota: { used, limit },
        })
      }

      const body = (await context.request.json()) as CreateApiKeyRequest
      const { name, description, permissions, expires_at, template } = body

      if (!name || !name.trim()) {
        return badRequest({
          code: 'INVALID_INPUT',
          message: 'Name is required',
        })
      }

      let permissionsList: string[] = []

      if (template && PERMISSION_TEMPLATES[template]) {
        
        permissionsList = PERMISSION_TEMPLATES[template].permissions
      } else if (permissions && Array.isArray(permissions)) {
        
        permissionsList = permissions
      } else {
        
        permissionsList = PERMISSION_TEMPLATES.BASIC.permissions
      }

      if (permissionsList.length === 0) {
        return badRequest({
          code: 'INVALID_INPUT',
          message: 'At least one permission is required',
        })
      }

      let expiresAt: string | null = null
      if (expires_at) {
        let expiresDate: Date

        if (expires_at.match(/^\d+d$/)) {
          const days = parseInt(expires_at.slice(0, -1), 10)
          expiresDate = new Date()
          expiresDate.setDate(expiresDate.getDate() + days)
        } else {
          expiresDate = new Date(expires_at)
        }

        if (expiresDate <= new Date()) {
          return badRequest({
            code: 'INVALID_INPUT',
            message: 'Expiration date must be in the future',
          })
        }
        expiresAt = expiresDate.toISOString()
      }

      const { key, prefix, hash } = await generateApiKey('live')

      const keyId = crypto.randomUUID()

      await context.env.DB.prepare(
        `INSERT INTO api_keys
         (id, user_id, key_hash, key_prefix, name, description, permissions, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      )
        .bind(
          keyId,
          userId,
          hash,
          prefix,
          name.trim(),
          description?.trim() || null,
          JSON.stringify(permissionsList),
          expiresAt
        )
        .run()

      return created({
        id: keyId,
        key, 
        key_prefix: prefix,
        name: name.trim(),
        description: description?.trim() || null,
        permissions: permissionsList,
        status: 'active',
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to create API key:', error)
      return internalError('Failed to create API key')
    }
  },
]
