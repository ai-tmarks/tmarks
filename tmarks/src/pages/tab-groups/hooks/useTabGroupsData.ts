import { useEffect, useMemo } from 'react'
import { tabGroupsService } from '@/services/tab-groups'
import { logger } from '@/lib/logger'
import { searchInFields } from '@/lib/search-utils'
import { sortTabGroups } from '@/components/tab-groups/sortUtils'
import type { TabGroup } from '@/lib/types'
import type { SortOption } from '@/components/tab-groups/sortUtils'

interface UseTabGroupsDataProps {
  setTabGroups: (groups: TabGroup[]) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setDebouncedSearchQuery: (query: string) => void
  searchQuery: string
}

/**
 * 标签组数据加载和过滤 Hook
 */
export function useTabGroupsData({
  setTabGroups,
  setIsLoading,
  setError,
  setDebouncedSearchQuery,
  searchQuery,
}: UseTabGroupsDataProps) {
  
  // 加载标签组
  const loadTabGroups = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const groups = await tabGroupsService.getAllTabGroups()
      setTabGroups(groups.filter((g) => !g.is_deleted))
    } catch (err) {
      logger.error('Failed to load tab groups:', err)
      setError('加载失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 只刷新左侧树形列表，不影响中间和右侧列
  const refreshTreeOnly = async () => {
    try {
      const groups = await tabGroupsService.getAllTabGroups()
      setTabGroups(groups.filter((g) => !g.is_deleted))
    } catch (err) {
      logger.error('Failed to refresh tree:', err)
      setError('刷新失败')
    }
  }

  // 初始加载
  useEffect(() => {
    loadTabGroups()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, setDebouncedSearchQuery])

  return {
    loadTabGroups,
    refreshTreeOnly,
  }
}

/**
 * 标签组过滤和排序 Hook
 */
export function useTabGroupsFilter(
  tabGroups: TabGroup[],
  selectedGroupId: string | null,
  debouncedSearchQuery: string,
  sortBy: SortOption
) {
  // 根据选中的分组过滤
  const groupFilteredTabGroups = useMemo(() => {
    if (!tabGroups || tabGroups.length === 0) {
      return []
    }
    
    if (!selectedGroupId) {
      return tabGroups
    }
    
    const selectedGroup = tabGroups.find(g => g.id === selectedGroupId)
    if (!selectedGroup) {
      return []
    }
    
    // 如果选中的是文件夹，只显示所有子项（不显示文件夹本身）
    if (selectedGroup.is_folder === 1) {
      const children = tabGroups.filter(g => g.parent_id === selectedGroupId)
      return children
    }
    
    // 如果选中的是普通分组，只显示该分组
    return [selectedGroup]
  }, [selectedGroupId, tabGroups])

  // 搜索过滤
  const filteredTabGroups = useMemo(() => {
    if (!groupFilteredTabGroups || groupFilteredTabGroups.length === 0) {
      return []
    }

    if (!debouncedSearchQuery.trim()) {
      return groupFilteredTabGroups
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    const results: TabGroup[] = []

    for (const group of groupFilteredTabGroups) {
      // 搜索分组标题
      if (searchInFields([group.title], query)) {
        results.push(group)
        continue
      }

      // 搜索标签页项
      if (group.items && group.items.length > 0) {
        const matchingItems = group.items.filter((item) =>
          searchInFields([item.title, item.url], query)
        )

        if (matchingItems.length > 0) {
          results.push({
            ...group,
            items: matchingItems,
          })
        }
      }
    }
    
    return results
  }, [groupFilteredTabGroups, debouncedSearchQuery])

  // 排序
  const sortedGroups = useMemo(() => {
    if (!filteredTabGroups || filteredTabGroups.length === 0) {
      return []
    }
    return sortTabGroups(filteredTabGroups, sortBy)
  }, [filteredTabGroups, sortBy])

  return {
    groupFilteredTabGroups,
    filteredTabGroups,
    sortedGroups,
  }
}
