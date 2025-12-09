import { ExternalLink, Trash2, Edit2, Pin, CheckSquare, Check, X, GripVertical, FolderInput, MoreVertical } from 'lucide-react'
import type { TabGroupItem } from '@/lib/types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { DropdownMenu } from '@/components/common/DropdownMenu'

interface TabItemProps {
  item: TabGroupItem
  groupId: string
  isHighlighted: boolean
  isSelected: boolean
  batchMode: boolean
  editingItemId: string | null
  editingTitle: string
  onItemClick: (item: TabGroupItem, e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => void
  onEditItem: (item: TabGroupItem) => void
  onSaveEdit: (groupId: string, itemId: string) => void
  onTogglePin: (groupId: string, itemId: string, currentPinned: number) => void
  onToggleTodo: (groupId: string, itemId: string, currentTodo: number) => void
  onDeleteItem: (groupId: string, itemId: string, title: string) => void
  onMoveItem?: (item: TabGroupItem) => void
  setEditingItemId: (id: string | null) => void
  setEditingTitle: (title: string) => void
  extractDomain: (url: string) => string
}

export function TabItem({
  item,
  groupId,
  isHighlighted,
  isSelected,
  batchMode,
  editingItemId,
  editingTitle,
  onItemClick,
  onEditItem,
  onSaveEdit,
  onTogglePin,
  onToggleTodo,
  onDeleteItem,
  onMoveItem,
  setEditingItemId,
  setEditingTitle,
  extractDomain,
}: TabItemProps) {
  const isMobile = useIsMobile()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: item.id,
    animateLayoutChanges: () => false, // 禁用布局动画，避免闪烁
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none', // 完全禁用 transition，避免从下往上拖拽时闪烁
    opacity: isDragging ? 0.4 : 1,
  }

  const isEditing = editingItemId === item.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded border ${
        isMobile ? 'p-4 min-h-[60px]' : 'p-3'
      } ${
        isHighlighted
          ? 'bg-warning/10 border-warning/30'
          : isSelected
            ? 'bg-primary/10 border-primary/30'
            : 'bg-card border-border hover:bg-muted'
      }`}
    >
      {/* Drag Handle */}
      {!batchMode && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Checkbox for batch mode */}
      {batchMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onItemClick(item, e)
          }}
          className="checkbox"
        />
      )}

      {/* Favicon */}
      <img
        src={item.favicon || `https://www.google.com/s2/favicons?domain=${extractDomain(item.url)}&sz=32`}
        alt=""
        className="w-5 h-5 flex-shrink-0"
        onError={(e) => {
          const target = e.currentTarget
          const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${extractDomain(item.url)}&sz=32`
          // 如果当前不是 Google Favicon API，先尝试它
          if (!target.src.includes('google.com/s2/favicons')) {
            target.src = googleFaviconUrl
          } else {
            // 最终回退到默认图标
            target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>')
          }
        }}
      />

      {/* Title and URL */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit(groupId, item.id)
              } else if (e.key === 'Escape') {
                setEditingItemId(null)
              }
            }}
            className="input w-full text-sm"
            autoFocus
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground hover:text-primary truncate"
                onClick={(e) => !batchMode && e.stopPropagation()}
              >
                {item.title}
              </a>
              {item.is_pinned === 1 && (
                <Pin className="w-3 h-3 text-warning flex-shrink-0" />
              )}
              {item.is_todo === 1 && (
                <CheckSquare className="w-3 h-3 text-accent flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{item.url}</p>
          </>
        )}
      </div>

      {/* Actions */}
      {!batchMode && (
        <div className={`flex items-center gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          {isEditing ? (
            <>
              <button
                onClick={() => onSaveEdit(groupId, item.id)}
                className="p-1.5 text-success hover:bg-success/10 rounded transition-colors"
                title="保存"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingItemId(null)}
                className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                title="取消"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : isMobile ? (
            /* 移动端：使用下拉菜单 */
            <DropdownMenu
              trigger={
                <button className="p-2 text-muted-foreground hover:bg-muted rounded transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              }
              items={[
                {
                  label: '打开链接',
                  icon: <ExternalLink className="w-4 h-4" />,
                  onClick: () => window.open(item.url, '_blank'),
                },
                {
                  label: '编辑',
                  icon: <Edit2 className="w-4 h-4" />,
                  onClick: () => onEditItem(item),
                },
                {
                  label: item.is_pinned === 1 ? '取消固定' : '固定',
                  icon: <Pin className="w-4 h-4" />,
                  onClick: () => onTogglePin(groupId, item.id, item.is_pinned || 0),
                },
                {
                  label: item.is_todo === 1 ? '取消待办' : '标记待办',
                  icon: <CheckSquare className="w-4 h-4" />,
                  onClick: () => onToggleTodo(groupId, item.id, item.is_todo || 0),
                },
                ...(onMoveItem ? [{
                  label: '移动到其他组',
                  icon: <FolderInput className="w-4 h-4" />,
                  onClick: () => onMoveItem(item),
                }] : []),
                {
                  label: '删除',
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: () => onDeleteItem(groupId, item.id, item.title),
                  danger: true,
                },
              ]}
            />
          ) : (
            /* 桌面端：显示所有按钮 */
            <>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                title="打开链接"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => onEditItem(item)}
                className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                title="编辑"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTogglePin(groupId, item.id, item.is_pinned || 0)}
                className={`p-1.5 rounded transition-colors ${
                  item.is_pinned === 1
                    ? 'text-warning bg-warning/10 hover:bg-warning/20'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                title={item.is_pinned === 1 ? '取消固定' : '固定'}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleTodo(groupId, item.id, item.is_todo || 0)}
                className={`p-1.5 rounded transition-colors ${
                  item.is_todo === 1
                    ? 'text-accent bg-accent/10 hover:bg-accent/20'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                title={item.is_todo === 1 ? '取消待办' : '标记待办'}
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              {onMoveItem && (
                <button
                  onClick={() => onMoveItem(item)}
                  className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                  title="移动到其他组"
                >
                  <FolderInput className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDeleteItem(groupId, item.id, item.title)}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

