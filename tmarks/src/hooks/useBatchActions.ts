import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup, TabGroupItem } from '@/lib/types'
import { useToastStore } from '@/stores/toastStore'
import { logger } from '@/lib/logger'

interface UseBatchActionsProps {
  tabGroups: TabGroup[]
  setTabGroups: React.Dispatch<React.SetStateAction<TabGroup[]>>
  selectedItems: Set<string>
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setConfirmDialog: React.Dispatch<React.SetStateAction<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>>
  confirmDialog: {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }
}

export function useBatchActions({
  tabGroups,
  setTabGroups,
  selectedItems,
  setSelectedItems,
  setConfirmDialog,
  confirmDialog,
}: UseBatchActionsProps) {
  const { success, error: showError } = useToastStore()

  const handleBatchDelete = () => {
    if (selectedItems.size === 0) return

    setConfirmDialog({
      isOpen: true,
      title: '批量删除',
      message: `确定要删除选中的 ${selectedItems.size} 个标签页吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false })
        try {
          await Promise.all(
            Array.from(selectedItems).map((itemId) =>
              tabGroupsService.deleteTabGroupItem(itemId)
            )
          )

          setTabGroups((prev) =>
            prev.map((group) => ({
              ...group,
              items: group.items?.filter((item) => !selectedItems.has(item.id)),
              item_count: (group.item_count || 0) - Array.from(selectedItems).filter((id) =>
                group.items?.some((item) => item.id === id)
              ).length,
            }))
          )

          setSelectedItems(new Set())
          success('批量删除成功')
        } catch (err) {
          logger.error('Failed to batch delete:', err)
          showError('批量删除失败，请重试')
        }
      },
    })
  }

  const handleBatchPin = async () => {
    if (selectedItems.size === 0) return

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) =>
          tabGroupsService.updateTabGroupItem(itemId, { is_pinned: 1 })
        )
      )

      setTabGroups((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items?.map((item) =>
            selectedItems.has(item.id) ? { ...item, is_pinned: 1 } : item
          ),
        }))
      )

      setSelectedItems(new Set())
      success('批量固定成功')
    } catch (err) {
      logger.error('Failed to batch pin:', err)
      showError('批量固定失败，请重试')
    }
  }

  const handleBatchTodo = async () => {
    if (selectedItems.size === 0) return

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) =>
          tabGroupsService.updateTabGroupItem(itemId, { is_todo: 1 })
        )
      )

      setTabGroups((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items?.map((item) =>
            selectedItems.has(item.id) ? { ...item, is_todo: 1 } : item
          ),
        }))
      )

      setSelectedItems(new Set())
      success('批量标记待办成功')
    } catch (err) {
      logger.error('Failed to batch todo:', err)
      showError('批量标记待办失败，请重试')
    }
  }

  const handleBatchExport = () => {
    if (selectedItems.size === 0) return

    // Get all selected items from all groups
    const selectedItemsData: TabGroupItem[] = []
    tabGroups.forEach((group) => {
      group.items?.forEach((item) => {
        if (selectedItems.has(item.id)) {
          selectedItemsData.push(item)
        }
      })
    })

    // Generate markdown
    let markdown = `# 批量导出的标签页\n\n`
    markdown += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`
    markdown += `标签页数量: ${selectedItemsData.length}\n\n`
    markdown += `---\n\n`

    selectedItemsData.forEach((item, index) => {
      markdown += `${index + 1}. [${item.title}](${item.url})\n`
      if (item.is_pinned === 1) markdown += '   - 📌 已固定\n'
      if (item.is_todo === 1) markdown += '   - ✅ 待办\n'
      markdown += '\n'
    })

    // Download
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-export-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    success('导出成功')
  }

  const handleDeselectAll = () => {
    setSelectedItems(new Set())
  }

  return {
    handleBatchDelete,
    handleBatchPin,
    handleBatchTodo,
    handleBatchExport,
    handleDeselectAll,
  }
}

