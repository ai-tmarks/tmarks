/**
 * Browser Bookmarks 相关 Actions
 */

import type { GridItem } from '../../../types';
import type { NewTabState } from '../types';
import { pruneEmptyFoldersCascade } from '../utils';
import { debouncedSync } from '../sync';
import { syncTrashBookmarksToTMarks } from '../../../services/tmarks-sync';

export interface BrowserBookmarkActions {
  setBrowserBookmarksRootId: (rootId: string | null) => void;
  setHomeBrowserFolderId: (folderId: string | null) => void;
  setIsApplyingBrowserBookmarks: (isApplying: boolean) => void;
  setBrowserBookmarkWriteLockUntil: (until: number) => void;
  replaceBrowserBookmarkGridItems: (items: GridItem[], options?: { groupIds?: string[] }) => void;
  upsertBrowserBookmarkNode: (node: {
    id: string;
    parentId?: string;
    title?: string;
    url?: string;
    index?: number;
  }) => void;
  removeBrowserBookmarkById: (bookmarkId: string) => void;
  applyBrowserBookmarkChildrenOrder: (
    parentBookmarkId: string,
    orderedChildBookmarkIds: string[]
  ) => void;
  setGroupBookmarkFolderId: (groupId: string, folderId: string | null) => void;
}

export function createBrowserBookmarkActions(
  set: (partial: Partial<NewTabState> | ((state: NewTabState) => Partial<NewTabState>)) => void,
  get: () => NewTabState,
  inferGroupIdFromBookmarkParent: (parentBookmarkId?: string) => string,
  isRootContainerBookmarkId: (bookmarkId?: string | null) => boolean
): BrowserBookmarkActions {
  return {
    setBrowserBookmarksRootId: (rootId) => {
      set((state) => ({
        browserBookmarksRootId: rootId,
        homeBrowserFolderId: rootId ? state.homeBrowserFolderId : null,
      }));
    },

    setHomeBrowserFolderId: (folderId) => {
      set({ homeBrowserFolderId: folderId });
    },

    setGroupBookmarkFolderId: (groupId, folderId) => {
      const { shortcutGroups, gridItems, saveData } = get();
      const nextGroups = shortcutGroups.map((group) =>
        group.id === groupId ? { ...group, bookmarkFolderId: folderId ?? undefined } : group
      );
      set({ shortcutGroups: nextGroups });
      saveData();
      debouncedSync({ groups: nextGroups, gridItems });
    },

    setIsApplyingBrowserBookmarks: (isApplying) => {
      set({ isApplyingBrowserBookmarks: isApplying });
    },

    setBrowserBookmarkWriteLockUntil: (until) => {
      set({ browserBookmarkWriteLockUntil: until });
    },

    replaceBrowserBookmarkGridItems: (items, options) => {
      const { gridItems, saveData } = get();
      const inferredGroups = Array.from(new Set(items.map((item) => (item.groupId ?? 'home') as string)));
      const targetGroupIds = new Set(
        options?.groupIds && options.groupIds.length > 0 ? options.groupIds : inferredGroups
      );
      const preserved = gridItems.filter((item) => {
        if (!item.browserBookmarkId) return true;
        if (targetGroupIds.size === 0) return false;
        const groupId = item.groupId ?? 'home';
        return !targetGroupIds.has(groupId);
      });
      const normalized = items.map((item) => ({
        ...item,
        parentId: item.parentId ?? null,
        groupId: item.groupId ?? 'home',
      }));
      const next = [...preserved, ...normalized];
      set({ gridItems: next });
      saveData();

      // 清理空分组
      get().cleanupEmptyGroups();
    },

    upsertBrowserBookmarkNode: (node) => {
      const { gridItems, saveData, browserBookmarksRootId } = get();
      if (!browserBookmarksRootId) return;

      const gridId = `bb-${node.id}`;
      const existing = gridItems.find((i) => i.id === gridId);

      const parentBookmarkId = node.parentId;
      const groupId = inferGroupIdFromBookmarkParent(parentBookmarkId);
      let parentId: string | undefined;
      if (parentBookmarkId) {
        if (isRootContainerBookmarkId(parentBookmarkId)) {
          parentId = null as unknown as undefined;
        } else if (parentBookmarkId === browserBookmarksRootId) {
          parentId = undefined;
        } else {
          parentId = `bb-${parentBookmarkId}`;
        }
      }

      const position = typeof node.index === 'number' ? node.index : existing?.position ?? 0;

      const nextItem: GridItem = {
        id: gridId,
        type: node.url ? 'shortcut' : 'bookmarkFolder',
        size: existing?.size ?? '1x1',
        position,
        groupId,
        parentId,
        browserBookmarkId: node.id,
        shortcut: node.url
          ? {
              url: node.url,
              title: node.title || node.url,
              favicon: existing?.shortcut?.favicon,
              faviconBase64: existing?.shortcut?.faviconBase64,
            }
          : undefined,
        bookmarkFolder: !node.url
          ? { title: node.title || existing?.bookmarkFolder?.title || '文件夹' }
          : undefined,
        config: existing?.config,
        createdAt: existing?.createdAt ?? Date.now(),
      };

      const preservedNonBrowser = gridItems.filter((i) => !i.browserBookmarkId);
      const preservedBrowserOthers = gridItems.filter((i) => i.browserBookmarkId && i.id !== gridId);
      const next = [...preservedNonBrowser, ...preservedBrowserOthers, nextItem];

      set({ gridItems: next });
      saveData();
    },

    removeBrowserBookmarkById: (bookmarkId) => {
      const { gridItems, currentFolderId, saveData, browserBookmarksRootId } = get();
      const targetGridId = `bb-${bookmarkId}`;
      const target = gridItems.find((i) => i.id === targetGridId);
      if (!target) return;

      let toDelete = new Set<string>([targetGridId]);
      if (target.type === 'bookmarkFolder') {
        let changed = true;
        while (changed) {
          changed = false;
          for (const item of gridItems) {
            const parentId = item.parentId;
            if (parentId && toDelete.has(parentId) && !toDelete.has(item.id)) {
              toDelete.add(item.id);
              changed = true;
            }
          }
        }
      }

      // 收集需要同步删除到 TMarks 的书签 ID
      const tmarksIdsToTrash: string[] = [];
      for (const item of gridItems) {
        if (toDelete.has(item.id) && item.tmarksBookmarkId) {
          tmarksIdsToTrash.push(item.tmarksBookmarkId);
        }
      }

      const filtered = gridItems.filter((item) => !toDelete.has(item.id));
      const nextCurrentFolderId = currentFolderId && toDelete.has(currentFolderId) ? null : currentFolderId;
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(filtered, nextCurrentFolderId, protectedBrowserBookmarkIds);
      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();

      // 异步同步删除到 TMarks 服务器（移入回收站）
      if (tmarksIdsToTrash.length > 0) {
        syncTrashBookmarksToTMarks(tmarksIdsToTrash).catch((error) => {
          console.error('[TMarks Sync] 同步删除失败:', error);
        });
      }

      // 清理空分组
      get().cleanupEmptyGroups();
    },

    applyBrowserBookmarkChildrenOrder: (_parentBookmarkId, orderedChildBookmarkIds) => {
      const { gridItems, saveData } = get();
      const positionMap = new Map<string, number>(
        orderedChildBookmarkIds.map((id, index) => [`bb-${id}`, index])
      );
      const newGridItems = gridItems.map((item) => {
        const nextPos = positionMap.get(item.id);
        return nextPos !== undefined ? { ...item, position: nextPos } : item;
      });
      set({ gridItems: newGridItems });
      saveData();
    },
  };
}
