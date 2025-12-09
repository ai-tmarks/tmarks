import { useState } from 'react'
import type { Bookmark } from '@/lib/types'

export function useBookmarkFormState(bookmark?: Bookmark | null) {
  const isEditing = !!bookmark

  const [title, setTitle] = useState(bookmark?.title || '')
  const [url, setUrl] = useState(bookmark?.url || '')
  const [description, setDescription] = useState(bookmark?.description || '')
  const [coverImage, setCoverImage] = useState(bookmark?.cover_image || '')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    bookmark?.tags.map((t) => t.id) || []
  )
  const [isPinned, setIsPinned] = useState(bookmark?.is_pinned || false)
  const [isArchived, setIsArchived] = useState(bookmark?.is_archived || false)
  const [isPublic, setIsPublic] = useState(bookmark?.is_public ?? true)
  const [error, setError] = useState('')
  const [urlWarning, setUrlWarning] = useState<{ exists: boolean; message: string } | null>(null)
  const [isCheckingUrl, setIsCheckingUrl] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return {
    isEditing,
    title,
    setTitle,
    url,
    setUrl,
    description,
    setDescription,
    coverImage,
    setCoverImage,
    selectedTagIds,
    setSelectedTagIds,
    isPinned,
    setIsPinned,
    isArchived,
    setIsArchived,
    isPublic,
    setIsPublic,
    error,
    setError,
    urlWarning,
    setUrlWarning,
    isCheckingUrl,
    setIsCheckingUrl,
    newTagName,
    setNewTagName,
    isCreatingTag,
    setIsCreatingTag,
    showDeleteConfirm,
    setShowDeleteConfirm,
  }
}
