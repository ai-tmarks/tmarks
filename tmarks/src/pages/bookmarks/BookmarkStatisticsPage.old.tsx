import { useState, useEffect, useCallback } from 'react'
import { BarChart3, TrendingUp, Tag, Globe, Clock, Bookmark, ArrowLeft, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookmarksService } from '@/services/bookmarks'
import { logger } from '@/lib/logger'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileHeader } from '@/components/common/MobileHeader'

interface BookmarkStatistics {
  summary: {
    total_bookmarks: number
    total_tags: number
    total_clicks: number
    archived_bookmarks: number
    public_bookmarks: number
  }
  top_bookmarks: Array<{
    id: string
    title: string
    url: string
    click_count: number
    last_clicked_at: string | null
  }>
  top_tags: Array<{
    id: string
    name: string
    color: string | null
    click_count: number
    bookmark_count: number
  }>
  top_domains: Array<{
    domain: string
    count: number
  }>
  // 当前时间范围内，每个书签的点击次数（按点击次数降序）
  bookmark_clicks: Array<{
    id: string
    title: string
    url: string
    click_count: number
  }>
  recent_clicks: Array<{
    id: string
    title: string
    url: string
    last_clicked_at: string
  }>
  trends: {
    bookmarks: Array<{ date: string; count: number }>
    clicks: Array<{ date: string; count: number }>
  }
}

type Granularity = 'day' | 'week' | 'month' | 'year'

interface BookmarkStatisticsPageProps {
  embedded?: boolean // 是否嵌入在其他页面中（如设置页面）
}

