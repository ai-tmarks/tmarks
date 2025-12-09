import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class ModelScopeProvider extends AIProvider {
  name = 'modelscope';
  models = ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen2.5-72b-instruct'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'qwen-turbo',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'modelscope',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'ModelScope');
    }
  }
}
