/**
 * Tab Collection Service
 * Handles OneTab-like tab collection functionality
 */

import { db } from '@/lib/db';
import { createTMarksClient } from '@/lib/api/tmarks';
import type { TabGroupInput, TabGroupResult } from '@/types';
import type { BookmarkSiteConfig } from '@/types';
import { EXTERNAL_SERVICES, normalizeApiUrl } from '@/lib/constants/urls';

/**
 * Get all tabs in the current window
 */
export async function getCurrentWindowTabs(): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      resolve(tabs);
    });
  });
}

/**
 * Close tabs by IDs
 */
export async function closeTabs(tabIds: number[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabIds, () => {
      resolve();
    });
  });
}

/**
 * Generate favicon URL using Google Favicon API
 */
function getFaviconUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);
    return `${EXTERNAL_SERVICES.GOOGLE_FAVICON}?domain=${urlObj.hostname}&sz=32`;
  } catch (error) {
    return '';
  }
}

/**
 * Collect selected tabs in current window and save to TMarks
 */
export async function collectCurrentWindowTabs(
  config: BookmarkSiteConfig,
  selectedTabIds?: Set<number>
): Promise<TabGroupResult> {
  try {
    // Get all tabs in current window
    const tabs = await getCurrentWindowTabs();

    // Filter out empty tabs and current popup
    let validTabs = tabs.filter(
      (tab) => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')
    );

    // If selectedTabIds is provided, only collect selected tabs
    if (selectedTabIds && selectedTabIds.size > 0) {
      validTabs = validTabs.filter((tab) => tab.id && selectedTabIds.has(tab.id));
    }

    if (validTabs.length === 0) {
      return {
        success: false,
        error: '当前窗口没有可收纳的标签页',
      };
    }

    // Prepare tab group input
    const tabGroupInput: TabGroupInput = {
      items: validTabs.map((tab) => ({
        title: tab.title || 'Untitled',
        url: tab.url!,
        favicon: getFaviconUrl(tab.url!),
      })),
    };

    // Save to local database first
    const localGroupId = await saveTabGroupLocally(tabGroupInput);

    // Try to sync to TMarks
    try {
      const client = createTMarksClient({
        baseUrl: normalizeApiUrl(config.apiUrl),
        apiKey: config.apiKey,
      });

      const response = await client.tabGroups.createTabGroup(tabGroupInput);

      // Update local record with remote ID
      await db.tabGroups.update(localGroupId, {
        remoteId: response.data.tab_group.id,
      });

      return {
        success: true,
        groupId: response.data.tab_group.id,
        message: `成功收纳 ${validTabs.length} 个标签页`,
      };
    } catch (error: any) {
      // 详细记录错误信息
      console.error('[TabCollection] 同步到 TMarks 失败:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      const errorCode = error?.code || '';
      const errorStatus = error?.status || 0;
      const errorMessage = error?.message || '';

      // 判断是否是认证相关错误
      const isAuthError =
        errorCode === 'INVALID_API_KEY' ||
        errorCode === 'MISSING_API_KEY' ||
        errorCode === 'INSUFFICIENT_PERMISSIONS' ||
        errorStatus === 401 ||
        errorStatus === 403 ||
        errorMessage.includes('认证') ||
        errorMessage.includes('API Key');

      // 判断是否是真正的网络错误
      const isNetworkError =
        (errorCode === 'NETWORK_ERROR' || errorStatus === 0) &&
        !isAuthError &&
        (errorMessage.includes('Network') ||
          errorMessage.includes('网络') ||
          errorMessage.includes('connect'));

      if (isNetworkError) {
        // 网络错误，返回离线保存
        return {
          success: true,
          groupId: localGroupId.toString(),
          offline: true,
          message: `网络不可用，已离线保存 ${validTabs.length} 个标签页，将在网络恢复后自动同步`,
        };
      }

      // 认证错误或其他错误，返回失败并显示具体错误信息
      let friendlyMessage: string;
      if (errorStatus === 401 || errorCode === 'INVALID_API_KEY' || errorCode === 'MISSING_API_KEY') {
        friendlyMessage = '认证失败：API Key 无效或已过期，请在设置中检查您的 TMarks API Key';
      } else if (errorStatus === 403 || errorCode === 'INSUFFICIENT_PERMISSIONS') {
        friendlyMessage = '权限不足：您的 API Key 没有保存收纳的权限';
      } else if (errorStatus === 429 || errorCode === 'RATE_LIMIT_EXCEEDED') {
        friendlyMessage = '请求过于频繁，请稍后再试';
      } else if (errorStatus >= 500) {
        friendlyMessage = 'TMarks 服务器错误，请稍后再试';
      } else {
        friendlyMessage = errorMessage || '保存收纳失败';
      }

      return {
        success: false,
        error: friendlyMessage,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '收纳标签页失败';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Save tab group to local database
 */
async function saveTabGroupLocally(input: TabGroupInput): Promise<number> {
  const now = Date.now();

  // Generate default title if not provided
  const title = input.title || new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(/\//g, '-');

  // Insert tab group
  const groupId = await db.tabGroups.add({
    title,
    createdAt: now,
  });

  // Insert tab group items
  const items = input.items.map((item, index) => ({
    groupId: groupId as number,
    title: item.title,
    url: item.url,
    favicon: item.favicon,
    position: index,
    createdAt: now,
  }));

  await db.tabGroupItems.bulkAdd(items);

  return groupId as number;
}

/**
 * Restore tabs from a tab group
 */
export async function restoreTabGroup(groupId: number, inNewWindow: boolean = true): Promise<void> {
  try {
    // Get tab group items from local database
    const items = await db.tabGroupItems
      .where('groupId')
      .equals(groupId)
      .sortBy('position');

    if (items.length === 0) {
      throw new Error('标签页组为空');
    }

    const urls = items.map((item) => item.url);

    if (inNewWindow) {
      // Create new window with all tabs
      chrome.windows.create({
        url: urls,
        focused: true,
      });
    } else {
      // Open tabs in current window
      for (const url of urls) {
        chrome.tabs.create({ url, active: false });
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Sync pending tab groups that were saved offline
 */
export async function syncPendingTabGroups(config: BookmarkSiteConfig): Promise<number> {
  try {
    // Find tab groups without remoteId (not synced)
    const pendingGroups = await db.tabGroups
      .filter((group) => !group.remoteId)
      .toArray();

    if (pendingGroups.length === 0) {
      return 0;
    }

    const client = createTMarksClient({
      baseUrl: normalizeApiUrl(config.apiUrl),
      apiKey: config.apiKey,
    });

    let synced = 0;

    for (const group of pendingGroups) {
      try {
        // Get items for this group
        const items = await db.tabGroupItems
          .where('groupId')
          .equals(group.id!)
          .sortBy('position');

        if (items.length === 0) {
          continue;
        }

        // Create tab group on server
        const response = await client.tabGroups.createTabGroup({
          title: group.title,
          items: items.map((item) => ({
            title: item.title,
            url: item.url,
            favicon: item.favicon,
          })),
        });

        // Update local record with remote ID
        await db.tabGroups.update(group.id!, {
          remoteId: response.data.tab_group.id,
        });

        synced++;
      } catch (error) {
        // Skip this group and continue with others
        console.error('[TabCollection] Failed to sync group:', group.id, error);
      }
    }

    return synced;
  } catch (error) {
    console.error('[TabCollection] syncPendingTabGroups error:', error);
    return 0;
  }
}

