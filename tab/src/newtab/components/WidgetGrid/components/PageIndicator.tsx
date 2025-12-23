/**
 * 分页指示器 - macOS Launchpad 风格
 * 固定在 dock 上方位置
 */

import { memo } from 'react';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PageIndicator = memo(function PageIndicator({
  currentPage,
  totalPages,
  onPageChange,
}: PageIndicatorProps) {
  // 始终显示，即使只有一页也显示占位
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex justify-center items-center gap-3 py-2 px-4 rounded-full bg-black/20 backdrop-blur-sm">
      {totalPages <= 1 ? (
        // 单页时显示一个小点作为占位
        <div
          className="w-3 h-3 rounded-full bg-white/50"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        />
      ) : (
        Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => onPageChange(idx)}
            className={`rounded-full transition-all duration-300 ${
              idx === currentPage
                ? 'w-8 h-3 bg-white'
                : 'w-3 h-3 bg-white/50 hover:bg-white/70'
            }`}
            style={{
              boxShadow: idx === currentPage 
                ? '0 0 12px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.3)' 
                : '0 1px 3px rgba(0,0,0,0.3)',
            }}
            aria-label={`切换到第 ${idx + 1} 页`}
          />
        ))
      )}
    </div>
  );
});
