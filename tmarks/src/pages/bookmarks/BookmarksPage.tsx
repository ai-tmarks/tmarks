import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TagSidebar } from '@/components/tags/TagSidebar'
import { BookmarkListContainer } from '@/components/bookmarks/BookmarkListContainer'
import { BookmarkForm } from '@/components/bookmarks/BookmarkForm'
import { PaginationFooter } from '@/components/common/PaginationFooter'
import { SortSelector, type SortOption } from '@/components/common/SortSelector'
import { useInfiniteBookmarks } from '@/hooks/useBookmarks'
import { useTags } from '@/hooks/useTags'
import { usePreferences, useUpdatePreferences } from '@/hooks/usePreferences'
import type { Bookmark, BookmarkQueryParams } from '@/lib/types'


const VIEW_MODE_STORAGE_KEY = 'tmarks:view_mode'
const VIEW_MODE_UPDATED_AT_STORAGE_KEY = 'tmarks:view_mode_updated_at'

const VIEW_MODES = ['list', 'card', 'minimal', 'title'] as const
type ViewMode = typeof VIEW_MODES[number]
type VisibilityFilter = 'all' | 'public' | 'private'

interface MenuPosition {
  top: number
  left: number
  width?: number
}

const VISIBILITY_LABELS: Record<VisibilityFilter, string> = {
  all: '全部书签',
  public: '仅公开',
  private: '仅私密',
}

const VISIBILITY_OPTIONS: VisibilityFilter[] = ['all', 'public', 'private']



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

