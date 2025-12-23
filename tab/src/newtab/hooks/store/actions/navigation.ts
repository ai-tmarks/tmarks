/**
 * 导航相关 Actions（文件夹导航、重排序等）
 */

import type { NewTabState } from '../types';
import type { GridItem } from '../../../types';
import { MAX_FOLDER_DEPTH, pruneEmptySecondLevelFolders, pruneEmptyFoldersCascade, generateId } from '../utils';
import { debouncedSync } from '../sync';

export interface NavigationActions {
  setCurrentFolderId: (folderId: string | null) => void;
  moveGridItemToFolder: (id: string, folderId: string | null) => void;
  reorderGridItemsInCurrentScope: (activeId: string, overId: string) => void;
  reorderGridItemsInFolderScope: (folderId: string, activeId: string, overId: string) => void;
  mergeFolders: (sourceFolderId: string, targetFolderId: string) => void;
  createFolderFromShortcuts: (shortcutId1: string, shortcutId2: string, folderName?: string) => string | null;
  cleanupEmptySecondLevelFolders: () => void;
  cleanupAllEmptyFolders: () => void;
  migrateToGridItems: () => void;
}

export function createNavigationActions(
  set: (partial: Partial<NewTabState> | ((state: NewTabState) => Partial<NewTabState>)) => void,
  get: () => NewTabState,
  resolveBookmarkParentId: (opts: {
    parentGridId?: string | null;
    inferredGroupId?: string | null;
  }) => Promise<string | null>
): NavigationActions {
  return {
    setCurrentFolderId: (folderId) => {
      set({ currentFolderId: folderId });
    },

    moveGridItemToFolder: (id, folderId) => {
      const { shortcutGroups, gridItems, saveData, browserBookmarksRootId } = get();
      const moving = gridItems.find((i) => i.id === id);
      if (!moving) return;

      const getDepth = (parentId: string | null): number => {
        if (!parentId) return 0;
        const parent = gridItems.find((i) => i.id === parentId);
        if (!parent) return 0;
        return 1 + getDepth(parent.parentId ?? null);
      };

      const targetDepth = getDepth(folderId);

      const getMaxChildDepth = (itemId: string): number => {
        const children = gridItems.filter((i) => i.parentId === itemId);
        if (children.length === 0) return 0;
        return 1 + Math.max(...children.map((c) => getMaxChildDepth(c.id)));
      };

      const movingMaxChildDepth = moving.type === 'bookmarkFolder' ? getMaxChildDepth(moving.id) : 0;
      const totalDepth = targetDepth + 1 + movingMaxChildDepth;

      if (totalDepth > MAX_FOLDER_DEPTH) {
        console.warn(`[NewTab] 文件夹层级超出限制 (${totalDepth} > ${MAX_FOLDER_DEPTH})`);
        return;
      }

      const targetParentId = folderId ?? null;
      const isBrowserSynced = !!moving.browserBookmarkId;
      const inferredGroupId = (() => {
        if (isBrowserSynced) return moving.groupId ?? 'home';
        const activeGroupId = get().activeGroupId ?? 'home';
        const targetFolder = folderId ? gridItems.find((i) => i.id === folderId) : null;
        const sourceFolder = moving.parentId ? gridItems.find((i) => i.id === moving.parentId) : null;
        return (targetFolder?.groupId ?? sourceFolder?.groupId ?? moving.groupId ?? activeGroupId) as string;
      })();

      const targetScope = gridItems
        .filter((item) => {
          if (item.id === id) return false;
          if ((item.parentId ?? null) !== targetParentId) return false;
          if (isBrowserSynced) return !!item.browserBookmarkId;
          return !item.browserBookmarkId && (item.groupId ?? 'home') === inferredGroupId;
        })
        .sort((a, b) => a.position - b.position);

      const nextPosition = targetScope.length;

      const newGridItems = gridItems.map((item) => {
        if (item.id !== id) return item;
        return { ...item, groupId: inferredGroupId, parentId: targetParentId ?? undefined, position: nextPosition };
      });
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(newGridItems, get().currentFolderId, protectedBrowserBookmarkIds);
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

      if (!isBrowserSynced && inferredGroupId === 'home' && targetParentId === null) {
        get().mirrorHomeItemsToBrowser([id]);
      }

      get().cleanupEmptyGroups();

      const state2 = get();
      if (!state2.isApplyingBrowserBookmarks && moving.browserBookmarkId) {
        (async () => {
          try {
            const targetParentBookmarkId = await resolveBookmarkParentId({
              parentGridId: folderId,
              inferredGroupId,
            });
            if (!targetParentBookmarkId) return;

            state2.setBrowserBookmarkWriteLockUntil(Date.now() + 800);
            await chrome.bookmarks.move(moving.browserBookmarkId!, {
              parentId: targetParentBookmarkId,
              index: nextPosition,
            });
          } catch (e) {
            console.warn('[NewTab] Failed to move browser bookmark:', e);
          }
        })();
      }
    },

    reorderGridItemsInCurrentScope: (activeId, overId) => {
      const { shortcutGroups, gridItems, activeGroupId, currentFolderId, saveData } = get();
      const targetGroupId = activeGroupId ?? 'home';
      const scopeItems = gridItems
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === (currentFolderId ?? null))
        .sort((a, b) => a.position - b.position);

      const fromIndex = scopeItems.findIndex((i) => i.id === activeId);
      const toIndex = scopeItems.findIndex((i) => i.id === overId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reorderedScope = [...scopeItems];
      const [removed] = reorderedScope.splice(fromIndex, 1);
      reorderedScope.splice(toIndex, 0, removed);

      const positionById = new Map(reorderedScope.map((item, index) => [item.id, index] as const));
      const newGridItems = gridItems.map((item) => {
        const nextPos = positionById.get(item.id);
        return nextPos === undefined ? item : { ...item, position: nextPos };
      });

      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: newGridItems });

      const state = get();
      const activeItem = scopeItems[fromIndex];
      if (!state.isApplyingBrowserBookmarks && activeItem?.browserBookmarkId) {
        (async () => {
          try {
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: state.currentFolderId,
              inferredGroupId: targetGroupId,
            });
            if (!parentBookmarkId) return;

            state.setBrowserBookmarkWriteLockUntil(Date.now() + 800);
            await chrome.bookmarks.move(activeItem.browserBookmarkId!, {
              parentId: parentBookmarkId,
              index: toIndex,
            });
          } catch (e) {
            console.warn('[NewTab] Failed to reorder browser bookmark:', e);
          }
        })();
      }
    },

    reorderGridItemsInFolderScope: (folderId, activeId, overId) => {
      const { shortcutGroups, gridItems, saveData } = get();
      const folder = gridItems.find((i) => i.id === folderId);
      if (!folder) return;

      const targetGroupId = folder.groupId ?? 'home';
      const scopeItems = gridItems
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === folderId)
        .sort((a, b) => a.position - b.position);

      const fromIndex = scopeItems.findIndex((i) => i.id === activeId);
      const toIndex = scopeItems.findIndex((i) => i.id === overId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reorderedScope = [...scopeItems];
      const [removed] = reorderedScope.splice(fromIndex, 1);
      reorderedScope.splice(toIndex, 0, removed);

      const positionById = new Map(reorderedScope.map((item, index) => [item.id, index] as const));
      const newGridItems = gridItems.map((item) => {
        const nextPos = positionById.get(item.id);
        return nextPos === undefined ? item : { ...item, position: nextPos };
      });

      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: newGridItems });

      const state = get();
      const activeItem = scopeItems[fromIndex];
      if (!state.isApplyingBrowserBookmarks && activeItem?.browserBookmarkId) {
        (async () => {
          try {
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: folderId,
              inferredGroupId: state.gridItems.find((i) => i.id === folderId)?.groupId ?? null,
            });
            if (!parentBookmarkId) return;

            state.setBrowserBookmarkWriteLockUntil(Date.now() + 800);
            await chrome.bookmarks.move(activeItem.browserBookmarkId!, {
              parentId: parentBookmarkId,
              index: toIndex,
            });
          } catch (e) {
            console.warn('[NewTab] Failed to reorder browser bookmark:', e);
          }
        })();
      }
    },

    mergeFolders: (sourceFolderId, targetFolderId) => {
      const { shortcutGroups, gridItems, saveData, browserBookmarksRootId } = get();

      const sourceFolder = gridItems.find((i) => i.id === sourceFolderId && i.type === 'bookmarkFolder');
      const targetFolder = gridItems.find((i) => i.id === targetFolderId && i.type === 'bookmarkFolder');

      if (!sourceFolder || !targetFolder) {
        console.warn('[NewTab] mergeFolders: 源文件夹或目标文件夹不存在');
        return;
      }

      if (sourceFolderId === targetFolderId) return;

      const sourceChildren = gridItems
        .filter((item) => (item.parentId ?? null) === sourceFolderId)
        .sort((a, b) => a.position - b.position);

      const targetChildren = gridItems
        .filter((item) => (item.parentId ?? null) === targetFolderId)
        .sort((a, b) => a.position - b.position);

      const basePosition = targetChildren.length;

      let newGridItems = gridItems.map((item) => {
        if ((item.parentId ?? null) === sourceFolderId) {
          const newPosition = basePosition + sourceChildren.findIndex((c) => c.id === item.id);
          return {
            ...item,
            parentId: targetFolderId,
            groupId: targetFolder.groupId ?? 'home',
            position: newPosition,
          };
        }
        return item;
      });

      newGridItems = newGridItems.filter((item) => item.id !== sourceFolderId);

      const mergedChildren = newGridItems
        .filter((item) => (item.parentId ?? null) === targetFolderId)
        .sort((a, b) => a.position - b.position);

      const posById = new Map(mergedChildren.map((item, index) => [item.id, index] as const));
      newGridItems = newGridItems.map((item) => {
        const nextPos = posById.get(item.id);
        return nextPos !== undefined ? { ...item, position: nextPos } : item;
      });

      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(newGridItems, get().currentFolderId, protectedBrowserBookmarkIds);

      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: cleaned.items });

      const state = get();
      if (!state.isApplyingBrowserBookmarks) {
        (async () => {
          try {
            if (targetFolder.browserBookmarkId) {
              state.setBrowserBookmarkWriteLockUntil(Date.now() + 2000);

              for (let i = 0; i < sourceChildren.length; i++) {
                const child = sourceChildren[i];
                if (child.browserBookmarkId) {
                  try {
                    await chrome.bookmarks.move(child.browserBookmarkId, {
                      parentId: targetFolder.browserBookmarkId,
                      index: basePosition + i,
                    });
                  } catch (e) {
                    console.warn('[NewTab] Failed to move bookmark during merge:', e);
                  }
                }
              }
            }

            if (sourceFolder.browserBookmarkId) {
              try {
                await chrome.bookmarks.removeTree(sourceFolder.browserBookmarkId);
              } catch {
                try {
                  await chrome.bookmarks.remove(sourceFolder.browserBookmarkId);
                } catch {}
              }
            }

            if (cleaned.removedBrowserBookmarkIds.length > 0) {
              for (const bid of cleaned.removedBrowserBookmarkIds) {
                try {
                  await chrome.bookmarks.removeTree(bid);
                } catch {
                  try {
                    await chrome.bookmarks.remove(bid);
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.warn('[NewTab] Failed to sync browser bookmarks during merge:', e);
          }
        })();
      }

      get().cleanupEmptyGroups();
    },

    createFolderFromShortcuts: (shortcutId1, shortcutId2, folderName) => {
      const { shortcutGroups, gridItems, saveData } = get();

      const item1 = gridItems.find((i) => i.id === shortcutId1);
      const item2 = gridItems.find((i) => i.id === shortcutId2);

      if (!item1 || !item2) {
        console.warn('[NewTab] createFolderFromShortcuts: 快捷方式不存在');
        return null;
      }

      if (item1.type !== 'shortcut' || item2.type !== 'shortcut') {
        console.warn('[NewTab] createFolderFromShortcuts: 只能合并快捷方式类型');
        return null;
      }

      if (shortcutId1 === shortcutId2) return null;

      const targetGroupId = item2.groupId ?? 'home';
      const targetParentId = item2.parentId ?? null;
      const targetPosition = item2.position;

      const defaultFolderName = folderName || '新文件夹';
      const folderId = generateId();

      const newFolder: GridItem = {
        id: folderId,
        type: 'bookmarkFolder',
        size: '1x1',
        position: targetPosition,
        groupId: targetGroupId,
        parentId: targetParentId ?? undefined,
        bookmarkFolder: {
          title: defaultFolderName,
        },
        createdAt: Date.now(),
      };

      let newGridItems = gridItems.map((item) => {
        if (item.id === shortcutId1) {
          return { ...item, parentId: folderId, groupId: targetGroupId, position: 0 };
        }
        if (item.id === shortcutId2) {
          return { ...item, parentId: folderId, groupId: targetGroupId, position: 1 };
        }
        return item;
      });

      newGridItems = [...newGridItems, newFolder];

      const scopeItems = newGridItems
        .filter((item) => 
          (item.groupId ?? 'home') === targetGroupId && 
          (item.parentId ?? null) === targetParentId &&
          item.id !== shortcutId1 &&
          item.id !== shortcutId2
        )
        .sort((a, b) => a.position - b.position);

      const posById = new Map<string, number>();
      scopeItems.forEach((item, index) => {
        if (item.id === folderId) {
          posById.set(item.id, targetPosition);
        } else if (item.position >= targetPosition) {
          posById.set(item.id, index);
        } else {
          posById.set(item.id, item.position);
        }
      });

      const reorderedScopeItems = scopeItems.sort((a, b) => {
        const posA = posById.get(a.id) ?? a.position;
        const posB = posById.get(b.id) ?? b.position;
        return posA - posB;
      });

      reorderedScopeItems.forEach((item, index) => {
        posById.set(item.id, index);
      });

      newGridItems = newGridItems.map((item) => {
        const nextPos = posById.get(item.id);
        return nextPos !== undefined ? { ...item, position: nextPos } : item;
      });

      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: newGridItems });

      const state = get();
      if (!state.isApplyingBrowserBookmarks) {
        (async () => {
          try {
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: targetParentId,
              inferredGroupId: targetGroupId,
            });

            if (parentBookmarkId) {
              state.setBrowserBookmarkWriteLockUntil(Date.now() + 2000);

              const createdFolder = await chrome.bookmarks.create({
                parentId: parentBookmarkId,
                title: defaultFolderName,
                index: targetPosition,
              });

              set({
                gridItems: get().gridItems.map((i) =>
                  i.id === folderId ? { ...i, browserBookmarkId: createdFolder.id } : i
                ),
              });
              state.saveData();

              if (item1.browserBookmarkId) {
                try {
                  await chrome.bookmarks.move(item1.browserBookmarkId, {
                    parentId: createdFolder.id,
                    index: 0,
                  });
                } catch (e) {
                  console.warn('[NewTab] Failed to move bookmark 1:', e);
                }
              }

              if (item2.browserBookmarkId) {
                try {
                  await chrome.bookmarks.move(item2.browserBookmarkId, {
                    parentId: createdFolder.id,
                    index: 1,
                  });
                } catch (e) {
                  console.warn('[NewTab] Failed to move bookmark 2:', e);
                }
              }
            }
          } catch (e) {
            console.warn('[NewTab] Failed to create browser bookmark folder:', e);
          }
        })();
      }

      return folderId;
    },

    cleanupEmptySecondLevelFolders: () => {
      const { gridItems, currentFolderId, shortcutGroups, saveData } = get();
      const { items, currentFolderId: nextFolderId, changed } = pruneEmptySecondLevelFolders(gridItems, currentFolderId);
      if (!changed) return;

      set({ gridItems: items, currentFolderId: nextFolderId });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems: items });

      get().cleanupEmptyGroups();
    },

    cleanupAllEmptyFolders: () => {
      const { gridItems, currentFolderId, shortcutGroups, saveData, browserBookmarksRootId } = get();
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(gridItems, currentFolderId, protectedBrowserBookmarkIds);
      if (!cleaned.changed) return;

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

    migrateToGridItems: () => {
      // Migration logic if needed
    },
  };
}
