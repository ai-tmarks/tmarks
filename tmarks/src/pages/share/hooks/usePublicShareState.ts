import { useState, useRef } from 'react'
import type { SortOption } from '@/components/common/SortSelector'

export type ViewMode = 'list' | 'card' | 'minimal' | 'title'
export type VisibilityFilter = 'all' | 'public' | 'private'

export function usePublicShareState() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [debouncedSelectedTags, setDebouncedSelectedTags] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')
  const [searchMode, setSearchMode] = useState<'bookmark' | 'tag'>('bookmark')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [tagLayout, setTagLayout] = useState<'grid' | 'masonry'>('grid')
  const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [tagSortBy, setTagSortBy] = useState<'usage' | 'name' | 'clicks'>('usage')
  
  const tagDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)

  return {
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
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    visibilityFilter,
    setVisibilityFilter,
    tagLayout,
    setTagLayout,
    isTagSidebarOpen,
    setIsTagSidebarOpen,
    currentPage,
    setCurrentPage,
    tagSortBy,
    setTagSortBy,
    tagDebounceTimerRef,
    autoCleanupTimerRef,
    searchCleanupTimerRef,
  }
}
