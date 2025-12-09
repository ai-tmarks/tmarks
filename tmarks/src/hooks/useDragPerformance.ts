/**
 * 拖拽性能优化 Hook
 * 参考 Linear 和 Notion 的实现
 */

import { useCallback, useRef } from 'react'
import { throttle } from 'lodash-es'

interface UseDragPerformanceOptions {
  /**
   * 拖拽更新的节流时间（毫秒）
   * 默认: 16ms (约60fps)
   */
  throttleMs?: number
  
  /**
   * 是否启用 requestAnimationFrame 优化
   * 默认: true
   */
  useRAF?: boolean
}

export function useDragPerformance(options: UseDragPerformanceOptions = {}) {
  const {
    throttleMs = 16,
    useRAF = true,
  } = options

  const rafIdRef = useRef<number | null>(null)

  /**
   * 节流的拖拽更新函数
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledUpdate = useCallback(
    throttle(
      (callback: () => void) => {
        if (useRAF) {
          // 取消之前的 RAF
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current)
          }
          
          // 使用 RAF 确保在浏览器重绘前执行
          rafIdRef.current = requestAnimationFrame(() => {
            callback()
            rafIdRef.current = null
          })
        } else {
          callback()
        }
      },
      throttleMs
    ),
    [throttleMs, useRAF]
  )

  /**
   * 清理函数
   */
  const cleanup = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    throttledUpdate.cancel()
  }, [throttledUpdate])

  return {
    throttledUpdate,
    cleanup,
  }
}

/**
 * 拖拽自动滚动 Hook
 * 当拖拽到容器边缘时自动滚动
 */
interface UseAutoScrollOptions {
  /**
   * 触发滚动的边缘距离（像素）
   * 默认: 50
   */
  edgeThreshold?: number
  
  /**
   * 滚动速度
   * 默认: 10
   */
  scrollSpeed?: number
}

export function useAutoScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: UseAutoScrollOptions = {}
) {
  const {
    edgeThreshold = 50,
    scrollSpeed = 10,
  } = options

  const scrollIntervalRef = useRef<number | null>(null)

  const startAutoScroll = useCallback((clientY: number) => {
    if (!containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()

    // 清除之前的滚动
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current)
    }

    // 判断是否需要滚动
    const distanceFromTop = clientY - rect.top
    const distanceFromBottom = rect.bottom - clientY

    if (distanceFromTop < edgeThreshold) {
      // 向上滚动
      scrollIntervalRef.current = window.setInterval(() => {
        container.scrollTop -= scrollSpeed
      }, 16)
    } else if (distanceFromBottom < edgeThreshold) {
      // 向下滚动
      scrollIntervalRef.current = window.setInterval(() => {
        container.scrollTop += scrollSpeed
      }, 16)
    }
  }, [containerRef, edgeThreshold, scrollSpeed])

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }, [])

  return {
    startAutoScroll,
    stopAutoScroll,
  }
}
