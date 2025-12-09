import { useState, useRef } from 'react'
import type { TabGroup, TabGroupItem } from '@/lib/types'
import type { SortOption } from '@/components/tab-groups/sortUtils'

/**
 * 标签组页面的状态管理 Hook
 */
export function useTabGroupsState() {
  // 数据状态
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [highlightedDomain, setHighlightedDomain] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('created')
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 批量操作状态
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)

  // 对话框状态
  const [sharingGroupId, setSharingGroupId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // 移动项对话框状态
  const [moveItemDialog, setMoveItemDialog] = useState<{
    isOpen: boolean
    item: TabGroupItem | null
    currentGroupId: string
  }>({
    isOpen: false,
    item: null,
    currentGroupId: '',
  })

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // 移动端状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return {
    // 数据状态
    tabGroups,
    setTabGroups,
    isLoading,
    setIsLoading,
    error,
    setError,
    deletingId,
    setDeletingId,

    // 搜索和过滤
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    setDebouncedSearchQuery,
    highlightedDomain,
    setHighlightedDomain,
    sortBy,
    setSortBy,
    searchCleanupTimerRef,

    // 批量操作
    selectedItems,
    setSelectedItems,
    batchMode,
    setBatchMode,

    // 对话框
    sharingGroupId,
    setSharingGroupId,
    selectedGroupId,
    setSelectedGroupId,
    moveItemDialog,
    setMoveItemDialog,
    confirmDialog,
    setConfirmDialog,

    // 移动端
    isDrawerOpen,
    setIsDrawerOpen,
  }
}
