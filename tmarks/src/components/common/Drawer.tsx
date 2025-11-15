import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Z_INDEX } from '@/lib/constants/z-index'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  side?: 'left' | 'right'
}

/**
 * 移动端抽屉组件
 * 从左侧或右侧滑出的面板
 */
export function Drawer({ isOpen, onClose, children, title, side = 'left' }: DrawerProps) {
  const [shouldRender, setShouldRender] = useState(false)

  // 延迟卸载以显示关闭动画
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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

  if (!shouldRender) return null

  const slideClass = side === 'left'
    ? 'left-0 translate-x-0'
    : 'right-0 translate-x-0'

  const slideOutClass = side === 'left'
    ? '-translate-x-full'
    : 'translate-x-full'

  const drawerContent = (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: Z_INDEX.DRAWER_BACKDROP }}
        onClick={onClose}
      />

      {/* 抽屉内容 */}
      <div
        className={`fixed top-0 ${side}-0 h-full w-[280px] max-w-[80vw] border-r border-border transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? slideClass : slideOutClass
        }`}
        style={{
          zIndex: Z_INDEX.DRAWER_CONTENT,
          backgroundColor: 'var(--card)',
        }}
      >
        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto pb-20 min-h-0">
          {children}
        </div>
      </div>
    </>
  )

  return createPortal(drawerContent, document.body)
}

