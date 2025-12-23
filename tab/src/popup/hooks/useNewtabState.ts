/**
 * NewTab 状态管理 Hook
 */

import { useState } from 'react';
import type { PageInfo } from '@/types';

export interface NewtabFolder {
  id: string;
  title: string;
  parentId: string | null;
  path: string;
}

export interface NewtabSuggestion {
  id: string;
  path: string;
  confidence: number;
}

async function sendMessage<T = any>(message: { type: string; payload?: any }): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: any) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.success) {
        reject(new Error(response?.error || 'Unknown error'));
        return;
      }
      resolve(response.data as T);
    });
  });
}

export function useNewtabState(onError: (error: string) => void) {
  const [newtabRootId, setNewtabRootId] = useState<string | null>(null);
  const [newtabFolders, setNewtabFolders] = useState<NewtabFolder[]>([]);
  const [currentNewtabFolderId, setCurrentNewtabFolderId] = useState<string | null>(null);
  const [newtabBreadcrumb, setNewtabBreadcrumb] = useState<Array<{ id: string; title: string }>>([]);
  const [newtabSuggestions, setNewtabSuggestions] = useState<NewtabSuggestion[]>([]);
  const [isNewtabRecommending, setIsNewtabRecommending] = useState(false);
  const [newtabFoldersLoaded, setNewtabFoldersLoaded] = useState(false);
  const [newtabFoldersLoadError, setNewtabFoldersLoadError] = useState<string | null>(null);

  const loadNewtabFolders = async () => {
    try {
      setNewtabFoldersLoadError(null);
      const resp = await sendMessage<{ rootId: string; folders: NewtabFolder[] }>({
        type: 'GET_NEWTAB_FOLDERS',
      });
      setNewtabRootId(resp.rootId);
      setNewtabFolders(resp.folders);
      setCurrentNewtabFolderId(resp.rootId);
      const root = resp.folders.find((f) => f.id === resp.rootId);
      setNewtabBreadcrumb(root ? [{ id: root.id, title: root.title }] : []);
      setNewtabFoldersLoaded(true);
    } catch (e) {
      setNewtabFoldersLoaded(false);
      setNewtabFoldersLoadError(e instanceof Error ? e.message : '加载文件夹失败');
      setNewtabRootId(null);
      setNewtabFolders([]);
      setCurrentNewtabFolderId(null);
      setNewtabBreadcrumb([]);
    }
  };

  const enterNewtabFolder = (folderId: string) => {
    const folder = newtabFolders.find((f) => f.id === folderId);
    if (!folder) return;
    setCurrentNewtabFolderId(folderId);

    const chain: Array<{ id: string; title: string }> = [];
    let cursor: typeof folder | undefined = folder;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chain.push({ id: cursor.id, title: cursor.title });
      cursor = cursor.parentId ? newtabFolders.find((f) => f.id === cursor!.parentId) : undefined;
    }
    setNewtabBreadcrumb(chain.reverse());
  };

  const handleRecommendNewtabFolder = async (currentPage: PageInfo | null) => {
    if (!currentPage?.url) {
      onError('未获取到页面信息');
      return;
    }

    if (!newtabFoldersLoaded) {
      setNewtabFoldersLoadError('目录列表未加载，暂时无法进行 AI 文件夹推荐。你仍可直接保存到根目录。');
      return;
    }

    try {
      setIsNewtabRecommending(true);
      const resp = await sendMessage<{ suggestedFolders: NewtabSuggestion[] }>({
        type: 'RECOMMEND_NEWTAB_FOLDER',
        payload: {
          title: currentPage.title,
          url: currentPage.url,
          description: currentPage.description,
        },
      });
      setNewtabSuggestions(resp.suggestedFolders || []);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'AI 推荐失败');
    } finally {
      setIsNewtabRecommending(false);
    }
  };

  return {
    newtabRootId,
    newtabFolders,
    currentNewtabFolderId,
    newtabBreadcrumb,
    newtabSuggestions,
    isNewtabRecommending,
    newtabFoldersLoaded,
    newtabFoldersLoadError,
    loadNewtabFolders,
    enterNewtabFolder,
    handleRecommendNewtabFolder,
  };
}
