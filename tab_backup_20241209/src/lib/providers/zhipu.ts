import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class ZhipuProvider extends AIProvider {
  name = 'zhipu';
  models = ['glm-4-plus', 'glm-4-flash', 'glm-4-air', 'glm-4'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'glm-4-flash',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'zhipu',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'ZhipuAI');
    }
  }
}
