/**
 * Popup 主组件
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { TagList } from '@/components/TagList';
import { PageInfoCard } from '@/components/PageInfoCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { LoadingMessage } from '@/components/LoadingMessage';
import { BookmarkExistsDialog } from '@/components/BookmarkExistsDialog';
import { ModeSelector } from './ModeSelector';
import { TabCollectionView } from './TabCollectionView';
import { NewtabModeView } from './components/NewtabModeView';
import { useNewtabState } from './hooks/useNewtabState';
import { getExistingTagClass, getSelectedTagClass, type TagTheme } from '@/lib/utils/tagStyles';
import { applyTheme, applyThemeStyle } from '@/lib/utils/themeManager';

type ViewMode = 'selector' | 'bookmark' | 'newtab' | 'tabCollection';

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

export function Popup() {
  const {
    currentPage, recommendedTags, existingTags, selectedTags,
    isLoading, isSaving, isRecommending, error, successMessage, loadingMessage,
    existingBookmark, config, loadConfig, loadExistingTags, extractPageInfo,
    recommendTags, saveBookmark, setError, setSuccessMessage, setLoadingMessage,
    toggleTag, addCustomTag, setCurrentPage, includeThumbnail, setIncludeThumbnail,
    isPublic, setIsPublic, createSnapshot, setCreateSnapshot, setExistingBookmark,
    updateExistingBookmarkTags, updateExistingBookmarkDescription,
    createSnapshotForBookmark, lastRecommendationSource, lastSaveDurationMs
  } = useAppStore();

  // NewTab 状态
  const newtabState = useNewtabState(setError);

  const [customTagInput, setCustomTagInput] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [descriptionOverride, setDescriptionOverride] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('selector');
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [showDescEdit, setShowDescEdit] = useState(false);

  const tagTheme: TagTheme = (config?.preferences?.tagTheme ?? 'classic') as TagTheme;

  useEffect(() => {
    setTitleOverride(currentPage?.title ?? '');
  }, [currentPage?.title]);

  useEffect(() => {
    setDescriptionOverride(currentPage?.description ?? '');
  }, [currentPage?.description]);

  useEffect(() => {
    loadConfig();
    loadExistingTags();
  }, []);

  useEffect(() => {
    applyTheme(config?.preferences?.theme ?? 'auto');
  }, [config?.preferences?.theme]);

  useEffect(() => {
    applyThemeStyle(config?.preferences?.themeStyle ?? 'tmarks');
  }, [config?.preferences?.themeStyle]);

  const isConfigured = Boolean(config && config.bookmarkSite.apiKey);
  const isAIEnabled = Boolean(
    config && config.preferences.enableAI && config.aiConfig.apiKeys[config.aiConfig.provider]
  );

  // Initialize bookmark mode
  useEffect(() => {
    if (!config || initialized || viewMode !== 'bookmark') return;
    const init = async () => {
      if (!isConfigured) { setInitialized(true); return; }
      try {
        await extractPageInfo();
        const shouldUseAI = config.preferences.enableAI && Boolean(config.aiConfig.apiKeys[config.aiConfig.provider]);
        if (shouldUseAI) await recommendTags();
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setInitialized(true);
      }
    };
    init();
  }, [config, viewMode]);

  // Initialize newtab mode
  useEffect(() => {
    if (initialized || viewMode !== 'newtab') return;
    const init = async () => {
      try {
        await extractPageInfo();
        await newtabState.loadNewtabFolders();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setInitialized(true);
      }
    };
    init();
  }, [initialized, viewMode]);

  const handleSave = async () => {
    if (selectedTags.length === 0) { setError('请至少选择一个标签'); return; }
    await saveBookmark();
  };

  const handleAddCustomTag = () => {
    const tagName = customTagInput.trim();
    if (tagName) { addCustomTag(tagName); setCustomTagInput(''); }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddCustomTag();
  };

  const handleApplyTitleOverride = () => {
    const trimmed = titleOverride.trim();
    if (!trimmed || !currentPage) return;
    setCurrentPage({ ...currentPage, title: trimmed });
    setTitleOverride(trimmed);
  };

  const handleApplyDescriptionOverride = () => {
    if (!currentPage) return;
    const trimmed = descriptionOverride.trim();
    setCurrentPage({ ...currentPage, description: trimmed || undefined });
    setDescriptionOverride(trimmed);
  };

  const handleToggleThumbnail = () => {
    if (!currentPage?.thumbnail) { setIncludeThumbnail(false); return; }
    setIncludeThumbnail(!includeThumbnail);
  };

  const openOptions = () => chrome.runtime.openOptionsPage();
  const handleSelectBookmark = () => { setViewMode('bookmark'); setInitialized(false); };
  const handleSelectTabCollection = () => setViewMode('tabCollection');
  const handleSelectNewTab = () => { setViewMode('newtab'); setInitialized(false); };
  const handleBackToSelector = () => setViewMode('selector');

  // 判断用户是否手动选择了文件夹（不是根目录）
  const hasUserSelectedFolder = Boolean(newtabState.currentNewtabFolderId && 
    newtabState.currentNewtabFolderId !== newtabState.newtabRootId);

  // 获取当前保存目标路径（用于显示）
  const currentSaveTargetPath = (() => {
    if (!newtabState.newtabFoldersLoaded) return 'TMarks';
    const folder = newtabState.newtabFolders.find(f => f.id === newtabState.currentNewtabFolderId);
    return folder?.path || 'TMarks';
  })();

  const handleSaveToNewTab = async () => {
    if (!currentPage?.url) { setError('未获取到页面信息'); return; }
    const finalTitle = titleOverride.trim() || currentPage.title;
    try {
      let targetFolderId = newtabState.currentNewtabFolderId || undefined;
      if (!newtabState.newtabFoldersLoaded) targetFolderId = undefined;

      // 只有在用户未手动选择文件夹时，才自动调用 AI 推荐
      const shouldAutoRecommend = !hasUserSelectedFolder && Boolean(
        config && config.preferences.enableNewtabAI && config.aiConfig.apiKeys[config.aiConfig.provider]
      );
      
      if (shouldAutoRecommend && newtabState.newtabFoldersLoaded) {
        try {
          setLoadingMessage('AI 正在推荐 NewTab 文件夹...');
          const resp = await sendMessage<{ suggestedFolders: Array<{ id: string; path: string; confidence: number }> }>({
            type: 'RECOMMEND_NEWTAB_FOLDER',
            payload: { title: finalTitle, url: currentPage.url, description: currentPage.description },
          });
          if (resp?.suggestedFolders?.length > 0) targetFolderId = resp.suggestedFolders[0].id;
        } catch { /* ignore */ }
      }

      setLoadingMessage('正在保存到 NewTab...');
      await sendMessage<{ id: string }>({
        type: 'SAVE_TO_NEWTAB',
        payload: { url: currentPage.url, title: finalTitle, parentBookmarkId: targetFolderId },
      });
      setLoadingMessage(null);
      
      // 显示保存成功信息，包含目标路径
      const savedPath = newtabState.newtabFolders.find(f => f.id === targetFolderId)?.path || 'TMarks';
      setSuccessMessage(`已保存到 ${savedPath}`);
      chrome.notifications.create({
        type: 'basic', iconUrl: '/icons/icon-128.png',
        title: 'AI 书签助手', message: `《${finalTitle}》已保存到 ${savedPath}`,
      });
      setTimeout(() => {
        const currentMsg = useAppStore.getState().successMessage;
        if (currentMsg?.startsWith('已保存到')) {
          useAppStore.getState().setSuccessMessage(null);
        }
      }, 2000);
    } catch (e) {
      setLoadingMessage(null);
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  // Mode selector view
  if (viewMode === 'selector') {
    return (
      <ModeSelector
        onSelectBookmark={handleSelectBookmark}
        onSelectNewTab={handleSelectNewTab}
        onSelectTabCollection={handleSelectTabCollection}
        onOpenOptions={openOptions}
      />
    );
  }

  // Tab collection view
  if (viewMode === 'tabCollection') {
    if (!config) return <div>Loading...</div>;
    return <TabCollectionView config={config.bookmarkSite} onBack={handleBackToSelector} />;
  }

  // Onboarding view (not configured)
  if (initialized && !isConfigured) {
    return (
      <div className="relative h-[80vh] min-h-[580px] w-[380px] overflow-hidden rounded-2xl bg-[var(--tab-popup-onboarding-bg)] text-[var(--tab-popup-primary-text)] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tab-popup-onboarding-radial-top),transparent_70%)] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tab-popup-onboarding-radial-bottom),transparent_65%)] opacity-80" />
        <div className="absolute inset-0 bg-[color:var(--tab-popup-onboarding-overlay)] backdrop-blur-2xl" />
        <div className="relative flex h-full flex-col">
          <header className="px-6 pt-8 pb-6">
            <div className="rounded-3xl border border-[color:var(--tab-popup-onboarding-card-border)] bg-[color:var(--tab-popup-onboarding-card-bg)] p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] shadow-lg">
                  <svg className="h-6 w-6 text-[var(--tab-popup-primary-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--tab-popup-onboarding-label)]">Onboarding</p>
                  <h1 className="text-2xl font-semibold">欢迎使用 AI 书签助手</h1>
                  <p className="text-sm text-[color:var(--tab-popup-onboarding-desc)]">完成基础配置，即可为任意网页生成智能标签与分类建议。</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
            <section className="rounded-3xl border border-[color:var(--tab-popup-onboarding-card-border)] bg-[color:var(--tab-popup-onboarding-subtle-bg)] p-5 backdrop-blur-xl">
              <h2 className="text-sm font-semibold">必备信息</h2>
              <p className="mt-1 text-xs text-[color:var(--tab-popup-onboarding-label)]">准备以下三项配置，助手即可立即开始工作：</p>
              <ol className="mt-4 space-y-3 text-xs">
                {['AI 服务 API Key', '书签站点 API 地址', '书签站点 API Key'].map((item, idx) => (
                  <li key={idx} className="flex gap-3 rounded-2xl border border-[color:var(--tab-popup-onboarding-subtle-border)] bg-[color:var(--tab-popup-onboarding-subtle-bg)] p-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-[color:var(--tab-popup-onboarding-tip-bg)] text-[11px] font-semibold">{idx + 1}</span>
                    <div><p className="font-semibold">{item}</p></div>
                  </li>
                ))}
              </ol>
            </section>
          </main>
          <footer className="px-6 pb-6">
            <button onClick={openOptions} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--tab-popup-primary-from)] via-[var(--tab-popup-primary-via)] to-[var(--tab-popup-primary-to)] px-6 py-3 text-sm font-semibold shadow-lg transition-all hover:shadow-xl active:scale-95">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              前往设置
            </button>
          </footer>
        </div>
      </div>
    );
  }

  // Main view (bookmark or newtab mode)
  return (
    <div className="relative h-[80vh] min-h-[620px] w-[380px] overflow-hidden rounded-2xl bg-[var(--tab-popup-surface)] text-[var(--tab-popup-text)] shadow-2xl">
      {/* Notifications */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 z-50 space-y-2 px-4 pt-2">
        {error && <div className="pointer-events-auto"><ErrorMessage message={error} onDismiss={() => setError(null)} onRetry={!isLoading && lastRecommendationSource === 'fallback' ? recommendTags : undefined} /></div>}
        {loadingMessage && <div className="pointer-events-auto"><LoadingMessage message={loadingMessage} /></div>}
        {successMessage && <div className="pointer-events-auto"><SuccessMessage message={successMessage} /></div>}
      </div>

      <div className="relative flex h-full flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-20 border-b border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] px-3 pt-2 pb-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={handleBackToSelector} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--tab-popup-text-muted)] transition-all hover:bg-[var(--tab-popup-action-neutral-bg)] active:scale-95" title="返回">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            {viewMode === 'bookmark' && isAIEnabled && <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[var(--tab-popup-badge-blue-bg)] px-2 py-1 text-[10px] font-medium text-[var(--tab-popup-badge-blue-text)]">推荐 {recommendedTags.length}</span>}
            {viewMode === 'bookmark' && !isAIEnabled && <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[var(--tab-popup-badge-amber-bg)] px-2 py-1 text-[10px] font-medium text-[var(--tab-popup-badge-amber-text)]">AI 关闭</span>}
            {viewMode === 'bookmark' && (
              <>
                <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[var(--tab-popup-badge-indigo-bg)] px-2 py-1 text-[10px] font-medium text-[var(--tab-popup-badge-indigo-text)]">已选 {selectedTags.length}</span>
                <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[var(--tab-popup-badge-purple-bg)] px-2 py-1 text-[10px] font-medium text-[var(--tab-popup-badge-purple-text)]">库 {existingTags.length}</span>
              </>
            )}
            {viewMode === 'newtab' && (
              <button
                onClick={() => newtabState.handleRecommendNewtabFolder(currentPage)}
                disabled={newtabState.isNewtabRecommending || !currentPage?.url || !newtabState.newtabFoldersLoaded}
                className="rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--tab-popup-text)] transition-all hover:bg-[var(--tab-popup-action-neutral-bg)] disabled:opacity-40"
              >
                {newtabState.isNewtabRecommending ? 'AI 推荐中...' : 'AI 推荐'}
              </button>
            )}
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => window.close()} className="rounded-lg border border-[var(--tab-popup-border-strong)] bg-[var(--tab-popup-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--tab-popup-text)] transition-all hover:bg-[var(--tab-popup-action-neutral-bg)] active:scale-95">取消</button>
              {viewMode === 'bookmark' ? (
                <button onClick={handleSave} disabled={isSaving || selectedTags.length === 0} className="rounded-lg bg-gradient-to-r from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] px-4 py-1.5 text-[11px] font-semibold text-[var(--tab-popup-primary-text)] shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">
                  {isSaving ? <span className="flex items-center gap-1"><svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>保存中</span> : '保存书签'}
                </button>
              ) : (
                <button onClick={handleSaveToNewTab} disabled={isSaving || !currentPage?.url} className="rounded-lg bg-gradient-to-r from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] px-4 py-1.5 text-[11px] font-semibold text-[var(--tab-popup-primary-text)] shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">保存到 NewTab</button>
              )}
            </div>
          </div>
        </header>

        {/* NewTab 保存位置固定栏 */}
        {viewMode === 'newtab' && (
          <div className="fixed top-[46px] left-0 right-0 z-20 border-b border-[var(--tab-popup-save-target-border)] bg-[var(--tab-popup-save-target-bg)] px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--tab-popup-save-target-icon)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm font-semibold text-[var(--tab-popup-save-target-text)]">{currentSaveTargetPath}</span>
              </div>
              {hasUserSelectedFolder ? (
                <span className="rounded-full bg-[var(--tab-popup-save-target-badge-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tab-popup-save-target-badge-text)]">已选择</span>
              ) : (
                <span className="rounded-full bg-[var(--tab-popup-save-target-badge-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tab-popup-text-muted)]">默认</span>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className={`relative flex-1 overflow-hidden bg-[var(--tab-popup-bg)] px-4 ${viewMode === 'newtab' ? 'flex flex-col pt-[90px] pb-4' : 'space-y-2.5 overflow-y-auto pt-[60px] pb-[70px]'}`}>
          {/* NewTab Mode */}
          {viewMode === 'newtab' && (
            <NewtabModeView
              currentPage={currentPage}
              titleOverride={titleOverride}
              setTitleOverride={setTitleOverride}
              newtabFoldersLoadError={newtabState.newtabFoldersLoadError}
              enterNewtabFolder={newtabState.enterNewtabFolder}
              loadNewtabFolders={newtabState.loadNewtabFolders}
              newtabSuggestions={newtabState.newtabSuggestions}
              newtabFolders={newtabState.newtabFolders}
              currentNewtabFolderId={newtabState.currentNewtabFolderId}
              newtabRootId={newtabState.newtabRootId}
            />
          )}

          {/* Bookmark Mode - Loading */}
          {viewMode === 'bookmark' && isRecommending && (
            <section className="flex items-center gap-3 rounded-xl border border-[var(--tab-popup-border)] bg-[var(--tab-popup-section-gray-bg)] p-3.5 text-sm text-[var(--tab-popup-text)] shadow-lg">
              <LoadingSpinner />
              <p>AI 正在分析当前页面，请稍候...</p>
            </section>
          )}

          {/* Bookmark Mode - AI Disabled */}
          {viewMode === 'bookmark' && !isAIEnabled && !isRecommending && recommendedTags.length === 0 && (
            <section className="rounded-xl border border-[var(--tab-popup-section-amber-border)] bg-gradient-to-br from-[var(--tab-popup-section-amber-from)] to-[var(--tab-popup-section-amber-to)] p-3.5 shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--tab-popup-section-amber-icon)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--tab-popup-section-amber-title)]">AI 推荐已关闭</p>
                  <p className="mt-1 text-xs text-[var(--tab-popup-section-amber-text)]">请从下方标签库中选择标签，或在设置中启用 AI 推荐。</p>
                </div>
              </div>
            </section>
          )}

          {/* Bookmark Mode - Selected Tags */}
          {viewMode === 'bookmark' && selectedTags.length > 0 && (
            <section className="rounded-xl border border-[var(--tab-popup-section-blue-border)] bg-gradient-to-br from-[var(--tab-popup-section-blue-from)] to-[var(--tab-popup-section-blue-to)] p-3.5 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--tab-popup-text)]">已选择标签</p>
                  <span className="text-[10px] text-[var(--tab-popup-text-muted)]">点击标签可取消选择。</span>
                </div>
                <span className="rounded-full bg-[var(--tab-popup-section-blue-badge-bg)] px-2 py-0.5 text-xs font-medium text-[var(--tab-popup-section-blue-badge-text)]">{selectedTags.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)} title="点击移除标签" className={getSelectedTagClass(tagTheme)}>
                    <span className="max-w-[120px] truncate">{tag}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Bookmark Mode - Page Info & Actions */}
          {currentPage && viewMode === 'bookmark' && (
            <section className="rounded-xl border border-[var(--tab-popup-section-gray-border)] bg-[var(--tab-popup-section-gray-bg)] p-3.5 shadow-lg">
              <div className="mb-3 flex items-center justify-center gap-2">
                <button type="button" onClick={() => setIsPublic(!isPublic)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${isPublic ? 'bg-[var(--tab-popup-action-emerald-bg)] text-[var(--tab-popup-action-emerald-text)] hover:bg-[var(--tab-popup-action-emerald-bg-hover)]' : 'bg-[var(--tab-popup-action-neutral-bg)] text-[var(--tab-popup-action-neutral-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)]'}`} title={isPublic ? '公开（点击切换为隐私）' : '隐私（点击切换为公开）'}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isPublic ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                  </svg>
                </button>
                <button type="button" onClick={handleToggleThumbnail} disabled={!currentPage.thumbnail} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${includeThumbnail ? 'bg-[var(--tab-popup-action-amber-bg)] text-[var(--tab-popup-action-amber-text)] hover:bg-[var(--tab-popup-action-amber-bg-hover)]' : 'bg-[var(--tab-popup-action-neutral-bg)] text-[var(--tab-popup-action-neutral-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)]'} ${!currentPage.thumbnail ? 'cursor-not-allowed opacity-40' : ''}`} title={includeThumbnail ? '包含封面图（点击取消）' : '不包含封面图（点击添加）'}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
                <button type="button" onClick={() => setCreateSnapshot(!createSnapshot)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${createSnapshot ? 'bg-[var(--tab-popup-action-purple-bg)] text-[var(--tab-popup-action-purple-text)] hover:bg-[var(--tab-popup-action-purple-bg-hover)]' : 'bg-[var(--tab-popup-action-neutral-bg)] text-[var(--tab-popup-action-neutral-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)]'}`} title={createSnapshot ? '创建快照（点击取消）' : '不创建快照（点击创建）'}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <button type="button" onClick={() => setShowTitleEdit(!showTitleEdit)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${showTitleEdit ? 'bg-[var(--tab-popup-action-blue-bg)] text-[var(--tab-popup-action-blue-text)] hover:bg-[var(--tab-popup-action-blue-bg-hover)]' : 'bg-[var(--tab-popup-action-neutral-bg)] text-[var(--tab-popup-action-neutral-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)]'}`} title={showTitleEdit ? '修改标题（点击收起）' : '修改标题（点击展开）'}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button type="button" onClick={() => setShowDescEdit(!showDescEdit)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${showDescEdit ? 'bg-[var(--tab-popup-action-blue-bg)] text-[var(--tab-popup-action-blue-text)] hover:bg-[var(--tab-popup-action-blue-bg-hover)]' : 'bg-[var(--tab-popup-action-neutral-bg)] text-[var(--tab-popup-action-neutral-text)] hover:bg-[var(--tab-popup-action-neutral-bg-hover)]'}`} title={showDescEdit ? '修改描述（点击收起）' : '修改描述（点击展开）'}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                </button>
              </div>
              <div className="mb-2.5 space-y-2">
                {showTitleEdit && (
                  <div className="animate-in slide-in-from-top-2 fade-in flex gap-2 duration-200">
                    <input type="text" value={titleOverride} onChange={(e) => setTitleOverride(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleApplyTitleOverride(); }} placeholder="输入自定义标题后回车或点击应用" className="flex-1 rounded-xl border border-[var(--tab-popup-input-border)] bg-[var(--tab-popup-input-bg)] px-3 py-2 text-sm text-[var(--tab-popup-input-text)] placeholder:text-[var(--tab-popup-input-placeholder)] focus:border-[var(--tab-popup-input-focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--tab-popup-input-focus-ring)]" autoFocus />
                    <button onClick={handleApplyTitleOverride} disabled={!titleOverride.trim() || !currentPage} className="rounded-xl bg-gradient-to-r from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] px-4 py-2 text-sm font-medium text-[var(--tab-popup-primary-text)] shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">应用</button>
                  </div>
                )}
                {showDescEdit && (
                  <div className="animate-in slide-in-from-top-2 fade-in flex gap-2 duration-200">
                    <textarea value={descriptionOverride} onChange={(e) => setDescriptionOverride(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleApplyDescriptionOverride(); }} placeholder="输入自定义描述后 Ctrl+Enter 或点击应用" rows={2} className="flex-1 resize-none rounded-xl border border-[var(--tab-popup-input-border)] bg-[var(--tab-popup-input-bg)] px-3 py-2 text-sm text-[var(--tab-popup-input-text)] placeholder:text-[var(--tab-popup-input-placeholder)] focus:border-[var(--tab-popup-input-focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--tab-popup-input-focus-ring)]" autoFocus />
                    <button onClick={handleApplyDescriptionOverride} disabled={!currentPage} className="rounded-xl bg-gradient-to-r from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] px-4 py-2 text-sm font-medium text-[var(--tab-popup-primary-text)] shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">应用</button>
                  </div>
                )}
              </div>
              <PageInfoCard title={currentPage.title} url={currentPage.url} description={currentPage.description} thumbnail={includeThumbnail ? currentPage.thumbnail : undefined} thumbnails={includeThumbnail ? currentPage.thumbnails : undefined} favicon={currentPage.favicon} onThumbnailChange={(newThumbnail) => setCurrentPage({ ...currentPage, thumbnail: newThumbnail })} />
            </section>
          )}

          {/* Bookmark Mode - AI Recommendations */}
          {viewMode === 'bookmark' && recommendedTags.length > 0 && (
            <section className="rounded-xl border border-[var(--tab-popup-section-purple-border)] bg-gradient-to-br from-[var(--tab-popup-section-purple-from)] to-[var(--tab-popup-section-purple-to)] p-3.5 shadow-lg">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--tab-popup-text)]">AI 推荐</h2>
                  <p className="mt-1 text-xs text-[var(--tab-popup-text-muted)]">根据页面内容实时生成，点击可快速选择。</p>
                </div>
                <span className="rounded-full bg-[var(--tab-popup-section-purple-badge-bg)] px-2 py-0.5 text-xs font-medium text-[var(--tab-popup-section-purple-badge-text)]">{recommendedTags.length}</span>
              </div>
              <TagList tags={recommendedTags} selectedTags={selectedTags} onToggle={toggleTag} theme={tagTheme} />
            </section>
          )}

          {/* Bookmark Mode - Tag Library */}
          {viewMode === 'bookmark' && (
            <section className="rounded-xl border border-[var(--tab-popup-section-emerald-border)] bg-gradient-to-br from-[var(--tab-popup-section-emerald-from)] to-[var(--tab-popup-section-emerald-to)] p-3.5 shadow-lg">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--tab-popup-text)]">
                    <svg className="h-4 w-4 text-[var(--tab-popup-section-emerald-icon)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    标签库
                  </h2>
                  <p className="mt-1 text-xs text-[var(--tab-popup-text-muted)]">与你的历史标签数据同步，点选即可加入。</p>
                </div>
                <span className="rounded-full bg-[var(--tab-popup-section-emerald-badge-bg)] px-2 py-0.5 text-xs font-medium text-[var(--tab-popup-section-emerald-badge-text)]">{existingTags.length}</span>
              </div>
              <div className="scrollbar-thin scrollbar-thumb-[var(--tab-popup-border-strong)] scrollbar-track-transparent max-h-48 overflow-y-auto pr-1">
                {existingTags.length === 0 ? (
                  <div className="flex items-center justify-center py-6"><p className="text-xs text-[var(--tab-popup-text-muted)]">{isLoading ? '加载中...' : '暂无标签'}</p></div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {existingTags.sort((a, b) => b.count - a.count).map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <button key={tag.id} onClick={() => toggleTag(tag.name)} className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${getExistingTagClass(tagTheme, isSelected)}`}>
                          {tagTheme !== 'bw' && <span className="mr-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: tag.color || 'var(--tab-message-success-icon)' }} />}
                          <span className="max-w-[110px] truncate">{tag.name}</span>
                          {tag.count > 0 && <span className="ml-1 text-[10px] opacity-60">({tag.count})</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Save Duration */}
          {lastSaveDurationMs !== null && (
            <section className="rounded-xl border border-[var(--tab-popup-section-gray-border)] bg-[var(--tab-popup-section-gray-bg)] p-2.5 text-xs text-[var(--tab-popup-text-muted)] shadow-sm">
              最近一次保存耗时 {(lastSaveDurationMs / 1000).toFixed(2)}s
            </section>
          )}
        </main>

        {/* Footer - Custom Tag Input (only for bookmark mode) */}
        {viewMode === 'bookmark' && (
          <footer className="fixed bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-[var(--tab-popup-footer-border)] bg-[var(--tab-popup-footer-bg)] px-3 pt-2 pb-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 flex-shrink-0 text-[var(--tab-popup-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <input type="text" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="输入标签名并回车添加" className="flex-1 rounded-xl border border-[var(--tab-popup-input-border)] bg-[var(--tab-popup-input-bg)] px-3 py-1.5 text-sm text-[var(--tab-popup-input-text)] placeholder:text-[var(--tab-popup-input-placeholder)] focus:border-[var(--tab-popup-input-focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--tab-popup-input-focus-ring)]" />
              <button onClick={handleAddCustomTag} disabled={!customTagInput.trim()} className="rounded-xl bg-gradient-to-r from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] px-4 py-1.5 text-sm font-medium text-[var(--tab-popup-primary-text)] shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">添加</button>
            </div>
          </footer>
        )}
      </div>

      {/* Bookmark Exists Dialog */}
      {existingBookmark && existingBookmark.needsDialog && (
        <BookmarkExistsDialog
          bookmark={existingBookmark}
          newTags={selectedTags}
          onUpdateTags={async (tags) => { if (existingBookmark.id) await updateExistingBookmarkTags(existingBookmark.id, tags); }}
          onUpdateDescription={async (description) => { if (existingBookmark.id) await updateExistingBookmarkDescription(existingBookmark.id, description); }}
          onCreateSnapshot={async () => { if (existingBookmark.id) await createSnapshotForBookmark(existingBookmark.id); }}
          onCancel={() => setExistingBookmark(null)}
        />
      )}
    </div>
  );
}
