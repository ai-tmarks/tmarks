/**
 * 导入功能组件
 * 提供书签数据导入功能的用户界面
 */

import { Upload, FileText, Code, CheckCircle, Loader2, ArrowRight, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DragDropUpload } from '../common/DragDropUpload'
import { ProgressIndicator } from '../common/ProgressIndicator'
import { ErrorDisplay } from '../common/ErrorDisplay'
import { useImportState } from './hooks/useImportState'
import { useImportActions, formatFileSize } from './hooks/useImportActions'
import type { ImportFormat, ImportResult } from '@shared/import-export-types'

interface ImportSectionProps {
  onImport?: (result: ImportResult) => void
}

// AI 转换提示词
const HTML_PROMPT = `你是一个书签格式转换专家。请将浏览器导出的 HTML 书签文件清理并标准化为规范的 HTML 格式。

【重要】严格按照以下格式输出，不要添加任何解释或额外内容：

<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>工作</H3>
    <DL><p>
        <DT><A HREF="https://github.com/" TAGS="开发,代码">GitHub</A>
        <DD>代码托管平台
    </DL><p>
    <DT><H3>AI工具</H3>
    <DL><p>
        <DT><A HREF="https://chatgpt.com/" TAGS="AI,工具">ChatGPT</A>
        <DD>AI 聊天工具
    </DL><p>
</DL><p>

转换规则：
1. 保留 HTML 书签标准结构：
   - 保留 DOCTYPE、META、TITLE、H1
   - 保留 DL、DT、DD 标签结构

2. 清理和标准化：
   - 移除时间戳（ADD_DATE、LAST_MODIFIED 等属性）
   - 移除 ICON 属性
   - 保留 HREF 属性（必需）
   - 保留或添加 TAGS 属性（文件夹名称和原有标签合并，逗号分隔）

3. 文件夹处理：
   - 用 <H3> 标签表示文件夹
   - 文件夹下的书签用 <DL><p>...</DL><p> 包裹

4. 书签处理：
   - <A> 标签：HREF 属性 + TAGS 属性 + 标题文本
   - <DD> 标签：描述信息（可选，没有则不写）

5. 标签规范（重要）：
   - 每个标签 2-5 个汉字，或常见英语单词（如 AI、GitHub、React）
   - 标签要简洁、通用、易于分类
   - 避免过长的标签（如"前端开发工具"应拆分为"前端,开发,工具"）
   - 文件夹名称也要符合此规范
   - 示例：✅ "AI,工具,聊天" ❌ "人工智能聊天助手工具"

6. 输出要求：
   - 只输出 HTML，不要有任何其他文字
   - 不要用代码块包裹（不要 \`\`\`html）
   - 确保 HTML 格式正确
   - 保持层级结构清晰

我的 HTML 书签文件：
[在这里粘贴你的 HTML 书签文件内容]`

// 格式选项
const formatOptions = [
  {
    value: 'html' as ImportFormat,
    label: 'HTML',
    description: '浏览器导出的书签文件',
    icon: FileText,
    extensions: ['.html', '.htm'],
    recommended: true
  },
  {
    value: 'json' as ImportFormat,
    label: 'JSON',
    description: 'TMarks 标准格式，包含完整数据',
    icon: Code,
    extensions: ['.json'],
    recommended: true
  }
]

