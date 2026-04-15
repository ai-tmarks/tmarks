/**

 */
import type { R2Bucket, D1Database } from '@cloudflare/workers-types'
import type { Env } from './types'
import { generateUUID } from './crypto'
import { checkR2Quota } from './storage-quota'
interface UploadImageResult {
  success: boolean
  imageId?: string
  r2Url?: string
  originalUrl: string
  imageHash?: string
  fileSize?: number
  mimeType?: string
  isReused?: boolean // 
  error?: string
}
interface ExistingImage {
  id: string
  r2_key: string
  file_size: number
  mime_type: string
}
/**

 * @param imageUrl  URL
 * @param userId  ID
 * @param bookmarkId  ID
 * @param bucket R2 Bucket
 * @param db D1 Database

 * @param env Cloudflare （）
 * @returns 
 */
export async function uploadCoverImageToR2(
  imageUrl: string,
  userId: string,
  bookmarkId: string,
  bucket: R2Bucket,
  db: D1Database,
  r2PublicUrl: string,
  env: Env
): Promise<UploadImageResult> {
  try {
    // 1. 
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000), // 10
    })
    if (!response.ok) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: `Failed to download image: ${response.status}`,
      }
    }
    // 2. 
    const imageData = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const fileSize = imageData.byteLength

    if (fileSize > 10 * 1024 * 1024) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: 'Image too large (max 10MB)',
      }
    }

    if (!contentType.startsWith('image/')) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: 'Not a valid image',
      }
    }

    const imageHash = await calculateHash(imageData)

    const existing = await db
      .prepare('SELECT id, r2_key, file_size, mime_type FROM bookmark_images WHERE image_hash = ? LIMIT 1')
      .bind(imageHash)
      .first<ExistingImage>()
    let imageId: string
    let r2Key: string
    if (existing) {
      imageId = existing.id
      r2Key = existing.r2_key

      const r2Url = `${r2PublicUrl.replace(/\/$/, '')}/${r2Key}`
      return {
        success: true,
        imageId: imageId,
        r2Url: r2Url,
        originalUrl: imageUrl,
        imageHash: imageHash,
        fileSize: existing.file_size,
        mimeType: existing.mime_type,
        isReused: true,
      }
    }
    // 7.  R2 key（，）
    const ext = getExtensionFromContentType(contentType)
    r2Key = `images/${imageHash}${ext}`
    // 8. （）
    const quota = await checkR2Quota(db, env, fileSize)
    if (!quota.allowed) {
      const usedGB = quota.usedBytes / (1024 * 1024 * 1024)
      const limitGB = quota.limitBytes / (1024 * 1024 * 1024)
      return {
        success: false,
        originalUrl: imageUrl,
        error: `Image storage limit exceeded: used ${usedGB.toFixed(2)}GB / ${limitGB.toFixed(2)}GB`,
      }
    }

    await bucket.put(r2Key, imageData, {
      httpMetadata: {
        contentType: contentType,
      },
      customMetadata: {
        imageHash: imageHash,
        originalUrl: imageUrl,
        uploadedAt: new Date().toISOString(),
      },
    })
    // 10. 
    imageId = generateUUID()
    const now = new Date().toISOString()
    await db
      .prepare(
        `INSERT INTO bookmark_images
         (id, bookmark_id, user_id, image_hash, r2_key, r2_bucket, file_size, mime_type, original_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'tmarks-snapshots', ?, ?, ?, ?, ?)`
      )
      .bind(imageId, bookmarkId, userId, imageHash, r2Key, fileSize, contentType, imageUrl, now, now)
      .run()

    const r2Url = `${r2PublicUrl.replace(/\/$/, '')}/${r2Key}`
    return {
      success: true,
      imageId: imageId,
      r2Url: r2Url,
      originalUrl: imageUrl,
      imageHash: imageHash,
      fileSize: fileSize,
      mimeType: contentType,
      isReused: false,
    }
  } catch (error) {
    return {
      success: false,
      originalUrl: imageUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
/**

 */
async function calculateHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
/**

 */
function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  }
  return typeMap[contentType.toLowerCase()] || '.jpg'
}
/**

 */
export async function deleteBookmarkImage(
  bookmarkId: string,
  db: D1Database,
  bucket: R2Bucket
): Promise<void> {
  try {
    // 1. 
    const image = await db
      .prepare('SELECT id, r2_key, image_hash FROM bookmark_images WHERE bookmark_id = ?')
      .bind(bookmarkId)
      .first<{ id: string; r2_key: string; image_hash: string }>()
    if (!image) {
      return
    }

    const { count } = await db
      .prepare('SELECT COUNT(*) as count FROM bookmark_images WHERE image_hash = ?')
      .bind(image.image_hash)
      .first<{ count: number }>() || { count: 0 }

    await db.prepare('DELETE FROM bookmark_images WHERE id = ?').bind(image.id).run()

    if (count <= 1) {
      await bucket.delete(image.r2_key)
    }
  } catch (error) {
    console.error('Failed to delete bookmark image:', error)
  }
}
/**
 * （）
 */
export async function cleanupOrphanedImages(db: D1Database, bucket: R2Bucket): Promise<number> {
  try {

    const { results: orphaned } = await db
      .prepare(
        `SELECT bi.id, bi.r2_key, bi.image_hash
         FROM bookmark_images bi
         LEFT JOIN bookmarks b ON bi.bookmark_id = b.id
         WHERE b.id IS NULL`
      )
      .all<{ id: string; r2_key: string; image_hash: string }>()
    if (!orphaned || orphaned.length === 0) {
      return 0
    }
    let deletedCount = 0
    for (const image of orphaned) {

      const { count } = await db
        .prepare('SELECT COUNT(*) as count FROM bookmark_images WHERE image_hash = ?')
        .bind(image.image_hash)
        .first<{ count: number }>() || { count: 0 }

      await db.prepare('DELETE FROM bookmark_images WHERE id = ?').bind(image.id).run()

      if (count <= 1) {
        await bucket.delete(image.r2_key)
      }
      deletedCount++
    }
    return deletedCount
  } catch (error) {
    console.error('Failed to cleanup orphaned images:', error)
    return 0
  }
}
