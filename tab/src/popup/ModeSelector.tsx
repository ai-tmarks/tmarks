/**
 * Mode Selector Component
 * 简洁卡片式模式选择器
 */

import { useState, useEffect } from 'react';
// @ts-ignore
import { Lunar } from 'lunar-javascript';
import { getTMarksUrls } from '@/lib/constants/urls';
import { StorageService } from '@/lib/utils/storage';
import { applyTheme, applyThemeStyle } from '@/lib/utils/themeManager';

interface ModeSelectorProps {
  onSelectBookmark: () => void;
  onSelectNewTab: () => void;
  onSelectTabCollection: () => void;
  onOpenOptions: () => void;
}

export function ModeSelector({
  onSelectBookmark,
  onSelectNewTab,
  onSelectTabCollection,
  onOpenOptions,
}: ModeSelectorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tmarksUrls, setTmarksUrls] = useState(getTMarksUrls());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadTMarksUrl = async () => {
      const config = await StorageService.getTMarksConfig();
      if (config?.bookmarkApiUrl) {
        const baseUrl = config.bookmarkApiUrl.replace(/\/api\/?$/, '');
        setTmarksUrls(getTMarksUrls(baseUrl));
      }
    };
    loadTMarksUrl();
  }, []);

  useEffect(() => {
    const loadAndApplyTheme = async () => {
      const config = await StorageService.loadConfig();
      applyTheme(config?.preferences?.theme ?? 'auto');
      applyThemeStyle(config?.preferences?.themeStyle ?? 'tmarks');
    };
    loadAndApplyTheme();
  }, []);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${year}年${month}月${day}日 ${weekdays[date.getDay()]}`;
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return '早上好';
    if (hour >= 12 && hour < 14) return '中午好';
    if (hour >= 14 && hour < 18) return '下午好';
    if (hour >= 18 && hour < 22) return '晚上好';
    return '夜深了';
  };

  const formatLunarDate = (date: Date) => {
    const lunar = Lunar.fromDate(date);
    return `${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  };

  return (
    <div className="relative h-[80vh] min-h-[580px] w-[380px] overflow-hidden bg-[var(--tab-popup-bg)] text-[var(--tab-popup-text)]">
      <div className="relative flex h-full flex-col">
        {/* Header */}
        <header className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tab-popup-primary-from)] to-[var(--tab-popup-primary-via)] shadow-lg">
                <svg className="h-5 w-5 text-[var(--tab-popup-primary-text)]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-[var(--tab-popup-text)]">AI 标签助手</h1>
            </div>
            <button
              onClick={onOpenOptions}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--tab-popup-text-muted)] transition-all duration-200 hover:bg-[var(--tab-popup-action-neutral-bg)] active:scale-95"
              title="打开设置"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 space-y-2 overflow-y-auto px-5 pb-[50px] bg-[var(--tab-popup-bg)]">
          {/* Time Display */}
          <section className="rounded-xl border border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] p-3 shadow-lg">
            <div className="flex items-center justify-between text-[var(--tab-popup-text)]">
              <span className="text-xs font-semibold">{getGreeting(currentTime)}</span>
              <span className="font-mono text-base font-bold tracking-wider">{formatTime(currentTime)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--tab-popup-text-muted)]">
              <span>{formatDate(currentTime)}</span>
              <span className="text-[10px] text-[var(--tab-popup-text-muted)]">{formatLunarDate(currentTime)}</span>
            </div>
          </section>

          {/* Bookmark Mode */}
          <button
            onClick={onSelectBookmark}
            className="group w-full rounded-xl border border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] p-4 text-left shadow-lg transition-all duration-200 hover:scale-[1.02] hover:border-[var(--tab-popup-section-blue-border)] hover:shadow-xl active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tab-popup-action-blue-text)] to-[var(--tab-popup-badge-indigo-text)] shadow-lg transition-transform duration-200 group-hover:scale-110">
                <svg className="h-5 w-5 text-[var(--tab-popup-primary-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[var(--tab-popup-text)]">保存书签</h2>
                <p className="mt-0.5 text-xs text-[var(--tab-popup-text-muted)]">为当前页面生成 AI 标签并保存到书签库</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-md bg-[var(--tab-popup-badge-blue-bg)] px-1.5 py-0.5 text-[var(--tab-popup-badge-blue-text)]">AI 推荐</span>
                  <span className="rounded-md bg-[var(--tab-popup-badge-indigo-bg)] px-1.5 py-0.5 text-[var(--tab-popup-badge-indigo-text)]">智能标签</span>
                  <span className="rounded-md bg-[var(--tab-popup-badge-purple-bg)] px-1.5 py-0.5 text-[var(--tab-popup-badge-purple-text)]">云端同步</span>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-[var(--tab-popup-text-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--tab-popup-action-blue-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* NewTab Mode */}
          <button
            onClick={onSelectNewTab}
            className="group w-full rounded-xl border border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] p-4 text-left shadow-lg transition-all duration-200 hover:scale-[1.02] hover:border-[var(--tab-popup-section-amber-border)] hover:shadow-xl active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tab-popup-action-amber-text)] to-[var(--tab-popup-primary-via)] shadow-lg transition-transform duration-200 group-hover:scale-110">
                <svg className="h-5 w-5 text-[var(--tab-popup-primary-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[var(--tab-popup-text)]">保存到 NewTab</h2>
                <p className="mt-0.5 text-xs text-[var(--tab-popup-text-muted)]">保存当前页面到浏览器书签（NewTab 双向同步）</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-md bg-[var(--tab-popup-badge-amber-bg)] px-1.5 py-0.5 text-[var(--tab-popup-badge-amber-text)]">文件夹</span>
                  <span className="rounded-md bg-[var(--tab-popup-section-amber-badge-bg)] px-1.5 py-0.5 text-[var(--tab-popup-section-amber-badge-text)]">书签栏</span>
                  <span className="rounded-md bg-[var(--tab-popup-badge-amber-bg)] px-1.5 py-0.5 text-[var(--tab-popup-badge-amber-text)]">本地同步</span>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-[var(--tab-popup-text-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--tab-popup-action-amber-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Tab Collection Mode */}
          <button
            onClick={onSelectTabCollection}
            className="group w-full rounded-xl border border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] p-4 text-left shadow-lg transition-all duration-200 hover:scale-[1.02] hover:border-[var(--tab-popup-section-emerald-border)] hover:shadow-xl active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tab-popup-action-emerald-text)] to-[var(--tab-popup-section-emerald-icon)] shadow-lg transition-transform duration-200 group-hover:scale-110">
                <svg className="h-5 w-5 text-[var(--tab-popup-primary-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[var(--tab-popup-text)]">收纳标签页</h2>
                <p className="mt-0.5 text-xs text-[var(--tab-popup-text-muted)]">一键收纳当前窗口所有标签页，释放内存</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-md bg-[var(--tab-popup-section-emerald-badge-bg)] px-1.5 py-0.5 text-[var(--tab-popup-section-emerald-badge-text)]">批量收纳</span>
                  <span className="rounded-md bg-[var(--tab-popup-section-emerald-badge-bg)] px-1.5 py-0.5 text-[var(--tab-popup-section-emerald-badge-text)]">一键恢复</span>
                  <span className="rounded-md bg-[var(--tab-popup-section-emerald-badge-bg)] px-1.5 py-0.5 text-[var(--tab-popup-section-emerald-badge-text)]">节省内存</span>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-[var(--tab-popup-text-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--tab-popup-action-emerald-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Tips */}
          <section className="rounded-xl border border-[var(--tab-popup-section-purple-border)] bg-gradient-to-br from-[var(--tab-popup-section-purple-from)] to-[var(--tab-popup-section-blue-from)] p-3.5 shadow-lg">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tab-popup-text)]">
              <span>💡</span>
              <span>小贴士</span>
            </h3>
            <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[var(--tab-popup-text-muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--tab-popup-action-blue-text)]">•</span>
                <span>保存书签：适合收藏重要网页，支持 AI 智能标签</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--tab-popup-action-amber-text)]">•</span>
                <span>保存到 NewTab：快速保存到浏览器书签，与 NewTab 双向同步</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--tab-popup-action-emerald-text)]">•</span>
                <span>收纳标签页：适合临时保存大量标签页，类似 OneTab</span>
              </li>
            </ul>
          </section>
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-20 p-2 bg-[var(--tab-popup-footer-bg)]/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <button
              onClick={() => chrome.tabs.create({ url: tmarksUrls.WEB_APP })}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg border border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] hover:bg-[var(--tab-popup-action-neutral-bg)] transition-colors shadow-sm"
            >
              <span className="text-sm text-[var(--tab-popup-text)]">我的书签</span>
            </button>
            <button
              onClick={() => chrome.tabs.create({ url: tmarksUrls.TAB_GROUPS })}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg border border-[var(--tab-popup-border)] bg-[var(--tab-popup-surface)] hover:bg-[var(--tab-popup-action-neutral-bg)] transition-colors shadow-sm"
            >
              <span className="text-sm text-[var(--tab-popup-text)]">我的收纳</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
