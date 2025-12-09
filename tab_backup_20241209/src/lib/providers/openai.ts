import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class OpenAIProvider extends AIProvider {
  name = 'openai';
  models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'gpt-4o',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'openai',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'OpenAI');
    }
  }
}
