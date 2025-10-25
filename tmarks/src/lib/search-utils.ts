/**
 * 搜索工具函数 - 优化搜索性能
 */

/**
 * 快速字符串匹配（不区分大小写）
 * 比 toLowerCase().includes() 更快
 */
export function fastIncludes(text: string, query: string): boolean {
  if (!query) return true
  if (!text) return false
  
  const textLen = text.length
  const queryLen = query.length
  
  if (queryLen > textLen) return false
  if (queryLen === 0) return true
  
  // 转换为小写进行比较
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  return lowerText.includes(lowerQuery)
}

/**
 * 批量搜索多个字段
 */
export function searchInFields(fields: string[], query: string): boolean {
  if (!query) return true
  
  const lowerQuery = query.toLowerCase()
  
  for (const field of fields) {
    if (field && field.toLowerCase().includes(lowerQuery)) {
      return true
    }
  }
  
  return false
}

/**
 * 高亮搜索关键词
 */
export function highlightText(text: string, query: string): string {
  if (!query || !text) return text
  
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
