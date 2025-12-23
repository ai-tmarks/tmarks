import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tagsService } from '@/services/tags'
import type { CreateTagRequest, UpdateTagRequest, TagQueryParams } from '@/lib/types'

export const TAGS_QUERY_KEY = 'tags'

/**
 * 获取标签列表
 */
export function useTags(
  params?: TagQueryParams,
  options?: { staleTime?: number; gcTime?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: [TAGS_QUERY_KEY, params],
    queryFn: () => tagsService.getTags(params),
    staleTime: options?.staleTime || 60 * 60 * 1000, // 1小时 (标签很少变化)
    gcTime: options?.gcTime || 24 * 60 * 60 * 1000, // 24小时
    refetchOnWindowFocus: 'always', // 窗口聚焦时刷新，保持数据同步
    enabled: options?.enabled ?? true,
  })
}

/**
 * 创建标签
 */
export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTagRequest) => tagsService.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_QUERY_KEY] })
    },
  })
}

/**
 * 更新标签
 */
export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTagRequest }) =>
      tagsService.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_QUERY_KEY] })
    },
  })
}

/**
 * 删除标签
 */
export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tagsService.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_QUERY_KEY] })
      // 同时刷新书签列表（因为标签被删除）
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })
}
