/**
 * WidgetGrid 类型定义
 */

import type { GridItem } from '../../types';

export interface WidgetGridProps {
  columns: 6 | 8 | 10;
  rows?: number; // 每页显示的行数，默认 4
  isBatchMode?: boolean;
  batchSelectedIds?: Set<string>;
  onBatchSelectedIdsChange?: (next: Set<string>) => void;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export interface MergePrompt {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
}

export interface DragState {
  activeId: string | null;
  activeItemSnapshot: GridItem | null;
}

export interface GridPaginationState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  paginatedItems: GridItem[];
}

// 响应式网格列数映射
export const GRID_COLS_MAP = {
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  8: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8',
  10: 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
} as const;
