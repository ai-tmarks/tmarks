import { useState, useCallback } from 'react'
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { pointerWithin, closestCenter } from '@dnd-kit/core'
import type { TabGroup } from '@/lib/types'
import { logger } from '@/lib/logger'

type DropPosition = 'before' | 'inside' | 'after'

interface UseDragAndDropProps {
  tabGroups: TabGroup[]
  onMoveGroup?: (groupId: string, newParentId: string | null, newPosition: number) => Promise<void>
}

export function useDragAndDrop({ tabGroups, onMoveGroup }: UseDragAndDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions && pointerCollisions.length > 0) {
      return pointerCollisions
    }
    return closestCenter(args)
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event
    const currentOverId = over?.id as string | null
    setOverId(currentOverId)

    if (!currentOverId || !over) {
      setDropPosition(null)
      return
    }

    const overGroup = tabGroups.find(g => g.id === currentOverId)
    if (!overGroup) {
      setDropPosition(null)
      return
    }

    // 获取目标元素的矩形
    const overRect = over.rect
    if (!overRect || overRect.height === 0) {
      setDropPosition(null)
      return
    }

    // 使用 active.rect.current.translated 获取当前拖拽元素的位置
    const activeTranslated = active.rect.current.translated
    if (!activeTranslated) {
      setDropPosition(null)
      return
    }

    // 计算拖拽元素中心点相对于目标元素的位置
    const activeCenterY = activeTranslated.top + activeTranslated.height / 2
    const relativeY = activeCenterY - overRect.top
    const relativeYPercent = relativeY / overRect.height

    // 根据目标是否为文件夹，使用不同的判断逻辑
    if (overGroup.is_folder === 1) {
      // 文件夹：上方 25% = before，中间 50% = inside，下方 25% = after
      if (relativeYPercent < 0.25) {
        setDropPosition('before')
      } else if (relativeYPercent > 0.75) {
        setDropPosition('after')
      } else {
        setDropPosition('inside')
      }
    } else {
      // 普通分组：上方 50% = before，下方 50% = after
      if (relativeYPercent < 0.5) {
        setDropPosition('before')
      } else {
        setDropPosition('after')
      }
    }
  }, [tabGroups])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    const currentDropPosition = dropPosition

    // 清理状态
    setActiveId(null)
    setOverId(null)
    setDropPosition(null)

    if (!over || active.id === over.id || !onMoveGroup) return

    const draggedGroup = tabGroups.find(g => g.id === active.id)
    const targetGroup = tabGroups.find(g => g.id === over.id)

    if (!draggedGroup || !targetGroup) return

    logger.log('🎯 DragEnd:', {
      dragged: draggedGroup.title,
      target: targetGroup.title,
      targetIsFolder: targetGroup.is_folder === 1,
      dropPosition: currentDropPosition
    })

    // 拖拽到文件夹内部
    if (currentDropPosition === 'inside' && targetGroup.is_folder === 1) {
      // 检查循环嵌套（不能把文件夹拖到自己的子孙节点内）
      if (draggedGroup.is_folder === 1) {
        const isDescendant = (parentId: string, childId: string): boolean => {
          const child = tabGroups.find(g => g.id === childId)
          if (!child || !child.parent_id) return false
          if (child.parent_id === parentId) return true
          return isDescendant(parentId, child.parent_id)
        }

        if (isDescendant(draggedGroup.id, targetGroup.id)) {
          logger.log('  ❌ Cannot move folder into its descendant')
          return
        }
      }

      logger.log('  → Moving inside folder:', targetGroup.title)
      await onMoveGroup(draggedGroup.id, targetGroup.id, 0)
      return
    }

    // 移动到同级（before 或 after）
    const newParentId = targetGroup.parent_id || null
    const siblings = tabGroups.filter(g => (g.parent_id || null) === newParentId)
    
    let targetIndex = siblings.findIndex(g => g.id === targetGroup.id)
    if (currentDropPosition === 'after') {
      targetIndex++
    }

    // 如果在同一父级内移动，需要调整索引
    const currentIndex = siblings.findIndex(g => g.id === draggedGroup.id)
    if (currentIndex !== -1 && currentIndex < targetIndex) {
      targetIndex--
    }

    const newPosition = Math.max(0, targetIndex)
    logger.log('  → Moving to position:', newPosition, 'under parent:', newParentId)
    await onMoveGroup(draggedGroup.id, newParentId, newPosition)
  }, [dropPosition, tabGroups, onMoveGroup])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
    setDropPosition(null)
  }, [])

  return {
    sensors,
    collisionDetection,
    activeId,
    overId,
    dropPosition,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  }
}
