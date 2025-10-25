/**
 * URL 常量配置
 * 统一管理所有硬编码的 URL
 */

// TMarks 服务相关
export const TMARKS_URLS = {
    DEFAULT_API_BASE: 'https://tmarks.669696.xyz/api',
    WEB_APP: 'https://tmarks.669696.xyz/',
    TAB_GROUPS: 'https://tmarks.669696.xyz/tab',
} as const;

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
