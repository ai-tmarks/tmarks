/**
 *  API
 * : /api/snapshot-images/:hash
 *  R2 
 * 
 * :  API 
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../../lib/types'
import { notFound, internalError } from '../../lib/response'
import { generateImageSig } from '../../lib/image-sig'

// OPTIONS /api/snapshot-images/:hash - CORS 
export const onRequestOptions: PagesFunction<Env, 'hash'> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// GET /api/snapshot-images/:hash - 
export const onRequestGet: PagesFunction<Env, 'hash'> = async (context) => {
  try {
    const hash = context.params.hash as string
    const bucket = context.env.SNAPSHOTS_BUCKET
    const db = context.env.DB

    if (!bucket || !db) {
      return internalError('Storage not configured')
    }

    //  URL 
    const url = new URL(context.request.url)
    const userId = url.searchParams.get('u')
    const bookmarkId = url.searchParams.get('b')
    const version = url.searchParams.get('v')

    console.log(`[Snapshot Image API] Request: hash=${hash}, u=${userId}, b=${bookmarkId}, v=${version}`)

    if (!userId || !bookmarkId || !version) {
      console.warn(`[Snapshot Image API] Missing parameters: u=${userId}, b=${bookmarkId}, v=${version}`)
      return new Response('Missing required parameters', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 
    // 
    const snapshot = await db
      .prepare(
        `SELECT s.id 
         FROM bookmark_snapshots s
         JOIN bookmarks b ON s.bookmark_id = b.id
         WHERE s.bookmark_id = ? 
           AND s.user_id = ? 
           AND s.version = ?
           AND b.deleted_at IS NULL`
      )
      .bind(bookmarkId, userId, parseInt(version, 10) || 0)
      .first()

    if (!snapshot) {
      console.warn(`[Snapshot Image API] Snapshot not found or access denied: u=${userId}, b=${bookmarkId}, v=${version}, hash=${hash}`)
      return notFound('Snapshot not found or access denied')
    }

    // 
    const sig = url.searchParams.get('sig')
    if (!sig) {
      return new Response('Missing image signature', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    const expectedSig = await generateImageSig(hash, userId, bookmarkId, context.env.JWT_SECRET)
    if (sig !== expectedSig) {
      return new Response('Invalid image signature', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    //  R2 
    let imageKey = `${userId}/${bookmarkId}/v${version}/images/${hash}`

    console.log(`[Snapshot Image API] Fetching: ${imageKey}`)

    //  R2 
    let r2Object = await bucket.get(imageKey)

    // ，（/）
    if (!r2Object) {
      console.log(`[Snapshot Image API] Not found, trying alternative formats...`)
      
      //  hash ，
      if (hash.includes('.')) {
        const hashWithoutExt = hash.replace(/\.(webp|jpg|jpeg|png|gif)$/i, '')
        const altKey = `${userId}/${bookmarkId}/v${version}/images/${hashWithoutExt}`
        console.log(`[Snapshot Image API] Trying without extension: ${altKey}`)
        r2Object = await bucket.get(altKey)
        if (r2Object) imageKey = altKey
      } else {
        //  hash ，
        const extensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif']
        for (const ext of extensions) {
          const altKey = `${userId}/${bookmarkId}/v${version}/images/${hash}${ext}`
          console.log(`[Snapshot Image API] Trying with extension: ${altKey}`)
          r2Object = await bucket.get(altKey)
          if (r2Object) {
            imageKey = altKey
            break
          }
        }
      }
    }

    if (!r2Object) {
      console.warn(`[Snapshot Image API] Image not found in R2 (tried all formats): ${hash}`)
      return new Response('Image not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 
    const imageData = await r2Object.arrayBuffer()
    const contentType = r2Object.httpMetadata?.contentType || 'image/jpeg'

    console.log(`[Snapshot Image API] Serving: ${imageKey}, ${(imageData.byteLength / 1024).toFixed(1)}KB, type: ${contentType}`)

    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 
        'Access-Control-Allow-Origin': '*', // （）
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('[Snapshot Image API] Error:', error)
    // ，
    return new Response('Failed to load image', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
