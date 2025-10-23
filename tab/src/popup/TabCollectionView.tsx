/**
 * Tab Collection View Component
 * Displays current window tabs and allows user to select which tabs to collect
 */

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { getCurrentWindowTabs, collectCurrentWindowTabs, closeTabs } from '@/lib/services/tab-collection';
import type { BookmarkSiteConfig } from '@/types';

interface TabCollectionViewProps {
  config: BookmarkSiteConfig;
  onBack: () => void;
}

interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

export function TabCollectionView({ config, onBack }: TabCollectionViewProps) {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [collectedTabIds, setCollectedTabIds] = useState<number[]>([]);

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    try {
      setIsLoading(true);
      const allTabs = await getCurrentWindowTabs();

      // Filter out chrome:// and extension pages
      const validTabs = allTabs
        .filter((tab) => tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
        .map((tab) => ({
          id: tab.id!,
          title: tab.title || 'Untitled',
          url: tab.url!,
          favIconUrl: tab.favIconUrl,
        }));

      setTabs(validTabs);

      // Select all by default
      setSelectedTabIds(new Set(validTabs.map((tab) => tab.id)));
    } catch (err) {
      console.error('Failed to load tabs:', err);
      setError('加载标签页失败');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTab = (tabId: number) => {
    const newSelected = new Set(selectedTabIds);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedTabIds.size === tabs.length) {
      setSelectedTabIds(new Set());
    } else {
      setSelectedTabIds(new Set(tabs.map((tab) => tab.id)));
    }
  };

  const handleCollect = async () => {
    if (selectedTabIds.size === 0) {
      setError('请至少选择一个标签页');
      return;
    }

    setIsCollecting(true);
    setError(null);

    try {
      // Collect only selected tabs
      const result = await collectCurrentWindowTabs(config, selectedTabIds);

      if (result.success) {
        setSuccessMessage(result.message || '收纳成功');
        setCollectedTabIds(Array.from(selectedTabIds));
        setShowCloseConfirm(true);
      } else {
        setError(result.error || '收纳失败');
      }
    } catch (err) {
      console.error('Failed to collect tabs:', err);
      setError(err instanceof Error ? err.message : '收纳失败');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleCloseTabs = async () => {
    try {
      await closeTabs(collectedTabIds);
      window.close();
    } catch (err) {
      console.error('Failed to close tabs:', err);
      setError('关闭标签页失败');
    }
  };

  const handleKeepTabs = () => {
    setShowCloseConfirm(false);
    setCollectedTabIds([]);
    // Optionally close the popup
    window.close();
  };

  return (
    <div className="relative h-[80vh] min-h-[620px] w-[380px] overflow-hidden rounded-b-2xl bg-white text-gray-900 shadow-2xl">
      <div className="relative flex h-full flex-col">
        {/* Error/Success Messages */}
        <div className="pointer-events-none absolute top-4 left-0 right-0 z-[9999] px-4 space-y-2">
          {error && (
            <div className="pointer-events-auto">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            </div>
          )}
          {successMessage && (
            <div className="pointer-events-auto">
              <SuccessMessage message={successMessage} onDismiss={() => setSuccessMessage(null)} />
            </div>
          )}
        </div>

        {/* Header - Fixed */}
        <header className="fixed top-0 left-0 right-0 z-40 px-3 pt-2 pb-2.5 bg-white border-b border-gray-200 shadow-sm rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-600 transition-all duration-200 hover:bg-gray-100 active:scale-95"
              title="返回"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-600 font-medium">
              共 {tabs.length} 个
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] text-teal-600 font-medium">
              已选 {selectedTabIds.size} 个
            </span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={onBack}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-95"
              >
                取消
              </button>
              <button
                onClick={handleCollect}
                disabled={isCollecting || selectedTabIds.size === 0}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
              >
                {isCollecting ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    收纳中
                  </span>
                ) : (
                  '收纳'
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Close Confirm Dialog - Fixed at top */}
        {showCloseConfirm && (
          <div className="fixed top-[60px] left-0 right-0 z-50 px-4 pt-2 animate-in slide-in-from-top-5 fade-in duration-300">
            <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-lg">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800">收纳成功</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    已成功收纳 {collectedTabIds.length} 个标签页。是否关闭这些标签页？
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleKeepTabs}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-95"
                >
                  保留标签页
                </button>
                <button
                  onClick={handleCloseTabs}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  关闭标签页
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Main Content */}
        <main className={`relative flex-1 space-y-3 overflow-y-auto px-4 pb-5 bg-white ${showCloseConfirm ? 'pt-[180px]' : 'pt-[60px]'}`}>
          {isLoading ? (
            <section className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
              <LoadingSpinner />
              <p>正在加载标签页...</p>
            </section>
          ) : (
            <>
              {/* Select All Button */}
              <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <button
                  onClick={toggleAll}
                  className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 transition-all duration-200 hover:bg-gray-100 active:scale-95"
                >
                  <span>{selectedTabIds.size === tabs.length ? '取消全选' : '全选'}</span>
                  <span className="text-xs text-gray-500">
                    {selectedTabIds.size} / {tabs.length}
                  </span>
                </button>
              </section>

              {/* Tab List */}
              <section className="space-y-2">
                {tabs.map((tab) => {
                  const isSelected = selectedTabIds.has(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => toggleTab(tab.id)}
                      className={`group w-full rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98] ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50 shadow-md'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {tab.favIconUrl && (
                          <img src={tab.favIconUrl} alt="" className="h-5 w-5 rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{tab.title}</p>
                          <p className="truncate text-xs text-gray-500">{tab.url}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

