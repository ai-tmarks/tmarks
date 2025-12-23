/**
 * NewTab 主组件
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Plus, Edit, FolderPlus } from 'lucide-react';
import { useNewtabStore } from './hooks/useNewtabStore';
import { Clock } from './components/Clock';
import { SearchBar } from './components/SearchBar';
import { WidgetGrid } from './components/WidgetGrid';
import { Wallpaper } from './components/Wallpaper';
import { DockBar } from './components/DockBar';
import { Greeting } from './components/Greeting';
import { LunarDate } from './components/LunarDate';
import { Poetry } from './components/Poetry';
import { GroupSidebar } from './components/GroupSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { AddShortcutModal } from './components/AddShortcutModal';
import { AddBookmarkFolderModal } from './components/AddBookmarkFolderModal';
import { BatchEditModal } from './components/BatchEditModal';
import { BatchEditTip } from './components/BatchEditTip';
import { ShortcutContextMenu } from './components/ShortcutContextMenu';
import { FAVICON_API } from './constants';
import { useBrowserBookmarksSync } from './features/browser-sync';

export function NewTab() {
  const { settings, isLoading, loadData, updateSettings, shortcutGroups, activeGroupId, setActiveGroup, addGridItem } = useNewtabStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [showBatchEditTip, setShowBatchEditTip] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isWheelLocked = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // 使用 ref 存储最新的状态，避免 handleWheel 频繁重建
  const stateRef = useRef({ shortcutGroups, activeGroupId, setActiveGroup });
  stateRef.current = { shortcutGroups, activeGroupId, setActiveGroup };

  useBrowserBookmarksSync();

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 滚轮切换分组 - 使用稳定的回调，通过 ref 访问最新状态
  // 页面分三区：左30%和右30%切换分组，中间40%切换图标翻页
  const handleWheel = useCallback((e: WheelEvent) => {
    const { shortcutGroups: groups, activeGroupId: currentGroupId, setActiveGroup: setGroup } = stateRef.current;
    
    // 如果正在锁定中，忽略滚轮事件
    if (isWheelLocked.current) {
      return;
    }
    
    // 检查是否在可滚动元素内（弹窗等）
    const target = e.target as HTMLElement;
    const scrollableParent = target.closest('.overflow-y-auto, .overflow-auto');
    if (scrollableParent) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
      if (scrollHeight > clientHeight) {
        if (e.deltaY < 0 && scrollTop > 0) return;
        if (e.deltaY > 0 && scrollTop + clientHeight < scrollHeight) return;
      }
    }

    // 根据鼠标位置判断区域：左30% | 中间40% | 右30%
    const mouseX = e.clientX;
    const windowWidth = window.innerWidth;
    const leftBoundary = windowWidth * 0.3;
    const rightBoundary = windowWidth * 0.7;
    
    // 中间 40% 区域：让 WidgetGrid 处理图标翻页，不在这里处理
    if (mouseX >= leftBoundary && mouseX <= rightBoundary) {
      // 中间区域不切换分组，交给 WidgetGrid 的 handleWheel 处理
      return;
    }

    // 左30% 或 右30% 区域：切换分组
    const groupIds = groups.map(g => g.id);
    if (groupIds.length === 0) return;
    
    const currentIndex = groupIds.indexOf(currentGroupId || '');
    
    if (currentIndex === -1) {
      setGroup(groupIds[0]);
      return;
    }
    
    let newIndex = currentIndex;
    if (e.deltaY > 0) {
      // 向下滚动，切换到下一个分组
      newIndex = Math.min(currentIndex + 1, groupIds.length - 1);
    } else if (e.deltaY < 0) {
      // 向上滚动，切换到上一个分组
      newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
      e.preventDefault();
      setGroup(groupIds[newIndex]);
      isWheelLocked.current = true;
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        isWheelLocked.current = false;
      }, 300);
    }
  }, []); // 空依赖数组，handleWheel 永远不会重建

  // 右键菜单处理
  const handleContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // 排除设置面板、弹窗等区域
    const isInModal = target.closest('[role="dialog"]') || target.closest('.glass-modal') || target.closest('.glass-modal-dark');
    // 排除输入框
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    if (!isInModal && !isInput) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, []);

  // 长按 2 秒切换编辑模式
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartPosRef.current = null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // 仅左键
    const target = e.target as HTMLElement;
    // 排除设置面板、弹窗、输入框、按钮等交互元素
    const isInModal = target.closest('[role="dialog"]') || target.closest('.glass-modal') || target.closest('.glass-modal-dark');
    const isInteractive = target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea');
    const isShortcutItem = target.closest('[data-shortcut-item]');
    
    if (isInModal || isInteractive || isShortcutItem) return;
    
    clearLongPress();
    longPressStartPosRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      setIsEditing((prev) => !prev);
      clearLongPress();
    }, 2000);
  }, [clearLongPress]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!longPressStartPosRef.current) return;
    const dx = e.clientX - longPressStartPosRef.current.x;
    const dy = e.clientY - longPressStartPosRef.current.y;
    if (Math.hypot(dx, dy) > 10) {
      clearLongPress();
    }
  }, [clearLongPress]);

  const handlePointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  // 监听滚轮事件
  useEffect(() => {
    if (!settings.showShortcuts) return;
    
    // 移除 passive: true，允许阻止默认行为
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [handleWheel, settings.showShortcuts]);

  // 监听右键菜单事件
  useEffect(() => {
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleContextMenu]);

  // 壁纸刷新回调
  const handleWallpaperRefresh = useCallback(() => {
    // 壁纸刷新后的回调，可以在这里添加提示等
    console.log('Wallpaper refreshed');
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 壁纸背景 */}
      <Wallpaper config={settings.wallpaper} onRefresh={handleWallpaperRefresh} />



      {/* 主内容 - 参考 mtab 布局，内容偏上 */}
      <div className="relative z-10 w-full h-full flex flex-col items-center px-4 pt-[12vh] pb-8 overflow-y-auto">
        {/* 问候语 */}
        {settings.showGreeting && (
          <div className="mb-1 animate-fadeIn">
            <Greeting userName={settings.userName} />
          </div>
        )}

        {/* 时钟（包含日期和农历） */}
        {settings.showClock && (
          <div className="mb-3 animate-fadeIn">
            <Clock
              format={settings.clockFormat}
              showDate={settings.showDate}
              showSeconds={settings.showSeconds}
              showLunar={settings.showLunar}
            />
          </div>
        )}

        {/* 独立农历显示（仅当时钟关闭但农历开启时） */}
        {!settings.showClock && settings.showLunar && (
          <div className="mb-3 animate-fadeIn">
            <LunarDate />
          </div>
        )}

        {/* 每日诗词 */}
        {settings.showPoetry && (
          <div className="mb-6 animate-fadeIn">
            <Poetry />
          </div>
        )}

        {/* 搜索框 - 提高层级确保下拉框不被遮挡 */}
        {settings.showSearch && (
          <div className="w-full max-w-2xl mb-6 animate-fadeIn px-4 relative z-50">
            <SearchBar
              engine={settings.searchEngine}
              enableSuggestions={settings.enableSearchSuggestions}
              onEngineChange={(engine) => updateSettings({ searchEngine: engine })}
            />
          </div>
        )}

        {/* 快捷方式网格 + 添加按钮 */}
        {settings.showShortcuts && (
          <div className="w-full max-w-5xl animate-fadeIn px-4 shortcut-area">
            <div className="flex items-start gap-4">
              <WidgetGrid
                columns={settings.shortcutColumns}
                isBatchMode={showBatchEdit}
                batchSelectedIds={batchSelectedIds}
                onBatchSelectedIdsChange={setBatchSelectedIds}
                isEditing={isEditing}
                onEditingChange={setIsEditing}
              />
            </div>
          </div>
        )}

      </div>

      {/* 左侧分组侧边栏 */}
      <GroupSidebar onOpenSettings={() => setShowSettings(true)} />

      {/* 底部 Dock 栏 - 置顶书签 */}
      {settings.showPinnedBookmarks && <DockBar />}

      {/* 设置面板 - 在顶层渲染避免被父容器限制 */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* 添加快捷方式弹窗 */}
      {showAddModal && (
        <AddShortcutModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={(url, title) => {
            const domain = new URL(url).hostname;
            addGridItem('shortcut', {
              groupId: activeGroupId || undefined,
              shortcut: {
                url,
                title,
                favicon: `${FAVICON_API}${domain}&sz=64`,
              },
            });
          }}
          groupName={
            activeGroupId
              ? shortcutGroups.find((g) => g.id === activeGroupId)?.name
              : undefined
          }
        />
      )}

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEdit}
        onClose={() => {
          setShowBatchEdit(false);
          setBatchSelectedIds(new Set());
        }}
        selectedIds={batchSelectedIds}
        onSelectedIdsChange={setBatchSelectedIds}
      />

      {/* 批量编辑提示 */}
      <BatchEditTip
        isOpen={showBatchEditTip}
        onClose={() => setShowBatchEditTip(false)}
      />

      {/* 添加文件夹弹窗 */}
      <AddBookmarkFolderModal
        isOpen={showAddFolderModal}
        onClose={() => setShowAddFolderModal(false)}
        onSave={(name) =>
          addGridItem('bookmarkFolder', {
            groupId: activeGroupId ?? undefined,
            bookmarkFolder: { title: name },
          })
        }
      />

      {/* 右键菜单 */}
      {contextMenu && (
        <ShortcutContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: '添加快捷方式',
              icon: <Plus className="w-4 h-4" />,
              onClick: () => setShowAddModal(true),
            },
            {
              label: '添加文件夹',
              icon: <FolderPlus className="w-4 h-4" />,
              onClick: () => setShowAddFolderModal(true),
            },
            {
              label: '批量编辑',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => {
                setBatchSelectedIds(new Set());
                setShowBatchEdit(true);
                setShowBatchEditTip(true);
              },
              divider: true,
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
