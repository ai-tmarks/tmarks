# 拖拽实现对比分析

## dnd-kit 官方树形拖拽实现

### 核心架构
```
树形数据 → flattenTree() → 扁平化数组 → 渲染为平面列表 → 使用 depth 控制缩进
```

### 关键特点
1. **数据扁平化**：将嵌套的树形结构转换为带 `depth` 和 `parentId` 的扁平数组
2. **平面渲染**：所有节点在同一层级渲染，通过 `depth * indentationWidth` 控制缩进
3. **动态深度**：拖拽时通过 `handleDragMove` 监听水平偏移，动态计算新的 `depth`
4. **投影计算**：使用 `getProjection()` 计算拖拽目标的深度和父节点
5. **DragOverlay**：使用 Portal 渲染拖拽预览，提供更好的视觉反馈

### 代码结构
```typescript
// 1. 扁平化树形数据
const flattenedItems = useMemo(() => {
  const flattenedTree = flattenTree(items)
  return removeChildrenOf(flattenedTree, collapsedItems)
}, [items])

// 2. 计算投影（拖拽时的目标位置）
const projected = activeId && overId
  ? getProjection(flattenedItems, activeId, overId, offsetLeft, indentationWidth)
  : null

// 3. 渲染扁平列表
{flattenedItems.map(({id, depth}) => (
  <SortableTreeItem
    key={id}
    id={id}
    depth={projected && id === activeId ? projected.depth : depth}
    indentationWidth={indentationWidth}
  />
))}

// 4. 拖拽事件
function handleDragMove({delta}: DragMoveEvent) {
  setOffsetLeft(delta.x) // 水平偏移用于计算深度变化
}
```

---

## 我们当前的实现

### 核心架构
```
树形数据 → buildTree() → 嵌套结构 → 递归渲染 TreeNode → 每个节点独立使用 useSortable
```

### 关键特点
1. **保持嵌套**：使用 `buildTree()` 构建嵌套的树形结构
2. **递归渲染**：TreeNode 组件递归渲染子节点
3. **固定深度**：每个节点的 `level` 是固定的，不会动态变化
4. **自定义位置计算**：在 `useDragAndDrop` 中手动计算 `before/inside/after`
5. **无 DragOverlay**：拖拽时节点本身变半透明

### 代码结构
```typescript
// 1. 构建嵌套树
const treeData = buildTree(tabGroups)

// 2. 递归渲染
{treeData.map((group) => (
  <TreeNode
    key={group.id}
    group={group}
    level={1}
    // TreeNode 内部递归渲染 children
  />
))}

// 3. 每个节点独立使用 useSortable
const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
  id: group.id,
  data: {type, parentId}
})
```

---

## 核心差异对比

| 特性 | dnd-kit 官方 | 我们的实现 | 影响 |
|------|-------------|-----------|------|
| **数据结构** | 扁平化数组 | 嵌套树形 | ⚠️ 嵌套结构难以处理跨层级拖拽 |
| **渲染方式** | 平面列表 | 递归嵌套 | ⚠️ 嵌套渲染可能导致拖拽冲突 |
| **深度控制** | 动态计算 | 固定 level | ⚠️ 无法通过水平拖拽改变层级 |
| **拖拽预览** | DragOverlay | 节点本身 | ⚠️ 视觉反馈较弱 |
| **性能优化** | measuring 配置 | 无 | ⚠️ 可能有性能问题 |
| **碰撞检测** | closestCenter | pointerWithin + closestCenter | ✅ 我们的更精确 |
| **位置计算** | getProjection | 自定义 before/inside/after | ✅ 我们的更符合需求 |

---

## 问题诊断

### 可能的问题原因

1. **嵌套 SortableContext 冲突**
   - 官方：所有节点在同一个 SortableContext 中
   - 我们：每个 TreeNode 可能创建了隐式的嵌套上下文

2. **Transform 应用位置**
   - 官方：transform 应用在包装器上，通过 depth 控制缩进
   - 我们：transform 应用在整个节点上，可能与树形连接线冲突

3. **事件冒泡**
   - 嵌套渲染可能导致拖拽事件在父子节点间冲突

---

## 解决方案建议

### 方案 A：保持当前架构，修复细节问题 ⭐️ 推荐
**优点**：改动小，风险低
**缺点**：无法支持水平拖拽改变层级

#### 修复步骤：
1. ✅ 使用 `CSS.Translate.toString()` 而不是 `CSS.Transform.toString()`
2. ✅ 添加 `animateLayoutChanges` 配置
3. 🔲 添加 `DragOverlay` 提供更好的拖拽预览
4. 🔲 确保 `setNodeRef` 正确应用到可拖拽元素
5. 🔲 检查树形连接线是否影响拖拽区域

### 方案 B：重构为扁平化架构
**优点**：完全符合官方最佳实践，支持水平拖拽改变层级
**缺点**：需要大量重构，风险较高

#### 重构步骤：
1. 实现 `flattenTree()` 函数
2. 实现 `getProjection()` 函数
3. 修改渲染逻辑为平面列表
4. 添加 `handleDragMove` 处理深度变化
5. 重新实现树形连接线（基于 depth）

---

## 当前状态

### 已修复 ✅
- 导入 `CSS` 工具
- 使用 `CSS.Translate.toString(transform)`
- 添加 `animateLayoutChanges` 配置
- 树形连接线使用固定宽度布局

### 待验证 🔍
- 拖拽是否能正常工作
- 树形连接线是否正确显示
- 拖拽时的视觉反馈是否流畅

### 可选优化 💡
- 添加 DragOverlay
- 添加 measuring 配置
- 支持水平拖拽改变层级（需要重构）
