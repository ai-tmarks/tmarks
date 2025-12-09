import { Bookmark, Tag, TrendingUp, Globe, Clock, ExternalLink } from 'lucide-react'
import type { BookmarkStatistics } from '../hooks/useStatisticsData'

interface StatisticsCardsProps {
  statistics: BookmarkStatistics
  formatDate: (date: string) => string
  formatDateTime: (date: string) => string
}

export function StatisticsCards({ statistics, formatDate, formatDateTime }: StatisticsCardsProps) {
  return (
    <>
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

      {/* Current Range Clicks */}
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
    </>
  )
}
