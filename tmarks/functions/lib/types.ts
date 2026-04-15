export interface Env {
  DB: D1Database
  // TMARKS_KV?: KVNamespace // Unified cache (public sharing, rate limiting, etc.) - Removed
  SNAPSHOTS_BUCKET?: R2Bucket // R2 bucket for bookmark snapshots
  R2_PUBLIC_URL?: string // (Optional) Public URL for R2 storage for cover images (e.g. https://r2.example.com)
  R2_MAX_TOTAL_BYTES?: string // R2 total storage quota (bytes), optional; not configured or <= 0 means unlimited
  CORS_ALLOWED_ORIGINS?: string // CORS allowed origins list (comma-separated, e.g. https://example.com,https://app.example.com)
  ALLOW_REGISTRATION?: string
  JWT_SECRET: string
  ENCRYPTION_KEY: string
  ENVIRONMENT?: string // 'development' | 'production'
  JWT_ACCESS_TOKEN_EXPIRES_IN?: string
  JWT_REFRESH_TOKEN_EXPIRES_IN?: string
  CACHE_LEVEL?: string // '0' | '1' | '2' | '3' | 'none' | 'minimal' | 'standard' | 'aggressive'
  ENABLE_KV_CACHE?: string // 'true' | 'false'
  CACHE_TTL_DEFAULT_LIST?: string
  CACHE_TTL_TAG_FILTER?: string
  CACHE_TTL_SEARCH?: string
  CACHE_TTL_PUBLIC_SHARE?: string
  ENABLE_MEMORY_CACHE?: string // 'true' | 'false'
  MEMORY_CACHE_MAX_AGE?: string
  CACHE_DEBUG?: string // 'true' | 'false'
}
export interface User {
  id: string
  username: string
  email: string | null
  password_hash: string
  created_at: string
  updated_at: string
}
export interface Bookmark {
  id: string
  user_id: string
  title: string
  url: string
  description: string | null
  cover_image: string | null
  favicon: string | null
  is_pinned: boolean
  is_archived: boolean
  is_public: boolean
  click_count: number
  last_clicked_at: string | null
  has_snapshot?: boolean
  latest_snapshot_at?: string | null
  snapshot_count?: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
export interface BookmarkRow extends Omit<Bookmark, 'is_pinned' | 'is_archived' | 'is_public'> {
  is_pinned: number | boolean
  is_archived: number | boolean
  is_public: number | boolean
}
export interface PublicProfile {
  user_id: string
  public_share_enabled: boolean
  public_slug: string | null
  public_page_title: string | null
  public_page_description: string | null
  username: string
}
export interface Tag {
  id: string
  user_id: string
  name: string
  color: string | null
  click_count: number
  last_clicked_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
export interface ApiError {
  code: string
  message: string
  details?: unknown
}
export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
  meta?: {
    page?: number
    page_size?: number
    total?: number
    next_cursor?: string
  }
}
export type RouteParams = Record<string, string>
export type SQLParam = string | number | boolean | null
