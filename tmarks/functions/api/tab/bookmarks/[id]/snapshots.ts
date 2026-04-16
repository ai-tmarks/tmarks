/**
 *  API
 * : /api/tab/bookmarks/:id/snapshots
 * : API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../../middleware/api-key-auth-pages'
import { checkR2Quota } from '../../../../lib/storage-quota'

//  nanoid  ID（21 ）
function generateNanoId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const length = 21
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  
  let id = ''
  for (let i = 0; i < length; i++) {
    id += alphabet[randomValues[i] % alphabet.length]
  }
  return id
}

//  Web Crypto API  SHA-256 
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface CreateSnapshotRequest {
  html_content: string
  title: string
  url: string
  force?: boolean
}

// 
const MAX_SNAPSHOT_SIZE = 50 * 1024 * 1024 // 50MB

// GET /api/tab/bookmarks/:id/snapshots - 
export const onRequestGet: PagesFunction<Env, 'id', ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const bookmarkId = context.params.id

    try {
      const db = context.env.DB

      // 
      const bookmark = await db
        .prepare('SELECT id FROM bookmarks WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
        .bind(bookmarkId, userId)
        .first()

      if (!bookmark) {
        return notFound('Bookmark not found')
      }

      // 
      const snapshots = await db
        .prepare(
          `SELECT id, version, file_size, content_hash, snapshot_title, 
                  is_latest, created_at
           FROM bookmark_snapshots
           WHERE bookmark_id = ? AND user_id = ?
           ORDER BY version DESC`
        )
        .bind(bookmarkId, userId)
        .all()

      return success({
        snapshots: snapshots.results || [],
        total: snapshots.results?.length || 0,
      })
    } catch (error) {
      console.error('Get snapshots error:', error)
      return internalError('Failed to get snapshots')
    }
  },
]

// POST /api/tab/bookmarks/:id/snapshots - 
export const onRequestPost: PagesFunction<Env, 'id', ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.create'),
  async (context) => {
    const userId = context.data.user_id
    const bookmarkId = context.params.id

    try {
      const body = await context.request.json() as CreateSnapshotRequest
      const { html_content, title, url, force = false } = body

      if (!html_content || !title || !url) {
        return badRequest('Missing required fields')
      }

      // 
      const originalSize = new Blob([html_content]).size
      if (originalSize > MAX_SNAPSHOT_SIZE) {
        return badRequest(
          `Snapshot too large (${(originalSize / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_SNAPSHOT_SIZE / 1024 / 1024}MB.`
        )
      }
      
      //  data URL （）
      const dataUrlCount = (html_content.match(/src="data:/g) || []).length
      console.log(`[Snapshot API] Received HTML: ${(originalSize / 1024).toFixed(1)}KB, data URLs: ${dataUrlCount}`)

      const db = context.env.DB
      const bucket = context.env.SNAPSHOTS_BUCKET

      if (!bucket) {
        return internalError('Storage not configured')
      }

      // 
      const bookmark = await db
        .prepare('SELECT id FROM bookmarks WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
        .bind(bookmarkId, userId)
        .first()

      if (!bookmark) {
        return notFound('Bookmark not found')
      }

      // 
      const contentHash = await sha256(html_content)

      // （）
      if (!force) {
        const latestSnapshot = await db
          .prepare(
            `SELECT content_hash FROM bookmark_snapshots
             WHERE bookmark_id = ? AND is_latest = 1`
          )
          .bind(bookmarkId)
          .first()

        if (latestSnapshot && latestSnapshot.content_hash === contentHash) {
          return success({
            message: 'Content unchanged, no new snapshot created',
            is_duplicate: true,
          })
        }
      }

      // 
      const versionResult = await db
        .prepare(
          `SELECT COALESCE(MAX(version), 0) + 1 as next_version
           FROM bookmark_snapshots
           WHERE bookmark_id = ?`
        )
        .bind(bookmarkId)
        .first()

      const version = versionResult?.next_version as number || 1

      //  R2 
      const timestamp = Date.now()
      const r2Key = `${userId}/${bookmarkId}/snapshot-${timestamp}-v${version}.html`

      //  HTML  UTF-8 
      const encoder = new TextEncoder()
      const htmlBytes = encoder.encode(html_content)

      console.log(`[Snapshot API] Encoded to UTF-8: ${(htmlBytes.length / 1024).toFixed(1)}KB`)

      // 
      const quota = await checkR2Quota(db, context.env, htmlBytes.length)
      if (!quota.allowed) {
        const usedGB = quota.usedBytes / (1024 * 1024 * 1024)
        const limitGB = quota.limitBytes / (1024 * 1024 * 1024)
        return badRequest({
          code: 'R2_STORAGE_LIMIT_EXCEEDED',
          message: `Snapshot storage limit exceeded. Used ${usedGB.toFixed(2)}GB of ${limitGB.toFixed(2)}GB. Please delete some snapshots or images and try again.`,
        })
      }

      //  UTF-8  R2
      await bucket.put(r2Key, htmlBytes, {
        httpMetadata: {
          contentType: 'text/html; charset=utf-8',
        },
        customMetadata: {
          userId,
          bookmarkId,
          version: version.toString(),
          title,
          fileSize: htmlBytes.length.toString(),
          dataUrlCount: dataUrlCount.toString(),
        },
      })

      console.log(`[Snapshot API] Uploaded to R2: ${r2Key}`)
      const snapshotId = generateNanoId()
      const now = new Date().toISOString()

      // （ INSERT ，）
      const batch = [
        // ，
        db.prepare(
          `INSERT INTO bookmark_snapshots
           (id, bookmark_id, user_id, version, is_latest, content_hash,
            r2_key, r2_bucket, file_size, mime_type, snapshot_url,
            snapshot_title, snapshot_status, created_at, updated_at)
           VALUES (?, ?, ?,
            (SELECT COALESCE(MAX(version), 0) + 1 FROM bookmark_snapshots WHERE bookmark_id = ?),
            1, ?, ?, 'tmarks-snapshots', ?, 'text/html', ?, ?, 'completed', ?, ?)`
        ).bind(
          snapshotId,
          bookmarkId,
          userId,
          bookmarkId,
          contentHash,
          r2Key,
          originalSize,
          url,
          title,
          now,
          now
        ),

        //  is_latest 
        db.prepare(
          `UPDATE bookmark_snapshots 
           SET is_latest = 0 
           WHERE bookmark_id = ? AND id != ?`
        ).bind(bookmarkId, snapshotId),

        // （）
        db.prepare(
          `UPDATE bookmarks 
           SET has_snapshot = 1, 
               latest_snapshot_at = ?,
               snapshot_count = snapshot_count + 1
           WHERE id = ?`
        ).bind(now, bookmarkId),
      ]

      await db.batch(batch)

      // 
      await cleanupOldSnapshots(db, bucket, bookmarkId, userId)

      return success({
        snapshot: {
          id: snapshotId,
          version,
          file_size: originalSize,
          content_hash: contentHash,
          created_at: now,
        },
        message: 'Snapshot created successfully',
      })
    } catch (error) {
      console.error('Create snapshot error:', error)
      return internalError('Failed to create snapshot')
    }
  },
]

// 
async function cleanupOldSnapshots(
  db: D1Database,
  bucket: R2Bucket,
  bookmarkId: string,
  userId: string
) {
  try {
    // 
    const bookmarkSettings = await db
      .prepare('SELECT snapshot_retention_count FROM bookmarks WHERE id = ?')
      .bind(bookmarkId)
      .first()

    const userSettings = await db
      .prepare('SELECT snapshot_retention_count FROM user_preferences WHERE user_id = ?')
      .bind(userId)
      .first()

    const retentionCount =
      (bookmarkSettings?.snapshot_retention_count as number | null) ??
      (userSettings?.snapshot_retention_count as number | null) ??
      5

    // -1 
    if (retentionCount === -1) {
      return
    }

    // 
    const toDelete = await db
      .prepare(
        `SELECT id, r2_key
         FROM bookmark_snapshots
         WHERE bookmark_id = ? AND user_id = ?
         ORDER BY version DESC
         LIMIT -1 OFFSET ?`
      )
      .bind(bookmarkId, userId, retentionCount)
      .all()

    if (!toDelete.results || toDelete.results.length === 0) {
      return
    }

    //  R2 （）
    const deletedIds: unknown[] = []
    for (const snapshot of toDelete.results) {
      try {
        await bucket.delete(snapshot.r2_key as string)
        deletedIds.push(snapshot.id)
      } catch (error) {
        console.error('Failed to delete R2 file:', snapshot.r2_key, error)
      }
    }

    if (deletedIds.length === 0) return

    //  R2 
    const placeholders = deletedIds.map(() => '?').join(',')
    await db
      .prepare(`DELETE FROM bookmark_snapshots WHERE id IN (${placeholders})`)
      .bind(...deletedIds)
      .run()
  } catch (error) {
    console.error('Cleanup snapshots error:', error)
  }
}
