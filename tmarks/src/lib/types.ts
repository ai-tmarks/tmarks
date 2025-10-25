// API 响应类型
export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
  meta?: {
    page?: number
    page_size?: number
    total?: number
    next_cursor?: string
    count?: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

// 用户类型
export interface User {
  id: string
  username: string
  email: string | null
  role?: 'user' | 'admin'
  created_at?: string
}

// 认证相关
export interface LoginRequest {
  username: string
  password: string
  remember_me?: boolean
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
}

export interface RegisterResponse {
  user: User
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

// 书签类型
export interface Bookmark {
  id: string
  user_id: string
  title: string
  url: string
  description: string | null
  cover_image: string | null
  is_pinned: boolean
  is_archived: boolean
  is_public: boolean
  click_count: number
  last_clicked_at: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface CreateBookmarkRequest {
  title: string
  url: string
  description?: string
  cover_image?: string
  tag_ids?: string[]
  is_pinned?: boolean
  is_archived?: boolean
  is_public?: boolean
}

export interface UpdateBookmarkRequest {
  title?: string
  url?: string
  description?: string | null
  cover_image?: string | null
  tag_ids?: string[]
  is_pinned?: boolean
  is_archived?: boolean
  is_public?: boolean
}

export interface BookmarksResponse {
  bookmarks: Bookmark[]
  meta: {
    page_size: number
    count: number
    next_cursor?: string
    has_more: boolean
  }
}

// 标签类型
export interface Tag {
  id: string
  user_id?: string
  name: string
  color: string | null
  bookmark_count?: number
  created_at?: string
  updated_at?: string
}

export interface CreateTagRequest {
  name: string
  color?: string
}

export interface UpdateTagRequest {
  name?: string
  color?: string | null
}

export interface TagsResponse {
  tags: Tag[]
}

// 用户偏好类型
export type TagLayoutPreference = 'grid' | 'masonry'

export interface UserPreferences {
  theme: 'light' | 'dark'
  page_size: number
  view_mode: 'list' | 'card' | 'minimal' | 'title'
  density: 'compact' | 'normal' | 'comfortable'
  tag_layout: TagLayoutPreference
  updated_at: string
}

export interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark'
  page_size?: number
  view_mode?: 'list' | 'card' | 'minimal' | 'title'
  density?: 'compact' | 'normal' | 'comfortable'
  tag_layout?: TagLayoutPreference
}

export interface PreferencesResponse {
  preferences: UserPreferences
}

export interface ShareSettings {
  enabled: boolean
  slug: string | null
  title: string | null
  description: string | null
}

export interface ShareSettingsResponse {
  share: ShareSettings
}

export interface UpdateShareSettingsRequest {
  enabled?: boolean
  slug?: string | null
  title?: string | null
  description?: string | null
  regenerate_slug?: boolean
}

export interface PublicSharePayload {
  profile: {
    username: string
    title: string | null
    description: string | null
    slug: string
  }
  bookmarks: Bookmark[]
  tags: Array<Tag & { bookmark_count: number }>
  generated_at: string
}

export interface PublicSharePaginatedPayload {
  profile: {
    username: string
    title: string | null
    description: string | null
    slug: string
  }
  bookmarks: Bookmark[]
  tags: Array<Tag & { bookmark_count: number }>
  meta: {
    page_size: number
    count: number
    next_cursor: string | null
    has_more: boolean
  }
}

// 查询参数
export interface BookmarkQueryParams {
  keyword?: string
  tags?: string // 逗号分隔的标签ID
  page_size?: number
  page_cursor?: string
  sort?: 'created' | 'updated' | 'pinned' | 'popular'
  archived?: boolean
  pinned?: boolean
}

export interface TagQueryParams {
  sort?: 'usage' | 'name'
}

// 批量操作类型
export type BatchActionType = 'delete' | 'update_tags' | 'pin' | 'unpin' | 'archive' | 'unarchive'

export interface BatchActionRequest {
  action: BatchActionType
  bookmark_ids: string[]
  add_tag_ids?: string[]
  remove_tag_ids?: string[]
}

export interface BatchActionResponse {
  success: boolean
  affected_count: number
  errors?: Array<{ bookmark_id: string; message: string }>
}

// 标签页组类型
export interface TabGroup {
  id: string
  user_id: string
  title: string
  color: string | null
  tags: string[] | null
  parent_id: string | null
  is_folder: number
  is_deleted: number
  deleted_at: string | null
  position: number
  created_at: string
  updated_at: string
  items?: TabGroupItem[]
  item_count?: number
  children?: TabGroup[]
}

export interface TabGroupItem {
  id: string
  group_id: string
  title: string
  url: string
  favicon: string | null
  position: number
  created_at: string
  is_pinned?: number
  is_todo?: number
  is_archived?: number
}

export interface CreateTabGroupRequest {
  title?: string // Optional, will auto-generate if not provided
  parent_id?: string | null
  is_folder?: boolean
  items?: Array<{
    title: string
    url: string
    favicon?: string
  }>
}

export interface UpdateTabGroupRequest {
  title?: string
  color?: string | null
  tags?: string[] | null
  parent_id?: string | null
  position?: number
}

export interface TabGroupsResponse {
  tab_groups: TabGroup[]
  meta?: {
    page_size?: number
    count: number
    next_cursor?: string
    has_more?: boolean
  }
}

export interface TabGroupResponse {
  tab_group: TabGroup
}

// 分享类型
export interface Share {
  id: string
  group_id: string
  user_id: string
  share_token: string
  is_public: number
  view_count: number
  created_at: string
  expires_at: string | null
}

export interface ShareResponse {
  share: Share
  share_url: string
}

// 统计类型
export interface StatisticsSummary {
  total_groups: number
  total_deleted_groups: number
  total_items: number
  total_shares: number
}

export interface TrendData {
  date: string
  count: number
}

export interface DomainCount {
  domain: string
  count: number
}

export interface GroupSizeDistribution {
  range: string
  count: number
}

export interface StatisticsResponse {
  summary: StatisticsSummary
  trends: {
    groups: TrendData[]
    items: TrendData[]
  }
  top_domains: DomainCount[]
  group_size_distribution: GroupSizeDistribution[]
}
