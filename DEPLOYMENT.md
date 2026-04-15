# 🚀 TMarks 部署指南

## 📹 视频教程

**完整部署教程视频**: [点击观看](https://bushutmarks.pages.dev/course/tmarks)

跟随视频教程，3 分钟完成部署。

---

## 开源用户一页部署指南

**前置条件**
- 有 Cloudflare 账号
- 有 GitHub 账号

---

### 1. 连接仓库并配置构建

1. 在 GitHub 上 Fork 本仓库
2. 打开 Cloudflare Dashboard → **Workers & Pages** → **Pages** → **创建项目**
3. 选择「连接到 Git」，选中你的 Fork
4. 构建配置：
   - 根目录：`tmarks`
   - 构建命令：`pnpm install && pnpm build:deploy`
   - 构建输出目录：`.deploy`
5. 保存并触发一次部署（第一次失败没关系，后面会修好）

### 2. 创建 Cloudflare 资源

1. **D1 数据库（必需）**
   - Workers & Pages → **D1 SQL Database** → Create database
   - 名称：`tmarks-prod-db`

2. **R2 存储桶（可选，快照用）**
   - R2 对象存储 → 创建存储桶
   - 名称：`tmarks-snapshots`
   - 不创建则快照功能不可用，但其他功能正常

> **注意**：KV 命名空间已不再需要，代码中已移除 KV 依赖

### 3. 在 Pages 项目中绑定资源

进入 Pages 项目 → **设置 → 函数**：

- **D1 绑定（必需）**：
  - 新建 D1 绑定，变量名：`DB` → 选择 `tmarks-prod-db`

- **R2 绑定（可选）**：
  - 新建 R2 绑定，变量名：`SNAPSHOTS_BUCKET` → 选择 `tmarks-snapshots`

> **重要**：如果之前配置过 KV 绑定（变量名 `TMARKS_KV`），请删除该绑定，代码中已不再使用 KV。
> 
> 没有 R2 时，可以跳过 R2 绑定，应用仍然可以启动（快照功能不可用）。

### 4. 配置环境变量

进入 Pages 项目 → **设置 → 环境变量（生产环境）**，复制以下配置：

```
ALLOW_REGISTRATION = "true"
ENVIRONMENT = "production"
JWT_ACCESS_TOKEN_EXPIRES_IN = "365d"
JWT_REFRESH_TOKEN_EXPIRES_IN = "365d"
R2_MAX_TOTAL_BYTES = "7516192768"
JWT_SECRET = "your-long-random-jwt-secret-at-least-48-characters"
ENCRYPTION_KEY = "your-long-random-encryption-key-at-least-48-characters"
```

> **重要**：`JWT_SECRET` 和 `ENCRYPTION_KEY` 必须替换为你自己生成的随机字符串（建议 ≥ 48 位）

### 5. 初始化数据库

1. 打开 **Workers & Pages → D1 SQL Database**
2. 进入 `tmarks-prod-db` → **Console**
3. 打开仓库中的以下 SQL 文件：
   - `tmarks/migrations/0001_d1_console.sql`
   - `tmarks/migrations/0002_d1_console_ai_settings.sql`
   - `tmarks/migrations/0100_d1_console.sql`
   - `tmarks/migrations/0101_d1_console.sql`
4. 复制全部 SQL，粘贴到控制台，点击 **Execute** 执行

### 6. 重新部署

1. 回到 Pages 项目 → 部署
2. 对之前失败的部署点击「重试」，或推送任意提交重新触发
3. 构建成功后，就可以访问你的 TMarks 站点了 🎉

> 之后更新：只要往 GitHub 推代码，Cloudflare 会自动重新构建和部署，之前配置的数据库 / R2 / 环境变量都不会丢。

---

## 常见问题

### 部署失败：KV namespace not found

**原因**：Cloudflare Pages Dashboard 中配置了 KV 绑定，但代码中已不再使用 KV。

**解决方案**：
1. 进入 Pages 项目 → 设置 → 函数
2. 找到 KV namespace bindings
3. 删除名为 `TMARKS_KV` 的绑定
4. 保存并重新部署

### 部署失败：D1 database not found

**原因**：D1 数据库绑定配置不正确或数据库不存在。

**解决方案**：
1. 确认已创建 D1 数据库 `tmarks-prod-db`
2. 进入 Pages 项目 → 设置 → 函数
3. 检查 D1 绑定：变量名必须是 `DB`，选择正确的数据库
4. 保存并重新部署

### 如何更新到最新版本

1. 在 GitHub 上同步你的 Fork（Sync fork 按钮）
2. Cloudflare Pages 会自动检测到更新并重新部署
3. 如果有数据库迁移，需要在 D1 Console 中执行新的 SQL 文件

---

## 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/ai-tmarks/tmarks.git
cd tmarks

# 2. 安装依赖
cd tmarks
pnpm install

# 3. 创建数据库并迁移
wrangler d1 create tmarks-prod-db --local
pnpm db:migrate:local

# 4. 启动开发服务器
pnpm dev

# 访问 http://localhost:5173
```

---

## 技术支持

- [问题反馈](https://github.com/ai-tmarks/tmarks/issues)
- [功能建议](https://github.com/ai-tmarks/tmarks/discussions)
- [视频教程](https://bushutmarks.pages.dev/course/tmarks)
