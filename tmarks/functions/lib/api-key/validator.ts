/**
 * API Key Validator
 */

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
 * Validate API Key
 * @param apiKey API Key string
 * @param db D1 Database instance
 * @returns Validation result
 */
export async function validateApiKey(
  apiKey: string,
  db: D1Database
): Promise<ValidationResult> {
  // 1. Validate format
  if (!apiKey || !apiKey.startsWith('tmk_')) {
    return { valid: false, error: 'Invalid API Key format' }
  }

  try {
    // 2. Hash and query database
    const keyHash = await hashApiKey(apiKey)

    const keyData = await db
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

    // 3. Check if revoked
    if (keyData.status === 'revoked') {
      return { valid: false, error: 'API Key has been revoked' }
    }

    // 4. Check if expired
    if (keyData.status === 'expired') {
      return { valid: false, error: 'API Key has expired' }
    }

    // 5. Check expiration date
    if (keyData.expires_at) {
      const expiresAt = new Date(keyData.expires_at)
      if (expiresAt < new Date()) {
        await markAsExpired(keyData.id, db)
        return { valid: false, error: 'API Key has expired' }
      }
    }

    // 6. Parse permissions
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
 * Check if permissions include required permission
 * @param permissions Array of permission strings
 * @param requiredPermission Required permission to check
 * @returns True if permission is granted
 */
export function checkPermission(permissions: string[], requiredPermission: string): boolean {
  return hasPermission(permissions, requiredPermission)
}

/**
 * Mark API Key as expired
 * @param keyId API Key ID
 * @param db D1 Database instance
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
 * Update last used timestamp and IP address
 * @param keyId API Key ID
 * @param ip Client IP address
 * @param db D1 Database instance
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
