/**
 * TMarks API - 用户和搜索模块
 * 用户信息和全局搜索功能
 */

import { TMarksClient } from './client';
import type {
  GetUserResponse,
  SearchParams,
  SearchResponse,
} from './types';

export class UserAPI extends TMarksClient {
  /**
   * 获取当前用户信息
   * GET /api/tab/me
   */
  async getMe(): Promise<GetUserResponse> {
    return this.get<GetUserResponse>('/tab/me');
  }

  /**
   * 全局搜索
   * GET /api/tab/search
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    return this.get<SearchResponse>('/tab/search', params);
  }

  // ============ 辅助方法 ============

  /**
   * 快速搜索（使用默认限制）
   */
  async quickSearch(query: string): Promise<SearchResponse> {
    return this.search({ q: query, limit: 20 });
  }

  /**
   * 获取用户统计信息
   */
  async getStats(): Promise<GetUserResponse['data']['user']['stats']> {
    const response = await this.getMe();
    return response.data.user.stats;
  }

  /**
   * 检查 API Key 是否有效
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch (error) {
      return false;
    }
  }
}