export function BookmarksPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [debouncedSelectedTags, setDebouncedSelectedTags] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode() ?? 'card')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [tagLayout, setTagLayout] = useState<'grid' | 'masonry'>('grid')
  const [showForm, setShowForm] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
  const previousCountRef = useRef(0)
  const autoCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tagDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const viewMenuButtonRef = useRef<HTMLButtonElement>(null)
  const visibilityMenuButtonRef = useRef<HTMLButtonElement>(null)
  const viewMenuContentRef = useRef<HTMLDivElement | null>(null)
  const visibilityMenuContentRef = useRef<HTMLDivElement | null>(null)
  const [viewMenuPosition, setViewMenuPosition] = useState<MenuPosition | null>(null)
  const [visibilityMenuPosition, setVisibilityMenuPosition] = useState<MenuPosition | null>(null)
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false)
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false)

  const closeMenus = () => {
    setIsViewMenuOpen(false)
    setIsVisibilityMenuOpen(false)
    setViewMenuPosition(null)
    setVisibilityMenuPosition(null)
    viewMenuContentRef.current = null
    visibilityMenuContentRef.current = null
  }

  // 获取用户偏好设置
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  // 标签选择防抖：延迟300ms更新实际标签筛选（减少API调用）
  useEffect(() => {
    if (tagDebounceTimerRef.current) {
      clearTimeout(tagDebounceTimerRef.current)
    }

    tagDebounceTimerRef.current = setTimeout(() => {
      setDebouncedSelectedTags(selectedTags)
    }, 300)

    return () => {
      if (tagDebounceTimerRef.current) {
        clearTimeout(tagDebounceTimerRef.current)
      }
    }
  }, [selectedTags])

  // 搜索防抖：延迟500ms更新实际搜索关键词（减少API调用）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchKeyword])

  // 初始化视图模式
  useEffect(() => {
    if (preferences?.view_mode && isValidViewMode(preferences.view_mode)) {
      const storedMode = getStoredViewMode()
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
  }, [preferences])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        isViewMenuOpen &&
        !viewMenuButtonRef.current?.contains(target) &&
        !viewMenuContentRef.current?.contains(target)
      ) {
        setIsViewMenuOpen(false)
        setViewMenuPosition(null)
      }
      if (
        isVisibilityMenuOpen &&
        !visibilityMenuButtonRef.current?.contains(target) &&
        !visibilityMenuContentRef.current?.contains(target)
      ) {
        setIsVisibilityMenuOpen(false)
        setVisibilityMenuPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isViewMenuOpen, isVisibilityMenuOpen])

  // 构建查询参数（使用防抖后的值）
  const queryParams = useMemo<BookmarkQueryParams>(() => {
    const params: BookmarkQueryParams = {}

    if (debouncedSearchKeyword.trim()) {
      params.keyword = debouncedSearchKeyword.trim()
    }

    if (debouncedSelectedTags.length > 0) {
      params.tags = debouncedSelectedTags.join(',')
    }

    params.sort = sortBy

    return params
  }, [debouncedSearchKeyword, debouncedSelectedTags, sortBy])

  const bookmarksQuery = useInfiniteBookmarks(queryParams)
  const { refetch: refetchTags } = useTags()

  // 使用 useMemo 缓存书签列表
  const bookmarks = useMemo(() => {
    if (!bookmarksQuery.data?.pages?.length) {
      return [] as Bookmark[]
    }
    return bookmarksQuery.data.pages.flatMap(page => page.bookmarks)
  }, [bookmarksQuery.data])

  // 使用 useMemo 缓存可见性筛选结果
  const filteredBookmarks = useMemo(() => {
    if (visibilityFilter === 'all') return bookmarks
    
    return bookmarks.filter((bookmark) => 
      visibilityFilter === 'public' ? bookmark.is_public : !bookmark.is_public
    )
  }, [bookmarks, visibilityFilter])

  const lastPageCount = useMemo(() => {
    const pages = bookmarksQuery.data?.pages
    if (!pages || pages.length === 0) {
      return 0
    }
    const lastPageBookmarks = pages[pages.length - 1]?.bookmarks ?? []
    if (visibilityFilter === 'public') {
      return lastPageBookmarks.filter((bookmark) => bookmark.is_public).length
    }
    if (visibilityFilter === 'private') {
      return lastPageBookmarks.filter((bookmark) => !bookmark.is_public).length
    }
    return lastPageBookmarks.length
  }, [bookmarksQuery.data, visibilityFilter])

  const isInitialLoading = bookmarksQuery.isLoading && bookmarks.length === 0
  const isFetchingExisting = bookmarksQuery.isFetching && !isInitialLoading

  useEffect(() => {
    if (filteredBookmarks.length > 0) {
      previousCountRef.current = filteredBookmarks.length
    }
  }, [filteredBookmarks.length])

  // 标签自动清空逻辑 - 30秒后自动清除选中状态
  useEffect(() => {
    // 清除之前的定时器
    if (autoCleanupTimerRef.current) {
      clearTimeout(autoCleanupTimerRef.current)
      autoCleanupTimerRef.current = null
    }

    // 如果有选中的标签，设置30秒后自动清空
    if (selectedTags.length > 0) {
      autoCleanupTimerRef.current = setTimeout(() => {
        setSelectedTags([])
        setDebouncedSelectedTags([])
      }, 30000) // 30秒
    }

    // 清理函数
    return () => {
      if (autoCleanupTimerRef.current) {
        clearTimeout(autoCleanupTimerRef.current)
        autoCleanupTimerRef.current = null
      }
    }
  }, [selectedTags])

  // 搜索关键词自动清空逻辑 - 20秒后自动清除搜索内容
  useEffect(() => {
    // 清除之前的定时器
    if (searchCleanupTimerRef.current) {
      clearTimeout(searchCleanupTimerRef.current)
      searchCleanupTimerRef.current = null
    }

    // 如果有搜索关键词，设置15秒后自动清空
    if (searchKeyword.trim()) {
      searchCleanupTimerRef.current = setTimeout(() => {
        setSearchKeyword('')
        setDebouncedSearchKeyword('')
      }, 15000) // 15秒
    }

    // 清理函数
    return () => {
      if (searchCleanupTimerRef.current) {
        clearTimeout(searchCleanupTimerRef.current)
        searchCleanupTimerRef.current = null
      }
    }
  }, [searchKeyword])

  const hasMore = Boolean(bookmarksQuery.hasNextPage)
  const handleOpenForm = (bookmark?: Bookmark) => {
    closeMenus()
    if (bookmark) {
      setEditingBookmark(bookmark)
    } else {
      setEditingBookmark(null)
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingBookmark(null)
  }

  const handleFormSuccess = () => {
    bookmarksQuery.refetch()
    refetchTags()
  }

  const handleLoadMore = () => {
    if (bookmarksQuery.hasNextPage) {
      bookmarksQuery.fetchNextPage()
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setStoredViewMode(mode)
    // 保存到用户偏好设置
    updatePreferences.mutate({ view_mode: mode })
    setIsViewMenuOpen(false)
    setViewMenuPosition(null)
    viewMenuContentRef.current = null
  }

  const handleVisibilityChange = (filter: VisibilityFilter) => {
    setVisibilityFilter(filter)
    setIsVisibilityMenuOpen(false)
    setVisibilityMenuPosition(null)
    visibilityMenuContentRef.current = null
  }



  const toggleVisibilityMenu = () => {
    setIsVisibilityMenuOpen((prev) => {
      const next = !prev
      if (next) {
        if (visibilityMenuButtonRef.current) {
          const rect = visibilityMenuButtonRef.current.getBoundingClientRect()
          const width = Math.max(rect.width + 100, 160)
          const maxLeft = window.scrollX + window.innerWidth - width - 12
          const left = Math.min(rect.left + window.scrollX, maxLeft)
          setVisibilityMenuPosition({
            top: rect.bottom + window.scrollY + 8,
            left,
            width,
          })
        }
        setIsViewMenuOpen(false)
        setViewMenuPosition(null)
      } else {
        setVisibilityMenuPosition(null)
      }
      return next
    })
  }

  const toggleViewMenu = () => {
    setIsViewMenuOpen((prev) => {
      const next = !prev
      if (next) {
        if (viewMenuButtonRef.current) {
          const rect = viewMenuButtonRef.current.getBoundingClientRect()
          const width = Math.max(rect.width + 110, 180)
          const maxLeft = window.scrollX + window.innerWidth - width - 12
          const left = Math.min(rect.left + window.scrollX, maxLeft)
          setViewMenuPosition({
            top: rect.bottom + window.scrollY + 8,
            left,
            width,
          })
        }
        setIsVisibilityMenuOpen(false)
        setVisibilityMenuPosition(null)
      } else {
        setViewMenuPosition(null)
      }
      return next
    })
  }



  const handleTagLayoutChange = (layout: 'grid' | 'masonry') => {
    setTagLayout(layout)
    updatePreferences.mutate({ tag_layout: layout })
  }

  const visibilityMenuPortal =
    typeof document !== 'undefined' && isVisibilityMenuOpen && visibilityMenuPosition
      ? createPortal(
          <div
            ref={(node) => {
              visibilityMenuContentRef.current = node
            }}
            className="rounded-lg border border-border shadow-lg overflow-hidden"
            style={{
              position: 'absolute',
              top: visibilityMenuPosition.top,
              left: visibilityMenuPosition.left,
              width: visibilityMenuPosition.width ?? 180,
              backgroundColor: 'var(--card)',
              zIndex: 1000,
            }}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleVisibilityChange(option)}
                className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  visibilityFilter === option
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-base-content/80 hover:bg-base-200/60'
                }`}
              >
                <VisibilityIcon filter={option} />
                <span>{VISIBILITY_LABELS[option]}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  const viewMenuPortal =
    typeof document !== 'undefined' && isViewMenuOpen && viewMenuPosition
      ? createPortal(
          <div
            ref={(node) => {
              viewMenuContentRef.current = node
            }}
            className="rounded-lg border border-border shadow-lg overflow-hidden"
            style={{
              position: 'absolute',
              top: viewMenuPosition.top,
              left: viewMenuPosition.left,
              width: viewMenuPosition.width ?? 200,
              backgroundColor: 'var(--card)',
              zIndex: 1000,
            }}
          >
            {VIEW_MODES.map((modeOption) => (
              <button
                key={modeOption}
                type="button"
                onClick={() => handleViewModeChange(modeOption)}
                className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  viewMode === modeOption
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-base-content/80 hover:bg-base-200/60'
                }`}
              >
                <ViewModeIcon mode={modeOption} />
                <span>
                  {modeOption === 'list'
                    ? '列表视图'
                    : modeOption === 'card'
                      ? '卡片视图'
                      : modeOption === 'minimal'
                        ? '极简列表'
                        : '标题瀑布'}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null



  return (
    <>
      {visibilityMenuPortal}
      {viewMenuPortal}
      <div className="w-full mx-auto py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
        {/* 左侧：标签侧边栏 - 桌面端显示 */}
        <aside className="hidden lg:block lg:col-span-3 order-2 lg:order-1 fixed top-[calc(5rem+0.75rem)] sm:top-[calc(5rem+1rem)] md:top-[calc(5rem+1.5rem)] left-3 sm:left-4 md:left-6 bottom-3 w-[calc(25%-1.5rem)] z-40">
          <TagSidebar
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            tagLayout={tagLayout}
            onTagLayoutChange={handleTagLayoutChange}
            bookmarks={filteredBookmarks}
            isLoadingBookmarks={isInitialLoading || isFetchingExisting}
          />
        </aside>

        {/* 右侧：书签列表 */}
        <main className="lg:col-span-9 lg:col-start-4 order-1 lg:order-2">
        <div className="space-y-3 sm:space-y-4 md:space-y-5">
          {/* 顶部操作栏 */}
          <div className="card shadow-float">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* 移动端标签抽屉按钮 + 搜索框 */}
              <div className="flex items-center gap-3 flex-1 w-full sm:min-w-[280px]">
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
                <div className="flex-1">
                  <div className="relative">
                    <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-base-content/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      className="input w-full pl-10 sm:pl-12 h-11 sm:h-auto text-sm sm:text-base"
                      placeholder="搜索书签标题、描述或URL..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 排序选择、视图切换和新增按钮 */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <SortSelector
                    value={sortBy}
                    onChange={setSortBy}
                    className="w-full sm:w-auto"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      ref={visibilityMenuButtonRef}
                      onClick={toggleVisibilityMenu}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float touch-manipulation ${
                        visibilityFilter === 'all'
                          ? 'bg-base-200 text-base-content/80 hover:bg-base-300'
                          : visibilityFilter === 'public'
                            ? 'bg-success/10 text-success hover:bg-success/20'
                            : 'bg-warning/10 text-warning hover:bg-warning/20'
                      }`}
                      title={`${VISIBILITY_LABELS[visibilityFilter]}筛选`}
                      aria-label={`${VISIBILITY_LABELS[visibilityFilter]}筛选`}
                      type="button"
                    >
                      <VisibilityIcon filter={visibilityFilter} />
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      ref={viewMenuButtonRef}
                      onClick={toggleViewMenu}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-base-200 text-base-content/80 hover:bg-base-300 touch-manipulation"
                      title="切换视图"
                      aria-label="切换视图"
                      type="button"
                    >
                      <ViewModeIcon mode={viewMode} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenForm()}
                    className="w-12 h-12 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center shrink-0 shadow-float hover:shadow-xl transition-all hover:scale-105 active:scale-95 touch-manipulation"
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

          {/* 书签列表 */}
          <BookmarkListContainer
            bookmarks={filteredBookmarks}
            isLoading={isInitialLoading || isFetchingExisting}
            viewMode={viewMode}
            onEdit={handleOpenForm}
            previousCount={previousCountRef.current}
          />

          {/* 分页控制 */}
          {!isInitialLoading && filteredBookmarks.length > 0 && (
            <PaginationFooter
              hasMore={hasMore}
              isLoading={bookmarksQuery.isFetchingNextPage}
              onLoadMore={handleLoadMore}
              currentCount={lastPageCount}
              totalLoaded={filteredBookmarks.length}
            />
          )}
        </div>
      </main>
      </div>

      {/* 移动端标签抽屉 */}
      {isTagSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsTagSidebarOpen(false)}
          />

          {/* 抽屉内容 */}
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background border-r border-border shadow-xl animate-in slide-in-from-left duration-300">
            {/* 抽屉头部 */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
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
            <div className="flex-1 overflow-y-auto p-4 bg-background">
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
      </div>
    </>
  )
}