export function BookmarkStatisticsPage({ embedded = false }: BookmarkStatisticsPageProps) {
  const isMobile = useIsMobile()
  const [statistics, setStatistics] = useState<BookmarkStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 时间粒度和范围控制
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  // 计算开始和结束日期
  const getDateRange = useCallback((): { startDate: string; endDate: string } => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (granularity) {
      case 'day':
        // 当天
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week': {
        // 当周（周一到周日）
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1)
        start.setDate(diff)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      }
      case 'month':
        // 当月
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(start.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        // 当年
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        break
    }

    return {
      startDate: start.toISOString().split('T')[0] as string,
      endDate: end.toISOString().split('T')[0] as string
    }
  }, [currentDate, granularity])

  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const range = getDateRange()
      const data = await bookmarksService.getStatistics({
        granularity,
        startDate: range.startDate,
        endDate: range.endDate
      }) as BookmarkStatistics
      setStatistics(data)
    } catch (err) {
      logger.error('Failed to load bookmark statistics:', err)
      setError('加载统计数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [granularity, getDateRange])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  // 时间导航
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

  // 回到今天
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // 格式化当前时间范围显示
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

    // 根据当前粒度格式化日期，避免 week/month/year 下的字符串被当成无效日期
    if (granularity === 'year') {
      // 例如: "2025" → "2025 年"
      return `${dateString} 年`
    }

    if (granularity === 'month') {
      // 例如: "2025-02" → "2025 年 2 月"
      const [year, month] = dateString.split('-')
      if (!year || !month) return dateString
      const monthNum = Number.parseInt(month, 10)
      if (!Number.isFinite(monthNum)) return dateString
      return `${year} 年 ${monthNum} 月`
    }

    if (granularity === 'week') {
      // 例如: "2025-W08" → "2025 年第 8 周"
      const [year, weekPart] = dateString.split('-W')
      if (!year || !weekPart) return dateString
      const weekNum = Number.parseInt(weekPart, 10)
      if (!Number.isFinite(weekNum)) return dateString
      return `${year} 年第 ${weekNum} 周`
    }

    // 默认按天处理: "YYYY-MM-DD"
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
      {/* 移动端顶部工具栏 */}
      {isMobile && (
        <MobileHeader
          title="书签统计"
          showMenu={false}
          showSearch={false}
          showMore={false}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
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

            {/* 粒度选择器 */}
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

          {/* 时间导航 */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Bookmark className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{statistics.summary.total_bookmarks}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">书签总数</p>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-success" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{statistics.summary.total_tags}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">标签数量</p>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{statistics.summary.total_clicks}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">总点击数</p>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{statistics.summary.public_bookmarks}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">公开书签</p>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{statistics.summary.archived_bookmarks}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">已归档</p>
          </div>
        </div>

        {/* Top Bookmarks */}
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            热门书签 Top 10
          </h2>
          {statistics.top_bookmarks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {statistics.top_bookmarks.map((bookmark, index) => (
                <div key={bookmark.id} className="flex items-center gap-3 sm:gap-4">
                  <span className="text-base sm:text-lg font-semibold text-muted-foreground/50 w-6 sm:w-8">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base text-foreground font-medium hover:text-primary truncate flex items-center gap-1"
                      >
                        {bookmark.title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <span className="text-xs sm:text-sm text-muted-foreground ml-2 flex-shrink-0">{bookmark.click_count} 次</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-primary h-1.5 sm:h-2 rounded-full transition-all"
                        style={{
                          width: `${statistics.top_bookmarks[0] ? (bookmark.click_count / statistics.top_bookmarks[0].click_count) * 100 : 0}%`,
                        }}
                      ></div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* 当前时间范围内书签点击统计 */}
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            当前时间范围内书签点击统计
          </h2>
          {statistics.bookmark_clicks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">当前时间范围内暂无点击数据</p>
          ) : (
            <div className="space-y-3">
              {statistics.bookmark_clicks.slice(0, 10).map((bookmark, index) => (
                <div key={bookmark.id} className="flex items-center gap-3 sm:gap-4">
                  <span className="text-base sm:text-lg font-semibold text-muted-foreground/50 w-6 sm:w-8">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base text-foreground font-medium hover:text-primary truncate flex items-center gap-1"
                      >
                        {bookmark.title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <span className="text-xs sm:text-sm text-muted-foreground ml-2 flex-shrink-0">
                        {bookmark.click_count} 次
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>



        {/* Top Tags and Domains */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Top Tags */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              热门标签 Top 10
            </h2>
            {statistics.top_tags.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {statistics.top_tags.map((tag, index) => (
                  <div key={tag.id} className="flex items-center gap-3">
                    <span className="text-sm sm:text-base font-semibold text-muted-foreground/50 w-6">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm sm:text-base text-foreground font-medium">{tag.name}</span>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span>{tag.click_count} 次</span>
                          <span>·</span>
                          <span>{tag.bookmark_count} 个</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-success h-1.5 rounded-full transition-all"
                          style={{
                            width: `${statistics.top_tags[0] ? (tag.click_count / statistics.top_tags[0].click_count) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Domains */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              热门域名 Top 10
            </h2>
            {statistics.top_domains.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {statistics.top_domains.map((domain, index) => (
                  <div key={domain.domain} className="flex items-center gap-3">
                    <span className="text-sm sm:text-base font-semibold text-muted-foreground/50 w-6">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm sm:text-base text-foreground font-medium truncate">{domain.domain}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground ml-2 flex-shrink-0">{domain.count} 个</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-accent h-1.5 rounded-full transition-all"
                          style={{
                            width: `${statistics.top_domains[0] ? (domain.count / statistics.top_domains[0].count) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Clicks */}
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            最近访问
          </h2>
          {statistics.recent_clicks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {statistics.recent_clicks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm sm:text-base text-foreground hover:text-primary truncate flex items-center gap-1"
                  >
                    {bookmark.title}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <span className="text-xs sm:text-sm text-muted-foreground ml-2 flex-shrink-0">
                    {formatDateTime(bookmark.last_clicked_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">书签创建趋势</h2>
            {statistics.trends.bookmarks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {statistics.trends.bookmarks.slice(-10).map((trend) => (
                  <div key={trend.date} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">{formatDate(trend.date)}</span>
                    <span className="font-semibold text-foreground">{trend.count} 个</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">书签访问趋势</h2>
            {statistics.trends.clicks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {statistics.trends.clicks.slice(-10).map((trend) => (
                  <div key={trend.date} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">{formatDate(trend.date)}</span>
                    <span className="font-semibold text-foreground">{trend.count} 次</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
