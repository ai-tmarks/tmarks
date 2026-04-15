import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import { requireAuth, AuthContext } from '../../../middleware/auth'
import { success, internalError } from '../../../lib/response'
import { getCurrentR2UsageBytes, getR2MaxTotalBytes } from '../../../lib/storage-quota'

export const onRequestGet: PagesFunction<Env, RouteParams, AuthContext>[] = [
  requireAuth,
  async (context) => {
    try {
      const usedBytes = await getCurrentR2UsageBytes(context.env.DB)
      const limitBytes = getR2MaxTotalBytes(context.env)

      const unlimited = !Number.isFinite(limitBytes)
      const safeLimitBytes = unlimited ? null : limitBytes

      return success({
        quota: {
          used_bytes: usedBytes,
          limit_bytes: safeLimitBytes,
          unlimited,
        },
      })
    } catch (error) {
      console.error('Get R2 storage quota error:', error)
      return internalError('Failed to load storage quota')
    }
  },
]

