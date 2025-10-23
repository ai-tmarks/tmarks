# 🚀 TMarks 部署前检查清单

## 📋 部署前准备

### 1. 环境变量检查

#### ✅ 必需的环境变量
- [ ] `DATABASE_ID` - Cloudflare D1 数据库 ID
- [ ] `PUBLIC_SHARE_KV` - KV 命名空间 ID（用于公开分享缓存）
- [ ] `JWT_SECRET` - JWT 密钥（生产环境必须更换）
- [ ] `VITE_API_BASE_URL` - API 基础 URL

#### ⚠️ 检查要点
- [ ] 确认所有环境变量都已添加到 Cloudflare Workers 设置中
- [ ] 确认 `.env` 文件未被提交到 Git 仓库
- [ ] 确认生产环境的 JWT_SECRET 与开发环境不同
- [ ] 确认 API URL 指向正确的生产环境地址

### 2. 数据库迁移检查

#### ✅ 迁移文件完整性
- [ ] 检查 `migrations/` 目录下所有迁移文件
- [ ] 确认迁移文件按序号正确命名（0001, 0002, ...）
- [ ] 确认所有迁移都已在本地测试通过

#### ✅ 生产数据库准备
- [ ] 创建 Cloudflare D1 生产数据库
- [ ] 记录数据库 ID 并更新到 `wrangler.toml`
- [ ] 执行所有迁移：`npm run db:migrate`

#### ✅ 迁移验证
```bash
# 验证表结构
wrangler d1 execute tmarks-prod-db --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# 验证索引
wrangler d1 execute tmarks-prod-db --command="SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;"
```

### 3. 代码质量检查

#### ✅ 构建测试
- [ ] 运行 `npm run build` 确保构建成功
- [ ] 检查构建输出大小是否合理
- [ ] 确认没有严重的 TypeScript 错误

#### ✅ Lint 检查
- [ ] 运行 `npm run lint` 检查代码规范
- [ ] 修复关键的 lint 错误（可选：修复警告）

#### ✅ 类型检查
- [ ] 运行 `npm run type-check` 确保类型正确

### 4. Git 状态检查

#### ✅ 代码提交
- [ ] 确认所有修改都已提交
- [ ] 确认提交信息清晰明确
- [ ] 确认在正确的分支上（通常是 `main` 或 `production`）

#### ✅ 敏感信息检查
- [ ] 确认没有提交 `.env` 文件
- [ ] 确认没有提交密钥或密码
- [ ] 确认没有提交个人信息

### 5. Cloudflare Workers 配置检查

#### ✅ wrangler.toml 配置
- [ ] 确认 `name` 字段正确
- [ ] 确认 `compatibility_date` 是最新的
- [ ] 确认 D1 数据库绑定正确
- [ ] 确认 KV 命名空间绑定正确
- [ ] 确认路由配置正确

#### ✅ 资源配额检查
- [ ] 确认 Cloudflare 账户有足够的配额
- [ ] 确认 D1 数据库大小限制
- [ ] 确认 KV 存储限制
- [ ] 确认 Workers 请求限制

### 6. 功能测试检查

#### ✅ 核心功能
- [ ] 用户注册/登录
- [ ] 书签创建/编辑/删除
- [ ] 标签管理
- [ ] 搜索功能
- [ ] 公开分享功能
- [ ] 导入/导出功能

#### ✅ 边缘情况
- [ ] 空数据状态
- [ ] 大量数据加载
- [ ] 网络错误处理
- [ ] 权限验证

### 7. 性能优化检查

#### ✅ 前端优化
- [ ] 确认静态资源已压缩（gzip/brotli）
- [ ] 确认图片已优化
- [ ] 确认代码已分割（code splitting）
- [ ] 确认使用了缓存策略

#### ✅ 后端优化
- [ ] 确认 SQL 查询已优化（使用索引）
- [ ] 确认使用了 KV 缓存
- [ ] 确认分页实现正确
- [ ] 确认 API 响应时间合理

### 8. 安全检查

#### ✅ 认证授权
- [ ] 确认 JWT 验证正确
- [ ] 确认 API 端点有权限保护
- [ ] 确认密码加密正确（bcrypt）
- [ ] 确认 CORS 配置正确

#### ✅ 数据验证
- [ ] 确认输入验证完整
- [ ] 确认 SQL 注入防护
- [ ] 确认 XSS 防护
- [ ] 确认 CSRF 防护

### 9. 监控和日志

#### ✅ 日志配置
- [ ] 确认关键操作有日志记录
- [ ] 确认错误有详细日志
- [ ] 确认日志级别正确（生产环境不输出调试日志）

#### ✅ 监控设置
- [ ] 设置 Cloudflare Workers 监控
- [ ] 设置错误告警
- [ ] 设置性能监控

### 10. 备份和回滚计划

#### ✅ 备份策略
- [ ] 确认数据库有备份计划
- [ ] 确认 KV 数据有备份
- [ ] 确认代码有版本控制

#### ✅ 回滚计划
- [ ] 准备回滚脚本
- [ ] 测试回滚流程
- [ ] 记录回滚步骤

---

## 🚀 部署步骤

### 1. 部署前最后检查
```bash
# 1. 确认在正确的分支
git branch

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
npm install

# 4. 构建项目
npm run build

# 5. 运行迁移（生产环境）
npm run db:migrate
```

### 2. 部署到 Cloudflare
```bash
# 部署 Workers
npm run cf:deploy
```

### 3. 部署后验证
```bash
# 1. 检查部署状态
wrangler deployments list

# 2. 查看实时日志
npm run cf:tail

# 3. 测试生产环境 API
curl https://your-domain.com/api/health
```

### 4. 监控和观察
- [ ] 观察 Cloudflare Dashboard 的请求量
- [ ] 观察错误率
- [ ] 观察响应时间
- [ ] 检查用户反馈

---

## 🆘 常见问题和解决方案

### 问题 1：数据库迁移失败
**解决方案：**
1. 检查迁移文件语法
2. 手动在 Cloudflare D1 控制台执行
3. 参考 `migrations/MANUAL_MIGRATION_GUIDE.md`

### 问题 2：环境变量未生效
**解决方案：**
1. 检查 `wrangler.toml` 配置
2. 重新部署 Workers
3. 清除 Cloudflare 缓存

### 问题 3：API 请求失败
**解决方案：**
1. 检查 CORS 配置
2. 检查路由配置
3. 查看 Workers 日志

### 问题 4：性能问题
**解决方案：**
1. 检查 SQL 查询是否使用索引
2. 检查是否使用了 KV 缓存
3. 检查是否有 N+1 查询问题

---

## 📞 紧急联系

- **Cloudflare 支持**: https://dash.cloudflare.com/support
- **项目文档**: `README.md`
- **迁移指南**: `migrations/MANUAL_MIGRATION_GUIDE.md`

---

## ✅ 部署完成确认

- [ ] 所有检查项都已完成
- [ ] 部署成功
- [ ] 功能测试通过
- [ ] 监控正常
- [ ] 文档已更新

**部署时间**: _______________  
**部署人员**: _______________  
**版本号**: _______________

