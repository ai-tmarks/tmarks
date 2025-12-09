/**
 * TMarks API 基础客户端
 * 处理 HTTP 请求、认证、错误处理、速率限制
 */

import type { TMarksError, RateLimitInfo } from './types';

export interface TMarksClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TMarksAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'TMarksAPIError';
  }

  // 便捷方法检查错误类型
  isAuthError(): boolean {
    return [
      'MISSING_API_KEY',
      'INVALID_API_KEY',
      'INSUFFICIENT_PERMISSIONS'
    ].includes(this.code);
  }

  isRateLimitError(): boolean {
    return this.code === 'RATE_LIMIT_EXCEEDED';
  }

  isNotFoundError(): boolean {
    return this.code === 'NOT_FOUND';
  }

  isDuplicateError(): boolean {
    return ['DUPLICATE_URL', 'DUPLICATE_TAG'].includes(this.code);
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

export class TMarksClient {
  private apiKey: string;
  private baseUrl: string;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: TMarksClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://tmarks.669696.xyz/api';
  }

  /**
   * 获取速率限制信息
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * 检查是否接近速率限制
   */
  isNearRateLimit(threshold: number = 0.2): boolean {
    if (!this.rateLimitInfo) return false;
    return this.rateLimitInfo.remaining / this.rateLimitInfo.limit < threshold;
  }

  /**
   * 获取速率限制重置时间
   */
  getRateLimitResetTime(): Date | null {
    if (!this.rateLimitInfo) return null;
    return new Date(this.rateLimitInfo.reset * 1000);
  }

  /**
   * 发起 HTTP 请求
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    console.log('[TMarksClient] 发起请求:', {
      url,
      method: options.method || 'GET',
      hasApiKey: !!this.apiKey,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'none'
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('[TMarksClient] 响应状态:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // 提取速率限制信息
      this.extractRateLimitInfo(response);

      // 处理 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // 尝试解析响应
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // 非 JSON 响应，尝试读取文本
        const text = await response.text();
        console.error('[TMarksClient] 非 JSON 响应:', { status: response.status, text: text.substring(0, 200) });
        
        if (!response.ok) {
          throw new TMarksAPIError(
            response.status === 401 ? 'INVALID_API_KEY' : 'UNKNOWN_ERROR',
            text || `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }
        
        // 尝试解析为 JSON
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      // 处理错误响应
      if (!response.ok) {
        console.error('[TMarksClient] 错误响应数据:', data);
        this.handleErrorResponse(response.status, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof TMarksAPIError) {
        throw error;
      }

      // 网络错误或其他错误
      if (error instanceof TypeError) {
        console.error('[TMarksClient] 网络错误:', error);
        throw new TMarksAPIError(
          'NETWORK_ERROR',
          'Network error: Unable to connect to TMarks API',
          0,
          { originalError: error }
        );
      }

      console.error('[TMarksClient] 未知错误:', error);
      throw new TMarksAPIError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        0,
        { originalError: error }
      );
    }
  }

  /**
   * GET 请求
   */
  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? `?${new URLSearchParams(this.cleanParams(params)).toString()}` : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST 请求
   */
  protected async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH 请求
   */
  protected async patch<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE 请求
   */
  protected async delete<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * 提取速率限制信息
   */
  private extractRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  /**
   * 处理错误响应
   */
  private handleErrorResponse(status: number, errorData: TMarksError | any): never {
    // 安全地提取错误信息，处理各种可能的响应格式
    let code = 'UNKNOWN_ERROR';
    let message = 'Unknown error occurred';
    let details: any = undefined;
    let retry_after: number | undefined = undefined;

    if (errorData?.error) {
      // 标准 TMarks 错误格式
      code = errorData.error.code || code;
      message = errorData.error.message || message;
      details = errorData.error.details;
      retry_after = errorData.error.retry_after;
    } else if (typeof errorData === 'string') {
      // 纯文本错误
      message = errorData;
    } else if (errorData?.message) {
      // 简单对象格式
      message = errorData.message;
      code = errorData.code || code;
    }

    // 根据 HTTP 状态码推断错误类型
    if (status === 401 && code === 'UNKNOWN_ERROR') {
      code = 'INVALID_API_KEY';
      message = message || 'Authentication failed';
    } else if (status === 403 && code === 'UNKNOWN_ERROR') {
      code = 'INSUFFICIENT_PERMISSIONS';
      message = message || 'Permission denied';
    } else if (status === 429 && code === 'UNKNOWN_ERROR') {
      code = 'RATE_LIMIT_EXCEEDED';
      message = message || 'Rate limit exceeded';
    }

    console.error('[TMarksClient] API Error:', { status, code, message, details });

    throw new TMarksAPIError(
      code,
      message,
      status,
      details,
      retry_after
    );
  }

  /**
   * 清理参数（移除 undefined 值）
   */
  private cleanParams(params: Record<string, any>): Record<string, string> {
    const cleaned: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = String(value);
      }
    }

    return cleaned;
  }
}
