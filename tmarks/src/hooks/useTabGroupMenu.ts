import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup } from '@/lib/types'

export interface TabGroupMenuActions {
  onOpenInNewWindow: (group: TabGroup) => void
  onOpenInCurrentWindow: (group: TabGroup) => void
  onOpenInIncognito: (group: TabGroup) => void
  onRename: (group: TabGroup) => void
  onShare: (group: TabGroup) => void
  onCopyToClipboard: (group: TabGroup) => void
  onImportLinks: (group: TabGroup) => void
  onCreateFolderAbove: (group: TabGroup) => void
  onCreateFolderInside: (group: TabGroup) => void
  onCreateFolderBelow: (group: TabGroup) => void
  onCreateGroupAbove: (group: TabGroup) => void
  onCreateGroupInside: (group: TabGroup) => void
  onCreateGroupBelow: (group: TabGroup) => void
  onPinToTop: (group: TabGroup) => void
  onRemoveDuplicates: (group: TabGroup) => void
  onLock: (group: TabGroup) => void
  onMove: (group: TabGroup) => Promise<void>
  onMoveToTrash: (group: TabGroup) => void
}

interface UseTabGroupMenuProps {
  onRefresh?: () => Promise<void>
  onStartRename: (groupId: string, title: string) => void
  onOpenMoveDialog?: (group: TabGroup) => void
}

