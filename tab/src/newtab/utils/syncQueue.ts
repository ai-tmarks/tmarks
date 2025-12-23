/**
 * 离线同步队列 - 网络恢复后自动重试
 */

import { withRetry, isRetryableError } from './retry';
import { logger } from '@/lib/utils/logger';

// 队列项类型
interface QueueItem<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  retries: number;
}

// 存储键名
const QUEUE_STORAGE_KEY = 'newtab_sync_queue';

// 最大队列长度
const MAX_QUEUE_SIZE = 100;

// 最大重试次数
const MAX_RETRIES = 5;

// 队列处理器类型
type QueueHandler<T = unknown> = (payload: T) => Promise<void>;

// 处理器注册表
const handlers = new Map<string, QueueHandler>();

// 是否正在处理队列
let isProcessing = false;

// 是否在线
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * 注册队列处理器
 */
export function registerQueueHandler<T>(type: string, handler: QueueHandler<T>): void {
  handlers.set(type, handler as QueueHandler);
}

/**
 * 添加到同步队列
 */
export async function enqueue<T>(type: string, payload: T): Promise<void> {
  const queue = await loadQueue();
  
  const item: QueueItem<T> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };

  // 添加到队列
  queue.push(item);

  // 限制队列大小（移除最旧的）
  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  await saveQueue(queue);
  logger.log('已加入同步队列:', type);

  // 如果在线，立即尝试处理
  if (isOnline) {
    processQueue();
  }
}

/**
 * 处理队列
 */
export async function processQueue(): Promise<void> {
  if (isProcessing || !isOnline) return;
  
  isProcessing = true;
  logger.debug('开始处理同步队列');

  try {
    const queue = await loadQueue();
    const remaining: QueueItem[] = [];

    for (const item of queue) {
      const handler = handlers.get(item.type);
      
      if (!handler) {
        logger.warn('未找到队列处理器:', item.type);
        continue;
      }

      try {
        await withRetry(
          () => handler(item.payload),
          {
            maxRetries: 2,
            initialDelay: 500,
            shouldRetry: isRetryableError,
            onRetry: (_, attempt) => {
              logger.debug(`重试 ${item.type} (${attempt + 1})`);
            },
          }
        );
        logger.debug('队列处理成功:', item.type);
      } catch (error) {
        logger.error('队列处理失败:', item.type, error);
        
        // 增加重试次数
        item.retries++;
        
        // 如果未超过最大重试次数，保留在队列中
        if (item.retries < MAX_RETRIES) {
          remaining.push(item);
        } else {
          logger.warn('已达最大重试次数，丢弃:', item.type);
        }
      }
    }

    await saveQueue(remaining);
    logger.debug('队列处理完成，剩余:', remaining.length);
  } finally {
    isProcessing = false;
  }
}

/**
 * 获取队列长度
 */
export async function getQueueLength(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}

/**
 * 清空队列
 */
export async function clearQueue(): Promise<void> {
  await chrome.storage.local.remove(QUEUE_STORAGE_KEY);
  logger.log('同步队列已清空');
}

/**
 * 加载队列
 */
async function loadQueue(): Promise<QueueItem[]> {
  try {
    const result = await chrome.storage.local.get(QUEUE_STORAGE_KEY);
    return (result[QUEUE_STORAGE_KEY] as QueueItem[]) || [];
  } catch {
    return [];
  }
}

/**
 * 保存队列
 */
async function saveQueue(queue: QueueItem[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [QUEUE_STORAGE_KEY]: queue });
  } catch (error) {
    logger.error('保存同步队列失败:', error);
  }
}

/**
 * 初始化网络状态监听
 */
export function initSyncQueue(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    logger.log('网络已恢复');
    isOnline = true;
    processQueue();
  });

  window.addEventListener('offline', () => {
    logger.log('网络已断开');
    isOnline = false;
  });

  // 页面加载时检查并处理队列
  if (isOnline) {
    setTimeout(processQueue, 2000);
  }
}
