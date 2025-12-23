/**
 * NewTab 数据同步服务
 * 只同步核心数据：分组名称 + 快捷方式（标题、网址、所属分组、位置）
 * 不同步：图标(favicon/icon)
 */

import type { ShortcutGroup, GridItem } from '../../types';
import { StorageService } from '@/lib/utils/storage';
import { getTMarksUrls } from '@/lib/constants/urls';

/**
 * 同步 NewTab 数据到后端（静默执行，不阻塞 UI）
 */
export async function syncNewtabToBackend(data: {
  groups: ShortcutGroup[];
  gridItems: GridItem[];
}) {
  try {
    const configuredUrl = await StorageService.getBookmarkSiteApiUrl();
    const apiKey = await StorageService.getBookmarkSiteApiKey();

    if (!apiKey) {
      console.log('[NewTab Sync] 未配置 API Key，跳过同步');
      return;
    }

    const baseUrl = configuredUrl?.endsWith('/api')
      ? configuredUrl
      : getTMarksUrls(configuredUrl || undefined).API_BASE;

    // 从 gridItems 中提取快捷方式（保留位置信息）
    const shortcuts = data.gridItems
      .filter((item) => item.type === 'shortcut' && item.shortcut?.url)
      .map((item) => ({
        id: item.id,
        title: item.shortcut!.title,
        url: item.shortcut!.url,
        group_id: item.groupId,
        position: item.position,
      }));

    const response = await fetch(`${baseUrl}/tab/newtab/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        groups: data.groups.map((g, index) => ({
          id: g.id,
          name: g.name,
          position: g.position ?? index,
        })),
        shortcuts,
      }),
    });

    if (response.ok) {
      console.log('[NewTab Sync] 数据已同步到后端');
    } else {
      console.warn('[NewTab Sync] 同步失败:', response.status);
    }
  } catch (error) {
    console.warn('[NewTab Sync] 同步失败:', error);
  }
}

// 防抖同步
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedSync(data: {
  groups: ShortcutGroup[];
  gridItems: GridItem[];
}) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncNewtabToBackend(data);
  }, 2000);
}
