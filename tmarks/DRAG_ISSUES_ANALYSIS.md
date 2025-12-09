# 拖拽问题分析

## 问题 1: 中间部分拖拽后从最上面闪烁下来

### 原因分析

**问题根源**：`animateLayoutChanges` 配置不当

```typescript
// TreeNode.tsx - 当前配置
animateLayoutChanges: ({isSorting, wasDragging}) =>
  isSorting || wasDragging ? false : true,
```

这个配置的含义：
- `isSorting || wasDragging` 时返回 `false` → **禁用动画**
- 其他时候返回 `true` → **启用动画**

**问题**：拖拽结束后，`wasDragging` 变为 `false`，此时 `animateLayoutChanges` 返回 `true`，触发了布局动画。由于数据更新导致节点从原位置（可能在列表中间）重新渲染到新位置，React 的 reconciliation 算法可能导致节点先出现在列表顶部，然后动画到正确位置，造成"闪烁"效果。

### 解决方案

**方案 A：完全禁用布局动画** ⭐️ 推荐
```typescript
animateLayoutChanges: () => false
```

**方案 B：使用官方推荐配置**
```typescript
animateLayoutChanges: ({isSorting, wasDragging}) =>
  !(isSorting || wasDragging)
```

**方案 C：移除 animateLayoutChanges**
```typescript
// 不配置，使用默认行为
useSortable({
  id: group.id,
  data: {...},
  disabled: isLocked
})
```

---

## 问题 2: 左侧拖拽分组到文件夹失败

### 原因分析

**有两个独立的 DndContext**：

1. **左侧树形** (`TabGroupTree`)
   ```typescript
   <DndContext
     sensors={sensors}
     collisionDetection={collisionDetection}
     onDragStart={handleDragStart}
     onDragOver={handleDragOver}
     onDragEnd={handleDragEnd}
     onDragCancel={handleDragCancel}
   >
     <TreeNode ... />
   </DndContext>
   ```

2. **中间详情页** (`TabGroupsPage`)
   ```typescript
   <DndContext
     sensors={sensors}
     collisionDetection={closestCenter}
     onDragEnd={handleDragEnd}
   >
     <TabItemList ... />
   </DndContext>
   ```

**问题**：
- 两个 DndContext 是**完全独立**的
- 左侧的拖拽事件不会影响中间的内容
- 中间的拖拽事件不会影响左侧的树形结构
- 它们使用不同的 `sensors` 和 `collisionDetection`

### 可能的失败原因

#### 1. 数据未正确更新

检查 `handleMoveGroup` 是否正确调用：

```typescript
// useDragAndDrop.ts
if (currentDropPosition === 'inside' && targetGroup.is_folder === 1) {
  logger.log('  → Moving inside folder')
  await onMoveGroup(draggedGroup.id, targetGroup.id, 0)  // ⚠️ 检查这里
}
```

#### 2. 后端 API 调用失败

检查 `onMoveGroup` 的实现：

```typescript
// TabGroupsPage.tsx
const handleMoveGroup = async (
  groupId: string,
  newParentId: string | null,
  newPosition: number
) => {
  // ⚠️ 检查 API 调用是否成功
  // ⚠️ 检查错误处理
  // ⚠️ 检查数据刷新
}
```

#### 3. 循环嵌套检查过于严格

```typescript
// useDragAndDrop.ts
if (draggedGroup.is_folder === 1) {
  const isDescendant = (parentId: string, childId: string): boolean => {
    const child = tabGroups.find(g => g.id === childId)
    if (!child || !child.parent_id) return false
    if (child.parent_id === parentId) return true
    return isDescendant(parentId, child.parent_id)
  }

  if (isDescendant(draggedGroup.id, targetGroup.id)) {
    logger.log('  ❌ Cannot move folder into its descendant')
    return  // ⚠️ 可能误判
  }
}
```

#### 4. 拖拽指示器未正确显示

检查 `dropPosition` 是否正确计算：

