import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { CheckCircle } from 'lucide-react'
import { TagSidebar } from '@/components/tags/TagSidebar'
import { BookmarkListContainer } from '@/components/bookmarks/BookmarkListContainer'
import { BookmarkForm } from '@/components/bookmarks/BookmarkForm'
import { BatchActionBar } from '@/components/bookmarks/BatchActionBar'
import { PaginationFooter } from '@/components/common/PaginationFooter'
import type { SortOption } from '@/components/common/SortSelector'
import { useInfiniteBookmarks } from '@/hooks/useBookmarks'
import { useTags } from '@/hooks/useTags'
import { usePreferences, useUpdatePreferences } from '@/hooks/usePreferences'
import type { Bookmark, BookmarkQueryParams } from '@/lib/types'


const VIEW_MODE_STORAGE_KEY = 'tmarks:view_mode'
const VIEW_MODE_UPDATED_AT_STORAGE_KEY = 'tmarks:view_mode_updated_at'

const VIEW_MODES = ['list', 'card', 'minimal', 'title'] as const
type ViewMode = typeof VIEW_MODES[number]
type VisibilityFilter = 'all' | 'public' | 'private'

const SORT_OPTIONS: SortOption[] = ['created', 'updated', 'pinned', 'popular']

const VISIBILITY_LABELS: Record<VisibilityFilter, string> = {
  all: '全部书签',
  public: '仅公开',
  private: '仅私密',
}

const SORT_LABELS: Record<SortOption, string> = {
  created: '按创建时间',
  updated: '按更新时间',
  pinned: '置顶优先',
  popular: '按热门程度',
}



function isValidViewMode(value: string | null): value is ViewMode {
  return !!value && (VIEW_MODES as readonly string[]).includes(value)
}

function getStoredViewMode(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  return isValidViewMode(stored) ? stored : null
}

function getStoredViewModeUpdatedAt(): number {
  if (typeof window === 'undefined') return 0
  const stored = window.localStorage.getItem(VIEW_MODE_UPDATED_AT_STORAGE_KEY)
  const timestamp = stored ? Number(stored) : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function setStoredViewMode(mode: ViewMode, updatedAt?: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  window.localStorage.setItem(
    VIEW_MODE_UPDATED_AT_STORAGE_KEY,
    String(typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now()),
  )
}

function ViewModeIcon({ mode }: { mode: ViewMode }) {
  if (mode === 'card') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />
      </svg>
    )
  }

  if (mode === 'minimal') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 5.5v13M17 5.5v13" />
      </svg>
    )
  }

  if (mode === 'title') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h8M4 12h12M4 18h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5v2M18 11v2M16 17v2" />
      </svg>
    )
  }

  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
    </svg>
  )
}

function VisibilityIcon({ filter }: { filter: VisibilityFilter }) {
  if (filter === 'public') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }

  if (filter === 'private') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <rect x="4" y="10" width="16" height="10" rx="2" ry="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 118 0v3" />
      </svg>
    )
  }

  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function SortIcon({ sort }: { sort: SortOption }) {
  if (sort === 'created') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }

  if (sort === 'updated') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  }

  if (sort === 'pinned') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    )
  }

  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

