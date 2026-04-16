/**
 *  API V2 - 
 * : /api/tab/bookmarks/:id/snapshots-v2
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../lib/types'
import { success, badRequest, notFound, internalError } from '../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../../middleware/api-key-auth-pages'
import { generateSignedUrl } from '../../lib/signed-url'
import { checkR2Quota } from '../../lib/storage-quota'
import {
  decodeBase64Image,
  uploadImagesConcurrently,
  replaceImagePlaceholders,
} from './snapshot-upload'

function generateNanoId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const randomValues = new Uint8Array(21)
  crypto.getRandomValues(randomValues)
  let id = ''
  for (let i = 0; i < 21; i++) {
    id += alphabet[randomValues[i] % alphabet.length]
  }
  return id
}

async function sha256(content: string): Promise<string> {
  const data = new TextEncoder().encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface CreateSnapshotV2Request {
  html_content: string
  title: string
  url: string
  images: Array<{ hash: string; data: string; type: string }>
  force?: boolean
}

// POST /api/tab/bookmarks/:id/snapshots-v2 - （V2）
export const onRequestPost: PagesFunction<Env, 'id', ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.create'),
  async (context) => {
    const userId = context.data.user_id
    const bookmarkId = context.params.id as string

    try {
      const body = await context.request.json() as CreateSnapshotV2Request
      const { html_content, title, url, images = [], force = false } = body

      if (!html_content || !title || !url) {
        return badRequest('Missing required fields')
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

      //  & （）
      const [contentHash, latestSnapshot, versionResult] = await Promise.all([
        sha256(html_content),
        force ? Promise.resolve(null) : db
          .prepare('SELECT content_hash FROM bookmark_snapshots WHERE bookmark_id = ? AND is_latest = 1')
          .bind(bookmarkId)
          .first(),
        db
          .prepare('SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM bookmark_snapshots WHERE bookmark_id = ?')
          .bind(bookmarkId)
          .first(),
      ])

      if (!force && latestSnapshot && latestSnapshot.content_hash === contentHash) {
        return success({ message: 'Content unchanged, no new snapshot created', is_duplicate: true })
      }

      const version = (versionResult && typeof versionResult.next_version === 'number')
        ? versionResult.next_version
        : 1
      const timestamp = Date.now()

      // 1. （CPU ，）
      const decoded = images
        .map(decodeBase64Image)
        .filter((d): d is NonNullable<typeof d> => d !== null)

      // 2. ：
      const htmlBytes = new TextEncoder().encode(html_content)
      const totalImageBytes = decoded.reduce((sum, d) => sum + d.bytes.length, 0)
      const totalSize = htmlBytes.length + totalImageBytes

      const quota = await checkR2Quota(db, context.env, totalSize)
      if (!quota.allowed) {
        const usedGB = quota.usedBytes / (1024 * 1024 * 1024)
        const limitGB = quota.limitBytes / (1024 * 1024 * 1024)
        return badRequest({
          code: 'R2_STORAGE_LIMIT_EXCEEDED',
          message: `Snapshot storage limit exceeded. Used ${usedGB.toFixed(2)}GB of ${limitGB.toFixed(2)}GB.`,
        })
      }

      // 3.  R2（6）
      const { uploadedHashes, totalImageSize } = await uploadImagesConcurrently(
        decoded, bucket, userId, bookmarkId, version, timestamp
      )

      // 4.  HTML 
      const processedHtml = replaceImagePlaceholders(
        html_content, uploadedHashes, userId, bookmarkId, version
      )

      // 5.  HTML
      const htmlKey = `${userId}/${bookmarkId}/snapshot-${timestamp}-v${version}.html`
      const processedHtmlBytes = new TextEncoder().encode(processedHtml)

      await bucket.put(htmlKey, processedHtmlBytes, {
        httpMetadata: { contentType: 'text/html; charset=utf-8' },
        customMetadata: {
          userId,
          bookmarkId,
          version: version.toString(),
          title,
          imageCount: uploadedHashes.length.toString(),
          snapshotVersion: '2',
        },
      })

      // 6. 
      const snapshotId = generateNanoId()
      const now = new Date().toISOString()
      const finalSize = processedHtmlBytes.length + totalImageSize

      await db.batch([
        db.prepare(
          `INSERT INTO bookmark_snapshots
           (id, bookmark_id, user_id, version, is_latest, content_hash,
            r2_key, r2_bucket, file_size, mime_type, snapshot_url,
            snapshot_title, snapshot_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, 'tmarks-snapshots', ?, 'text/html', ?, ?, 'completed', ?, ?)`
        ).bind(
          snapshotId, bookmarkId, userId, version, contentHash,
          htmlKey, finalSize, url, title, now, now
        ),
        db.prepare('UPDATE bookmark_snapshots SET is_latest = 0 WHERE bookmark_id = ? AND user_id = ? AND id != ?')
          .bind(bookmarkId, userId, snapshotId),
        db.prepare(
          'UPDATE bookmarks SET has_snapshot = 1, latest_snapshot_at = ?, snapshot_count = snapshot_count + 1 WHERE id = ? AND user_id = ?'
        ).bind(now, bookmarkId, userId),
      ])

      //  URL（24 ）
      const baseUrl = new URL(context.request.url).origin
      const { signature, expires } = await generateSignedUrl(
        { userId, resourceId: snapshotId, expiresIn: 24 * 3600, action: 'view' },
        context.env.JWT_SECRET
      )
      const viewUrl = `${baseUrl}/api/v1/bookmarks/${bookmarkId}/snapshots/${snapshotId}/view?sig=${signature}&exp=${expires}&u=${userId}&a=view`

      return success({
        snapshot: {
          id: snapshotId,
          version,
          file_size: finalSize,
          image_count: uploadedHashes.length,
          content_hash: contentHash,
          snapshot_title: title,
          is_latest: true,
          created_at: now,
          view_url: viewUrl,
        },
        message: 'Snapshot created successfully (V2)',
      })
    } catch (error) {
      console.error('[Snapshot V2 API] Error:', error)
      return internalError('Failed to create snapshot')
    }
  },
]
