# 📚 TMarks 技术文档

## 🎯 项目概述

TMarks 是一个全栈书签管理系统，基于 Cloudflare Workers + D1 数据库构建，提供书签管理、标签系统、标签页组管理、公开分享等功能。

### 技术栈

**前端：**
- React 18 + TypeScript
- Vite 6.3
- TailwindCSS 4
- React Query (@tanstack/react-query)
- React Router v7
- Zustand (状态管理)
- @dnd-kit (拖拽功能)

**后端：**
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Cloudflare KV (缓存)

**开发工具：**
- Wrangler (Cloudflare CLI)
- ESLint + Prettier
- Husky (Git hooks)

---

## 📁 项目结构

```
tmarks/
├── src/                          # 前端源代码
│   ├── components/               # React 组件
│   │   ├── bookmarks/           # 书签相关组件
│   │   ├── tags/                # 标签相关组件
│   │   ├── tab-groups/          # 标签页组组件
│   │   ├── common/              # 通用组件
│   │   ├── layout/              # 布局组件
│   │   └── import-export/       # 导入导出组件
│   ├── pages/                   # 页面组件
│   │   ├── bookmarks/           # 书签页面
│   │   ├── share/               # 公开分享页面
│   │   ├── tab-groups/          # 标签页组页面
│   │   └── settings/            # 设置页面
│   ├── hooks/                   # 自定义 Hooks
│   ├── services/                # API 服务
│   ├── stores/                  # Zustand 状态管理
│   ├── lib/                     # 工具库
│   └── styles/                  # 样式文件
├── functions/                   # Cloudflare Workers 函数
│   ├── api/                     # API 路由
│   │   ├── auth/                # 认证相关
│   │   ├── bookmarks/           # 书签 API
│   │   ├── tags/                # 标签 API
│   │   ├── tab-groups/          # 标签页组 API
│   │   ├── public/              # 公开分享 API
│   │   └── v1/                  # API v1 版本
│   ├── lib/                     # 后端工具库
│   │   ├── import-export/       # 导入导出逻辑
│   │   └── types.ts             # 类型定义
│   └── middleware/              # 中间件
│       ├── auth.ts              # 认证中间件
│       ├── security.ts          # 安全中间件
│       └── rate-limit.ts        # 限流中间件
├── migrations/                  # 数据库迁移文件
├── shared/                      # 前后端共享代码
└── wrangler.toml               # Cloudflare Workers 配置
```

---

## 🧩 核心功能模块

### 1. 认证系统

**文件位置：** `functions/api/auth/`

**功能：**
- 用户注册 (`POST /api/auth/register`)
- 用户登录 (`POST /api/auth/login`)
- Token 刷新 (`POST /api/auth/refresh`)
- 用户登出 (`POST /api/auth/logout`)

**认证流程：**
1. 用户登录 → 生成 JWT Access Token (1小时) + Refresh Token (30天)
2. 请求 API → 携带 Access Token
3. Token 过期 → 使用 Refresh Token 刷新
4. Refresh Token 过期 → 重新登录

**中间件：**
- `requireAuth` - 验证 JWT Token
- `dualAuth` - 支持 JWT 或 API Key 认证

### 2. 书签管理

**文件位置：** `functions/api/bookmarks/`, `src/pages/bookmarks/`

**核心组件：**
- `BookmarksPage` - 书签列表页面
- `BookmarkCard` - 书签卡片组件
- `BookmarkForm` - 书签表单组件
- `BookmarkListContainer` - 书签列表容器

**主要功能：**
- 创建书签 (`POST /api/bookmarks`)
- 更新书签 (`PUT /api/bookmarks/:id`)
- 删除书签 (`DELETE /api/bookmarks/:id`)
- 获取书签列表 (`GET /api/bookmarks`)
  - 支持分页（游标分页）
  - 支持筛选（标签、关键词、归档状态）
  - 支持排序（创建时间、更新时间、置顶）
- 置顶/取消置顶
- 归档/取消归档
- 批量操作

**Props 说明：**

`BookmarkCard` 组件：
```typescript
interface BookmarkCardProps {
  bookmark: Bookmark          // 书签数据
  viewMode: ViewMode          // 显示模式：list/minimal/card/title
  onEdit?: (bookmark: Bookmark) => void
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => void
  onToggleArchive?: (id: string) => void
}
```