export function BookmarksPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [debouncedSelectedTags, setDebouncedSelectedTags] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')
  const [searchMode, setSearchMode] = useState<'bookmark' | 'tag'>('bookmark')  // 搜索模式
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode() ?? 'card')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [tagLayout, setTagLayout] = useState<'grid' | 'masonry'>('grid')
  const [sortByInitialized, setSortByInitialized] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
  const previousCountRef = useRef(0)
  const autoCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tagDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 获取用户偏好设置
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  // 标签选择防抖：延迟300ms更新实际标签筛选（减少API调用）
  // 优化：使用 useCallback 避免重复创建函数
  const debouncedUpdateTags = useCallback((tags: string[]) => {
    if (tagDebounceTimerRef.current) {
      clearTimeout(tagDebounceTimerRef.current)
    }
    tagDebounceTimerRef.current = setTimeout(() => {
      setDebouncedSelectedTags(tags)
    }, 300)
  }, [])

  useEffect(() => {
    debouncedUpdateTags(selectedTags)
    return () => {
      if (tagDebounceTimerRef.current) {
        clearTimeout(tagDebounceTimerRef.current)
      }
    }
  }, [selectedTags, debouncedUpdateTags])

  // 搜索防抖：延迟500ms更新实际搜索关键词（减少API调用）
  // 优化：使用 useCallback 避免重复创建函数
  const debouncedUpdateSearch = useCallback((keyword: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(keyword)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const cleanup = debouncedUpdateSearch(searchKeyword)
    return cleanup
  }, [searchKeyword, debouncedUpdateSearch])

  // 初始化视图模式和排序方式 - 优化：立即从localStorage读取，不等待API
  useEffect(() => {
    // 立即从localStorage读取，避免等待API
    const storedMode = getStoredViewMode()
    if (storedMode && !preferences) {
      setViewMode(storedMode)
    }

    if (preferences?.view_mode && isValidViewMode(preferences.view_mode)) {
      const storedUpdatedAt = getStoredViewModeUpdatedAt()
      const serverUpdatedAt = preferences.updated_at ? new Date(preferences.updated_at).getTime() : 0

      // 优先使用时间戳更新的数据源
      if (!storedMode || serverUpdatedAt > storedUpdatedAt) {
        setViewMode(preferences.view_mode)
        setStoredViewMode(preferences.view_mode, serverUpdatedAt)
      }
    }

    if (preferences?.tag_layout) {
      setTagLayout(preferences.tag_layout)
    }

    // 从数据库加载排序方式
    if (preferences?.sort_by && !sortByInitialized) {
      setSortBy(preferences.sort_by)
      setSortByInitialized(true)
    }
  }, [preferences, sortByInitialized])



  // 构建查询参数（使用防抖后的值）
  const queryParams = useMemo<BookmarkQueryParams>(() => {
    const params: BookmarkQueryParams = {}

    // 只在书签搜索模式下传递关键词
    if (searchMode === 'bookmark' && debouncedSearchKeyword.trim()) {
      params.keyword = debouncedSearchKeyword.trim()
    }

    if (debouncedSelectedTags.length > 0) {
      params.tags = debouncedSelectedTags.join(',')
    }

    params.sort = sortBy

    return params
  }, [searchMode, debouncedSearchKeyword, debouncedSelectedTags, sortBy])

  const bookmarksQuery = useInfiniteBookmarks(queryParams)
  const { refetch: refetchTags } = useTags()

  // 使用 useMemo 缓存书签列表，并进行去重处理
  const bookmarks = useMemo(() => {
    if (!bookmarksQuery.data?.pages?.length) {
      return [] as Bookmark[]
    }
    const allBookmarks = bookmarksQuery.data.pages.flatMap(page => page.bookmarks)
    // 使用 Map 去重，保留第一次出现的书签
    const uniqueBookmarksMap = new Map<string, Bookmark>()
    allBookmarks.forEach(bookmark => {
      if (!uniqueBookmarksMap.has(bookmark.id)) {
        uniqueBookmarksMap.set(bookmark.id, bookmark)
      }
    })
    return Array.from(uniqueBookmarksMap.values())
  }, [bookmarksQuery.data])

  // 使用 useMemo 缓存可见性筛选结果
  const filteredBookmarks = useMemo(() => {
    if (visibilityFilter === 'all') return bookmarks

    return bookmarks.filter((bookmark) =>
      visibilityFilter === 'public' ? bookmark.is_public : !bookmark.is_public
    )
  }, [bookmarks, visibilityFilter])

  const isInitialLoading = bookmarksQuery.isLoading && bookmarks.length === 0
  const isFetchingExisting = bookmarksQuery.isFetching && !isInitialLoading

  useEffect(() => {
    if (filteredBookmarks.length > 0) {
      previousCountRef.current = filteredBookmarks.length
    }
  }, [filteredBookmarks.length])

  // 标签自动清空逻辑 - 根据用户设置自动清除选中状态
  useEffect(() => {
    // 清除之前的定时器
    if (autoCleanupTimerRef.current) {
      clearTimeout(autoCleanupTimerRef.current)
      autoCleanupTimerRef.current = null
    }

    // 检查是否启用标签选中自动清空
    const enableAutoClear = preferences?.enable_tag_selection_auto_clear ?? false
    const clearSeconds = preferences?.tag_selection_auto_clear_seconds ?? 30

    // 如果启用了自动清空且有选中的标签，设置定时器
    if (enableAutoClear && selectedTags.length > 0) {
      autoCleanupTimerRef.current = setTimeout(() => {
        setSelectedTags([])
        setDebouncedSelectedTags([])
      }, clearSeconds * 1000)
    }

    // 清理函数
    return () => {
      if (autoCleanupTimerRef.current) {
        clearTimeout(autoCleanupTimerRef.current)
        autoCleanupTimerRef.current = null
      }
    }
  }, [selectedTags, preferences?.enable_tag_selection_auto_clear, preferences?.tag_selection_auto_clear_seconds])

  // 搜索关键词自动清空逻辑 - 根据用户设置自动清除搜索内容
  useEffect(() => {
    // 清除之前的定时器
    if (searchCleanupTimerRef.current) {
      clearTimeout(searchCleanupTimerRef.current)
      searchCleanupTimerRef.current = null
    }

    // 检查是否启用搜索自动清空
    const enableAutoClear = preferences?.enable_search_auto_clear ?? true
    const clearSeconds = preferences?.search_auto_clear_seconds ?? 15

    // 如果启用了自动清空且有搜索关键词，设置定时器
    if (enableAutoClear && searchKeyword.trim()) {
      searchCleanupTimerRef.current = setTimeout(() => {
        setSearchKeyword('')
        setDebouncedSearchKeyword('')
      }, clearSeconds * 1000)
    }

    // 清理函数
    return () => {
      if (searchCleanupTimerRef.current) {
        clearTimeout(searchCleanupTimerRef.current)
        searchCleanupTimerRef.current = null
      }
    }
  }, [searchKeyword, preferences?.enable_search_auto_clear, preferences?.search_auto_clear_seconds])

  const hasMore = Boolean(bookmarksQuery.hasNextPage)
  // 优化：使用 useCallback 避免重复创建函数
  const handleOpenForm = useCallback((bookmark?: Bookmark) => {
    if (bookmark) {
      setEditingBookmark(bookmark)
    } else {
      setEditingBookmark(null)
    }
    setShowForm(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingBookmark(null)
  }, [])

  const handleFormSuccess = useCallback(() => {
    bookmarksQuery.refetch()
    refetchTags()
  }, [bookmarksQuery, refetchTags])

  const handleLoadMore = useCallback(() => {
    if (bookmarksQuery.hasNextPage) {
      bookmarksQuery.fetchNextPage()
    }
  }, [bookmarksQuery])

  const handleViewModeChange = useCallback(() => {
    // 循环切换：列表 -> 卡片 -> 极简 -> 标题 -> 列表
    const currentIndex = VIEW_MODES.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % VIEW_MODES.length
    const nextMode = VIEW_MODES[nextIndex]!
    setViewMode(nextMode)
    setStoredViewMode(nextMode)
    // 保存到用户偏好设置
    updatePreferences.mutate({ view_mode: nextMode })
  }, [viewMode, updatePreferences])

  const handleTagLayoutChange = useCallback((layout: 'grid' | 'masonry') => {
    setTagLayout(layout)
    updatePreferences.mutate({ tag_layout: layout })
  }, [updatePreferences])

  const handleSortByChange = useCallback(() => {
    // 循环切换：创建时间 -> 更新时间 -> 置顶优先 -> 热门程度 -> 创建时间
    const currentIndex = SORT_OPTIONS.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
    const nextSort = SORT_OPTIONS[nextIndex]!
    setSortBy(nextSort)
    // 保存到用户偏好设置
    updatePreferences.mutate({ sort_by: nextSort })
  }, [sortBy, updatePreferences])

  const handleToggleSelect = useCallback((bookmarkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(bookmarkId)
        ? prev.filter((id) => id !== bookmarkId)
        : [...prev, bookmarkId]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(filteredBookmarks.map((b) => b.id))
  }, [filteredBookmarks])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
    setBatchMode(false)
  }, [])

  const handleBatchSuccess = useCallback(() => {
    setSelectedIds([])
    setBatchMode(false)
    bookmarksQuery.refetch()
    refetchTags()
  }, [bookmarksQuery, refetchTags])



  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'list': return '列表视图'
      case 'card': return '卡片视图'
      case 'minimal': return '极简列表'
      case 'title': return '标题瀑布'
    }
  }

  return (
    <>
      <div className="w-full h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] flex flex-col overflow-hidden touch-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 w-full h-full overflow-hidden touch-none">
          {/* 左侧：标签侧边栏 - 桌面端显示 */}
          <aside className="hidden lg:block lg:col-span-3 order-2 lg:order-1 fixed top-[calc(5rem+0.75rem)] sm:top-[calc(5rem+1rem)] md:top-[calc(5rem+1.5rem)] left-3 sm:left-4 md:left-6 bottom-3 w-[calc(25%-1.5rem)] z-40 flex flex-col overflow-hidden">
            <TagSidebar
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              tagLayout={tagLayout}
              onTagLayoutChange={handleTagLayoutChange}
              bookmarks={filteredBookmarks}
              isLoadingBookmarks={isInitialLoading || isFetchingExisting}
              searchQuery={searchMode === 'tag' ? debouncedSearchKeyword : ''}
            />
          </aside>

          {/* 右侧：书签列表 */}
          <main className="lg:col-span-9 lg:col-start-4 order-1 lg:order-2 flex flex-col h-full overflow-hidden w-full min-w-0">
            {/* 固定的顶部操作栏 */}
            <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-3 sm:pb-4 w-full">
              {/* 顶部操作栏 */}
              <div className="card shadow-float w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                  {/* 移动端标签抽屉按钮 + 搜索框 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:min-w-[280px]">
                    {/* 标签抽屉按钮 - 仅移动端显示 */}
                    <button
                      onClick={() => setIsTagSidebarOpen(true)}
                      className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-card border border-border hover:bg-muted hover:border-primary/30 text-foreground"
                      title="打开标签"
                      aria-label="打开标签"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </button>

                    {/* 搜索框 */}
                    <div className="flex-1 min-w-0">
                      <div className="relative w-full">
                        {/* 搜索模式切换按钮 - 内部左侧 */}
                        <button
                          onClick={() => setSearchMode(searchMode === 'bookmark' ? 'tag' : 'bookmark')}
                          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all hover:text-primary"
                          title={searchMode === 'bookmark' ? '切换到标签搜索' : '切换到书签搜索'}
                          aria-label={searchMode === 'bookmark' ? '切换到标签搜索' : '切换到书签搜索'}
                        >
                          {searchMode === 'bookmark' ? (
                            // 书签图标
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          ) : (
                            // 标签图标
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          )}
                        </button>

                        {/* 搜索图标 */}
                        <svg className="absolute left-10 sm:left-12 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>

                        {/* 搜索输入框 */}
                        <input
                          type="text"
                          className="input w-full !pl-16 sm:!pl-[4.5rem] h-11 sm:h-auto text-sm sm:text-base"
                          placeholder={searchMode === 'bookmark' ? '搜索书签...' : '搜索标签...'}
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 排序选择、视图切换和新增按钮 */}
                  <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      {/* 排序按钮 - 点击循环切换 */}
                      <button
                        onClick={handleSortByChange}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-muted text-foreground hover:bg-muted/80 touch-manipulation flex-shrink-0"
                        title={`${SORT_LABELS[sortBy]} (点击切换)`}
                        aria-label={`${SORT_LABELS[sortBy]} (点击切换)`}
                        type="button"
                      >
                        <SortIcon sort={sortBy} />
                      </button>

                      {/* 可见性筛选按钮 - 点击循环切换 */}
                      <button
                        onClick={() => {
                          // 循环切换：全部 -> 公开 -> 私密 -> 全部
                          const nextFilter = visibilityFilter === 'all' 
                            ? 'public' 
                            : visibilityFilter === 'public' 
                              ? 'private' 
                              : 'all'
                          setVisibilityFilter(nextFilter)
                        }}
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float touch-manipulation flex-shrink-0 ${visibilityFilter === 'all'
                          ? 'bg-muted text-foreground hover:bg-muted/80'
                          : visibilityFilter === 'public'
                            ? 'bg-success/10 text-success hover:bg-success/20'
                            : 'bg-warning/10 text-warning hover:bg-warning/20'
                          }`}
                        title={`${VISIBILITY_LABELS[visibilityFilter]} (点击切换)`}
                        aria-label={`${VISIBILITY_LABELS[visibilityFilter]} (点击切换)`}
                        type="button"
                      >
                        <VisibilityIcon filter={visibilityFilter} />
                      </button>

                      {/* 视图模式按钮 - 点击循环切换 */}
                      <button
                        onClick={handleViewModeChange}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-muted text-foreground hover:bg-muted/80 touch-manipulation flex-shrink-0"
                        title={`${getViewModeLabel(viewMode)} (点击切换)`}
                        aria-label={`${getViewModeLabel(viewMode)} (点击切换)`}
                        type="button"
                      >
                        <ViewModeIcon mode={viewMode} />
                      </button>

                      {/* 批量操作按钮 */}
                      <button
                        onClick={() => {
                          setBatchMode(!batchMode)
                          if (batchMode) {
                            setSelectedIds([])
                          }
                        }}
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float touch-manipulation flex-shrink-0 ${batchMode
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                          }`}
                        title={batchMode ? '退出批量操作' : '批量操作'}
                        aria-label={batchMode ? '退出批量操作' : '批量操作'}
                        type="button"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleOpenForm()}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center shadow-float hover:shadow-xl transition-all hover:scale-105 active:scale-95 touch-manipulation flex-shrink-0"
                        title="新增书签"
                        aria-label="新增书签"
                        type="button"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* 批量操作提示栏 */}
              {batchMode && (
                <div className="card bg-primary/10 border border-primary/20 mt-3 sm:mt-4 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                      <span className="font-medium text-foreground whitespace-nowrap">
                        {selectedIds.length > 0
                          ? `已选择 ${selectedIds.length} 个`
                          : '请选择书签'}
                      </span>
                      {selectedIds.length < filteredBookmarks.length && (
                        <>
                          <span className="text-border hidden sm:inline">|</span>
                          <button
                            onClick={handleSelectAll}
                            className="text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                          >
                            全选 ({filteredBookmarks.length})
                          </button>
                        </>
                      )}
                      {selectedIds.length > 0 && (
                        <>
                          <span className="text-border hidden sm:inline">|</span>
                          <button
                            onClick={handleClearSelection}
                            className="text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                          >
                            取消
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 可滚动的书签列表区域 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pb-20 sm:pb-4 md:pb-6 w-full overscroll-contain touch-auto">
              <div className="space-y-3 sm:space-y-4 md:space-y-5 w-full min-w-0">
                {/* 书签列表 */}
                <BookmarkListContainer
                  bookmarks={filteredBookmarks}
                  isLoading={isInitialLoading || isFetchingExisting}
                  viewMode={viewMode}
                  onEdit={handleOpenForm}
                  previousCount={previousCountRef.current}
                  batchMode={batchMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />

                {/* 分页控制 */}
                {!isInitialLoading && filteredBookmarks.length > 0 && (
                  <PaginationFooter
                    hasMore={hasMore}
                    isLoading={bookmarksQuery.isFetchingNextPage}
                    onLoadMore={handleLoadMore}
                    currentCount={filteredBookmarks.length}
                    totalLoaded={filteredBookmarks.length}
                  />
                )}
              </div>
            </div>
          </main>
        </div>

        {/* 移动端标签抽屉 */}
        {isTagSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* 背景遮罩 */}
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsTagSidebarOpen(false)}
            />

            {/* 抽屉内容 */}
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background border-r border-border shadow-xl animate-in slide-in-from-left duration-300 flex flex-col">
              {/* 抽屉头部 */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
                <h3 className="text-lg font-semibold text-foreground">标签筛选</h3>
                <button
                  onClick={() => setIsTagSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="关闭标签抽屉"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 抽屉内容区域 */}
              <div className="flex-1 overflow-y-auto p-4 bg-background min-h-0 overscroll-contain touch-auto">
                <TagSidebar
                  selectedTags={selectedTags}
                  onTagsChange={(tags) => {
                    setSelectedTags(tags)
                    // 选择2个或更多标签后自动关闭抽屉
                    if (tags.length >= 2 && tags.length > selectedTags.length) {
                      setTimeout(() => setIsTagSidebarOpen(false), 500)
                    }
                  }}
                  tagLayout={tagLayout}
                  onTagLayoutChange={handleTagLayoutChange}
                  bookmarks={filteredBookmarks}
                  isLoadingBookmarks={isInitialLoading || isFetchingExisting}
                  searchQuery={searchMode === 'tag' ? debouncedSearchKeyword : ''}
                />
              </div>
            </div>
          </div>
        )}

        {/* 书签表单模态框 */}
        {showForm && (
          <BookmarkForm
            bookmark={editingBookmark}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        )}

        {/* 批量操作栏 */}
        {batchMode && selectedIds.length > 0 && (
          <BatchActionBar
            selectedIds={selectedIds}
            onClearSelection={handleClearSelection}
            onSuccess={handleBatchSuccess}
          />
        )}
      </div>
    </>
  )
}
