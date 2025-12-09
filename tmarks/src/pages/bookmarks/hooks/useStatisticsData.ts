import { useState, useEffect, useCallback } from 'react'
import { bookmarksService } from '@/services/bookmarks'
import { logger } from '@/lib/logger'

export interface BookmarkStatistics {
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

export type Granularity = 'day' | 'week' | 'month' | 'year'

export function useStatisticsData(granularity: Granularity, currentDate: Date) {
  const [statistics, setStatistics] = useState<BookmarkStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = useCallback((): { startDate: string; endDate: string } => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (granularity) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week': {
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1)
        start.setDate(diff)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      }
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(start.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
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

  return {
    statistics,
    isLoading,
    error,
    loadStatistics,
    getDateRange,
  }
}
