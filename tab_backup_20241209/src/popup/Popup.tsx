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

type ViewMode = 'selector' | 'bookmark' | 'tabCollection';

export function Popup() {
  const {
    currentPage,
    recommendedTags,
    existingTags,
    selectedTags,
    isLoading,
    isSaving,
    isRecommending,
    error,
    successMessage,
    loadingMessage,
    existingBookmark,
    config,
    loadConfig,
    loadExistingTags,
    extractPageInfo,
    recommendTags,
    saveBookmark,
    setError,
    toggleTag,
    addCustomTag,
    setCurrentPage,
    includeThumbnail,
    setIncludeThumbnail,
    isPublic,
    setIsPublic,
    createSnapshot,
    setCreateSnapshot,
    setExistingBookmark,
    updateExistingBookmarkTags,
    createSnapshotForBookmark,
    lastRecommendationSource,
    lastSaveDurationMs
  } = useAppStore();

  const [customTagInput, setCustomTagInput] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('selector');

  useEffect(() => {
    setTitleOverride(currentPage?.title ?? '');
  }, [currentPage?.title]);

  // Load config and existing tags first
  useEffect(() => {
    loadConfig();
    loadExistingTags();
  }, []);

  // Check if configured (only need bookmark site API key, AI is optional)
  const isConfigured = Boolean(config && config.bookmarkSite.apiKey);

  // Check if AI is enabled and configured
  const isAIEnabled = Boolean(
    config &&
    config.preferences.enableAI &&
    config.aiConfig.apiKeys[config.aiConfig.provider]
  );

  // Initialize after config is loaded (only for bookmark mode)
  useEffect(() => {
    if (!config || initialized || viewMode !== 'bookmark') return;

    const init = async () => {
      if (!isConfigured) {
        setInitialized(true);
        return;
      }

      try {
        // Extract page info
        await extractPageInfo();

        // Check AI status at init time (not from closure)
        const shouldUseAI =
          config.preferences.enableAI &&
          Boolean(config.aiConfig.apiKeys[config.aiConfig.provider]);

        if (shouldUseAI) {
          await recommendTags();
        }

        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setInitialized(true);
      }
    };

    init();
  }, [config, viewMode]);

  const handleSave = async () => {
    // AI 书签助手需要标签来组织和分类书签
    if (selectedTags.length === 0) {
      setError('请至少选择一个标签');
      return;
    }

    await saveBookmark();
  };

  const handleAddCustomTag = () => {
    const tagName = customTagInput.trim();
    if (tagName) {
      addCustomTag(tagName);
      setCustomTagInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomTag();
    }
  };

  const handleApplyTitleOverride = () => {
    const trimmed = titleOverride.trim();
    if (!trimmed || !currentPage) {
      return;
    }
    setCurrentPage({ ...currentPage, title: trimmed });
    setTitleOverride(trimmed);
  };

  const handleToggleThumbnail = () => {
    if (!currentPage?.thumbnail) {
      setIncludeThumbnail(false);
      return;
    }

    setIncludeThumbnail(!includeThumbnail);
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleSelectBookmark = () => {
    setViewMode('bookmark');
    setInitialized(false); // Reset to trigger initialization
  };

  const handleSelectTabCollection = () => {
    setViewMode('tabCollection');
  };

  const handleBackToSelector = () => {
    setViewMode('selector');
  };

  // Show mode selector first
  if (viewMode === 'selector') {
    return (
      <ModeSelector
        onSelectBookmark={handleSelectBookmark}
        onSelectTabCollection={handleSelectTabCollection}
        onOpenOptions={openOptions}
      />
    );
  }

  // Show tab collection view
  if (viewMode === 'tabCollection') {
    if (!config) {
      return <div>Loading...</div>;
    }
    return (
      <TabCollectionView
        config={config.bookmarkSite}
        onBack={handleBackToSelector}
      />
    );
  }

  // Show configuration prompt if not configured (bookmark mode)
  if (initialized && !isConfigured) {
    return (
      <div className="relative h-[80vh] min-h-[580px] w-[380px] overflow-hidden rounded-2xl bg-slate-950 text-slate-100 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),transparent_70%)] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(165,180,252,0.25),transparent_65%)] opacity-80" />
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-2xl" />
        <div className="relative flex h-full flex-col">
          <header className="px-6 pt-8 pb-6">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-blue-900/20 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/40">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">Onboarding</p>
                  <h1 className="text-2xl font-semibold text-white">欢迎使用 AI 书签助手</h1>
                  <p className="text-sm text-white/70">完成基础配置，即可为任意网页生成智能标签与分类建议。</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-indigo-500/10 backdrop-blur-xl">
              <h2 className="text-sm font-semibold text-white">必备信息</h2>
              <p className="mt-1 text-xs text-white/60">准备以下三项配置，助手即可立即开始工作：</p>
              <ol className="mt-4 space-y-3 text-xs text-white/75">
                <li className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-blue-500/30 text-[11px] font-semibold text-blue-100">1</span>
                  <div>
                    <p className="font-semibold text-white">AI 服务 API Key</p>
                    <p className="mt-1 text-[11px] text-white/60">用于生成智能标签的模型凭证，支持多个主流服务商。</p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-blue-500/30 text-[11px] font-semibold text-blue-100">2</span>
                  <div>
                    <p className="font-semibold text-white">书签站点 API 地址</p>
                    <p className="mt-1 text-[11px] text-white/60">指向你的书签服务端点，默认为 TMarks 官方地址。</p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-blue-500/30 text-[11px] font-semibold text-blue-100">3</span>
                  <div>
                    <p className="font-semibold text-white">书签站点 API Key</p>
                    <p className="mt-1 text-[11px] text-white/60">用于同步与保存书签数据，请在服务端控制台生成密钥。</p>
                  </div>
                </li>
              </ol>
            </section>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-5 shadow-lg shadow-blue-900/20 backdrop-blur-xl">
              <h2 className="text-sm font-semibold text-white">小贴士</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[11px] text-white/70">
                <li>可在设置页保存多个 API 与模型组合，一键切换场景。</li>
                <li>支持自定义 Prompt，满足不同标签风格或语言需求。</li>
                <li>配置完成后，助手会自动抓取当前标签页并生成推荐。</li>
              </ul>
            </section>
          </main>

          <footer className="px-6 pb-6">
            <button
              onClick={openOptions}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              前往设置
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[80vh] min-h-[620px] w-[380px] overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
      {/* 通知消息 - 固定在最顶部 */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 z-50 px-4 pt-2 space-y-2">
        {error && (
          <div className="pointer-events-auto">
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              onRetry={!isLoading && lastRecommendationSource === 'fallback' ? recommendTags : undefined}
            />
          </div>
        )}
        {loadingMessage && (
          <div className="pointer-events-auto">
            <LoadingMessage message={loadingMessage} />
          </div>
        )}
        {successMessage && (
          <div className="pointer-events-auto">
            <SuccessMessage message={successMessage} />
          </div>
        )}
      </div>

      <div className="relative flex h-full flex-col">
        <header className="fixed top-0 left-0 right-0 z-20 px-3 pt-2 pb-2.5 bg-white border-b border-gray-200 shadow-sm rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToSelector}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-600 transition-all duration-200 hover:bg-gray-100 active:scale-95"
              title="返回"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {isAIEnabled ? (
              <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-600 font-medium">
                推荐 {recommendedTags.length}
              </span>
            ) : (
              <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-600 font-medium">
                AI 关闭
              </span>
            )}
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] text-indigo-600 font-medium">
              已选 {selectedTags.length}
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] text-purple-600 font-medium">
              库 {existingTags.length}
            </span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={() => window.close()}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-95"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || selectedTags.length === 0}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    保存中
                  </span>
                ) : (
                  '保存书签'
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex-1 space-y-2.5 overflow-y-auto px-4 pb-[70px] pt-[60px] bg-white">
          {isRecommending && (
            <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-sm text-gray-700 shadow-lg">
              <LoadingSpinner />
              <p>AI 正在分析当前页面，请稍候...</p>
            </section>
          )}

          {!isAIEnabled && !isRecommending && recommendedTags.length === 0 && (
            <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">AI 推荐已关闭</p>
                  <p className="mt-1 text-xs text-amber-600">请从下方标签库中选择标签，或在设置中启用 AI 推荐。</p>
                </div>
              </div>
            </section>
          )}

          {selectedTags.length > 0 && (
            <section className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3.5 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">已选择标签</p>
                  <span className="text-[10px] text-gray-500">点击标签可取消选择。</span>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {selectedTags.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    title="点击移除标签"
                className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-sm transition-all duration-200 hover:bg-blue-50 active:scale-95"
                  >
                    <span className="truncate max-w-[120px]">{tag}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {currentPage && (
            <section className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-lg">
              <div className="mb-2.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 ${
                      isPublic
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm focus-visible:ring-emerald-300'
                        : 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm focus-visible:ring-blue-300'
                    }`}
                    title={isPublic ? '点击切换为隐私' : '点击切换为公开'}
                  >
                    <svg className="inline-block w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {isPublic ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                    {isPublic ? '公开' : '隐私'}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleThumbnail}
                    disabled={!currentPage.thumbnail}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      includeThumbnail
                        ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    } ${!currentPage.thumbnail ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    {includeThumbnail ? '包含封面图' : '忽略封面图'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateSnapshot(!createSnapshot)}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
                      createSnapshot
                        ? 'border-purple-400 bg-purple-50 text-purple-700 shadow-sm'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="保存网页快照"
                  >
                    <svg className="inline-block w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {createSnapshot ? '创建快照' : '不创建快照'}
                  </button>
              </div>
              <div className="mb-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={titleOverride}
                    onChange={(e) => setTitleOverride(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyTitleOverride();
                      }
                    }}
                    placeholder="输入自定义标题后回车或点击应用"
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleApplyTitleOverride}
                    disabled={!titleOverride.trim() || !currentPage}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                  >
                    应用
                  </button>
                </div>
              </div>
              <PageInfoCard
                title={currentPage.title}
                url={currentPage.url}
                description={currentPage.description}
                thumbnail={includeThumbnail ? currentPage.thumbnail : undefined}
                thumbnails={includeThumbnail ? currentPage.thumbnails : undefined}
                favicon={currentPage.favicon}
                onThumbnailChange={(newThumbnail) => {
                  setCurrentPage({ ...currentPage, thumbnail: newThumbnail });
                }}
              />
            </section>
          )}

          {recommendedTags.length > 0 && (
            <section className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-3.5 shadow-lg">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    AI 推荐
                  </h2>
                  <p className="mt-1 text-xs text-gray-600">根据页面内容实时生成，点击可快速选择。</p>
                </div>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {recommendedTags.length}
                </span>
              </div>
              <TagList tags={recommendedTags} selectedTags={selectedTags} onToggle={toggleTag} />
            </section>
          )}

          <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 shadow-lg">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  标签库
                </h2>
                <p className="mt-1 text-xs text-gray-600">与你的历史标签数据同步，点选即可加入。</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {existingTags.length}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {existingTags.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <p className="text-xs text-gray-500">
                    {isLoading ? '加载中...' : '暂无标签'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {existingTags
                    .sort((a, b) => b.count - a.count)
                    .map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.name)}
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${
                            isSelected
                              ? 'border border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className="mr-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: tag.color || '#34d399' }}
                          />
                          <span className="truncate max-w-[110px]">{tag.name}</span>
                          {tag.count > 0 && (
                            <span className="ml-1 text-[10px] opacity-60">({tag.count})</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </section>

          {lastSaveDurationMs !== null && (
            <section className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-600 shadow-sm">
              最近一次保存耗时 {(lastSaveDurationMs / 1000).toFixed(2)}s
            </section>
          )}
        </main>

        {/* Fixed Footer - Custom Tag Input */}
        <footer className="fixed bottom-0 left-0 right-0 z-20 px-3 pt-2 pb-2.5 bg-white border-t border-gray-200 shadow-sm rounded-t-2xl">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入标签名并回车添加"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddCustomTag}
              disabled={!customTagInput.trim()}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
              添加
            </button>
          </div>
        </footer>

      </div>

      {/* Bookmark Exists Dialog */}
      {existingBookmark && existingBookmark.needsDialog && (
        <BookmarkExistsDialog
          bookmark={existingBookmark}
          newTags={selectedTags}
          onUpdateTags={async (tags) => {
            if (existingBookmark.id) {
              await updateExistingBookmarkTags(existingBookmark.id, tags);
            }
          }}
          onCreateSnapshot={async () => {
            if (existingBookmark.id) {
              await createSnapshotForBookmark(existingBookmark.id);
            }
          }}
          onCancel={() => setExistingBookmark(null)}
        />
      )}
    </div>
  );
}
