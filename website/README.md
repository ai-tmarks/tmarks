# TMarks 官方网站

TMarks 官方网站项目，使用 Astro 5 + React 19 + TailwindCSS 4 构建。

## 🚀 技术栈

- **框架**: Astro 5.x
- **UI 组件**: React 19
- **样式**: TailwindCSS 4 + CSS 变量（OKLCH）
- **主题**: 亮色/暗色 + 多色彩主题
- **部署**: Cloudflare Pages

## 📁 项目结构

```
website/
├── public/                 # 静态资源
│   ├── images/            # 图片
│   └── favicon.ico
├── src/
│   ├── components/        # 组件
│   │   ├── layout/       # 布局组件
│   │   ├── home/         # 首页组件
│   │   ├── pricing/      # 定价组件
│   │   └── common/       # 通用组件
│   ├── layouts/          # 页面布局
│   ├── pages/            # 页面
│   ├── styles/           # 样式
│   │   ├── global.css
│   │   └── themes/       # 主题
│   └── lib/              # 工具库
├── astro.config.mjs      # Astro 配置
├── tailwind.config.mjs   # TailwindCSS 配置
├── tsconfig.json         # TypeScript 配置
└── package.json
```

## 🛠️ 开发

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:4321

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 🚀 部署

### 部署到 Cloudflare Pages

```bash
npm run deploy
```

或者通过 Cloudflare Pages 控制台连接 Git 仓库自动部署。

### 部署配置

- **构建命令**: `npm run build`
- **构建输出目录**: `dist`
- **Node 版本**: 18+

## 🎨 设计系统

### 颜色系统

使用 OKLCH 颜色空间，通过 CSS 变量实现主题切换：

- `--background` - 背景色
- `--foreground` - 前景色
- `--primary` - 主色调
- `--card` - 卡片背景
- `--border` - 边框颜色

### 主题

- **default** - 默认主题（黑白）
- **orange** - 橙色主题

### 组件样式

- **玻璃态效果** - `.glass`
- **渐变文字** - `.gradient-text`
- **按钮** - `.btn-primary`, `.btn-secondary`
- **卡片** - `.feature-card`

## 📝 页面

- `/` - 首页
- `/features` - 功能介绍
- `/pricing` - 定价
- `/docs` - 文档中心
- `/blog` - 博客
- `/about` - 关于我们
- `/contact` - 联系我们

## 🔧 配置

### Astro 配置

见 `astro.config.mjs`

### TailwindCSS 配置

见 `tailwind.config.mjs`

### TypeScript 配置

见 `tsconfig.json`

## 📄 许可证

ISC License

## 📞 联系我们

- Email: support@tmarks.669696.xyz
- Discord: [加入社区](https://discord.gg/tmarks)
- Twitter: [@TMarks](https://twitter.com/tmarks)

