/**
 * 
 * 

 */
import type { CacheConfig, CacheLevel } from './types'
import type { Env } from '../types'
/**
 * 
 */
export const CACHE_PRESETS: Record<CacheLevel, CacheConfig> = {
  /**
   * Level 0:  ()
   * - : 

   * - : 30-100ms
   * - : ，

   */
  0: {
    level: 0,
    enabled: true,          
    strategies: {
      rateLimit: false,     //  KV  ()
      publicShare: true,    //  ()
      defaultList: true,    //  ()
      tagFilter: false,     // 
      search: false,        // 
      complexQuery: false,
    },
    ttl: {
      rateLimit: 0,
      publicShare: 1800,    // 30 ()
      defaultList: 1800,    // 30 ()
      tagFilter: 0,
      search: 0,
      complexQuery: 0,
    },
    memoryCache: {
      enabled: true,        //  ()
      maxAge: 60,           // 1
    },
    batchOperations: {
      writeCache: false,    //  ()
      asyncWrite: false,
    },
  },
  /**
   * Level 1:  KV 

   */
  1: {
    level: 1,
    enabled: true,
    strategies: {
      rateLimit: false,     //  KV  ()
      publicShare: true,    //  ()
      defaultList: false,   // 
      tagFilter: false,
      search: false,
      complexQuery: false,
    },
    ttl: {
      rateLimit: 0,
      publicShare: 1800,    // 30 ()
      defaultList: 0,
      tagFilter: 0,
      search: 0,
      complexQuery: 0,
    },
    memoryCache: {
      enabled: true,        
      maxAge: 60,
    },
    batchOperations: {
      writeCache: false,    
      asyncWrite: false,
    },
  },
  /**
   * Level 2:  KV  ()
   * - :  (1000-10000 )

   */
  2: {
    level: 2,
    enabled: true,
    strategies: {
      rateLimit: true,      
      publicShare: true,
      defaultList: true,    
      tagFilter: false,     // 
      search: false,
      complexQuery: false,
    },
    ttl: {
      rateLimit: 60,
      publicShare: 1800,    // 30
      defaultList: 600,     // 10
      tagFilter: 0,
      search: 0,
      complexQuery: 0,
    },
    memoryCache: {
      enabled: true,        
      maxAge: 60,           // 1
    },
    batchOperations: {
      writeCache: false,    
      asyncWrite: false,
    },
  },
  /**

   * - :  (>10000 )

   * - :  KV，
   */
  3: {
    level: 3,
    enabled: true,
    strategies: {
      rateLimit: true,
      publicShare: true,
      defaultList: true,
      tagFilter: true,      // 
      search: false,        // 
      complexQuery: false,
    },
    ttl: {
      rateLimit: 60,
      publicShare: 1800,    // 30
      defaultList: 600,     // 10
      tagFilter: 600,       // 10
      search: 0,
      complexQuery: 0,
    },
    memoryCache: {
      enabled: true,
      maxAge: 60,
    },
    batchOperations: {
      writeCache: false,    //  ()
      asyncWrite: false,
    },
  },
}
/**

 */
export function loadCacheConfig(env: Env): CacheConfig {

  if (env.ENABLE_KV_CACHE === 'false') {
    return CACHE_PRESETS[0]
  }
  const levelStr = env.CACHE_LEVEL || '1'
  let level: CacheLevel = 1
  if (levelStr === 'none' || levelStr === '0') {
    level = 0
  } else if (levelStr === 'minimal' || levelStr === '1') {
    level = 1
  } else if (levelStr === 'standard' || levelStr === '2') {
    level = 2
  } else if (levelStr === 'aggressive' || levelStr === '3') {
    level = 3
  } else {
    const parsed = parseInt(levelStr, 10)
    if (parsed >= 0 && parsed <= 3) {
      level = parsed as CacheLevel
    }
  }
  const config = { ...CACHE_PRESETS[level] }
  //  TTL
  if (env.CACHE_TTL_DEFAULT_LIST) {
    config.ttl.defaultList = parseInt(env.CACHE_TTL_DEFAULT_LIST, 10)
  }
  if (env.CACHE_TTL_TAG_FILTER) {
    config.ttl.tagFilter = parseInt(env.CACHE_TTL_TAG_FILTER, 10)
  }
  if (env.CACHE_TTL_SEARCH) {
    config.ttl.search = parseInt(env.CACHE_TTL_SEARCH, 10)
  }
  if (env.CACHE_TTL_PUBLIC_SHARE) {
    config.ttl.publicShare = parseInt(env.CACHE_TTL_PUBLIC_SHARE, 10)
  }
  if (env.ENABLE_MEMORY_CACHE === 'false') {
    config.memoryCache.enabled = false
  }
  if (env.MEMORY_CACHE_MAX_AGE) {
    config.memoryCache.maxAge = parseInt(env.MEMORY_CACHE_MAX_AGE, 10)
  }
  return config
}
/**
 * 
 */
export function validateCacheConfig(config: CacheConfig): boolean {

  if (config.level < 0 || config.level > 3) {
    return false
  }

  for (const ttl of Object.values(config.ttl)) {
    if (ttl < 0 || ttl > 86400) {  // 
      return false
    }
  }

  if (config.memoryCache.maxAge < 0 || config.memoryCache.maxAge > 3600) {
    return false
  }
  return true
}
