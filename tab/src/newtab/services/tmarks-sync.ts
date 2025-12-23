/**
 * TMarks 同步服务
 * 负责 NewTab 书签与 TMarks 服务器的同步
 */

import { createTMarksClient } from '@/lib/api/tmarks';
import { StorageService } from '@/lib/utils/storage';
import type { GridItem } from '../types';

export interface TMarksSyncResult {
  success: boolean;
  tmarksBookmarkId?: string;
  error?: string;
}

/**
 * 获取 TMarks 客户端（如果配置了）
 */
async function getTMarksClient() {
  try {
    const config = await StorageService.getTMarksConfig();
    if (!config?.bookmarkApiUrl || !config?.bookmarkApiKey) {
      return null;
    }
    return createTMarksClient({
      baseUrl: config.bookmarkApiUrl,
      apiKey: config.bookmarkApiKey,
    });
  } catch {
    return null;
  }
}

/**
 * 同步创建书签到 TMarks 服务器
 */
export async function syncCreateBookmarkToTMarks(
  item: GridItem
): Promise<TMarksSyncResult> {
  if (item.type !== 'shortcut' || !item.shortcut?.url) {
    return { success: false, error: 'Not a shortcut item' };
  }

  const client = await getTMarksClient();
  if (!client) {
    // 未配置 TMarks，静默跳过
    return { success: true };
  }

  try {
    const response = await client.bookmarks.createBookmark({
      title: item.shortcut.title,
      url: item.shortcut.url,
      tags: [], // 可以后续添加标签支持
    });

    return {
      success: true,
      tmarksBookmarkId: response.data.bookmark.id,
    };
  } catch (error) {
    console.error('[TMarks Sync] 创建书签失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    };
  }
}

/**
 * 同步删除书签到 TMarks 服务器（移入回收站）
 */
export async function syncTrashBookmarkToTMarks(
  tmarksBookmarkId: string
): Promise<TMarksSyncResult> {
  if (!tmarksBookmarkId) {
    return { success: true }; // 没有关联的 TMarks 书签，跳过
  }

  const client = await getTMarksClient();
  if (!client) {
    return { success: true }; // 未配置 TMarks，静默跳过
  }

  try {
    await client.bookmarks.trashBookmark(tmarksBookmarkId);
    return { success: true };
  } catch (error) {
    console.error('[TMarks Sync] 删除书签失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步删除失败',
    };
  }
}

/**
 * 批量同步删除书签到 TMarks 服务器
 */
export async function syncTrashBookmarksToTMarks(
  tmarksBookmarkIds: string[]
): Promise<TMarksSyncResult> {
  if (tmarksBookmarkIds.length === 0) {
    return { success: true };
  }

  const client = await getTMarksClient();
  if (!client) {
    return { success: true };
  }

  const errors: string[] = [];
  for (const id of tmarksBookmarkIds) {
    try {
      await client.bookmarks.trashBookmark(id);
    } catch (error) {
      errors.push(`${id}: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `部分书签删除失败: ${errors.join(', ')}`,
    };
  }

  return { success: true };
}

/**
 * 同步更新书签到 TMarks 服务器
 */
export async function syncUpdateBookmarkToTMarks(
  tmarksBookmarkId: string,
  updates: { title?: string; url?: string }
): Promise<TMarksSyncResult> {
  if (!tmarksBookmarkId) {
    return { success: true };
  }

  const client = await getTMarksClient();
  if (!client) {
    return { success: true };
  }

  try {
    await client.bookmarks.updateBookmark(tmarksBookmarkId, updates);
    return { success: true };
  } catch (error) {
    console.error('[TMarks Sync] 更新书签失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步更新失败',
    };
  }
}
