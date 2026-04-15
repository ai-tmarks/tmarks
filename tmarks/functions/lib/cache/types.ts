/**
 * 
 * 
 * 
 */
/**
 * 

 * - 2:  ()

 */
export type CacheLevel = 0 | 1 | 2 | 3
/**
 * 
 */
export type CacheStrategyType =
  | 'rateLimit'      //  ()
  | 'publicShare'    
  | 'defaultList'    
  | 'tagFilter'      // 
  | 'search'         
  | 'complexQuery'   
/**
 * 
 */
export interface CacheConfig {
  level: CacheLevel
  enabled: boolean
  /** 
  strategies: Record<CacheStrategyType, boolean>
  /** TTL  (
  ttl: Record<CacheStrategyType, number>
  memoryCache: {
    enabled: boolean
    maxAge: number  // 
  }
  batchOperations: {
    writeCache: boolean   // 
    asyncWrite: boolean   
  }
}
/**
 * 
 */
export interface CacheEntry<T = unknown> {
  data: T
  expires: number  // 
}
/**
 * 
 */
export interface CacheSetOptions {
  async?: boolean
  /** 
  ttl?: number
}
/**
 * 
 */
export interface CacheStats {
  level: CacheLevel
  enabled: boolean
  hits: number
  misses: number
  hitRate: number
  memCacheSize: number
  strategies: Record<CacheStrategyType, boolean>
}
/**

 */
export interface QueryParams {
  keyword?: string
  tags?: string[]
  archived?: boolean
  pinned?: boolean
  sort?: string
  page_size?: number
  page_cursor?: string
}
