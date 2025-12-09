import { useState, useRef } from 'react'
import type { Bookmark } from '@/lib/types'
import type { SortOption } from '@/components/common/SortSelector'

const VIEW_MODE_STORAGE_KEY = 'tmarks:view_mode'
const VIEW_MODE_UPDATED_AT_STORAGE_KEY = 'tmarks:view_mode_updated_at'

const VIEW_MODES = ['list', 'card', 'minimal', 'title'] as const
export type ViewMode = typeof VIEW_MODES[number]
export type VisibilityFilter = 'all' | 'public' | 'private'

function isValidViewMode(value: string | null): value is ViewMode {
  return !!value && (VIEW_MODES as readonly string[]).includes(value)
}

function getStoredViewMode(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  return isValidViewMode(stored) ? stored : null
}

export function getStoredViewModeUpdatedAt(): number {
  if (typeof window === 'undefined') return 0
  const stored = window.localStorage.getItem(VIEW_MODE_UPDATED_AT_STORAGE_KEY)
  const timestamp = stored ? Number(stored) : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function setStoredViewMode(mode: ViewMode, updatedAt?: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  window.localStorage.setItem(
    VIEW_MODE_UPDATED_AT_STORAGE_KEY,
    String(typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now()),
  )
}

/**
 * 书签页面的状态管理 Hook
 */
export function useBookmarksState() {
  // 标签和搜索状态
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [debouncedSelectedTags, setDebouncedSelectedTags] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')
  const [searchMode, setSearchMode] = useState<'bookmark' | 'tag'>('bookmark')

  // 排序和视图状态
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode() ?? 'card')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [tagLayout, setTagLayout] = useState<'grid' | 'masonry'>('grid')
  const [sortByInitialized, setSortByInitialized] = useState(false)

  // 表单和编辑状态
  const [showForm, setShowForm] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // UI 状态
  const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)

  // Refs
  const previousCountRef = useRef(0)
  const autoCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tagDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  return {
    // 标签和搜索
    selectedTags,
    setSelectedTags,
    debouncedSelectedTags,
    setDebouncedSelectedTags,
    searchKeyword,
    setSearchKeyword,
    debouncedSearchKeyword,
    setDebouncedSearchKeyword,
    searchMode,
    setSearchMode,

    // 排序和视图
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    visibilityFilter,
    setVisibilityFilter,
    tagLayout,
    setTagLayout,
    sortByInitialized,
    setSortByInitialized,

    // 表单和编辑
    showForm,
    setShowForm,
    editingBookmark,
    setEditingBookmark,

    // 批量操作
    batchMode,
    setBatchMode,
    selectedIds,
    setSelectedIds,

    // UI
    isTagSidebarOpen,
    setIsTagSidebarOpen,

    // Refs
    previousCountRef,
    autoCleanupTimerRef,
    searchCleanupTimerRef,
    tagDebounceTimerRef,
  }
}
