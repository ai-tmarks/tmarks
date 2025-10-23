import { useState, useEffect } from 'react'
import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup, TabGroupItem } from '@/lib/types'
import { ShareDialog } from '@/components/tab-groups/ShareDialog'
import { sortTabGroups, type SortOption } from '@/components/tab-groups/SortSelector'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SearchBar } from '@/components/tab-groups/SearchBar'
import { BatchActionBar } from '@/components/tab-groups/BatchActionBar'
import { EmptyState } from '@/components/tab-groups/EmptyState'
import { TabGroupHeader } from '@/components/tab-groups/TabGroupHeader'
import { TabItemList } from '@/components/tab-groups/TabItemList'
import { TabGroupTree } from '@/components/tab-groups/TabGroupTree'
import { TodoSidebar } from '@/components/tab-groups/TodoSidebar'
import { ResizablePanel } from '@/components/common/ResizablePanel'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { useTabGroupActions } from '@/hooks/useTabGroupActions'
import { useBatchActions } from '@/hooks/useBatchActions'

export function TabGroupsPage() {
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedDomain, setHighlightedDomain] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('created')
  const [sharingGroupId, setSharingGroupId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // Use custom hooks
  const {
    editingItemId,
    setEditingItemId,
    editingTitle,
    setEditingTitle,
    editingGroupId,
    setEditingGroupId,
    editingGroupTitle,
    setEditingGroupTitle,
    handleDelete,
    handleOpenAll,
    handleExportMarkdown,
    handleEditGroup,
    handleSaveGroupEdit,
    handleEditItem,
    handleSaveEdit,
    handleTogglePin,
    handleToggleTodo,
    handleDeleteItem,
  } = useTabGroupActions({
    setTabGroups,
    setDeletingId,
    setConfirmDialog,
    confirmDialog,
  })

  const {
    handleBatchDelete,
    handleBatchPin,
    handleBatchTodo,
    handleBatchExport,
    handleDeselectAll,
  } = useBatchActions({
    tabGroups,
    setTabGroups,
    selectedItems,
    setSelectedItems,
    setConfirmDialog,
    confirmDialog,
  })

  useEffect(() => {
    loadTabGroups()
  }, [])

  const loadTabGroups = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const groups = await tabGroupsService.getAllTabGroups()
      setTabGroups(groups)
    } catch (err) {
      console.error('Failed to load tab groups:', err)
      setError('加载标签页组失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 只刷新左侧树形列表，不影响中间和右侧列
  const refreshTreeOnly = async () => {
    try {
      const groups = await tabGroupsService.getAllTabGroups()
      // 保持当前选中的分组不变
      const currentSelectedGroup = selectedGroupId
        ? groups.find(g => g.id === selectedGroupId)
        : null

      setTabGroups(groups)

      // 如果当前选中的分组仍然存在，保持选中状态
      // 这样中间列的内容不会改变
      if (currentSelectedGroup) {
        // 不需要重新设置 selectedGroupId，因为它没有改变
        // 中间列会继续显示相同的内容
      }
    } catch (err) {
      console.error('Failed to refresh tree:', err)
      setError('刷新失败')
    }
  }

  const handleCreateFolder = async () => {
    try {
      await tabGroupsService.createFolder('新文件夹')
      // 只刷新左侧树形列表
      await refreshTreeOnly()
    } catch (err) {
      console.error('Failed to create folder:', err)
      setError('创建文件夹失败')
    }
  }

  const handleRenameGroup = async (groupId: string, newTitle: string) => {
    try {
      await tabGroupsService.updateTabGroup(groupId, { title: newTitle })
      // 只刷新左侧树形列表
      await refreshTreeOnly()
    } catch (err) {
      console.error('Failed to rename group:', err)
      setError('重命名失败')
    }
  }

  const handleMoveGroup = async (groupId: string, newParentId: string | null, newPosition: number) => {
    try {
      console.log('📦 handleMoveGroup:', { groupId, newParentId, newPosition })

      // 获取拖拽项
      const draggedGroup = tabGroups.find(g => g.id === groupId)
      if (!draggedGroup) {
        console.error('Dragged group not found')
        return
      }

      // 获取同级所有项（包括拖拽项）
      const siblings = tabGroups.filter(g =>
        (g.parent_id || null) === newParentId
      )

      // 按当前 position 排序
      siblings.sort((a, b) => (a.position || 0) - (b.position || 0))

      // 移除拖拽项（如果在同级中）
      const draggedIndex = siblings.findIndex(g => g.id === groupId)
      if (draggedIndex !== -1) {
        siblings.splice(draggedIndex, 1)
      }

      // 插入到新位置
      siblings.splice(newPosition, 0, draggedGroup)

      // 重新分配 position（从 0 开始）
      const updates = siblings.map((g, index) => ({
        id: g.id,
        position: index,
        parent_id: newParentId
      }))

      console.log('  → Reordering', updates.length, 'items')

      // 批量更新
      await Promise.all(
        updates.map(update =>
          tabGroupsService.updateTabGroup(update.id, {
            position: update.position,
            parent_id: update.parent_id
          })
        )
      )

      // 只刷新左侧树形列表，不影响中间和右侧列
      await refreshTreeOnly()
    } catch (err) {
      console.error('Failed to move group:', err)
      setError('移动失败')
    }
  }

  const handleItemClick = (item: TabGroupItem, e: React.MouseEvent) => {
    if (batchMode) {
      e.preventDefault()
      const newSelected = new Set(selectedItems)
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id)
      } else {
        newSelected.add(item.id)
      }
      setSelectedItems(newSelected)
      return
    }

    const domain = extractDomain(item.url)
    if (highlightedDomain === domain) {
      setHighlightedDomain(null)
    } else {
      setHighlightedDomain(domain)
    }
  }

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return ''
    }
  }

  const handleDragEnd = async (event: DragEndEvent, groupId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const group = tabGroups.find((g) => g.id === groupId)
    if (!group || !group.items) return

    const oldIndex = group.items.findIndex((item) => item.id === active.id)
    const newIndex = group.items.findIndex((item) => item.id === over.id)

    const newItems = arrayMove(group.items, oldIndex, newIndex)

    // Update local state immediately
    setTabGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, items: newItems } : g
      )
    )

    // Update positions in backend
    try {
      await Promise.all(
        newItems.map((item: TabGroupItem, index: number) =>
          tabGroupsService.updateTabGroupItem(item.id, { position: index })
        )
      )
    } catch (err) {
      console.error('Failed to update positions:', err)
      // Revert on error
      setTabGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, items: group.items } : g
        )
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            加载中...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadTabGroups}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            style={{ color: 'var(--foreground)' }}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // Filter by selected group first
  const groupFilteredTabGroups = selectedGroupId
    ? tabGroups.filter(g => g.id === selectedGroupId)
    : tabGroups

  // Then filter by search query
  const filteredTabGroups = groupFilteredTabGroups.map((group) => {
    if (!searchQuery.trim()) return group

    const query = searchQuery.toLowerCase()
    const matchesTitle = group.title.toLowerCase().includes(query)
    const filteredItems = group.items?.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
    )

    if (matchesTitle || (filteredItems && filteredItems.length > 0)) {
      return {
        ...group,
        items: matchesTitle ? group.items : filteredItems,
      }
    }

    return null
  }).filter((g): g is TabGroup => g !== null)

  // Sort filtered groups
  const sortedGroups = sortTabGroups(filteredTabGroups, sortBy)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 左侧导航栏 */}
      <ResizablePanel
        side="left"
        defaultWidth={240}
        minWidth={200}
        maxWidth={400}
        storageKey="tab-groups-left-sidebar-width"
      >
        <TabGroupTree
          tabGroups={tabGroups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          onCreateFolder={handleCreateFolder}
          onRenameGroup={handleRenameGroup}
          onMoveGroup={handleMoveGroup}
          onRefresh={refreshTreeOnly}
        />
      </ResizablePanel>

      {/* 中间内容区域 */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            {/* Title and Search Bar in one row */}
            {tabGroups.length > 0 && (
              <div className="flex items-center gap-4 w-full">
                <h1 className="text-xl font-semibold text-foreground whitespace-nowrap flex-shrink-0">
                  标签页组
                </h1>
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onBatchModeToggle={() => setBatchMode(!batchMode)}
                  batchMode={batchMode}
                />
              </div>
            )}

            {/* Batch Action Bar */}
            {batchMode && selectedItems.size > 0 && (
              <div className="mt-4">
                <BatchActionBar
                  selectedCount={selectedItems.size}
                  onSelectAll={() => {
                    // Select all items from all groups
                    const allItemIds = new Set<string>()
                    tabGroups.forEach((group) => {
                      group.items?.forEach((item) => {
                        allItemIds.add(item.id)
                      })
                    })
                    setSelectedItems(allItemIds)
                  }}
                  onDeselectAll={handleDeselectAll}
                  onBatchDelete={handleBatchDelete}
                  onBatchPin={handleBatchPin}
                  onBatchTodo={handleBatchTodo}
                  onBatchExport={handleBatchExport}
                  onCancel={() => {
                    setBatchMode(false)
                    setSelectedItems(new Set())
                  }}
                />
              </div>
            )}
          </div>

      {/* Empty State */}
      {tabGroups.length === 0 && <EmptyState isSearching={false} searchQuery="" />}

      {/* No Search Results */}
      {tabGroups.length > 0 && filteredTabGroups.length === 0 && (
        <EmptyState isSearching={true} searchQuery={searchQuery} />
      )}

      {/* Tab Groups Grid */}
      {sortedGroups.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {sortedGroups.map((group) => {
            return (
              <div
                key={group.id}
                className="card border-l-4 border-l-primary p-6 hover:shadow-xl transition-all duration-200"
              >
              {/* Header */}
              <TabGroupHeader
                group={group}
                isEditingTitle={editingGroupId === group.id}
                editingTitle={editingGroupTitle}
                onEditTitle={() => handleEditGroup(group)}
                onSaveTitle={() => handleSaveGroupEdit(group.id)}
                onCancelEdit={() => {
                  setEditingGroupId(null)
                  setEditingGroupTitle('')
                }}
                onTitleChange={setEditingGroupTitle}
                onOpenAll={() => handleOpenAll(group.items || [])}
                onExport={() => handleExportMarkdown(group)}
                onDelete={() => handleDelete(group.id, group.title)}
                isDeleting={deletingId === group.id}
                onShareClick={() => setSharingGroupId(group.id)}
              />

              {/* Tab Items List */}
              {group.items && group.items.length > 0 && (
                <TabItemList
                  items={group.items}
                  groupId={group.id}
                  highlightedDomain={highlightedDomain}
                  selectedItems={selectedItems}
                  batchMode={batchMode}
                  editingItemId={editingItemId}
                  editingTitle={editingTitle}
                  onDragEnd={(event) => handleDragEnd(event, group.id)}
                  onItemClick={handleItemClick}
                  onEditItem={handleEditItem}
                  onSaveEdit={handleSaveEdit}
                  onTogglePin={handleTogglePin}
                  onToggleTodo={handleToggleTodo}
                  onDeleteItem={handleDeleteItem}
                  setEditingItemId={setEditingItemId}
                  setEditingTitle={setEditingTitle}
                  extractDomain={extractDomain}
                />
              )}
            </div>
            )
          })}
        </div>
      )}

      {/* Share Dialog */}
      {sharingGroupId && (
        <ShareDialog
          groupId={sharingGroupId}
          groupTitle={tabGroups.find((g) => g.id === sharingGroupId)?.title || ''}
          onClose={() => setSharingGroupId(null)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
        </div>
      </div>

      {/* 右侧TODO栏 */}
      <ResizablePanel
        side="right"
        defaultWidth={320}
        minWidth={280}
        maxWidth={500}
        storageKey="tab-groups-right-sidebar-width"
      >
        <TodoSidebar
          tabGroups={tabGroups}
          onUpdate={loadTabGroups}
        />
      </ResizablePanel>
    </div>
  )
}
