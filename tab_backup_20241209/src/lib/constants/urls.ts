/**
 * URL 常量配置
 * 统一管理所有硬编码的 URL
 */

// TMarks 服务相关
export const TMARKS_URLS = {
    DEFAULT_BASE_URL: 'https://tmarks.669696.xyz',
    DEFAULT_API_BASE: 'https://tmarks.669696.xyz/api',
} as const;

/**
 * 根据基础 URL 生成完整的 URL
 * @param baseUrl 基础 URL（例如：https://tmarks.669696.xyz）
 */
export function getTMarksUrls(baseUrl?: string) {
    const base = baseUrl || TMARKS_URLS.DEFAULT_BASE_URL;
    // 移除末尾的斜杠
    const cleanBase = base.replace(/\/$/, '');
    
    return {
        BASE_URL: cleanBase,
        API_BASE: `${cleanBase}/api`,
        WEB_APP: `${cleanBase}/`,
        TAB_GROUPS: `${cleanBase}/tab`,
    };
}

/**
 * 标准化 API URL
 * 确保 URL 包含 /api 后缀，用户可以输入基础 URL 或完整 API URL
 * @param url 用户输入的 URL
 * @returns 标准化后的 API URL
 * 
 * @example
 * normalizeApiUrl('https://tmarks.669696.xyz') // => 'https://tmarks.669696.xyz/api'
 * normalizeApiUrl('https://tmarks.669696.xyz/') // => 'https://tmarks.669696.xyz/api'
 * normalizeApiUrl('https://tmarks.669696.xyz/api') // => 'https://tmarks.669696.xyz/api'
 * normalizeApiUrl('https://tmarks.669696.xyz/api/') // => 'https://tmarks.669696.xyz/api'
 */
export function normalizeApiUrl(url: string): string {
    if (!url) {
        return TMARKS_URLS.DEFAULT_API_BASE;
    }
    
    // 移除末尾的斜杠
    const cleanUrl = url.trim().replace(/\/+$/, '');
    
    // 如果已经包含 /api，直接返回
    if (cleanUrl.endsWith('/api')) {
        return cleanUrl;
    }
    
    // 否则添加 /api 后缀
    return `${cleanUrl}/api`;
}

// AI 服务默认 URL
export const AI_SERVICE_URLS = {
    OPENAI: 'https://api.openai.com/v1',
    CLAUDE: 'https://api.anthropic.com/v1',
    DEEPSEEK: 'https://api.deepseek.com/v1',
    ZHIPU: 'https://open.bigmodel.cn/api/paas/v4',
    MODELSCOPE: 'https://api-inference.modelscope.cn/v1',
    SILICONFLOW: 'https://api.siliconflow.cn/v1',
    IFLOW: 'https://apis.iflow.cn/v1',
} as const;

// AI 服务文档链接
export const AI_SERVICE_DOCS = {
    OPENAI: 'https://platform.openai.com/api-keys',
    CLAUDE: 'https://console.anthropic.com/',
    DEEPSEEK: 'https://platform.deepseek.com/api_keys',
    ZHIPU: 'https://open.bigmodel.cn/usercenter/apikeys',
    MODELSCOPE: 'https://www.modelscope.cn/my/myaccesstoken',
    SILICONFLOW: 'https://cloud.siliconflow.cn/account/ak',
    IFLOW: 'https://console.xfyun.cn/services/iat',
} as const;

// 外部服务
export const EXTERNAL_SERVICES = {
    GOOGLE_FAVICON: 'https://www.google.com/s2/favicons',
} as const;

// 超时配置（毫秒）
export const TIMEOUTS = {
    AI_REQUEST: 30000, // 30秒
    API_REQUEST: 10000, // 10秒
    CONTENT_SCRIPT_INJECTION: 5000, // 5秒
} as const;

// 分页配置
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 100,
    MAX_PAGES: 100, // 安全限制
} as const;

// 缓存配置
export const CACHE = {
    DEFAULT_MAX_AGE_HOURS: 24,
    MAX_EXISTING_TAGS: 200,
    MAX_RECENT_BOOKMARKS: 20,
} as const;
