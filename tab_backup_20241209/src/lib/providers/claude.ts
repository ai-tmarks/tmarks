import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class ClaudeProvider extends AIProvider {
  name = 'claude';
  models = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'claude-3-5-sonnet-20241022',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'claude',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 1024,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'Claude');
    }
  }
}
