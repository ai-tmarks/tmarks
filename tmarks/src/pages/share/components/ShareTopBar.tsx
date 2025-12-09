import type { ViewMode, VisibilityFilter } from '../hooks/usePublicShareState'
import type { SortOption } from '@/components/common/SortSelector'

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

interface ShareTopBarProps {
  searchMode: 'bookmark' | 'tag'
  setSearchMode: (mode: 'bookmark' | 'tag') => void
  searchKeyword: string
  setSearchKeyword: (keyword: string) => void
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
  visibilityFilter: VisibilityFilter
  setVisibilityFilter: (filter: VisibilityFilter) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  setIsTagSidebarOpen: (open: boolean) => void
}

const SORT_OPTIONS: SortOption[] = ['created', 'updated', 'pinned', 'popular']
const VIEW_MODES = ['list', 'card', 'minimal', 'title'] as const

export function ShareTopBar({
  searchMode,
  setSearchMode,
  searchKeyword,
  setSearchKeyword,
  sortBy,
  setSortBy,
  visibilityFilter,
  setVisibilityFilter,
  viewMode,
  setViewMode,
  setIsTagSidebarOpen,
}: ShareTopBarProps) {
  const handleSortChange = () => {
    const currentIndex = SORT_OPTIONS.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
    setSortBy(SORT_OPTIONS[nextIndex]!)
  }

  const handleViewModeChange = () => {
    const currentIndex = VIEW_MODES.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % VIEW_MODES.length
    setViewMode(VIEW_MODES[nextIndex]!)
  }

  const handleVisibilityChange = () => {
    const filters: VisibilityFilter[] = ['all', 'public', 'private']
    const currentIndex = filters.indexOf(visibilityFilter)
    const nextIndex = (currentIndex + 1) % filters.length
    setVisibilityFilter(filters[nextIndex]!)
  }

  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'list': return '列表视图'
      case 'card': return '卡片视图'
      case 'minimal': return '极简列表'
      case 'title': return '标题瀑布'
    }
  }

  return (
    <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-3 sm:pb-4 w-full">
      <div className="card shadow-float w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:min-w-[280px]">
            <button
              onClick={() => setIsTagSidebarOpen(true)}
              className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-card border border-border hover:bg-muted hover:border-primary/30 text-foreground"
              title="打开标签"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <div className="relative w-full">
                <button
                  onClick={() => setSearchMode(searchMode === 'bookmark' ? 'tag' : 'bookmark')}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all hover:text-primary"
                >
                  {searchMode === 'bookmark' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  )}
                </button>

                <svg className="absolute left-10 sm:left-12 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

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

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            <button
              onClick={handleSortChange}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-muted text-foreground hover:bg-muted/80"
              title={`${SORT_LABELS[sortBy]} (点击切换)`}
            >
              <SortIcon sort={sortBy} />
            </button>

            <button
              onClick={handleVisibilityChange}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float ${
                visibilityFilter === 'all'
                  ? 'bg-muted text-foreground hover:bg-muted/80'
                  : visibilityFilter === 'public'
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-warning/10 text-warning hover:bg-warning/20'
              }`}
              title={`${VISIBILITY_LABELS[visibilityFilter]} (点击切换)`}
            >
              <VisibilityIcon filter={visibilityFilter} />
            </button>

            <button
              onClick={handleViewModeChange}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-float bg-muted text-foreground hover:bg-muted/80"
              title={`${getViewModeLabel(viewMode)} (点击切换)`}
            >
              <ViewModeIcon mode={viewMode} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
