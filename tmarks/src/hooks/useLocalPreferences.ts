import { useState, useEffect, useCallback } from 'react'
import type { UserPreferences } from '@/lib/types'
import { logger } from '@/lib/logger'

const PREFERENCES_STORAGE_KEY = 'tmarks:preferences'

// 默认偏好设置
const DEFAULT_PREFERENCES: Partial<UserPreferences> = {
  theme: 'light',
  page_size: 30,
  view_mode: 'list',
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
}

/**
 * 从 localStorage 加载偏好设置
 */
function loadPreferencesFromStorage(): Partial<UserPreferences> {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_PREFERENCES, ...parsed }
    }
  } catch (error) {
    logger.error('Failed to load preferences from localStorage:', error)
  }

  return DEFAULT_PREFERENCES
}

/**
 * 保存偏好设置到 localStorage
 */
function savePreferencesToStorage(preferences: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    logger.error('Failed to save preferences to localStorage:', error)
  }
}

/**
 * 使用本地偏好设置的 Hook
 * 优先使用 localStorage，后台异步同步到服务器
 */
export function useLocalPreferences() {
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>(loadPreferencesFromStorage)

  // 初始化时从 localStorage 加载
  useEffect(() => {
    const stored = loadPreferencesFromStorage()
    setPreferences(stored)
  }, [])

  // 更新偏好设置
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const newPreferences = { ...prev, ...updates }
      savePreferencesToStorage(newPreferences)
      return newPreferences
    })
  }, [])

  // 重置为默认值
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
    savePreferencesToStorage(DEFAULT_PREFERENCES)
  }, [])

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  }
}
