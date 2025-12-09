/**
 * TMarks API Types
 * 对应 API_DOCUMENTATION.md 的类型定义
 */

// ============ 基础类型 ============

export interface TMarksTag {
  id: string;
  name: string;
  color: string;
  bookmark_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TMarksBookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description?: string;
  cover_image?: string;
  favicon?: string;
  is_public: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  click_count: number;
  last_clicked_at?: string;
  created_at: string;
  updated_at: string;
  tags: TMarksTag[];
}

export interface TMarksUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
  stats: {
    total_bookmarks: number;
    pinned_bookmarks: number;
    archived_bookmarks: number;
    total_tags: number;
  };
}

// ============ 请求参数类型 ============

export interface GetBookmarksParams {
  keyword?: string;
  tags?: string; // 逗号分隔的 tag IDs
  page_size?: number;
  page_cursor?: string;
  sort?: 'created' | 'updated' | 'pinned';
  archived?: boolean;
  pinned?: boolean;
}

export interface CreateBookmarkInput {
  title: string;
  url: string;
  description?: string;
  cover_image?: string;
  favicon?: string;
  tag_ids?: string[];  // 兼容旧版：标签 ID 数组
  tags?: string[];     // 新版：标签名称数组（推荐，后端自动创建或链接）
  is_public?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface UpdateBookmarkInput {
  title?: string;
  url?: string;
  description?: string;
  cover_image?: string;
  favicon?: string;
  tag_ids?: string[];  // 兼容旧版：标签 ID 数组
  tags?: string[];     // 新版：标签名称数组（推荐，后端自动创建或链接）
  is_public?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}


export interface SearchParams {
  q: string;
  limit?: number;
}

// ============ 响应类型 ============

export interface PaginationMeta {
  page_size: number;
  count: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface GetBookmarksResponse {
  data: {
    bookmarks: TMarksBookmark[];
    meta: PaginationMeta;
  };
}

export interface CreateBookmarkResponse {
  data: {
    bookmark: TMarksBookmark;
  };
  meta?: {
    message?: string;
    code?: string;
  };
}

export interface GetBookmarkResponse {
  data: {
    bookmark: TMarksBookmark;
  };
}

export interface GetTagsResponse {
  data: {
    tags: TMarksTag[];
  };
}

export interface CreateTagResponse {
  data: {
    tag: TMarksTag;
  };
}

export interface GetTagResponse {
  data: {
    tag: TMarksTag;
  };
}

export interface GetUserResponse {
  data: {
    user: TMarksUser;
  };
}

export interface SearchResponse {
  data: {
    query: string;
    results: {
      bookmarks: TMarksBookmark[];
      tags: TMarksTag[];
    };
    meta: {
      bookmark_count: number;
      tag_count: number;
    };
  };
}


// ============ 错误类型 ============

export interface TMarksError {
  error: {
    code: string;
    message: string;
    details?: any;
    required?: string;
    available?: string[];
    retry_after?: number;
  };
}

// ============ 错误码常量 ============

export const ERROR_CODES = {
  // 认证错误
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 速率限制
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 请求错误
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',

  // 资源冲突
  DUPLICATE_URL: 'DUPLICATE_URL',
  DUPLICATE_TAG: 'DUPLICATE_TAG',

  // 服务器错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============ 速率限制 ============

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}
