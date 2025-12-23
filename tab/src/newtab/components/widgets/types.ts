/**
 * 组件系统类型定义
 */

import type { GridItem, GridItemSize, WidgetConfig } from '../../types';

// 组件通用 Props
export interface WidgetProps {
  item: GridItem;
  size: GridItemSize;
  config?: WidgetConfig;
  onConfigChange?: (config: WidgetConfig) => void;
  isEditing?: boolean;
}

// 组件渲染器 Props
export interface WidgetRendererProps {
  item: GridItem;
  onUpdate?: (id: string, updates: Partial<GridItem>) => void;
  onRemove?: (id: string) => void;
  isEditing?: boolean;
  onOpenFolder?: (folderId: string) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  shortcutStyle?: 'icon' | 'card';
}
