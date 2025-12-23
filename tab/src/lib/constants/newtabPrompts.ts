/**
 * NewTab 文件夹推荐 Prompt 模板
 */

/**
 * 单个书签 - 文件夹推荐 Prompt
 * 用于保存书签时推荐合适的文件夹
 */
export const NEWTAB_FOLDER_PROMPT_TEMPLATE = `你是书签文件夹分类助手。根据网页信息，从候选路径中选择最合适的保存位置。

## 网页信息
- 标题: {{title}}
- URL: {{url}}
- 描述: {{description}}

## 候选文件夹路径（只能从以下选择，禁止编造）
{{folderPaths}}

## 匹配策略（按优先级执行）

### 第一优先级：已有路径精确匹配
- 检查 URL 域名是否与某个文件夹名称直接相关
- 检查标题关键词是否与某个文件夹名称匹配
- 如果用户已有明确对应的文件夹，优先选择

### 第二优先级：语义相似度匹配
- 分析网页主题，匹配语义最接近的文件夹
- 工具类网站按产品名/平台名归类

## 输出要求
- 返回 {{recommendCount}} 个路径（候选不足则返回全部）
- 按匹配度降序排列
- confidence 范围 0-1，即使匹配度低也给 0.3-0.5
- 路径必须与候选列表完全一致，禁止修改

## 输出格式（严格 JSON，无其他内容）
{"suggestedFolders":[{"path":"TMarks/开发","confidence":0.9},{"path":"TMarks/工具","confidence":0.6}]}

## 示例
输入: title="GitHub Copilot", url="https://github.com/features/copilot"
候选: ["TMarks/开发", "TMarks/AI", "TMarks/工具"]
输出: {"suggestedFolders":[{"path":"TMarks/开发","confidence":0.95},{"path":"TMarks/AI","confidence":0.8},{"path":"TMarks/工具","confidence":0.5}]}`;

/**
 * 批量整理 - 工作区书签整理 Prompt
 * 用于按域名批量整理书签到文件夹结构
 * 
 * 目录层级规则：
 * - 一级分类/书签
 * - 一级分类/二级分类/书签
 * - 最多两层文件夹，不允许三层
 */
export const NEWTAB_WORKSPACE_ORGANIZE_PROMPT_TEMPLATE = `你是书签批量整理助手。使用聚类思想将域名分类到文件夹结构中。

## 输入数据
- 用户规则（最高优先级）: {{rules}}
- 域名数据 JSON: {{domainSummariesJson}}
- 目标一级目录数: {{topLevelCount}}

### 域名数据结构说明
- topHistoryDomains: 用户最常访问的 Top {{topHistoryLimit}} 高频域名（按热度排序），这些域名**必须**放一级目录
- batches[].domains: 所有待整理的域名列表
- folderPaths: 用户现有的文件夹路径，参考命名风格

## 目录层级规则（重要）
只允许两种结构：
- 一级分类/书签（如：开发/github.com）
- 一级分类/二级分类/书签（如：开发/前端/react.dev）

禁止三层文件夹（如：开发/前端/框架/书签 是错误的）

## 整理方法

### 第一步：域名聚合
将相似域名聚合到一起：
- 同一产品/服务的不同子域名 → 合并
- 功能相似的网站 → 合并

### 第二步：形成分类
- 聚合后的组形成一级或二级分类
- 一级目录数量控制在 {{topLevelCount}} 个左右
- 每个分类至少 3 个域名，否则合并到更大类别

## 核心规则

### 1. 优先使用现有文件夹
- 如果 folderPaths 中已有合适的文件夹，优先将域名放入现有文件夹
- topHistoryDomains（Top {{topHistoryLimit}} 高频域名）应放入最匹配的一级分类文件夹
- 非高频域名可以放入二级分类文件夹

### 2. 聚合原则
- 宁粗勿细，避免过度细分
- 少于 3 个域名的分类 → 合并到更大类别
- 相似域名应聚合到同一文件夹

### 3. 配置开关
- strictHierarchy=true: 禁止新建一级目录
- allowNewFolders=false: 禁止新建任何目录
- preferOriginalPaths=true: 优先保留原路径

## 常见分类参考
- 开发: github, stackoverflow, npm, docker, gitlab
- 设计: figma, dribbble, behance, canva
- 社交: twitter, facebook, weibo, zhihu, reddit
- 视频: youtube, bilibili, netflix, twitch
- 购物: amazon, taobao, jd, ebay
- 新闻: bbc, cnn, sina, hackernews
- 工具: notion, trello, google, dropbox
- 学习: coursera, udemy, mooc, leetcode

## 输出格式（严格 JSON，无其他内容）
{
  "domainMoves": [
    {"domain": "github.com", "path": "开发"},
    {"domain": "react.dev", "path": "开发/前端"},
    {"domain": "figma.com", "path": "设计"}
  ],
  "fallbackPath": "其他"
}

## 硬性约束
1. 只输出 JSON，禁止解释文字、Markdown
2. 覆盖所有输入域名，domain 字符串必须与输入完全一致
3. path 只能是一级目录或一级/二级，禁止三层
4. 优先将域名放入现有的 folderPaths 文件夹中
5. 无法判断的域名放入 fallbackPath`;
