import { useEffect, useCallback } from 'react'
import { usePreferences, useUpdatePreferences } from '@/hooks/usePreferences'
import { setStoredViewMode, getStoredViewModeUpdatedAt } from './useBookmarksState'
import type { ViewMode } from './useBookmarksState'
import type { SortOption } from '@/components/common/SortSelector'

function isValidViewMode(value: string | null): value is ViewMode {
  const VIEW_MODES = ['list', 'card', 'minimal', 'title'] as const
  return !!value && (VIEW_MODES as readonly string[]).includes(value)
}

interface UseBookmarksEffectsProps {
  selectedTags: string[]
  setDebouncedSelectedTags: (tags: string[]) => void
  searchKeyword: string
  setDebouncedSearchKeyword: (keyword: string) => void
  setViewMode: (mode: ViewMode) => void
  setTagLayout: (layout: 'grid' | 'masonry') => void
  setSortBy: (sort: SortOption) => void
  sortByInitialized: boolean
  setSortByInitialized: (initialized: boolean) => void
  autoCleanupTimerRef: React.MutableRefObject<NodeJS.Timeout | null>
  searchCleanupTimerRef: React.MutableRefObject<NodeJS.Timeout | null>
  tagDebounceTimerRef: React.MutableRefObject<NodeJS.Timeout | null>
}

/**
 * 书签页面的副作用管理 Hook
 */
export function useBookmarksEffects({
  selectedTags,
  setDebouncedSelectedTags,
  searchKeyword,
  setDebouncedSearchKeyword,
  setViewMode,
  setTagLayout,
  setSortBy,
  sortByInitialized,
  setSortByInitialized,
  autoCleanupTimerRef,
  searchCleanupTimerRef,
  tagDebounceTimerRef,
}: UseBookmarksEffectsProps) {
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  // 标签选择防抖
  const debouncedUpdateTags = useCallback((tags: string[]) => {
    if (tagDebounceTimerRef.current) {
      clearTimeout(tagDebounceTimerRef.current)
    }
    tagDebounceTimerRef.current = setTimeout(() => {
      setDebouncedSelectedTags(tags)
    }, 300)
  }, [setDebouncedSelectedTags, tagDebounceTimerRef])

  useEffect(() => {
    debouncedUpdateTags(selectedTags)
    return () => {
      if (tagDebounceTimerRef.current) {
        clearTimeout(tagDebounceTimerRef.current)
      }
    }
  }, [selectedTags, debouncedUpdateTags, tagDebounceTimerRef])

  // 搜索防抖
  const debouncedUpdateSearch = useCallback((keyword: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(keyword)
    }, 500)
    return () => clearTimeout(timer)
  }, [setDebouncedSearchKeyword])

  useEffect(() => {
    const cleanup = debouncedUpdateSearch(searchKeyword)
    return cleanup
  }, [searchKeyword, debouncedUpdateSearch])

  // 初始化视图模式和排序方式
  useEffect(() => {
    const storedMode = window.localStorage.getItem('tmarks:view_mode')
    if (storedMode && isValidViewMode(storedMode) && !preferences) {
      setViewMode(storedMode)
    }

    if (preferences?.view_mode && isValidViewMode(preferences.view_mode)) {
      const storedUpdatedAt = getStoredViewModeUpdatedAt()
      const serverUpdatedAt = preferences.updated_at ? new Date(preferences.updated_at).getTime() : 0

      if (!storedMode || serverUpdatedAt > storedUpdatedAt) {
        setViewMode(preferences.view_mode)
        setStoredViewMode(preferences.view_mode, serverUpdatedAt)
      }
    }

    if (preferences?.tag_layout) {
      setTagLayout(preferences.tag_layout)
    }

    if (preferences?.sort_by && !sortByInitialized) {
      setSortBy(preferences.sort_by)
      setSortByInitialized(true)
    }
  }, [preferences, sortByInitialized, setViewMode, setTagLayout, setSortBy, setSortByInitialized])

  // 标签自动清空
  useEffect(() => {
    if (autoCleanupTimerRef.current) {
      clearTimeout(autoCleanupTimerRef.current)
      autoCleanupTimerRef.current = null
    }

    const enableAutoClear = preferences?.enable_tag_selection_auto_clear ?? false
    const clearSeconds = preferences?.tag_selection_auto_clear_seconds ?? 30

    if (enableAutoClear && selectedTags.length > 0) {
      autoCleanupTimerRef.current = setTimeout(() => {
        setDebouncedSelectedTags([])
      }, clearSeconds * 1000)
    }

    return () => {
      if (autoCleanupTimerRef.current) {
        clearTimeout(autoCleanupTimerRef.current)
        autoCleanupTimerRef.current = null
      }
    }
  }, [selectedTags, preferences, autoCleanupTimerRef, setDebouncedSelectedTags])

  // 搜索自动清空
  useEffect(() => {
    if (searchCleanupTimerRef.current) {
      clearTimeout(searchCleanupTimerRef.current)
      searchCleanupTimerRef.current = null
    }

    const enableAutoClear = preferences?.enable_search_auto_clear ?? true
    const clearSeconds = preferences?.search_auto_clear_seconds ?? 15

    if (enableAutoClear && searchKeyword.trim()) {
      searchCleanupTimerRef.current = setTimeout(() => {
        setDebouncedSearchKeyword('')
      }, clearSeconds * 1000)
    }

    return () => {
      if (searchCleanupTimerRef.current) {
        clearTimeout(searchCleanupTimerRef.current)
        searchCleanupTimerRef.current = null
      }
    }
  }, [searchKeyword, preferences, searchCleanupTimerRef, setDebouncedSearchKeyword])

  return {
    updatePreferences,
  }
}
