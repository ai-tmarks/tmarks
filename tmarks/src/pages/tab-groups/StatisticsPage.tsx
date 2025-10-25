import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Layers, Share2, Archive, Globe, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tabGroupsService } from '@/services/tab-groups'
import type { StatisticsResponse } from '@/lib/types'
import { logger } from '@/lib/logger'

export function StatisticsPage() {
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadStatistics()
  }, [days])

  const loadStatistics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await tabGroupsService.getStatistics(days)
      setStatistics(data)
    } catch (err) {
      logger.error('Failed to load statistics:', err)
      setError('加载统计数据失败')
    } finally {
      setIsLoading(false)
    }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">使用统计</h1>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground"
          >
            <option value={7}>最近 7 天</option>
            <option value={30}>最近 30 天</option>
            <option value={90}>最近 90 天</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-8 h-8 text-primary" />
            <span className="text-3xl font-bold text-foreground">{statistics.summary.total_groups}</span>
          </div>
          <p className="text-muted-foreground">标签页组</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-success" />
            <span className="text-3xl font-bold text-foreground">{statistics.summary.total_items}</span>
          </div>
          <p className="text-muted-foreground">标签页</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <Share2 className="w-8 h-8 text-accent" />
            <span className="text-3xl font-bold text-foreground">{statistics.summary.total_shares}</span>
          </div>
          <p className="text-muted-foreground">分享</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <Archive className="w-8 h-8 text-muted-foreground" />
            <span className="text-3xl font-bold text-foreground">{statistics.summary.total_deleted_groups}</span>
          </div>
          <p className="text-muted-foreground">回收站</p>
        </div>
      </div>

      {/* Top Domains */}
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          热门域名 Top 10
        </h2>
        {statistics.top_domains.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {statistics.top_domains.map((domain, index) => (
              <div key={domain.domain} className="flex items-center gap-4">
                <span className="text-lg font-semibold text-muted-foreground/50 w-8">{index + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground font-medium">{domain.domain}</span>
                    <span className="text-muted-foreground">{domain.count} 个</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
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

      {/* Group Size Distribution */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" />
          标签页组大小分布
        </h2>
        {statistics.group_size_distribution.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {statistics.group_size_distribution.map((item) => (
              <div key={item.range} className="flex items-center gap-4">
                <span className="text-foreground font-medium w-20">{item.range} 个</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="w-full bg-muted rounded-full h-8">
                      <div
                        className="bg-success h-8 rounded-full transition-all flex items-center justify-end pr-3"
                        style={{
                          width: `${(item.count / Math.max(...statistics.group_size_distribution.map((d) => d.count))) * 100}%`,
                          minWidth: '60px',
                        }}
                      >
                        <span className="text-white font-semibold">{item.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">标签页组创建趋势</h2>
          {statistics.trends.groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {statistics.trends.groups.slice(-10).map((trend) => (
                <div key={trend.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{trend.date}</span>
                  <span className="font-semibold text-foreground">{trend.count} 个</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">标签页添加趋势</h2>
          {statistics.trends.items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {statistics.trends.items.slice(-10).map((trend) => (
                <div key={trend.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{trend.date}</span>
                  <span className="font-semibold text-foreground">{trend.count} 个</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

