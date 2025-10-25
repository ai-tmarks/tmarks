# Tab 项目修复清单

## ✅ 已修复

### 1. 内存泄漏 - SuccessMessage 组件
- **文件**: `tab/src/components/SuccessMessage.tsx`
- **状态**: ✅ 已修复
- **说明**: 添加了 `clearTimeout` 清理函数

### 2. 内存泄漏 - ModeSelector 组件
- **文件**: `tab/src/popup/ModeSelector.tsx`
- **状态**: ✅ 已修复
- **说明**: `setInterval` 已有清理函数（原本就有）

### 3. URL 常量管理
- **文件**: `tab/src/lib/constants/urls.ts`
- **状态**: ✅ 已创建
- **说明**: 创建了统一的 URL 常量文件

---

## 🔧 需要手动修复

### 高优先级

#### 1. 竞态条件 - Options.tsx 模型获取
**文件**: `tab/src/options/Options.tsx:266-310`

**当前代码**:
```typescript
useEffect(() => {
  const supported = canFetchModels(formData.aiProvider, formData.apiUrl);
  const trimmedKey = formData.apiKey.trim();

  if (!supported || !trimmedKey) {
    setAvailableModels([]);
    setModelFetchError(null);
    setIsFetchingModels(false);
    lastModelFetchSignature.current = null;
    return;
  }

  const signature = `${formData.aiProvider}|${(formData.apiUrl || '').trim()}|${trimmedKey}|${modelFetchNonce}`;

  if (lastModelFetchSignature.current === signature) {
    return;
  }

  let cancelled = false;
  setIsFetchingModels(true);
  setModelFetchError(null);

  fetchAvailableModels(formData.aiProvider, trimmedKey, formData.apiUrl)
    .then(models => {
      if (cancelled) return;
      setAvailableModels(models);
      setIsFetchingModels(false);
      setModelFetchError(null);
      lastModelFetchSignature.current = signature;
      setFormData(prev => {
        if (prev.aiModel) {
          return prev;
        }
        return {
          ...prev,
          aiModel: models[0] || ''
        };
      });
    })
    .catch(error => {
      if (cancelled) return;
      setAvailableModels([]);
      setModelFetchError(error instanceof Error ? error.message : String(error));
      setIsFetchingModels(false);
      lastModelFetchSignature.current = signature;
    });

  return () => {
    cancelled = true;
  };
}, [formData.aiProvider, formData.apiUrl, formData.apiKey, modelFetchNonce]);
```

**建议修复**:
```typescript
useEffect(() => {
  const supported = canFetchModels(formData.aiProvider, formData.apiUrl);
  const trimmedKey = formData.apiKey.trim();

  if (!supported || !trimmedKey) {
    setAvailableModels([]);
    setModelFetchError(null);
    setIsFetchingModels(false);
    lastModelFetchSignature.current = null;
    return;
  }

  const signature = `${formData.aiProvider}|${(formData.apiUrl || '').trim()}|${trimmedKey}|${modelFetchNonce}`;

  if (lastModelFetchSignature.current === signature) {
    return;
  }

  let cancelled = false;
  
  const fetchModels = async () => {
    setIsFetchingModels(true);
    setModelFetchError(null);

    try {
      const models = await fetchAvailableModels(formData.aiProvider, trimmedKey, formData.apiUrl);
      
      if (cancelled) return;
      
      setAvailableModels(models);
      setIsFetchingModels(false);
      setModelFetchError(null);
      lastModelFetchSignature.current = signature;
      
      // 只在没有选中模型时自动选择第一个
      setFormData(prev => {
        if (prev.aiModel) {
          return prev;
        }
        return {
          ...prev,
          aiModel: models[0] || ''
        };
      });
    } catch (error) {
      if (cancelled) return;
      
      setAvailableModels([]);
      setModelFetchError(error instanceof Error ? error.message : String(error));
      setIsFetchingModels(false);
      lastModelFetchSignature.current = signature;
    }
  };

  fetchModels();

  return () => {
    cancelled = true;
  };
}, [formData.aiProvider, formData.apiUrl, formData.apiKey, modelFetchNonce]);
```

