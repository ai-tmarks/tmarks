import { useState, useEffect } from 'react'
import { FolderPlus, Circle, Folder } from 'lucide-react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { TabGroup } from '@/lib/types'
import { TreeNode } from './tree/TreeNode'
import { buildTree } from './tree/TreeUtils'
import { useDragAndDrop } from './tree/useDragAndDrop'
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

export function TabGroupTree({
  tabGroups,
  selectedGroupId,
  onSelectGroup,
  onCreateFolder,
  onRenameGroup,
  onMoveGroup,
  onRefresh,
}: TabGroupTreeProps) {
  // 状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const folderIds = tabGroups.filter(g => g.is_folder === 1).map(g => g.id)
    return new Set(folderIds)
  })
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movingGroup, setMovingGroup] = useState<TabGroup | null>(null)

  // 当 tabGroups 变化时，自动展开新增的文件夹
  useEffect(() => {
    const folderIds = tabGroups.filter(g => g.is_folder === 1).map(g => g.id)
    setExpandedGroups(prev => {
      const next = new Set(prev)
      folderIds.forEach(id => next.add(id))
      return next
    })
  }, [tabGroups])

  // 拖拽功能
  const {
    sensors,
    collisionDetection,
    activeId,
    overId,
    dropPosition,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  } = useDragAndDrop({ tabGroups, onMoveGroup })

  // 展开/折叠
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

  // 构建树形结构
  const treeData = buildTree(tabGroups)
  const allIds = tabGroups.map(g => g.id)
  const totalCount = tabGroups.reduce((sum, group) => {
    if (group.is_folder === 1) return sum
    return sum + (group.item_count || 0)
  }, 0)

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
          <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto min-h-0">
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

                {/* 树形列表 */}
                {treeData.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <p className="text-xs text-muted-foreground/50">暂无分组</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* 从"全部"延伸下来的垂直线 */}
                    {treeData.length > 0 && (
                      <div
                        className="absolute pointer-events-none top-0 bottom-0"
                        style={{
                          left: '20px',
                          width: '1px',
                          backgroundColor: 'var(--border, #e5e7eb)',
                        }}
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

        {/* DragOverlay - 拖拽时显示的浮动元素 */}
        <DragOverlay>
          {activeId ? (
            <div
              className="bg-card border-2 border-primary rounded shadow-xl cursor-grabbing px-3 py-1.5 opacity-95"
              style={{
                transform: 'scale(1.05)',
              }}
            >
              {(() => {
                const draggedGroup = tabGroups.find(g => g.id === activeId)
                if (!draggedGroup) return null
                const isFolder = draggedGroup.is_folder === 1
                return (
                  <div className="flex items-center gap-2">
                    {isFolder ? (
                      <Folder className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Circle className="w-2 h-2 text-primary fill-current" />
                    )}
                    <span className="text-sm font-medium text-foreground">{draggedGroup.title}</span>
                  </div>
                )
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 移动对话框 */}
      {moveDialogOpen && movingGroup && (
        <MoveToFolderDialog
          isOpen={moveDialogOpen}
          currentGroup={movingGroup}
          allGroups={tabGroups}
          onConfirm={async (targetFolderId) => {
            if (onMoveGroup) {
              await onMoveGroup(movingGroup.id, targetFolderId, 0)
              await onRefresh?.()
            }
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
