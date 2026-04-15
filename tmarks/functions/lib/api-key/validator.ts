/**

import { hashApiKey } from './generator'
import { hasPermission } from '../../../shared/permissions'

interface ApiKeyData {
  id: string
  user_id: string
  permissions: string // JSON string
  status: 'active' | 'revoked' | 'expired'
  expires_at: string | null
  last_used_at: string | null
  last_used_ip: string | null
}

interface ValidationResult {
  valid: boolean
  error?: string
  data?: ApiKeyData
  permissions?: string[]
}

/**
 *  API Key
 * @param apiKey API Key 
 * @param db D1 Database
 * @returns 
 */
export async function validateApiKey(
  apiKey: string,
  db: D1Database
): Promise<ValidationResult> {
  // 1. 
  if (!apiKey || !apiKey.startsWith('tmk_')) {
    return { valid: false, error: 'Invalid API Key format' }
  }

  try {
    // 2. 
    const keyHash = await hashApiKey(apiKey)

      .prepare(
        `SELECT id, user_id, permissions, status, expires_at, last_used_at, last_used_ip
         FROM api_keys
         WHERE key_hash = ?`
      )
      .bind(keyHash)
      .first<ApiKeyData>()

    if (!keyData) {
      return { valid: false, error: 'API Key not found' }
    }

      return { valid: false, error: 'API Key has been revoked' }
    }

    if (keyData.status === 'expired') {
      return { valid: false, error: 'API Key has expired' }
    }

      const expiresAt = new Date(keyData.expires_at)
      if (expiresAt < new Date()) {

        return { valid: false, error: 'API Key has expired' }
      }
    }

    // 6. 
    const permissions = JSON.parse(keyData.permissions) as string[]

    return {
      valid: true,
      data: keyData,
      permissions,
    }
  } catch (error) {
    console.error('API Key validation error:', error)
    return { valid: false, error: 'Internal validation error' }
  }
}

/**

 * @param requiredPermission 

export function checkPermission(permissions: string[], requiredPermission: string): boolean {
  return hasPermission(permissions, requiredPermission)
}

/**
 *  API Key 
 * @param keyId API Key ID
 * @param db D1 Database
 */
async function markAsExpired(keyId: string, db: D1Database): Promise<void> {
  await db
    .prepare(
      `UPDATE api_keys
       SET status = 'expired', updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(keyId)
    .run()
}

/**

 * @param ip  IP
 * @param db D1 Database
 */
export async function updateLastUsed(
  keyId: string,
  ip: string | null,
  db: D1Database
): Promise<void> {
  await db
    .prepare(
      `UPDATE api_keys
       SET last_used_at = datetime('now'),
           last_used_ip = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(ip, keyId)
    .run()
}
