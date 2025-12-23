/**
 * 网格分页 Hook
 * 支持 macOS Launchpad 风格的分页显示
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import type { GridItem } from '../../../types';

interface UseGridPaginationProps {
  items: GridItem[];
  columns: number;
  rows: number;
}

interface UseGridPaginationReturn {
  currentPage: number;
  totalPages: number;
  paginatedItems: GridItem[];
  setCurrentPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

export function useGridPagination({
  items,
  columns,
  rows,
}: UseGridPaginationProps): UseGridPaginationReturn {
  const [currentPage, setCurrentPage] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 每页显示的项目数
  const itemsPerPage = columns * rows;

  // 总页数
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerPage));
  }, [items.length, itemsPerPage]);

  // 当前页的项目
  const paginatedItems = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, currentPage, itemsPerPage]);

  // 确保当前页在有效范围内
  useMemo(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  // 触摸滑动处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold) {
      goToNextPage();
    } else if (diff < -threshold) {
      goToPrevPage();
    }
  }, [goToNextPage, goToPrevPage]);

  // 鼠标滚轮处理（中间40%区域纵向滚动切换页面）
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // 防止连续触发
      if (wheelLockRef.current) return;

      // 根据鼠标位置判断区域：左30% | 中间40% | 右30%
      const mouseX = e.clientX;
      const windowWidth = window.innerWidth;
      const leftBoundary = windowWidth * 0.3;
      const rightBoundary = windowWidth * 0.7;
      
      // 只在中间 40% 区域处理
      const isInMiddleZone = mouseX >= leftBoundary && mouseX <= rightBoundary;
      
      if (isInMiddleZone) {
        // 中间区域：纵向滚轮切换图标翻页
        if (Math.abs(e.deltaY) > 30) {
          wheelLockRef.current = true;
          e.stopPropagation();

          if (e.deltaY > 0) {
            goToNextPage();
          } else {
            goToPrevPage();
          }

          if (wheelTimeoutRef.current) {
            clearTimeout(wheelTimeoutRef.current);
          }
          wheelTimeoutRef.current = setTimeout(() => {
            wheelLockRef.current = false;
          }, 300);
        }
      } else {
        // 左右区域：只处理横向滚动或 shift + 纵向滚动
        const deltaX = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;

        if (Math.abs(deltaX) > 30) {
          wheelLockRef.current = true;

          if (deltaX > 0) {
            goToNextPage();
          } else {
            goToPrevPage();
          }

          if (wheelTimeoutRef.current) {
            clearTimeout(wheelTimeoutRef.current);
          }
          wheelTimeoutRef.current = setTimeout(() => {
            wheelLockRef.current = false;
          }, 300);
        }
      }
    },
    [goToNextPage, goToPrevPage]
  );

  return {
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
  };
}
