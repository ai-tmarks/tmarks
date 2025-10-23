import type { TabGroup } from '@/lib/types'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Circle,
  FolderPlus,
  ExternalLink,
  Edit2,
  Share2,
  Copy,
  FolderPlus as FolderPlusIcon,
  FilePlus,
  Trash2,
  Move,
  Lock,
  Pin
} from 'lucide-react'
import { useState, useRef } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { DropdownMenu, type MenuItem } from '@/components/common/DropdownMenu'
import { useTabGroupMenu } from '@/hooks/useTabGroupMenu'
import { MoveToFolderDialog } from './MoveToFolderDialog'

interface TabGroupTreeProps {
  tabGroups: TabGroup[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
  onCreateFolder?: () => void
  onRenameGroup?: (groupId: string, newTitle: string) => Promise<void>
  onMoveGroup?: (groupId: string, newParentId: string | null, newPosition: number) => Promise<void>
  onRefresh?: () => Promise<void>
}

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

// 构建树形结构
function buildTree(groups: TabGroup[]): TabGroup[] {
  const groupMap = new Map<string, TabGroup>()
  const rootGroups: TabGroup[] = []

  // 第一遍：创建映射并初始化 children
  groups.forEach(group => {
    groupMap.set(group.id, { ...group, children: [] })
  })

  // 第二遍：构建父子关系
  groups.forEach(group => {
    const node = groupMap.get(group.id)!
    if (group.parent_id) {
      const parent = groupMap.get(group.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        // 父节点不存在，作为根节点
        rootGroups.push(node)
      }
    } else {
      rootGroups.push(node)
    }
  })

  // 按 position 排序所有层级
  const sortByPosition = (nodes: TabGroup[]) => {
    nodes.sort((a, b) => (a.position || 0) - (b.position || 0))
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortByPosition(node.children)
      }
    })
  }

  sortByPosition(rootGroups)
  return rootGroups
}

