import type { AIProvider } from '@/types';
import { AI_SERVICE_URLS } from '@/lib/constants/urls';

const PROVIDER_DEFAULT_BASE_URL: Partial<Record<AIProvider, string>> = {
  openai: AI_SERVICE_URLS.OPENAI,
  deepseek: AI_SERVICE_URLS.DEEPSEEK,
  siliconflow: AI_SERVICE_URLS.SILICONFLOW
};

const OPENAI_COMPATIBLE_PROVIDERS = new Set<AIProvider>(['openai', 'deepseek', 'siliconflow', 'custom']);

const sanitizeBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed
    .replace(/\s+/g, '')
    .replace(/\/chat\/completions$/, '')
    .replace(/\/$/, '');
};

const resolveBaseUrl = (provider: AIProvider, apiUrl?: string): string | undefined => {
  if (apiUrl && apiUrl.trim()) {
    return sanitizeBaseUrl(apiUrl);
  }

  const fallback = PROVIDER_DEFAULT_BASE_URL[provider];
  return fallback ? sanitizeBaseUrl(fallback) : undefined;
};

const fetchOpenAIStyleModels = async (baseUrl: string, apiKey: string): Promise<string[]> => {
  const url = `${baseUrl}/models`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取模型列表失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const json = await response.json();
  if (!Array.isArray(json?.data)) {
    throw new Error('模型列表响应格式无效');
  }

  const models = json.data
    .map((item: any) => item?.id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

  if (models.length === 0) {
    throw new Error('模型列表为空');
  }

  return models;
};

export const canFetchModels = (provider: AIProvider, apiUrl?: string): boolean => {
  if (!OPENAI_COMPATIBLE_PROVIDERS.has(provider)) {
    return false;
  }

  if (provider === 'custom') {
    const trimmed = apiUrl?.trim();
    return Boolean(trimmed && /^https?:\/\//.test(trimmed));
  }

  return true;
};

export async function fetchAvailableModels(
  provider: AIProvider,
  apiKey: string,
  apiUrl?: string
): Promise<string[]> {
  if (!OPENAI_COMPATIBLE_PROVIDERS.has(provider)) {
    throw new Error('当前 AI 服务暂不支持自动获取模型列表');
  }

  if (!apiKey.trim()) {
    throw new Error('缺少 API Key');
  }

  const baseUrl = resolveBaseUrl(provider, apiUrl);
  if (!baseUrl) {
    throw new Error('缺少 API 地址');
  }

  return fetchOpenAIStyleModels(baseUrl, apiKey);
}
