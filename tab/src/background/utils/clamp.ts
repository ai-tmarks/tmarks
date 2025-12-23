/**
 * 数值范围限制工具函数
 */

import { DEFAULT_TOP_HISTORY_LIMIT } from '../constants';

export function clampHistoryDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 30;
  }
  const rounded = Math.round(value);
  return Math.max(1, Math.min(90, rounded));
}

export function clampHistoryTopN(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_TOP_HISTORY_LIMIT;
  }
  const rounded = Math.round(value);
  return Math.max(5, Math.min(100, rounded));
}

export function clampTopLevelCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }
  const rounded = Math.round(value);
  return Math.max(2, Math.min(7, rounded));
}
