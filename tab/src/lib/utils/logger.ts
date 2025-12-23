/**
 * 统一日志工具
 * 生产环境自动禁用日志输出
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogValue = any;

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * 普通日志（仅开发环境）
   */
  log: (...args: LogValue[]) => {
    if (isDev) {
      console.log('[TMarks]', ...args);
    }
  },

  /**
   * 信息日志（仅开发环境）
   */
  info: (...args: LogValue[]) => {
    if (isDev) {
      console.info('[TMarks]', ...args);
    }
  },

  /**
   * 警告日志（仅开发环境）
   */
  warn: (...args: LogValue[]) => {
    if (isDev) {
      console.warn('[TMarks]', ...args);
    }
  },

  /**
   * 错误日志（仅开发环境）
   */
  error: (...args: LogValue[]) => {
    if (isDev) {
      console.error('[TMarks]', ...args);
    }
  },

  /**
   * 调试日志（仅开发环境，带时间戳）
   */
  debug: (...args: LogValue[]) => {
    if (isDev) {
      const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 12);
      console.debug(`[TMarks ${timestamp}]`, ...args);
    }
  },
};

export default logger;
