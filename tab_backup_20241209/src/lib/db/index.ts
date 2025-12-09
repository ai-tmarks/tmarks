import Dexie, { Table } from 'dexie';
import type { Tag, Bookmark, Metadata, TabGroup, TabGroupItem } from '@/types';

export class BookmarkDB extends Dexie {
  tags!: Table<Tag>;
  bookmarks!: Table<Bookmark>;
  metadata!: Table<Metadata>;
  tabGroups!: Table<TabGroup>;
  tabGroupItems!: Table<TabGroupItem>;

  constructor() {
    super('BookmarkDB');

    this.version(1).stores({
      tags: '++id, name, color, createdAt, count',
      bookmarks: '++id, url, title, createdAt, remoteId, isPublic, *tags',
      metadata: 'key, updatedAt'
    });

    // Version 2: Add tab groups support
    this.version(2).stores({
      tags: '++id, name, color, createdAt, count',
      bookmarks: '++id, url, title, createdAt, remoteId, isPublic, *tags',
      metadata: 'key, updatedAt',
      tabGroups: '++id, title, createdAt, remoteId',
      tabGroupItems: '++id, groupId, title, url, position, createdAt'
    });
  }

  // Helper methods
  async getLastSyncTime(): Promise<number> {
    const meta = await this.metadata.get('lastSync');
    return meta && typeof meta.value === 'number' ? meta.value : 0;
  }

  async updateLastSyncTime(timestamp: number): Promise<void> {
    await this.metadata.put({
      key: 'lastSync',
      value: timestamp,
      updatedAt: Date.now()
    });
  }

  async getStats(): Promise<{ tags: number; bookmarks: number; lastSync: number }> {
    const [tagsCount, bookmarksCount, lastSync] = await Promise.all([
      this.tags.count(),
      this.bookmarks.count(),
      this.getLastSyncTime()
    ]);

    return {
      tags: tagsCount,
      bookmarks: bookmarksCount,
      lastSync
    };
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.tags.clear(),
      this.bookmarks.clear(),
      this.metadata.clear(),
      this.tabGroups.clear(),
      this.tabGroupItems.clear()
    ]);
  }
}

// Create singleton instance
export const db = new BookmarkDB();