export function useTabGroupMenu({ onRefresh, onStartRename, onOpenMoveDialog }: UseTabGroupMenuProps): TabGroupMenuActions {
  // 打开所有标签页
  const openAllTabs = (group: TabGroup, mode: 'new' | 'current' | 'incognito') => {
    if (!group.items || group.items.length === 0) return

    group.items.forEach((item, index) => {
      const url = item.url
      if (mode === 'new') {
        window.open(url, '_blank')
      } else if (mode === 'current') {
        if (index === 0) {
          window.location.href = url
        } else {
          window.open(url, '_blank')
        }
      } else if (mode === 'incognito') {
        // 浏览器扩展API才能打开隐身窗口，这里只能打开新窗口
        window.open(url, '_blank')
      }
    })
  }

  const onOpenInNewWindow = (group: TabGroup) => {
    openAllTabs(group, 'new')
  }

  const onOpenInCurrentWindow = (group: TabGroup) => {
    openAllTabs(group, 'current')
  }

  const onOpenInIncognito = (group: TabGroup) => {
    openAllTabs(group, 'incognito')
  }

  const onRename = (group: TabGroup) => {
    onStartRename(group.id, group.title)
  }

  const onShare = async (group: TabGroup) => {
    try {
      const shareData = await tabGroupsService.createShare(group.id, {
        is_public: true,
        expires_in_days: 30
      })

      const shareUrl = shareData.share_url

      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert(`分享链接已创建并复制到剪贴板：\n\n${shareUrl}\n\n有效期：30天`)
      } catch (err) {
        alert(`分享链接已创建：\n\n${shareUrl}\n\n有效期：30天\n\n（复制到剪贴板失败，请手动复制）`)
      }
    } catch (err) {
      console.error('Failed to create share:', err)
      alert('创建分享链接失败')
    }
  }

  const onCopyToClipboard = async (group: TabGroup) => {
    if (!group.items || group.items.length === 0) {
      alert('此分组没有标签页')
      return
    }

    const text = group.items.map(item => `${item.title}\n${item.url}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('复制失败')
    }
  }

  const onImportLinks = async (_group: TabGroup) => {
    const text = prompt('请粘贴要导入的链接（每行一个）：\n\n提示：可以粘贴多行链接，每行一个URL')
    if (!text) return

    const urls = text.split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.startsWith('http://') || line.startsWith('https://')))

    if (urls.length === 0) {
      alert('没有找到有效的链接')
      return
    }

    try {
      // 由于后端不支持批量添加，这里只能提示用户
      alert(`检测到 ${urls.length} 个链接\n\n批量导入功能需要后端支持，目前请手动添加。\n\n未来版本将支持此功能。`)
    } catch (err) {
      console.error('Failed to import:', err)
      alert('导入失败')
    }
  }

  const onCreateFolderAbove = async (group: TabGroup) => {
    try {
      await tabGroupsService.createFolder('新文件夹', group.parent_id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('创建文件夹失败')
    }
  }

  const onCreateFolderInside = async (group: TabGroup) => {
    if (group.is_folder !== 1) return
    try {
      await tabGroupsService.createFolder('新文件夹', group.id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('创建文件夹失败')
    }
  }

  const onCreateFolderBelow = async (group: TabGroup) => {
    try {
      await tabGroupsService.createFolder('新文件夹', group.parent_id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('创建文件夹失败')
    }
  }

  const onCreateGroupAbove = async (group: TabGroup) => {
    try {
      await tabGroupsService.createTabGroup({
        title: '新分组',
        parent_id: group.parent_id,
        is_folder: false
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create group:', err)
      alert('创建分组失败')
    }
  }

  const onCreateGroupInside = async (group: TabGroup) => {
    if (group.is_folder !== 1) return
    try {
      await tabGroupsService.createTabGroup({
        title: '新分组',
        parent_id: group.id,
        is_folder: false
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create group:', err)
      alert('创建分组失败')
    }
  }

  const onCreateGroupBelow = async (group: TabGroup) => {
    try {
      await tabGroupsService.createTabGroup({
        title: '新分组',
        parent_id: group.parent_id,
        is_folder: false
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create group:', err)
      alert('创建分组失败')
    }
  }

  const onPinToTop = async (group: TabGroup) => {
    try {
      // 将该项的 position 设置为 -1（最小值），这样排序时会在最前面
      await tabGroupsService.updateTabGroup(group.id, {
        position: -1
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to pin to top:', err)
      alert('固定失败')
    }
  }

  const onRemoveDuplicates = async (group: TabGroup) => {
    if (!group.items || group.items.length === 0) return

    const seen = new Set<string>()
    const duplicates: string[] = []

    group.items.forEach(item => {
      if (seen.has(item.url)) {
        duplicates.push(item.id)
      } else {
        seen.add(item.url)
      }
    })

    if (duplicates.length === 0) {
      alert('没有找到重复项')
      return
    }

    if (confirm(`找到 ${duplicates.length} 个重复项，是否删除？`)) {
      try {
        await Promise.all(duplicates.map(id => tabGroupsService.deleteTabGroupItem(id)))
        await onRefresh?.()
        alert(`已删除 ${duplicates.length} 个重复项`)
      } catch (err) {
        console.error('Failed to remove duplicates:', err)
        alert('删除失败')
      }
    }
  }

  const onLock = async (group: TabGroup) => {
    // 锁定功能：使用 tags 字段存储锁定状态
    try {
      const currentTags = group.tags || []
      const isLocked = currentTags.includes('__locked__')

      let newTags: string[]
      if (isLocked) {
        // 解锁：移除 __locked__ 标签
        newTags = currentTags.filter(tag => tag !== '__locked__')
      } else {
        // 锁定：添加 __locked__ 标签
        newTags = [...currentTags, '__locked__']
      }

      await tabGroupsService.updateTabGroup(group.id, {
        tags: newTags
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to lock/unlock:', err)
      alert('操作失败')
    }
  }

  const onMove = async (group: TabGroup) => {
    if (onOpenMoveDialog) {
      onOpenMoveDialog(group)
    } else {
      alert('移动功能开发中（请使用拖拽）')
    }
  }

  const onMoveToTrash = async (group: TabGroup) => {
    if (!confirm(`确定要删除"${group.title}"吗？`)) return

    try {
      await tabGroupsService.deleteTabGroup(group.id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('删除失败')
    }
  }

  return {
    onOpenInNewWindow,
    onOpenInCurrentWindow,
    onOpenInIncognito,
    onRename,
    onShare,
    onCopyToClipboard,
    onImportLinks,
    onCreateFolderAbove,
    onCreateFolderInside,
    onCreateFolderBelow,
    onCreateGroupAbove,
    onCreateGroupInside,
    onCreateGroupBelow,
    onPinToTop,
    onRemoveDuplicates,
    onLock,
    onMove,
    onMoveToTrash,
  }
}

