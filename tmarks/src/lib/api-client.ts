import type { ApiResponse } from './types'
import { useAuthStore } from '@/stores/authStore'
import { logger } from '@/lib/logger'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeToRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

/**
 * HTTP 客户端
 */
class HttpClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getAuthToken(): string | null {
    return useAuthStore.getState().accessToken
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    let token = this.getAuthToken()

    const makeRequest = async (authToken: string) => {
      const headers = new Headers({
        'Content-Type': 'application/json',
        ...(options.headers && typeof options.headers === 'object' ? options.headers : {}),
      })

      if (authToken && !headers.get('Authorization')) {
        headers.set('Authorization', `Bearer ${authToken}`)
      }

      return fetch(url, {
        ...options,
        headers,
      })
    }

    const handle401Error = async () => {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const authStore = useAuthStore.getState()
          await authStore.refreshAccessToken()
          const newToken = authStore.accessToken
          if (newToken) {
            onRefreshed(newToken)
            return newToken
          } else {
            throw new Error('Failed to get new token after refresh')
          }
        } catch (error) {
          this.clearAuthAndRedirect()
          if (error instanceof Error) {
            logger.error('Token refresh failed:', error)
          }
          throw error
        } finally {
          isRefreshing = false
        }
      } else {
        // 等待刷新完成
        return new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Token refresh timeout'))
          }, 10000) // 10秒超时

          subscribeToRefresh((token: string) => {
            clearTimeout(timeout)
            resolve(token)
          })
        })
      }
    }

    try {
      let response = await makeRequest(token || '')

      // 处理 401 Unauthorized - 尝试刷新 token
      if (response.status === 401) {
        try {
          const newToken = await handle401Error()
          if (newToken) {
            token = newToken
            response = await makeRequest(newToken)
          }
        } catch {
          // 刷新失败，抛出原始的401错误
          const data = await response.json().catch(() => ({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }))
          const apiError = data.error || { code: 'UNAUTHORIZED', message: 'Unauthorized' }
          throw new ApiError(apiError.code, apiError.message, response.status)
        }
      }

      // 处理 204 No Content
      if (response.status === 204) {
        return { data: undefined as T }
      }

      const data = await response.json()

      if (!response.ok) {
        const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' }
        throw new ApiError(error.code, error.message, response.status)
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // 网络错误或其他错误
      throw new ApiError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network request failed',
        0
      )
    }
  }

  private clearAuthAndRedirect() {
    const { clearAuth } = useAuthStore.getState()
    clearAuth()

    // 重定向到登录页（避免无限循环，检查当前是否已在登录页）
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new HttpClient(API_BASE_URL)
