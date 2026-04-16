/**
 * Signed URL Generator
 * Generates secure signed URLs for temporary resource access
 * Similar to AWS S3 Presigned URLs
 */

export interface SignedUrlParams {
  userId: string
  resourceId: string // Resource ID (e.g. snapshot ID)
  expiresIn?: number // Expiration time (seconds), default 1 hour
  action?: string // Action type (e.g. 'view', 'download')
}

export interface SignedUrlData {
  userId: string
  resourceId: string
  expires: number // Unix timestamp
  action?: string
}

/**
 * Generate signed URL
 * @param params URL parameters
 * @param secret Secret key for signing
 * @returns Signature and expiration timestamp
 */
export async function generateSignedUrl(
  params: SignedUrlParams,
  secret: string
): Promise<{ signature: string; expires: number }> {
  const now = Math.floor(Date.now() / 1000)
  const expires = now + (params.expiresIn || 3600) // Default 1 hour

  const data: SignedUrlData = {
    userId: params.userId,
    resourceId: params.resourceId,
    expires,
    action: params.action,
  }

  // Generate signature
  const message = `${data.userId}:${data.resourceId}:${data.expires}:${data.action || ''}`
  const signature = await sign(message, secret)

  return { signature, expires }
}

/**
 * Verify signed URL
 * @param signature Signature string
 * @param expires Expiration timestamp
 * @param userId User ID
 * @param resourceId Resource ID
 * @param action Action type
 * @param secret Secret key for verification
 * @returns Validation result
 */
export async function verifySignedUrl(
  signature: string,
  expires: number,
  userId: string,
  resourceId: string,
  secret: string,
  action?: string
): Promise<{ valid: boolean; error?: string }> {
  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (expires < now) {
    return { valid: false, error: 'URL has expired' }
  }

  // Verify signature
  const message = `${userId}:${resourceId}:${expires}:${action || ''}`
  const expectedSignature = await sign(message, secret)

  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, error: 'Invalid signature' }
  }

  return { valid: true }
}

/**
 * Extract signed URL parameters from request
 */
export function extractSignedParams(request: Request): {
  signature: string | null
  expires: number | null
  userId: string | null
  action: string | null
} {
  try {
    const url = new URL(request.url)
    const signature = url.searchParams.get('sig') || url.searchParams.get('signature')
    const expiresStr = url.searchParams.get('exp') || url.searchParams.get('expires')
    const userId = url.searchParams.get('u') || url.searchParams.get('user')
    const action = url.searchParams.get('a') || url.searchParams.get('action')

    return {
      signature,
      expires: expiresStr ? parseInt(expiresStr, 10) : null,
      userId,
      action,
    }
  } catch {
    return {
      signature: null,
      expires: null,
      userId: null,
      action: null,
    }
  }
}

/**
 * Generate HMAC-SHA256 signature
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const encoder = new TextEncoder()
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  let result = 0
  for (let i = 0; i < ab.length; i++) {
    result |= ab[i] ^ bb[i]
  }
  return result === 0
}

async function sign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  
  // Convert to hex string (lowercase)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
