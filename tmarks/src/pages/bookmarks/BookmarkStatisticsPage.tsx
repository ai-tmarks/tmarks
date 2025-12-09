import { useState } from 'react'
import { BarChart3, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileHeader } from '@/components/common/MobileHeader'
import { StatisticsCards } from './components/StatisticsCards'
import { useStatisticsData, type Granularity } from './hooks/useStatisticsData'

interface BookmarkStatisticsPageProps {
  embedded?: boolean
}

export function BookmarkStatisticsPage({ embedded = false }: BookmarkStatisticsPageProps) {
  const isMobile = useIsMobile()
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  const { statistics, isLoading, error, loadStatistics, getDateRange } = useStatisticsData(granularity, currentDate)

  const navigateTime = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    switch (granularity) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1))
        break
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  const formatCurrentRange = () => {
    const range = getDateRange()
    const start = new Date(range.startDate)
    const end = new Date(range.endDate)

    if (granularity === 'day') {
      return start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    }
    if (granularity === 'week') {
      return `${start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`
    }
    if (granularity === 'month') {
      return start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
    }
    return start.getFullYear() + ' 年'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    if (granularity === 'year') return `${dateString} 年`
    if (granularity === 'month') {
      const [year, month] = dateString.split('-')
      if (!year || !month) return dateString
      const monthNum = Number.parseInt(month, 10)
      if (!Number.isFinite(monthNum)) return dateString
      return `${year} 年 ${monthNum} 月`
    }
    if (granularity === 'week') {
      const [year, weekPart] = dateString.split('-W')
      if (!year || !weekPart) return dateString
      const weekNum = Number.parseInt(weekPart, 10)
      if (!Number.isFinite(weekNum)) return dateString
      return `${year} 年第 ${weekNum} 周`
    }
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return dateString
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (error || !statistics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || '加载失败'}</p>
          <button
            onClick={loadStatistics}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-20' : ''}`}>
      {isMobile && (
        <MobileHeader
          title="书签统计"
          showMenu={false}
          showSearch={false}
          showMore={false}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          {!isMobile && !embedded && (
            <Link
              to="/bookmarks"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回书签</span>
            </Link>
          )}

          <div className="flex items-center justify-between mb-4">
            {!isMobile && !embedded && (
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">书签统计</h1>
              </div>
            )}

            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground"
            >
              <option value="day">按日</option>
              <option value="week">按周</option>
              <option value="month">按月</option>
              <option value="year">按年</option>
            </select>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={() => navigateTime('prev')}
              className="btn btn-secondary btn-sm flex items-center gap-1"
              title={`上一${granularity === 'day' ? '天' : granularity === 'week' ? '周' : granularity === 'month' ? '月' : '年'}`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">
                {granularity === 'day' ? '上一天' : granularity === 'week' ? '上一周' : granularity === 'month' ? '上一月' : '上一年'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="text-base sm:text-lg font-semibold text-foreground px-3 sm:px-4 py-2 bg-muted/30 rounded-lg min-w-[200px] sm:min-w-[280px] text-center">
                {formatCurrentRange()}
              </div>
              <button
                onClick={goToToday}
                className="btn btn-ghost btn-sm"
                title="回到今天"
              >
                今天
              </button>
            </div>

            <button
              onClick={() => navigateTime('next')}
              className="btn btn-secondary btn-sm flex items-center gap-1"
              title={`下一${granularity === 'day' ? '天' : granularity === 'week' ? '周' : granularity === 'month' ? '月' : '年'}`}
            >
              <span className="hidden sm:inline">
                {granularity === 'day' ? '下一天' : granularity === 'week' ? '下一周' : granularity === 'month' ? '下一月' : '下一年'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <StatisticsCards
          statistics={statistics}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      </div>
    </div>
  )
}
