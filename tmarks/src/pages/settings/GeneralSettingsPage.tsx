import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, RotateCcw, Settings, Zap, Palette, Chrome, Key, Share2, Database, LogOut, BarChart3, Camera } from 'lucide-react'
import { usePreferences, useUpdatePreferences } from '@/hooks/usePreferences'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import type { UserPreferences } from '@/lib/types'
import { ApiError } from '@/lib/api-client'
import { SettingsTabs } from '@/components/settings/SettingsTabs'
import { BasicSettingsTab } from '@/components/settings/tabs/BasicSettingsTab'
import { AutomationSettingsTab } from '@/components/settings/tabs/AutomationSettingsTab'
import { AppearanceSettingsTab } from '@/components/settings/tabs/AppearanceSettingsTab'
import { BrowserSettingsTab } from '@/components/settings/tabs/BrowserSettingsTab'
import { ApiSettingsTab } from '@/components/settings/tabs/ApiSettingsTab'
import { ShareSettingsTab } from '@/components/settings/tabs/ShareSettingsTab'
import { DataSettingsTab } from '@/components/settings/tabs/DataSettingsTab'
import { BookmarkStatisticsPage } from '@/pages/bookmarks/BookmarkStatisticsPage'
import { SnapshotSettingsTab } from '@/components/settings/tabs/SnapshotSettingsTab'

export function GeneralSettingsPage() {
  const navigate = useNavigate()
  const { data: preferences, isLoading } = usePreferences()
  const updatePreferences = useUpdatePreferences()
  const { user, logout } = useAuthStore()
  const { addToast } = useToastStore()

  const [activeTab, setActiveTab] = useState('basic')
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null)

  // 从服务器加载设置
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences)
    }
  }, [preferences])

  const handleUpdate = (updates: Partial<UserPreferences>) => {
    if (localPreferences) {
      setLocalPreferences({ ...localPreferences, ...updates })
    }
  }

  const handleSave = async () => {
    if (!localPreferences) return

    try {
      await updatePreferences.mutateAsync({
        theme: localPreferences.theme,
        page_size: localPreferences.page_size,
        view_mode: localPreferences.view_mode,
        density: localPreferences.density,
        tag_layout: localPreferences.tag_layout,
        sort_by: localPreferences.sort_by,
        search_auto_clear_seconds: localPreferences.search_auto_clear_seconds,
        tag_selection_auto_clear_seconds: localPreferences.tag_selection_auto_clear_seconds,
        enable_search_auto_clear: localPreferences.enable_search_auto_clear,
        enable_tag_selection_auto_clear: localPreferences.enable_tag_selection_auto_clear,
        default_bookmark_icon: localPreferences.default_bookmark_icon,
        snapshot_retention_count: localPreferences.snapshot_retention_count,
        snapshot_auto_create: localPreferences.snapshot_auto_create,
        snapshot_auto_dedupe: localPreferences.snapshot_auto_dedupe,
        snapshot_auto_cleanup_days: localPreferences.snapshot_auto_cleanup_days,
      })
      addToast('success', '设置已保存')
    } catch (error) {
      let message = '保存失败'
      if (error instanceof ApiError && error.message) {
        message = `保存失败：${error.message}`
      }
      addToast('error', message)
    }
  }

  const handleReset = () => {
    if (preferences) {
      setLocalPreferences(preferences)
      addToast('info', '已重置为上次保存的设置')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch {
      addToast('error', '登出失败')
    }
  }

  if (isLoading || !localPreferences) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'basic', label: '基础', icon: <Settings className="w-4 h-4" /> },
    { id: 'automation', label: '自动化', icon: <Zap className="w-4 h-4" /> },
    { id: 'appearance', label: '外观', icon: <Palette className="w-4 h-4" /> },
    { id: 'snapshot', label: '快照', icon: <Camera className="w-4 h-4" /> },
    { id: 'browser', label: '浏览器', icon: <Chrome className="w-4 h-4" /> },
    { id: 'api', label: 'API', icon: <Key className="w-4 h-4" /> },
    { id: 'share', label: '分享', icon: <Share2 className="w-4 h-4" /> },
    { id: 'data', label: '数据', icon: <Database className="w-4 h-4" /> },
    { id: 'statistics', label: '数据分析', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* 页面标题卡片 */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">通用设置</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {user?.username && <span className="font-medium text-foreground">{user.username}</span>}
              {user?.username && ' · '}
              配置应用的通用行为和用户体验
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm sm:btn flex items-center gap-2 text-error hover:bg-error/10"
              title="登出账号"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">登出</span>
            </button>
            <button
              onClick={handleReset}
              className="btn btn-secondary btn-sm sm:btn flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">重置</span>
            </button>
            <button
              onClick={handleSave}
              disabled={updatePreferences.isPending}
              className="btn btn-primary btn-sm sm:btn flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{updatePreferences.isPending ? '保存中...' : '保存设置'}</span>
              <span className="sm:hidden">保存</span>
            </button>
          </div>
        </div>
      </div>

      {/* 标签页容器卡片 */}
      <div className="card p-3 sm:p-6">
        <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === 'basic' && (
            <BasicSettingsTab />
          )}

          {activeTab === 'automation' && (
            <AutomationSettingsTab
              searchEnabled={localPreferences.enable_search_auto_clear}
              searchSeconds={localPreferences.search_auto_clear_seconds}
              tagEnabled={localPreferences.enable_tag_selection_auto_clear}
              tagSeconds={localPreferences.tag_selection_auto_clear_seconds}
              onSearchEnabledChange={(enabled) => handleUpdate({ enable_search_auto_clear: enabled })}
              onSearchSecondsChange={(seconds) => handleUpdate({ search_auto_clear_seconds: seconds })}
              onTagEnabledChange={(enabled) => handleUpdate({ enable_tag_selection_auto_clear: enabled })}
              onTagSecondsChange={(seconds) => handleUpdate({ tag_selection_auto_clear_seconds: seconds })}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSettingsTab
              defaultIcon={localPreferences.default_bookmark_icon}
              onIconChange={(icon) => handleUpdate({ default_bookmark_icon: icon })}
            />
          )}

          {activeTab === 'snapshot' && (
            <SnapshotSettingsTab
              retentionCount={localPreferences.snapshot_retention_count}
              autoCreate={localPreferences.snapshot_auto_create}
              autoDedupe={localPreferences.snapshot_auto_dedupe}
              autoCleanupDays={localPreferences.snapshot_auto_cleanup_days}
              onRetentionCountChange={(count) => handleUpdate({ snapshot_retention_count: count })}
              onAutoCreateChange={(enabled) => handleUpdate({ snapshot_auto_create: enabled })}
              onAutoDedupeChange={(enabled) => handleUpdate({ snapshot_auto_dedupe: enabled })}
              onAutoCleanupDaysChange={(days) => handleUpdate({ snapshot_auto_cleanup_days: days })}
            />
          )}

          {activeTab === 'browser' && <BrowserSettingsTab />}

          {activeTab === 'api' && <ApiSettingsTab />}

          {activeTab === 'share' && <ShareSettingsTab />}

          {activeTab === 'data' && <DataSettingsTab />}

          {activeTab === 'statistics' && (
            <div className="-m-3 sm:-m-6">
              <BookmarkStatisticsPage embedded />
            </div>
          )}
        </SettingsTabs>
      </div>
    </div>
  )
}
