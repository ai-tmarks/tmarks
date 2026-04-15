export interface BookmarkStatistics {
  summary: {
    total_bookmarks: number
    total_tags: number
    total_clicks: number
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

/**
 *  SQL 
 * @param granularity : day, week, month, year
 * @param field 
 */
export function getDateGroupSql(granularity: string, field: string) {
  let dateGroupBy = ''
  let dateSelect = ''

  switch (granularity) {
    case 'year':
      dateGroupBy = `strftime('%Y', ${field})`
      dateSelect = `strftime('%Y', ${field}) as date`
      break
    case 'month':
      dateGroupBy = `strftime('%Y-%m', ${field})`
      dateSelect = `strftime('%Y-%m', ${field}) as date`
      break
    case 'week':
      dateGroupBy = `strftime('%Y-W%W', ${field})`
      dateSelect = `strftime('%Y-W%W', ${field}) as date`
      break
    case 'day':
    default:
      dateGroupBy = `DATE(${field})`
      dateSelect = `DATE(${field}) as date`
      break
  }

  return { dateGroupBy, dateSelect }
}
