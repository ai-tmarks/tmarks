import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useCreateBookmark, useUpdateBookmark, useDeleteBookmark } from '@/hooks/useBookmarks'
import { useCreateTag, useTags } from '@/hooks/useTags'
import { bookmarksService } from '@/services/bookmarks'
import type { Bookmark, CreateBookmarkRequest, UpdateBookmarkRequest } from '@/lib/types'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface BookmarkFormProps {
  bookmark?: Bookmark | null
  onClose: () => void
  onSuccess?: () => void
}

export function BookmarkForm({ bookmark, onClose, onSuccess }: BookmarkFormProps) {
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
  const [isPublic, setIsPublic] = useState(bookmark?.is_public || false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [urlWarning, setUrlWarning] = useState<{ exists: true; bookmark: Bookmark } | null>(null)
  const [checkingUrl, setCheckingUrl] = useState(false)

    const createBookmark = useCreateBookmark()
  const updateBookmark = useUpdateBookmark()
  const deleteBookmark = useDeleteBookmark()
  const createTag = useCreateTag()
  const { data: tagsData } = useTags()
  const tags = tagsData?.tags || []

  // URL 变化时检查是否已存在（优化版：增加预检查和延长防抖时间）
  useEffect(() => {
    const checkUrl = async () => {
      if (!url.trim() || isEditing) {
        setUrlWarning(null)
        setCheckingUrl(false)
        return
      }

      // 跳过太短的 URL（减少不必要的检查）
      if (url.trim().length < 10) {
        setUrlWarning(null)
        setCheckingUrl(false)
        return
      }

      try {
        new URL(url)
      } catch {
        setUrlWarning(null)
        setCheckingUrl(false)
        return
      }

      setCheckingUrl(true)
      try {
        const result = await bookmarksService.checkUrlExists(url.trim())
        if (result.exists && result.bookmark) {
          setUrlWarning({ exists: true, bookmark: result.bookmark })
        } else {
          setUrlWarning(null)
        }
      } catch (error) {
        logger.error('Failed to check URL:', error)
      } finally {
        setCheckingUrl(false)
      }
    }

    // 增加防抖时间到 800ms，减少 API 调用
    const timeoutId = setTimeout(checkUrl, 800)
    return () => clearTimeout(timeoutId)
  }, [url, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证
    if (!title.trim()) {
      setError('请输入书签标题')
      return
    }

    if (!url.trim()) {
      setError('请输入书签URL')
      return
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch {
      setError('URL 格式不正确')
      return
    }

    // 检查 URL 是否已存在（仅在新增时）
    if (!isEditing && urlWarning?.exists) {
      setError('该 URL 已存在于书签中')
      return
    }

    try {
      if (isEditing && bookmark) {
        // 构建更新数据，只包含发生变化的字段
        const updateData: UpdateBookmarkRequest = {
          tag_ids: selectedTagIds,
          is_pinned: isPinned,
          is_archived: isArchived,
          is_public: isPublic,
        }

        if (title.trim() !== (bookmark.title || '')) {
          updateData.title = title.trim()
        }

        if (url.trim() !== (bookmark.url || '')) {
          updateData.url = url.trim()
        }

        const originalDescription = bookmark.description || ''
        if (description.trim() !== originalDescription) {
          updateData.description = description.trim() ? description.trim() : null
        }

        const originalCoverImage = bookmark.cover_image || ''
        if (coverImage.trim() !== originalCoverImage) {
          updateData.cover_image = coverImage.trim() ? coverImage.trim() : null
        }

        await updateBookmark.mutateAsync({ id: bookmark.id, data: updateData })
      } else {
        const createData: CreateBookmarkRequest = {
          title: title.trim(),
          url: url.trim(),
          description: description.trim() ? description.trim() : undefined,
          cover_image: coverImage.trim() ? coverImage.trim() : undefined,
          tag_ids: selectedTagIds,
          is_pinned: isPinned,
          is_archived: isArchived,
          is_public: isPublic,
        }

        await createBookmark.mutateAsync(createData)
      }
      onSuccess?.()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : '操作失败，请重试')
    }
  }

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId))
    } else {
      setSelectedTagIds([...selectedTagIds, tagId])
    }
  }

  const handleTagInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      await processTagInput()
    }
  }

  const processTagInput = async () => {
    const input = tagInput.trim()
    if (!input) return

    // 支持逗号分隔的批量添加
    const tagNames = input
      .split(/[,，]/) // 支持中英文逗号
      .map(name => name.trim())
      .filter(name => name.length > 0)

    if (tagNames.length === 0) return

    const newSelectedIds = [...selectedTagIds]

    for (const tagName of tagNames) {
      // 检查标签是否已存在
      const existingTag = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase())
      if (existingTag) {
        // 标签已存在，直接选中
        if (!newSelectedIds.includes(existingTag.id)) {
          newSelectedIds.push(existingTag.id)
        }
      } else {
        // 创建新标签
        try {
          const newTag = await createTag.mutateAsync({ name: tagName })
          newSelectedIds.push(newTag.id)
        } catch (error) {
          console.error('Failed to create tag:', error)
          setError(`创建标签"${tagName}"失败，请重试`)
          return
        }
      }
    }

    setSelectedTagIds(newSelectedIds)
    setTagInput('')
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!bookmark) return

    setShowDeleteConfirm(false)
    try {
      await deleteBookmark.mutateAsync(bookmark.id)
      onSuccess?.()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败，请重试')
    }
  }

  const isPending = createBookmark.isPending || updateBookmark.isPending || deleteBookmark.isPending || createTag.isPending

  return (
    <div className="fixed inset-0 bg-base-content/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-base-content">
            {isEditing ? '编辑书签' : '新增书签'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-base-200 flex items-center justify-center text-base-content transition-colors"
            disabled={isPending}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-error/10 border border-error/30 text-error rounded-lg text-xs animate-fade-in flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 第一行：标题和URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="title" className="block text-xs font-medium mb-1.5 text-base-content">
                标题 <span className="text-error">*</span>
              </label>
              <input
                id="title"
                type="text"
                className="input"
                placeholder="书签标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-xs font-medium mb-1.5 text-base-content">
                URL <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="url"
                  type="url"
                  className={`input ${urlWarning ? 'border-warning' : ''}`}
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isPending}
                />
                {checkingUrl && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-base-content/40" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              {urlWarning && (
                <div className="mt-1.5 p-2 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning animate-fade-in flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">该 URL 已存在</p>
                    <p className="mt-0.5 text-base-content/60">
                      书签：{urlWarning.bookmark.title}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 第二行：描述和封面图 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="description" className="block text-xs font-medium mb-1.5 text-base-content">
                描述
              </label>
              <textarea
                id="description"
                className="input min-h-[60px] resize-none text-sm"
                placeholder="书签描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div>
              <label htmlFor="coverImage" className="block text-xs font-medium mb-1.5 text-base-content">
                封面图 URL
              </label>
              <div className="flex gap-2">
                <input
                  id="coverImage"
                  type="url"
                  className="input flex-1"
                  placeholder="https://example.com/image.jpg"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  disabled={isPending}
                />
                {coverImage && (
                  <img
                    src={coverImage}
                    alt="预览"
                    className="w-[60px] h-[60px] object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 标签选择 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-base-content">
                标签
                <span className="text-xs text-base-content/50 ml-1.5">
                  （支持逗号批量添加）
                </span>
              </label>
              {selectedTagIds.length > 0 && (
                <span className="text-xs text-base-content/60">
                  已选 {selectedTagIds.length} 个
                </span>
              )}
            </div>

            {/* 标签输入框 */}
            <input
              type="text"
              className="input mb-2"
              placeholder="输入标签名称（多个用逗号分隔），按 Enter 添加..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              disabled={isPending}
            />

            {/* 已选标签 */}
            {selectedTagIds.length > 0 && (
              <div className="mb-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex flex-wrap gap-1.5">
                  {selectedTagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId)
                    if (!tag) return null
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="text-xs px-2.5 py-1 rounded-full bg-primary text-primary-content hover:bg-primary/90 transition-colors shadow-sm"
                        disabled={isPending}
                      >
                        {tag.name} ×
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 可选标签列表 */}
            <div className="p-2.5 bg-base-200 rounded-lg max-h-[120px] overflow-y-auto scrollbar-hide">
              <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <p className="text-xs text-base-content/50 py-1">
                    暂无标签，在上方输入框输入后按 Enter 创建
                  </p>
                ) : (
                  tags
                    .filter((tag) => !selectedTagIds.includes(tag.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="text-xs px-2.5 py-1 rounded-full bg-card border border-border text-base-content hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        disabled={isPending}
                      >
                        {tag.name}
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* 选项和按钮 */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  disabled={isPending}
                />
                <span className="text-xs text-base-content">置顶</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                  disabled={isPending}
                />
                <span className="text-xs text-base-content">归档</span>
              </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isPending}
              />
              <span className="text-xs text-base-content">公开分享</span>
            </label>
            </div>

            {/* 按钮 */}
            <div className="flex gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="btn btn-sm btn-outline border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground px-4"
                  disabled={isPending}
                  title="删除书签"
                >
                  {deleteBookmark.isPending ? '删除中...' : '删除'}
                </button>
              )}
              <button type="submit" className="btn btn-sm px-6" disabled={isPending}>
                {createBookmark.isPending || updateBookmark.isPending
                  ? '保存中...'
                  : isEditing
                    ? '保存'
                    : '创建'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-outline px-4"
                disabled={isPending}
              >
                取消
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除书签"
        message="确定要删除这个书签吗？此操作无法撤销。"
        type="error"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