// 树形节点组件
function TreeNode({
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

  // Sortable hook for drag and drop
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
    disabled: isLocked // 锁定时禁用拖拽
  })

  // 拖拽时的样式：增强视觉反馈
  const style = {
    opacity: isDragging ? 0.4 : 1,
    cursor: isLocked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
    transition: 'opacity 0.2s ease',
  }

  // 防止双击与单击冲突
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickCountRef = useRef(0)

  const handleClick = () => {
    clickCountRef.current++

    if (clickCountRef.current === 1) {
      // 第一次点击：设置延迟
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0
      }, 300)
    } else if (clickCountRef.current === 2) {
      // 第二次点击：触发双击
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
      clickCountRef.current = 0
      handleDoubleClick()
    }
  }

  const handleDoubleClick = () => {
    if (onRenameGroup && !isLocked) {
      setEditingGroupId(group.id)
      setEditingTitle(group.title)
    }
  }

  const handleRenameSubmit = async () => {
    const trimmedTitle = editingTitle.trim()

    // 输入验证
    if (!trimmedTitle) {
      alert('标题不能为空')
      return
    }

    if (trimmedTitle.length > 100) {
      alert('标题长度不能超过 100 个字符')
      return
    }

    // 检查特殊字符（可选）
    const invalidChars = /[<>:"/\\|?*]/g
    if (invalidChars.test(trimmedTitle)) {
      alert('标题不能包含特殊字符: < > : " / \\ | ? *')
      return
    }

    if (trimmedTitle === group.title) {
      setEditingGroupId(null)
      return
    }

    if (onRenameGroup) {
      try {
        await onRenameGroup(group.id, trimmedTitle)
        setEditingGroupId(null)
      } catch (error) {
        console.error('Failed to rename:', error)
        alert('重命名失败，请重试')
      }
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

  // 使用菜单 hook
  const menuActions = useTabGroupMenu({
    onRefresh: onRefresh || (async () => {}),
    onStartRename: (groupId, title) => {
      setEditingGroupId(groupId)
      setEditingTitle(title)
    },
    onOpenMoveDialog
  })

  // 构建菜单项
  const menuItems: MenuItem[] = [
    // 打开功能
    {
      label: '在新窗口中打开',
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: () => menuActions.onOpenInNewWindow(group),
      disabled: isFolder
    },
    {
      label: '在此窗口中打开',
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: () => menuActions.onOpenInCurrentWindow(group),
      disabled: isFolder
    },
    // 编辑功能
    {
      label: '重命名',
      icon: <Edit2 className="w-4 h-4" />,
      onClick: () => menuActions.onRename(group),
      disabled: isLocked,
      divider: true
    },
    {
      label: '共享为网页',
      icon: <Share2 className="w-4 h-4" />,
      onClick: () => menuActions.onShare(group),
      disabled: isFolder
    },
    {
      label: '复制到剪贴板',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => menuActions.onCopyToClipboard(group)
    },
    // 创建功能
    {
      label: '在上方创建文件夹',
      icon: <FolderPlusIcon className="w-4 h-4" />,
      onClick: () => menuActions.onCreateFolderAbove(group),
      divider: true
    },
    {
      label: '在内部创建文件夹',
      icon: <FolderPlusIcon className="w-4 h-4" />,
      onClick: () => menuActions.onCreateFolderInside(group),
      disabled: !isFolder
    },
    {
      label: '在下方创建文件夹',
      icon: <FolderPlusIcon className="w-4 h-4" />,
      onClick: () => menuActions.onCreateFolderBelow(group)
    },
    {
      label: '在上方创建分组',
      icon: <FilePlus className="w-4 h-4" />,
      onClick: () => menuActions.onCreateGroupAbove(group)
    },
    {
      label: '在内部创建分组',
      icon: <FilePlus className="w-4 h-4" />,
      onClick: () => menuActions.onCreateGroupInside(group),
      disabled: !isFolder
    },
    {
      label: '在下方创建分组',
      icon: <FilePlus className="w-4 h-4" />,
      onClick: () => menuActions.onCreateGroupBelow(group)
    },
    // 管理功能
    {
      label: '移除重复项',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => menuActions.onRemoveDuplicates(group),
      disabled: isFolder,
      divider: true
    },
    {
      label: '移动',
      icon: <Move className="w-4 h-4" />,
      onClick: () => menuActions.onMove(group),
      disabled: isLocked
    },
    {
      label: '固定到顶部',
      icon: <Pin className="w-4 h-4" />,
      onClick: () => menuActions.onPinToTop(group)
    },
    {
      label: isLocked ? '解锁' : '锁定',
      icon: <Lock className="w-4 h-4" />,
      onClick: () => menuActions.onLock(group)
    },
    // 删除功能
    {
      label: '移至回收站',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => menuActions.onMoveToTrash(group),
      disabled: isLocked,
      danger: true,
      divider: true
    }
  ]

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* 拖动目标指示器 - 插入到上方 */}
      {isDropTarget && dropPosition === 'before' && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '-2px',
            height: '3px',
            backgroundColor: '#3b82f6',
            borderRadius: '2px',
            zIndex: 999,
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}

      {/* 拖动目标指示器 - 放入文件夹内部 */}
      {isDropTarget && dropPosition === 'inside' && isFolder && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: '2px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '6px',
            zIndex: 999,
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}

      {/* 拖动目标指示器 - 插入到下方 */}
      {isDropTarget && dropPosition === 'after' && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: '-2px',
            height: '3px',
            backgroundColor: '#3b82f6',
            borderRadius: '2px',
            zIndex: 999,
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}

      {/* 节点行 */}
      <div
        className={`group flex items-center gap-1 px-3 py-1.5 hover:bg-muted relative ${
          isSelected ? 'bg-primary/10' : ''
        } ${isBeingDragged ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${12 + level * 20}px` }}
      >
        {/* 树形连接线 - 使用伪元素和 border */}
        {level > 0 && (
          <div
            className="absolute left-0 top-0 h-full pointer-events-none"
            style={{
              width: `${12 + level * 20}px`
            }}
          >
            {/* 渲染每一层的垂直线和水平线 */}
            {Array.from({ length: level }).map((_, idx) => {
              const isCurrentLevel = idx === level - 1
              const shouldDrawVertical = idx < level - 1 ? parentLines[idx] : !isLast
              const lineLeft = 12 + idx * 20

              return (
                <div key={idx} className="absolute" style={{ left: `${lineLeft}px`, top: 0, height: '100%' }}>
                  {/* 垂直线 */}
                  {shouldDrawVertical && (
                    <div
                      className="absolute left-0 top-0 w-px h-full bg-border/50"
                    />
                  )}
                  {/* 当前层级的连接线 */}
                  {isCurrentLevel && (
                    <>
                      {/* 垂直线（上半部分） */}
                      <div
                        className="absolute left-0 top-0 w-px h-1/2 bg-border/50"
                      />
                      {/* 水平线 */}
                      <div
                        className="absolute left-0 top-1/2 w-2 h-px bg-border/50"
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {/* 内容区域 */}
        <div className="flex items-center gap-2 flex-1">

          {/* 展开/折叠按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleGroup(group.id, e)
            }}
            className="w-4 h-4 flex items-center justify-center hover:bg-muted rounded flex-shrink-0"
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

          {/* 图标和标题区域 - 整行可拖拽 */}
          <div
            {...attributes}
            {...(isLocked ? {} : listeners)}
            className={`flex items-center gap-2 flex-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          >
            {/* 图标 */}
            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-primary flex-shrink-0" />
              )
            ) : (
              <Circle
                className={`w-2 h-2 flex-shrink-0 text-primary ${isSelected ? 'fill-current' : ''}`}
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
                className="text-sm flex-1 px-1 py-0.5 border border-primary rounded bg-card text-foreground focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectGroup(group.id)
                  handleClick()
                }}
                className={`text-sm flex-1 truncate cursor-pointer ${
                  isSelected ? 'text-primary font-medium' : 'text-foreground'
                }`}
              >
                {group.title}
              </span>
            )}
          </div>

          {/* 锁定图标 */}
          {isLocked && (
            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}

          {/* 数量 */}
          {!isFolder && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{group.item_count || 0}</span>
          )}

          {/* 三点菜单 */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <DropdownMenu
              trigger={
                <button className="p-1 hover:bg-muted rounded transition-colors">
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                  </svg>
                </button>
              }
              items={menuItems}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* 子节点 */}
      {isExpanded && hasChildren && (
        <div>
          {group.children!.map((child, index) => (
            <TreeNode
              key={child.id}
              group={child}
              level={level + 1}
              isLast={index === group.children!.length - 1}
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

// 拖放位置类型
type DropPosition = 'before' | 'inside' | 'after'

export function TabGroupTree({
  tabGroups,
  selectedGroupId,
  onSelectGroup,
  onCreateFolder,
  onRenameGroup,
  onMoveGroup,
  onRefresh,
}: TabGroupTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movingGroup, setMovingGroup] = useState<TabGroup | null>(null)
  const pointerInitialYRef = useRef<number | null>(null)
  const pointerInitialXRef = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动 8px 后才开始拖拽
      },
    }),
    useSensor(KeyboardSensor)
  )

  // 简化的碰撞检测：优先使用 pointerWithin，其次使用 closestCenter
  const collisionDetection: CollisionDetection = (args) => {
    // 1. 优先使用指针位置检测（最精确）
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions && pointerCollisions.length > 0) {
      return pointerCollisions
    }

    // 2. 使用最近中心点检测（作为后备）
    return closestCenter(args)
  }

  const totalCount = tabGroups.reduce((sum, group) => {
    if (group.is_folder === 1) return sum
    return sum + (group.item_count || 0)
  }, 0)

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string
    const draggedGroup = tabGroups.find(g => g.id === draggedId)
    console.log('🚀🚀🚀 Drag Start:', {
      id: draggedId,
      title: draggedGroup?.title,
      isFolder: draggedGroup?.is_folder
    })
    if (event.activatorEvent instanceof PointerEvent) {
      pointerInitialYRef.current = event.activatorEvent.clientY
      pointerInitialXRef.current = event.activatorEvent.clientX
    } else {
      pointerInitialYRef.current = null
      pointerInitialXRef.current = null
    }
    setActiveId(draggedId)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | null
    setOverId(overId)

    if (!overId || !event.over) {
      setDropPosition(null)
      return
    }

    // 获取目标元素
    const overGroup = tabGroups.find(g => g.id === overId)
    if (!overGroup) {
      setDropPosition(null)
      return
    }

    const overRect = event.over.rect
    const activeRect = event.active.rect.current
    const initialRect = activeRect.initial

    if (!overRect || !initialRect || overRect.height === 0) {
      setDropPosition(null)
      return
    }

    // translated 在未应用 transform 时可能为 null，因此回退到初始 + delta。优先使用真实指针位置，提升靠近时的命中率。
    const translatedRect = activeRect.translated
    let pointerY: number
    let pointerX: number
    if (pointerInitialYRef.current !== null) {
      pointerY = pointerInitialYRef.current + event.delta.y
    } else if (translatedRect) {
      pointerY = translatedRect.top + translatedRect.height / 2
    } else {
      pointerY = initialRect.top + event.delta.y + initialRect.height / 2
    }

    if (pointerInitialXRef.current !== null) {
      pointerX = pointerInitialXRef.current + event.delta.x
    } else if (translatedRect) {
      pointerX = translatedRect.left + translatedRect.width / 2
    } else {
      pointerX = initialRect.left + event.delta.x + initialRect.width / 2
    }

    const relativeYRaw = (pointerY - overRect.top) / overRect.height
    const relativeXRaw = (pointerX - overRect.left) / overRect.width
    const relativeY = Math.min(Math.max(relativeYRaw, 0), 1)
    const relativeX = Math.min(Math.max(relativeXRaw, 0), 1)

    console.log('🎯 DragOver:', {
      overId,
      overTitle: overGroup.title,
      isFolder: overGroup.is_folder,
      relativeY: relativeY.toFixed(2),
      relativeX: relativeX.toFixed(2),
      pointerY: pointerY.toFixed(2),
      pointerX: pointerX.toFixed(2),
      overTop: overRect.top,
      overHeight: overRect.height,
      overWidth: overRect.width
    })

    // 如果是文件夹，使用三区域逻辑
    if (overGroup.is_folder === 1) {
      const insideByVertical = relativeY >= 0.15 && relativeY <= 0.85
      const insideByHorizontal = relativeX >= 0.45

      if (insideByVertical || insideByHorizontal) {
        console.log('  → inside')
        setDropPosition('inside') // 中间区域
      } else if (relativeY < 0.15) {
        console.log('  → before')
        setDropPosition('before') // 上边缘
      } else {
        console.log('  → after')
        setDropPosition('after') // 下边缘
      }
    } else {
      // 如果是分组，使用两区域逻辑
      if (relativeY < 0.5) {
        console.log('  → before')
        setDropPosition('before')
      } else {
        console.log('  → after')
        setDropPosition('after')
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const currentDropPosition = dropPosition

    setActiveId(null)
    setOverId(null)
    setDropPosition(null)
    pointerInitialYRef.current = null
    pointerInitialXRef.current = null

    if (!over || active.id === over.id || !onMoveGroup) return

    // 获取拖拽的项和目标项
    const draggedGroup = tabGroups.find(g => g.id === active.id)
    const targetGroup = tabGroups.find(g => g.id === over.id)

    if (!draggedGroup || !targetGroup) return

    console.log('🎯 DragEnd:', {
      draggedId: draggedGroup.id,
      draggedTitle: draggedGroup.title,
      targetId: targetGroup.id,
      targetTitle: targetGroup.title,
      dropPosition: currentDropPosition
    })

    // 根据拖放位置决定操作
    if (currentDropPosition === 'inside' && targetGroup.is_folder === 1) {
      // 放入文件夹内部
      // 防止将文件夹移动到自己或自己的子文件夹中
      if (draggedGroup.is_folder === 1) {
        const isDescendant = (parentId: string, childId: string): boolean => {
          const child = tabGroups.find(g => g.id === childId)
          if (!child || !child.parent_id) return false
          if (child.parent_id === parentId) return true
          return isDescendant(parentId, child.parent_id)
        }

        if (isDescendant(draggedGroup.id, targetGroup.id)) {
          console.log('  ❌ Cannot move folder into its descendant')
          return
        }
      }

      // 移动到文件夹内部，position 设为最大值 + 1
      const siblingsInTarget = tabGroups.filter(g => g.parent_id === targetGroup.id)
      const maxPosition = siblingsInTarget.length > 0
        ? Math.max(...siblingsInTarget.map(g => g.position || 0))
        : -1
      const newPosition = maxPosition + 1

      console.log('  → Moving inside folder, new position:', newPosition)
      await onMoveGroup(draggedGroup.id, targetGroup.id, newPosition)
    } else if (currentDropPosition === 'before' || currentDropPosition === 'after') {
      // 插入到目标的上方或下方（与目标同级）
      const newParentId = targetGroup.parent_id || null
      const siblings = tabGroups.filter(g =>
        (g.parent_id || null) === newParentId && g.id !== draggedGroup.id
      )

      // 按当前 position 排序
      siblings.sort((a, b) => (a.position || 0) - (b.position || 0))

      // 计算新位置
      let newPosition: number
      if (currentDropPosition === 'before') {
        newPosition = targetGroup.position || 0
        console.log('  → Moving before target, new position:', newPosition)
      } else {
        newPosition = (targetGroup.position || 0) + 1
        console.log('  → Moving after target, new position:', newPosition)
      }

      await onMoveGroup(draggedGroup.id, newParentId, newPosition)
    } else {
      // 默认行为：移动到与目标相同的父级，position 设为最大值 + 1
      const newParentId = targetGroup.parent_id || null
      const siblings = tabGroups.filter(g => (g.parent_id || null) === newParentId)
      const maxPosition = siblings.length > 0
        ? Math.max(...siblings.map(g => g.position || 0))
        : -1
      const newPosition = maxPosition + 1

      console.log('  → Moving to same parent, new position:', newPosition)
      await onMoveGroup(draggedGroup.id, newParentId, newPosition)
    }
  }

  const handleDragCancel = () => {
    pointerInitialYRef.current = null
    pointerInitialXRef.current = null
    setActiveId(null)
    setOverId(null)
    setDropPosition(null)
  }

  // 构建树形结构
  const treeData = buildTree(tabGroups)

  // 获取所有可拖拽项的ID
  const allIds = tabGroups.map(g => g.id)

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
      <div className="w-full h-full bg-card border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            标签页组
          </div>
          {onCreateFolder && (
            <button
              onClick={onCreateFolder}
              className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
              title="创建文件夹"
            >
              <FolderPlus className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* List */}
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto">
        {/* 全部 - 作为根节点 */}
        <div className="relative">
          <div
            onClick={() => onSelectGroup(null)}
            className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted ${
              selectedGroupId === null ? 'bg-primary/10' : ''
            }`}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Circle className={`w-2 h-2 ${selectedGroupId === null ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </div>
            <span className={`text-sm flex-1 ${selectedGroupId === null ? 'text-primary font-medium' : 'text-foreground'}`}>
              全部
            </span>
            <span className="text-xs text-muted-foreground">{totalCount}</span>
          </div>

          {/* 树形列表 - 所有节点都是"全部"的子节点 */}
          {treeData.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-muted-foreground/50">暂无分组</p>
            </div>
          ) : (
            <div className="relative">
              {/* 从"全部"延伸下来的垂直线 */}
              {treeData.length > 0 && (
                <div
                  className="absolute pointer-events-none left-3 top-0 bottom-0 w-px bg-border/50"
                />
              )}

              {treeData.map((group, index) => (
                <TreeNode
                  key={group.id}
                  group={group}
                  level={1}
                  isLast={index === treeData.length - 1}
                  parentLines={[true]}
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
                  onOpenMoveDialog={(group) => {
                    setMovingGroup(group)
                    setMoveDialogOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </div>
          </div>
        </SortableContext>
      </div>

      {/* DragOverlay - 显示拖拽时的元素 */}
      <DragOverlay>
        {activeId ? (
          <div
            className="opacity-80 bg-card border-2 border-primary rounded shadow-lg cursor-grabbing"
            style={{
              padding: '6px 12px'
            }}
          >
            {(() => {
              const draggedGroup = tabGroups.find(g => g.id === activeId)
              if (!draggedGroup) return null
              const isFolder = draggedGroup.is_folder === 1
              return (
                <div className="flex items-center gap-2">
                  {isFolder ? (
                    <Folder className="w-4 h-4 text-primary" />
                  ) : (
                    <Circle className="w-2 h-2 text-primary fill-current" />
                  )}
                  <span className="text-sm text-foreground">{draggedGroup.title}</span>
                </div>
              )
            })()}
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* 移动到文件夹对话框 */}
      {movingGroup && (
        <MoveToFolderDialog
          isOpen={moveDialogOpen}
          currentGroup={movingGroup}
          allGroups={tabGroups}
          onConfirm={async (targetFolderId) => {
            if (!onMoveGroup) return

            // 计算新位置：放在目标文件夹的最后
            const siblingsInTarget = tabGroups.filter(g =>
              (g.parent_id || null) === targetFolderId
            )
            const maxPosition = siblingsInTarget.length > 0
              ? Math.max(...siblingsInTarget.map(g => g.position || 0))
              : -1
            const newPosition = maxPosition + 1

            await onMoveGroup(movingGroup.id, targetFolderId, newPosition)
            setMoveDialogOpen(false)
            setMovingGroup(null)
          }}
          onCancel={() => {
            setMoveDialogOpen(false)
            setMovingGroup(null)
          }}
        />
      )}
    </>
  )
}
