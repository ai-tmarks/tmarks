import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Circle,
  MoreHorizontal,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { DropdownMenu } from '@/components/common/DropdownMenu'
import { useTabGroupMenu } from '@/hooks/useTabGroupMenu'
import { buildTreeNodeMenu } from './TreeNodeMenu'
import { getTotalItemCount } from './TreeUtils'
import type { TabGroup } from '@/lib/types'

interface TreeNodeProps {
  group: TabGroup
  level: number
  isLast: boolean
  parentLines: boolean[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
  expandedGroups: Set<string>
  toggleGroup: (groupId: string, e: React.MouseEvent) => void
  editingGroupId: string | null
  setEditingGroupId: (id: string | null) => void
  editingTitle: string
  setEditingTitle: (title: string) => void
  onRenameGroup?: (groupId: string, newTitle: string) => Promise<void>
  onRefresh?: () => Promise<void>
  activeId: string | null
  overId: string | null
  dropPosition: 'before' | 'inside' | 'after' | null
  onOpenMoveDialog?: (group: TabGroup) => void
}

export function TreeNode({
  group,
  level,
  isLast,
  parentLines,
  selectedGroupId,
  onSelectGroup,
  expandedGroups,
  toggleGroup,
  editingGroupId,
  setEditingGroupId,
  editingTitle,
  setEditingTitle,
  onRenameGroup,
  onRefresh,
  activeId,
  overId,
  dropPosition,
  onOpenMoveDialog,
}: TreeNodeProps) {
  const isSelected = selectedGroupId === group.id
  const isExpanded = expandedGroups.has(group.id)
  const hasChildren = (group.children?.length || 0) > 0
  const isFolder = group.is_folder === 1
  const isEditing = editingGroupId === group.id
  const isBeingDragged = activeId === group.id
  const isDropTarget = overId === group.id && !isBeingDragged
  const isLocked = group.tags?.includes('__locked__') || false

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id: group.id,
    data: {
      type: isFolder ? 'folder' : 'group',
      parentId: group.parent_id,
    },
    disabled: isLocked,
    // 完全禁用布局动画
    animateLayoutChanges: () => false,
  })

  // 不应用 transform，元素保持原位置不动
  // 只通过 DragOverlay 显示拖拽预览，通过指示器显示插入位置
  const style = {
    opacity: isDragging ? 0.5 : 1,
    cursor: isLocked ? 'not-allowed' : 'grab',
  }

  const handleRenameSubmit = async () => {
    if (!editingTitle.trim() || editingTitle === group.title) {
      setEditingGroupId(null)
      setEditingTitle(group.title)
      return
    }

    try {
      await onRenameGroup?.(group.id, editingTitle.trim())
      setEditingGroupId(null)
    } catch (error) {
      console.error('Failed to rename:', error)
      setEditingTitle(group.title)
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setEditingGroupId(null)
      setEditingTitle(group.title)
    }
  }

  const menuActions = useTabGroupMenu({
    onRefresh: onRefresh || (async () => {}),
    onStartRename: (groupId, title) => {
      setEditingGroupId(groupId)
      setEditingTitle(title)
    },
    onOpenMoveDialog
  })

  const menuItems = buildTreeNodeMenu({
    group,
    isFolder,
    isLocked,
    menuActions
  })

  // 拖放指示器样式
  let dropIndicatorClass = ''
  if (isDropTarget && dropPosition) {
    if (dropPosition === 'before') {
      dropIndicatorClass = 'border-t-2 border-t-primary'
    } else if (dropPosition === 'after') {
      dropIndicatorClass = 'border-b-2 border-b-primary'
    } else if (dropPosition === 'inside' && isFolder) {
      dropIndicatorClass = 'bg-primary/10 border-2 border-primary border-dashed'
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* 拖放指示器 - before（蓝色横线 + 左侧圆点） */}
      {isDropTarget && dropPosition === 'before' && (
        <div className="relative h-1 mx-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border-2 border-background" />
          <div className="absolute left-2 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary" />
        </div>
      )}

      {/* 节点行 */}
      <div
        style={{
          paddingLeft: `${level * 20 + 12}px`, // 使用缩进代替树状线
        }}
        className={`treeItem group flex items-center gap-1 py-1.5 pr-3 hover:bg-muted relative ${
          isSelected ? 'bg-primary/10' : ''
        } ${isBeingDragged ? 'opacity-50' : ''} ${dropIndicatorClass}`}
      >
        
        {/* 展开/折叠按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleGroup(group.id, e)
          }}
          className="w-4 h-4 flex items-center justify-center hover:bg-muted rounded flex-shrink-0 mr-1"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
        </button>

        {/* 图标和标题区域 - 可拖拽区域 */}
        <div
          {...attributes}
          {...(isLocked ? {} : listeners)}
          className={`flex items-center gap-1.5 flex-1 min-w-0 ${
            isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          {/* 图标 */}
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )
          ) : (
            <Circle
              className={`w-2 h-2 flex-shrink-0 ${isSelected ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
          )}

          {/* 标题 */}
          {isEditing ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="text-[13px] flex-1 px-1 py-0.5 border border-primary rounded bg-card text-foreground focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onSelectGroup(group.id)
              }}
              className={`text-[13px] flex-1 truncate leading-[19px] ${
                isSelected ? 'font-semibold text-primary' : 'text-foreground'
              }`}
            >
              {group.title}
            </span>
          )}

          {/* 标签页数量 */}
          {!isEditing && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">
              {getTotalItemCount(group)}
            </span>
          )}
        </div>

        {/* 右键菜单 */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
            <DropdownMenu 
              trigger={
                <button className="p-0.5 hover:bg-muted rounded">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              }
              items={menuItems} 
            />
          </div>
        )}
      </div>

      {/* 拖放指示器 - after（蓝色横线 + 左侧圆点） */}
      {isDropTarget && dropPosition === 'after' && (
        <div className="relative h-1 mx-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border-2 border-background" />
          <div className="absolute left-2 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary" />
        </div>
      )}

      {/* 空文件夹拖放区域 - 当拖拽到空文件夹内部时显示 */}
      {isFolder && isDropTarget && dropPosition === 'inside' && !hasChildren && (
        <div
          className="mx-2 py-3 border-2 border-dashed border-primary rounded-lg bg-primary/5 text-center"
          style={{ marginLeft: `${(level + 1) * 20 + 12}px` }}
        >
          <span className="text-xs text-primary font-medium">放置到此文件夹</span>
        </div>
      )}

      {/* 子节点 */}
      {isExpanded && hasChildren && group.children && (
        <div>
          {group.children?.map((child, index) => (
            <TreeNode
              key={child.id}
              group={child}
              level={level + 1}
              isLast={index === (group.children?.length ?? 0) - 1}
              parentLines={[...parentLines, !isLast]}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              editingGroupId={editingGroupId}
              setEditingGroupId={setEditingGroupId}
              editingTitle={editingTitle}
              setEditingTitle={setEditingTitle}
              onRenameGroup={onRenameGroup}
              onRefresh={onRefresh}
              activeId={activeId}
              overId={overId}
              dropPosition={dropPosition}
              onOpenMoveDialog={onOpenMoveDialog}
            />
          ))}
        </div>
      )}
    </div>
  )
}
