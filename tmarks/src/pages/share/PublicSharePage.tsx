import { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { TagSidebar } from '@/components/tags/TagSidebar'
import { BookmarkListContainer } from '@/components/bookmarks/BookmarkListContainer'
import { PaginationFooter } from '@/components/common/PaginationFooter'
import { SortSelector, type SortOption } from '@/components/common/SortSelector'
import { usePublicShare } from '@/hooks/useShare'
import type { Bookmark, Tag } from '@/lib/types'

const VIEW_MODES = ['list', 'minimal', 'card', 'title'] as const
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

// 分页配置
const PAGE_SIZE = 30 // 每页显示30个书签

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



export function PublicSharePage() {
  const { slug = '' } = useParams()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [tagLayout, setTagLayout] = useState<'grid' | 'masonry'>('grid')
  const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const viewMenuButtonRef = useRef<HTMLButtonElement>(null)
  const visibilityMenuButtonRef = useRef<HTMLButtonElement>(null)
  const viewMenuContentRef = useRef<HTMLDivElement | null>(null)
  const visibilityMenuContentRef = useRef<HTMLDivElement | null>(null)
  const [viewMenuPosition, setViewMenuPosition] = useState<MenuPosition | null>(null)
  const [visibilityMenuPosition, setVisibilityMenuPosition] = useState<MenuPosition | null>(null)
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false)
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false)
  const autoCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)

  const shareQuery = usePublicShare(slug, Boolean(slug))
  const allBookmarks = useMemo(() => shareQuery.data?.bookmarks || [], [shareQuery.data?.bookmarks])

  // 完整筛选后的书签列表（用于分页）
  const allFilteredBookmarks = useMemo(() => {
    // 1. 可见性筛选
    const byVisibility = visibilityFilter === 'all'
      ? allBookmarks
      : visibilityFilter === 'public'
        ? allBookmarks.filter((bookmark: Bookmark) => bookmark.is_public)
        : allBookmarks.filter((bookmark: Bookmark) => !bookmark.is_public)

    // 2. 标签筛选
    const byTags = selectedTags.length
      ? byVisibility.filter((bookmark: Bookmark) => {
          const bookmarkTagIds = bookmark.tags?.map((t: Tag) => t.id) || []
          return selectedTags.every((tagId) => bookmarkTagIds.includes(tagId))
        })
      : byVisibility

    // 3. 关键词搜索
    const byKeyword = searchKeyword.trim()
      ? byTags.filter((bookmark: Bookmark) => {
          const keyword = searchKeyword.trim().toLowerCase()
          return (
            bookmark.title.toLowerCase().includes(keyword) ||
            (bookmark.description || '').toLowerCase().includes(keyword) ||
            bookmark.url.toLowerCase().includes(keyword)
          )
        })
      : byTags

    // 4. 排序
    const sorted = [...byKeyword].sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'pinned':
          if (a.is_pinned !== b.is_pinned) {
            return Number(b.is_pinned) - Number(a.is_pinned)
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':
          if ((b.click_count || 0) !== (a.click_count || 0)) {
            return (b.click_count || 0) - (a.click_count || 0)
          }
          if (b.last_clicked_at && a.last_clicked_at) {
            return new Date(b.last_clicked_at).getTime() - new Date(a.last_clicked_at).getTime()
          }
          return 0
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return sorted
  }, [allBookmarks, selectedTags, searchKeyword, sortBy, visibilityFilter])

  // 当前页显示的书签（分页后）
  const displayedBookmarks = useMemo(() => {
    return allFilteredBookmarks.slice(0, currentPage * PAGE_SIZE)
  }, [allFilteredBookmarks, currentPage])

  // 分页信息
  const hasMore = displayedBookmarks.length < allFilteredBookmarks.length
  const currentPageCount = Math.min(PAGE_SIZE, allFilteredBookmarks.length - (currentPage - 1) * PAGE_SIZE)

  const shareInfo = shareQuery.data?.profile
  const tags = shareQuery.data?.tags || []

  // 当筛选条件改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTags, searchKeyword, sortBy, visibilityFilter])

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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
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

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1)
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
      {shareQuery.isLoading && (
        <div className="text-center text-base-content/60 py-24">正在加载公开书签...</div>
      )}

      {shareQuery.isError && !shareQuery.isLoading && (
        <div className="text-center text-base-content/60 py-24">分享链接无效或内容已下线。</div>
      )}

      {!shareQuery.isLoading && !shareQuery.isError && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
          <aside className="hidden lg:block lg:col-span-3 order-2 lg:order-1 fixed top-[calc(5rem+0.75rem)] sm:top-[calc(5rem+1rem)] md:top-[calc(5rem+1.5rem)] left-3 sm:left-4 md:left-6 bottom-3 w-[calc(25%-1.5rem)] z-40">
            <TagSidebar
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              bookmarks={allBookmarks}
              isLoadingBookmarks={shareQuery.isLoading}
              tagLayout={tagLayout}
              onTagLayoutChange={setTagLayout}
              readOnly
              availableTags={tags}
            />
          </aside>

          <main className="lg:col-span-9 lg:col-start-4 order-1 lg:order-2">
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            {/* 分享信息卡片 */}
            <div className="card shadow-float">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-primary">
                    {shareInfo?.title || `${shareInfo?.username || '访客'}的书签精选`}
                  </h1>
                  {shareInfo?.description && (
                    <p className="text-sm text-base-content/70 mt-1">{shareInfo.description}</p>
                  )}
                </div>
                {/* 统计信息 */}
                {allBookmarks.length > 0 && (
                  <div className="text-sm text-base-content/60">
                    {allFilteredBookmarks.length === allBookmarks.length ? (
                      <span>共 {allBookmarks.length} 个书签</span>
                    ) : (
                      <span>
                        筛选出 {allFilteredBookmarks.length} / {allBookmarks.length} 个书签
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

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
                  <div className="relative flex-1">
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
                  </div>
                </div>
              </div>
            </div>

            {/* 书签列表 */}
            {displayedBookmarks.length > 0 ? (
              <>
                <BookmarkListContainer
                  bookmarks={displayedBookmarks}
                  viewMode={viewMode}
                  readOnly
                />

                {/* 分页控制 */}
                <PaginationFooter
                  hasMore={hasMore}
                  isLoading={false}
                  onLoadMore={handleLoadMore}
                  currentCount={currentPageCount}
                  totalLoaded={displayedBookmarks.length}
                />
              </>
            ) : !shareQuery.isLoading && allBookmarks.length > 0 ? (
              <div className="card text-center py-12">
                <div className="text-base-content/40 mb-2">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg font-medium">没有找到匹配的书签</p>
                  <p className="text-sm mt-2">尝试调整筛选条件或搜索关键词</p>
                </div>
              </div>
            ) : null}
          </div>
          </main>
        </div>
      )}

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
                onTagLayoutChange={setTagLayout}
                bookmarks={allBookmarks}
                isLoadingBookmarks={shareQuery.isLoading}
                readOnly
                availableTags={tags}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
