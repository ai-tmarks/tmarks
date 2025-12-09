/**
 * TMarks API - 标签模块
 * 所有标签相关的 API 操作
 */

import { TMarksClient } from './client';
import type {
  GetTagsResponse,
  CreateTagInput,
  CreateTagResponse,
  GetTagResponse,
  UpdateTagInput,
  TMarksTag,
} from './types';

export class TagsAPI extends TMarksClient {
  /**
   * 获取标签列表
   * GET /api/tab/tags
   */
  async getTags(): Promise<GetTagsResponse> {
    return this.get<GetTagsResponse>('/tab/tags');
  }

  /**
   * 创建单个标签
   * POST /api/tab/tags
   */
  async createTag(input: CreateTagInput): Promise<CreateTagResponse> {
    return this.post<CreateTagResponse>('/tab/tags', input);
  }

  /**
   * 获取单个标签
   * GET /api/tab/tags/:id
   */
  async getTag(id: string): Promise<GetTagResponse> {
    return this.get<GetTagResponse>(`/tab/tags/${id}`);
  }

  /**
   * 更新单个标签
   * PATCH /api/tab/tags/:id
   */
  async updateTag(id: string, input: UpdateTagInput): Promise<CreateTagResponse> {
    return this.patch<CreateTagResponse>(`/tab/tags/${id}`, input);
  }

  /**
   * 删除单个标签
   * DELETE /api/tab/tags/:id
   */
  async deleteTag(id: string): Promise<void> {
    return this.delete<void>(`/tab/tags/${id}`);
  }

  
  // ============ 辅助方法 ============

  /**
   * 根据名称查找标签
   */
  async findTagByName(name: string): Promise<TMarksTag | null> {
    const response = await this.getTags();
    const tag = response.data.tags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    return tag || null;
  }

  /**
   * 创建标签（如果不存在）
   */
  async createTagIfNotExists(input: CreateTagInput): Promise<CreateTagResponse> {
    try {
      return await this.createTag(input);
    } catch (error: any) {
      // 如果标签已存在，返回现有标签
      if (error.code === 'DUPLICATE_TAG') {
        const existingTag = await this.findTagByName(input.name);
        if (existingTag) {
          return {
            data: { tag: existingTag },
          };
        }
      }
      throw error;
    }
  }

  
  /**
   * 获取标签使用统计（按书签数量排序）
   */
  async getTagsByPopularity(): Promise<TMarksTag[]> {
    const response = await this.getTags();
    return response.data.tags.sort(
      (a, b) => (b.bookmark_count || 0) - (a.bookmark_count || 0)
    );
  }

  /**
   * 获取未使用的标签
   */
  async getUnusedTags(): Promise<TMarksTag[]> {
    const response = await this.getTags();
    return response.data.tags.filter((tag) => (tag.bookmark_count || 0) === 0);
  }

  /**
   * 批量删除未使用的标签
   */
  async deleteUnusedTags(): Promise<{ deleted: number }> {
    const unusedTags = await this.getUnusedTags();
    let deleted = 0;

    for (const tag of unusedTags) {
      try {
        await this.deleteTag(tag.id);
        deleted++;
      } catch (error) {
        // Silently handle error
      }
    }

    return { deleted };
  }

  /**
   * 合并标签（将 sourceId 的所有书签移到 targetId，然后删除 sourceId）
   * 注意：这需要配合书签 API 使用
   */
  async prepareMergeTags(sourceId: string, targetId: string): Promise<{
    sourceTag: TMarksTag;
    targetTag: TMarksTag;
  }> {
    const [sourceResponse, targetResponse] = await Promise.all([
      this.getTag(sourceId),
      this.getTag(targetId),
    ]);

    return {
      sourceTag: sourceResponse.data.tag,
      targetTag: targetResponse.data.tag,
    };
  }
}
