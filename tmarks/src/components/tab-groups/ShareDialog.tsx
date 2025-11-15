import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Share2, Eye } from 'lucide-react'
import { tabGroupsService } from '@/services/tab-groups'
import type { Share } from '@/lib/types'
import { Z_INDEX } from '@/lib/constants/z-index'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface ShareDialogProps {
  groupId: string
  groupTitle: string
  onClose: () => void
}

export function ShareDialog({ groupId, groupTitle, onClose }: ShareDialogProps) {
  const isMobile = useIsMobile()
  const [share, setShare] = useState<Share | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCopyError, setShowCopyError] = useState(false)

  // 阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const loadOrCreateShare = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Try to get existing share
      try {
        const response = await tabGroupsService.getShare(groupId)
        setShare(response.share)
        setShareUrl(response.share_url)
      } catch {
        // If no share exists, create one
        const response = await tabGroupsService.createShare(groupId, { is_public: true })
        setShare(response.share)
        setShareUrl(response.share_url)
      }
    } catch (error) {
      console.error('Failed to load/create share:', error)
      setError('创建分享链接失败')
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadOrCreateShare()
  }, [loadOrCreateShare])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setShowCopyError(true)
    }
  }

  const handleDelete = async () => {
    try {
      await tabGroupsService.deleteShare(groupId)
      onClose()
    } catch (err) {
      console.error('Failed to delete share:', err)
      setError('删除失败')
    }
  }

  const dialogContent = (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" style={{ zIndex: Z_INDEX.SHARE_DIALOG }} onClick={onClose}>
      <div className="rounded-2xl sm:rounded-3xl shadow-xl max-w-md w-full border border-border" style={{backgroundColor: 'var(--card)'}} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-border ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Share2 className={`text-primary ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
            <h2 className={`font-semibold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>分享标签页组</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className={isMobile ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        </div>

        {/* Content */}
        <div className={isMobile ? 'p-4' : 'p-6'}>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">生成分享链接中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <button
                onClick={loadOrCreateShare}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                重试
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">标签页组名称</p>
                <p className="text-foreground font-medium">{groupTitle}</p>
              </div>

              {share && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Eye className="w-4 h-4" />
                    <span>浏览次数: {share.view_count}</span>
                  </div>
                </div>
              )}

              <div className="mb-4 sm:mb-6">
                <p className="text-sm text-muted-foreground mb-2">分享链接</p>
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={handleCopy}
                    className={`bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 ${isMobile ? 'py-3 min-h-[44px]' : 'px-4 py-2'}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded p-3 sm:p-4 mb-4">
                <p className="text-xs sm:text-sm text-foreground">
                  💡 任何人都可以通过此链接查看您的标签页组，但无法编辑。
                </p>
              </div>

              <div className={`flex gap-2 ${isMobile ? 'flex-col-reverse' : 'justify-between'}`}>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`text-destructive hover:bg-destructive/10 rounded transition-colors ${isMobile ? 'py-3 min-h-[44px]' : 'px-4 py-2'}`}
                >
                  删除分享
                </button>
                <button
                  onClick={onClose}
                  className={`bg-muted text-foreground rounded hover:bg-muted/80 transition-colors ${isMobile ? 'py-3 min-h-[44px]' : 'px-4 py-2'}`}
                >
                  关闭
                </button>
              </div>

              {/* 删除确认对话框 */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.CONFIRM_DIALOG }} onClick={() => setShowDeleteConfirm(false)}>
                  <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-2">确认删除</h3>
                    <p className="text-sm text-muted-foreground mb-6">确定要删除分享链接吗？删除后链接将失效。</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn btn-outline flex-1 min-h-[44px]"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          handleDelete()
                        }}
                        className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 min-h-[44px]"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 复制失败提示 */}
              {showCopyError && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.ALERT_DIALOG }} onClick={() => setShowCopyError(false)}>
                  <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-2">复制失败</h3>
                    <p className="text-sm text-muted-foreground mb-6">无法复制到剪贴板，请手动复制链接。</p>
                    <button
                      onClick={() => setShowCopyError(false)}
                      className="btn w-full min-h-[44px]"
                    >
                      确定
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}

