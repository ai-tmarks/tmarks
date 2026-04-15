/**
 * 
 * 
 * 
 */
import type { CacheStrategyType, QueryParams } from './types'
/**

 */
export function generateCacheKey(
  type: CacheStrategyType,
  userId: string,
  params?: QueryParams | Record<string, unknown>
): string {
  const parts: string[] = []
  switch (type) {
    case 'rateLimit':
      parts.push('ratelimit')
      break
    case 'publicShare':
      parts.push('public-share')
      break
    case 'defaultList':
    case 'tagFilter':
    case 'search':
    case 'complexQuery':
      parts.push('bookmarks')
      break
  }
  //  ID
  if (userId) {
    parts.push(userId)
  }
  if (params) {
    if (type === 'search' && params.keyword) {
      parts.push('search', params.keyword)
    }
    if (type === 'tagFilter' && params.tags) {
      const tags = Array.isArray(params.tags) ? params.tags : [params.tags]
      parts.push('tags', tags.sort().join(','))
    }
    if (params.archived) {
      parts.push('archived')
    }
    if (params.pinned) {
      parts.push('pinned')
    }
    if (params.sort) {
      parts.push('sort', params.sort)
    }
    if (params.page_size) {
      parts.push('size', String(params.page_size))
    }
    if (params.page_cursor) {
      parts.push('cursor', String(params.page_cursor))
    }
  }
  return parts.join(':')
}
/**
 * 
 */
export function getQueryType(params?: QueryParams): CacheStrategyType {
  if (!params) {
    return 'defaultList'
  }
  if (params.keyword) {
    return 'search'
  }

  if (params.tags && params.tags.length > 0) {
    return 'tagFilter'
  }

  if (!params.archived && !params.pinned && !params.sort) {
    return 'defaultList'
  }
  return 'complexQuery'
}
/**

 */
export function shouldCacheQuery(
  type: CacheStrategyType,
  params?: QueryParams
): boolean {
  if (type === 'rateLimit' || type === 'publicShare') {
    return true
  }
  if (type === 'defaultList') {
    return true
  }

  if (type === 'tagFilter' && params?.tags) {
    return params.tags.length <= 3
  }

  if (type === 'search' && params?.keyword) {
    return params.keyword.length <= 50
  }

  return false
}
/**
 * 
 */
export function getCacheInvalidationPrefix(
  userId: string,
  type?: CacheStrategyType
): string {
  if (type === 'publicShare') {
    return 'public-share:'
  }
  if (type === 'rateLimit') {
    return `ratelimit:${userId}:`
  }

  return `bookmarks:${userId}:`
}
/**

 */
export function hashQueryParams(params: QueryParams): string {
  const sorted = Object.keys(params)
    .sort()
    .map(key => {
      const value = params[key as keyof QueryParams]
      if (Array.isArray(value)) {
        return `${key}=${value.sort().join(',')}`
      }
      return `${key}=${value}`
    })
    .join('&')
  return sorted
}
