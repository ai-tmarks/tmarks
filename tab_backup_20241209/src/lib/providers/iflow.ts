import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class IFlowProvider extends AIProvider {
  name = 'iflow';
  models = ['TBStars2-200B-A13B', 'TBStars2-70B-A7B'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'TBStars2-200B-A13B',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'iflow',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 1000,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'iFlow');
    }
  }
}
