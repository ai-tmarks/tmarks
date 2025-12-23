/**
 * NewTab 保存视图
 */

interface NewtabViewProps {
  currentPage: {
    title: string;
    url: string;
    description?: string;
  } | null;
  newtabRootId: string | null;
  newtabFolders: Array<{ id: string; title: string; parentId: string | null; path: string }>;
  currentNewtabFolderId: string | null;
  newtabBreadcrumb: Array<{ id: string; title: string }>;
  newtabSuggestions: Array<{ id: string; path: string; confidence: number }>;
  newtabFoldersLoaded: boolean;
  newtabFoldersLoadError: string | null;
  isNewtabRecommending: boolean;
  enterNewtabFolder: (folderId: string) => void;
  handleRecommendNewtabFolder: () => void;
  loadNewtabFolders: () => void;
}

export function NewtabView({
  currentPage,
  newtabRootId,
  newtabFolders,
  currentNewtabFolderId,
  newtabBreadcrumb,
  newtabSuggestions,
  newtabFoldersLoaded,
  newtabFoldersLoadError,
  isNewtabRecommending,
  enterNewtabFolder,
  handleRecommendNewtabFolder,
  loadNewtabFolders,
}: NewtabViewProps) {
  return (
    <>
      <NewtabHeaderSection
        newtabFoldersLoadError={newtabFoldersLoadError}
        newtabBreadcrumb={newtabBreadcrumb}
        enterNewtabFolder={enterNewtabFolder}
        isNewtabRecommending={isNewtabRecommending}
        handleRecommendNewtabFolder={handleRecommendNewtabFolder}
        loadNewtabFolders={loadNewtabFolders}
        currentPage={currentPage}
        newtabFoldersLoaded={newtabFoldersLoaded}
      />

      {newtabSuggestions.length > 0 && (
        <AISuggestionsSection
          newtabSuggestions={newtabSuggestions}
          enterNewtabFolder={enterNewtabFolder}
        />
      )}

      <FolderListSection
        newtabFolders={newtabFolders}
        currentNewtabFolderId={currentNewtabFolderId}
        newtabRootId={newtabRootId}
        enterNewtabFolder={enterNewtabFolder}
      />
    </>
  );
}

function NewtabHeaderSection({
  newtabFoldersLoadError,
  newtabBreadcrumb,
  enterNewtabFolder,
  isNewtabRecommending,
  handleRecommendNewtabFolder,
  loadNewtabFolders,
  currentPage,
  newtabFoldersLoaded,
}: {
  newtabFoldersLoadError: string | null;
  newtabBreadcrumb: Array<{ id: string; title: string }>;
  enterNewtabFolder: (folderId: string) => void;
  isNewtabRecommending: boolean;
  handleRecommendNewtabFolder: () => void;
  loadNewtabFolders: () => void;
  currentPage: NewtabViewProps['currentPage'];
  newtabFoldersLoaded: boolean;
}) {
  return (
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
          onClick={handleRecommendNewtabFolder}
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
  );
}

function AISuggestionsSection({
  newtabSuggestions,
  enterNewtabFolder,
}: {
  newtabSuggestions: Array<{ id: string; path: string; confidence: number }>;
  enterNewtabFolder: (folderId: string) => void;
}) {
  return (
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
  );
}

function FolderListSection({
  newtabFolders,
  currentNewtabFolderId,
  newtabRootId,
  enterNewtabFolder,
}: {
  newtabFolders: Array<{ id: string; title: string; parentId: string | null; path: string }>;
  currentNewtabFolderId: string | null;
  newtabRootId: string | null;
  enterNewtabFolder: (folderId: string) => void;
}) {
  const filteredFolders = newtabFolders
    .filter((f) => f.parentId === (currentNewtabFolderId || newtabRootId))
    .filter((f) => f.id !== (currentNewtabFolderId || newtabRootId));

  return (
    <section className="rounded-xl border border-[var(--tab-popup-section-emerald-border)] bg-gradient-to-br from-[var(--tab-popup-section-emerald-from)] to-[var(--tab-popup-section-emerald-to)] p-3.5 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--tab-popup-text)]">选择文件夹</p>
        <span className="text-xs text-[var(--tab-popup-text-muted)]">点击进入</span>
      </div>
      <div className="max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--tab-popup-border-strong)] scrollbar-track-transparent">
        <div className="space-y-1">
          {filteredFolders.map((f) => (
            <button
              key={f.id}
              onClick={() => enterNewtabFolder(f.id)}
              className="w-full flex items-center justify-between rounded-lg bg-[var(--tab-popup-action-neutral-bg)] px-3 py-2 text-left text-sm text-[var(--tab-popup-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)] transition-colors"
            >
              <span className="truncate">{f.title}</span>
              <span className="text-xs text-[var(--tab-popup-text-muted)]">进入</span>
            </button>
          ))}
          {filteredFolders.length === 0 && (
            <div className="py-4 text-center text-xs text-[var(--tab-popup-text-muted)]">当前层级没有子文件夹</div>
          )}
        </div>
      </div>
    </section>
  );
}
