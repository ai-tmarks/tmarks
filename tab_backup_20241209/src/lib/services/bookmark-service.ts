import { db } from '@/lib/db';
import { bookmarkAPI } from './bookmark-api';
import { tagRecommender } from './tag-recommender';
import type { BookmarkInput, SaveResult } from '@/types';

export class BookmarkService {
  /**
   * Save bookmark to remote and local cache
   */
  async saveBookmark(bookmark: BookmarkInput): Promise<SaveResult> {
    let bookmarkId: string | undefined;
    let isExisting = false;

    console.log('[BookmarkService] saveBookmark 开始:', {
      url: bookmark.url,
      title: bookmark.title,
      tags: bookmark.tags,
      hasThumbnail: !!bookmark.thumbnail,
      hasFavicon: !!bookmark.favicon,
      createSnapshot: bookmark.createSnapshot
    });

    try {
      // 1. Save to remote API
      console.log('[BookmarkService] 步骤1: 调用远程 API...');
      const result = await bookmarkAPI.addBookmark(bookmark);
      bookmarkId = result.id;
      isExisting = result.isExisting || false;
      console.log('[BookmarkService] 远程 API 返回:', { bookmarkId, isExisting });

      // If bookmark exists, return it for the dialog
      if (isExisting && result.existingBookmark) {
        console.log('[BookmarkService] 书签已存在，返回对话框数据');
        return {
          success: true,
          existingBookmark: {
            ...result.existingBookmark,
            needsDialog: true
          },
          message: '书签已存在'
        };
      }

      // 2. Save to local cache (only for new bookmarks)
      if (!isExisting) {
        console.log('[BookmarkService] 步骤2: 保存到本地缓存...');
        await db.bookmarks.add({
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          tags: bookmark.tags,
          createdAt: Date.now(),
          remoteId: result.id,
          isPublic: bookmark.isPublic ?? false
        });

        // 3. Update tag usage counts
        console.log('[BookmarkService] 步骤3: 更新标签计数...');
        await this.updateTagCounts(bookmark.tags);

        // 4. Update in-memory context cache for AI
        console.log('[BookmarkService] 步骤4: 更新 AI 上下文缓存...');
        tagRecommender.updateContextWithBookmark({
          title: bookmark.title,
          tags: bookmark.tags
        });
      }

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = error?.code || '';
      const errorStatus = error?.status || 0;
      
      // 详细打印错误信息，方便调试
      console.error('[BookmarkService] ========== 保存书签错误 ==========');
      console.error('[BookmarkService] 错误消息:', errorMessage);
      console.error('[BookmarkService] 错误代码:', errorCode);
      console.error('[BookmarkService] HTTP状态:', errorStatus);
      console.error('[BookmarkService] 完整错误对象:', error);
      console.error('[BookmarkService] =====================================');

      // 判断是否是认证相关错误
      const isAuthError = errorCode === 'INVALID_API_KEY' || 
                          errorCode === 'MISSING_API_KEY' ||
                          errorCode === 'INSUFFICIENT_PERMISSIONS' ||
                          errorStatus === 401 ||
                          errorStatus === 403 ||
                          errorMessage.includes('认证') ||
                          errorMessage.includes('API Key');
      
      console.log('[BookmarkService] 是否认证错误:', isAuthError);
      
      // 判断是否是真正的网络错误（无法连接服务器）
      const isNetworkError = (errorCode === 'NETWORK_ERROR' || errorStatus === 0) &&
                             !isAuthError &&
                             (errorMessage.includes('Network') || 
                              errorMessage.includes('网络') ||
                              errorMessage.includes('connect'));
      
      console.log('[BookmarkService] 是否网络错误:', isNetworkError);
      
      if (isNetworkError) {
        console.log('[BookmarkService] >>> 进入离线队列');
        // Queue for later sync
        await this.queueForLaterSync(bookmark);

        return {
          success: true,
          offline: true,
          message: '网络不可用，已暂存到本地，将在网络恢复后自动同步'
        };
      }
      
      // 对于认证错误和其他错误，直接抛出，让UI显示详细错误信息
      console.log('[BookmarkService] >>> 直接抛出错误，不进入离线队列');
      throw error;
    }

    // 5. Create snapshot if requested (works for both new and existing bookmarks)
    if (bookmark.createSnapshot && bookmarkId) {
      try {
        // Get the current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          // Capture page using V2 method (separate images)
          let captureResult: { html: string; images: any[] };
          try {
            const capturePromise = chrome.tabs.sendMessage(tab.id, {
              type: 'CAPTURE_PAGE_V2',
              options: {
                inlineCSS: true,
                extractImages: true,
                inlineFonts: false,
                removeScripts: true,
                removeHiddenElements: false,
                maxImageSize: 100 * 1024 * 1024, // 提高到 100MB
                timeout: 30000
              }
            });
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Capture timeout')), 35000);
            });
            
            const response = await Promise.race([capturePromise, timeoutPromise]) as any;
            
            if (response.success) {
              captureResult = response.data;
            } else {
              throw new Error(response.error || 'Capture failed');
            }
          } catch (error) {
            throw error;
          }
          
          // Prepare images for upload
          const images = captureResult.images.map((img: any) => ({
            hash: img.hash,
            data: img.data, // base64
            type: img.type,
          }));

          // Create snapshot via V2 API
          await bookmarkAPI.createSnapshotV2(bookmarkId, {
            html_content: captureResult.html,
            title: bookmark.title,
            url: bookmark.url,
            images,
          });
        }
      } catch (snapshotError) {
        // Don't fail the whole operation if snapshot creation fails
      }
    }

    return {
      success: true,
      bookmarkId: bookmarkId,
      message: isExisting ? '书签已存在，已为其创建新快照' : undefined
    };
  }

  /**
   * Update tag usage counts in cache
   */
  private async updateTagCounts(tagNames: string[]): Promise<void> {
    for (const tagName of tagNames) {
      const existingTag = await db.tags.where('name').equals(tagName).first();

      if (existingTag && existingTag.id) {
        // Increment count
        await db.tags.update(existingTag.id, {
          count: (existingTag.count || 0) + 1
        });
      } else {
        // Create new tag
        await db.tags.add({
          name: tagName,
          count: 1,
          createdAt: Date.now()
        });
      }
    }
  }

  /**
   * Queue bookmark for later sync (offline mode)
   */
  private async queueForLaterSync(bookmark: BookmarkInput): Promise<void> {
    await db.metadata.add({
      key: `pending_${Date.now()}`,
      value: bookmark,
      updatedAt: Date.now()
    });
  }

  /**
   * Sync pending bookmarks (when back online)
   */
  async syncPendingBookmarks(): Promise<number> {
    const pending = await db.metadata
      .where('key')
      .startsWith('pending_')
      .toArray();

    let synced = 0;

    for (const item of pending) {
      try {
        // Type guard to ensure item.value is BookmarkInput
        if (item.value && typeof item.value === 'object' && 'url' in item.value && 'title' in item.value) {
          const bookmark = item.value as BookmarkInput;
          await bookmarkAPI.addBookmark(bookmark);
          await db.metadata.delete(item.key);
          synced++;
        }
      } catch (error) {
        // Silently handle error
      }
    }

    return synced;
  }

  /**
   * Get pending bookmarks count
   */
  async getPendingCount(): Promise<number> {
    const pending = await db.metadata
      .where('key')
      .startsWith('pending_')
      .count();

    return pending;
  }
}

// Singleton instance
export const bookmarkService = new BookmarkService();
