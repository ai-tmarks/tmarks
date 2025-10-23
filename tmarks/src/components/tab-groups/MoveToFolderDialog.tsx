import { useState, useEffect } from 'react'
import { Folder, Home, ChevronRight, ChevronDown } from 'lucide-react'
import type { TabGroup } from '@/lib/types'

interface MoveToFolderDialogProps {
  isOpen: boolean
  currentGroup: TabGroup
  allGroups: TabGroup[]
  onConfirm: (targetFolderId: string | null) => void
  onCancel: () => void
}

export function MoveToFolderDialog({
  isOpen,
  currentGroup,
  allGroups,
  onConfirm,
  onCancel,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // 获取所有子孙节点的 ID（用于排除循环嵌套）
  const getDescendantIds = (groupId: string): Set<string> => {
    const descendants = new Set<string>([groupId])
    const children = allGroups.filter(g => g.parent_id === groupId)
    children.forEach(child => {
      getDescendantIds(child.id).forEach(id => descendants.add(id))
    })
    return descendants
  }

  // 排除当前项及其所有子孙项
  const excludedIds = getDescendantIds(currentGroup.id)
  const availableFolders = allGroups.filter(
    g => g.is_folder === 1 && !excludedIds.has(g.id)
  )

  // 构建树形结构
  const buildTree = (parentId: string | null = null): TabGroup[] => {
    return availableFolders
      .filter(g => (g.parent_id || null) === parentId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleConfirm = () => {
    onConfirm(selectedFolderId)
  }

  const handleCancel = () => {
    setSelectedFolderId(null)
    onCancel()
  }

  if (!isOpen) return null

  // 递归渲染文件夹树
  const renderFolderTree = (folders: TabGroup[], level: number = 0) => {
    return folders.map(folder => {
      const isExpanded = expandedFolders.has(folder.id)
      const isSelected = selectedFolderId === folder.id
      const children = buildTree(folder.id)
      const hasChildren = children.length > 0

      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-primary text-primary-content'
                : 'hover:bg-base-200'
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => setSelectedFolderId(folder.id)}
          >
            {/* 展开/折叠图标 */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFolder(folder.id)
                }}
                className="w-4 h-4 flex items-center justify-center hover:bg-base-300 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}

            {/* 文件夹图标 */}
            <Folder className="w-4 h-4 flex-shrink-0" />

            {/* 文件夹名称 */}
            <span className="flex-1 truncate text-sm">{folder.title}</span>

            {/* 项目数量 */}
            {folder.item_count !== undefined && (
              <span className="text-xs opacity-60">
                {folder.item_count}
              </span>
            )}
          </div>

          {/* 子文件夹 */}
          {isExpanded && hasChildren && (
            <div>{renderFolderTree(children, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  const rootFolders = buildTree(null)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* 弹窗内容 */}
      <div
        className="relative card rounded-3xl shadow-2xl border max-w-lg w-full animate-scale-in"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* 标题 */}
        <div className="mb-6">
          <h3 className="font-bold text-2xl text-base-content">移动到文件夹</h3>
          <p className="text-sm text-base-content/70 mt-2">
            选择目标文件夹，将"{currentGroup.title}"移动到该位置
          </p>
        </div>

        {/* 文件夹列表 */}
        <div
          className="border rounded-xl overflow-hidden mb-6"
          style={{
            borderColor: 'var(--border)',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {/* 根目录选项 */}
          <div
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b ${
              selectedFolderId === null
                ? 'bg-primary text-primary-content'
                : 'hover:bg-base-200'
            }`}
            style={{ borderColor: 'var(--border)' }}
            onClick={() => setSelectedFolderId(null)}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">根目录</span>
          </div>

          {/* 文件夹树 */}
          <div className="py-1">
            {rootFolders.length > 0 ? (
              renderFolderTree(rootFolders)
            ) : (
              <div className="px-3 py-8 text-center text-sm text-base-content/50">
                没有可用的文件夹
              </div>
            )}
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-3">
          <button onClick={handleCancel} className="btn btn-outline flex-1">
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="btn flex-1"
            disabled={selectedFolderId === currentGroup.parent_id}
          >
            确定移动
          </button>
        </div>
      </div>
    </div>
  )
}

