import { Calendar, Edit2, Check, X, Share2, FolderOpen, Download, Trash2, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { TabGroup } from '@/lib/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { DropdownMenu } from '@/components/common/DropdownMenu'

interface TabGroupHeaderProps {
  group: TabGroup
  isEditingTitle: boolean
  editingTitle: string
  onEditTitle: () => void
  onSaveTitle: () => void
  onCancelEdit: () => void
  onTitleChange: (title: string) => void
  onShareClick: () => void
  onOpenAll: () => void
  onExport: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function TabGroupHeader({
  group,
  isEditingTitle,
  editingTitle,
  onEditTitle,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  onShareClick,
  onOpenAll,
  onExport,
  onDelete,
  isDeleting,
}: TabGroupHeaderProps) {
  const isMobile = useIsMobile()

  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveTitle()
                  } else if (e.key === 'Escape') {
                    onCancelEdit()
                  }
                }}
                className="input flex-1"
                autoFocus
              />
              <button
                onClick={onSaveTitle}
                className="p-2 text-success hover:bg-success/10 rounded transition-colors"
                title="保存"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors"
                title="取消"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-foreground flex-1">
                {group.title}
              </h3>
              <button
                onClick={onEditTitle}
                className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors"
                title="重命名"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDistanceToNow(new Date(group.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>{group.items?.length || 0} 个标签页</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-4">
        {isMobile ? (
          /* 移动端：使用下拉菜单 */
          <DropdownMenu
            trigger={
              <button className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            }
            items={[
              {
                label: '打开全部',
                icon: <FolderOpen className="w-4 h-4" />,
                onClick: onOpenAll,
                disabled: !group.items || group.items.length === 0,
              },
              {
                label: '导出 Markdown',
                icon: <Download className="w-4 h-4" />,
                onClick: onExport,
                disabled: !group.items || group.items.length === 0,
              },
              {
                label: '分享',
                icon: <Share2 className="w-4 h-4" />,
                onClick: onShareClick,
              },
              {
                label: isDeleting ? '删除中...' : '删除',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: onDelete,
                disabled: isDeleting,
                danger: true,
              },
            ]}
          />
        ) : (
          /* 桌面端：显示所有按钮 */
          <>
            <button
              onClick={onOpenAll}
              disabled={!group.items || group.items.length === 0}
              className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="打开全部"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
            <button
              onClick={onExport}
              disabled={!group.items || group.items.length === 0}
              className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出 Markdown"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onShareClick}
              className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors"
              title="分享"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isDeleting ? '删除中...' : '删除'}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

