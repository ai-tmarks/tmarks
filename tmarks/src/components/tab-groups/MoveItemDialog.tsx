import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, FolderOpen } from 'lucide-react'
import type { TabGroup } from '@/lib/types'
import { Z_INDEX } from '@/lib/constants/z-index'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface MoveItemDialogProps {
  isOpen: boolean
  itemTitle: string
  currentGroupId: string
  availableGroups: TabGroup[]
  onMove: (targetGroupId: string) => void
  onClose: () => void
}

export function MoveItemDialog({
  isOpen,
  itemTitle,
  currentGroupId,
  availableGroups,
  onMove,
  onClose,
}: MoveItemDialogProps) {
  const isMobile = useIsMobile()
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // 过滤掉当前组和文件夹
  const targetGroups = availableGroups.filter(
    (g) => g.id !== currentGroupId && g.is_folder !== 1
  )

  const handleMove = () => {
    if (selectedGroupId) {
      onMove(selectedGroupId)
      onClose()
    }
  }

  const dialogContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" style={{ zIndex: Z_INDEX.MOVE_ITEM_DIALOG }} onClick={onClose}>
      <div className="border border-border rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-md" style={{ backgroundColor: 'var(--card)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-border ${isMobile ? 'p-4' : 'p-5'}`}>
          <h2 className={`font-semibold text-foreground ${isMobile ? 'text-base' : 'text-lg'}`}>移动标签页</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className={isMobile ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        </div>

        {/* Content */}
        <div className={`space-y-4 ${isMobile ? 'p-4' : 'p-5'}`}>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              将 <span className="font-medium text-foreground">"{itemTitle}"</span> 移动到：
            </p>
          </div>

          {/* Group List */}
          <div className={`overflow-y-auto space-y-2 ${isMobile ? 'max-h-[50vh]' : 'max-h-96'}`}>
            {targetGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>没有可用的目标组</p>
              </div>
            ) : (
              targetGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full text-left rounded-lg border-2 transition-all ${isMobile ? 'p-3 min-h-[60px]' : 'p-3'} ${selectedGroupId === group.id
                      ? 'border-primary shadow-md'
                      : 'border-border hover:bg-muted hover:border-muted-foreground/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{group.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.item_count || 0} 个标签页
                      </p>
                    </div>
                    {selectedGroupId === group.id && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-2" style={{ backgroundColor: 'var(--primary)' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ color: 'var(--primary-foreground)' }} />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-2 border-t border-border ${isMobile ? 'flex-col-reverse p-4' : 'justify-end p-5'}`}>
          <button
            onClick={onClose}
            className={`text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors ${isMobile ? 'w-full py-3 min-h-[44px]' : 'px-4 py-2 text-sm'}`}
          >
            取消
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedGroupId}
            className={`bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full py-3 min-h-[44px]' : 'px-4 py-2 text-sm'}`}
          >
            移动
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
