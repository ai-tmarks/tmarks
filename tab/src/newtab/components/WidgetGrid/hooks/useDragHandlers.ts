/**
 * 拖拽处理 Hook
 */

import { useCallback, useRef } from 'react';
import type { DragEndEvent, DragCancelEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { GridItem } from '../../../types';
import type { MergePrompt } from '../types';

interface UseDragHandlersProps {
  gridItems: GridItem[];
  openFolderId: string | null;
  pushDndDebug: (data: any) => void;
  moveGridItemToFolder: (itemId: string, folderId: string | null) => void;
  reorderGridItemsInCurrentScope: (activeId: string, overId: string) => void;
  reorderGridItemsInFolderScope: (folderId: string, activeId: string, overId: string) => void;
  setFolderMergePrompt: (prompt: MergePrompt | null) => void;
  setShortcutMergePrompt: (prompt: MergePrompt | null) => void;
  setActiveId: (id: string | null) => void;
  setActiveItemSnapshot: (item: GridItem | null) => void;
}

export function useDragHandlers({
  gridItems,
  openFolderId,
  pushDndDebug,
  moveGridItemToFolder,
  reorderGridItemsInCurrentScope,
  reorderGridItemsInFolderScope,
  setFolderMergePrompt,
  setShortcutMergePrompt,
  setActiveId,
  setActiveItemSnapshot,
}: UseDragHandlersProps) {
  const lastOverIdRef = useRef<string | null>(null);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveId(id);
      const snapshot = gridItems.find((item) => item.id === id) ?? null;
      setActiveItemSnapshot(snapshot);
      lastOverIdRef.current = null;
      pushDndDebug({
        type: 'start',
        id,
        hasSnapshot: !!snapshot,
        snapshotType: snapshot?.type ?? null,
        ts: Date.now(),
      });
    },
    [gridItems, pushDndDebug, setActiveId, setActiveItemSnapshot]
  );

  const handleDragCancel = useCallback(
    (event: DragCancelEvent) => {
      pushDndDebug({
        type: 'cancel',
        id: String(event.active.id),
        lastOverId: lastOverIdRef.current,
        ts: Date.now(),
      });
      setActiveId(null);
      setActiveItemSnapshot(null);
      lastOverIdRef.current = null;
    },
    [pushDndDebug, setActiveId, setActiveItemSnapshot]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id ? String(event.over.id) : null;
      if (lastOverIdRef.current !== overId) {
        lastOverIdRef.current = overId;
        pushDndDebug({
          type: 'over',
          id: String(event.active.id),
          overId,
          ts: Date.now(),
        });
      }
    },
    [pushDndDebug]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      pushDndDebug({
        type: 'end',
        id: String(active.id),
        overId: over?.id ? String(over.id) : null,
        ts: Date.now(),
      });
      setActiveId(null);
      setActiveItemSnapshot(null);
      lastOverIdRef.current = null;

      if (!over || active.id === over.id) return;

      const overId = String(over.id);

      // 处理从文件夹弹窗中拖出
      if (overId.startsWith('folder-modal-undock-parent:')) {
        const payload = overId.replace('folder-modal-undock-parent:', '');
        const [sourceFolderId, targetParentToken] = payload.split(':');
        const targetParentId =
          !targetParentToken || targetParentToken === 'root' ? null : targetParentToken;

        if (!targetParentToken) {
          const sourceFolder = gridItems.find((item) => item.id === sourceFolderId);
          moveGridItemToFolder(active.id as string, (sourceFolder?.parentId ?? null) as string | null);
          return;
        }

        moveGridItemToFolder(active.id as string, targetParentId);
        return;
      }

      // 文件夹内重排序
      if (openFolderId) {
        const activeItem = gridItems.find((item) => item.id === String(active.id));
        const overItem = gridItems.find((item) => item.id === String(over.id));
        if (
          activeItem &&
          overItem &&
          (activeItem.parentId ?? null) === openFolderId &&
          (overItem.parentId ?? null) === openFolderId
        ) {
          reorderGridItemsInFolderScope(openFolderId, String(active.id), String(over.id));
          return;
        }
      }

      const overItem = gridItems.find((item) => item.id === over.id);
      
      // 拖到文件夹上
      if (overItem?.type === 'bookmarkFolder') {
        const activeItem = gridItems.find((item) => item.id === active.id);

        if (activeItem?.type === 'bookmarkFolder') {
          setFolderMergePrompt({
            sourceId: String(active.id),
            targetId: overItem.id,
            sourceName: activeItem.bookmarkFolder?.title || '文件夹',
            targetName: overItem.bookmarkFolder?.title || '文件夹',
          });
          return;
        }

        moveGridItemToFolder(active.id as string, overItem.id);
        return;
      }

      // 两个快捷方式碰撞
      const activeItem = gridItems.find((item) => item.id === active.id);
      if (activeItem?.type === 'shortcut' && overItem?.type === 'shortcut') {
        setShortcutMergePrompt({
          sourceId: String(active.id),
          targetId: String(over.id),
          sourceName: activeItem.shortcut?.title || '快捷方式',
          targetName: overItem.shortcut?.title || '快捷方式',
        });
        return;
      }

      reorderGridItemsInCurrentScope(active.id as string, over.id as string);
    },
    [
      gridItems,
      openFolderId,
      pushDndDebug,
      moveGridItemToFolder,
      reorderGridItemsInCurrentScope,
      reorderGridItemsInFolderScope,
      setFolderMergePrompt,
      setShortcutMergePrompt,
      setActiveId,
      setActiveItemSnapshot,
    ]
  );

  return {
    handleDragStart,
    handleDragCancel,
    handleDragOver,
    handleDragEnd,
  };
}
