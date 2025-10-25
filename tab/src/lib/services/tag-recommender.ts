import { db } from '@/lib/db';
import { StorageService } from '@/lib/utils/storage';
import { getAIProvider } from '@/lib/providers';
import type { PageInfo, RecommendationResult, AIRequest, TagSuggestion, AIResponse, AIProvider } from '@/types';

export class TagRecommender {
  private contextCache: AIRequest['context'] | null = null;
  private contextPromise: Promise<AIRequest['context']> | null = null;

  /**
   * Recommend tags for a page using AI
   */
  async recommendTags(pageInfo: PageInfo): Promise<RecommendationResult> {
    try {
      const configPromise = StorageService.loadConfig();
      const contextPromise = this.getContext();

      const config = await configPromise;
      const apiKey = config.aiConfig.apiKeys[config.aiConfig.provider];

      if (!apiKey) {
        console.warn('[TagRecommender] No API key configured, using fallback');
        return this.fallbackRecommendation(pageInfo);
      }

      const context = await contextPromise;

      // Build AI request
      const aiRequest: AIRequest = {
        page: {
          title: pageInfo.title,
          url: pageInfo.url,
          description: pageInfo.description,
          content: pageInfo.content?.substring(0, 500)
        },
        context,
        options: {
          maxTags: config.preferences.maxSuggestedTags || 5,
          preferExisting: true
        }
      };

      // Get API URL and custom prompt
      const apiUrl = config.aiConfig.apiUrls?.[config.aiConfig.provider];
      const customPrompt = config.aiConfig.enableCustomPrompt ? config.aiConfig.customPrompt : undefined;

      // Call AI with retry (increased timeout to 30 seconds)
      const aiResponse = await this.callAIWithRetry(
        aiRequest,
        apiKey,
        config.aiConfig.provider as AIProvider,
        config.aiConfig.model,
        apiUrl,
        customPrompt,
        1,
        undefined
      );

      // Post-process: verify isNew field and deduplicate
      const existingTagNames = context.existingTags;
      const existingTagSet = new Set(existingTagNames.map(tag => tag.trim().toLowerCase()));
      console.log('[TagRecommender] 开始修正 isNew 字段, 已有标签数量:', existingTagNames.length);
      console.log('[TagRecommender] AI 返回的标签:', aiResponse.suggestedTags);

      const verifiedTags = aiResponse.suggestedTags.map((tag: TagSuggestion) => {
        const normalizedTagName = tag.name.trim().toLowerCase();
        const isExisting = existingTagSet.has(normalizedTagName);
        const correctedTag = {
          ...tag,
          // 二次校验:前端验证 isNew 字段是否正确
          isNew: !isExisting
        };
        console.log(`[TagRecommender] 标签 "${tag.name}": AI判断 isNew=${tag.isNew}, 实际应为 isNew=${correctedTag.isNew}, 在已有标签中? ${isExisting}`);
        return correctedTag;
      });

      const tags = this.deduplicateAndSort(verifiedTags);

      console.log('[TagRecommender] 已修正 isNew 字段 (最终结果):', tags);

      return {
        tags,
        source: 'ai',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[TagRecommender] AI recommendation failed:', error);
      const message = error instanceof Error ? error.message : 'AI recommendation failed';
      return this.fallbackRecommendation(pageInfo, message);
    }
  }

  /**
   * Get context for AI (existing tags and recent bookmarks)
   */
  private async getContext(): Promise<AIRequest['context']> {
    if (this.contextCache) {
      return this.contextCache;
    }

    if (this.contextPromise) {
      return this.contextPromise;
    }

    this.contextPromise = this.loadContextFromDB();
    try {
      const context = await this.contextPromise;
      this.contextCache = context;
      return context;
    } finally {
      this.contextPromise = null;
    }
  }

  /**
   * Call AI with retry and timeout
   */
  private async callAIWithRetry(
    request: AIRequest,
    apiKey: string,
    providerName: AIProvider,
    model: string | undefined,
    apiUrl: string | undefined,
    customPrompt: string | undefined,
    maxRetries: number,
    timeout?: number
  ): Promise<AIResponse> {
    const provider = getAIProvider(providerName);
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        if (typeof timeout === 'number' && timeout > 0) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('AI request timeout')), timeout);
          });

          const result = await Promise.race([
            provider.generateTags(request, apiKey, model, apiUrl, customPrompt),
            timeoutPromise
          ]);

          return result;
        }

        const result = await provider.generateTags(request, apiKey, model, apiUrl, customPrompt);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[TagRecommender] AI call attempt ${i + 1} failed:`, error);

        if (i < maxRetries - 1) {
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000;
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('AI request failed after retries');
  }

  /**
   * Fallback recommendation using simple keyword matching
   */
  private async fallbackRecommendation(pageInfo: PageInfo, message?: string): Promise<RecommendationResult> {
    console.log('[TagRecommender] ⚠️ Using fallback recommendation (AI failed)');

    const keywords = this.extractKeywords(pageInfo.title + ' ' + (pageInfo.description || ''));
    const existingTags = await db.tags.toArray();

    // Find tags that match keywords
    const matchedTags = existingTags
      .filter(tag =>
        keywords.some(kw =>
          tag.name.toLowerCase().includes(kw.toLowerCase()) ||
          kw.toLowerCase().includes(tag.name.toLowerCase())
        )
      )
      .sort((a, b) => (b.count || 0) - (a.count || 0)) // Sort by usage count
      .slice(0, 3)
      .map(tag => ({
        name: tag.name,
        isNew: false,
        confidence: 0.6
      }));

    console.log('[TagRecommender] Fallback 返回的标签 (全部 isNew=false):', matchedTags);

    return {
      tags: matchedTags,
      source: 'fallback',
      timestamp: Date.now(),
      message: message || null
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .split(/[\s\/\-_、，。！？]+/)
      .map(w => w.trim())
      .filter(w => w.length > 1)
      .slice(0, 20);
  }

  /**
   * Deduplicate and sort tags by confidence
   */
  private deduplicateAndSort(tags: TagSuggestion[]): TagSuggestion[] {
    const seen = new Set<string>();
    const unique: TagSuggestion[] = [];

    for (const tag of tags) {
      const normalized = tag.name.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(tag);
      }
    }

    return unique.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearContextCache(): void {
    this.contextCache = null;
  }

  async preloadContext(): Promise<void> {
    if (this.contextPromise) {
      await this.contextPromise;
      return;
    }

    const loadPromise = this.loadContextFromDB(true);
    this.contextPromise = loadPromise;
    try {
      const context = await loadPromise;
      this.contextCache = context;
    } finally {
      this.contextPromise = null;
    }
  }

  async refreshContextFromDB(): Promise<void> {
    const loadPromise = this.loadContextFromDB(true);
    this.contextPromise = loadPromise;
    try {
      const context = await loadPromise;
      this.contextCache = context;
    } finally {
      this.contextPromise = null;
    }
  }

  updateContextWithBookmark(bookmark: { title: string; tags: string[] }): void {
    if (!this.contextCache) {
      return;
    }

    const existingSet = new Set(this.contextCache.existingTags.map(tag => tag.toLowerCase()));
    const normalizedTags: string[] = [];

    for (const tag of bookmark.tags) {
      const normalized = tag.trim();
      if (!normalized) continue;

      if (!existingSet.has(normalized.toLowerCase())) {
        existingSet.add(normalized.toLowerCase());
        normalizedTags.push(normalized);
      }
    }

    if (normalizedTags.length > 0) {
      this.contextCache.existingTags = [...this.contextCache.existingTags, ...normalizedTags].slice(-200);
    }

    this.contextCache.recentBookmarks = [
      { title: bookmark.title, tags: bookmark.tags },
      ...this.contextCache.recentBookmarks
    ].slice(0, 20);
  }

  private async loadContextFromDB(force: boolean = false): Promise<AIRequest['context']> {
    if (!force && this.contextCache) {
      return this.contextCache;
    }

    const [existingTags, recentBookmarks] = await Promise.all([
      db.tags
        .orderBy('count')
        .reverse()
        .limit(200)
        .toArray()
        .then(tags => tags.map(t => t.name)),
      db.bookmarks
        .orderBy('createdAt')
        .reverse()
        .limit(20)
        .toArray()
        .then(bookmarks =>
          bookmarks.map(b => ({
            title: b.title,
            tags: b.tags
          }))
        )
    ]);

    const context = {
      existingTags,
      recentBookmarks
    };

    this.contextCache = context;
    return context;
  }
}

// Singleton instance
export const tagRecommender = new TagRecommender();
