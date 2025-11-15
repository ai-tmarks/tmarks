import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Z_INDEX } from '@/lib/constants/z-index'

interface AlertDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  type?: 'info' | 'warning' | 'error' | 'success'
  onConfirm: () => void
}

export function AlertDialog({
  isOpen,
  title = '提示',
  message,
  confirmText = '确定',
  type = 'info',
  onConfirm,
}: AlertDialogProps) {
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
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onConfirm])

  const handleConfirm = () => {
    onConfirm()
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-error/10',
          icon: 'bg-error text-error-content',
          iconRing: 'ring-error/20'
        }
      case 'warning':
        return {
          bg: 'bg-warning/10',
          icon: 'bg-warning text-warning-content',
          iconRing: 'ring-warning/20'
        }
      case 'success':
        return {
          bg: 'bg-success/10',
          icon: 'bg-success text-success-content',
          iconRing: 'ring-success/20'
        }
      default:
        return {
          bg: 'bg-info/10',
          icon: 'bg-info text-info-content',
          iconRing: 'ring-info/20'
        }
    }
  }

  if (!isOpen) return null

  const styles = getTypeStyles()

  const dialogContent = (
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 animate-fade-in" style={{ zIndex: Z_INDEX.ALERT_DIALOG }}>
      {/* 背景遮罩 - 用于点击关闭 */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleConfirm}
      />

      {/* 弹窗内容 */}
      <div className="relative card rounded-2xl sm:rounded-3xl shadow-2xl border max-w-md w-full animate-scale-in p-6 sm:p-8" style={{backgroundColor: 'var(--card)', borderColor: 'var(--border)'}}>
        {/* 图标区域 */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${styles.icon} ${styles.iconRing} ring-4 sm:ring-8 flex items-center justify-center shadow-lg`}>
            {type === 'error' && (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {type === 'warning' && (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {type === 'success' && (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="font-bold text-xl sm:text-2xl mb-2 sm:mb-3 text-foreground">{title}</h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{message}</p>
        </div>

        {/* 按钮 */}
        <button onClick={handleConfirm} className="btn w-full min-h-[44px]">
          {confirmText}
        </button>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
