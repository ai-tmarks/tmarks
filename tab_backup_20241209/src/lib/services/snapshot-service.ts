/**
 * Snapshot Service
 * 使用 SingleFile 捕获完整网页内容（包含内联资源）
 */

export interface SnapshotOptions {
  inlineCSS?: boolean
  inlineImages?: boolean
  inlineFonts?: boolean
  removeScripts?: boolean
  removeHiddenElements?: boolean
  maxImageSize?: number
  timeout?: number
}

const DEFAULT_SNAPSHOT_OPTIONS: SnapshotOptions = {
  inlineCSS: true,
  inlineImages: true,
  inlineFonts: false,
  removeScripts: true,
  removeHiddenElements: false,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  timeout: 30000, // 30秒
}

/**
 * 捕获当前标签页的完整 HTML（使用 SingleFile 方式）
 * 包含内联的 CSS、图片等资源
 */
export async function capturePageSnapshot(
  tabId: number,
  options: Partial<SnapshotOptions> = {}
): Promise<string> {
  const finalOptions = { ...DEFAULT_SNAPSHOT_OPTIONS, ...options }
  
  try {
    // 发送消息到 content script 进行捕获
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'CAPTURE_PAGE',
      options: finalOptions
    })

    if (response.success) {
      return response.html
    } else {
      throw new Error(response.error || 'Capture failed')
    }
  } catch (error) {
    // 降级到简单方案
    return capturePageSimple(tabId)
  }
}

/**
 * 简单的降级方案（不内联资源）
 */
async function capturePageSimple(tabId: number): Promise<string> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML
    })

    if (results && results[0] && results[0].result) {
      return results[0].result as string
    }

    throw new Error('Failed to capture page content')
  } catch (error) {
    throw error
  }
}

/**
 * 估算 HTML 内容的大小（字节）
 */
export function estimateHtmlSize(html: string): number {
  return new Blob([html]).size;
}

/**
 * 压缩 HTML 内容（移除不必要的空白）
 */
export function compressHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')  // 多个空白字符替换为单个空格
    .replace(/>\s+</g, '><')  // 移除标签之间的空白
    .trim();
}
