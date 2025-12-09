import type { AIRequest, AIResponse } from '@/types';
import { AIProvider } from './base';
import { callAI } from '@/lib/services/ai-client';

export class SiliconFlowProvider extends AIProvider {
  name = 'siliconflow';
  models = [
    'deepseek-ai/DeepSeek-V3',
    'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-72B-Instruct',
    'THUDM/glm-4-9b-chat',
    'meta-llama/Meta-Llama-3.1-8B-Instruct'
  ];

  async generateTags(
    request: AIRequest,
    apiKey: string,
    model: string = 'Qwen/Qwen2.5-7B-Instruct',
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(request, customPrompt);
      const { content } = await callAI({
        provider: 'siliconflow',
        apiKey,
        apiUrl,
        model,
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      return this.parseResponse(content);
    } catch (error) {
      throw this.handleError(error, 'SiliconFlow');
    }
  }
}
