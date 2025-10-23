import { apiClient } from '@/lib/api-client'
import type {
  TabGroup,
  TabGroupsResponse,
  CreateTabGroupRequest,
  UpdateTabGroupRequest,
  ShareResponse,
  StatisticsResponse,
} from '@/lib/types'

export const tabGroupsService = {
  /**
   * 获取标签页组列表
   */
  async getTabGroups(params?: { page_size?: number; page_cursor?: string }) {
    const searchParams = new URLSearchParams()

    if (params?.page_size) searchParams.set('page_size', params.page_size.toString())
    if (params?.page_cursor) searchParams.set('page_cursor', params.page_cursor)

    const query = searchParams.toString()
    const endpoint = query ? `/../tab-groups?${query}` : '/../tab-groups'

    const response = await apiClient.get<TabGroupsResponse>(endpoint)
    return response.data!
  },

  /**
   * 获取所有标签页组（自动分页）
   */
  async getAllTabGroups() {
    const allGroups: TabGroup[] = []
    let cursor: string | undefined = undefined

    do {
      const response = await this.getTabGroups({
        page_size: 100,
        page_cursor: cursor,
      })

      allGroups.push(...response.tab_groups)
      cursor = response.meta?.next_cursor
    } while (cursor)

    return allGroups
  },

  /**
   * 获取单个标签页组详情
   */
  async getTabGroup(id: string) {
    const response = await apiClient.get<{ tab_group: TabGroup }>(`/../tab-groups/${id}`)
    return response.data!.tab_group
  },

  /**
   * 创建标签页组
   */
  async createTabGroup(data: CreateTabGroupRequest) {
    const response = await apiClient.post<{ tab_group: TabGroup }>('/../tab-groups', data)
    return response.data!.tab_group
  },

  /**
   * 创建文件夹
   */
  async createFolder(title: string, parentId?: string | null) {
    const response = await apiClient.post<{ tab_group: TabGroup }>('/../tab-groups', {
      title,
      parent_id: parentId,
      is_folder: true,
    })
    return response.data!.tab_group
  },

  /**
   * 更新标签页组
   */
  async updateTabGroup(id: string, data: UpdateTabGroupRequest) {
    const response = await apiClient.patch<{ tab_group: TabGroup }>(`/../tab-groups/${id}`, data)
    return response.data!.tab_group
  },

  /**
   * 删除标签页组
   */
  async deleteTabGroup(id: string) {
    await apiClient.delete(`/../tab-groups/${id}`)
  },

  /**
   * 更新标签页项
   */
  async updateTabGroupItem(
    itemId: string,
    data: { title?: string; is_pinned?: number; is_todo?: number; position?: number }
  ) {
    const response = await apiClient.patch<{ item: any }>(`/../tab-groups/items/${itemId}`, data)
    return response.data!.item
  },

  /**
   * 删除标签页项
   */
  async deleteTabGroupItem(itemId: string) {
    await apiClient.delete(`/../tab-groups/items/${itemId}`)
  },

  /**
   * 批量添加标签页项到分组
   */
  async addItemsToGroup(_groupId: string, _items: Array<{ title: string; url: string; favicon?: string }>) {
    // 由于后端没有批量添加的 API，暂时不支持此功能
    throw new Error('批量添加功能需要后端支持')
  },

  /**
   * 获取回收站中的标签页组
   */
  async getTrash() {
    const response = await apiClient.get<TabGroupsResponse>('/../tab-groups/trash')
    return response.data!
  },

  /**
   * 恢复标签页组
   */
  async restoreTabGroup(id: string) {
    await apiClient.post(`/api/tab-groups/${id}/restore`, {})
  },

  /**
   * 永久删除标签页组
   */
  async permanentDeleteTabGroup(id: string) {
    await apiClient.delete(`/api/tab-groups/${id}/permanent-delete`)
  },

  /**
   * 创建分享链接
   */
  async createShare(groupId: string, options?: { is_public?: boolean; expires_in_days?: number }) {
    const response = await apiClient.post<ShareResponse>(`/api/tab-groups/${groupId}/share`, options || {})
    return response.data!
  },

  /**
   * 获取分享信息
   */
  async getShare(groupId: string) {
    const response = await apiClient.get<ShareResponse>(`/api/tab-groups/${groupId}/share`)
    return response.data!
  },

  /**
   * 删除分享
   */
  async deleteShare(groupId: string) {
    await apiClient.delete(`/api/tab-groups/${groupId}/share`)
  },

  /**
   * 获取统计数据
   */
  async getStatistics(days: number = 30) {
    const response = await apiClient.get<StatisticsResponse>(`/../statistics?days=${days}`)
    return response.data!
  },
}

