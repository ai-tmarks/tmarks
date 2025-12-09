import { cacheManager } from '@/lib/services/cache-manager';
import { tagRecommender } from '@/lib/services/tag-recommender';
import { bookmarkService } from '@/lib/services/bookmark-service';
import { bookmarkAPI } from '@/lib/services/bookmark-api';
import { syncPendingTabGroups } from '@/lib/services/tab-collection';
import { StorageService } from '@/lib/utils/storage';
import type { Message, MessageResponse } from '@/types';

/**
 * Background service worker for Chrome Extension
 */

// Preload AI context
tagRecommender.preloadContext().catch(() => {
  // Silently fail - AI features will work on-demand
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First time install - maybe show welcome page
  } else if (details.reason === 'update') {
    // Extension updated
  }
});

// Auto-sync cache periodically
function getMsUntilNextDailySync(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(23, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

async function runAutoSync() {
  try {
    const config = await StorageService.loadConfig();
    if (!config.preferences.autoSync) {
      return;
    }

    await cacheManager.autoSync(config.preferences.syncInterval);
  } catch (error) {
    // Silently fail - will retry on next schedule
  }
}

async function startAutoSync() {
  const scheduleNext = () => {
    const delay = getMsUntilNextDailySync();

    setTimeout(async () => {
      await runAutoSync();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

// Start auto-sync
startAutoSync().catch(() => {});

// Sync pending bookmarks on startup
bookmarkService.syncPendingBookmarks().catch(() => {});

// Sync pending tab groups on startup
(async () => {
  try {
    const config = await StorageService.loadConfig();
    if (config.bookmarkSite.apiKey) {
      await syncPendingTabGroups(config.bookmarkSite);
    }
  } catch (error) {
    // Silently fail
  }
})();

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    // Handle async operations
    handleMessage(message, sender)
      .then(response => sendResponse(response))
      .catch(error => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

    // Return true to indicate async response
    return true;
  }
);

/**
 * Handle messages from popup/content scripts
 */
async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  switch (message.type) {
    case 'EXTRACT_PAGE_INFO': {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      // 检查URL是否可访问（排除chrome://等特殊页面）
      const url = tab.url || '';
      if (url.startsWith('chrome://') || 
          url.startsWith('chrome-extension://') || 
          url.startsWith('edge://') ||
          url.startsWith('about:') ||
          !url) {
        return {
          success: true,
          data: {
            title: tab.title || 'Untitled',
            url: url,
            description: '',
            content: '',
            thumbnail: ''
          }
        };
      }

      // 辅助函数：带超时的消息发送
      const sendMessageWithTimeout = async (tabId: number, msg: Message, timeoutMs: number = 3000): Promise<MessageResponse> => {
        return Promise.race([
          chrome.tabs.sendMessage(tabId, msg),
          new Promise<MessageResponse>((_, reject) => 
            setTimeout(() => reject(new Error('Message timeout')), timeoutMs)
          )
        ]);
      };

      // 辅助函数：获取基本页面信息作为fallback
      const getBasicPageInfo = async (tabId: number) => {
        try {
          const currentTab = await chrome.tabs.get(tabId);
          return {
            success: true,
            data: {
              title: currentTab.title || 'Untitled',
              url: currentTab.url || '',
              description: '',
              content: '',
              thumbnail: ''
            }
          };
        } catch (error) {
          return {
            success: true,
            data: {
              title: 'Untitled',
              url: url,
              description: '',
              content: '',
              thumbnail: ''
            }
          };
        }
      };

      // 步骤1: 检测content script是否存活
      let isContentScriptAlive = false;
      try {
        await sendMessageWithTimeout(tab.id, { type: 'PING' }, 1000);
        isContentScriptAlive = true;
      } catch (pingError) {
        // Content script not responding, will try to inject
      }

      // 步骤2: 如果content script不存在，尝试注入
      if (!isContentScriptAlive) {
        try {
          // 获取manifest中的content script配置
          const manifest = chrome.runtime.getManifest();
          const contentScripts = manifest.content_scripts?.[0];
          
          if (!contentScripts || !contentScripts.js || contentScripts.js.length === 0) {
            return await getBasicPageInfo(tab.id);
          }

          const scriptPath = contentScripts.js[0];
          
          // 注入content script
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [scriptPath]
          });

          // 等待脚本初始化，并验证注入是否成功
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 验证注入是否成功
          try {
            await sendMessageWithTimeout(tab.id, { type: 'PING' }, 1000);
            isContentScriptAlive = true;
          } catch (verifyError) {
            return await getBasicPageInfo(tab.id);
          }
        } catch (injectError) {
          return await getBasicPageInfo(tab.id);
        }
      }

      // 步骤3: 发送实际的提取请求
      if (isContentScriptAlive) {
        try {
          const response = await sendMessageWithTimeout(tab.id, message, 5000);
          
          // 验证响应数据的完整性
          if (response.success && response.data) {
            return response;
          } else {
            return await getBasicPageInfo(tab.id);
          }
        } catch (extractError) {
          return await getBasicPageInfo(tab.id);
        }
      }

      // 步骤4: 最终fallback
      return await getBasicPageInfo(tab.id);
    }

    case 'RECOMMEND_TAGS': {
      const pageInfo = message.payload;
      const result = await tagRecommender.recommendTags(pageInfo);

      return {
        success: true,
        data: result
      };
    }

    case 'SAVE_BOOKMARK': {
      try {
        const bookmark = message.payload;
        const result = await bookmarkService.saveBookmark(bookmark);

        return {
          success: true,
          data: result
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save bookmark'
        };
      }
    }

    case 'SYNC_CACHE': {
      const result = await cacheManager.fullSync();

      return {
        success: result.success,
        data: result,
        error: result.error
      };
    }

    case 'GET_EXISTING_TAGS': {
      try {
        const tags = await bookmarkAPI.getTags();
        return {
          success: true,
          data: tags
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load tags'
        };
      }
    }

    case 'UPDATE_BOOKMARK_TAGS': {
      try {
        const { bookmarkId, tags } = message.payload;
        
        // 调用 API 更新标签
        await bookmarkAPI.updateBookmarkTags(bookmarkId, tags);

        return {
          success: true,
          data: { message: 'Tags updated successfully' }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update tags'
        };
      }
    }

    case 'CREATE_SNAPSHOT': {
      try {
        const { bookmarkId, title, url } = message.payload;
        
        // Get the current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          throw new Error('No active tab found');
        }

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
          title,
          url,
          images,
        });

        return {
          success: true,
          data: { 
            message: 'Snapshot created successfully (V2)',
            imageCount: images.length,
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create snapshot'
        };
      }
    }

    case 'GET_CONFIG': {
      const config = await StorageService.loadConfig();

      return {
        success: true,
        data: config
      };
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// Handle extension icon click (optional)
chrome.action.onClicked.addListener(async () => {
  // The popup will open automatically due to manifest.json configuration
});