export function ImportSection({ onImport }: ImportSectionProps) {
  const navigate = useNavigate()
  
  // 状态管理
  const state = useImportState()
  const {
    selectedFormat,
    setSelectedFormat,
    selectedFile,
    isImporting,
    isValidating,
    importProgress,
    importResult,
    validationResult,
    options,
    setOptions,
    copiedPrompt,
    setCopiedPrompt,
    fileInputRef,
  } = state

  // 操作逻辑
  const actions = useImportActions({
    selectedFormat,
    setSelectedFile: state.setSelectedFile,
    setImportResult: state.setImportResult,
    setIsValidating: state.setIsValidating,
    setValidationResult: state.setValidationResult,
    setIsImporting: state.setIsImporting,
    setImportProgress: state.setImportProgress,
    fileInputRef,
    options,
    onImport,
  })

  const { handleFileSelect, handleImport, handleReset, copyPrompt } = actions

  return (
    <div className="space-y-6">
      {/* 格式选择 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          选择格式
        </label>
        <div className="grid grid-cols-2 gap-3">
          {formatOptions.map((format) => {
            const Icon = format.icon
            return (
              <div
                key={format.value}
                className={`relative rounded-lg border p-3 cursor-pointer transition-all touch-manipulation ${
                  selectedFormat === format.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
                onClick={() => setSelectedFormat(format.value)}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm">
                      {format.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {format.extensions.join(', ')}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={selectedFormat === format.value}
                    onChange={() => setSelectedFormat(format.value)}
                    className="h-4 w-4 text-primary border-border focus:ring-primary flex-shrink-0"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 文件选择 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          选择文件
        </label>

        <DragDropUpload
          onFileSelect={handleFileSelect}
          accept={formatOptions.find(f => f.value === selectedFormat)?.extensions.join(',')}
          maxSize={50 * 1024 * 1024}
          disabled={isImporting}
        >
          {selectedFile ? (
            <div className="p-6 text-center">
              <div className="flex flex-col items-center space-y-3">
                {isValidating ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        正在验证文件...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-8 w-8 text-success" />
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        文件已选择
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted"
                    >
                      重新选择
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DragDropUpload>
      </div>

      {/* 验证结果 */}
      {validationResult && (
        <ErrorDisplay
          errors={validationResult.errors}
          variant={validationResult.valid ? 'success' : 'error'}
          title={validationResult.valid ? '文件验证通过' : '文件验证失败'}
          dismissible={false}
          collapsible={true}
          showDetails={true}
        />
      )}

      {/* 导入选项 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          导入选项
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={options.skip_duplicates}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                skip_duplicates: e.target.checked
              }))}
              className="h-4 w-4 text-primary border-border rounded focus:ring-primary flex-shrink-0"
            />
            <span className="text-sm text-foreground">
              跳过重复
            </span>
          </label>

          <label className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={options.create_missing_tags}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                create_missing_tags: e.target.checked
              }))}
              className="h-4 w-4 text-primary border-border rounded focus:ring-primary flex-shrink-0"
            />
            <span className="text-sm text-foreground">
              创建标签
            </span>
          </label>

          <label className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={options.preserve_timestamps}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                preserve_timestamps: e.target.checked
              }))}
              className="h-4 w-4 text-primary border-border rounded focus:ring-primary flex-shrink-0"
            />
            <span className="text-sm text-foreground">
              保留时间
            </span>
          </label>

          {selectedFormat === 'html' && (
            <label className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={options.folder_as_tag}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  folder_as_tag: e.target.checked
                }))}
                className="h-4 w-4 text-primary border-border rounded focus:ring-primary flex-shrink-0"
              />
              <span className="text-sm text-foreground">
                文件夹转标签
              </span>
            </label>
          )}
        </div>
      </div>

      {/* 导入进度 */}
      {importProgress && (
        <ProgressIndicator
          progress={{
            current: importProgress.current,
            total: importProgress.total,
            percentage: (importProgress.current / importProgress.total) * 100,
            status: importProgress.status,
            message: `正在处理第 ${importProgress.current} / ${importProgress.total} 项`
          }}
          variant="detailed"
          showSpeed={true}
          showETA={true}
        />
      )}

      {/* 导入结果 */}
      {importResult && (
        <div className="bg-muted rounded-lg p-3 sm:p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            导入结果
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center sm:text-left">
              <div className="text-lg sm:text-xl font-bold text-success">
                {importResult.success}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                成功导入
              </div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-lg sm:text-xl font-bold text-destructive">
                {importResult.failed}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                导入失败
              </div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-lg sm:text-xl font-bold text-warning">
                {importResult.skipped}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                跳过重复
              </div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-lg sm:text-xl font-bold text-primary">
                {importResult.total}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                总计处理
              </div>
            </div>
          </div>

          {importResult.total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className="text-muted-foreground">成功率</span>
                <span className="font-medium text-foreground">
                  {Math.round((importResult.success / importResult.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(importResult.success / importResult.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div className="mt-4">
              <ErrorDisplay
                errors={importResult.errors.map(error => ({
                  message: error.error,
                  code: error.code,
                  details: `书签: ${error.item.title || error.item.url}`
                }))}
                variant="error"
                title={`导入错误 (${importResult.errors.length})`}
                dismissible={false}
                collapsible={true}
                maxVisible={2}
              />
            </div>
          )}

          {importResult.success > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/bookmarks')}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary touch-manipulation"
              >
                <span>查看导入的书签</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 sm:py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary touch-manipulation"
              >
                继续导入
              </button>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {!importResult && (
        <div className="flex space-x-3">
          <button
            onClick={() => selectedFile && handleImport(selectedFile)}
            disabled={!selectedFile || !validationResult?.valid || isImporting || isValidating}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{isImporting ? '导入中...' : '开始导入'}</span>
          </button>
        </div>
      )}

      {/* 格式转换提示 */}
      {!importResult && (
        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">
                需要转换格式？
              </h4>
              <p className="text-xs text-muted-foreground">
                使用 AI 工具
              </p>
            </div>

            <button
              onClick={() => copyPrompt(HTML_PROMPT, setCopiedPrompt)}
              className="w-full flex items-center justify-center space-x-2 p-3 bg-card border border-border rounded-md hover:border-primary/50 hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium text-foreground">复制 HTML 格式转换提示词</div>
              <div className="flex items-center space-x-1 text-xs text-primary">
                {copiedPrompt ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </div>
            </button>

            <p className="text-xs text-muted-foreground leading-relaxed">
              复制提示词到 AI 工具（ChatGPT、Claude 等），粘贴书签内容即可转换为标准 HTML 格式
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
