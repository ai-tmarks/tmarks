import {
  ExternalLink,
  Edit2,
  Share2,
  Copy,
  FolderPlus as FolderPlusIcon,
  Trash2,
  Move,
  Lock,
  Pin
} from 'lucide-react'
import type { MenuItem } from '@/components/common/DropdownMenu'
import type { TabGroup } from '@/lib/types'
import type { TabGroupMenuActions } from '@/hooks/useTabGroupMenu'

interface TreeNodeMenuConfig {
  group: TabGroup
  isFolder: boolean
  isLocked: boolean
  menuActions: TabGroupMenuActions
}

/**
 * 构建树节点的右键菜单项
 */
export function buildTreeNodeMenu({
  group,
  isFolder,
  isLocked,
  menuActions
}: TreeNodeMenuConfig): MenuItem[] {
  return [
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
}
