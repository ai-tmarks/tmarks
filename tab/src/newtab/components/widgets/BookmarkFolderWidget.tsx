import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Folder } from 'lucide-react';
import type { WidgetRendererProps } from './types';
import { useNewtabStore } from '../../hooks/useNewtabStore';
import { getFaviconUrl } from '../../utils/favicon';

function MiniIcon({
  shortcut,
}: {
  shortcut: { url: string; title?: string; favicon?: string; faviconBase64?: string };
}) {
  const favicon = getFaviconUrl(shortcut);
  const [imgSrc, setImgSrc] = useState(favicon);
  const [imgError, setImgError] = useState(false);
  const triedChromeRef = useRef(false);
  const triedIconRef = useRef(false);

  const initial = ((shortcut.title || shortcut.url || '?').trim().charAt(0) || '?').toUpperCase();

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
          return;
        }
      } catch {}
    }

    setImgError(true);
  }, [imgSrc, shortcut.url]);

  useEffect(() => {
    setImgSrc(favicon);
    setImgError(false);
    triedChromeRef.current = favicon.startsWith('chrome://favicon2/');
    triedIconRef.current = favicon.includes('icon.ooo');
  }, [favicon]);

  return (
    <div className="aspect-square rounded-[4px] overflow-hidden liquid-glass-mini flex items-center justify-center">
      {!imgError && imgSrc ? (
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover rounded-[4px]"
          onError={handleImgError}
        />
      ) : (
        <span className="text-[8px] font-bold text-white/80">{initial}</span>
      )}
    </div>
  );
}

export const BookmarkFolderWidget = memo(function BookmarkFolderWidget({
  item,
  onRemove: _onRemove,
  isEditing,
  onOpenFolder,
  isBatchMode,
  isSelected,
  onToggleSelect,
}: WidgetRendererProps) {
  const { setCurrentFolderId, gridItems } = useNewtabStore();
  const title = item.bookmarkFolder?.title || '文件夹';

  const folderRef = useRef<HTMLDivElement>(null);

  const thumbShortcuts = useMemo(() => {
    const children = gridItems
      .filter((i) => (i.parentId ?? null) === item.id && i.type === 'shortcut' && !!i.shortcut?.url)
      .sort((a, b) => a.position - b.position)
      .slice(0, 9);
    return children.map((c) => c.shortcut!);
  }, [gridItems, item.id]);

  useEffect(() => {
    const element = folderRef.current;
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

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isBatchMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect?.(item.id);
      return;
    }

    e.preventDefault();
    onOpenFolder?.(item.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 在批量编辑模式下，双击进入文件夹
    if (isBatchMode || isEditing) {
      if (onOpenFolder) {
        onOpenFolder(item.id);
      } else {
        setCurrentFolderId(item.id);
      }
      return;
    }
    if (onOpenFolder) {
      onOpenFolder(item.id);
    } else {
      setCurrentFolderId(item.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="group relative flex flex-col items-center justify-start h-full pt-2 px-2 rounded-xl transition-all duration-200 cursor-pointer w-full"
      aria-label={title}
    >
      <div
        ref={folderRef}
        className="relative liquid-glass-folder rounded-[12px] overflow-hidden hover:scale-110 active:scale-95 transition-all duration-200"
        style={{
          width: '56px',
          height: '56px',
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

        {thumbShortcuts.length > 0 ? (
          <div className="w-full h-full grid grid-cols-3 gap-0.5 content-start relative z-10">
            {thumbShortcuts.slice(0, 9).map((s, idx) => (
              <MiniIcon key={`${item.id}-thumb-${idx}`} shortcut={s} />
            ))}
            {Array.from({ length: Math.max(0, 9 - thumbShortcuts.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-[4px] bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative z-10">
            <Folder className="w-6 h-6 text-white/60" />
          </div>
        )}
      </div>

      <span 
        className="mt-1.5 text-xs text-white truncate max-w-full px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}
      >
        {title}
      </span>
    </button>
  );
});