---

#### 2. 类型安全 - 移除 `as any`
**文件**: `tab/src/lib/services/tag-recommender.ts:128, 143, 147`

**当前代码**:
```typescript
const provider = getAIProvider(providerName as any);
// ...
return result as any;
```

**建议修复**:
```typescript
// 修改函数签名，使用正确的类型
private async callAIWithRetry(
  request: AIRequest,
  apiKey: string,
  providerName: AIProvider, // 使用正确的类型
  model: string | undefined,
  apiUrl: string | undefined,
  customPrompt: string | undefined,
  maxRetries: number,
  timeout?: number
): Promise<AIResponse> { // 返回正确的类型
  const provider = getAIProvider(providerName);
  let lastError: Error;

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
        const delay = Math.pow(2, i) * 1000;
        await this.delay(delay);
      }
    }
  }

  throw lastError!;
}
```

---

#### 3. 非空断言 - bookmark-api.ts
**文件**: `tab/src/lib/services/bookmark-api.ts`

**当前代码**:
```typescript
const response = await this.client!.tags.getTags();
```

**建议修复**:
```typescript
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

async getTags(): Promise<Tag[]> {
  const client = await this.ensureClient();

  try {
    const response = await client.tags.getTags();
    // ...
  } catch (error: any) {
    // ...
  }
}
```

---

### 中优先级

#### 4. 使用 URL 常量替换硬编码
需要在以下文件中替换硬编码的 URL：

1. **tab/src/popup/ModeSelector.tsx:189, 199**
```typescript
// 修改前
chrome.tabs.create({ url: 'https://tmarks.669696.xyz/' });

// 修改后
import { TMARKS_URLS } from '@/lib/constants/urls';
chrome.tabs.create({ url: TMARKS_URLS.WEB_APP });
```

2. **tab/src/lib/services/bookmark-api.ts:28**
```typescript
// 修改前
baseUrl: baseUrl || 'https://tmarks.669696.xyz/api'

// 修改后
import { TMARKS_URLS } from '@/lib/constants/urls';
baseUrl: baseUrl || TMARKS_URLS.DEFAULT_API_BASE
```

3. **tab/src/lib/services/ai-client.ts** - 所有 AI 服务 URL
```typescript
// 修改前
defaultBaseUrl: 'https://api.openai.com/v1'

// 修改后
import { AI_SERVICE_URLS } from '@/lib/constants/urls';
defaultBaseUrl: AI_SERVICE_URLS.OPENAI
```

4. **tab/src/options/components/AIConfigSection.tsx** - 所有文档链接
```typescript
// 修改前
href="https://platform.openai.com/api-keys"

// 修改后
import { AI_SERVICE_DOCS } from '@/lib/constants/urls';
href={AI_SERVICE_DOCS.OPENAI}
```

---

#### 5. 提取魔法数字为常量

**文件**: `tab/src/lib/services/cache-manager.ts:26`
```typescript
// 修改前
while (page <= 100) { // 魔法数字

// 修改后
import { PAGINATION } from '@/lib/constants/urls';
while (page <= PAGINATION.MAX_PAGES) {
```

**文件**: `tab/src/background/index.ts:145`
```typescript
// 修改前
setTimeout(() => reject(new Error('Message timeout')), 5000)

// 修改后
import { TIMEOUTS } from '@/lib/constants/urls';
setTimeout(() => reject(new Error('Message timeout')), TIMEOUTS.CONTENT_SCRIPT_INJECTION)
```

---

#### 6. 简化复杂嵌套逻辑

**文件**: `tab/src/lib/services/bookmark-api.ts:126-180`

**建议**: 将标签处理逻辑提取为独立函数

