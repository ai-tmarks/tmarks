/**
 *  API Key 
 * GET /api/v1/settings/api-keys/:id -  API Key 
 * PATCH /api/v1/settings/api-keys/:id -  API Key
 * DELETE /api/v1/settings/api-keys/:id -  API Key
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams, SQLParam } from '../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { getApiKeyStats } from '../../../../lib/api-key/logger'
import { PERMISSION_TEMPLATES } from '../../../../../shared/permissions'

interface UpdateApiKeyRequest {
  name?: string
  description?: string
  permissions?: string[]
  template?: 'READ_ONLY' | 'BASIC' | 'FULL'
  expires_at?: string | null
}

// GET /api/v1/settings/api-keys/:id -  API Key 
interface ApiKeyDetail {
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
    const keyId = context.params.id

    try {
      const keyData = await context.env.DB.prepare(
        `SELECT id, key_prefix, name, description, permissions, status,
                expires_at, last_used_at, last_used_ip, created_at, updated_at
         FROM api_keys
         WHERE id = ? AND user_id = ?`
      )
        .bind(keyId, userId)
        .first<ApiKeyDetail>()

      if (!keyData) {
        return notFound('API Key not found')
      }

      // 
      const stats = await getApiKeyStats(keyId, context.env.DB)

      return success({
        ...keyData,
        permissions: JSON.parse(keyData.permissions) as string[],
        stats,
      })
    } catch (error) {
      console.error('Failed to get API key:', error)
      return internalError('Failed to get API key details')
    }
  },
]

// PATCH /api/v1/settings/api-keys/:id -  API Key
export const onRequestPatch: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const keyId = context.params.id

    try {
      // 1.  Key 
      const existingKey = await context.env.DB.prepare(
        `SELECT id FROM api_keys WHERE id = ? AND user_id = ?`
      )
        .bind(keyId, userId)
        .first()

      if (!existingKey) {
        return notFound('API Key not found')
      }

      // 2. 
      const body = (await context.request.json()) as UpdateApiKeyRequest
      const { name, description, permissions, expires_at, template } = body

      const updates: string[] = []
      const values: SQLParam[] = []

      if (name !== undefined) {
        if (!name.trim()) {
          return badRequest({
            code: 'INVALID_INPUT',
            message: 'Name cannot be empty',
          })
        }
        updates.push('name = ?')
        values.push(name.trim())
      }

      if (description !== undefined) {
        updates.push('description = ?')
        values.push(description?.trim() || null)
      }

      if (template || permissions) {
        let permissionsList: string[] = []

        if (template && PERMISSION_TEMPLATES[template]) {
          permissionsList = PERMISSION_TEMPLATES[template].permissions
        } else if (permissions && Array.isArray(permissions)) {
          permissionsList = permissions
        }

        if (permissionsList.length > 0) {
          updates.push('permissions = ?')
          values.push(JSON.stringify(permissionsList))
        }
      }

      if (expires_at !== undefined) {
        if (expires_at === null) {
          updates.push('expires_at = NULL')
        } else {
          let expiresDate: Date

          //  (30d, 90d )  ISO 
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
          updates.push('expires_at = ?')
          values.push(expiresDate.toISOString())
        }
      }

      if (updates.length === 0) {
        return badRequest({
          code: 'INVALID_INPUT',
          message: 'No valid fields to update',
        })
      }

      // 3. 
      updates.push("updated_at = datetime('now')")
      values.push(keyId, userId)

      await context.env.DB.prepare(
        `UPDATE api_keys
         SET ${updates.join(', ')}
         WHERE id = ? AND user_id = ?`
      )
        .bind(...values)
        .run()

      // 4. 
      const updatedKey = await context.env.DB.prepare(
        `SELECT id, key_prefix, name, description, permissions, status,
                expires_at, last_used_at, last_used_ip, created_at, updated_at
         FROM api_keys
         WHERE id = ?`
      )
        .bind(keyId)
        .first<ApiKeyDetail>()

      if (!updatedKey) {
        return internalError('Failed to load updated API key')
      }

      return success({
        ...updatedKey,
        permissions: JSON.parse(updatedKey.permissions) as string[],
      })
    } catch (error) {
      console.error('Failed to update API key:', error)
      return internalError('Failed to update API key')
    }
  },
]

// DELETE /api/v1/settings/api-keys/:id -  API Key
export const onRequestDelete: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    const userId = context.data.user_id
    const keyId = context.params.id
    const url = new URL(context.request.url)
    const hardDelete = url.searchParams.get('hard') === 'true'

    try {
      // 1.  Key 
      const existingKey = await context.env.DB.prepare(
        `SELECT id FROM api_keys WHERE id = ? AND user_id = ?`
      )
        .bind(keyId, userId)
        .first()

      if (!existingKey) {
        return notFound('API Key not found')
      }

      if (hardDelete) {
        try {
          await context.env.DB.batch([
            context.env.DB.prepare('DELETE FROM api_key_logs WHERE api_key_id = ?').bind(keyId),
            context.env.DB.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').bind(keyId, userId),
          ])
        } catch (error) {
          console.error('Failed to delete API key records:', error)
          throw error
        }

        return success({
          message: 'API Key deleted permanently',
        })
      }

      // 2. （）
      await context.env.DB.prepare(
        `UPDATE api_keys
         SET status = 'revoked', updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
        .bind(keyId, userId)
        .run()

      return success({
        message: 'API Key revoked successfully',
      })
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      return internalError('Failed to revoke API key')
    }
  },
]
