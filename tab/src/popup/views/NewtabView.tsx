/**
 * NewTab 保存视图
 */

import { useState } from 'react';
import type { PageInfo } from '@/types';

interface NewtabFolder {
  id: string;
  title: string;
  parentId: string | null;
  path: string;
}

interface NewtabSuggestion {
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

export function useNewtabFolders(onError: (error: string) => void) {
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
    setNewtabSuggestions,
  };
}

interface NewtabSectionsProps {
  newtabFoldersLoadError: string | null;
  newtabBreadcrumb: Array<{ id: string; title: string }>;
  enterNewtabFolder: (folderId: string) => void;
  isNewtabRecommending: boolean;
  currentPage: PageInfo | null;
  newtabFoldersLoaded: boolean;
  handleRecommendNewtabFolder: (currentPage: PageInfo | null) => void;
  loadNewtabFolders: () => void;
  newtabSuggestions: NewtabSuggestion[];
  newtabFolders: NewtabFolder[];
  currentNewtabFolderId: string | null;
  newtabRootId: string | null;
}

export function NewtabSections({
  newtabFoldersLoadError,
  newtabBreadcrumb,
  enterNewtabFolder,
  isNewtabRecommending,
  currentPage,
  newtabFoldersLoaded,
  handleRecommendNewtabFolder,
  loadNewtabFolders,
  newtabSuggestions,
  newtabFolders,
  currentNewtabFolderId,
  newtabRootId,
}: NewtabSectionsProps) {
  return (
    <>
      <section className="rounded-xl border border-[var(--tab-popup-section-gray-border)] bg-[var(--tab-popup-section-gray-bg)] p-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--tab-popup-text)]">保存到 NewTab</p>
            <p className="mt-1 text-xs text-[var(--tab-popup-text-muted)]">选择文件夹后保存，或使用 AI 推荐。</p>
          </div>
          <span className="rounded-full bg-[var(--tab-popup-section-blue-badge-bg)] px-2 py-0.5 text-xs font-medium text-[var(--tab-popup-section-blue-badge-text)]">NewTab</span>
        </div>
        {newtabFoldersLoadError && (
          <div className="mt-2 rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-3 py-2 text-xs text-[var(--tab-popup-text-muted)]">
            {newtabFoldersLoadError}
          </div>
        )}
        {newtabBreadcrumb.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-[var(--tab-popup-text-muted)]">
            {newtabBreadcrumb.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => enterNewtabFolder(c.id)}
                className="rounded-md bg-[var(--tab-popup-action-neutral-bg)] px-2 py-1 hover:bg-[var(--tab-popup-action-neutral-bg-hover)] transition-colors"
              >
                {idx === 0 ? '根目录' : c.title}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => handleRecommendNewtabFolder(currentPage)}
            disabled={isNewtabRecommending || !currentPage?.url || !newtabFoldersLoaded}
            className="rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-3 py-2 text-xs font-medium text-[var(--tab-popup-text)] transition-all duration-200 hover:bg-[var(--tab-popup-action-neutral-bg)] disabled:opacity-40"
          >
            {isNewtabRecommending ? 'AI 推荐中...' : 'AI 推荐文件夹'}
          </button>
          <button
            onClick={loadNewtabFolders}
            className="rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-3 py-2 text-xs font-medium text-[var(--tab-popup-text)] transition-all duration-200 hover:bg-[var(--tab-popup-action-neutral-bg)]"
          >
            刷新文件夹
          </button>
        </div>
      </section>

      {newtabSuggestions.length > 0 && (
        <section className="rounded-xl border border-[var(--tab-popup-section-purple-border)] bg-gradient-to-br from-[var(--tab-popup-section-purple-from)] to-[var(--tab-popup-section-purple-to)] p-3.5 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--tab-popup-text)]">AI 推荐文件夹</p>
            <span className="rounded-full bg-[var(--tab-popup-section-purple-badge-bg)] px-2 py-0.5 text-xs font-medium text-[var(--tab-popup-section-purple-badge-text)]">
              {newtabSuggestions.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {newtabSuggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => enterNewtabFolder(s.id)}
                className="inline-flex items-center rounded-lg bg-[var(--tab-popup-action-neutral-bg)] px-2.5 py-1 text-xs font-medium text-[var(--tab-popup-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)] transition-colors"
                title={s.path}
              >
                <span className="truncate max-w-[240px]">{s.path.replace(/^TMarks\//, '')}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--tab-popup-section-emerald-border)] bg-gradient-to-br from-[var(--tab-popup-section-emerald-from)] to-[var(--tab-popup-section-emerald-to)] p-3.5 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--tab-popup-text)]">选择文件夹</p>
          <span className="text-xs text-[var(--tab-popup-text-muted)]">点击进入</span>
        </div>
        <div className="max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--tab-popup-border-strong)] scrollbar-track-transparent">
          {newtabFolders
            .filter((f) => f.parentId === (currentNewtabFolderId || newtabRootId))
            .filter((f) => f.id !== (currentNewtabFolderId || newtabRootId))
            .map((f) => (
              <button
                key={f.id}
                onClick={() => enterNewtabFolder(f.id)}
                className="w-full flex items-center justify-between rounded-lg bg-[var(--tab-popup-action-neutral-bg)] px-3 py-2 text-left text-sm text-[var(--tab-popup-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)] transition-colors"
              >
                <span className="truncate">{f.title}</span>
                <span className="text-xs text-[var(--tab-popup-text-muted)]">进入</span>
              </button>
            ))}
          {newtabFolders.filter((f) => f.parentId === (currentNewtabFolderId || newtabRootId)).length === 0 && (
            <div className="py-4 text-center text-xs text-[var(--tab-popup-text-muted)]">当前层级没有子文件夹</div>
          )}
        </div>
      </section>
    </>
  );
}
