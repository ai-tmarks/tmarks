import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  BookOpen,
  User,
  LogOut,
  Layers,
  Settings
} from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { ColorThemeSelector } from '@/components/common/ColorThemeSelector'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Footer } from '@/components/layout/Footer'

export function AppShell() {
  const { theme, colorTheme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 判断当前是否在标签页组页面
  const isOnTabGroupsPage = location.pathname.startsWith('/tab')

  // 切换按钮点击处理
  const handleToggleView = () => {
    if (isOnTabGroupsPage) {
      navigate('/bookmarks')
    } else {
      navigate('/tab')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

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

            {/* 用户菜单 */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-card/50 transition-all duration-200 flex items-center justify-center gap-2"
                  style={{color: 'var(--foreground)'}}
                  title={user.username}
                >
                  <User className="w-5 h-5" />
                </button>

                {/* 下拉菜单 */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border border-border overflow-hidden z-50"
                       style={{backgroundColor: 'var(--card)'}}>
                    <button
                      onClick={() => {
                        navigate('/settings/general')
                        setIsUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors duration-200"
                      style={{color: 'var(--foreground)'}}
                    >
                      <Settings className="w-4 h-4" />
                      <span>通用设置</span>
                    </button>
                    <div className="border-t border-border"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors duration-200 text-error"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>登出</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="w-full px-3 sm:px-6 pb-16 sm:pb-0 flex flex-col min-h-0 flex-1">
        <div className="mx-auto flex-1" style={{ maxWidth: '100%' }}>
          <Outlet />
        </div>
        <Footer />
      </main>

      {/* 移动端底部导航 */}
      <MobileBottomNav />
    </div>
  )
}
