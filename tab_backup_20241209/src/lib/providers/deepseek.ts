import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class DeepSeekProvider extends AIProvider {
  name = 'deepseek';
  models = ['deepseek-chat', 'deepseek-reasoner'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'deepseek-chat',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'deepseek',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'DeepSeek');
    }
  }
}
