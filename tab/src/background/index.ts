import { cacheManager } from '@/lib/services/cache-manager';
import { tagRecommender } from '@/lib/services/tag-recommender';
import { bookmarkService } from '@/lib/services/bookmark-service';
import { bookmarkAPI } from '@/lib/services/bookmark-api';
import { StorageService } from '@/lib/utils/storage';
import type { Message, MessageResponse } from '@/types';
import { TIMEOUTS } from '@/lib/constants/urls';

/**
 * Background service worker for Chrome Extension
 */

console.log('[Background] Service worker started');

tagRecommender.preloadContext().catch(error => {
  console.error('[Background] Failed to preload AI context:', error);
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // First time install - maybe show welcome page
    console.log('[Background] First time install');
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('[Background] Extension updated');
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

    console.log('[Background] Running scheduled auto-sync (23:00)...');
    const result = await cacheManager.autoSync(config.preferences.syncInterval);

    if (result) {
      console.log('[Background] Auto-sync result:', result);
    }
  } catch (error) {
    console.error('[Background] Auto-sync failed:', error);
  }
}

async function startAutoSync() {
  const scheduleNext = () => {
    const delay = getMsUntilNextDailySync();
    console.log('[Background] Next auto-sync scheduled in', Math.round(delay / 1000), 'seconds');

    setTimeout(async () => {
      await runAutoSync();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

// Start auto-sync
startAutoSync().catch(console.error);

// Sync pending bookmarks on startup
bookmarkService.syncPendingBookmarks().catch(console.error);

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
        console.error('[Background] Message handler error:', error);
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
  console.log('[Background] Received message:', message.type);

  switch (message.type) {
    case 'EXTRACT_PAGE_INFO': {
      // Forward to content script in active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab');
      }

      // Check if content script is injected
      try {
        const response = await chrome.tabs.sendMessage(tab.id, message);
        return response;
      } catch (error) {
        console.error('[Background] Failed to send message to content script:', error);

        // Try to inject content script and retry
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['assets/content.js']
          });

          // Wait a bit for the script to load
          await new Promise(resolve => setTimeout(resolve, 100));

          // Retry the message with timeout
          const response = await Promise.race([
            chrome.tabs.sendMessage(tab.id, message),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Message timeout')), TIMEOUTS.CONTENT_SCRIPT_INJECTION)
            )
          ]);
          return response;
        } catch (injectError) {
          console.error('[Background] Failed to inject content script:', injectError);

          // Fallback: extract basic page info from background
          try {
            const currentTab = await chrome.tabs.get(tab.id);
            const url = currentTab.url || '';

            const basicPageInfo = {
              title: currentTab.title || 'Untitled',
              url: url,
              description: '',
              content: '',
              thumbnail: ''
            };

            return {
              success: true,
              data: basicPageInfo
            };
          } catch (tabError) {
            throw new Error('Failed to extract page info: Unable to access tab information');
          }
        }
      }
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
      const bookmark = message.payload;
      const result = await bookmarkService.saveBookmark(bookmark);

      return {
        success: true,
        data: result
      };
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
        console.error('[Background] Failed to get existing tags:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load tags'
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
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Extension icon clicked for tab:', tab.id);
  // The popup will open automatically due to manifest.json configuration
});

console.log('[Background] Service worker initialized');
