# 数据库表与 API 接口一致性审计报告

生成时间: 2026-04-15

## 📊 总体统计

- **总 API 端点数**: 73
- **总数据库表数**: 21
- **已使用的表数**: 17 (81.0%)
- **未使用的表数**: 4 (19.0%)
- **中间件/工具使用**: 3 (rate_limits, api_key_rate_limits, bookmark_images)

---

## ✅ 核心功能表使用情况

### 1. 书签相关 (Bookmarks)

| 表名 | 使用端点数 | 状态 |
|------|-----------|------|
| `bookmarks` | 37 | ✅ 核心表 |
| `bookmark_tags` | 24 | ✅ 活跃 |
| `bookmark_snapshots` | 16 | ✅ 活跃 |
| `bookmark_click_events` | 3 | ✅ 正常 |
| `bookmark_images` | 0 (工具函数使用) | ✅ 正常 |

**分析**: 
- 书签核心功能完整，包括标签、快照、点击统计
- `bookmark_images` 通过 `lib/image-upload.ts` 和 `lib/storage-quota.ts` 使用，用于封面图管理

### 2. 标签组相关 (Tab Groups)

| 表名 | 使用端点数 | 状态 |
|------|-----------|------|
| `tab_groups` | 22 | ✅ 核心表 |
| `tab_group_items` | 17 | ✅ 活跃 |
| `shares` | 4 | ✅ 正常 |

**分析**: 标签组功能完整，包括分享功能

### 3. 标签相关 (Tags)

| 表名 | 使用端点数 | 状态 |
|------|-----------|------|
| `tags` | 21 | ✅ 核心表 |

**分析**: 标签功能活跃，与书签紧密集成

### 4. 用户与认证

| 表名 | 使用端点数 | 状态 |
|------|-----------|------|
| `users` | 8 | ✅ 核心表 |
| `auth_tokens` | 3 | ✅ 正常 |
| `user_preferences` | 5 | ✅ 正常 |

**分析**: 用户认证和偏好设置功能正常

### 5. API 密钥管理

| 表名 | 使用端点数 | 状态 |
|------|-----------|------|
| `api_keys` | 2 | ✅ 正常 |
| `api_key_logs` | 1 | ✅ 正常 |
| `api_key_rate_limits` | 0 (中间件使用) | ✅ 正常 |

**分析**: 
- API 密钥基础功能正常
- `api_key_rate_limits` 在中间件 `rate-limiter.ts` 中使用，用于 API Key 速率限制

### 6. 审计与统计

| 表名 | 使用端点数 | 状态 |
|------|-----------|------|
| `audit_logs` | 6 | ✅ 正常 |
| `statistics` | 0 | ⚠️ 未使用 |

**分析**: 
- 审计日志功能正常
- `statistics` 表未使用，统计可能通过实时查询实现

---

## ⚠️ 未使用的数据库表

以下表在数据库中定义，但未被任何 API 端点直接使用：

### 1. `bookmark_images` ✅ 工具函数使用
- **定义位置**: `0001_d1_console.sql`
- **用途**: 存储书签封面图片（去重存储）
- **实际使用**: 
  - `lib/image-upload.ts` - 图片上传和管理
  - `lib/storage-quota.ts` - 存储配额计算
- **状态**: ✅ 正常使用，通过工具函数间接调用

### 2. `statistics`
- **定义位置**: `0001_d1_console.sql`
- **用途**: 存储每日统计数据
- **建议**: 
  - 检查是否有计划使用此表
  - 当前统计通过实时查询实现，考虑是否需要持久化

### 3. `registration_limits`
- **定义位置**: `0001_d1_console.sql`
- **用途**: 限制每日注册数量
- **建议**: 
  - 检查注册限流逻辑是否在其他地方实现
  - 如果功能已实现，添加对应的 API 使用

### 4. `ai_settings`
- **定义位置**: `0002_d1_console_ai_settings.sql`
- **用途**: AI 功能配置
- **建议**: 
  - 这是新功能表，可能尚未实现 API
  - 需要添加 AI 设置相关的 API 端点

### 5. `api_key_rate_limits` ✅ 中间件使用
- **定义位置**: `0103_api_key_rate_limits.sql`
- **用途**: API 密钥速率限制
- **实际使用**: `lib/api-key/rate-limiter.ts` - API Key 速率限制中间件
- **状态**: ✅ 正常使用，在中间件层面使用

### 6. `rate_limits` ✅ 中间件使用
- **定义位置**: `0104_rate_limits.sql`
- **用途**: 通用速率限制
- **实际使用**: `lib/rate-limit.ts` - 通用速率限制工具
- **状态**: ✅ 正常使用，在中间件层面使用

### 7. `schema_migrations`
- **定义位置**: `0001_d1_console.sql`
- **用途**: 数据库迁移版本管理
- **状态**: ✅ 系统表，正常未使用

---

## 📍 API 端点分类

### /api/tab/* (扩展 API - 需要 API Key)
- 共 34 个端点
- 主要功能：书签、标签组、标签、搜索、统计
- 认证方式：API Key (X-API-Key header)

### /api/v1/* (Web API - 需要 JWT)
- 共 35 个端点
- 主要功能：认证、书签、标签组、标签、设置、统计
- 认证方式：JWT Token

### /api/public/* (公开 API)
- 1 个端点：公开分享页面
- 无需认证

### /api/share/* (分享 API)
- 1 个端点：标签组分享
- 通过 token 访问

### /api/snapshot-images/* (快照图片)
- 1 个端点：获取快照图片
- 需要签名验证

---

## 🔍 潜在问题与建议

### 1. 真正未使用的表

