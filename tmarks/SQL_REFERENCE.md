# 📊 TMarks SQL 参考文档

## 📋 目录

1. [数据库架构](#数据库架构)
2. [表结构详解](#表结构详解)
3. [索引列表](#索引列表)
4. [常用查询](#常用查询)
5. [迁移管理](#迁移管理)
6. [性能优化](#性能优化)

---

## 数据库架构

### 核心表

| 表名 | 说明 | 记录数估计 |
|------|------|-----------|
| `users` | 用户表 | 小 |
| `auth_tokens` | 认证令牌表 | 中 |
| `bookmarks` | 书签表 | 大 |
| `tags` | 标签表 | 中 |
| `bookmark_tags` | 书签-标签关联表 | 大 |
| `api_keys` | API 密钥表 | 小 |
| `preferences` | 用户偏好设置表 | 小 |
| `tab_groups` | 标签页组表 | 中 |
| `tab_group_items` | 标签页组项目表 | 大 |
| `shares` | 分享表 | 小 |
| `statistics` | 统计表 | 小 |

### 关系图

```
users (1) ─────┬─── (N) bookmarks
               ├─── (N) tags
               ├─── (N) api_keys
               ├─── (1) preferences
               ├─── (N) tab_groups
               └─── (N) auth_tokens

bookmarks (N) ───── (N) tags (通过 bookmark_tags)

tab_groups (1) ───── (N) tab_group_items
tab_groups (1) ───── (N) tab_groups (层级关系)
tab_groups (1) ───── (1) shares
```

---

## 表结构详解

### 1. users - 用户表

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  username TEXT NOT NULL UNIQUE,          -- 用户名（唯一）
  email TEXT UNIQUE,                      -- 邮箱（可选，唯一）
  password_hash TEXT NOT NULL,            -- 密码哈希（bcrypt）
  role TEXT DEFAULT 'user',               -- 角色：user/admin
  public_share_enabled INTEGER DEFAULT 0, -- 是否启用公开分享
  public_slug TEXT UNIQUE,                -- 公开分享 slug
  public_page_title TEXT,                 -- 公开页面标题
  public_page_description TEXT,           -- 公开页面描述
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL                -- 更新时间
);
```

**索引：**
- `idx_users_username_lower` - 用户名（不区分大小写）
- `idx_users_email_lower` - 邮箱（不区分大小写）
- `idx_users_public_slug` - 公开分享 slug

### 2. bookmarks - 书签表

```sql
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,                  -- 用户 ID
  title TEXT NOT NULL,                    -- 标题
  url TEXT NOT NULL,                      -- URL
  description TEXT,                       -- 描述
  cover_image TEXT,                       -- 封面图片
  is_pinned INTEGER DEFAULT 0,            -- 是否置顶
  is_archived INTEGER DEFAULT 0,          -- 是否归档
  is_public INTEGER DEFAULT 0,            -- 是否公开
  click_count INTEGER DEFAULT 0,          -- 点击次数
  last_clicked_at TEXT,                   -- 最后点击时间
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL,               -- 更新时间
  deleted_at TEXT,                        -- 删除时间（软删除）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, url)                    -- 每个用户的 URL 唯一
);
```

**索引：**
- `idx_bookmarks_user_id` - 用户 ID
- `idx_bookmarks_created_at` - 创建时间
- `idx_bookmarks_updated_at` - 更新时间
- `idx_bookmarks_is_pinned` - 是否置顶
- `idx_bookmarks_is_archived` - 是否归档
- `idx_bookmarks_is_public` - 是否公开
- `idx_bookmarks_deleted_at` - 删除时间

### 3. tags - 标签表

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,                  -- 用户 ID
  name TEXT NOT NULL,                     -- 标签名
  color TEXT,                             -- 颜色（HEX）
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL,               -- 更新时间
  deleted_at TEXT,                        -- 删除时间（软删除）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)                   -- 每个用户的标签名唯一
);
```

**索引：**
- `idx_tags_user_id` - 用户 ID
- `idx_tags_name` - 标签名
- `idx_tags_deleted_at` - 删除时间

### 4. bookmark_tags - 书签-标签关联表

```sql
CREATE TABLE bookmark_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,                  -- 用户 ID（冗余，便于查询）
  bookmark_id TEXT NOT NULL,              -- 书签 ID
  tag_id TEXT NOT NULL,                   -- 标签 ID
  created_at TEXT NOT NULL,               -- 创建时间
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(bookmark_id, tag_id)             -- 防止重复关联
);
```

**索引：**
- `idx_bookmark_tags_bookmark_id` - 书签 ID
- `idx_bookmark_tags_tag_id` - 标签 ID
- `idx_bookmark_tags_user_id` - 用户 ID

### 5. tab_groups - 标签页组表

```sql
CREATE TABLE tab_groups (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,                  -- 用户 ID
  title TEXT NOT NULL,                    -- 标题
  color TEXT,                             -- 颜色
  tags TEXT,                              -- 标签（JSON 数组）
  parent_id TEXT,                         -- 父组 ID（层级）
  is_folder INTEGER DEFAULT 0,            -- 是否为文件夹
  position INTEGER DEFAULT 0,             -- 排序位置
  is_deleted INTEGER DEFAULT 0,           -- 是否删除
  deleted_at TEXT,                        -- 删除时间
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL,               -- 更新时间
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES tab_groups(id) ON DELETE SET NULL
);
```

**索引：**
- `idx_tab_groups_user_id` - 用户 ID
- `idx_tab_groups_parent_id` - 父组 ID
- `idx_tab_groups_is_folder` - 是否为文件夹
- `idx_tab_groups_position` - 排序位置

### 6. tab_group_items - 标签页组项目表

```sql
CREATE TABLE tab_group_items (
  id TEXT PRIMARY KEY,                    -- UUID
  group_id TEXT NOT NULL,                 -- 组 ID
  title TEXT NOT NULL,                    -- 标题
  url TEXT NOT NULL,                      -- URL
  favicon TEXT,                           -- 网站图标
  position INTEGER DEFAULT 0,             -- 排序位置
  is_completed INTEGER DEFAULT 0,         -- 是否完成（TODO）
  is_important INTEGER DEFAULT 0,         -- 是否重要
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL,               -- 更新时间
  FOREIGN KEY (group_id) REFERENCES tab_groups(id) ON DELETE CASCADE
);
```

**索引：**
- `idx_tab_group_items_group_id` - 组 ID
- `idx_tab_group_items_position` - 排序位置

---

## 索引列表

### 性能关键索引

| 索引名 | 表名 | 字段 | 用途 |
|--------|------|------|------|
| `idx_bookmarks_user_id` | bookmarks | user_id | 用户书签查询 |
| `idx_bookmarks_created_at` | bookmarks | created_at | 按时间排序 |
| `idx_bookmarks_is_public` | bookmarks | is_public | 公开书签查询 |
| `idx_bookmark_tags_bookmark_id` | bookmark_tags | bookmark_id | 书签标签查询 |
| `idx_bookmark_tags_tag_id` | bookmark_tags | tag_id | 标签书签查询 |
| `idx_tags_user_id` | tags | user_id | 用户标签查询 |

### 复合索引建议

```sql
-- 书签查询优化（用户 + 删除状态 + 创建时间）
CREATE INDEX idx_bookmarks_user_deleted_created 
ON bookmarks(user_id, deleted_at, created_at DESC);

-- 标签统计优化（用户 + 删除状态）
CREATE INDEX idx_tags_user_deleted 
ON tags(user_id, deleted_at);

-- 书签标签关联优化（用户 + 书签 + 标签）
CREATE INDEX idx_bookmark_tags_user_bookmark_tag 
ON bookmark_tags(user_id, bookmark_id, tag_id);
```

---

## 常用查询

### 1. 获取用户所有书签（分页）

```sql
SELECT b.*
FROM bookmarks b
WHERE b.user_id = ? 
  AND b.deleted_at IS NULL
ORDER BY b.is_pinned DESC, b.created_at DESC
LIMIT ? OFFSET ?;
```

### 2. 获取书签的所有标签

```sql
SELECT t.id, t.name, t.color
FROM tags t
INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
WHERE bt.bookmark_id = ? 
  AND t.deleted_at IS NULL
ORDER BY t.name;
```

### 3. 按标签筛选书签（交集）

```sql
SELECT DISTINCT b.*
FROM bookmarks b
INNER JOIN bookmark_tags bt ON b.id = bt.bookmark_id
WHERE bt.tag_id IN (?, ?, ?)  -- 标签 ID 列表
  AND b.user_id = ?
  AND b.deleted_at IS NULL
GROUP BY b.id
HAVING COUNT(DISTINCT bt.tag_id) = ?  -- 标签数量
ORDER BY b.created_at DESC;
```

### 4. 搜索书签

```sql
SELECT b.*
FROM bookmarks b
WHERE b.user_id = ? 
  AND b.deleted_at IS NULL
  AND (
    b.title LIKE ? OR 
    b.description LIKE ? OR 
    b.url LIKE ?
  )
ORDER BY b.is_pinned DESC, b.updated_at DESC
LIMIT ?;
```

### 5. 获取标签统计

```sql
SELECT 
  t.id, 
  t.name, 
  t.color,
  COUNT(DISTINCT bt.bookmark_id) as bookmark_count
FROM tags t
LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
LEFT JOIN bookmarks b ON bt.bookmark_id = b.id AND b.deleted_at IS NULL
WHERE t.user_id = ? 
  AND t.deleted_at IS NULL
GROUP BY t.id
ORDER BY bookmark_count DESC, t.name;
```

### 6. 获取公开分享书签

```sql
SELECT b.*
FROM bookmarks b
WHERE b.user_id = ?
  AND b.is_public = 1
  AND b.deleted_at IS NULL
ORDER BY b.is_pinned DESC, b.created_at DESC;
```

---

## 迁移管理

### 迁移文件结构

```
migrations/
├── 0001_initial_schema.sql          # 初始架构
├── 0002_add_click_count.sql         # 添加点击统计
├── 0003_add_user_role.sql           # 添加用户角色
├── 0004_add_tag_layout.sql          # 添加标签布局
├── 0005_enable_public_sharing.sql   # 启用公开分享
├── 0006_create_registration_limits.sql
├── 0007_create_tab_groups.sql       # 创建标签页组
├── 0008_add_tab_group_item_flags.sql
├── 0009_add_advanced_features.sql   # 高级功能
├── 0011_add_tab_groups_hierarchy.sql # 层级支持
├── 0012_add_tab_groups_position.sql  # 位置排序
└── README.md
```

### 执行迁移

```bash
# 本地环境
npm run db:migrate:local

# 生产环境
npm run db:migrate

# 手动执行单个迁移
wrangler d1 execute tmarks-prod-db --file=./migrations/0001_initial_schema.sql
```

### 验证迁移

```bash
# 查看所有表
wrangler d1 execute tmarks-prod-db --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# 查看表结构
wrangler d1 execute tmarks-prod-db --command="PRAGMA table_info(bookmarks);"

# 查看所有索引
wrangler d1 execute tmarks-prod-db --command="SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;"
```

---

## 性能优化

### 1. 使用索引

**✅ 好的查询（使用索引）：**
```sql
SELECT * FROM bookmarks 
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**❌ 差的查询（全表扫描）：**
```sql
SELECT * FROM bookmarks 
WHERE LOWER(title) LIKE '%keyword%';
```

### 2. 避免 N+1 查询

**❌ N+1 查询：**
```javascript
// 获取书签
const bookmarks = await getBookmarks()
// 为每个书签查询标签（N 次查询）
for (const bookmark of bookmarks) {
  bookmark.tags = await getTags(bookmark.id)
}
```

**✅ 批量查询：**
```javascript
// 获取书签
const bookmarks = await getBookmarks()
const bookmarkIds = bookmarks.map(b => b.id)
// 一次查询所有标签
const allTags = await getTagsByBookmarkIds(bookmarkIds)
// 组装数据
```

### 3. 使用分页

```sql
-- 游标分页（推荐）
SELECT * FROM bookmarks 
WHERE user_id = ? 
  AND deleted_at IS NULL
  AND id < ?  -- 游标
ORDER BY id DESC
LIMIT 30;

-- OFFSET 分页（不推荐大数据量）
SELECT * FROM bookmarks 
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 30 OFFSET ?;
```

### 4. 使用缓存

```javascript
// KV 缓存示例
const cacheKey = `bookmarks:${userId}:page:${cursor}`
const cached = await KV.get(cacheKey, 'json')
if (cached) return cached

const data = await queryDatabase()
await KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 })
return data
```

---

## 📚 参考资料

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [SQLite 文档](https://www.sqlite.org/docs.html)
- [SQL 性能优化指南](https://use-the-index-luke.com/)

