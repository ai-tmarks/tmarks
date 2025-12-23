/**
 * NewTab 状态管理
 * 
 * 使用拆分后的模块化 actions
 */

import { create } from 'zustand';
import type { NewTabStorage } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEY, DEFAULT_GROUPS } from '../constants';

import {
  type NewTabState,
  hasBookmarksApi,
  isHomeRootItem,
  getWritableRootBookmarkId,
  debouncedSync,
} from './store';

import { ensureHomeFolder } from '../features/browser-sync';

import { createShortcutActions } from './store/actions/shortcuts';
import { createGroupActions } from './store/actions/groups';
import { createFolderActions } from './store/actions/folders';
import { createGridItemActions } from './store/actions/grid-items';
import { createBrowserBookmarkActions } from './store/actions/browser-bookmarks';
import { createNavigationActions } from './store/actions/navigation';

export { ensureHomeFolder } from '../features/browser-sync';

export const useNewtabStore = create<NewTabState>((set, get) => {
  // ============================================
  // 内部辅助函数
  // ============================================
  
  const ensureHomeFolderId = async (): Promise<string | null> => {
    const state = get();
    if (!state.browserBookmarksRootId) return null;
    let homeFolderId = state.homeBrowserFolderId;
    if (homeFolderId) return homeFolderId;
    const ensured = await ensureHomeFolder(state.browserBookmarksRootId);
    if (!ensured) return null;
    homeFolderId = ensured.id;
    state.setHomeBrowserFolderId(homeFolderId);
    return homeFolderId;
  };

  const ensureGroupFolderId = async (
    groupId: string,
    options?: { createIfMissing?: boolean; bookmarkFolderIdOverride?: string | null }
  ): Promise<string | null> => {
    const state = get();
    if (!hasBookmarksApi()) return null;
    if (!state.browserBookmarksRootId) return null;
    if (groupId === 'home') {
      return ensureHomeFolderId();
    }

    const group = state.shortcutGroups.find((g) => g.id === groupId);
    if (!group) return null;

    const verifyFolder = async (folderId?: string): Promise<string | null> => {
      if (!folderId) return null;
      try {
        const nodes = await chrome.bookmarks.get(folderId);
        const node = nodes?.[0];
        if (node && !node.url) return folderId;
      } catch {}
      return null;
    };

    const existing = await verifyFolder(
      options?.bookmarkFolderIdOverride ?? group.bookmarkFolderId ?? undefined
    );
    if (existing) return existing;

    const rootId = state.browserBookmarksRootId;
    if (!rootId) return null;

    try {
      const children = await chrome.bookmarks.getChildren(rootId);
      const matched = children.find((c) => !c.url && c.title === group.name);
      if (matched) {
        state.setGroupBookmarkFolderId(groupId, matched.id);
        return matched.id;
      }
    } catch {}

    if (options?.createIfMissing) {
      try {
        state.setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
        const created = await chrome.bookmarks.create({
          parentId: rootId,
          title: group.name,
        });
        if (created?.id) {
          state.setGroupBookmarkFolderId(groupId, created.id);
          return created.id;
        }
      } catch (error) {
        console.warn('[NewTab] Failed to create bookmark folder for group:', group.name, error);
      }
    }
    return null;
  };

  const inferGroupIdFromBookmarkParent = (parentBookmarkId?: string): string => {
    const state = get();
    if (!parentBookmarkId) return 'home';
    if (parentBookmarkId === state.homeBrowserFolderId) return 'home';
    const matchedGroup = state.shortcutGroups.find((g) => g.bookmarkFolderId === parentBookmarkId);
    if (matchedGroup) return matchedGroup.id;
    const parentGrid = state.gridItems.find(
      (item) => item.browserBookmarkId === parentBookmarkId && item.type === 'bookmarkFolder'
    );
    return parentGrid?.groupId ?? 'home';
  };

  const isRootContainerBookmarkId = (bookmarkId?: string | null) => {
    if (!bookmarkId) return false;
    const state = get();
    if (bookmarkId === state.homeBrowserFolderId) return true;
    return state.shortcutGroups.some((group) => group.bookmarkFolderId === bookmarkId);
  };

  const resolveBookmarkParentId = async (opts: {
    parentGridId?: string | null;
    inferredGroupId?: string | null;
  }): Promise<string | null> => {
    const state = get();
    if (!state.browserBookmarksRootId) return null;

    if (opts.parentGridId) {
      const parentGrid = state.gridItems.find((i) => i.id === opts.parentGridId);
      if (parentGrid?.browserBookmarkId) return parentGrid.browserBookmarkId;
    }

    const groupId = opts.inferredGroupId ?? state.activeGroupId ?? 'home';
    if ((opts.parentGridId ?? null) === null) {
      if (groupId === 'home') {
        const homeId = await ensureHomeFolderId();
        if (homeId) return homeId;
      } else {
        const groupFolderId = await ensureGroupFolderId(groupId);
        if (groupFolderId) return groupFolderId;
      }
    }

    if (groupId === 'home') {
      const homeId = await ensureHomeFolderId();
      if (homeId) return homeId;
    } else {
      const groupFolderId = await ensureGroupFolderId(groupId);
      if (groupFolderId) return groupFolderId;
    }

    const writable = await getWritableRootBookmarkId(state.browserBookmarksRootId);
    return writable ?? state.browserBookmarksRootId;
  };

  const mirrorHomeItemToBrowser = async (itemId: string) => {
    const state = get();
    if (!hasBookmarksApi()) return;
    if (!state.browserBookmarksRootId) return;
    const item = state.gridItems.find((i) => i.id === itemId);
    if (!item) return;
    if (item.browserBookmarkId) return;
    if (!isHomeRootItem(item)) return;
    if (item.type === 'shortcut' && !item.shortcut?.url) return;

    const parentBookmarkId = await ensureHomeFolderId();
    if (!parentBookmarkId) return;

    state.setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
    try {
      let created: chrome.bookmarks.BookmarkTreeNode | undefined;
      if (item.type === 'bookmarkFolder') {
        created = await chrome.bookmarks.create({
          parentId: parentBookmarkId,
          title: item.bookmarkFolder?.title || '文件夹',
        });
      } else if (item.type === 'shortcut') {
        created = await chrome.bookmarks.create({
          parentId: parentBookmarkId,
          title: item.shortcut?.title || item.shortcut?.url || '快捷方式',
          url: item.shortcut?.url,
        });
      }

      if (!created?.id) return;

      set({
        gridItems: get().gridItems.map((gridItem) =>
          gridItem.id === item.id ? { ...gridItem, browserBookmarkId: created!.id } : gridItem
        ),
      });
      state.saveData();
    } catch (e) {
      console.warn('[NewTab] Failed to mirror home item to browser:', e);
    }
  };

  // ============================================
  // 创建模块化 Actions
  // ============================================
  
  const shortcutActions = createShortcutActions(get as any, set as any);
  const groupActions = createGroupActions(get as any, set as any, ensureGroupFolderId);
  const folderActions = createFolderActions(get as any, set as any);
  const gridItemActions = createGridItemActions(set as any, get as any, resolveBookmarkParentId);
  const browserBookmarkActions = createBrowserBookmarkActions(
    set as any,
    get as any,
    inferGroupIdFromBookmarkParent,
    isRootContainerBookmarkId
  );
  const navigationActions = createNavigationActions(set as any, get as any, resolveBookmarkParentId);

  // ============================================
  // Store 返回值
  // ============================================
  
  return {
    // 初始状态
    shortcuts: [],
    shortcutGroups: DEFAULT_GROUPS,
    shortcutFolders: [],
    activeGroupId: 'home',
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    gridItems: [],
    currentFolderId: null,
    browserBookmarksRootId: null,
    homeBrowserFolderId: null,
    isApplyingBrowserBookmarks: false,
    browserBookmarkWriteLockUntil: 0,

    // 数据加载/保存
    loadData: async () => {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const data = result[STORAGE_KEY] as NewTabStorage | undefined;

        const groups = data?.shortcutGroups?.length ? data.shortcutGroups : DEFAULT_GROUPS;

        let activeGroupId = data?.activeGroupId;
        if (!activeGroupId || !groups.some((g) => g.id === activeGroupId)) {
          activeGroupId = groups[0]?.id || 'home';
        }

        const settings = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };

        set({
          shortcuts: data?.shortcuts || [],
          shortcutGroups: groups,
          shortcutFolders: data?.shortcutFolders || [],
          activeGroupId,
          settings,
          gridItems: data?.gridItems || [],
          currentFolderId: null,
          browserBookmarksRootId: null,
          homeBrowserFolderId: null,
          isApplyingBrowserBookmarks: false,
          browserBookmarkWriteLockUntil: 0,
          isLoading: false,
        });

        if (!data) {
          const { saveData } = get();
          saveData();
        }
      } catch (error) {
        console.error('Failed to load newtab data:', error);
        set({ isLoading: false });
      }
    },

    saveData: async () => {
      const { shortcuts, shortcutGroups, shortcutFolders, activeGroupId, settings, gridItems } = get();
      const data: NewTabStorage = { shortcuts, shortcutGroups, shortcutFolders, activeGroupId, settings, gridItems };

      try {
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
      } catch (error) {
        console.error('Failed to save newtab data:', error);
      }
    },

    // 设置操作
    updateSettings: (updates) => {
      const { shortcutGroups, settings, gridItems, saveData } = get();
      const newSettings = { ...settings, ...updates };
      set({ settings: newSettings });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    // 快捷方式 Actions
    ...shortcutActions,

    // 分组 Actions
    ...groupActions,
    ensureGroupBookmarkFolderId: ensureGroupFolderId,

    // 文件夹 Actions
    ...folderActions,

    // Grid Items Actions
    ...gridItemActions,

    // Browser Bookmarks Actions
    ...browserBookmarkActions,

    // 导航 Actions
    ...navigationActions,

    // Mirror home items
    mirrorHomeItemsToBrowser: (ids) => {
      for (const id of ids) {
        mirrorHomeItemToBrowser(id);
      }
    },
  };
});
