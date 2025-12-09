# dnd-kit 官方树形拖拽实现分析

## 核心架构差异

### 官方实现
```
嵌套树形数据 → flattenTree() → 扁平化数组 → 平面列表渲染 → depth 控制缩进
```

### 我们的实现
```
嵌套树形数据 → buildTree() → 嵌套结构 → 递归渲染 → level 控制缩进
```

## 官方关键实现

### 1. 数据扁平化
```typescript
// 将嵌套树转为扁平数组，每个节点带有 depth 和 parentId
const flattenedItems = useMemo(() => {
  const flattenedTree = flattenTree(items);
  // 移除被折叠节点的子节点和正在拖拽节点的子节点
  return removeChildrenOf(
    flattenedTree,
    activeId != null ? [activeId, ...collapsedItems] : collapsedItems
  );
}, [activeId, items]);
```

### 2. 平面列表渲染（关键！）
```typescript
// 所有节点在同一层级渲染，通过 CSS 变量控制缩进
{flattenedItems.map(({id, children, collapsed, depth}) => (
  <SortableTreeItem
    key={id}
    id={id}
    depth={id === activeId && projected ? projected.depth : depth}
    indentationWidth={indentationWidth}
  />
))}
```

### 3. CSS 缩进控制
```css
.Wrapper {
  padding-left: var(--spacing);  /* 通过 CSS 变量控制缩进 */
}
```

```typescript
style={{
  '--spacing': `${indentationWidth * depth}px`,
} as React.CSSProperties}
```

### 4. 拖拽时的视觉效果
```css
/* ghost 状态 - 拖拽时原位置的占位符 */
&.ghost {
  &.indicator {
    opacity: 1;
    .TreeItem {
      height: 8px;  /* 变成一条线！ */
      border-color: #2389ff;
      background-color: #56a1f8;
      
      &:before {
        /* 左侧圆点 */
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      
      > * {
        opacity: 0;  /* 隐藏内容 */
        height: 0;
      }
    }
  }
  
  &:not(.indicator) {
    opacity: 0.5;  /* 非指示器模式，半透明 */
  }
}
```

### 5. DragOverlay 使用 Portal
```typescript
{createPortal(
  <DragOverlay dropAnimation={dropAnimationConfig}>
    {activeId && activeItem ? (
      <SortableTreeItem
        id={activeId}
        depth={activeItem.depth}
        clone  // 克隆模式
        childCount={getChildCount(items, activeId) + 1}
      />
    ) : null}
  </DragOverlay>,
  document.body  // 渲染到 body，不受容器限制
)}
```

### 6. animateLayoutChanges 配置
```typescript
const animateLayoutChanges: AnimateLayoutChanges = ({isSorting, wasDragging}) =>
  isSorting || wasDragging ? false : true;
// 拖拽过程中禁用动画，拖拽结束后启用
```

### 7. measuring 配置
```typescript
const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,  // 始终测量
  },
};
```

## 核心差异对比

| 特性 | 官方实现 | 我们的实现 | 影响 |
|------|---------|-----------|------|
| 渲染方式 | 平面列表 | 递归嵌套 | ⚠️ 嵌套导致 transform 冲突 |
| 缩进控制 | CSS 变量 | paddingLeft | ✅ 效果相同 |
| 拖拽指示器 | 变成横线 | 添加边框 | ⚠️ 我们的不够明显 |
| DragOverlay | Portal 到 body | 在 DndContext 内 | ⚠️ 可能被容器裁剪 |
| 元素移动 | 不移动，只显示指示器 | 元素会移动 | ⚠️ 这是主要问题！ |

## 问题根源

**官方的 `indicator` 模式**：
- 拖拽时，原位置的元素变成一条横线（高度 8px）
- 其他元素完全不移动
- 只有横线指示插入位置

**我们的实现**：
- 使用 `verticalListSortingStrategy`，元素会自动重排
- 没有 `indicator` 模式
- 元素会跟随拖拽移动

## 解决方案

### 方案 A：使用 indicator 模式（推荐）

1. 修改 TreeNode 样式，拖拽时变成横线
2. 禁用元素自动移动
3. 只显示插入位置指示器

### 方案 B：完全禁用 transform

1. 不应用 transform 到元素
2. 只使用 DragOverlay 显示拖拽预览
3. 手动显示插入指示器

### 方案 C：重构为扁平化架构

1. 使用 flattenTree 扁平化数据
2. 平面列表渲染
3. 完全按照官方实现
