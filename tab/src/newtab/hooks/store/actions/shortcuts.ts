/**
 * 快捷方式相关 Actions
 */

import type { Shortcut, ShortcutGroup, GridItem } from '../../../types';
import { generateId } from '../utils';
import { debouncedSync } from '../sync';

export interface ShortcutActions {
  addShortcut: (shortcut: Omit<Shortcut, 'id' | 'position' | 'createdAt' | 'clickCount'>) => void;
  updateShortcut: (id: string, updates: Partial<Shortcut>) => void;
  removeShortcut: (id: string) => void;
  reorderShortcuts: (fromIndex: number, toIndex: number) => void;
  incrementClickCount: (id: string) => void;
  getFilteredShortcuts: () => Shortcut[];
}

export function createShortcutActions(
  get: () => {
    shortcuts: Shortcut[];
    shortcutGroups: ShortcutGroup[];
    gridItems: GridItem[];
    activeGroupId: string | null;
    saveData: () => Promise<void>;
    updateShortcut: (id: string, updates: Partial<Shortcut>) => void;
  },
  set: (state: Partial<{ shortcuts: Shortcut[] }>) => void
): ShortcutActions {
  return {
    addShortcut: (shortcut) => {
      const { shortcuts, shortcutGroups, gridItems, saveData } = get();
      const newShortcut: Shortcut = {
        ...shortcut,
        id: generateId(),
        position: shortcuts.length,
        createdAt: Date.now(),
        clickCount: 0,
      };

      const newShortcuts = [...shortcuts, newShortcut];
      set({ shortcuts: newShortcuts });
      saveData();

      (async () => {
        try {
          const { downloadFavicon } = await import('../../../utils/favicon');
          const base64 = await downloadFavicon(newShortcut.url);
          if (base64) {
            const { updateShortcut } = get();
            updateShortcut(newShortcut.id, { faviconBase64: base64 });
          }
        } catch (error) {
          console.error('Failed to cache favicon:', error);
        }
      })();

      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    updateShortcut: (id, updates) => {
      const { shortcuts, shortcutGroups, gridItems, saveData } = get();
      const newShortcuts = shortcuts.map((s) => (s.id === id ? { ...s, ...updates } : s));
      set({ shortcuts: newShortcuts });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    removeShortcut: (id) => {
      const { shortcuts, shortcutGroups, gridItems, saveData } = get();
      const filtered = shortcuts.filter((s) => s.id !== id);
      const reordered = filtered.map((s, index) => ({ ...s, position: index }));
      set({ shortcuts: reordered });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    reorderShortcuts: (fromIndex, toIndex) => {
      const { shortcuts, shortcutGroups, gridItems, saveData } = get();
      const newShortcuts = [...shortcuts];
      const [removed] = newShortcuts.splice(fromIndex, 1);
      newShortcuts.splice(toIndex, 0, removed);
      const reordered = newShortcuts.map((s, index) => ({ ...s, position: index }));
      set({ shortcuts: reordered });
      saveData();
      debouncedSync({ groups: shortcutGroups, gridItems });
    },

    incrementClickCount: (id) => {
      const { shortcuts, saveData } = get();
      set({
        shortcuts: shortcuts.map((s) =>
          s.id === id ? { ...s, clickCount: s.clickCount + 1 } : s
        ),
      });
      saveData();
    },

    getFilteredShortcuts: () => {
      const { shortcuts, activeGroupId } = get();
      const targetGroupId = activeGroupId ?? 'home';
      return shortcuts.filter((s) => s.groupId === targetGroupId && !s.folderId);
    },
  };
}