**需要确认的表**:
- `ai_settings`: 需要实现 AI 设置 API（新功能）
- `statistics`: 评估是否需要持久化统计数据
- `registration_limits`: 确认注册限流策略

### 2. API 一致性

**建议**:
- `/api/tab/*` 和 `/api/v1/*` 存在功能重复
- 考虑统一 API 设计，减少维护成本
- 明确两套 API 的使用场景和差异

### 3. 缺失的功能

**可能需要添加的 API**:
- AI 设置管理 (`/api/v1/settings/ai`)
- 注册限流管理 (管理员功能)
- 速率限制查询 API（如果需要对外暴露）

### 4. 数据完整性

**建议检查**:
- 所有外键约束是否正确设置
- 级联删除是否符合业务逻辑
- 索引是否覆盖常用查询

---

## 📋 详细端点列表

### 书签管理 (Bookmarks)

#### /api/tab/bookmarks
- `GET` - 获取书签列表
- `POST` - 创建书签
- 使用表: `bookmarks`, `tags`, `bookmark_tags`, `bookmark_snapshots`

#### /api/tab/bookmarks/:id
- `GET` - 获取书签详情
- `PATCH` - 更新书签
- `DELETE` - 软删除书签
- 使用表: `bookmarks`, `tags`, `bookmark_tags`, `bookmark_snapshots`

#### /api/tab/bookmarks/:id/click
- `POST` - 记录书签点击
- 使用表: `bookmarks`, `bookmark_click_events`

#### /api/tab/bookmarks/:id/snapshots
- `GET` - 获取快照列表
- `POST` - 创建快照
- 使用表: `bookmarks`, `bookmark_snapshots`, `user_preferences`

#### /api/tab/bookmarks/batch
- `POST` - 批量创建书签
- 使用表: `bookmarks`, `tags`, `bookmark_tags`, `audit_logs`

#### /api/tab/bookmarks/trash
- `GET` - 获取回收站书签
- 使用表: `bookmarks`, `tags`, `bookmark_tags`

#### /api/tab/bookmarks/trash/empty
- `DELETE` - 清空回收站
- 使用表: `bookmarks`, `bookmark_tags`, `bookmark_snapshots`

### 标签组管理 (Tab Groups)

#### /api/tab/tab-groups
- `GET` - 获取标签组列表
- `POST` - 创建标签组
- 使用表: `tab_groups`, `tab_group_items`

#### /api/tab/tab-groups/:id
- `GET` - 获取标签组详情
- `PATCH` - 更新标签组
- `DELETE` - 删除标签组
- 使用表: `tab_groups`, `tab_group_items`

#### /api/tab/tab-groups/:id/share
- `POST` - 创建分享
- `DELETE` - 删除分享
- 使用表: `tab_groups`, `shares`

### 标签管理 (Tags)

#### /api/tab/tags
- `GET` - 获取标签列表
- `POST` - 创建标签
- 使用表: `tags`, `bookmark_tags`

#### /api/tab/tags/:id
- `GET` - 获取标签详情
- `PATCH` - 更新标签
- `DELETE` - 删除标签
- 使用表: `tags`, `bookmark_tags`

### 认证 (Authentication)

#### /api/v1/auth/register
- `POST` - 用户注册
- 使用表: `users`, `user_preferences`, `audit_logs`

#### /api/v1/auth/login
- `POST` - 用户登录
- 使用表: `users`, `auth_tokens`, `audit_logs`

#### /api/v1/auth/logout
- `POST` - 用户登出
- 使用表: `auth_tokens`, `audit_logs`

#### /api/v1/auth/refresh
- `POST` - 刷新 Token
- 使用表: `users`, `auth_tokens`, `audit_logs`

### 设置 (Settings)

#### /api/v1/preferences
- `GET` - 获取用户偏好
- `PUT` - 更新用户偏好
- 使用表: `user_preferences`

#### /api/v1/settings/api-keys
- `GET` - 获取 API 密钥列表
- `POST` - 创建 API 密钥
- 使用表: `api_keys`

#### /api/v1/settings/api-keys/:id
- `GET` - 获取 API 密钥详情
- `PATCH` - 更新 API 密钥
- `DELETE` - 删除 API 密钥
- 使用表: `api_keys`, `api_key_logs`

#### /api/v1/settings/share
- `GET` - 获取公开分享设置
- `PUT` - 更新公开分享设置
- 使用表: `users`

### 统计 (Statistics)

#### /api/tab/statistics
- `GET` - 获取统计数据
- 使用表: `tab_groups`, `tab_group_items`, `shares`

#### /api/v1/statistics
- `GET` - 获取统计数据
- 使用表: `tab_groups`, `tab_group_items`

#### /api/v1/bookmarks/statistics
- `GET` - 获取书签统计
- 使用表: `bookmarks`, `tags`, `bookmark_tags`, `bookmark_click_events`

---

## 🎯 行动建议

### 立即执行
1. ✅ 修复导入路径问题（已完成）
2. ✅ 确认速率限制功能的实现位置（已确认在中间件中）
3. ✅ 确认 bookmark_images 功能（已确认在工具函数中）

### 短期计划
1. 实现 AI 设置相关 API
2. 评估 `statistics` 表的使用需求
3. 确认 `registration_limits` 的实现方式

### 长期规划
1. 统一 `/api/tab/*` 和 `/api/v1/*` 的设计
2. 完善 API 文档
3. 添加更多的统计和分析功能

---

## 📝 备注

- 本报告基于代码静态分析生成
- 未包含中间件和工具函数中的数据库操作
- 建议定期更新此报告以保持同步
