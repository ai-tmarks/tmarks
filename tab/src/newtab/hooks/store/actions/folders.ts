/**
 * 文件夹相关 Actions
 */

import type { Shortcut, ShortcutGroup, ShortcutFolder, GridItem } from '../../../types';
import { generateId } from '../utils';
import { debouncedSync } from '../sync';

export interface FolderActions {
  addFolder: (name: string, groupId?: string) => string;
  updateFolder: (id: string, updates: Partial<ShortcutFolder>) => void;
  removeFolder: (id: string) => void;
  getFolderShortcuts: (folderId: string) => Shortcut[];
  moveShortcutToFolder: (shortcutId: string, folderId: string | undefined) => void;
}

export function createFolderActions(
  get: () => {
    shortcuts: Shortcut[];
    shortcutGroups: ShortcutGroup[];
    shortcutFolders: ShortcutFolder[];
    gridItems: GridItem[];
    activeGroupId: string | null;
    saveData: () => Promise<void>;
  },
  set: (state: Partial<{ shortcuts: Shortcut[]; shortcutFolders: ShortcutFolder[] }>) => void
): FolderActions {
  return {
    addFolder: (name, groupId) => {
      const { shortcutGroups, shortcutFolders, activeGroupId, gridItems, saveData } = get();
      const newFolder: ShortcutFolder = {
        id: generateId(),
        name,
        position: shortcutFolders.length,
        groupId: groupId ?? activeGroupId ?? undefined,
        createdAt: Date.now(),
      };
      const newFolders = [...shortcutFolders, newFolder];
      set({ shortcutFolders: newFolders });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
      return newFolder.id;
    },

    updateFolder: (id, updates) => {
      const { shortcutGroups, shortcutFolders, gridItems, saveData } = get();
      const newFolders = shortcutFolders.map((f) => (f.id === id ? { ...f, ...updates } : f));
      set({ shortcutFolders: newFolders });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    removeFolder: (id) => {
      const { shortcuts, shortcutGroups, shortcutFolders, gridItems, saveData } = get();
      const updatedShortcuts = shortcuts.map((s) =>
        s.folderId === id ? { ...s, folderId: undefined } : s
      );
      const filtered = shortcutFolders.filter((f) => f.id !== id);
      set({ shortcutFolders: filtered, shortcuts: updatedShortcuts });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    getFolderShortcuts: (folderId) => {
      const { shortcuts } = get();
      return shortcuts.filter((s) => s.folderId === folderId);
    },

    moveShortcutToFolder: (shortcutId, folderId) => {
      const { shortcuts, shortcutGroups, gridItems, saveData } = get();
      const newShortcuts = shortcuts.map((s) =>
        s.id === shortcutId ? { ...s, folderId } : s
      );
      set({ shortcuts: newShortcuts });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },
  };
}
