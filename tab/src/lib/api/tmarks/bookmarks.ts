/**
 * TMarks API - 书签模块
 * 所有书签相关的 API 操作
 */

import { TMarksClient } from './client';
import type {
  GetBookmarksParams,
  GetBookmarksResponse,
  CreateBookmarkInput,
  CreateBookmarkResponse,
  GetBookmarkResponse,
  UpdateBookmarkInput,
  TMarksBookmark,
} from './types';

export class BookmarksAPI extends TMarksClient {
  /**
   * 获取书签列表
   * GET /api/tab/bookmarks
   */
  async getBookmarks(params?: GetBookmarksParams): Promise<GetBookmarksResponse> {
    return this.get<GetBookmarksResponse>('/tab/bookmarks', params);
  }

  /**
   * 创建单个书签
   * POST /api/tab/bookmarks
   */
  async createBookmark(input: CreateBookmarkInput): Promise<CreateBookmarkResponse> {
    return this.post<CreateBookmarkResponse>('/tab/bookmarks', input);
  }

  /**
   * 获取单个书签
   * GET /api/tab/bookmarks/:id
   */
  async getBookmark(id: string): Promise<GetBookmarkResponse> {
    return this.get<GetBookmarkResponse>(`/tab/bookmarks/${id}`);
  }

  /**
   * 更新单个书签
   * PATCH /api/tab/bookmarks/:id
   */
  async updateBookmark(
    id: string,
    input: UpdateBookmarkInput
  ): Promise<CreateBookmarkResponse> {
    return this.patch<CreateBookmarkResponse>(`/tab/bookmarks/${id}`, input);
  }

  /**
   * 删除单个书签
   * DELETE /api/tab/bookmarks/:id
   */
  async deleteBookmark(id: string): Promise<void> {
    return this.delete<void>(`/tab/bookmarks/${id}`);
  }

  /**
   * 软删除书签（移入回收站）
   * PATCH /api/tab/bookmarks/:id/trash
   */
  async trashBookmark(id: string): Promise<void> {
    return this.patch<void>(`/tab/bookmarks/${id}/trash`, {});
  }

  /**
   * 从回收站恢复书签
   * PATCH /api/tab/bookmarks/:id/restore
   */
  async restoreBookmark(id: string): Promise<CreateBookmarkResponse> {
    return this.patch<CreateBookmarkResponse>(`/tab/bookmarks/${id}/restore`, {});
  }

  /**
   * 永久删除书签（从回收站彻底删除）
   * DELETE /api/tab/bookmarks/:id/permanent
   */
  async permanentDeleteBookmark(id: string): Promise<void> {
    return this.delete<void>(`/tab/bookmarks/${id}/permanent`);
  }

  /**
   * 获取回收站书签列表
   * GET /api/tab/bookmarks/trash
   */
  async getTrashBookmarks(params?: Omit<GetBookmarksParams, 'trashed'>): Promise<GetBookmarksResponse> {
    return this.get<GetBookmarksResponse>('/tab/bookmarks/trash', params);
  }

  /**
   * 清空回收站
   * DELETE /api/tab/bookmarks/trash/empty
   */
  async emptyTrash(): Promise<{ message: string; count: number }> {
    return this.delete<{ message: string; count: number }>('/tab/bookmarks/trash/empty');
  }

  
  // ============ 辅助方法 ============

  /**
   * 获取所有书签（自动分页）
   */
  async getAllBookmarks(params?: Omit<GetBookmarksParams, 'page_cursor'>): Promise<TMarksBookmark[]> {
    const allBookmarks: TMarksBookmark[] = [];
    let cursor: string | null = null;

    do {
      const response = await this.getBookmarks({
        ...params,
        page_cursor: cursor || undefined,
        page_size: params?.page_size || 100,
      });

      allBookmarks.push(...response.data.bookmarks);
      cursor = response.data.meta.next_cursor;
    } while (cursor);

    return allBookmarks;
  }

  /**
   * 按标签获取书签
   */
  async getBookmarksByTags(tagIds: string[], params?: Omit<GetBookmarksParams, 'tags'>): Promise<GetBookmarksResponse> {
    return this.getBookmarks({
      ...params,
      tags: tagIds.join(','),
    });
  }

  /**
   * 搜索书签
   */
  async searchBookmarks(keyword: string, params?: Omit<GetBookmarksParams, 'keyword'>): Promise<GetBookmarksResponse> {
    return this.getBookmarks({
      ...params,
      keyword,
    });
  }

  /**
   * 获取置顶书签
   */
  async getPinnedBookmarks(params?: Omit<GetBookmarksParams, 'pinned'>): Promise<GetBookmarksResponse> {
    return this.getBookmarks({
      ...params,
      pinned: true,
    });
  }

  /**
   * 获取已归档书签
   */
  async getArchivedBookmarks(params?: Omit<GetBookmarksParams, 'archived'>): Promise<GetBookmarksResponse> {
    return this.getBookmarks({
      ...params,
      archived: true,
    });
  }

  /**
   * 置顶书签
   */
  async pinBookmark(id: string): Promise<CreateBookmarkResponse> {
    const result = await this.updateBookmark(id, { is_pinned: true });
    // 通知 NewTab 页面刷新置顶书签
    this.notifyPinnedBookmarksChanged();
    return result;
  }

  /**
   * 取消置顶书签
   */
  async unpinBookmark(id: string): Promise<CreateBookmarkResponse> {
    const result = await this.updateBookmark(id, { is_pinned: false });
    // 通知 NewTab 页面刷新置顶书签
    this.notifyPinnedBookmarksChanged();
    return result;
  }

  /**
   * 通知 NewTab 页面刷新置顶书签
   */
  private notifyPinnedBookmarksChanged(): void {
    try {
      chrome.runtime.sendMessage({
        type: 'REFRESH_PINNED_BOOKMARKS',
        payload: { timestamp: Date.now() }
      }).catch(() => {
        // 忽略错误，可能在非扩展环境中
      });
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 归档书签
   */
  async archiveBookmark(id: string): Promise<CreateBookmarkResponse> {
    return this.updateBookmark(id, { is_archived: true });
  }

  /**
   * 取消归档书签
   */
  async unarchiveBookmark(id: string): Promise<CreateBookmarkResponse> {
    return this.updateBookmark(id, { is_archived: false });
  }

  /**
   * 批量更新置顶书签排序
   * POST /api/tab/bookmarks/reorder-pinned
   */
  async reorderPinnedBookmarks(bookmarkIds: string[]): Promise<{ message: string; count: number }> {
    return this.post<{ message: string; count: number }>('/tab/bookmarks/reorder-pinned', {
      bookmark_ids: bookmarkIds,
    });
  }

  /**
   * 记录书签点击
   * POST /api/tab/bookmarks/:id/click
   */
  async recordClick(id: string): Promise<{ message: string; clicked_at: string }> {
    return this.post<{ message: string; clicked_at: string }>(`/tab/bookmarks/${id}/click`, {});
  }
}
