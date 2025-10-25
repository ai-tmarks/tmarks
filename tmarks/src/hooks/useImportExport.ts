/**
 * 导入导出功能的 React Hook
 * 提供导入导出相关的状态管理和业务逻辑
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type {
  ExportFormat,
  ExportOptions,
  ImportFormat,
  ImportOptions,
  ImportResult
} from '../../shared/import-export-types'

interface UseImportExportReturn {
  // 导出相关
  exportData: (format: ExportFormat, options?: ExportOptions) => Promise<void>
  isExporting: boolean
  exportError: string | null
  
  // 导入相关
  importData: (format: ImportFormat, content: string, options?: ImportOptions) => Promise<ImportResult>
  isImporting: boolean
  importError: string | null
  
  // 预览相关
  getExportPreview: () => Promise<any>
  getImportPreview: (format: ImportFormat) => Promise<any>
  
  // 状态重置
  clearErrors: () => void
}

export function useImportExport(): UseImportExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // 导出数据
  const exportData = useCallback(async (format: ExportFormat, options?: ExportOptions) => {
    setIsExporting(true)
    setExportError(null)

    try {
      // 构建查询参数
      const params = new URLSearchParams({
        format,
        include_metadata: options?.include_metadata?.toString() || 'true',
        include_tags: options?.include_tags?.toString() || 'true',
        pretty_print: options?.format_options?.pretty_print?.toString() || 'true',
        include_stats: options?.format_options?.include_click_stats?.toString() || 'false',
        include_user: options?.format_options?.include_user_info?.toString() || 'false'
      })

      const response = await fetch(`/api/v1/export?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Export failed')
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 
                     `tmarks-export-${Date.now()}.${format}`

      // 下载文件
      const blob = await response.blob()
      downloadBlob(blob, filename)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error'
      setExportError(message)
      throw error
    } finally {
      setIsExporting(false)
    }
  }, [])

  // 导入数据
  const importData = useCallback(async (
    format: ImportFormat, 
    content: string, 
    options?: ImportOptions
  ): Promise<ImportResult> => {
    setIsImporting(true)
    setImportError(null)

    try {
      const response = await fetch('/api/v1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          content,
          options
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Import failed')
      }

      const result: ImportResult = await response.json()
      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error'
      setImportError(message)
      throw error
    } finally {
      setIsImporting(false)
    }
  }, [])

  // 获取导出预览
  const getExportPreview = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' })
      })

      if (!response.ok) {
        throw new Error('Failed to get export preview')
      }

      return await response.json()
    } catch (error) {
      logger.error('Export preview error:', error)
      throw error
    }
  }, [])

  // 获取导入预览
  const getImportPreview = useCallback(async (format: ImportFormat) => {
    try {
      const response = await fetch(`/api/v1/import?format=${format}&preview=true`)

      if (!response.ok) {
        throw new Error('Failed to get import preview')
      }

      return await response.json()
    } catch (error) {
      logger.error('Import preview error:', error)
      throw error
    }
  }, [])

  // 清除错误
  const clearErrors = useCallback(() => {
    setExportError(null)
    setImportError(null)
  }, [])

  return {
    exportData,
    isExporting,
    exportError,
    importData,
    isImporting,
    importError,
    getExportPreview,
    getImportPreview,
    clearErrors
  }
}

/**
 * 文件下载工具函数
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  // 清理 URL 对象
  window.URL.revokeObjectURL(url)
}

/**
 * 文件读取工具函数
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('File reading failed'))
    }
    
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * 文件大小格式化工具函数
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
  return allowedTypes.includes(fileExtension)
}

/**
 * 估算导入时间
 */
export function estimateImportTime(fileSize: number, itemCount?: number): number {
  // 基于文件大小和项目数量估算导入时间（秒）
  const baseSizeTime = fileSize / (1024 * 1024) * 2 // 每MB约2秒
  const baseItemTime = itemCount ? itemCount / 100 * 1 : 0 // 每100项约1秒
  
  return Math.max(baseSizeTime + baseItemTime, 1) // 最少1秒
}

/**
 * 生成导入选项的默认值
 */
export function getDefaultImportOptions(format: ImportFormat): ImportOptions {
  const baseOptions: ImportOptions = {
    skip_duplicates: true,
    create_missing_tags: true,
    preserve_timestamps: true,
    batch_size: 50,
    max_concurrent: 5,
    default_tag_color: '#3b82f6',
    folder_as_tag: true
  }

  // 根据格式调整默认选项
  switch (format) {
    case 'html':
      return {
        ...baseOptions,
        folder_as_tag: true,
        batch_size: 100 // HTML 解析较快，可以增大批次
      }
    
    case 'json':
    case 'tmarks':
      return {
        ...baseOptions,
        folder_as_tag: false, // JSON 格式通常不需要文件夹转标签
        preserve_timestamps: true
      }
    
    default:
      return baseOptions
  }
}

/**
 * 生成导出选项的默认值
 */
export function getDefaultExportOptions(format: ExportFormat): ExportOptions {
  const baseOptions: ExportOptions = {
    include_tags: true,
    include_metadata: true,
    format_options: {
      pretty_print: true,
      include_click_stats: false,
      include_user_info: false
    }
  }

  // 根据格式调整默认选项
  switch (format) {
    case 'json':
      return {
        ...baseOptions,
        format_options: {
          ...baseOptions.format_options,
          pretty_print: true,
          include_click_stats: false
        }
      }
    
    case 'html':
      return {
        ...baseOptions,
        include_metadata: false, // HTML 格式通常不包含元数据
        format_options: {
          pretty_print: false,
          include_click_stats: false,
          include_user_info: false
        }
      }
    
    default:
      return baseOptions
  }
}
