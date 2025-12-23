/**
 * 组件网格 - 统一渲染快捷方式和小组件
 * 支持分页显示和拖拽排序
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useNewtabStore } from '../../hooks/useNewtabStore';
import { Z_INDEX } from '../../constants/z-index';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import { WidgetConfigModal } from '../widgets/WidgetConfigModal';
import { BookmarkFolderModal } from '../BookmarkFolderModal';
import { SortableGridItem } from '../grid';
import { useDndDebug, useDndDebugListeners } from '../grid';
import { ActionSheet } from '../ui/ActionSheet';
import { useDragHandlers, useGridPagination } from './hooks';
import { PageIndicator, EditButton, BatchSelectBar } from './components';
import { GRID_COLS_MAP } from './types';
import type { WidgetGridProps, MergePrompt } from './types';
import type { GridItem } from '../../types';

export function WidgetGrid({
  columns,
  rows = 4,
  isBatchMode,
  batchSelectedIds,
  onBatchSelectedIdsChange,
  isEditing = false,
  onEditingChange,
}: WidgetGridProps) {
  const {
    gridItems,
    updateGridItem,
    removeGridItem,
    getFilteredGridItems,
    migrateToGridItems,
    currentFolderId,
    setCurrentFolderId,
    moveGridItemToFolder,
    mergeFolders,
    createFolderFromShortcuts,
    reorderGridItemsInCurrentScope,
    reorderGridItemsInFolderScope,
    settings,
  } = useNewtabStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItemSnapshot, setActiveItemSnapshot] = useState<GridItem | null>(null);
  const [configItem, setConfigItem] = useState<GridItem | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderMergePrompt, setFolderMergePrompt] = useState<MergePrompt | null>(null);
  const [shortcutMergePrompt, setShortcutMergePrompt] = useState<MergePrompt | null>(null);

  const { pushDndDebug } = useDndDebug();
  useDndDebugListeners(activeId, pushDndDebug);

  // 首次加载时尝试迁移数据
  useEffect(() => {
    migrateToGridItems();
  }, [migrateToGridItems]);

  // 获取当前分组的网格项
  const filteredItems = getFilteredGridItems();

  // 分页逻辑
  const {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    goToNextPage,
    goToPrevPage,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  } = useGridPagination({ items: filteredItems, columns, rows });

  // 键盘方向键切换分页
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框内，不处理
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  // 拖拽处理
  const { handleDragStart, handleDragCancel, handleDragOver, handleDragEnd } = useDragHandlers({
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
  });

  const openFolder = useMemo(
    () =>
      openFolderId
        ? gridItems.find((item) => item.id === openFolderId && item.type === 'bookmarkFolder') ?? null
        : null,
    [gridItems, openFolderId]
  );

  const openFolderItems = useMemo(() => {
    if (!openFolder) return [];
    return gridItems
      .filter((item) => (item.parentId ?? null) === openFolder.id)
      .sort((a, b) => a.position - b.position);
  }, [gridItems, openFolder]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 回调函数
  const handleMergeFolders = useCallback(() => {
    if (!folderMergePrompt) return;
    mergeFolders(folderMergePrompt.sourceId, folderMergePrompt.targetId);
    setFolderMergePrompt(null);
  }, [folderMergePrompt, mergeFolders]);

  const handleCreateFolderFromShortcuts = useCallback(() => {
    if (!shortcutMergePrompt) return;
    createFolderFromShortcuts(shortcutMergePrompt.sourceId, shortcutMergePrompt.targetId);
    setShortcutMergePrompt(null);
  }, [shortcutMergePrompt, createFolderFromShortcuts]);

  const handleReorderShortcuts = useCallback(() => {
    if (!shortcutMergePrompt) return;
    reorderGridItemsInCurrentScope(shortcutMergePrompt.sourceId, shortcutMergePrompt.targetId);
    setShortcutMergePrompt(null);
  }, [shortcutMergePrompt, reorderGridItemsInCurrentScope]);

  const handleMoveToFolder = useCallback(() => {
    if (!folderMergePrompt) return;
    moveGridItemToFolder(folderMergePrompt.sourceId, folderMergePrompt.targetId);
    setFolderMergePrompt(null);
  }, [folderMergePrompt, moveGridItemToFolder]);

  const handleOpenFolder = useCallback((folderId: string) => {
    setOpenFolderId(folderId);
  }, []);

  const handleToggleSelect = useCallback(
    (id: string) => {
      if (!onBatchSelectedIdsChange) return;
      const prev = batchSelectedIds ?? new Set<string>();
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onBatchSelectedIdsChange(next);
    },
    [batchSelectedIds, onBatchSelectedIdsChange]
  );

  useEffect(() => {
    if (currentFolderId) {
      setOpenFolderId(currentFolderId);
      setCurrentFolderId(null);
    }
  }, [currentFolderId, setCurrentFolderId]);

  const activeItem =
    activeItemSnapshot ?? (activeId ? gridItems.find((item) => item.id === activeId) : null);

  // 空状态
  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-white/50">
        <span className="text-sm">当前分组没有内容</span>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={paginatedItems.map((item) => item.id)} strategy={rectSortingStrategy}>
          <div
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div className={`grid ${GRID_COLS_MAP[columns]} gap-4 auto-rows-[80px]`}>
              {paginatedItems.map((item) => (
                <SortableGridItem
                  key={item.id}
                  item={item}
                  onUpdate={updateGridItem}
                  onRemove={removeGridItem}
                  isEditing={isEditing}
                  onConfigClick={setConfigItem}
                  onOpenFolder={handleOpenFolder}
                  isBatchMode={isBatchMode}
                  isSelected={!!batchSelectedIds?.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  shortcutStyle={settings.shortcutStyle}
                />
              ))}
            </div>

            {/* 分页指示器 */}
            <PageIndicator
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </SortableContext>

        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay zIndex={Z_INDEX.DRAG_OVERLAY}>
              {activeItem ? (
                <div className="opacity-80 pointer-events-none">
                  <WidgetRenderer
                    item={activeItem}
                    onOpenFolder={handleOpenFolder}
                    isEditing
                    isBatchMode={isBatchMode}
                    isSelected={!!batchSelectedIds?.has(activeItem.id)}
                    onToggleSelect={handleToggleSelect}
                    shortcutStyle={settings.shortcutStyle}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}

        {openFolder && (
          <BookmarkFolderModal
            folder={openFolder}
            items={openFolderItems}
            isOpen
            onClose={() => setOpenFolderId(null)}
            onOpenFolder={handleOpenFolder}
            isBatchMode={isBatchMode}
            batchSelectedIds={batchSelectedIds}
            onBatchSelectedIdsChange={onBatchSelectedIdsChange}
          />
        )}
      </DndContext>

      {configItem && (
        <WidgetConfigModal
          item={configItem}
          isOpen={!!configItem}
          onClose={() => setConfigItem(null)}
          onUpdate={updateGridItem}
          onRemove={removeGridItem}
        />
      )}

      <EditButton isEditing={isEditing} onToggle={() => onEditingChange?.(!isEditing)} />

      {isBatchMode && batchSelectedIds && onBatchSelectedIdsChange && (
        <BatchSelectBar
          filteredItems={filteredItems}
          batchSelectedIds={batchSelectedIds}
          onBatchSelectedIdsChange={onBatchSelectedIdsChange}
        />
      )}

      {/* 文件夹合并/移入选择弹窗 */}
      <ActionSheet
        isOpen={!!folderMergePrompt}
        title="文件夹操作"
        message={`将「${folderMergePrompt?.sourceName}」拖到了「${folderMergePrompt?.targetName}」上`}
        actions={[
          { label: '合并文件夹', onClick: handleMergeFolders },
          { label: '移入文件夹', onClick: handleMoveToFolder },
        ]}
        onCancel={() => setFolderMergePrompt(null)}
      />

      {/* 快捷方式合并创建文件夹弹窗 */}
      <ActionSheet
        isOpen={!!shortcutMergePrompt}
        title="创建文件夹"
        message={`将「${shortcutMergePrompt?.sourceName}」拖到了「${shortcutMergePrompt?.targetName}」上`}
        actions={[
          { label: '合并为文件夹', onClick: handleCreateFolderFromShortcuts },
          { label: '仅调整顺序', onClick: handleReorderShortcuts },
        ]}
        onCancel={() => setShortcutMergePrompt(null)}
      />
    </>
  );
}

// 导出类型
export type { WidgetGridProps } from './types';
