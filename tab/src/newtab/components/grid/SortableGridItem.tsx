/**
 * 可排序的网格项包装器
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import { getSizeSpan } from '../widgets/widgetRegistry';
import type { GridItem } from '../../types';

interface SortableGridItemProps {
  item: GridItem;
  onUpdate?: (id: string, updates: Partial<GridItem>) => void;
  onRemove?: (id: string) => void;
  isEditing?: boolean;
  onConfigClick?: (item: GridItem) => void;
  onOpenFolder?: (folderId: string) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  shortcutStyle?: 'icon' | 'card';
}

export function SortableGridItem({
  item,
  onUpdate,
  onRemove,
  isEditing,
  onConfigClick,
  onOpenFolder,
  isBatchMode,
  isSelected,
  onToggleSelect,
  shortcutStyle,
}: SortableGridItemProps) {
  const { cols, rows } = getSizeSpan(item.size);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${cols}`,
    gridRow: `span ${rows}`,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isEditing && item.type !== 'shortcut') {
      e.preventDefault();
      e.stopPropagation();
      onConfigClick?.(item);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none cursor-grab active:cursor-grabbing`}
      onDoubleClick={handleDoubleClick}
    >
      <WidgetRenderer
        item={item}
        onUpdate={onUpdate}
        onRemove={onRemove}
        isEditing={isEditing}
        onOpenFolder={onOpenFolder}
        isBatchMode={isBatchMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        shortcutStyle={shortcutStyle}
      />
    </div>
  );
}
