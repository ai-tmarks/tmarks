// ============ Database Models ============

export interface Tag {
  id?: number;
  name: string;
  color?: string;
  count?: number;
  createdAt: number;
}

export interface Bookmark {
  id?: number;
  url: string;
  title: string;
  description?: string;
  tags: string[];
  createdAt: number;
  remoteId?: string;
  isPublic?: boolean;
}

export interface Metadata {
  key: string;
  value: unknown;
  updatedAt: number;
}

// ============ Configuration Models ============

export type AIProvider = 'openai' | 'claude' | 'deepseek' | 'zhipu' | 'modelscope' | 'siliconflow' | 'iflow' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKeys: {
    openai?: string;
    claude?: string;
    deepseek?: string;
    zhipu?: string;
    modelscope?: string;
    siliconflow?: string;
    iflow?: string;
    custom?: string;
  };
  apiUrls?: {
    openai?: string;
    claude?: string;
    deepseek?: string;
    zhipu?: string;
    modelscope?: string;
    siliconflow?: string;
    iflow?: string;
    custom?: string;
  };
  model?: string;
  customPrompt?: string;
  enableCustomPrompt?: boolean;
  savedConnections?: Partial<Record<AIProvider, AIConnectionInfo[]>>;
}

export interface BookmarkSiteConfig {
  apiUrl: string;
  apiKey: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  autoSync: boolean;
  syncInterval: number;
  maxSuggestedTags: number;
  defaultVisibility: 'public' | 'private';
  enableAI: boolean; // 是否启用 AI 标签推荐
  defaultIncludeThumbnail: boolean; // 默认是否包含封面图
  defaultCreateSnapshot: boolean; // 默认是否创建快照
}

export interface AIConnectionInfo {
  id?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  label?: string;
  provider?: AIProvider;
  lastUsedAt?: number;
}

export interface StorageConfig {
  aiConfig: AIConfig;
  bookmarkSite: BookmarkSiteConfig;
  preferences: UserPreferences;
}

// ============ Page Info ============

export interface PageInfo {
  title: string;
  url: string;
  description?: string;
  content?: string;
  thumbnail?: string;
  thumbnails?: string[];
  favicon?: string;
}

// ============ AI Request/Response ============

export interface AIRequest {
  page: PageInfo;
  context: {
    existingTags: string[];
    recentBookmarks: Array<{
      title: string;
      tags: string[];
    }>;
  };
  options: {
    maxTags: number;
    preferExisting: boolean;
  };
}

export interface TagSuggestion {
  name: string;
  isNew: boolean;
  confidence: number;
}

export interface AIResponse {
  suggestedTags: TagSuggestion[];
  reasoning?: string;
  translatedTitle?: string;
  translatedDescription?: string;
}

// ============ Bookmark Site API ============

export interface APIResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

export interface TagsAPIResponse {
  tags: Array<{
    id: string;
    name: string;
    color?: string;
    count?: number;
    createdAt: string;
  }>;
  total: number;
}

export interface BookmarksAPIResponse {
  bookmarks: Array<{
    id: string;
    url: string;
    title: string;
    description?: string;
    tags: string[];
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface BookmarkInput {
  url: string;
  title: string;
  description?: string;
  tags: string[];
  thumbnail?: string;
  favicon?: string;
  isPublic?: boolean;
  createSnapshot?: boolean;
}

// ============ Service Results ============

export interface SyncResult {
  success: boolean;
  duration?: number;
  stats?: {
    tags: number;
    bookmarks: number;
  };
  error?: string;
}

export interface SaveResult {
  success: boolean;
  bookmarkId?: string;
  existingBookmark?: {
    id: string;
    title: string;
    url: string;
    tags: Array<{ id: string; name: string; color: string | null }>;
    has_snapshot?: boolean;
    snapshot_count?: number;
    created_at: string;
    needsDialog?: boolean;
  };
  offline?: boolean;
  message?: string;
  error?: string;
}

export interface RecommendationResult {
  tags: TagSuggestion[];
  source: 'ai' | 'fallback';
  timestamp: number;
  message?: string | null;
}

// ============ Error Types ============

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_KEY_INVALID = 'API_KEY_INVALID',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  BOOKMARK_SITE_ERROR = 'BOOKMARK_SITE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============ Message Types (for chrome.runtime.messaging) ============

export type MessageType =
  | 'EXTRACT_PAGE_INFO'
  | 'RECOMMEND_TAGS'
  | 'CREATE_SNAPSHOT'
  | 'SAVE_BOOKMARK'
  | 'SYNC_CACHE'
  | 'GET_CONFIG'
  | 'GET_EXISTING_TAGS'
  | 'UPDATE_BOOKMARK_TAGS'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_PAGE_V2'
  | 'PING';

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
  options?: any; // For CAPTURE_PAGE options
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  html?: string; // For CAPTURE_PAGE response
  size?: number; // For CAPTURE_PAGE response
}

// ============ Tab Groups (OneTab-like feature) ============

export interface TabGroup {
  id?: number;
  title: string;
  createdAt: number;
  remoteId?: string;
  itemCount?: number;
}

export interface TabGroupItem {
  id?: number;
  groupId: number;
  title: string;
  url: string;
  favicon?: string;
  position: number;
  createdAt: number;
}

export interface TabGroupInput {
  title?: string;
  items: Array<{
    title: string;
    url: string;
    favicon?: string;
  }>;
}

export interface TabGroupResult {
  success: boolean;
  groupId?: string;
  offline?: boolean;
  message?: string;
  error?: string;
}
