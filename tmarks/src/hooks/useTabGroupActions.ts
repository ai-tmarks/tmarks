import { useState } from 'react'
import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup, TabGroupItem } from '@/lib/types'
import { useToastStore } from '@/stores/toastStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { logger } from '@/lib/logger'

interface UseTabGroupActionsProps {
  setTabGroups: React.Dispatch<React.SetStateAction<TabGroup[]>>
  setDeletingId: React.Dispatch<React.SetStateAction<string | null>>
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

export function useTabGroupActions({
  setTabGroups,
  setDeletingId,
  setConfirmDialog,
  confirmDialog,
}: UseTabGroupActionsProps) {
  const { success, error: showError } = useToastStore()
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupTitle, setEditingGroupTitle] = useState('')

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: zhCN,
      })
    } catch {
      return dateStr
    }
  }

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '删除标签页组',
      message: `确定要删除标签页组"${title}"吗？此操作将移至回收站。`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false })
        setDeletingId(id)
        try {
          await tabGroupsService.deleteTabGroup(id)
          setTabGroups((prev) => prev.filter((g) => g.id !== id))
          success('已移至回收站')
        } catch (err) {
          logger.error('Failed to delete tab group:', err)
          showError('删除失败，请重试')
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  const handleOpenAll = (items: TabGroupItem[]) => {
    if (!items || items.length === 0) {
      showError('没有可打开的标签页')
      return
    }

    const itemCount = items.length

    // 提示用户
    const message =
      itemCount > 10
        ? `即将打开 ${itemCount} 个标签页。\n\n⚠️ 如果浏览器拦截弹窗，请在地址栏点击"允许弹窗"。\n\n是否继续？`
        : `确定要打开 ${itemCount} 个标签页吗？`

    if (!window.confirm(message)) {
      return
    }

    // 直接打开所有标签
    items.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.url, '_blank', 'noopener,noreferrer')
      }, index * 20) // 20ms 间隔
    })

    // 显示成功消息
    success(`正在打开 ${itemCount} 个标签页...`)
  }

  const handleExportMarkdown = (group: TabGroup) => {
    const items = group.items || []
    let markdown = `# ${group.title}\n\n`
    markdown += `创建时间: ${formatDate(group.created_at)}\n`
    markdown += `标签页数量: ${items.length}\n\n`

    if (group.tags && group.tags.length > 0) {
      markdown += `标签: ${group.tags.join(', ')}\n\n`
    }

    markdown += `---\n\n`

    items.forEach((item, index) => {
      markdown += `${index + 1}. [${item.title}](${item.url})\n`
      if (item.is_pinned === 1) markdown += '   - 📌 已固定\n'
      if (item.is_todo === 1) markdown += '   - ✅ 待办\n'
      markdown += '\n'
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.title}-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    success('导出成功')
  }

  const handleEditGroup = (group: TabGroup) => {
    setEditingGroupId(group.id)
    setEditingGroupTitle(group.title)
  }

  const handleSaveGroupEdit = async (groupId: string) => {
    if (!editingGroupTitle.trim()) {
      showError('标题不能为空')
      return
    }

    try {
      await tabGroupsService.updateTabGroup(groupId, { title: editingGroupTitle })
      setTabGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, title: editingGroupTitle } : g))
      )
      setEditingGroupId(null)
      setEditingGroupTitle('')
      success('重命名成功')
    } catch (err) {
      logger.error('Failed to update group title:', err)
      showError('重命名失败，请重试')
    }
  }

  const handleEditItem = (item: TabGroupItem) => {
    setEditingItemId(item.id)
    setEditingTitle(item.title)
  }

  const handleSaveEdit = async (groupId: string, itemId: string) => {
    if (!editingTitle.trim()) {
      showError('标题不能为空')
      return
    }

    try {
      await tabGroupsService.updateTabGroupItem(itemId, { title: editingTitle })
      setTabGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
              ...group,
              items: group.items?.map((item) =>
                item.id === itemId ? { ...item, title: editingTitle } : item
              ),
            }
            : group
        )
      )
      setEditingItemId(null)
      setEditingTitle('')
      success('编辑成功')
    } catch (err) {
      logger.error('Failed to update item:', err)
      showError('编辑失败，请重试')
    }
  }

  const handleTogglePin = async (groupId: string, itemId: string, currentPinned: number) => {
    const newPinned = currentPinned === 1 ? 0 : 1
    try {
      await tabGroupsService.updateTabGroupItem(itemId, { is_pinned: newPinned })
      setTabGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
              ...group,
              items: group.items?.map((item) =>
                item.id === itemId ? { ...item, is_pinned: newPinned } : item
              ),
            }
            : group
        )
      )
      success(newPinned === 1 ? '已固定' : '已取消固定')
    } catch (err) {
      logger.error('Failed to toggle pin:', err)
      showError('操作失败，请重试')
    }
  }

  const handleToggleTodo = async (groupId: string, itemId: string, currentTodo: number) => {
    const newTodo = currentTodo === 1 ? 0 : 1
    try {
      await tabGroupsService.updateTabGroupItem(itemId, { is_todo: newTodo })
      setTabGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
              ...group,
              items: group.items?.map((item) =>
                item.id === itemId ? { ...item, is_todo: newTodo } : item
              ),
            }
            : group
        )
      )
      success(newTodo === 1 ? '已标记待办' : '已取消待办')
    } catch (err) {
      logger.error('Failed to toggle todo:', err)
      showError('操作失败，请重试')
    }
  }

  const handleDeleteItem = (groupId: string, itemId: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '删除标签页',
      message: `确定要删除"${title}"吗？此操作不可撤销。`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false })
        try {
          await tabGroupsService.deleteTabGroupItem(itemId)
          setTabGroups((prev) =>
            prev.map((group) =>
              group.id === groupId
                ? {
                  ...group,
                  items: group.items?.filter((item) => item.id !== itemId),
                  item_count: (group.item_count || 0) - 1,
                }
                : group
            )
          )
          success('删除成功')
        } catch (err) {
          logger.error('Failed to delete item:', err)
          showError('删除失败，请重试')
        }
      },
    })
  }

  return {
    editingItemId,
    setEditingItemId,
    editingTitle,
    setEditingTitle,
    editingGroupId,
    setEditingGroupId,
    editingGroupTitle,
    setEditingGroupTitle,
    formatDate,
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
  }
}

