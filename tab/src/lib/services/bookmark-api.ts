import type {
  BookmarkInput,
  Tag,
  Bookmark,
  ErrorCode
} from '@/types';
import { AppError } from '@/types';
import { StorageService } from '@/lib/utils/storage';
import { createTMarksClient, type TMarksBookmark, type TMarksTag } from '@/lib/api/tmarks';
import { TMARKS_URLS } from '@/lib/constants/urls';

export class BookmarkAPIClient {
  private client: ReturnType<typeof createTMarksClient> | null = null;

  async initialize(): Promise<void> {
    const baseUrl = await StorageService.getBookmarkSiteApiUrl();
    const apiKey = await StorageService.getBookmarkSiteApiKey();

    if (!apiKey) {
      throw new AppError(
        'API_KEY_INVALID' as ErrorCode,
        'TMarks API key is required. Please configure your API key in the extension settings.'
      );
    }

    // Create TMarks client with proper API key
    this.client = createTMarksClient({
      apiKey,
      baseUrl: baseUrl || TMARKS_URLS.DEFAULT_API_BASE
    });
  }

  private async ensureClient(): Promise<ReturnType<typeof createTMarksClient>> {
    if (!this.client) {
      await this.initialize();
    }
    if (!this.client) {
      throw new AppError(
        'API_KEY_INVALID' as ErrorCode,
        'Failed to initialize TMarks client'
      );
    }
    return this.client;
  }

  
  /**
   * Get all tags from bookmark site
   */
  async getTags(): Promise<Tag[]> {
    const client = await this.ensureClient();

    try {
      const response = await client.tags.getTags();

      // Convert TMarks API format to internal format
      return response.data.tags.map((tag: TMarksTag) => ({
        name: tag.name,
        color: tag.color,
        count: tag.bookmark_count || 0,
        createdAt: new Date(tag.created_at).getTime()
      }));
    } catch (error: any) {
      if (error.code === 'MISSING_API_KEY') {
        throw new AppError(
          'API_KEY_INVALID' as ErrorCode,
          'TMarks API key is required. Please configure your API key in the extension settings.',
          { originalError: error }
        );
      }
      throw new AppError(
        'BOOKMARK_SITE_ERROR' as ErrorCode,
        `Failed to fetch tags: ${error.message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get bookmarks with pagination
   */
  async getBookmarks(page: number = 1, limit: number = 100): Promise<{
    bookmarks: Bookmark[];
    hasMore: boolean;
  }> {
    const client = await this.ensureClient();

    try {
      const response = await client.bookmarks.getBookmarks({
        page_size: limit,
        page_cursor: page > 1 ? `page_${page}` : undefined
      });

      if (!response.data.bookmarks.length) {
        return { bookmarks: [], hasMore: false };
      }

      // Convert TMarks API format to internal format
      const bookmarks = response.data.bookmarks.map((bm: TMarksBookmark) => ({
        url: bm.url,
        title: bm.title,
        description: bm.description || '',
        tags: bm.tags.map((tag: TMarksTag) => tag.name), // 只保留标签名称
        createdAt: new Date(bm.created_at).getTime(),
        remoteId: bm.id,
        isPublic: bm.is_public
      }));

      return {
        bookmarks,
        hasMore: response.data.meta.has_more
      };
    } catch (error: any) {
      throw new AppError(
        'BOOKMARK_SITE_ERROR' as ErrorCode,
        `Failed to fetch bookmarks: ${error.message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Add a new bookmark
   */
  async addBookmark(bookmark: BookmarkInput): Promise<{ id: string }> {
    const client = await this.ensureClient();

    try {
      // Resolve tag names to tag IDs (create new tags if needed)
      let tagIds: string[] = [];
      if (bookmark.tags && bookmark.tags.length > 0) {
        console.log('[BookmarkAPI] 处理标签:', bookmark.tags);

        // Get existing tags from the API
        const tagsResponse = await client.tags.getTags();
        const existingTags = tagsResponse.data.tags;

        console.log('[BookmarkAPI] 已有标签数量:', existingTags.length);

        // For each tag, find or create it
        for (const tagName of bookmark.tags) {
          const existingTag = existingTags.find(
            t => t.name.toLowerCase() === tagName.toLowerCase()
          );

          if (existingTag) {
            // Tag exists, use its ID
            console.log(`[BookmarkAPI] 标签 "${tagName}" 已存在, ID: ${existingTag.id}`);
            tagIds.push(existingTag.id);
          } else {
            // Tag doesn't exist, create it
            console.log(`[BookmarkAPI] 标签 "${tagName}" 不存在，正在创建...`);
            try {
              const newTagResponse = await client.tags.createTag({
                name: tagName
              });
              const newTagId = newTagResponse.data.tag.id;
              console.log(`[BookmarkAPI] 标签 "${tagName}" 创建成功, ID: ${newTagId}`);
              tagIds.push(newTagId);

              // Add to existingTags array to avoid duplicate creation
              existingTags.push(newTagResponse.data.tag);
            } catch (tagError: any) {
              // If tag creation fails due to duplicate (race condition), try to find it again
              if (tagError.code === 'DUPLICATE_TAG') {
                console.log(`[BookmarkAPI] 标签 "${tagName}" 已被并发创建，重新查找...`);
                const retryTagsResponse = await client.tags.getTags();
                const retryTag = retryTagsResponse.data.tags.find(
                  t => t.name.toLowerCase() === tagName.toLowerCase()
                );
                if (retryTag) {
                  tagIds.push(retryTag.id);
                  console.log(`[BookmarkAPI] 重新找到标签 "${tagName}", ID: ${retryTag.id}`);
                } else {
                  console.error(`[BookmarkAPI] 无法创建或找到标签 "${tagName}"`);
                  throw tagError;
                }
              } else {
                console.error(`[BookmarkAPI] 创建标签 "${tagName}" 失败:`, tagError);
                throw tagError;
              }
            }
          }
        }

        console.log('[BookmarkAPI] 最终标签 IDs:', tagIds);
      }

      const response = await client.bookmarks.createBookmark({
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description,
        cover_image: bookmark.thumbnail,
        tag_ids: tagIds,
        is_public: bookmark.isPublic ?? false
      });

      if (!response.data.bookmark) {
        throw new AppError(
          'BOOKMARK_SITE_ERROR' as ErrorCode,
          'Failed to add bookmark: No data returned'
        );
      }

      console.log('[BookmarkAPI] 书签创建成功, ID:', response.data.bookmark.id);
      return { id: response.data.bookmark.id };
    } catch (error: any) {
      throw new AppError(
        'BOOKMARK_SITE_ERROR' as ErrorCode,
        `Failed to add bookmark: ${error.message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      await client.user.getMe(); // Test with a lightweight API call
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const bookmarkAPI = new BookmarkAPIClient();
