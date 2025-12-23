/**
 * 批量选择栏组件
 */

import { memo } from 'react';
import type { GridItem } from '../../../types';

interface BatchSelectBarProps {
  filteredItems: GridItem[];
  batchSelectedIds: Set<string>;
  onBatchSelectedIdsChange: (next: Set<string>) => void;
}

export const BatchSelectBar = memo(function BatchSelectBar({
  filteredItems,
  batchSelectedIds,
  onBatchSelectedIdsChange,
}: BatchSelectBarProps) {
  const allSelectedInView =
    filteredItems.length > 0 && filteredItems.every((item) => batchSelectedIds.has(item.id));

  const handleToggleAll = () => {
    const next = new Set(batchSelectedIds);
    if (allSelectedInView) {
      filteredItems.forEach((i) => next.delete(i.id));
    } else {
      filteredItems.forEach((i) => next.add(i.id));
    }
    onBatchSelectedIdsChange(next);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full glass text-sm text-white/80 animate-fadeIn">
      <button
        onClick={handleToggleAll}
        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        {allSelectedInView ? '取消全选当前分组' : '全选当前分组'}
      </button>
    </div>
  );
});
