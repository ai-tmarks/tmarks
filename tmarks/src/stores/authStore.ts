import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { User } from '@/lib/types'
import { authService } from '@/services/auth'
import { logger } from '@/lib/logger'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: (revokeAll?: boolean) => Promise<void>
  refreshAccessToken: () => Promise<void>
  setUser: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string, rememberMe = false) => {
        set({ isLoading: true })
        try {
          const data = await authService.login({ username, password, remember_me: rememberMe })

          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (username: string, password: string, email?: string) => {
        set({ isLoading: true })
        try {
          await authService.register({ username, password, email })
          set({ isLoading: false })
          // 注册成功后不自动登录，让用户手动登录
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async (revokeAll = false) => {
        const { refreshToken, accessToken } = get()

        // 只有在有有效 token 时才调用 API
        if (refreshToken && accessToken) {
          try {
            await authService.logout(refreshToken, revokeAll)
          } catch (error) {
            // 如果是 401 错误（token 已过期），静默处理
            // 其他错误则记录日志
            if (error instanceof Error && !error.message.includes('Token expired')) {
              logger.error('Logout error:', error)
            }
          }
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const data = await authService.refreshToken({ refresh_token: refreshToken })

          set({
            user: data.user,
            accessToken: data.access_token,
            isAuthenticated: true,
          })
        } catch (error) {
          // 刷新失败，清除认证状态
          get().clearAuth()
          throw error
        }
      },

      setUser: (user: User) => {
        set({ user })
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
