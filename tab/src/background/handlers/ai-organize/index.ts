/**
 * AI 整理工作区处理器
 */

import type { Message, MessageResponse } from '@/types';
import { StorageService } from '@/lib/utils/storage';
import { callAI } from '@/lib/services/ai-client';
import { NEWTAB_WORKSPACE_ORGANIZE_PROMPT_TEMPLATE } from '@/lib/constants/newtabPrompts';
import { STORAGE_KEY } from '@/newtab/constants';
import type { Shortcut } from '@/newtab/types';
import { safeParseJson, clampHistoryDays, clampHistoryTopN, clampTopLevelCount } from '../../utils';
import { reportAiOrganizeProgress } from '../../services/progress-reporter';
import { ensureNewtabRootFolder } from '../../services/newtab-folder';
import { collectAllBrowserBookmarks, sanitizeAiOrganizePath } from '../../services/bookmark-collector';
import { collectDomainHistoryStats, type DomainHistoryStat } from '../../services/history-stats';
import { buildDomainToItemsMap, buildFolderPathCounts, buildDomainSummaries } from './domain-processor';
import { cleanupWorkspace, createFolderStructure, copyBookmarks } from './bookmark-operations';
import type { AiOrganizePayload } from './types';

async function loadNewtabShortcuts(): Promise<Shortcut[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const data = result?.[STORAGE_KEY];
    if (data && typeof data === 'object' && Array.isArray((data as any).shortcuts)) {
      return (data as any).shortcuts as Shortcut[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function handleAiOrganizeNewtabWorkspace(
  message: Message
): Promise<MessageResponse> {
  const payload = (message.payload || {}) as AiOrganizePayload;

  const sessionId =
    typeof payload.sessionId === 'string' && payload.sessionId.trim()
      ? payload.sessionId.trim()
      : String(Date.now());
  const rules = typeof payload.rules === 'string' ? payload.rules : '';
  const domainBatchSize = Math.min(2000, Math.max(50, Number(payload.maxBookmarks ?? 300)));
  const customPromptTemplate =
    typeof payload.promptTemplate === 'string' ? payload.promptTemplate.trim() : '';
  const enableHistoryHeat = Boolean(payload.enableHistoryHeat);
  const historyDays = clampHistoryDays(Number(payload.historyDays ?? 30));
  const topHistoryLimit = clampHistoryTopN(Number(payload.historyHeatTopN ?? 10));
  const strictHierarchy = Boolean(payload.strictHierarchy);
  const allowNewFolders = strictHierarchy ? false : payload.allowNewFolders !== false;
  const preferOriginalPaths = payload.preferOriginalPaths !== false;
  const verboseLogs = payload.verboseLogs !== false;
  const requestedTopLevelCount = clampTopLevelCount(Number(payload.topLevelCount ?? 5));
  let truncatedDomains = false;

  const sendProgress = async (
    progress: Parameters<typeof reportAiOrganizeProgress>[0],
    options?: { verbose?: boolean }
  ) => {
    const level = progress.level ?? 'info';
    const shouldBeVerbose = options?.verbose ?? level === 'info';
    if (!verboseLogs && shouldBeVerbose) return;
    await reportAiOrganizeProgress(progress);
  };

  await sendProgress(
    { sessionId, level: 'info', step: 'start', message: '开始 AI 整理：准备读取书签与配置' },
    { verbose: false }
  );

  const newtabRootResult = await ensureNewtabRootFolder();
  if (!newtabRootResult) {
    throw new Error('NewTab root folder not found');
  }
  const newtabRootId = newtabRootResult.id;

  await sendProgress({ sessionId, level: 'info', step: 'root', message: `已定位工作区根目录: ${newtabRootId}` });

  const sourceBookmarks = await collectAllBrowserBookmarks(newtabRootId);
  if (sourceBookmarks.length === 0) {
    await sendProgress({ sessionId, level: 'warn', step: 'collect', message: '浏览器没有可整理的书签' });
    return {
      success: true,
      data: { total: 0, processed: 0, truncated: truncatedDomains, moved: 0, createdFolders: 0, createdBookmarks: 0, message: '浏览器没有可整理的书签' },
    };
  }

  const shortcuts = await loadNewtabShortcuts();
  await sendProgress({ sessionId, level: 'info', step: 'usage', message: `已加载快捷方式: ${shortcuts.length} 个` });

  // 历史记录统计
  let historyStats: Map<string, DomainHistoryStat> | null = null;
  if (enableHistoryHeat) {
    if (!chrome.history || typeof chrome.history.search !== 'function') {
      await sendProgress({ sessionId, level: 'warn', step: 'history', message: '历史记录 API 不可用，跳过热度统计' });
    } else {
      try {
        await sendProgress({ sessionId, level: 'info', step: 'history', message: `读取浏览历史：最近 ${historyDays} 天` });
        const historyResult = await collectDomainHistoryStats(historyDays);
        historyStats = historyResult.domains;
        await sendProgress({
          sessionId,
          level: 'info',
          step: 'history',
          message: `历史记录: ${historyResult.totalItems} 条，覆盖 ${historyStats.size} 个域名${historyResult.truncated ? '（部分截断）' : ''}`,
        });
      } catch (error) {
        await sendProgress({
          sessionId,
          level: 'warn',
          step: 'history',
          message: `历史记录读取失败：${error instanceof Error ? error.message : '未知错误'}，继续使用书签数据`,
        });
      }
    }
  }

  // 构建域名映射
  const domainToItems = buildDomainToItemsMap(sourceBookmarks);
  const folderPaths = buildFolderPathCounts(sourceBookmarks);
  const { summaries: sortedDomainSummaries } = buildDomainSummaries(domainToItems, shortcuts, historyStats, historyDays);

  const topHistoryDomains = sortedDomainSummaries.slice(0, Math.min(topHistoryLimit, sortedDomainSummaries.length));

  await reportAiOrganizeProgress({
    sessionId,
    level: 'info',
    step: 'collect',
    message: `已读取书签: ${sourceBookmarks.length} 个；域名: ${domainToItems.size} 个`,
  });

  // 构建批次
  const domainSummaryBatches: (typeof sortedDomainSummaries)[] = [];
  for (let i = 0; i < sortedDomainSummaries.length; i += domainBatchSize) {
    domainSummaryBatches.push(sortedDomainSummaries.slice(i, i + domainBatchSize));
  }

  const domainSummariesPayload = {
    totalDomains: sortedDomainSummaries.length,
    totalBatches: domainSummaryBatches.length || 1,
    batchSize: domainBatchSize,
    truncated: false,
    topHistoryLimit,
    topHistoryDomains,
    folderPaths,
    strictHierarchy,
    allowNewFolders,
    preferOriginalPaths,
    batches: (domainSummaryBatches.length ? domainSummaryBatches : [sortedDomainSummaries]).map(
      (domains, index, arr) => ({
        batchIndex: index + 1,
        totalBatches: arr.length,
        waitForMoreBatches: index + 1 < arr.length,
        isFinalBatch: index + 1 === arr.length,
        domains,
      })
    ),
    allBatchesProvided: true,
  };

  await reportAiOrganizeProgress({
    sessionId,
    level: 'info',
    step: 'summarize',
    message: `已生成域名汇总: ${domainSummariesPayload.totalDomains} 个，批次数 ${domainSummariesPayload.totalBatches}（每批 ${domainSummariesPayload.batchSize} 个），历史优先 Top ${topHistoryLimit}`,
  });

  // 调用 AI
  const config = await StorageService.loadConfig();
  const apiKey = config.aiConfig.apiKeys[config.aiConfig.provider];
  if (!apiKey) {
    await reportAiOrganizeProgress({ sessionId, level: 'error', step: 'config', message: '未配置 AI API Key' });
    throw new Error('未配置 AI API Key');
  }

  await reportAiOrganizeProgress({
    sessionId,
    level: 'info',
    step: 'ai_call',
    message: `准备调用 AI: ${config.aiConfig.provider}/${config.aiConfig.model}`,
  });

  const template = customPromptTemplate || NEWTAB_WORKSPACE_ORGANIZE_PROMPT_TEMPLATE;
  const prompt = template
    .split('{{rules}}')
    .join(rules || '(无)')
    .split('{{domainSummariesJson}}')
    .join(JSON.stringify(domainSummariesPayload))
    .split('{{topLevelCount}}')
    .join(String(requestedTopLevelCount))
    .split('{{topHistoryLimit}}')
    .join(String(topHistoryLimit));

  const aiResult = await callAI({
    provider: config.aiConfig.provider as any,
    apiKey,
    model: config.aiConfig.model,
    apiUrl: config.aiConfig.apiUrls?.[config.aiConfig.provider],
    prompt,
    temperature: 0.2,
    maxTokens: 2000,
  });

  await reportAiOrganizeProgress({
    sessionId,
    level: 'success',
    step: 'ai_call',
    message: `AI 调用完成（返回长度 ${String(aiResult.content || '').length}）`,
  });

  // 解析 AI 结果
  const aiContent = aiResult.content || '';
  const parsed = safeParseJson(aiContent);
  const domainMovesRaw = Array.isArray(parsed?.domainMoves)
    ? parsed.domainMoves
    : Array.isArray(parsed?.domain_moves)
      ? parsed.domain_moves
      : [];
  const fallbackPathRaw = typeof parsed?.fallbackPath === 'string' ? parsed.fallbackPath : '';
  const fallbackPath = sanitizeAiOrganizePath(fallbackPathRaw) || '其他/未分类';

  const domainMoves = domainMovesRaw
    .map((m: any) => {
      const domain = typeof m?.domain === 'string' ? m.domain : '';
      const rawPath = typeof m?.path === 'string' ? m.path : '';
      const sanitizedPath = sanitizeAiOrganizePath(rawPath) || fallbackPath;
      return { domain, path: sanitizedPath };
    })
    .filter((m: any) => m.domain && m.path);

  if (domainMoves.length === 0) {
    const rawPreview = aiContent.trim().slice(0, 1000);
    await reportAiOrganizeProgress({
      sessionId,
      level: 'error',
      step: 'parse',
      message: 'AI 返回结果不可解析或为空（domainMoves 为空）',
      detail: { rawPreview, parsed },
    });
    throw new Error('AI 返回结果不可解析或为空');
  }

  // 统计一级目录数量并限制
  const topLevelFolders = new Set<string>();
  for (const dm of domainMoves) {
    const topLevel = dm.path.split('/')[0];
    if (topLevel) topLevelFolders.add(topLevel);
  }

  const actualTopLevelCount = topLevelFolders.size;
  let mergedCount = 0;

  // 如果一级目录超过限制，将超出的目录合并到 fallbackPath
  if (actualTopLevelCount > requestedTopLevelCount) {
    // 统计每个一级目录的域名数量
    const topLevelDomainCounts = new Map<string, number>();
    for (const dm of domainMoves) {
      const topLevel = dm.path.split('/')[0];
      if (topLevel) {
        topLevelDomainCounts.set(topLevel, (topLevelDomainCounts.get(topLevel) || 0) + 1);
      }
    }

    // 按域名数量排序，保留前 N 个最大的一级目录
    const sortedTopLevels = Array.from(topLevelDomainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const keepTopLevels = new Set(sortedTopLevels.slice(0, requestedTopLevelCount));
    const mergeTopLevels = new Set(sortedTopLevels.slice(requestedTopLevelCount));

    // 将超出的一级目录下的域名合并到 fallbackPath
    for (const dm of domainMoves) {
      const topLevel = dm.path.split('/')[0];
      if (topLevel && mergeTopLevels.has(topLevel)) {
        dm.path = fallbackPath;
        mergedCount++;
      }
    }

    await reportAiOrganizeProgress({
      sessionId,
      level: 'warn',
      step: 'limit',
      message: `AI 返回 ${actualTopLevelCount} 个一级目录，超过限制 ${requestedTopLevelCount}，已将 ${mergedCount} 个域名合并到「${fallbackPath}」`,
      detail: { kept: Array.from(keepTopLevels), merged: Array.from(mergeTopLevels) },
    });
  }

  await reportAiOrganizeProgress({
    sessionId,
    level: 'success',
    step: 'parse',
    message: `已解析 AI 规划: domainMoves=${domainMoves.length}，一级目录=${Math.min(actualTopLevelCount, requestedTopLevelCount)}，fallbackPath=${fallbackPath}`,
  });

  const domainToPath = new Map<string, string>();
  for (const dm of domainMoves) {
    domainToPath.set(dm.domain, dm.path);
  }

  // 执行书签操作
  await cleanupWorkspace(newtabRootId, sessionId);
  const { folderCache, createdFolders } = await createFolderStructure(
    newtabRootId,
    domainToItems,
    domainToPath,
    fallbackPath,
    sessionId
  );
  const createdBookmarks = await copyBookmarks(
    sourceBookmarks,
    newtabRootId,
    domainToPath,
    fallbackPath,
    folderCache,
    sessionId
  );

  await reportAiOrganizeProgress({
    sessionId,
    level: 'success',
    step: 'done',
    message: `整理完成：创建目录 ${createdFolders} 个，复制书签 ${createdBookmarks} 个`,
  });

  return {
    success: true,
    data: {
      total: sourceBookmarks.length,
      processed: sourceBookmarks.length,
      truncated: truncatedDomains,
      moved: 0,
      createdFolders,
      createdBookmarks,
    },
  };
}
