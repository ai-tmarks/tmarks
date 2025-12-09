/**
 * 固定标签页区域组件
 * 显示所有分组中被固定的标签页
 */

import { Pin, ExternalLink, Folder } from 'lucide-react'
import type { TabGroup, TabGroupItem } from '@/lib/types'

interface PinnedItem extends TabGroupItem {
  groupTitle: string
  groupId: string
}

interface PinnedItemsSectionProps {
  tabGroups: TabGroup[]
  onUnpin?: (groupId: string, itemId: string) => void
}

export function PinnedItemsSection({ tabGroups, onUnpin }: PinnedItemsSectionProps) {
  // 收集所有固定的标签页
  const pinnedItems: PinnedItem[] = []
  
  tabGroups.forEach(group => {
    if (group.items && group.items.length > 0) {
      group.items.forEach(item => {
        if (item.is_pinned === 1) {
          pinnedItems.push({
            ...item,
            groupTitle: group.title,
            groupId: group.id,
          })
        }
      })
    }
  })

  // 如果没有固定的标签页，不显示这个区域
  if (pinnedItems.length === 0) {
    return null
  }

  return (
    <div className="mb-6 card p-6 border-l-4 border-l-warning bg-warning/5">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Pin className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-semibold text-foreground">
          固定标签页
        </h2>
        <span className="text-sm text-muted-foreground">
          ({pinnedItems.length})
        </span>
      </div>

      {/* 固定标签页列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pinnedItems.map(item => (
          <div
            key={item.id}
            className="group flex items-start gap-3 p-3 rounded border border-border bg-card hover:bg-muted hover:border-warning/50 transition-all"
          >
            {/* 固定图标按钮 - 点击取消固定 */}
            {onUnpin ? (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onUnpin(item.groupId, item.id)
                }}
                className="flex-shrink-0 mt-0.5 p-1 text-warning hover:bg-warning/10 rounded transition-colors"
                title="取消固定"
              >
                <Pin className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex-shrink-0 mt-0.5 p-1">
                <Pin className="w-4 h-4 text-warning" />
              </div>
            )}

            {/* Favicon */}
            <div className="flex-shrink-0 mt-0.5">
              {item.favicon ? (
                <img
                  src={item.favicon}
                  alt=""
                  className="w-5 h-5 rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* 内容 - 可点击打开链接 */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 flex items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                {/* 标题 */}
                <div className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                  {item.title}
                </div>
                
                {/* 分组名称 */}
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Folder className="w-3 h-3" />
                  <span className="truncate">{item.groupTitle}</span>
                </div>
              </div>

              {/* 外部链接图标 */}
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
