/**
 * Tab Collection Service
 * Handles OneTab-like tab collection functionality
 */

import { db } from '@/lib/db';
import { createTMarksClient } from '@/lib/api/tmarks';
import type { TabGroupInput, TabGroupResult } from '@/types';
import type { BookmarkSiteConfig } from '@/types';
import { EXTERNAL_SERVICES } from '@/lib/constants/urls';

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
    console.warn(`Invalid URL for favicon: ${url}`, error);
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
        baseUrl: config.apiUrl,
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
      console.error('Failed to sync tab group to TMarks:', error);

      // Return success with offline flag
      return {
        success: true,
        groupId: localGroupId.toString(),
        offline: true,
        message: `已离线保存 ${validTabs.length} 个标签页`,
      };
    }
  } catch (error: any) {
    console.error('Failed to collect tabs:', error);
    return {
      success: false,
      error: error.message || '收纳标签页失败',
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
  } catch (error: any) {
    console.error('Failed to restore tab group:', error);
    throw error;
  }
}

