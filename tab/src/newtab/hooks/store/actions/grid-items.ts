/**
 * Grid Items 相关 Actions
 */

import type { GridItem, GridItemType, GridItemSize } from '../../../types';
import type { NewTabState } from '../types';
import { generateId, pruneEmptyFoldersCascade } from '../utils';
import { debouncedSync } from '../sync';
import { getWidgetMeta, getDefaultWidgetConfig } from '../../../components/widgets/widgetRegistry';
import { syncCreateBookmarkToTMarks } from '../../../services/tmarks-sync';

export interface GridItemActions {
  addGridItem: (
    type: GridItemType,
    options?: {
      size?: GridItemSize;
      groupId?: string;
      shortcut?: GridItem['shortcut'];
      bookmarkFolder?: GridItem['bookmarkFolder'];
      parentId?: string | null;
    }
  ) => void;
  updateGridItem: (id: string, updates: Partial<GridItem>) => void;
  removeGridItem: (id: string) => void;
  removeGridFolder: (id: string, mode: 'keep' | 'all') => void;
  reorderGridItems: (fromIndex: number, toIndex: number) => void;
  getFilteredGridItems: () => GridItem[];
}

export function createGridItemActions(
  set: (partial: Partial<NewTabState> | ((state: NewTabState) => Partial<NewTabState>)) => void,
  get: () => NewTabState,
  resolveBookmarkParentId: (opts: {
    parentGridId?: string | null;
    inferredGroupId?: string | null;
  }) => Promise<string | null>
): GridItemActions {
  return {
    addGridItem: (type, options = {}) => {
      const { shortcutGroups, gridItems, activeGroupId, currentFolderId, saveData } = get();
      const meta = getWidgetMeta(type);
      const defaultConfig = getDefaultWidgetConfig(type);

      const targetGroupId = options.groupId ?? activeGroupId ?? 'home';
      const targetParentId = (options.parentId ?? currentFolderId) ?? null;

      const scopeItems = gridItems.filter(
        (item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === targetParentId
      );
      const maxPosition = scopeItems.length > 0 ? Math.max(...scopeItems.map((i) => i.position)) : -1;

      const newItem: GridItem = {
        id: generateId(),
        type,
        size: options.size || meta.sizeConfig.defaultSize,
        position: maxPosition + 1,
        groupId: targetGroupId,
        parentId: targetParentId ?? undefined,
        shortcut: options.shortcut,
        bookmarkFolder: options.bookmarkFolder,
        config: type !== 'shortcut' ? defaultConfig : undefined,
        createdAt: Date.now(),
      };

      const newGridItems = [...gridItems, newItem];
      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: newGridItems });

      // 处理浏览器书签同步
      const { isApplyingBrowserBookmarks } = get();
      if (!isApplyingBrowserBookmarks && (type === 'shortcut' || type === 'bookmarkFolder')) {
        (async () => {
          try {
            const state = get();
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: newItem.parentId ?? null,
              inferredGroupId: newItem.groupId ?? null,
            });
            if (!parentBookmarkId) return;

            state.setBrowserBookmarkWriteLockUntil(Date.now() + 800);

            if (type === 'bookmarkFolder') {
              const created = await chrome.bookmarks.create({
                parentId: parentBookmarkId,
                title: newItem.bookmarkFolder?.title || '文件夹',
              });
              set({
                gridItems: get().gridItems.map((i) =>
                  i.id === newItem.id ? { ...i, browserBookmarkId: created.id } : i
                ),
              });
              state.saveData();
            }

            if (type === 'shortcut' && newItem.shortcut?.url) {
              const created = await chrome.bookmarks.create({
                parentId: parentBookmarkId,
                title: newItem.shortcut.title,
                url: newItem.shortcut.url,
              });
              set({
                gridItems: get().gridItems.map((i) =>
                  i.id === newItem.id ? { ...i, browserBookmarkId: created.id } : i
                ),
              });
              state.saveData();

              // 同步到 TMarks 服务器
              const itemWithBrowserId = { ...newItem, browserBookmarkId: created.id };
              syncCreateBookmarkToTMarks(itemWithBrowserId).then((result) => {
                if (result.success && result.tmarksBookmarkId) {
                  set({
                    gridItems: get().gridItems.map((i) =>
                      i.id === newItem.id ? { ...i, tmarksBookmarkId: result.tmarksBookmarkId } : i
                    ),
                  });
                  state.saveData();
                }
              }).catch((e) => {
                console.warn('[NewTab] Failed to sync to TMarks:', e);
              });
            }
          } catch (e) {
            console.warn('[NewTab] Failed to create browser bookmark:', e);
          }
        })();
      }

      // 下载 favicon
      if (type === 'shortcut' && options.shortcut?.url) {
        (async () => {
          try {
            const { downloadFavicon } = await import('../../../utils/favicon');
            const base64 = await downloadFavicon(options.shortcut!.url);
            if (base64) {
              const { updateGridItem } = get();
              updateGridItem(newItem.id, { shortcut: { ...options.shortcut!, faviconBase64: base64 } });
            }
          } catch (error) {
            console.error('Failed to cache favicon for grid item:', error);
          }
        })();
      }
    },

    updateGridItem: (id, updates) => {
      const { shortcutGroups, gridItems, saveData } = get();
      const newGridItems = gridItems.map((item) => (item.id === id ? { ...item, ...updates } : item));
      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: newGridItems });

      const { isApplyingBrowserBookmarks } = get();
      const target = gridItems.find((i) => i.id === id);
      if (!isApplyingBrowserBookmarks && target?.browserBookmarkId) {
        if (target.type === 'bookmarkFolder' && updates.bookmarkFolder?.title) {
          (async () => {
            try {
              get().setBrowserBookmarkWriteLockUntil(Date.now() + 800);
              await chrome.bookmarks.update(target.browserBookmarkId!, { title: updates.bookmarkFolder!.title });
            } catch (e) {
              console.warn('[NewTab] Failed to update browser folder:', e);
            }
          })();
        }

        if (target.type === 'shortcut' && updates.shortcut) {
          (async () => {
            try {
              get().setBrowserBookmarkWriteLockUntil(Date.now() + 800);
              await chrome.bookmarks.update(target.browserBookmarkId!, {
                title: updates.shortcut?.title,
                url: updates.shortcut?.url,
              });
            } catch (e) {
              console.warn('[NewTab] Failed to update browser bookmark:', e);
            }
          })();
        }
      }
    },

    removeGridItem: (id) => {
      const { shortcutGroups, gridItems, currentFolderId, saveData, browserBookmarksRootId } = get();
      const target = gridItems.find((i) => i.id === id);
      if (!target) return;

      let toDelete = new Set<string>([id]);
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

      const filtered = gridItems.filter((item) => !toDelete.has(item.id));
      const targetGroupId = target.groupId ?? 'home';
      const targetParentId = target.parentId ?? null;
      const siblings = filtered
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === targetParentId)
        .sort((a, b) => a.position - b.position);

      const siblingPosById = new Map(siblings.map((item, index) => [item.id, index] as const));
      const reordered = filtered.map((item) => {
        const nextPos = siblingPosById.get(item.id);
        return nextPos === undefined ? item : { ...item, position: nextPos };
      });

      const nextCurrentFolderId = currentFolderId && toDelete.has(currentFolderId) ? null : currentFolderId;
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(reordered, nextCurrentFolderId, protectedBrowserBookmarkIds);
      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: cleaned.items });

      const { isApplyingBrowserBookmarks } = get();
      if (!isApplyingBrowserBookmarks) {
        const bookmarkIdsToDelete: string[] = [];
        for (const item of gridItems) {
          if (toDelete.has(item.id) && item.browserBookmarkId) {
            bookmarkIdsToDelete.push(item.browserBookmarkId);
          }
        }

        if (bookmarkIdsToDelete.length > 0) {
          (async () => {
            try {
              get().setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
              for (const bid of bookmarkIdsToDelete) {
                try {
                  await chrome.bookmarks.removeTree(bid);
                } catch {
                  try {
                    await chrome.bookmarks.remove(bid);
                  } catch {}
                }
              }
            } catch (e) {
              console.warn('[NewTab] Failed to remove browser bookmark(s):', e);
            }
          })();
        }
      }

      get().cleanupEmptyGroups();
    },

    removeGridFolder: (id, mode) => {
      const { shortcutGroups, gridItems, currentFolderId, saveData } = get();
      const target = gridItems.find((i) => i.id === id);
      if (!target || target.type !== 'bookmarkFolder') return;

      if (mode === 'all') {
        get().removeGridItem(id);
        return;
      }

      const targetGroupId = target.groupId ?? 'home';
      const targetParentId = target.parentId ?? null;

      const foldersToFlatten = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of gridItems) {
          if (item.type === 'bookmarkFolder' && item.parentId && foldersToFlatten.has(item.parentId) && !foldersToFlatten.has(item.id)) {
            foldersToFlatten.add(item.id);
            changed = true;
          }
        }
      }

      const itemsToMove = gridItems
        .filter((item) => item.parentId && foldersToFlatten.has(item.parentId))
        .sort((a, b) => a.position - b.position);

      const filtered = gridItems.filter((item) => !foldersToFlatten.has(item.id));

      const existingSiblings = filtered
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === targetParentId)
        .sort((a, b) => a.position - b.position);

      const movedToParent = new Map(
        itemsToMove.map((item, index) => [
          item.id,
          { parentId: targetParentId ?? undefined, position: existingSiblings.length + index },
        ] as const)
      );

      const moved = filtered.map((item) => {
        const next = movedToParent.get(item.id);
        return next ? { ...item, parentId: next.parentId, position: next.position } : item;
      });

      const scopeItems = moved
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === targetParentId)
        .sort((a, b) => a.position - b.position);
      const posById = new Map(scopeItems.map((item, index) => [item.id, index] as const));
      const reordered = moved.map((item) => {
        const nextPos = posById.get(item.id);
        return nextPos === undefined ? item : { ...item, position: nextPos };
      });

      const nextCurrentFolderId = currentFolderId && foldersToFlatten.has(currentFolderId) ? null : currentFolderId;
      const protectedBrowserBookmarkIds = new Set<string>();
      const cleaned = pruneEmptyFoldersCascade(reordered, nextCurrentFolderId, protectedBrowserBookmarkIds);
      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: cleaned.items });

      const state = get();
      if (!state.isApplyingBrowserBookmarks && cleaned.removedBrowserBookmarkIds.length > 0) {
        (async () => {
          try {
            state.setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
            for (const bid of cleaned.removedBrowserBookmarkIds) {
              try {
                await chrome.bookmarks.removeTree(bid);
              } catch {
                try {
                  await chrome.bookmarks.remove(bid);
                } catch {}
              }
            }
          } catch {}
        })();
      }

      get().cleanupEmptyGroups();
    },

    reorderGridItems: (fromIndex, toIndex) => {
      const { shortcutGroups, gridItems, saveData } = get();
      const newGridItems = [...gridItems];
      const [removed] = newGridItems.splice(fromIndex, 1);
      newGridItems.splice(toIndex, 0, removed);
      const reordered = newGridItems.map((item, index) => ({ ...item, position: index }));
      set({ gridItems: reordered });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: reordered });
    },

    getFilteredGridItems: () => {
      const { gridItems, activeGroupId, currentFolderId } = get();
      const targetGroupId = activeGroupId ?? 'home';

      const currentFolderItem = currentFolderId ? gridItems.find((i) => i.id === currentFolderId) : null;
      const isBrowserFolderScope = !!currentFolderItem?.browserBookmarkId;

      if (!currentFolderId) {
        return gridItems
          .filter((item) => {
            const itemGroupId = item.groupId ?? 'home';
            const inGroup = itemGroupId === targetGroupId;
            const inFolder = (item.parentId ?? null) === null;
            return inGroup && inFolder;
          })
          .sort((a, b) => a.position - b.position);
      }

      if (isBrowserFolderScope) {
        return gridItems
          .filter((item) => {
            const inFolder = (item.parentId ?? null) === (currentFolderId ?? null);
            return !!item.browserBookmarkId && inFolder;
          })
          .sort((a, b) => a.position - b.position);
      }

      return gridItems
        .filter((item) => {
          const itemGroupId = item.groupId ?? 'home';
          const inGroup = itemGroupId === targetGroupId;
          const inFolder = (item.parentId ?? null) === (currentFolderId ?? null);
          return inGroup && inFolder;
        })
        .sort((a, b) => a.position - b.position);
    },
  };
}
