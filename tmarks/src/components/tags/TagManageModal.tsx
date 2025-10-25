import { useMemo, useState } from 'react'
import type { Tag } from '@/lib/types'
import { useDeleteTag, useUpdateTag } from '@/hooks/useTags'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { TagFormModal } from './TagFormModal'
import { logger } from '@/lib/logger'

interface TagManageModalProps {
  tags: Tag[]
  onClose: () => void
}

export function TagManageModal({ tags, onClose }: TagManageModalProps) {
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showErrorAlert, setShowErrorAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const deleteTag = useDeleteTag()
  const updateTag = useUpdateTag()

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => (b.bookmark_count || 0) - (a.bookmark_count || 0))
  }, [tags])

  const handleEditClick = (tag: Tag) => {
    setEditingTag(tag)
    setEditName(tag.name)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (value?: string) => {
    if (!editingTag) return
    const nextName = value?.trim() ?? editName.trim()
    if (!nextName) return

    try {
      await updateTag.mutateAsync({
        id: editingTag.id,
        data: { name: nextName },
      })
      setEditingTag(null)
      setEditName('')
      setIsEditModalOpen(false)
      setSuccessMessage('标签已成功更新')
      setShowSuccessAlert(true)
    } catch (error) {
      logger.error('Failed to update tag:', error)
      setErrorMessage('更新失败，请重试')
      setShowErrorAlert(true)
    }
  }

  const handleCancelEdit = () => {
    setEditingTag(null)
    setEditName('')
    setIsEditModalOpen(false)
  }

  const openDeleteConfirm = (tag: Tag) => {
    setTagToDelete(tag)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return

    setShowDeleteConfirm(false)
    try {
      await deleteTag.mutateAsync(tagToDelete.id)
      if (editingTag?.id === tagToDelete.id) {
        setEditingTag(null)
        setIsEditModalOpen(false)
        setEditName('')
      }
      setSuccessMessage('标签已成功删除')
      setShowSuccessAlert(true)
    } catch (error) {
      logger.error('Failed to delete tag:', error)
      setErrorMessage('删除失败，请重试')
      setShowErrorAlert(true)
    } finally {
      setTagToDelete(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in bg-black/80 backdrop-blur-sm">
      {/* 背景遮罩 - 用于点击关闭 */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* 模态框 */}
      <div className="relative card rounded-3xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col border border-border animate-scale-in" style={{padding: 0}}>
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">标签管理</h2>
                <p className="text-xs text-muted-foreground mt-0.5">编辑标签名称或删除不需要的标签</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground/60 hover:text-foreground"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 标签列表 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {sortedTags.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground/60">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p className="text-base font-medium mb-1 text-foreground">暂无标签</p>
                <p className="text-sm text-muted-foreground/50">点击 + 按钮创建第一个标签</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                {sortedTags.map((tag, index) => (
                  <div
                    key={tag.id}
                    className="break-inside-avoid cursor-pointer group"
                    style={{ animationDelay: `${index * 40}ms` }}
                    onClick={() => handleEditClick(tag)}
                  >
                    <div className="relative rounded-2xl border border-border bg-card/95 shadow-md hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 hover:-translate-y-0.5">
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                          title="编辑标签"
                        >
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-foreground truncate">{tag.name}</h3>
                          {tag.bookmark_count !== undefined && (
                            <p className="text-xs text-muted-foreground/70">
                              {tag.bookmark_count === 0 ? '暂无关联书签' : `${tag.bookmark_count} 个关联书签`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t border-border bg-muted/30">
            <button
              onClick={onClose}
              className="btn w-full"
            >
              完成
            </button>
          </div>
        </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除标签"
        message={`确定要删除标签"${tagToDelete?.name}"吗？关联的书签不会被删除。`}
        type="warning"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setTagToDelete(null)
        }}
      />

      {/* 成功提示对话框 */}
      <AlertDialog
        isOpen={showSuccessAlert}
        title="操作成功"
        message={successMessage}
        type="success"
        onConfirm={() => setShowSuccessAlert(false)}
      />

      {/* 错误提示对话框 */}
      <AlertDialog
        isOpen={showErrorAlert}
        title="操作失败"
        message={errorMessage}
        type="error"
        onConfirm={() => setShowErrorAlert(false)}
      />

      <TagFormModal
        isOpen={isEditModalOpen && Boolean(editingTag)}
        title="编辑标签"
        initialName={editingTag?.name ?? ''}
        onConfirm={(value) => handleSaveEdit(value)}
        onCancel={handleCancelEdit}
        confirmLabel="保存"
        isSubmitting={updateTag.isPending}
        onDelete={() => {
          if (editingTag) {
            openDeleteConfirm(editingTag)
          }
        }}
        isDeleting={deleteTag.isPending}
      />
    </div>
  )
}