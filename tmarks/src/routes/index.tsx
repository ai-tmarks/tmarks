import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PublicAppShell } from '@/components/layout/PublicAppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { BookmarksPage } from '@/pages/bookmarks/BookmarksPage'
import { TabGroupsPage } from '@/pages/tab-groups/TabGroupsPage'
import { TabGroupDetailPage } from '@/pages/tab-groups/TabGroupDetailPage'
import { TrashPage } from '@/pages/tab-groups/TrashPage'
import { StatisticsPage } from '@/pages/tab-groups/StatisticsPage'
import { TodoPage } from '@/pages/tab-groups/TodoPage'
import { ApiKeysPage } from '@/pages/settings/ApiKeysPage'
import { ShareSettingsPage } from '@/pages/settings/ShareSettingsPage'
import { ImportExportPage } from '@/pages/settings/ImportExportPage'
import { PermissionsPage } from '@/pages/settings/PermissionsPage'
import { PublicSharePage } from '@/pages/share/PublicSharePage'
import { ExtensionPage } from '@/pages/extension/ExtensionPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 公开分享页面使用公开布局 */}
      <Route element={<PublicAppShell />}>
        <Route path="/share/:slug" element={<PublicSharePage />} />
      </Route>

      {/* 受保护的路由 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<BookmarksPage />} />
          <Route path="/tab" element={<TabGroupsPage />} />
          <Route path="/tab/todo" element={<TodoPage />} />
          <Route path="/tab/trash" element={<TrashPage />} />
          <Route path="/tab/statistics" element={<StatisticsPage />} />
          <Route path="/tab/:id" element={<TabGroupDetailPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/share-settings" element={<ShareSettingsPage />} />
          <Route path="/import-export" element={<ImportExportPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/extension" element={<ExtensionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
