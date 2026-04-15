/**
 * 
 * 

 */
import { CacheService } from './service'
import { generateCacheKey, getQueryType, getCacheInvalidationPrefix } from './strategies'
import type { QueryParams } from './types'
/**

 */
export class BookmarkCacheManager {
  constructor(private cache: CacheService) {}
  /**
   * 
   */
  async getBookmarkList<T>(userId: string, params?: QueryParams): Promise<T | null> {
    const queryType = getQueryType(params)
    if (!this.cache.shouldCache(queryType, params)) {
      return null
    }
    const cacheKey = generateCacheKey(queryType, userId, params)
    return await this.cache.get<T>(queryType, cacheKey)
  }
  /**
   * 
   */
  async setBookmarkList<T>(
    userId: string,
    params: QueryParams | undefined,
    data: T,
    options?: { async?: boolean }
  ): Promise<void> {
    const queryType = getQueryType(params)
    if (!this.cache.shouldCache(queryType, params)) {
      return
    }
    const cacheKey = generateCacheKey(queryType, userId, params)
    await this.cache.set(queryType, cacheKey, data, options)
  }
  /**

   */
  async invalidateUserBookmarks(userId: string): Promise<void> {
    const prefix = getCacheInvalidationPrefix(userId)
    await this.cache.invalidate(prefix)
  }
  /**

   */
  async invalidateQuery(userId: string, params?: QueryParams): Promise<void> {
    const queryType = getQueryType(params)
    const cacheKey = generateCacheKey(queryType, userId, params)
    await this.cache.delete(cacheKey)
  }
  /**
   * 
   */
  async handleBatchOperation(userId: string): Promise<void> {
    const config = this.cache.getConfig()
    if (config.batchOperations.writeCache && config.batchOperations.asyncWrite) {
      // Level 3: 
      this.refreshCommonQueries(userId)
    } else {

      await this.invalidateUserBookmarks(userId)
    }
  }
  /**
   * （）
   */
  private refreshCommonQueries(userId: string): void {
    // ，
    Promise.resolve().then(async () => {
      try {
        await this.invalidateUserBookmarks(userId)
        // ：

      } catch (error) {
        console.warn('Refresh common queries error:', error)
      }
    })
  }
}
/**

 */
export function createBookmarkCacheManager(cache: CacheService): BookmarkCacheManager {
  return new BookmarkCacheManager(cache)
}
