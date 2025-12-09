import type { AIRequest, AIResponse, ErrorCode } from '@/types';
import { AppError } from '@/types';
import { buildDefaultPrompt } from '@/lib/constants/prompts';

export abstract class AIProvider {
  abstract name: string;
  abstract models: string[];

  /**
   * Generate tag recommendations
   */
  abstract generateTags(
    request: AIRequest,
    apiKey: string,
    model?: string,
    apiUrl?: string,
    customPrompt?: string
  ): Promise<AIResponse>;

  /**
   * Build prompt for AI
   */
  protected buildPrompt(request: AIRequest, customPrompt?: string): string {
    const { page, context, options } = request;

    if (customPrompt) {
      // Replace placeholders in custom prompt
      return customPrompt
        .replace(/\{title\}/g, page.title)
        .replace(/\{url\}/g, page.url)
        .replace(/\{description\}/g, page.description || '无')
        .replace(/\{content\}/g, page.content?.substring(0, 500) || '无')
        .replace(/\{existingTags\}/g, context.existingTags.slice(0, 100).join(', '))
        .replace(/\{recentBookmarks\}/g, context.recentBookmarks.slice(0, 10).map(b =>
          `- ${b.title} [${b.tags.join(', ')}]`
        ).join('\n'))
        .replace(/\{maxTags\}/g, options.maxTags.toString())
        .replace(/\{preferExisting\}/g, options.preferExisting ? '优先' : '可以');
    }

    // Use modular default prompt
    return buildDefaultPrompt(request);
  }

  /**
   * Handle errors uniformly
   */
  protected handleError(error: unknown, provider: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Network errors
    if (error instanceof TypeError || (error && typeof error === 'object' && 'name' in error && error.name === 'NetworkError')) {
      return new AppError(
        'NETWORK_ERROR' as ErrorCode,
        `Network error when calling ${provider}`,
        { originalError: error }
      );
    }

    // API key errors
    if (error && typeof error === 'object' && 'status' in error) {
      const errorWithStatus = error as { status: number; message?: string };
      if (errorWithStatus.status === 401 || errorWithStatus.status === 403) {
        return new AppError(
          'API_KEY_INVALID' as ErrorCode,
          `Invalid API key for ${provider}`,
          { status: errorWithStatus.status }
        );
      }

      // Rate limit errors
      if (errorWithStatus.status === 429) {
        return new AppError(
          'RATE_LIMIT_ERROR' as ErrorCode,
          `Rate limit exceeded for ${provider}`,
          { status: errorWithStatus.status }
        );
      }
    }

    // Generic AI service error
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String((error as { message: unknown }).message)
      : 'Unknown error';
    
    return new AppError(
      'AI_SERVICE_ERROR' as ErrorCode,
      `AI service error (${provider}): ${errorMessage}`,
      { originalError: error }
    );
  }

  /**
   * Parse and validate AI response
   */
  protected parseResponse(content: string): AIResponse {
    try {
      // Try to extract JSON from response (in case AI adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);

      if (!parsed.suggestedTags || !Array.isArray(parsed.suggestedTags)) {
        throw new Error('Invalid response format: suggestedTags not found');
      }

      // Validate tag format
      const tags = parsed.suggestedTags.map((tag: unknown) => {
        if (!tag || typeof tag !== 'object') {
          return { name: '', isNew: true, confidence: 0.5 };
        }
        const tagObj = tag as Record<string, unknown>;
        const processedTag = {
          name: typeof tagObj.name === 'string' ? tagObj.name : '',
          isNew: typeof tagObj.isNew === 'boolean' ? tagObj.isNew : true,
          confidence: typeof tagObj.confidence === 'number' ? tagObj.confidence : 0.5
        };
        return processedTag;
      });

      return {
        suggestedTags: tags,
        reasoning: parsed.reasoning,
        translatedTitle: parsed.translatedTitle,
        translatedDescription: parsed.translatedDescription
      };
    } catch (error) {
      throw new AppError(
        'AI_SERVICE_ERROR' as ErrorCode,
        'Failed to parse AI response',
        { content, error }
      );
    }
  }
}
