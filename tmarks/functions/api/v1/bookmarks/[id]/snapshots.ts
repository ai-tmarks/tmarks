/**
 *  API
 * : /api/v1/bookmarks/:id/snapshots
 * : JWT Token
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../../../lib/types'
import { success, badRequest, notFound, internalError } from '../../../../lib/response'
import { requireAuth, AuthContext } from '../../../../middleware/auth'
import { generateSignedUrl } from '../../../../lib/signed-url'
import { generateNanoId } from '../../../../lib/crypto'
import { checkR2Quota } from '../../../../lib/storage-quota'
import { cleanupOldSnapshots } from './snapshot-cleanup'

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

// GET /api/v1/bookmarks/:id/snapshots - 
export const onRequestGet: PagesFunction<Env, 'id', AuthContext>[] = [
  requireAuth,
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

      //  URL
      const snapshotsWithUrls = await Promise.all(
        (snapshots.results || []).map(async (snapshot: Record<string, unknown>) => {
          //  24  URL
          const { signature, expires } = await generateSignedUrl(
            {
              userId,
              resourceId: snapshot.id,
              expiresIn: 24 * 3600, // 24 
              action: 'view',
            },
            context.env.JWT_SECRET
          )

          //  URL
          const baseUrl = new URL(context.request.url).origin
          const viewUrl = `${baseUrl}/api/v1/bookmarks/${bookmarkId}/snapshots/${snapshot.id}/view?sig=${signature}&exp=${expires}&u=${userId}&a=view`

          return {
            ...snapshot,
            view_url: viewUrl,
          }
        })
      )

      return success({
        snapshots: snapshotsWithUrls,
        total: snapshotsWithUrls.length,
      })
    } catch (error) {
      console.error('Get snapshots error:', error)
      return internalError('Failed to get snapshots')
    }
  },
]

// POST /api/v1/bookmarks/:id/snapshots - 
export const onRequestPost: PagesFunction<Env, 'id', AuthContext>[] = [
  requireAuth,
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

      // （ bookmark_snapshots.file_size ）
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
        },
      })
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
          htmlBytes.length,
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

      //  URL（24 ）
      const { signature, expires } = await generateSignedUrl(
        {
          userId,
          resourceId: snapshotId,
          expiresIn: 24 * 3600,
          action: 'view',
        },
        context.env.JWT_SECRET
      )

      //  URL
      const baseUrl = new URL(context.request.url).origin
      const viewUrl = `${baseUrl}/api/v1/bookmarks/${bookmarkId}/snapshots/${snapshotId}/view?sig=${signature}&exp=${expires}&u=${userId}&a=view`

      return success({
        snapshot: {
          id: snapshotId,
          version,
          file_size: htmlBytes.length,
          content_hash: contentHash,
          snapshot_title: title,
          is_latest: true,
          created_at: now,
          view_url: viewUrl,
        },
        message: 'Snapshot created successfully',
      })
    } catch (error) {
      console.error('Create snapshot error:', error)
      return internalError('Failed to create snapshot')
    }
  },
]
