import { Menu, Search, MoreVertical } from 'lucide-react'

interface MobileHeaderProps {
  title: string
  onMenuClick?: () => void
  onSearchClick?: () => void
  onMoreClick?: () => void
  showMenu?: boolean
  showSearch?: boolean
  showMore?: boolean
}

/**
 * 移动端顶部工具栏
 */
export function MobileHeader({
  title,
  onMenuClick,
  onSearchClick,
  onMoreClick,
  showMenu = true,
  showSearch = true,
  showMore = true,
}: MobileHeaderProps) {
  return (
    <header
      className="sticky top-0 left-0 right-0 border-b border-border z-30 md:hidden"
      style={{ backgroundColor: 'var(--card)' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* 左侧：菜单按钮 */}
        <div className="flex items-center gap-2">
          {showMenu && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="打开菜单"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 中间：标题 */}
        <h1 className="text-lg font-semibold text-foreground truncate flex-1 text-center">
          {title}
        </h1>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {showSearch && onSearchClick && (
            <button
              onClick={onSearchClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="搜索"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          {showMore && onMoreClick && (
            <button
              onClick={onMoreClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="更多"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

