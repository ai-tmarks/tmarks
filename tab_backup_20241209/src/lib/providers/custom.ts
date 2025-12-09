import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class CustomProvider extends AIProvider {
  name = 'custom';
  models = ['custom-model'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'gpt-4o',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      if (!apiUrl) {
        throw new Error('自定义 AI 需要配置 API 地址');
      }

      const prompt = this.buildPrompt(request, customPrompt);

      const { content } = await callAI({
        provider: 'custom',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'Custom');
    }
  }
}
