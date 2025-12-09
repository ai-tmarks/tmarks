import { useAuthStore } from '@/stores/authStore'
import type {
  ImportFormat,
  ImportOptions,
  ImportResult,
  ValidationResult
} from '@shared/import-export-types'

interface FormatOption {
  value: ImportFormat
  extensions: string[]
}

const formatOptions: FormatOption[] = [
  {
    value: 'html',
    extensions: ['.html', '.htm']
  },
  {
    value: 'json',
    extensions: ['.json']
  }
]

// 工具函数：格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

interface UseImportActionsProps {
  selectedFormat: ImportFormat
  setSelectedFile: (file: File | null) => void
  setImportResult: (result: ImportResult | null) => void
  setIsValidating: (validating: boolean) => void
  setValidationResult: (result: ValidationResult | null) => void
  setIsImporting: (importing: boolean) => void
  setImportProgress: (progress: { current: number; total: number; status: string } | null) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  options: ImportOptions
  onImport?: (result: ImportResult) => void
}

/**
 * 导入功能的操作逻辑 Hook
 */
export function useImportActions({
  selectedFormat,
  setSelectedFile,
  setImportResult,
  setIsValidating,
  setValidationResult,
  setIsImporting,
  setImportProgress,
  fileInputRef,
  options,
  onImport,
}: UseImportActionsProps) {
  
  // 文件验证
  const validateFile = async (file: File) => {
    setIsValidating(true)
    try {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const formatConfig = formatOptions.find(f => f.value === selectedFormat)

      if (!formatConfig?.extensions.includes(fileExtension)) {
        setValidationResult({
          valid: false,
          errors: [{
            field: 'file',
            message: `文件格式不匹配，期望 ${formatConfig?.extensions.join(', ')}，实际为 ${fileExtension}`
          }],
          warnings: []
        })
        return
      }

      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        setValidationResult({
          valid: false,
          errors: [{
            field: 'file',
            message: `文件过大，最大支持 ${formatFileSize(maxSize)}，当前文件 ${formatFileSize(file.size)}`
          }],
          warnings: []
        })
        return
      }

      await file.text()
      setValidationResult({ valid: true, errors: [], warnings: [] })

    } catch {
      setValidationResult({
        valid: false,
        errors: [{ field: 'file', message: '文件读取失败，请确保文件未损坏' }],
        warnings: []
      })
    } finally {
      setIsValidating(false)
    }
  }

  // 文件选择处理
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setImportResult(null)
    validateFile(file)
  }

  // 执行导入
  const handleImport = async (selectedFile: File) => {
    if (!selectedFile) return

    setIsImporting(true)
    setImportProgress({ current: 0, total: 100, status: '准备导入...' })

    try {
      const content = await selectedFile.text()

      const token = useAuthStore.getState().accessToken
      const response = await fetch('/api/v1/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          format: selectedFormat,
          content,
          options
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Import failed')
      }

      const result: ImportResult = await response.json()
      setImportResult(result)
      onImport?.(result)

    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: 0,
        failed: 1,
        skipped: 0,
        total: 1,
        errors: [{
          index: 0,
          item: { title: '', url: '', tags: [] },
          error: error instanceof Error ? error.message : '未知错误',
          code: 'UNKNOWN_ERROR'
        }],
        created_bookmarks: [],
        created_tags: [],
        created_tab_groups: [],
        tab_groups_success: 0,
        tab_groups_failed: 0
      })
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  // 重置状态
  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
    setValidationResult(null)
    setImportProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 复制提示词
  const copyPrompt = async (prompt: string, setCopiedPrompt: (copied: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return {
    handleFileSelect,
    handleImport,
    handleReset,
    copyPrompt,
  }
}
