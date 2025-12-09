import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { TabGroupHeader } from '@/components/tab-groups/TabGroupHeader'
import { TabItemList } from '@/components/tab-groups/TabItemList'
import type { TabGroup, TabGroupItem } from '@/lib/types'

interface TabGroupsListProps {
  sortedGroups: TabGroup[]
  selectedGroupId: string | null
  editingGroupId: string | null
  editingGroupTitle: string
  setEditingGroupId: (id: string | null) => void
  setEditingGroupTitle: (title: string) => void
  deletingId: string | null
  highlightedDomain: string | null
  selectedItems: Set<string>
  batchMode: boolean
  editingItemId: string | null
  editingTitle: string
  setEditingItemId: (id: string | null) => void
  setEditingTitle: (title: string) => void
  onEditGroup: (group: TabGroup) => void
  onSaveGroupEdit: (groupId: string) => Promise<void>
  onOpenAll: (items: TabGroupItem[]) => void
  onExportMarkdown: (group: TabGroup) => void
  onDelete: (groupId: string, title: string) => void
  onShareClick: (groupId: string) => void
  onItemClick: (item: TabGroupItem) => void
  onEditItem: (item: TabGroupItem) => void
  onSaveEdit: (itemId: string, groupId: string) => Promise<void>
  onTogglePin: (itemId: string, groupId: string) => Promise<void>
  onToggleTodo: (itemId: string, groupId: string) => Promise<void>
  onDeleteItem: (itemId: string, groupId: string) => Promise<void>
  onMoveItem: (item: TabGroupItem) => void
  onDragEnd: (event: DragEndEvent) => Promise<void>
  extractDomain: (url: string) => string
}

export function TabGroupsList({
  sortedGroups,
  selectedGroupId,
  editingGroupId,
  editingGroupTitle,
  setEditingGroupId,
  setEditingGroupTitle,
  deletingId,
  highlightedDomain,
  selectedItems,
  batchMode,
  editingItemId,
  editingTitle,
  setEditingItemId,
  setEditingTitle,
  onEditGroup,
  onSaveGroupEdit,
  onOpenAll,
  onExportMarkdown,
  onDelete,
  onShareClick,
  onItemClick,
  onEditItem,
  onSaveEdit,
  onTogglePin,
  onToggleTodo,
  onDeleteItem,
  onMoveItem,
  onDragEnd,
  extractDomain,
}: TabGroupsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // 渲染单个分组卡片
  const renderGroup = (group: TabGroup) => (
    <div
      key={group.id}
      className="card border-l-[3px] border-l-primary p-6 hover:shadow-xl transition-all duration-200"
    >
      <TabGroupHeader
        group={group}
        isEditingTitle={editingGroupId === group.id}
        editingTitle={editingGroupTitle}
        onEditTitle={() => onEditGroup(group)}
        onSaveTitle={() => onSaveGroupEdit(group.id)}
        onCancelEdit={() => {
          setEditingGroupId(null)
          setEditingGroupTitle('')
        }}
        onTitleChange={setEditingGroupTitle}
        onOpenAll={() => onOpenAll(group.items || [])}
        onExport={() => onExportMarkdown(group)}
        onDelete={() => onDelete(group.id, group.title)}
        isDeleting={deletingId === group.id}
        onShareClick={() => onShareClick(group.id)}
      />

      {group.items && group.items.length > 0 && (
        <TabItemList
          items={group.items}
          groupId={group.id}
          highlightedDomain={highlightedDomain}
          selectedItems={selectedItems}
          batchMode={batchMode}
          editingItemId={editingItemId}
          editingTitle={editingTitle}
          onItemClick={onItemClick}
          onEditItem={onEditItem}
          onSaveEdit={onSaveEdit}
          onTogglePin={onTogglePin}
          onToggleTodo={onToggleTodo}
          onDeleteItem={onDeleteItem}
          onMoveItem={onMoveItem}
          setEditingItemId={setEditingItemId}
          setEditingTitle={setEditingTitle}
          extractDomain={extractDomain}
        />
      )}
    </div>
  )

  // 按文件夹分组渲染
  const renderGroupedList = () => {
    const groupsByParent = new Map<string | null, TabGroup[]>()
    sortedGroups.forEach(group => {
      const parentId = group.parent_id || null
      if (!groupsByParent.has(parentId)) {
        groupsByParent.set(parentId, [])
      }
      groupsByParent.get(parentId)!.push(group)
    })

    const result: JSX.Element[] = []
    
    // 如果选中了特定分组，直接显示该分组（排除文件夹）
    if (selectedGroupId) {
      sortedGroups.forEach(group => {
        if (group.is_folder !== 1) {
          result.push(renderGroup(group))
        }
      })
    } else {
      // 显示全部时，按文件夹分组显示
      const rootGroups = groupsByParent.get(null) || []
      
      rootGroups.forEach(group => {
        if (group.is_folder === 1) {
          const children = groupsByParent.get(group.id) || []
          if (children.length > 0) {
            result.push(
              <div key={`folder-${group.id}`} className="mt-6 first:mt-0">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span>📁</span>
                  <span>{group.title}</span>
                  <span className="text-sm text-muted-foreground">
                    ({children.reduce((sum, g) => sum + (g.item_count || 0), 0)} 个标签页)
                  </span>
                </h2>
                <div className="space-y-6">
                  {children.map(childGroup => renderGroup(childGroup))}
                </div>
              </div>
            )
          }
        } else {
          result.push(renderGroup(group))
        }
      })
    }

    return result
  }

  if (sortedGroups.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 gap-6">
        {renderGroupedList()}
      </div>
    </DndContext>
  )
}