### 3. 标签系统

**文件位置：** `functions/api/tags/`, `src/components/tags/`

**核心组件：**
- `TagSidebar` - 标签侧边栏
- `TagSelector` - 标签选择器
- `TagBadge` - 标签徽章

**主要功能：**
- 创建标签 (`POST /api/tags`)
- 更新标签 (`PUT /api/tags/:id`)
- 删除标签 (`DELETE /api/tags/:id`)
- 获取标签列表 (`GET /api/tags`)
- 标签统计（书签数量）
- 标签颜色管理

**标签筛选逻辑：**
- 支持多标签交集筛选
- SQL 查询使用 `GROUP BY` + `HAVING COUNT`

```sql
SELECT DISTINCT b.*
FROM bookmarks b
INNER JOIN bookmark_tags bt ON b.id = bt.bookmark_id
WHERE bt.tag_id IN (?, ?, ?)
GROUP BY b.id
HAVING COUNT(DISTINCT bt.tag_id) = ?  -- 标签数量
```

### 4. 标签页组管理

**文件位置：** `functions/api/tab-groups/`, `src/pages/tab-groups/`

**核心组件：**
- `TabGroupsPage` - 标签页组列表页面
- `TabGroupCard` - 标签页组卡片
- `TabGroupDetail` - 标签页组详情
- `TabItem` - 标签页项目

**主要功能：**
- 创建标签页组 (`POST /api/tab-groups`)
- 更新标签页组 (`PUT /api/tab-groups/:id`)
- 删除标签页组 (`DELETE /api/tab-groups/:id`)
- 获取标签页组列表 (`GET /api/tab-groups`)
- 添加/删除标签页项目
- 拖拽排序（使用 @dnd-kit）
- 层级结构（文件夹）
- 分享功能

**拖拽功能：**
- 使用 `@dnd-kit/core` 和 `@dnd-kit/sortable`
- 支持标签页组排序
- 支持标签页项目排序
- 支持跨组拖拽

### 5. 公开分享

**文件位置：** `functions/api/public/`, `src/pages/share/`

**核心组件：**
- `PublicSharePage` - 公开分享页面
- `ShareSettingsPage` - 分享设置页面

**主要功能：**
- 启用/禁用公开分享
- 自定义分享 slug
- 自定义页面标题和描述
- 筛选公开书签（可见性、标签、关键词）
- 前端分页显示
- 后端分页 API（已实现，备用）

**分享 URL 格式：**
```
https://your-domain.com/share/{slug}
```

**API 端点：**
- `GET /api/public/{slug}` - 获取公开分享数据
- `GET /api/public/{slug}?page_size=30&page_cursor=xxx` - 分页获取

**缓存策略：**
- 完整数据缓存：10分钟
- 分页数据缓存：5分钟
- 标签统计缓存：30分钟

### 6. 导入/导出

**文件位置：** `functions/api/v1/import.ts`, `functions/api/v1/export.ts`

**支持格式：**
- HTML (Netscape Bookmark File Format)
- JSON (TMarks 格式)
- CSV

**导出功能：**
- `GET /api/v1/export?format=html|json|csv`
- 包含书签、标签、标签页组

**导入功能：**
- `POST /api/v1/import`
- 支持文件上传
- 自动解析格式
- 去重处理

---

## 🔌 API 端点列表

### 认证相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |
| POST | `/api/auth/refresh` | 刷新 Token | ❌ |
| POST | `/api/auth/logout` | 用户登出 | ✅ |
| GET | `/api/me` | 获取当前用户信息 | ✅ |

### 书签相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/bookmarks` | 获取书签列表 | ✅ |
| POST | `/api/bookmarks` | 创建书签 | ✅ |
| GET | `/api/bookmarks/:id` | 获取书签详情 | ✅ |
| PUT | `/api/bookmarks/:id` | 更新书签 | ✅ |
| DELETE | `/api/bookmarks/:id` | 删除书签 | ✅ |
| PUT | `/api/bookmarks/:id/pin` | 置顶/取消置顶 | ✅ |
| PUT | `/api/bookmarks/:id/archive` | 归档/取消归档 | ✅ |

