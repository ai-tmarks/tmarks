import { useMemo, useEffect, useCallback } from 'react'
import { TagSidebar } from '@/components/tags/TagSidebar'
import { BookmarkListContainer } from '@/components/bookmarks/BookmarkListContainer'
import { BookmarkForm } from '@/components/bookmarks/BookmarkForm'
import { BatchActionBar } from '@/components/bookmarks/BatchActionBar'
import { PaginationFooter } from '@/components/common/PaginationFooter'
import { TopActionBar } from './components/TopActionBar'
import { useBookmarksState } from './hooks/useBookmarksState'
import { useBookmarksEffects } from './hooks/useBookmarksEffects'
import { setStoredViewMode } from './hooks/useBookmarksState'
import { useInfiniteBookmarks } from '@/hooks/useBookmarks'
import { useTags } from '@/hooks/useTags'
import type { Bookmark, BookmarkQueryParams } from '@/lib/types'
import type { SortOption } from '@/components/common/SortSelector'

const SORT_OPTIONS: SortOption[] = ['created', 'updated', 'pinned', 'popular']
const VIEW_MODES = ['list', 'card', 'minimal', 'title'] as const

export function BookmarksPage() {
  // 状态管理
  const state = useBookmarksState()
  const {
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
    showForm,
    setShowForm,
    editingBookmark,
    setEditingBookmark,
    batchMode,
    setBatchMode,
    selectedIds,
    setSelectedIds,
    isTagSidebarOpen,
    setIsTagSidebarOpen,
    previousCountRef,
    autoCleanupTimerRef,
    searchCleanupTimerRef,
    tagDebounceTimerRef,
  } = state

  // 副作用管理
  const { updatePreferences } = useBookmarksEffects({
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
  })

  // 构建查询参数
  const queryParams = useMemo<BookmarkQueryParams>(() => {
    const params: BookmarkQueryParams = {}

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

  // 书签列表（去重）
  const bookmarks = useMemo(() => {
    if (!bookmarksQuery.data?.pages?.length) {
      return [] as Bookmark[]
    }
    const allBookmarks = bookmarksQuery.data.pages.flatMap(page => page.bookmarks)
    const uniqueBookmarksMap = new Map<string, Bookmark>()
    allBookmarks.forEach(bookmark => {
      if (!uniqueBookmarksMap.has(bookmark.id)) {
        uniqueBookmarksMap.set(bookmark.id, bookmark)
      }
    })
    return Array.from(uniqueBookmarksMap.values())
  }, [bookmarksQuery.data])

  // 可见性过滤
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
  }, [filteredBookmarks.length, previousCountRef])

  const hasMore = Boolean(bookmarksQuery.hasNextPage)

  // 事件处理
  const handleOpenForm = useCallback((bookmark?: Bookmark) => {
    if (bookmark) {
      setEditingBookmark(bookmark)
    } else {
      setEditingBookmark(null)
    }
    setShowForm(true)
  }, [setEditingBookmark, setShowForm])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingBookmark(null)
  }, [setShowForm, setEditingBookmark])

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
    const currentIndex = VIEW_MODES.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % VIEW_MODES.length
    const nextMode = VIEW_MODES[nextIndex]!
    setViewMode(nextMode)
    setStoredViewMode(nextMode)
    updatePreferences.mutate({ view_mode: nextMode })
  }, [viewMode, setViewMode, updatePreferences])

  const handleTagLayoutChange = useCallback((layout: 'grid' | 'masonry') => {
    setTagLayout(layout)
    updatePreferences.mutate({ tag_layout: layout })
  }, [setTagLayout, updatePreferences])

  const handleSortByChange = useCallback(() => {
    const currentIndex = SORT_OPTIONS.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
    const nextSort = SORT_OPTIONS[nextIndex]!
    setSortBy(nextSort)
    updatePreferences.mutate({ sort_by: nextSort })
  }, [sortBy, setSortBy, updatePreferences])

  const handleToggleSelect = useCallback((bookmarkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(bookmarkId)
        ? prev.filter((id) => id !== bookmarkId)
        : [...prev, bookmarkId]
    )
  }, [setSelectedIds])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(filteredBookmarks.map((b) => b.id))
  }, [filteredBookmarks, setSelectedIds])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
    setBatchMode(false)
  }, [setSelectedIds, setBatchMode])

  const handleBatchSuccess = useCallback(() => {
    setSelectedIds([])
    setBatchMode(false)
    bookmarksQuery.refetch()
    refetchTags()
  }, [setSelectedIds, setBatchMode, bookmarksQuery, refetchTags])

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
            {/* 顶部操作栏 */}
            <TopActionBar
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              searchKeyword={searchKeyword}
              setSearchKeyword={setSearchKeyword}
              sortBy={sortBy}
              onSortByChange={handleSortByChange}
              visibilityFilter={visibilityFilter}
              setVisibilityFilter={setVisibilityFilter}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              batchMode={batchMode}
              setBatchMode={setBatchMode}
              setSelectedIds={setSelectedIds}
              onOpenForm={() => handleOpenForm()}
              setIsTagSidebarOpen={setIsTagSidebarOpen}
            />

            {/* 批量操作提示栏 */}
            {batchMode && (
              <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 w-full">
                <div className="card bg-primary/10 border border-primary/20 w-full">
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
              </div>
            )}

            {/* 可滚动的书签列表区域 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pb-20 sm:pb-4 md:pb-6 w-full overscroll-contain touch-auto">
              <div className="space-y-3 sm:space-y-4 md:space-y-5 w-full min-w-0">
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
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsTagSidebarOpen(false)}
            />

            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background border-r border-border shadow-xl animate-in slide-in-from-left duration-300 flex flex-col">
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

              <div className="flex-1 overflow-y-auto p-4 bg-background min-h-0 overscroll-contain touch-auto">
                <TagSidebar
                  selectedTags={selectedTags}
                  onTagsChange={(tags) => {
                    setSelectedTags(tags)
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
