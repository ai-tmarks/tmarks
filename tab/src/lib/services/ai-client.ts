import type { AIProvider as ProviderName } from '@/types';
import { AI_SERVICE_URLS } from '@/lib/constants/urls';

const SYSTEM_PROMPT =
  '你是一个智能书签标签推荐助手。优先使用已有标签,只有在必要时才建议新标签。返回格式必须是JSON。';

interface InvokeParams {
  provider: ProviderName;
  apiKey: string;
  model?: string;
  apiUrl?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

interface RequestPayload {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  maxTokens?: number;
}

interface ProviderConfig {
  defaultBaseUrl: string;
  buildRequest: (params: InvokeParams) => RequestPayload;
  extractContent: (data: any) => string | undefined;
}

const openAIStyleExtractor = (data: any): string | undefined => {
  const message = data?.choices?.[0]?.message;
  if (!message) {
    return undefined;
  }

  const rawContent = message.content;

  if (typeof rawContent === 'string') {
    return rawContent.trim();
  }

  if (Array.isArray(rawContent)) {
    const joined = rawContent
      .map(part => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (typeof part === 'object') {
          if (typeof part.text === 'string') return part.text;
          if (typeof part.content === 'string') return part.content;
          if (typeof part.value === 'string') return part.value;
          if (part.text && typeof part.text?.value === 'string') return part.text.value;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();

    if (joined) {
      return joined;
    }
  }

  if (typeof message.text === 'string') {
    return message.text.trim();
  }

  if (typeof data?.output_text === 'string') {
    return data.output_text.trim();
  }

  if (data?.output && typeof data.output.text === 'string') {
    return data.output.text.trim();
  }

  return undefined;
};

const anthropicExtractor = (data: any): string | undefined => {
  const content = data?.content;
  if (Array.isArray(content) && content[0]?.type === 'text' && typeof content[0]?.text === 'string') {
    return content[0].text.trim();
  }

  if (typeof data?.output_text === 'string') {
    return data.output_text.trim();
  }

  return undefined;
};

const resolveEndpoint = (baseUrl: string, endpoint: string): string => {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return endpoint;
  }

  if (trimmed.includes(endpoint)) {
    return trimmed;
  }

  const normalizedBase = trimmed.replace(/\/$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
};

const buildOpenAIStyleRequest = (
  defaultBaseUrl: string,
  params: InvokeParams,
  options?: {
    includeJsonResponseFormat?: boolean;
    additionalBody?: Record<string, unknown>;
    defaultMaxTokens?: number;
  }
): RequestPayload => {
  const { apiKey, apiUrl, model, prompt, temperature, maxTokens } = params;

  let baseUrl = apiUrl?.trim() || defaultBaseUrl;
  baseUrl = baseUrl.replace(/\/$/, '');

  const url = resolveEndpoint(baseUrl, '/chat/completions');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    max_tokens: maxTokens ?? options?.defaultMaxTokens ?? 500
  };

  if (options?.includeJsonResponseFormat) {
    body.response_format = { type: 'json_object' };
  }

  if (options?.additionalBody) {
    Object.assign(body, options.additionalBody);
  }

  return {
    url,
    headers,
    body,
    maxTokens: body.max_tokens as number
  };
};

const providerConfigs: Record<ProviderName, ProviderConfig> = {
  openai: {
    defaultBaseUrl: AI_SERVICE_URLS.OPENAI,
    buildRequest: params =>
      buildOpenAIStyleRequest(AI_SERVICE_URLS.OPENAI, params, {
        includeJsonResponseFormat: true,
        defaultMaxTokens: 500
      }),
    extractContent: openAIStyleExtractor
  },
  claude: {
    defaultBaseUrl: AI_SERVICE_URLS.CLAUDE,
    buildRequest: params => {
      const baseUrl = params.apiUrl?.trim() || AI_SERVICE_URLS.CLAUDE;
      const url = resolveEndpoint(baseUrl, '/messages');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01'
      };

      const body = {
        model: params.model,
        system: SYSTEM_PROMPT,
        max_tokens: params.maxTokens ?? 1024,
        temperature: typeof params.temperature === 'number' ? params.temperature : 0.7,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: params.prompt
              }
            ]
          }
        ]
      };

      return {
        url,
        headers,
        body,
        maxTokens: body.max_tokens
      };
    },
    extractContent: anthropicExtractor
  },
  deepseek: {
    defaultBaseUrl: AI_SERVICE_URLS.DEEPSEEK,
    buildRequest: params =>
      buildOpenAIStyleRequest(AI_SERVICE_URLS.DEEPSEEK, params, {
        includeJsonResponseFormat: true,
        defaultMaxTokens: 500
      }),
    extractContent: openAIStyleExtractor
  },
  zhipu: {
    defaultBaseUrl: AI_SERVICE_URLS.ZHIPU,
    buildRequest: params =>
      buildOpenAIStyleRequest(AI_SERVICE_URLS.ZHIPU, params, {
        defaultMaxTokens: 500
      }),
    extractContent: openAIStyleExtractor
  },
  modelscope: {
    defaultBaseUrl: AI_SERVICE_URLS.MODELSCOPE,
    buildRequest: params =>
      buildOpenAIStyleRequest(AI_SERVICE_URLS.MODELSCOPE, params, {
        defaultMaxTokens: 500,
        additionalBody: {
          result_format: 'message'
        }
      }),
    extractContent: openAIStyleExtractor
  },
  siliconflow: {
    defaultBaseUrl: AI_SERVICE_URLS.SILICONFLOW,
    buildRequest: params =>
      buildOpenAIStyleRequest(AI_SERVICE_URLS.SILICONFLOW, params, {
        defaultMaxTokens: 500,
        additionalBody: {
          stream: false
        }
      }),
    extractContent: openAIStyleExtractor
  },
  iflow: {
    defaultBaseUrl: AI_SERVICE_URLS.IFLOW,
    buildRequest: params =>
      buildOpenAIStyleRequest(AI_SERVICE_URLS.IFLOW, params, {
        defaultMaxTokens: 1000
      }),
    extractContent: openAIStyleExtractor
  },
  custom: {
    defaultBaseUrl: AI_SERVICE_URLS.OPENAI,
    buildRequest: params =>
      buildOpenAIStyleRequest(params.apiUrl?.trim() || AI_SERVICE_URLS.OPENAI, params, {
        defaultMaxTokens: 500
      }),
    extractContent: openAIStyleExtractor
  }
};

export interface AIInvokeResult {
  content: string;
  raw: any;
}

export async function callAI(params: InvokeParams): Promise<AIInvokeResult> {
  const config = providerConfigs[params.provider];

  if (!config) {
    throw new Error(`Unsupported AI provider: ${params.provider}`);
  }

  const { url, headers, body } = config.buildRequest(params);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorText: string;
    try {
      errorText = await response.text();
    } catch (err) {
      errorText = (err as Error).message || 'Unknown error';
    }

    throw new Error(`AI API 请求失败 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = config.extractContent(data);

  if (!content) {
    throw new Error(`AI 响应格式错误: ${JSON.stringify(data).substring(0, 200)}`);
  }

  return {
    content,
    raw: data
  };
}