### 标签相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/tags` | 获取标签列表 | ✅ |
| POST | `/api/tags` | 创建标签 | ✅ |
| GET | `/api/tags/:id` | 获取标签详情 | ✅ |
| PUT | `/api/tags/:id` | 更新标签 | ✅ |
| DELETE | `/api/tags/:id` | 删除标签 | ✅ |

### 标签页组相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/tab-groups` | 获取标签页组列表 | ✅ |
| POST | `/api/tab-groups` | 创建标签页组 | ✅ |
| GET | `/api/tab-groups/:id` | 获取标签页组详情 | ✅ |
| PUT | `/api/tab-groups/:id` | 更新标签页组 | ✅ |
| DELETE | `/api/tab-groups/:id` | 删除标签页组 | ✅ |
| POST | `/api/tab-groups/:id/items` | 添加标签页项目 | ✅ |
| PUT | `/api/tab-groups/:id/items/:itemId` | 更新标签页项目 | ✅ |
| DELETE | `/api/tab-groups/:id/items/:itemId` | 删除标签页项目 | ✅ |

### 公开分享相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/settings/share` | 获取分享设置 | ✅ |
| PUT | `/api/settings/share` | 更新分享设置 | ✅ |
| GET | `/api/public/:slug` | 获取公开分享数据 | ❌ |

### 导入/导出相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/export` | 导出数据 | ✅ |
| POST | `/api/v1/import` | 导入数据 | ✅ |

### 搜索相关

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/search` | 搜索书签和标签 | ✅ |

---

## 🔐 安全机制

### 1. 认证授权
- JWT Token 认证（Access Token + Refresh Token）
- API Key 认证（用于浏览器扩展）
- 密码使用 bcrypt 加密（10 轮）

### 2. 输入验证
- 所有输入都经过验证和清理
- URL 验证
- 邮箱验证
- 用户名验证（3-20字符，字母数字下划线）

### 3. SQL 注入防护
- 使用参数化查询
- 不拼接 SQL 字符串

### 4. XSS 防护
- React 自动转义
- 用户输入清理

### 5. CORS 配置
- 允许的源：配置在 `wrangler.toml`
- 允许的方法：GET, POST, PUT, DELETE, OPTIONS
- 允许的头：Content-Type, Authorization

### 6. 限流
- 登录限流：5次/分钟
- 注册限流：3次/小时
- API 限流：100次/分钟

---

## 📊 性能优化

### 1. 数据库优化
- 使用索引加速查询
- 游标分页（避免 OFFSET）
- 批量查询（避免 N+1）
- 软删除（deleted_at）

### 2. 缓存策略
- KV 缓存公开分享数据
- React Query 缓存 API 响应
- 浏览器缓存静态资源

### 3. 前端优化
- 代码分割（React.lazy）
- 图片懒加载
- 虚拟滚动（大列表）
- 防抖/节流

### 4. 构建优化
- Vite 构建优化
- Gzip/Brotli 压缩
- Tree shaking
- CSS 压缩

---

## 🧪 测试

### 单元测试
```bash
npm run test
```

### 类型检查
```bash
npm run type-check
```

### Lint 检查
```bash
npm run lint
```

---

## 📦 部署

### 本地开发
```bash
npm run dev          # 前端开发服务器
npm run cf:dev       # Cloudflare Workers 本地开发
```

### 构建
```bash
npm run build        # 构建前端
```

### 部署
```bash
npm run cf:deploy    # 部署到 Cloudflare Workers
npm run db:migrate   # 运行数据库迁移
```

---

## 📞 故障排查

### 常见问题

**1. 数据库连接失败**
- 检查 `wrangler.toml` 中的数据库 ID
- 确认数据库已创建
- 运行迁移：`npm run db:migrate`

**2. 认证失败**
- 检查 JWT_SECRET 环境变量
- 清除浏览器缓存和 localStorage
- 重新登录

**3. API 请求失败**
- 检查 CORS 配置
- 检查路由配置
- 查看 Workers 日志：`npm run cf:tail`

**4. 构建失败**
- 清除 node_modules：`rm -rf node_modules && npm install`
- 清除构建缓存：`rm -rf dist .wrangler`
- 检查 TypeScript 错误：`npm run type-check`

---

## 📚 参考资料

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/)

