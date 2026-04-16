/**

 */
/**
 * HTML 
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (s) => map[s])
}
/**
 * 
 */
export function sanitizeString(input: string, options: {
  maxLength?: number
  allowHtml?: boolean
  trimWhitespace?: boolean
} = {}): string {
  const {
    maxLength = 1000,
    allowHtml = false,
    trimWhitespace = true
  } = options
  let result = input
  if (trimWhitespace) {
    result = result.trim()
  }
  if (result.length > maxLength) {
    result = result.substring(0, maxLength)
  }

  if (!allowHtml) {
    result = escapeHtml(result)
  }
  return result
}
/**

 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim())

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    //  JavaScript 
    if (parsed.protocol === 'javascript:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}
/**
 * 
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return null
  }
  if (trimmed.length > 254) {
    return null
  }
  return trimmed
}
/**
 * 
 */
export function sanitizeUsername(username: string): string | null {
  const trimmed = username.trim()
  // ：3-20，、、
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  if (!usernameRegex.test(trimmed)) {
    return null
  }
  return trimmed
}
/**
 * 
 */
export function sanitizeTagName(tagName: string): string | null {
  const trimmed = tagName.trim()

  if (trimmed.length === 0 || trimmed.length > 50) {
    return null
  }
  const cleaned = trimmed.replace(/[<>"'&]/g, '')
  if (cleaned.length === 0) {
    return null
  }
  return cleaned
}
/**

 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.\./g, '')
    .trim()
    .substring(0, 255)
}
/**

 */
export function sanitizeColor(color: string): string | null {
  const trimmed = color.trim()
  //  hex 
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  if (hexRegex.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  const allowedColors = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 
    'pink', 'cyan', 'gray', 'black', 'white'
  ]
  if (allowedColors.includes(trimmed.toLowerCase())) {
    return trimmed.toLowerCase()
  }
  return null
}
/**
 * 
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>"'&]/g, '') 
    .substring(0, 100) 
}
/**
 * 
 */
export function sanitizePaginationParams(params: {
  page?: string | number
  pageSize?: string | number
  cursor?: string
}): {
  page: number
  pageSize: number
  cursor?: string
} {
  const page = Math.max(1, parseInt(String(params.page || 1), 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || 30), 10) || 30))
  const result: { page: number; pageSize: number; cursor?: string } = { page, pageSize }
  if (params.cursor && typeof params.cursor === 'string') {

    if (/^[a-zA-Z0-9-]+$/.test(params.cursor)) {
      result.cursor = params.cursor
    }
  }
  return result
}
/**

 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  rules: Partial<Record<keyof T, (value: unknown) => unknown>>
): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    const rule = rules[key as keyof T]
    if (rule && value !== undefined && value !== null) {
      const sanitized = rule(value)
      if (sanitized !== null && sanitized !== undefined) {
        result[key as keyof T] = sanitized
      }
    }
  }
  return result
}
/**
 *  JSON 
 */
export function validateJsonStructure(
  data: unknown,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>
): boolean {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  for (const [key, expectedType] of Object.entries(schema)) {
    const value = obj[key]
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') return false
        break
      case 'number':
        if (typeof value !== 'number') return false
        break
      case 'boolean':
        if (typeof value !== 'boolean') return false
        break
      case 'array':
        if (!Array.isArray(value)) return false
        break
      case 'object':
        if (typeof value !== 'object' || value === null) return false
        break
    }
  }
  return true
}
