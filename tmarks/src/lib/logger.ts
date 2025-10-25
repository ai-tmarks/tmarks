/**
 * 开发环境专用日志工具
 * 生产环境自动禁用所有 console 输出
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * 普通日志
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * 错误日志
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args)
    }
  },

  /**
   * 警告日志
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * 调试日志
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * 信息日志
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  },

  /**
   * 分组日志开始
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label)
    }
  },

  /**
   * 分组日志结束
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd()
    }
  },

  /**
   * 表格日志
   */
  table: (data: any) => {
    if (isDev) {
      console.table(data)
    }
  },

  /**
   * 计时开始
   */
  time: (label: string) => {
    if (isDev) {
      console.time(label)
    }
  },

  /**
   * 计时结束
   */
  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(label)
    }
  },
}

/**
 * 性能监控工具
 */
export const perf = {
  /**
   * 测量函数执行时间
   */
  measure: async <T>(label: string, fn: () => T | Promise<T>): Promise<T> => {
    if (!isDev) {
      return fn()
    }

    const start = performance.now()
    try {
      const result = await fn()
      const end = performance.now()
      logger.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`)
      return result
    } catch (error) {
      const end = performance.now()
      logger.error(`❌ ${label} failed after ${(end - start).toFixed(2)}ms:`, error)
      throw error
    }
  },

  /**
   * 标记性能点
   */
  mark: (name: string) => {
    if (isDev && performance.mark) {
      performance.mark(name)
    }
  },

  /**
   * 测量两个标记之间的时间
   */
  measureBetween: (name: string, startMark: string, endMark: string) => {
    if (isDev && performance.measure) {
      try {
        performance.measure(name, startMark, endMark)
        const measure = performance.getEntriesByName(name)[0]
        if (measure) {
          logger.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`)
        }
      } catch (error) {
        logger.warn(`Failed to measure ${name}:`, error)
      }
    }
  },
}

/**
 * 错误追踪工具（生产环境可以发送到错误追踪服务）
 */
export const errorTracker = {
  /**
   * 捕获错误
   */
  capture: (error: Error, context?: Record<string, any>) => {
    if (isDev) {
      logger.error('Error captured:', error, context)
    } else {
      // 生产环境：发送到错误追踪服务（如 Sentry）
      // sendToErrorTrackingService(error, context)
    }
  },

  /**
   * 捕获异常
   */
  captureException: (exception: any, context?: Record<string, any>) => {
    if (isDev) {
      logger.error('Exception captured:', exception, context)
    } else {
      // 生产环境：发送到错误追踪服务
      // sendToErrorTrackingService(exception, context)
    }
  },
}

export default logger