```typescript
/**
 * 解析标签名称为标签 ID
 * 如果标签不存在则创建
 */
private async resolveTagIds(tagNames: string[]): Promise<string[]> {
  if (!tagNames || tagNames.length === 0) {
    return [];
  }

  const client = await this.ensureClient();
  const tagsResponse = await client.tags.getTags();
  const existingTags = tagsResponse.data.tags;
  const tagIds: string[] = [];

  for (const tagName of tagNames) {
    const tagId = await this.findOrCreateTag(tagName, existingTags, client);
    tagIds.push(tagId);
  }

  return tagIds;
}

/**
 * 查找或创建标签
 */
private async findOrCreateTag(
  tagName: string,
  existingTags: TMarksTag[],
  client: ReturnType<typeof createTMarksClient>
): Promise<string> {
  // 先在已有标签中查找
  const existingTag = existingTags.find(
    t => t.name.toLowerCase() === tagName.toLowerCase()
  );

  if (existingTag) {
    return existingTag.id;
  }

  // 标签不存在，创建新标签
  try {
    const newTagResponse = await client.tags.createTag({ name: tagName });
    const newTag = newTagResponse.data.tag;
    
    // 添加到已有标签列表，避免重复创建
    existingTags.push(newTag);
    
    return newTag.id;
  } catch (tagError: any) {
    // 处理并发创建导致的重复
    if (tagError.code === 'DUPLICATE_TAG') {
      return await this.retryFindTag(tagName, client);
    }
    throw tagError;
  }
}

/**
 * 重试查找标签（处理并发创建）
 */
private async retryFindTag(
  tagName: string,
  client: ReturnType<typeof createTMarksClient>
): Promise<string> {
  const retryTagsResponse = await client.tags.getTags();
  const retryTag = retryTagsResponse.data.tags.find(
    t => t.name.toLowerCase() === tagName.toLowerCase()
  );
  
  if (!retryTag) {
    throw new Error(`无法创建或找到标签 "${tagName}"`);
  }
  
  return retryTag.id;
}

// 然后在 addBookmark 中使用
async addBookmark(bookmark: BookmarkInput): Promise<{ id: string }> {
  const client = await this.ensureClient();

  try {
    const tagIds = await this.resolveTagIds(bookmark.tags);

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

    return { id: response.data.bookmark.id };
  } catch (error: any) {
    throw new AppError(
      'BOOKMARK_SITE_ERROR' as ErrorCode,
      `Failed to add bookmark: ${error.message}`,
      { originalError: error }
    );
  }
}
```

---

### 低优先级

#### 7. 清理调试日志

创建日志工具类：

**文件**: `tab/src/lib/utils/logger.ts`
```typescript
/**
 * 日志工具类
 * 根据环境变量控制日志输出
 */

const IS_DEV = import.meta.env.DEV;

export const logger = {
  debug: (...args: any[]) => {
    if (IS_DEV) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};
```

然后替换所有 `console.log` 为 `logger.debug`

---

#### 8. 添加输入验证

**文件**: `tab/src/lib/services/tab-collection.ts:38-42`

```typescript
function getFaviconUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    const urlObj = new URL(url);
    return `${EXTERNAL_SERVICES.GOOGLE_FAVICON}?domain=${urlObj.hostname}&sz=32`;
  } catch (error) {
    console.warn(`Invalid URL for favicon: ${url}`, error);
    return '';
  }
}
```

---

## 📊 修复进度

- ✅ 已修复: 3 项
- 🔧 待修复（高优先级）: 3 项
- 🔧 待修复（中优先级）: 4 项
- 🔧 待修复（低优先级）: 2 项

**总计**: 12 项修复任务

---

## 🎯 下一步行动

1. 立即修复高优先级问题（竞态条件、类型安全）
2. 逐步替换硬编码 URL 为常量
3. 简化复杂逻辑，提高可维护性
4. 添加日志工具类，清理调试代码
5. 考虑添加单元测试

---

生成时间: 2025-01-XX
