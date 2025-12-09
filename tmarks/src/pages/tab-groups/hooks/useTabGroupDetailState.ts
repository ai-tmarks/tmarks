import { useState } from 'react'
import type { TabGroup } from '@/lib/types'

export function useTabGroupDetailState() {
  const [tabGroup, setTabGroup] = useState<TabGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')
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

  return {
    tabGroup,
    setTabGroup,
    isLoading,
    setIsLoading,
    error,
    setError,
    isEditingTitle,
    setIsEditingTitle,
    editedTitle,
    setEditedTitle,
    isSavingTitle,
    setIsSavingTitle,
    editingItemId,
    setEditingItemId,
    editingItemTitle,
    setEditingItemTitle,
    confirmDialog,
    setConfirmDialog,
  }
}
