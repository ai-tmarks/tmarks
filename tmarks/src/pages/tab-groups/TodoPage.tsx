import { useState, useEffect } from 'react'
import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup } from '@/lib/types'
import { TodoSidebar } from '@/components/tab-groups/TodoSidebar'
import { MobileHeader } from '@/components/common/MobileHeader'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { logger } from '@/lib/logger'

/**
 * 待办事项页面（移动端独立页面）
 */
export function TodoPage() {
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const loadTabGroups = async () => {
    try {
      setLoading(true)
      const groups = await tabGroupsService.getAllTabGroups()
      setTabGroups(groups.filter((g) => !g.is_deleted))
    } catch (err) {
      logger.error('Failed to load tab groups:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTabGroups()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col bg-background ${isMobile ? 'overflow-hidden' : ''}`}>
      {/* 移动端顶部工具栏 */}
      {isMobile && (
        <MobileHeader
          title="待办事项"
          showMenu={false}
          showSearch={false}
          showMore={false}
        />
      )}

      {/* 待办列表 */}
      <div className={`flex-1 overflow-hidden ${isMobile ? 'min-h-0' : ''}`}>
        <TodoSidebar tabGroups={tabGroups} onUpdate={loadTabGroups} />
      </div>
    </div>
  )
}

