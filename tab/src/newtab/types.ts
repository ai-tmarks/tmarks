/**
 * NewTab 类型定义
 */

// 快捷方式分组（左侧导航）
export interface ShortcutGroup {
  id: string;
  name: string;
  icon: string; // Lucide 图标名称
  position: number;
  bookmarkFolderId?: string | null;
}

// 快捷方式文件夹（可包含多个快捷方式）
export interface ShortcutFolder {
  id: string;
  name: string;
  icon?: string; // 可选图标，默认显示文件夹图标
  position: number;
  groupId?: string; // 所属分组
  createdAt: number;
}

// 网格项尺寸
export type GridItemSize = '1x1' | '2x1' | '1x2' | '2x2' | '2x3' | '2x4';

// 网格项类型
export type GridItemType = 
  | 'shortcut' 
  | 'bookmarkFolder'
  | 'weather' 
  | 'clock' 
  | 'todo' 
  | 'notes' 
  | 'hotsearch' 
  | 'poetry';

// 组件配置类型
export interface WidgetConfig {
  weather?: {
    city?: string;
    unit?: 'C' | 'F';
    showForecast?: boolean;
    autoLocation?: boolean;
  };
  clock?: {
    format?: ClockFormat;
    showDate?: boolean;
    showSeconds?: boolean;
    showLunar?: boolean;
  };
  todo?: {
    showCompleted?: boolean;
  };
  notes?: {
    content?: string;
  };
  hotsearch?: {
    type?: HotSearchType;
  };
  poetry?: {
    autoRefresh?: boolean;
  };
}

// 统一网格项类型
export interface GridItem {
  id: string;
  type: GridItemType;
  size: GridItemSize;
  position: number;
  groupId?: string;
  parentId?: string | null;
  browserBookmarkId?: string;
  tmarksBookmarkId?: string; // TMarks 服务器书签 ID，用于同步
  // 快捷方式数据（仅 type='shortcut' 时使用）
  shortcut?: {
    url: string;
    title: string;
    favicon?: string;
    faviconBase64?: string; // 离线缓存的 base64 图标
  };
  bookmarkFolder?: {
    title: string;
  };
  // 组件配置（非快捷方式时使用）
  config?: WidgetConfig;
  createdAt: number;
}

// 快捷方式（保持向后兼容）
export interface Shortcut {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  faviconBase64?: string; // 离线缓存的 base64 图标
  position: number;
  createdAt: number;
  clickCount: number;
  groupId?: string; // 所属分组 ID，undefined 表示默认分组
  folderId?: string; // 所属文件夹 ID，undefined 表示不在文件夹内
}

// 壁纸类型
export type WallpaperType = 'color' | 'image' | 'bing' | 'unsplash';

// Bing 壁纸信息
export interface BingWallpaperInfo {
  url: string;
  title: string;
  copyright: string;
  date: string;
}

// 壁纸配置
export interface WallpaperConfig {
  type: WallpaperType;
  value: string; // 颜色值或图片 URL
  blur: number;
  brightness: number;
  bingHistoryIndex?: number; // Bing 历史图片索引 (0-7)
  showBingInfo?: boolean; // 是否显示 Bing 图片信息
}

// 搜索引擎
export type SearchEngine = 'google' | 'bing' | 'baidu' | 'duckduckgo' | 'sogou' | 'zhihu' | 'bilibili' | 'github';

// 搜索引擎配置
export interface SearchEngineConfig {
  id: SearchEngine;
  name: string;
  url: string;
  icon: string;
}

// 时钟格式
export type ClockFormat = '12h' | '24h';

// NewTab 设置
export interface NewTabSettings {
  // 时钟
  showClock: boolean;
  clockFormat: ClockFormat;
  showDate: boolean;
  showSeconds: boolean;
  
  // 搜索
  showSearch: boolean;
  searchEngine: SearchEngine;
  
  // 快捷方式
  showShortcuts: boolean;
  shortcutColumns: 6 | 8 | 10;
  shortcutStyle: 'icon' | 'card';
  
  // 壁纸
  wallpaper: WallpaperConfig;
  
  // TMarks 同步
  showPinnedBookmarks: boolean;
  enableSearchSuggestions: boolean;
  autoRefreshPinnedBookmarks: boolean; // 自动刷新置顶书签
  pinnedBookmarksRefreshTime: 'morning' | 'evening'; // 刷新时间：早上或晚上

  // 问候语
  showGreeting: boolean;
  userName: string;

  // 农历
  showLunar: boolean;

  // 每日诗词
  showPoetry: boolean;
  
  // 热搜类型（用于网格组件配置）
  hotSearchType: HotSearchType;

  enableWorkspaceAiOrganize?: boolean;
  workspaceAiOrganizeRules?: string;
  workspaceAiOrganizeMaxBookmarks?: number;
  enableHistoryHeat?: boolean;
  historyDays?: number;
  historyHeatTopN?: number;
  workspaceAiOrganizeStrictHierarchy?: boolean;
  workspaceAiOrganizeAllowNewFolders?: boolean;
  workspaceAiOrganizePreferOriginalPaths?: boolean;
  workspaceAiOrganizeVerboseLogs?: boolean;
  workspaceAiOrganizeTopLevelCount?: number;

  enableWorkspaceAiOrganizeCustomPrompt?: boolean;
  workspaceAiOrganizePrompt?: string;

  showEditGuide?: boolean;


}

// NewTab 存储数据
export interface NewTabStorage {
  shortcuts: Shortcut[];
  shortcutGroups: ShortcutGroup[];
  shortcutFolders?: ShortcutFolder[]; // 文件夹列表
  activeGroupId: string | null; // 当前激活的分组，null 表示全部
  settings: NewTabSettings;
  tmarksSyncedAt?: number;
  // 新版网格项数据
  gridItems?: GridItem[];
}

// 组件尺寸配置
export interface WidgetSizeConfig {
  type: GridItemType;
  defaultSize: GridItemSize;
  allowedSizes: GridItemSize[];
  minWidth: number; // 最小列数
  minHeight: number; // 最小行数
}

// 组件元数据
export interface WidgetMeta {
  type: GridItemType;
  name: string;
  icon: string;
  description: string;
  sizeConfig: WidgetSizeConfig;
}

// 搜索结果
export interface SearchResult {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  source: 'shortcut' | 'bookmark';
}

// TMarks 书签（用于同步）
export interface TMarksBookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  is_pinned?: boolean;
}

// 同步状态
export interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  error: string | null;
}

// 待办事项
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

// 天气数据
export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  city: string;
  updatedAt: number;
}

// 备忘录
export interface NoteData {
  content: string;
  updatedAt: number;
}

// 热搜项
export interface HotSearchItem {
  title: string;
  hot: number | string;
  url: string;
}

// 热搜类型
export type HotSearchType = 'baidu' | 'weibo' | 'zhihu' | 'bilibili';

// 诗词
export interface Poetry {
  content: string;
  author: string;
  title: string;
}
