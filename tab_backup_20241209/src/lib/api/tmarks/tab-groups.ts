/**
 * TMarks API - 标签页组模块
 * 所有标签页组相关的 API 操作
 */

import { TMarksClient } from './client';

// ============ Request/Response Types ============

export interface TMarksTabGroup {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  items?: TMarksTabGroupItem[];
  item_count?: number;
}

export interface TMarksTabGroupItem {
  id: string;
  group_id: string;
  title: string;
  url: string;
  favicon: string | null;
  position: number;
  created_at: string;
}

export interface CreateTabGroupInput {
  title?: string;
  items: Array<{
    title: string;
    url: string;
    favicon?: string;
  }>;
}

export interface UpdateTabGroupInput {
  title?: string;
}

export interface GetTabGroupsParams {
  page_size?: number;
  page_cursor?: string;
}

export interface GetTabGroupsResponse {
  data: {
    tab_groups: TMarksTabGroup[];
    meta: {
      page_size: number;
      count: number;
      next_cursor: string | null;
      has_more: boolean;
    };
  };
}

export interface CreateTabGroupResponse {
  data: {
    tab_group: TMarksTabGroup;
  };
}

export interface GetTabGroupResponse {
  data: {
    tab_group: TMarksTabGroup;
  };
}

// ============ API Client ============

export class TabGroupsAPI extends TMarksClient {
  /**
   * 获取标签页组列表
   * GET /api/tab/tab-groups
   */
  async getTabGroups(params?: GetTabGroupsParams): Promise<GetTabGroupsResponse> {
    return this.get<GetTabGroupsResponse>('/tab/tab-groups', params);
  }

  /**
   * 创建标签页组
   * POST /api/tab/tab-groups
   */
  async createTabGroup(input: CreateTabGroupInput): Promise<CreateTabGroupResponse> {
    return this.post<CreateTabGroupResponse>('/tab/tab-groups', input);
  }

  /**
   * 获取单个标签页组
   * GET /api/tab/tab-groups/:id
   */
  async getTabGroup(id: string): Promise<GetTabGroupResponse> {
    return this.get<GetTabGroupResponse>(`/tab/tab-groups/${id}`);
  }

  /**
   * 更新标签页组
   * PATCH /api/tab/tab-groups/:id
   */
  async updateTabGroup(
    id: string,
    input: UpdateTabGroupInput
  ): Promise<CreateTabGroupResponse> {
    return this.patch<CreateTabGroupResponse>(`/tab/tab-groups/${id}`, input);
  }

  /**
   * 删除标签页组
   * DELETE /api/tab/tab-groups/:id
   */
  async deleteTabGroup(id: string): Promise<void> {
    return this.delete<void>(`/tab/tab-groups/${id}`);
  }

  // ============ 辅助方法 ============

  /**
   * 获取所有标签页组（自动分页）
   */
  async getAllTabGroups(params?: Omit<GetTabGroupsParams, 'page_cursor'>): Promise<TMarksTabGroup[]> {
    const allGroups: TMarksTabGroup[] = [];
    let cursor: string | null = null;

    do {
      const response = await this.getTabGroups({
        ...params,
        page_cursor: cursor || undefined,
        page_size: params?.page_size || 100,
      });

      allGroups.push(...response.data.tab_groups);
      cursor = response.data.meta.next_cursor;
    } while (cursor);

    return allGroups;
  }
}

