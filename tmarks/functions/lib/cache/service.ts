/**
 * 
 * 

 */
import type { Env } from '../types'
import type {
  CacheConfig,
  CacheStrategyType,
  CacheEntry,
  CacheSetOptions,
  CacheStats,
} from './types'
import { loadCacheConfig } from './config'
import { shouldCacheQuery } from './strategies'
/**

 */
export class CacheService {
  private config: CacheConfig
  private env: Env
  private memCache: Map<string, CacheEntry> = new Map()
  private hits = 0
  private misses = 0
  private errorCount = 0
  private readonly MAX_ERRORS = 10
  constructor(env: Env) {
    this.env = env
    this.config = loadCacheConfig(env)
  }
  /**
   * 
   */
  async get<T>(
    type: CacheStrategyType,
    key: string
  ): Promise<T | null> {
    if (!this.isEnabled(type)) {
      return null
    }
    try {
      if (this.config.memoryCache.enabled) {
        const memCached = this.getFromMemory<T>(key)
        if (memCached !== null) {
          this.hits++
          return memCached
        }
      }
      this.misses++
      return null
    } catch (error) {
      this.handleError('get', error)
      this.misses++
      return null
    }
  }
  /**
   * 
   */
  async set<T>(
    type: CacheStrategyType,
    key: string,
    data: T,
    options?: CacheSetOptions
  ): Promise<void> {
    if (!this.isEnabled(type)) {
      return
    }
    try {
      if (this.config.memoryCache.enabled) {
        this.setToMemory(key, data, options?.ttl)
      }
    } catch (error) {
      this.handleError('set', error)
    }
  }
  /**
   * 
   */
  async delete(key: string): Promise<void> {
    try {
      this.memCache.delete(key)
    } catch (error) {
      this.handleError('delete', error)
    }
  }
  /**

   */
  async invalidate(prefix: string): Promise<void> {
    try {
      const keysToDelete: string[] = []
      this.memCache.forEach((_, key) => {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => this.memCache.delete(key))
    } catch (error) {
      this.handleError('invalidate', error)
    }
  }
  /**
   * 
   */
  shouldCache(type: CacheStrategyType, params?: Record<string, unknown>): boolean {
    if (!this.isEnabled(type)) {
      return false
    }
    return shouldCacheQuery(type, params)
  }
  /**
   * 
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      level: this.config.level,
      enabled: this.config.enabled,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      memCacheSize: this.memCache.size,
      strategies: this.config.strategies,
    }
  }
  /**
   * 
   */
  getConfig(): CacheConfig {
    return { ...this.config }
  }
  // ====================  ====================
  /**
   * 
   */
  private isEnabled(type: CacheStrategyType): boolean {
    return this.config.enabled && this.config.strategies[type]
  }
  /**

   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memCache.get(key)
    if (entry && entry.expires > Date.now()) {
      return entry.data as T
    }
    if (entry) {
      this.memCache.delete(key)
    }
    return null
  }
  /**
   * 
   */
  private setToMemory<T>(key: string, data: T, ttlSeconds?: number): void {

    if (this.memCache.size > 500) {
      const now = Date.now()
      for (const [k, entry] of this.memCache.entries()) {
        if (entry.expires <= now) {
          this.memCache.delete(k)
        }
      }
    }
    const maxAge = (ttlSeconds ?? this.config.memoryCache.maxAge) * 1000
    this.memCache.set(key, {
      data,
      expires: Date.now() + maxAge,
    })
  }
  /**
   * 
   */
  private handleError(operation: string, error: unknown): void {
    this.errorCount++
    if (this.errorCount >= this.MAX_ERRORS) {
      console.error(`Too many cache errors (${this.errorCount}), disabling cache`)
      this.config.enabled = false
    }
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Cache ${operation} error:`, message)
  }
}
