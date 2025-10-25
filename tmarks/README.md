# TMarks - AI 驱动的书签管理系统

<div align="center">

**智能、高效、优雅的书签管理解决方案**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-f38020.svg)](https://workers.cloudflare.com/)

</div>

---

## ✨ 特性

### 🎯 核心功能

- **AI 智能标签** - 自动生成和推荐标签，智能分类书签
- **标签页组管理** - 保存和管理浏览器标签页组，支持拖拽排序
- **公开分享** - 创建分享链接，展示精选书签集合
- **全文搜索** - 快速搜索书签标题、描述和 URL
- **批量操作** - 批量编辑、删除、导出书签
- **导入导出** - 支持 HTML、JSON、CSV 格式

### 🎨 用户体验

- **响应式设计** - 完美适配桌面端和移动端
- **多种视图模式** - 卡片、列表、极简、瀑布流
- **拖拽排序** - 直观的拖拽操作
- **实时同步** - 浏览器扩展与 Web 应用实时同步
- **离线支持** - 浏览器扩展支持离线访问

### 🔒 安全与性能

- **JWT 认证** - 安全的用户认证机制
- **API Key 管理** - 支持 API 访问控制
- **性能优化** - 搜索防抖、虚拟滚动、代码分割
- **生产级别** - 完善的错误处理和日志管理

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+ (推荐) 或 npm
- Cloudflare 账号（用于部署）

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd tmarks

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.development

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5173
```

### 数据库设置

```bash
# 本地数据库迁移
pnpm db:migrate:local

# 生产数据库迁移
pnpm db:migrate
```

---

## 📦 技术栈

### 前端

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **样式**: TailwindCSS 4 (alpha)
- **状态管理**: Zustand
- **数据获取**: @tanstack/react-query
- **路由**: React Router v7
- **拖拽**: @dnd-kit
- **图标**: lucide-react

### 后端

- **运行时**: Cloudflare Workers (Pages Functions)
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **认证**: JWT (Access + Refresh tokens)

### 开发工具

- **代码质量**: ESLint 9 + Prettier
- **类型检查**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged
- **压缩**: Gzip + Brotli

---

## 📁 项目结构

```
tmarks/
├── src/                      # 前端源代码
│   ├── components/          # React 组件
│   │   ├── bookmarks/      # 书签相关组件
│   │   ├── tags/           # 标签相关组件
│   │   ├── tab-groups/     # 标签页组组件
│   │   └── common/         # 通用组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hooks
│   ├── services/           # API 服务
│   ├── stores/             # Zustand 状态管理
│   ├── lib/                # 工具函数和类型
│   └── styles/             # 全局样式
├── functions/              # Cloudflare Workers 后端
│   ├── api/               # API 路由
│   ├── lib/               # 后端工具
│   └── middleware/        # 中间件
├── migrations/            # 数据库迁移文件
└── shared/               # 前后端共享代码
```

---

## 🛠️ 开发命令

```bash
# 开发
pnpm dev              # 启动前端开发服务器
pnpm cf:dev           # 启动 Cloudflare Workers 本地开发

# 构建
pnpm build            # 构建生产版本
pnpm preview          # 预览生产构建

# 代码质量
pnpm lint             # 运行 ESLint
pnpm format           # 格式化代码
pnpm type-check       # TypeScript 类型检查

# 部署
pnpm cf:deploy        # 部署到 Cloudflare

# 数据库
pnpm db:migrate       # 运行生产数据库迁移
pnpm db:migrate:local # 运行本地数据库迁移
```

---

## 🔧 配置

### 环境变量

创建 `.env.development` 文件：

```env
# API 配置
VITE_API_URL=http://localhost:8787/api/v1

# Cloudflare 配置（用于本地开发）
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### Cloudflare 配置

编辑 `wrangler.toml`：

```toml
name = "tmarks"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "tmarks-prod-db"
database_id = "your_database_id"

[[kv_namespaces]]
binding = "KV"
id = "your_kv_id"
```

---

## 📖 API 文档

### 认证

```bash
# 注册
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "user",
  "password": "password",
  "email": "user@example.com"
}

# 登录
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "user",
  "password": "password"
}
```

### 书签

```bash
# 获取书签列表
GET /api/v1/bookmarks?keyword=search&tags=tag1,tag2&sort=popular

# 创建书签
POST /api/v1/bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Example",
  "url": "https://example.com",
  "description": "Description",
  "tags": ["tag1", "tag2"]
}

# 更新书签
PUT /api/v1/bookmarks/:id
Authorization: Bearer <token>

# 删除书签
DELETE /api/v1/bookmarks/:id
Authorization: Bearer <token>
```

### 标签页组

```bash
# 获取标签页组列表
GET /api/v1/tab-groups
Authorization: Bearer <token>

# 创建标签页组
POST /api/v1/tab-groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Tabs",
  "items": [
    {
      "title": "Example",
      "url": "https://example.com"
    }
  ]
}
```

---

## 🎨 浏览器扩展

TMarks 提供配套的浏览器扩展（Chrome/Edge），支持：

- 一键保存当前标签页
- AI 自动生成标签
- 与 Web 应用实时同步
- 离线访问书签
- 快速搜索和打开

扩展源码位于 `../tab/` 目录。

---

## 🚀 部署

### Cloudflare Pages

1. 连接 GitHub 仓库到 Cloudflare Pages
2. 配置构建设置：
   - 构建命令: `npm run build`
   - 输出目录: `dist`
3. 配置环境变量
4. 部署

### 数据库迁移

```bash
# 首次部署后运行数据库迁移
pnpm db:migrate
```

---

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript strict mode
- 遵循 ESLint 和 Prettier 配置
- 编写清晰的提交信息
- 添加必要的注释和文档

---

## 📝 开发日志

### 性能优化

- ✅ 搜索防抖优化（200-800ms）
- ✅ React Query 缓存策略
- ✅ 代码分割和懒加载
- ✅ Gzip + Brotli 压缩
- ✅ 生产环境日志清理

### 最近更新

- ✅ 标签页组拖拽排序
- ✅ 批量操作功能
- ✅ 公开分享功能
- ✅ 导入导出优化
- ✅ 移动端适配

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [React](https://reactjs.org/) - UI 框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Cloudflare](https://www.cloudflare.com/) - 部署平台
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Lucide](https://lucide.dev/) - 图标库

---

## 📧 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [GitHub Issues]
- 邮箱: [your-email@example.com]

---

<div align="center">

**用 ❤️ 打造的智能书签管理系统**

⭐ 如果这个项目对你有帮助，请给个 Star！

</div>
