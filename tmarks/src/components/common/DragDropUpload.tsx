/**
 * 拖拽上传组件
 * 支持拖拽和点击上传文件，提供良好的视觉反馈
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'

interface DragDropUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number // bytes
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

interface UploadState {
  isDragOver: boolean
  isValidDrag: boolean
  error: string | null
}

export function DragDropUpload({
  onFileSelect,
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className = '',
  children
}: DragDropUploadProps) {
  const [state, setState] = useState<UploadState>({
    isDragOver: false,
    isValidDrag: false,
    error: null
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    // 检查文件大小
    if (file.size > maxSize) {
      return `文件大小超过限制 (${formatFileSize(maxSize)})`
    }

    // 检查文件类型
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return type === fileExtension
        }
        return file.type.match(type.replace('*', '.*'))
      })
      
      if (!isValidType) {
        return `不支持的文件类型，请选择: ${acceptedTypes.join(', ')}`
      }
    }

    return null
  }, [accept, maxSize])

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setState(prev => ({ ...prev, error }))
      return
    }

    setState(prev => ({ ...prev, error: null }))
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  // 拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const isValidDrag = files.length === 1 && files[0] && validateFile(files[0]) === null

    setState(prev => ({
      ...prev,
      isDragOver: true,
      isValidDrag: isValidDrag || false
    }))
  }, [disabled, validateFile])

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // 拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 只有当离开整个拖拽区域时才重置状态
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState(prev => ({
        ...prev,
        isDragOver: false,
        isValidDrag: false
      }))
    }
  }, [])

  // 文件放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setState(prev => ({
      ...prev,
      isDragOver: false,
      isValidDrag: false
    }))

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 1) {
      if (files[0]) {
        handleFileSelect(files[0])
      }
    }
  }, [disabled, handleFileSelect])

  // 点击上传
  const handleClick = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  // 文件输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // 样式类名
  const containerClasses = [
    'relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer',
    'hover:border-muted-foreground/50',
    'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
    className
  ]

  if (disabled) {
    containerClasses.push('opacity-50 cursor-not-allowed')
  } else if (state.isDragOver) {
    if (state.isValidDrag) {
      containerClasses.push('border-success bg-success/10')
    } else {
      containerClasses.push('border-destructive bg-destructive/10')
    }
  } else {
    containerClasses.push('border-border')
  }

  return (
    <div className="space-y-3">
      <div
        className={containerClasses.join(' ')}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="sr-only"
          disabled={disabled}
        />

        {children || (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              {/* 图标 */}
              <div className={`p-3 rounded-full ${
                state.isDragOver
                  ? state.isValidDrag
                    ? 'bg-success/20'
                    : 'bg-destructive/20'
                  : 'bg-muted'
              }`}>
                {state.isDragOver ? (
                  state.isValidDrag ? (
                    <CheckCircle className="h-8 w-8 text-success" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  )
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* 文本 */}
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  {state.isDragOver
                    ? state.isValidDrag
                      ? '松开以上传文件'
                      : '文件格式不支持'
                    : '拖拽文件到此处或点击选择'
                  }
                </p>
                {accept !== '*' && !state.isDragOver && (
                  <p className="text-sm text-muted-foreground">
                    支持格式: {accept}
                  </p>
                )}
              </div>

              {/* 上传按钮 */}
              {!state.isDragOver && (
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 touch-manipulation"
                  disabled={disabled}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  选择文件
                </button>
              )}
            </div>
          </div>
        )}

        {/* 拖拽覆盖层 */}
        {state.isDragOver && (
          <div className="absolute inset-0 bg-black bg-opacity-5 rounded-lg pointer-events-none" />
        )}
      </div>

      {/* 错误提示 */}
      {state.error && (
        <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {state.error}
            </span>
          </div>
          <button
            onClick={clearError}
            className="text-destructive hover:text-destructive/80"
          >
            <span className="sr-only">关闭</span>
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// 工具函数：格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
