import type { PageInfo } from '@/types';
import type { NewtabFolder, NewtabSuggestion } from '../hooks/useNewtabState';

interface NewtabModeViewProps {
  currentPage: PageInfo | null;
  titleOverride: string;
  setTitleOverride: (value: string) => void;
  newtabFoldersLoadError: string | null;
  enterNewtabFolder: (folderId: string) => void;
  loadNewtabFolders: () => void;
  newtabSuggestions: NewtabSuggestion[];
  newtabFolders: NewtabFolder[];
  currentNewtabFolderId: string | null;
  newtabRootId: string | null;
}

export function NewtabModeView({
  currentPage,
  titleOverride,
  setTitleOverride,
  newtabFoldersLoadError,
  enterNewtabFolder,
  loadNewtabFolders,
  newtabSuggestions,
  newtabFolders,
  currentNewtabFolderId,
  newtabRootId,
}: NewtabModeViewProps) {
  const formatPathDisplay = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 2) return path;
    return '.../' + parts.slice(-2).join('/');
  };

  return (
    <div className="flex h-full flex-col gap-2.5 pb-4">
      <section className="flex-shrink-0 rounded-xl border border-[var(--tab-popup-section-gray-border)] bg-[var(--tab-popup-section-gray-bg)] p-3.5 shadow-lg">
        <div className="flex items-center gap-3">
          <label className="w-10 flex-shrink-0 text-xs font-medium text-[var(--tab-popup-text-muted)]">标题</label>
          <input
            type="text"
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="输入书签标题"
            className="flex-1 rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-3 py-1.5 text-sm text-[var(--tab-popup-text)] placeholder-[var(--tab-popup-text-muted)] focus:border-[var(--tab-popup-input-focus-border)] focus:outline-none focus:ring-1 focus:ring-[var(--tab-popup-input-focus-ring)]"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <label className="w-10 flex-shrink-0 text-xs font-medium text-[var(--tab-popup-text-muted)]">网址</label>
          <div className="flex-1 truncate rounded-lg border border-[var(--tab-popup-border)] bg-[var(--tab-popup-bg)] px-3 py-1.5 text-xs text-[var(--tab-popup-text-muted)]">
            {currentPage?.url || '未获取到网址'}
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--tab-popup-section-emerald-border)] bg-gradient-to-br from-[var(--tab-popup-section-emerald-from)] to-[var(--tab-popup-section-emerald-to)] p-3.5 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => newtabRootId && enterNewtabFolder(newtabRootId)}
              className="rounded-md bg-[var(--tab-popup-action-emerald-bg)] px-2 py-0.5 text-xs text-[var(--tab-popup-action-emerald-text)] transition-colors hover:bg-[var(--tab-popup-action-emerald-bg-hover)]"
              title="返回根目录"
            >
              根目录
            </button>
            <p className="text-sm font-semibold text-[var(--tab-popup-text)]">
              {newtabFolders.find((f) => f.id === currentNewtabFolderId)?.path || 'TMarks'}/
            </p>
          </div>
          <button
            onClick={loadNewtabFolders}
            className="rounded-lg p-1 text-[var(--tab-popup-section-emerald-icon)] transition-all hover:bg-[var(--tab-popup-action-emerald-bg)]"
            title="刷新文件夹"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {newtabFoldersLoadError && (
          <div className="mb-2 rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-3 py-1.5 text-xs text-[var(--tab-popup-text-muted)]">
            {newtabFoldersLoadError}
          </div>
        )}

        {newtabSuggestions.length > 0 && (
          <div className="mb-2">
            <p className="mb-1.5 text-[10px] text-[var(--tab-popup-text-muted)]">AI 推荐</p>
            <div className="flex flex-wrap gap-1.5">
              {newtabSuggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => enterNewtabFolder(s.id)}
                  className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                    currentNewtabFolderId === s.id
                      ? 'bg-[var(--tab-popup-action-emerald-active-bg)] text-[var(--tab-popup-action-emerald-active-text)]'
                      : 'bg-[var(--tab-popup-action-emerald-bg)] text-[var(--tab-popup-action-emerald-text)] hover:bg-[var(--tab-popup-action-emerald-bg-hover)]'
                  }`}
                  title={s.path}
                >
                  <span className="max-w-[140px] truncate">{formatPathDisplay(s.path)}</span>
                  {currentNewtabFolderId === s.id && (
                    <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="scrollbar-thin scrollbar-thumb-[var(--tab-popup-border-strong)] scrollbar-track-transparent min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {currentNewtabFolderId && currentNewtabFolderId !== newtabRootId && (
            <button
              onClick={() => {
                const currentFolder = newtabFolders.find((f) => f.id === currentNewtabFolderId);
                if (currentFolder?.parentId) enterNewtabFolder(currentFolder.parentId);
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-[var(--tab-popup-action-emerald-bg)] px-3 py-2 text-left text-sm text-[var(--tab-popup-action-emerald-text)] transition-colors hover:bg-[var(--tab-popup-action-emerald-bg-hover)]"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回上一级</span>
            </button>
          )}
          {newtabFolders
            .filter((f) => f.parentId === (currentNewtabFolderId || newtabRootId))
            .filter((f) => f.id !== (currentNewtabFolderId || newtabRootId))
            .map((f) => (
              <button
                key={f.id}
                onClick={() => enterNewtabFolder(f.id)}
                className="flex w-full items-center justify-between rounded-lg bg-[var(--tab-popup-action-emerald-bg)] px-3 py-2 text-left text-sm text-[var(--tab-popup-text)] transition-colors hover:bg-[var(--tab-popup-action-emerald-bg-hover)]"
              >
                <span className="truncate">{f.title}</span>
                <svg className="h-4 w-4 flex-shrink-0 text-[var(--tab-popup-section-emerald-icon)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          {newtabFolders.filter(
            (f) => f.parentId === (currentNewtabFolderId || newtabRootId) && f.id !== (currentNewtabFolderId || newtabRootId)
          ).length === 0 &&
            currentNewtabFolderId === newtabRootId && (
              <div className="py-3 text-center text-xs text-[var(--tab-popup-text-muted)]">当前层级没有子文件夹</div>
            )}
        </div>
      </section>
    </div>
  );
}
