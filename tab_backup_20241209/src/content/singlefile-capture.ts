/**
 * SingleFile Content Script
 * 在页面上下文中运行，捕获完整页面（包含内联资源）
 */

interface CaptureOptions {
  inlineCSS?: boolean
  inlineImages?: boolean
  inlineFonts?: boolean
  removeScripts?: boolean
  removeHiddenElements?: boolean
  maxImageSize?: number
  timeout?: number
}

const DEFAULT_OPTIONS: CaptureOptions = {
  inlineCSS: true,
  inlineImages: true,
  inlineFonts: false, // 字体文件通常很大，默认不内联
  removeScripts: true,
  removeHiddenElements: false,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  timeout: 30000, // 30秒
}

/**
 * 捕获页面（导出供其他模块使用）
 */
export async function capturePage(options: Partial<CaptureOptions> = {}): Promise<string> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options }
  
  try {
    // 克隆文档
    const doc = document.cloneNode(true) as Document
    
    // 1. 内联 CSS
    if (finalOptions.inlineCSS) {
      await inlineStylesheets(doc, finalOptions.timeout!)
    }
    
    // 2. 内联图片
    if (finalOptions.inlineImages) {
      await inlineImages(doc, finalOptions.maxImageSize!, finalOptions.timeout!)
    }
    
    // 3. 内联字体（可选）
    if (finalOptions.inlineFonts) {
      await inlineFonts(doc, finalOptions.timeout!)
    }
    
    // 4. 移除脚本
    if (finalOptions.removeScripts) {
      removeScripts(doc)
    }
    
    // 5. 移除隐藏元素（可选）
    if (finalOptions.removeHiddenElements) {
      removeHiddenElements(doc)
    }
    
    // 6. 添加元数据
    addMetadata(doc)
    
    const html = doc.documentElement.outerHTML
    return html
  } catch (error) {
    throw error
  }
}

/**
 * 内联所有样式表
 */
async function inlineStylesheets(doc: Document, timeout: number): Promise<void> {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
  const startTime = Date.now()
  
  for (const link of links) {
    if (Date.now() - startTime > timeout) {
      break
    }
    
    try {
      const href = (link as HTMLLinkElement).href
      if (!href || href.startsWith('data:')) continue
      
      const response = await fetch(href)
      if (!response.ok) continue
      
      const css = await response.text()
      
      // 处理 CSS 中的相对 URL
      const processedCSS = await processCSSUrls(css, href)
      
      const style = doc.createElement('style')
      style.setAttribute('data-original-href', href)
      style.textContent = processedCSS
      link.replaceWith(style)
    } catch (error) {
      // Silently handle error
    }
  }
  
  // 内联 style 标签中的 @import
  const styles = Array.from(doc.querySelectorAll('style'))
  for (const style of styles) {
    if (style.textContent) {
      style.textContent = await processCSSUrls(style.textContent, document.baseURI)
    }
  }
}

/**
 * 处理 CSS 中的 URL（转换为绝对路径或内联）
 */
async function processCSSUrls(css: string, baseUrl: string): Promise<string> {
  // 匹配 url() 函数
  const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g
  const matches = Array.from(css.matchAll(urlRegex))
  
  let processedCSS = css
  
  for (const match of matches) {
    const originalUrl = match[1]
    if (originalUrl.startsWith('data:')) continue
    
    try {
      // 转换为绝对 URL
      const absoluteUrl = new URL(originalUrl, baseUrl).href
      
      // 尝试获取并转换为 base64（仅对小文件）
      const response = await fetch(absoluteUrl)
      if (response.ok) {
        const blob = await response.blob()
        if (blob.size < 100 * 1024) { // 小于 100KB 才内联
          const base64 = await blobToBase64(blob)
          processedCSS = processedCSS.replace(match[0], `url(${base64})`)
          continue
        }
      }
      
      // 否则使用绝对 URL
      processedCSS = processedCSS.replace(match[0], `url(${absoluteUrl})`)
    } catch (error) {
      // Silently handle error
    }
  }
  
  return processedCSS
}

/**
 * 内联所有图片
 */
async function inlineImages(doc: Document, maxSize: number, timeout: number): Promise<void> {
  const images = Array.from(doc.querySelectorAll('img[src]'))
  const startTime = Date.now()
  
  for (const img of images) {
    if (Date.now() - startTime > timeout) {
      break
    }
    
    try {
      const src = (img as HTMLImageElement).src
      if (!src) {
        continue
      }
      
      // 已经是 data URL，跳过
      if (src.startsWith('data:')) {
        continue
      }
      
      const response = await fetch(src)
      if (!response.ok) {
        continue
      }
      
      const blob = await response.blob()
      
      // 检查大小
      if (blob.size > maxSize) {
        continue
      }
      
      const base64 = await blobToBase64(blob)
      ;(img as HTMLImageElement).src = base64
      ;(img as HTMLImageElement).setAttribute('data-original-src', src)
    } catch (error) {
      // Silently handle error
    }
  }
}

/**
 * 内联字体
 */
async function inlineFonts(doc: Document, timeout: number): Promise<void> {
  const styles = Array.from(doc.querySelectorAll('style'))
  const startTime = Date.now()
  
  for (const style of styles) {
    if (Date.now() - startTime > timeout) {
      break
    }
    
    if (!style.textContent) continue
    
    // 匹配 @font-face 规则
    const fontFaceRegex = /@font-face\s*{[^}]*}/g
    const matches = Array.from(style.textContent.matchAll(fontFaceRegex))
    
    for (const match of matches) {
      const fontFace = match[0]
      const urlMatch = fontFace.match(/url\(['"]?([^'")\s]+)['"]?\)/)
      
      if (urlMatch && urlMatch[1]) {
        const fontUrl = urlMatch[1]
        if (fontUrl.startsWith('data:')) continue
        
        try {
          const absoluteUrl = new URL(fontUrl, document.baseURI).href
          const response = await fetch(absoluteUrl)
          if (!response.ok) continue
          
          const blob = await response.blob()
          const base64 = await blobToBase64(blob)
          
          style.textContent = style.textContent.replace(fontUrl, base64)
        } catch (error) {
          // Silently handle error
        }
      }
    }
  }
}

/**
 * 移除脚本
 */
function removeScripts(doc: Document): void {
  const scripts = Array.from(doc.querySelectorAll('script'))
  scripts.forEach(script => script.remove())
}

/**
 * 移除隐藏元素
 */
function removeHiddenElements(doc: Document): void {
  const elements = Array.from(doc.querySelectorAll('*'))
  
  for (const element of elements) {
    const style = window.getComputedStyle(element as Element)
    if (style.display === 'none' || style.visibility === 'hidden') {
      element.remove()
    }
  }
}

/**
 * 添加元数据
 */
function addMetadata(doc: Document): void {
  const meta = doc.createElement('meta')
  meta.setAttribute('name', 'tmarks-snapshot')
  meta.setAttribute('content', JSON.stringify({
    capturedAt: new Date().toISOString(),
    originalUrl: document.location.href,
    title: document.title,
    userAgent: navigator.userAgent
  }))
  
  const head = doc.querySelector('head')
  if (head) {
    head.appendChild(meta)
  }
}

/**
 * Blob 转 Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
