import { useState, useRef } from 'react'
import type {
  ImportFormat,
  ImportOptions,
  ImportResult,
  ValidationResult
} from '@shared/import-export-types'

interface ImportProgress {
  current: number
  total: number
  status: string
}

/**
 * 导入功能的状态管理 Hook
 */
export function useImportState() {
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat>('html')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [options, setOptions] = useState<ImportOptions>({
    skip_duplicates: true,
    create_missing_tags: true,
    preserve_timestamps: true,
    batch_size: 50,
    max_concurrent: 5,
    default_tag_color: 'hsl(var(--primary))',
    folder_as_tag: true
  })
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  return {
    selectedFormat,
    setSelectedFormat,
    selectedFile,
    setSelectedFile,
    isImporting,
    setIsImporting,
    isValidating,
    setIsValidating,
    importProgress,
    setImportProgress,
    importResult,
    setImportResult,
    validationResult,
    setValidationResult,
    options,
    setOptions,
    copiedPrompt,
    setCopiedPrompt,
    fileInputRef,
  }
}