```typescript
// useDragAndDrop.ts - handleDragOver
if (overGroup.is_folder === 1) {
  if (relativeYPercent < 0.25) {
    setDropPosition('before')
  } else if (relativeYPercent > 0.75) {
    setDropPosition('after')
  } else {
    setDropPosition('inside')  // ⚠️ 检查这里是否触发
  }
}
```

---

## 调试步骤

### 问题 1: 闪烁问题

1. 打开浏览器开发者工具
2. 在 TreeNode.tsx 中修改 `animateLayoutChanges`
3. 测试拖拽是否还有闪烁

### 问题 2: 拖拽到文件夹失败

1. 打开浏览器控制台
2. 拖拽分组到文件夹
3. 查看 logger 输出：
   ```
   🎯 DragEnd: {...}
     → Moving inside folder
   ```
4. 检查是否有错误信息
5. 检查网络请求是否成功
6. 检查数据是否刷新

---

## 修复方案

### 修复 1: 禁用布局动画

```typescript
// TreeNode.tsx
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({
  id: group.id,
  data: {
    type: isFolder ? 'folder' : 'group',
    parentId: group.parent_id,
  },
  disabled: isLocked,
  // 完全禁用布局动画，避免闪烁
  animateLayoutChanges: () => false,
})
```

### 修复 2: 添加详细日志

```typescript
// useDragAndDrop.ts - handleDragEnd
logger.log('🎯 DragEnd:', {
  draggedId: draggedGroup.id,
  draggedTitle: draggedGroup.title,
  draggedIsFolder: draggedGroup.is_folder,
  targetId: targetGroup.id,
  targetTitle: targetGroup.title,
  targetIsFolder: targetGroup.is_folder,
  dropPosition: currentDropPosition,
  draggedParentId: draggedGroup.parent_id,
  targetParentId: targetGroup.parent_id,
})

if (currentDropPosition === 'inside' && targetGroup.is_folder === 1) {
  logger.log('  ✅ Conditions met for moving inside folder')
  
  if (draggedGroup.is_folder === 1) {
    logger.log('  🔍 Checking for circular nesting...')
    if (isDescendant(draggedGroup.id, targetGroup.id)) {
      logger.log('  ❌ Cannot move folder into its descendant')
      return
    }
    logger.log('  ✅ No circular nesting detected')
  }

  logger.log('  → Calling onMoveGroup:', {
    groupId: draggedGroup.id,
    newParentId: targetGroup.id,
    newPosition: 0
  })
  
  try {
    await onMoveGroup(draggedGroup.id, targetGroup.id, 0)
    logger.log('  ✅ Move completed successfully')
  } catch (error) {
    logger.error('  ❌ Move failed:', error)
  }
}
```

### 修复 3: 确保数据刷新

```typescript
// TabGroupsPage.tsx - handleMoveGroup
const handleMoveGroup = async (
  groupId: string,
  newParentId: string | null,
  newPosition: number
) => {
  try {
    logger.log('📝 handleMoveGroup called:', { groupId, newParentId, newPosition })
    
    // 调用 API
    await moveTabGroup(groupId, newParentId, newPosition)
    
    logger.log('✅ API call successful, refreshing data...')
    
    // 刷新数据
    await refreshData()
    
    logger.log('✅ Data refreshed')
  } catch (error) {
    logger.error('❌ handleMoveGroup failed:', error)
    throw error
  }
}
```

---

## 测试清单

### 问题 1: 闪烁
- [ ] 拖拽节点到同级前面
- [ ] 拖拽节点到同级后面
- [ ] 拖拽节点到文件夹内部
- [ ] 拖拽后是否还有闪烁

### 问题 2: 拖拽到文件夹
- [ ] 拖拽普通分组到文件夹 → 检查 logger
- [ ] 拖拽文件夹到另一个文件夹 → 检查 logger
- [ ] 检查网络请求是否成功
- [ ] 检查数据是否正确更新
- [ ] 检查 UI 是否正确刷新
