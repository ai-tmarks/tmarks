import type { Env } from './types'
import type { D1Database } from '@cloudflare/workers-types'

/**
 * R2 Storage Quota Management
 *
 * Calculation method: R2 total storage (snapshots + images)
 * Data source: Query D1 database bookmark_snapshots.file_size and bookmark_images.file_size
 */

// Note: If not configured or <= 0, means "unlimited"
type UsageRow = {
  total: number | null
}

/**
 * Get R2 storage quota limit (bytes)
 *
 * Rules:
 * - Not configured/empty: "unlimited"
 * - Invalid format: "unlimited"
 * - <= 0: "unlimited"
 * - > 0: Use configured value
 */
export function getR2MaxTotalBytes(env: Env): number {
  const raw = env.R2_MAX_TOTAL_BYTES

  if (!raw || raw.trim() === '') {
    return Number.POSITIVE_INFINITY
  }

  const parsed = Number(raw)

  if (!Number.isFinite(parsed)) {
    console.warn('[StorageQuota] Invalid R2_MAX_TOTAL_BYTES, treating as unlimited', raw)
    return Number.POSITIVE_INFINITY
  }

  if (parsed <= 0) {
    return Number.POSITIVE_INFINITY
  }

  return parsed
}

/**
 * Get current R2 storage usage (bytes)
 *
 * Data sources:
 * - bookmark_snapshots.file_size: Snapshot HTML + images (V2 format)
 * - bookmark_images.file_size: Cover images (deduplicated by image_hash)
 */
export async function getCurrentR2UsageBytes(db: D1Database): Promise<number> {
  const snapshotRow = await db
    .prepare('SELECT COALESCE(SUM(file_size), 0) AS total FROM bookmark_snapshots')
    .first<UsageRow>()

  const snapshotsTotal = snapshotRow?.total ?? 0

  let imagesTotal = 0
  try {
    const imageRow = await db
      .prepare('SELECT COALESCE(SUM(file_size), 0) AS total FROM bookmark_images')
      .first<UsageRow>()

    imagesTotal = imageRow?.total ?? 0
  } catch (error) {
    console.warn('[StorageQuota] Failed to query bookmark_images usage', error)
  }

  return snapshotsTotal + imagesTotal
}

export interface R2QuotaCheckResult {
  allowed: boolean
  limitBytes: number
  usedBytes: number
}

/**
 * Check if adding additionalBytes would exceed quota
 */
export async function checkR2Quota(
  db: D1Database,
  env: Env,
  additionalBytes: number
): Promise<R2QuotaCheckResult> {
  const limitBytes = getR2MaxTotalBytes(env)

  // Optimization: If unlimited, skip D1 query
  if (!Number.isFinite(limitBytes)) {
    return { allowed: true, limitBytes, usedBytes: 0 }
  }

  const usedBytes = await getCurrentR2UsageBytes(db)
  const willUse = usedBytes + Math.max(0, additionalBytes)

  if (willUse > limitBytes) {
    return { allowed: false, limitBytes, usedBytes }
  }

  return { allowed: true, limitBytes, usedBytes }
}
