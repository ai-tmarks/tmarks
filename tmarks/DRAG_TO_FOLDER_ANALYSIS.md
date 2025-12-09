# 拖拽到文件夹内部 - 完整分析

## 当前实现的问题

### 1. ❌ `attributes` 和 `listeners` 的应用位置错误

**当前代码**：
```tsx
<div
  ref={setNodeRef}
  style={style}
  {...attributes}
  {...(isLocked ? {} : listeners)}  // ❌ 应用在整个节点行
  className="..."
>
  <button onClick={toggleGroup}>...</button>  // 展开按钮也会触发拖拽
  <div>图标和标题</div>
  <DropdownMenu />  // 菜单按钮也会触发拖拽
</div>
```

**问题**：
- 点击展开按钮会触发拖拽
- 点击菜单按钮会触发拖拽
- 整个节点行都是拖拽区域，无法精确控制

**正确做法**：
```tsx
<div ref={setNodeRef} style={style} className="...">
  <button onClick={toggleGroup}>...</button>  // 不触发拖拽
  <div {...attributes} {...listeners}>  // 只有这部分可拖拽
    图标和标题
  </div>
  <DropdownMenu />  // 不触发拖拽
</div>
```

### 2. ✅ `handleDragOver` 的位置计算已修复

**之前的问题**：
```typescript
const pointerY = event.activatorEvent.clientY  // ❌ 始终是初始位置
```

**已修复**：
```typescript
const deltaY = activeRect.translated ? activeRect.translated.top - initialRect.top : 0
const currentPointerY = pointerInitialY + deltaY  // ✅ 当前位置
```

### 3. ✅ `handleDragEnd` 的逻辑正确

```typescript
if (currentDropPosition === 'inside' && targetGroup.is_folder === 1) {
  // 放入文件夹内部
  await onMoveGroup(draggedGroup.id, targetGroup.id, 0)
}
```

### 4. ✅ 拖拽指示器的显示正确

```tsx
{isDropTarget && dropPosition === 'inside' && isFolder && (
  <div className="bg-primary/10 border-2 border-primary border-dashed" />
)}
```

---

## 完整的拖拽流程

### 1. 拖拽开始 (handleDragStart)
```typescript
setActiveId(event.active.id)
pointerInitialYRef.current = event.activatorEvent.clientY  // 记录初始位置
```

### 2. 拖拽中 (handleDragOver)
```typescript
// 1. 获取目标元素
const overGroup = tabGroups.find(g => g.id === overId)

// 2. 计算当前鼠标位置
const deltaY = activeRect.translated.top - initialRect.top
const currentPointerY = pointerInitialY + deltaY

// 3. 计算相对位置百分比
const relativeY = currentPointerY - overRect.top
const relativeYPercent = relativeY / overRect.height

// 4. 判断位置
if (overGroup.is_folder === 1) {
  if (relativeYPercent < 0.25) {
    setDropPosition('before')  // 上方 25%
  } else if (relativeYPercent > 0.75) {
    setDropPosition('after')   // 下方 25%
  } else {
    setDropPosition('inside')  // 中间 50% ⭐️
  }
}
```

### 3. 拖拽结束 (handleDragEnd)
```typescript
if (currentDropPosition === 'inside' && targetGroup.is_folder === 1) {
  // 检查是否拖拽文件夹到自己的子孙节点
  if (draggedGroup.is_folder === 1) {
    if (isDescendant(draggedGroup.id, targetGroup.id)) {
      return  // 阻止循环嵌套
    }
  }
  
  // 移动到文件夹内部，position = 0
  await onMoveGroup(draggedGroup.id, targetGroup.id, 0)
}
```

### 4. 视觉反馈 (TreeNode)
```tsx
// 1. 判断是否为拖放目标
const isDropTarget = overId === group.id && !isBeingDragged

// 2. 根据位置显示指示器
{isDropTarget && dropPosition === 'before' && (
  <div className="h-0.5 bg-primary mx-3 -mt-0.5" />
)}

{isDropTarget && dropPosition === 'inside' && isFolder && (
  <div className="bg-primary/10 border-2 border-primary border-dashed" />
)}

{isDropTarget && dropPosition === 'after' && (
  <div className="h-0.5 bg-primary mx-3 -mb-0.5" />
)}
```

---

## 需要修复的问题

### 问题 1: `listeners` 应用位置

**当前**：应用在整个节点行
**应该**：只应用在标题区域

**修复方案**：
```tsx
<div ref={setNodeRef} style={style} className="...">
  {/* 树形连接线 */}
  {level > 0 && ...}
  
  {/* 展开/折叠按钮 - 不触发拖拽 */}
  <button onClick={toggleGroup}>...</button>
  
  {/* 可拖拽区域 - 只有这部分可拖拽 */}
  <div
    {...attributes}
    {...(isLocked ? {} : listeners)}
    className="flex items-center gap-1.5 flex-1 min-w-0 cursor-grab"
  >
    {/* 图标 */}
    {isFolder ? <FolderOpen /> : <Circle />}
    
    {/* 标题 */}
    <span>{group.title}</span>
    
    {/* 数量 */}
    <span>{getTotalItemCount(group)}</span>
  </div>
  
  {/* 菜单按钮 - 不触发拖拽 */}
  <DropdownMenu />
</div>
```

---

## 测试清单

- [ ] 拖拽普通节点到文件夹上方 → before
- [ ] 拖拽普通节点到文件夹中间 → inside ⭐️
- [ ] 拖拽普通节点到文件夹下方 → after
- [ ] 拖拽文件夹到另一个文件夹内部 → inside
- [ ] 拖拽文件夹到自己的子节点 → 阻止
- [ ] 点击展开按钮不触发拖拽
- [ ] 点击菜单按钮不触发拖拽
- [ ] 拖拽指示器正确显示
- [ ] 拖拽后数据正确更新

---

## 关键代码位置

1. **位置计算**: `tmarks/src/components/tab-groups/tree/useDragAndDrop.ts` - `handleDragOver`
2. **移动逻辑**: `tmarks/src/components/tab-groups/tree/useDragAndDrop.ts` - `handleDragEnd`
3. **视觉反馈**: `tmarks/src/components/tab-groups/tree/TreeNode.tsx` - 拖放指示器
4. **拖拽区域**: `tmarks/src/components/tab-groups/tree/TreeNode.tsx` - `listeners` 应用位置 ⚠️ 需要修复
