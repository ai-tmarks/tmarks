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
    return this.updateBookmark(id, { is_pinned: true });
  }

  /**
   * 取消置顶书签
   */
  async unpinBookmark(id: string): Promise<CreateBookmarkResponse> {
    return this.updateBookmark(id, { is_pinned: false });
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
}
