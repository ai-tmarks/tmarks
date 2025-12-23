/**
 * 快捷方式组件 - 网格版本
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import type { WidgetRendererProps } from './types';
import { getFaviconUrl } from '../../utils/favicon';

export const ShortcutWidget = memo(function ShortcutWidget({
  item,
  onRemove: _onRemove,
  isEditing,
  isBatchMode,
  isSelected,
  onToggleSelect,
  shortcutStyle = 'icon',
}: WidgetRendererProps) {
  const shortcut = item.shortcut;
  
  if (!shortcut) {
    return null;
  }

  const title = (shortcut.title || '').trim() || (shortcut.url || '').trim();

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }

    if (isBatchMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect?.(item.id);
      return;
    }
  };

  const favicon = getFaviconUrl(shortcut);
  const [imgSrc, setImgSrc] = useState(favicon);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const iconRef = useRef<HTMLDivElement>(null);
  const triedChromeRef = useRef(false);
  const triedIconRef = useRef(false);

  const handleImgLoad = useCallback(() => setImgLoading(false), []);
  const handleImgError = useCallback(() => {
    const href = typeof location !== 'undefined' ? location.href : '';
    const isNewtabPage = href.includes('/src/newtab/') || href.includes('/newtab/');

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isFirefox = ua.includes('firefox');
    const isChromium =
      !isFirefox &&
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as any).chrome !== 'undefined' &&
      !!(globalThis as any).chrome?.runtime?.id;

    if (isChromium && isNewtabPage && !triedChromeRef.current) {
      triedChromeRef.current = true;
      try {
        const chromeSrc = `chrome://favicon2/?size=64&page_url=${encodeURIComponent(shortcut.url)}`;
        if (chromeSrc !== imgSrc) {
          setImgSrc(chromeSrc);
          setImgError(false);
          setImgLoading(true);
          return;
        }
      } catch {}
    }

    if (!triedIconRef.current) {
      triedIconRef.current = true;
      try {
        const domain = new URL(shortcut.url).hostname;
        const iconSrc = `https://icon.ooo/${domain}?size=64&v=1`;
        if (iconSrc !== imgSrc) {
          setImgSrc(iconSrc);
          setImgError(false);
          setImgLoading(true);
          return;
        }
      } catch {}
    }

    setImgError(true);
    setImgLoading(false);
  }, [imgSrc, shortcut.url]);

  useEffect(() => {
    setImgSrc(favicon);
    setImgError(false);
    setImgLoading(true);
    triedChromeRef.current = favicon.startsWith('chrome://favicon2/');
    triedIconRef.current = favicon.includes('icon.ooo');
  }, [favicon]);

  useEffect(() => {
    const element = iconRef.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      element.style.setProperty('--mouse-x', `${x}%`);
      element.style.setProperty('--mouse-y', `${y}%`);
    };

    element.addEventListener('mousemove', handleMouseMove);
    return () => element.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const initial = (title.charAt(0) || '?').toUpperCase();

  const Container: React.ElementType = isEditing || isBatchMode ? 'div' : 'a';
  const containerProps =
    isEditing || isBatchMode
      ? {
          role: 'link',
          tabIndex: 0,
        }
      : {
          href: shortcut.url,
        };

  // 卡片样式
  if (shortcutStyle === 'card') {
    return (
      <Container
        {...containerProps}
        onClick={handleClick}
        className="group relative flex items-center gap-3 h-full p-3 rounded-xl glass-card transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      >
        {/* 批量选择复选框 */}
        {isBatchMode && (
          <div className="absolute top-2 right-2 z-30">
            {isSelected ? (
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full border border-white/40 bg-black/20" />
            )}
          </div>
        )}

        {/* 图标 */}
        <div
          ref={iconRef}
          className="relative flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: '40px', height: '40px' }}
        >
          {imgLoading && !imgError && imgSrc && (
            <div className="absolute inset-0 bg-white/10 animate-pulse rounded-lg" />
          )}
          {!imgError && imgSrc ? (
            <img
              src={imgSrc}
              alt={title}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={handleImgLoad}
              onError={handleImgError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/10 rounded-lg">
              <span className="text-sm font-medium text-white/80">{initial}</span>
            </div>
          )}
        </div>

        {/* 标题 */}
        <span 
          className="flex-1 text-sm text-white truncate"
          title={title}
        >
          {title}
        </span>
      </Container>
    );
  }

  // 图标样式（默认）
  const iconSize = 56;

  return (
    <Container
      {...containerProps}
      onClick={handleClick}
      className="group relative flex flex-col items-center justify-start h-full pt-2 px-2 rounded-xl transition-all duration-200 cursor-pointer"
    >
      <div
        ref={iconRef}
        className="relative liquid-glass-icon rounded-[12px] overflow-hidden hover:scale-110 active:scale-95 transition-all duration-200"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
        }}
      >
        <div className="glass-refraction" />

        {isBatchMode && (
          <div className="absolute top-1 right-1 z-30">
            {isSelected ? (
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-white/40 bg-black/20" />
            )}
          </div>
        )}

        {/* 加载骨架屏 */}
        {imgLoading && !imgError && imgSrc && (
          <div className="absolute inset-0 z-20 bg-white/10 animate-pulse rounded-[12px]" />
        )}
        {!imgError && imgSrc ? (
          <img
            src={imgSrc}
            alt={title}
            draggable={false}
            onDragStart={(e) => {
              e.preventDefault();
            }}
            className={`w-full h-full object-cover relative z-10 transition-opacity duration-200 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleImgLoad}
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative z-10">
            <span className="text-lg font-medium text-white/80">{initial}</span>
          </div>
        )}
      </div>
      
      <span 
        className="mt-1.5 text-xs text-white truncate max-w-full px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
        title={title}
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}
      >
        {title}
      </span>
    </Container>
  );
});
