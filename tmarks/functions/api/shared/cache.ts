import type { Env } from '../../lib/types'
import { CacheService } from '../../lib/cache'
import { getCacheInvalidationPrefix } from '../../lib/cache/strategies'

/**
 * 

 */
export async function invalidatePublicShareCache(env: Env, userId: string) {
  //  slug
  const record = await env.DB.prepare(
    `SELECT public_slug FROM users WHERE id = ? AND public_share_enabled = 1`
  )
    .bind(userId)
    .first<{ public_slug: string | null }>()

  if (!record?.public_slug) {
    return
  }

  //  CacheService 
  const cache = new CacheService(env)
  const prefix = getCacheInvalidationPrefix(record.public_slug.toLowerCase(), 'publicShare')
  await cache.invalidate(prefix)
}
