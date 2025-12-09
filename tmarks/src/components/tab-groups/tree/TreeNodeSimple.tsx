/**
 * 简化版树形节点 - 使用 CSS 伪元素绘制连接线
 * 参考 VSCode 的实现方式
 */

import { ChevronRight, ChevronDown, Folder, FolderOpen, Circle } from 'lucide-react'
import type { TabGroup } from '@/lib/types'
import './TreeNode.css'

interface TreeNodeSimpleProps {
  group: TabGroup
  level: number
  isLast: boolean
  parentHasMore: boolean[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
  expandedGroups: Set<string>
  onToggleExpand: (groupId: string) => void
}

export function TreeNodeSimple({
  group,
  level,
  isLast,
  parentHasMore,
  selectedGroupId,
  onSelectGroup,
  expandedGroups,
  onToggleExpand,
}: TreeNodeSimpleProps) {
  const isSelected = selectedGroupId === group.id
  const isExpanded = expandedGroups.has(group.id)
  const hasChildren = (group.children?.length || 0) > 0
  const isFolder = group.is_folder === 1

  return (
    <div className="tree-node">
      {/* 节点行 */}
      <div
        className={`tree-node-row ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectGroup(group.id)}
      >
        {/* 缩进和连接线 */}
        {Array.from({ length: level }).map((_, idx) => {
          const isLastLevel = idx === level - 1
          const hasVerticalLine = idx < level - 1 ? parentHasMore[idx] : !isLast
          
          return (
            <span
              key={idx}
              className={`tree-indent ${hasVerticalLine ? 'has-vertical-line' : ''} ${isLastLevel ? 'has-corner' : ''}`}
            />
          )
        })}

        {/* 展开/折叠按钮 */}
        {isFolder && hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(group.id)
            }}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* 图标 */}
        <div className="flex-shrink-0 ml-1">
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-primary" />
            )
          ) : (
            <Circle
              className={`w-2 h-2 ${isSelected ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
          )}
        </div>

        {/* 标题 */}
        <span className={`text-sm flex-1 ml-2 truncate ${isSelected ? 'text-primary font-medium' : 'text-foreground'}`}>
          {group.title}
        </span>

        {/* 数量 */}
        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
          {group.item_count || 0}
        </span>
      </div>

      {/* 子节点 */}
      {isExpanded && hasChildren && group.children && (
        <div className="tree-children">
          {group.children.map((child, index) => (
            <TreeNodeSimple
              key={child.id}
              group={child}
              level={level + 1}
              isLast={index === group.children!.length - 1}
              parentHasMore={[...parentHasMore, !isLast]}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              expandedGroups={expandedGroups}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}
