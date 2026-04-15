/**
 * 

 */

import type { Env } from './types'

/**

 */
export const DEFAULT_CONFIG = {
  JWT_ACCESS_TOKEN_EXPIRES_IN: '365d',
  JWT_REFRESH_TOKEN_EXPIRES_IN: '365d',
} as const

/**

 */
export function getJwtAccessTokenExpiresIn(env?: Env): string {
  return env?.JWT_ACCESS_TOKEN_EXPIRES_IN || DEFAULT_CONFIG.JWT_ACCESS_TOKEN_EXPIRES_IN
}

/**

 */
export function getJwtRefreshTokenExpiresIn(env?: Env): string {
  return env?.JWT_REFRESH_TOKEN_EXPIRES_IN || DEFAULT_CONFIG.JWT_REFRESH_TOKEN_EXPIRES_IN
}

/**

 * @param env - Cloudflare 
 * @returns 
 */
export function isRegistrationAllowed(env: Env): boolean {
  return env.ALLOW_REGISTRATION === 'true'
}

/**
 * 
 * @param env - Cloudflare 
 * @returns 
 */
export function getEnvironment(env: Env): 'development' | 'production' {
  return env.ENVIRONMENT || 'development'
}
