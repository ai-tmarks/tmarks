import { useState, useEffect } from 'react'
import { Archive, RotateCcw, Trash2, Calendar, Layers, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useToastStore } from '@/stores/toastStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { logger } from '@/lib/logger'

export function TrashPage() {
  const { success, error: showError } = useToastStore()
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Confirm dialog state
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

  useEffect(() => {
    loadTrash()
  }, [])

  const loadTrash = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await tabGroupsService.getTrash()
      setTabGroups(response.tab_groups)
    } catch (err) {
      logger.error('Failed to load trash:', err)
      setError('加载回收站失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '恢复标签页组',
      message: `确定要恢复"${title}"吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false })
        try {
          await tabGroupsService.restoreTabGroup(id)
          setTabGroups((prev) => prev.filter((g) => g.id !== id))
          success('恢复成功')
        } catch (err) {
          logger.error('Failed to restore:', err)
          showError('恢复失败，请重试')
        }
      },
    })
  }

  const handlePermanentDelete = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '永久删除',
      message: `确定要永久删除"${title}"吗？此操作不可撤销！`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false })
        try {
          await tabGroupsService.permanentDeleteTabGroup(id)
          setTabGroups((prev) => prev.filter((g) => g.id !== id))
          success('删除成功')
        } catch (err) {
          logger.error('Failed to delete:', err)
          showError('删除失败，请重试')
        }
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={loadTrash}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/tab"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回标签页组</span>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Archive className="w-8 h-8 text-muted-foreground" />
          <h1 className="text-3xl font-bold text-foreground">回收站</h1>
        </div>
        <p className="text-muted-foreground">已删除的标签页组将保留在这里，可以恢复或永久删除</p>
      </div>

      {/* Empty State */}
      {tabGroups.length === 0 ? (
        <div className="text-center py-16">
          <Archive className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">回收站是空的</h3>
          <p className="text-muted-foreground">没有已删除的标签页组</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tabGroups.map((group) => (
            <div
              key={group.id}
              className="card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{group.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      <span>{group.item_count || 0} 个标签页</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        删除于{' '}
                        {group.deleted_at
                          ? formatDistanceToNow(new Date(group.deleted_at), {
                              addSuffix: true,
                              locale: zhCN,
                            })
                          : '未知'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(group.id, group.title)}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    恢复
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(group.id, group.title)}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    永久删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  )
}

