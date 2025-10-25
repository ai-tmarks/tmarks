import { db } from '@/lib/db';
import { bookmarkAPI } from './bookmark-api';
import { tagRecommender } from './tag-recommender';
import type { SyncResult } from '@/types';
import { PAGINATION } from '@/lib/constants/urls';

export class CacheManager {
  /**
   * Full sync: Clear and reload all data from bookmark site
   */
  async fullSync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log('[CacheManager] Starting full sync...');

      // 1. Fetch and cache tags
      const tags = await bookmarkAPI.getTags();
      await db.tags.clear();
      await db.tags.bulkAdd(tags);
      console.log(`[CacheManager] Synced ${tags.length} tags`);

      // 2. Fetch and cache bookmarks (paginated)
      let page = 1;
      let totalBookmarks = 0;
      await db.bookmarks.clear();

      while (page <= PAGINATION.MAX_PAGES) { // Safety limit
        const { bookmarks, hasMore } = await bookmarkAPI.getBookmarks(page, PAGINATION.DEFAULT_PAGE_SIZE);

        if (bookmarks.length > 0) {
          await db.bookmarks.bulkAdd(bookmarks);
          totalBookmarks += bookmarks.length;
          console.log(`[CacheManager] Synced page ${page}: ${bookmarks.length} bookmarks`);
        }

        if (!hasMore) break;
        page++;
      }

      // 3. Update metadata
      await db.updateLastSyncTime(Date.now());
      await db.metadata.put({
        key: 'totalTags',
        value: tags.length,
        updatedAt: Date.now()
      });
      await db.metadata.put({
        key: 'totalBookmarks',
        value: totalBookmarks,
        updatedAt: Date.now()
      });

      await tagRecommender.refreshContextFromDB();

      const duration = Date.now() - startTime;
      console.log(`[CacheManager] Full sync completed in ${duration}ms`);

      return {
        success: true,
        duration,
        stats: {
          tags: tags.length,
          bookmarks: totalBookmarks
        }
      };
    } catch (error) {
      console.error('[CacheManager] Full sync failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Incremental sync: Only fetch recent changes
   * Note: Requires bookmark site to support 'since' parameter
   * Falls back to full sync if not supported
   */
  async incrementalSync(): Promise<SyncResult> {
    try {
      const lastSync = await db.getLastSyncTime();

      if (lastSync === 0) {
        // No previous sync, do full sync
        return this.fullSync();
      }

      // TODO: Implement incremental sync when API supports it
      // For now, we'll do a simple full sync
      // In production, you would:
      // 1. GET /api/bookmarks?since={lastSync}
      // 2. GET /api/tags?since={lastSync}
      // 3. Merge changes into existing data

      console.log('[CacheManager] Incremental sync not implemented, falling back to full sync');
      return this.fullSync();
    } catch (error) {
      console.error('[CacheManager] Incremental sync failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ tags: number; bookmarks: number; lastSync: number }> {
    return db.getStats();
  }

  /**
   * Check if cache is stale (older than specified hours)
   */
  async isCacheStale(maxAgeHours: number = 24): Promise<boolean> {
    const lastSync = await db.getLastSyncTime();
    if (lastSync === 0) return true;

    const maxAge = maxAgeHours * 60 * 60 * 1000;
    return Date.now() - lastSync > maxAge;
  }

  /**
   * Auto sync: Check if cache is stale and sync if needed
   */
  async autoSync(maxAgeHours: number = 24): Promise<SyncResult | null> {
    const isStale = await this.isCacheStale(maxAgeHours);

    if (isStale) {
      console.log('[CacheManager] Cache is stale, performing auto sync');
      return this.incrementalSync();
    }

    console.log('[CacheManager] Cache is fresh, skipping sync');
    return null;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await db.clearAll();
    tagRecommender.clearContextCache();
    console.log('[CacheManager] Cache cleared');
  }
}

// Singleton instance
export const cacheManager = new CacheManager();
