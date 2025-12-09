import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  User,
  Layers
} from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { ColorThemeSelector } from '@/components/common/ColorThemeSelector'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export function AppShell() {
  const { theme, colorTheme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

  // 判断当前是否在标签页组页面
  const isOnTabGroupsPage = location.pathname.startsWith('/tab')

  // 切换按钮点击处理
  const handleToggleView = () => {
    if (isOnTabGroupsPage) {
      navigate('/')
    } else {
      navigate('/tab')
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--background)'}} data-theme={theme} data-color-theme={colorTheme}>
      {/* 玻璃磨砂导航栏 */}
      <header className="h-16 sm:h-20 sticky top-0 z-50 backdrop-filter backdrop-blur-xl bg-card/80 border-b border-border/50 shadow-float flex items-center">
        <div className="w-full mx-auto px-3 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity duration-200 focus:outline-none"
            title="回到首页"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-float">
              <BookOpen
                className="w-5 h-5 sm:w-7 sm:h-7"
                style={{color: 'var(--foreground)'}}
              />
            </div>
            <div className="block text-left">
              <h1 className="text-lg sm:text-2xl font-bold" style={{color: 'var(--primary)'}}>
                TMarks
              </h1>
              <p className="text-xs font-medium hidden sm:block" style={{color: 'var(--muted-foreground)'}}>
                {isOnTabGroupsPage ? '管理收纳的标签页组' : '智能书签管理'}
              </p>
            </div>
          </button>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
            {/* 书签/标签页组切换按钮 */}
            <button
              onClick={handleToggleView}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:border-primary hover:bg-card/50 transition-all duration-200"
              style={{color: 'var(--foreground)'}}
              title={isOnTabGroupsPage ? '切换到书签' : '切换到标签页组'}
            >
              {isOnTabGroupsPage ? (
                <BookOpen className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </button>

            <ThemeToggle />
            <ColorThemeSelector />

            {/* 用户按钮 - 直接跳转到设置 */}
            {user && (
              <button
                onClick={() => navigate('/settings/general')}
                className="px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-card/50 transition-all duration-200 flex items-center justify-center gap-2"
                style={{color: 'var(--foreground)'}}
                title={`${user.username} - 点击进入设置`}
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 - 居中容器 */}
      <main className="w-full pb-16 sm:pb-6 pt-3 sm:pt-6 flex flex-col min-h-0 flex-1 bg-muted/30">
        <div className="mx-auto w-full px-3 sm:px-6" style={{ maxWidth: '1000px' }}>
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <MobileBottomNav />
    </div>
  )
}
