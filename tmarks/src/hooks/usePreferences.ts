import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preferencesService } from '@/services/preferences'
import type { UpdatePreferencesRequest, UserPreferences } from '@/lib/types'
import { ApiError } from '@/lib/api-client'
import { logger } from '@/lib/logger'

export const PREFERENCES_QUERY_KEY = 'preferences'
const PREFERENCES_STORAGE_KEY = 'tmarks:preferences'

// 从 localStorage 获取完整偏好设置
function getStoredPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    logger.error('Failed to parse stored preferences:', error)
  }
  
  return null
}

// 保存偏好设置到 localStorage
function saveStoredPreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return
  
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    logger.error('Failed to save preferences to localStorage:', error)
  }
}

// 从 localStorage 获取视图模式（向后兼容）
function getStoredViewMode(): 'list' | 'card' | 'minimal' | 'title' | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem('tmarks:view_mode')
  const validModes: string[] = ['list', 'card', 'minimal', 'title']
  return stored && validModes.includes(stored) ? (stored as 'list' | 'card' | 'minimal' | 'title') : null
}

// 默认偏好设置
function getDefaultPreferences(): UserPreferences {
  // 优先使用 localStorage 中的完整偏好设置
  const storedPreferences = getStoredPreferences()
  if (storedPreferences) {
    return storedPreferences
  }
  
  // 向后兼容：使用旧的视图模式存储
  const storedViewMode = getStoredViewMode()

  return {
    user_id: '',
    theme: 'light',
    page_size: 30,
    view_mode: storedViewMode || 'list',
    density: 'normal',
    tag_layout: 'grid',
    sort_by: 'popular',
    search_auto_clear_seconds: 15,
    tag_selection_auto_clear_seconds: 30,
    enable_search_auto_clear: true,
    enable_tag_selection_auto_clear: false,
    default_bookmark_icon: 'orbital-spinner',
    snapshot_retention_count: 5,
    snapshot_auto_create: false,
    snapshot_auto_dedupe: true,
    snapshot_auto_cleanup_days: 0,
    updated_at: new Date().toISOString(),
  }
}

/**
 * 获取用户偏好设置
 * 优先使用 localStorage，后台异步从服务器同步
 */
export function usePreferences() {
  return useQuery({
    queryKey: [PREFERENCES_QUERY_KEY],
    queryFn: async () => {
      // 1. 立即返回 localStorage 中的偏好设置
      const localPreferences = getDefaultPreferences()
      
      // 2. 后台异步从服务器获取最新设置
      try {
        const serverPreferences = await preferencesService.getPreferences()
        
        // 3. 如果服务器设置更新，保存到 localStorage
        if (serverPreferences.updated_at && serverPreferences.updated_at > localPreferences.updated_at) {
          saveStoredPreferences(serverPreferences)
          return serverPreferences
        }
      } catch (error) {
        // 服务器获取失败，使用本地设置
        if (error instanceof ApiError && error.status === 404) {
          logger.warn('Preferences API not found, using localStorage preferences')
        } else {
          logger.warn('Failed to fetch server preferences, using localStorage:', error)
        }
      }
      
      return localPreferences
    },
    // 减少重试次数,避免频繁请求不存在的接口
    retry: false,
    // 增加缓存时间,减少请求频率
    staleTime: 24 * 60 * 60 * 1000, // 24小时 (偏好很少变化)
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7天
    // 立即返回缓存数据，后台更新
    placeholderData: getDefaultPreferences(),
  })
}

/**
 * 更新用户偏好设置
 * 立即更新 localStorage，后台异步同步到服务器
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdatePreferencesRequest) => {
      // 1. 立即更新 localStorage
      const currentPreferences = getDefaultPreferences()
      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        ...data,
        updated_at: new Date().toISOString(),
      }
      saveStoredPreferences(updatedPreferences)
      
      // 2. 立即更新 React Query 缓存
      queryClient.setQueryData([PREFERENCES_QUERY_KEY], updatedPreferences)
      
      // 3. 后台异步同步到服务器
      try {
        return await preferencesService.updatePreferences(data)
      } catch (error) {
        // 服务器同步失败不影响本地使用
        logger.warn('Failed to sync preferences to server, but local changes are saved:', error)
        return updatedPreferences
      }
    },
    onSuccess: (serverPreferences) => {
      // 如果服务器返回了更新的设置，保存到 localStorage
      if (serverPreferences) {
        saveStoredPreferences(serverPreferences)
        queryClient.setQueryData([PREFERENCES_QUERY_KEY], serverPreferences)
      }
    },
    onError: (error) => {
      // 静默处理错误,不影响用户体验
      logger.warn('Preferences update error (local changes are still saved):', error)
    },
    // 失败时不重试,避免频繁请求
    retry: false,
  })
}
