# 编码风格指南

## React 组件规范

- 使用函数式组件和 Hooks
- Props 使用 TypeScript 接口定义
- 组件文件使用 PascalCase 命名
- 一个文件一个组件（除非是紧密相关的小组件）

## 代码风格

- 不使用分号
- 使用单引号
- 2 空格缩进
- 行宽限制 100 字符
- 箭头函数始终使用括号

## 最佳实践

- 优先使用 React Query 进行数据获取
- 使用 Zustand 管理全局状态
- 使用 `@/` 路径别名导入模块
- 组件按功能分组（bookmarks, tags, tab-groups）
- 保持组件小而专注，单一职责

## API 调用

- 所有 API 调用通过 `services/` 层
- 使用 React Query hooks 包装 API 调用
- 错误处理使用 toast 通知用户
