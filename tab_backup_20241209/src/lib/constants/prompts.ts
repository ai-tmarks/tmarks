/**
 * AI 提示词模板常量
 */

import type { AIRequest } from '@/types';

/**
 * 构建 AI 提示词
 */
export function buildDefaultPrompt(request: AIRequest): string {
  const { page, context, options } = request;

  return `
你是一个智能书签标签推荐助手。请根据网页内容和用户的已有标签库,推荐最相关的标签。

网页信息:
- 标题: ${page.title}
- URL: ${page.url}
- 描述: ${page.description || '无'}
- 内容摘要: ${page.content?.substring(0, 500) || '无'}

已有标签库 (${context.existingTags.length} 个):
${context.existingTags.slice(0, 100).join(', ')}

最近书签参考:
${context.recentBookmarks.slice(0, 10).map(b =>
  `- ${b.title} [${b.tags.join(', ')}]`
).join('\n')}

要求:
1. 推荐 ${options.maxTags} 个最相关的标签
2. ${options.preferExisting ? '优先' : '可以'}使用已有标签
3. 标签应该简洁(1-3个字)、准确、通用性强
4. 如果标题或描述是英文或其他外语，请将其翻译成中文
5. **极其重要 - 必须严格执行**: 标注每个标签是否为新标签
   - 仔细检查推荐的标签名是否**完全匹配**上面"已有标签库"中的任意一个标签
   - 如果标签名在已有标签库中找到了**完全相同**的匹配，设置 isNew: false
   - 如果标签名在已有标签库中**找不到完全相同**的匹配，设置 isNew: true
   - 必须逐个检查，不要猜测
6. **输出格式必须严格为单个 JSON 对象**，结构如下：
   {"suggestedTags": [{"name": "标签名", "isNew": false, "confidence": 0.9}], "translatedTitle": "翻译后的标题(若有)", "translatedDescription": "翻译后的描述(若有)"}
   - 不得包含多余文本、解释、换行提示或 Markdown
   - 不得输出思考过程、reasoning_content、警告或其它键
   - 如无法满足要求，请返回 {"suggestedTags": [], "translatedTitle": null, "translatedDescription": null}
7. 只返回JSON，不要任何其他内容
  `.trim();
}

/**
 * 自定义提示词模板（用于设置页面的示例）
 */
export const DEFAULT_PROMPT_TEMPLATE = `你是一个专业的书签管理助手。请根据网页信息为用户推荐最合适的标签。

网页信息：
- 标题：{title}
- 网址：{url}
- 描述：{description}
- 内容摘要：{content}

用户已有的标签库：
{existingTags}

最近收藏的书签参考：
{recentBookmarks}

任务：
请分析网页内容，并推荐 {maxTags} 个最相关的标签。

推荐规则：
1. 优先匹配已有的标签库，避免生成重复或近义标签
2. 标签要简洁明了，一般为 2-4 个汉字
3. 覆盖网页的核心主题、内容类型与关键信息
4. 结合用户的收藏目的和使用场景，避免过于冷僻的标签
5. 确保标签具有通用性和可检索性，便于分类与查找
6. 如果描述为外文，请翻译成中文，并在返回结果中包含翻译后的描述
7. 每个推荐标签需要包含：name（标签名）、isNew（是否为新标签）、confidence（相关性置信度 0-1）
8. **极其重要 - 必须严格执行**：标注每个标签是否为新标签
   * 仔细检查推荐的标签名是否**完全匹配**上面"已有标签库"中的任意一个标签
   * 如果标签名在已有标签库中找到了**完全相同**的匹配，设置 isNew: false
   * 如果标签名在已有标签库中**找不到完全相同**的匹配，设置 isNew: true
   * 必须逐个检查，不要猜测
9. 每个标签还需标注相关性置信度 confidence（范围 0-1）

返回格式（严格遵循）：
{"suggestedTags": [{"name": "标签名", "isNew": false, "confidence": 0.9}], "translatedTitle": "翻译后的标题（如有）", "translatedDescription": "翻译后的描述（如有）"}

JSON 输出要求：
* 必须输出且仅输出一个合法 JSON 对象，不允许附加任何解释、reasoning 内容或额外键
* 禁止输出 Markdown、换行提示、警告或其他文本
* 如无法生成有效结果，请返回 {"suggestedTags": [], "translatedTitle": null, "translatedDescription": null}
* 标签语言不限，在没有合适标签时，可推荐更为合适的新标签`;
