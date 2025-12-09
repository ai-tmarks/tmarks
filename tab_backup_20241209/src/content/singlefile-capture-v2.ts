/**
 * SingleFile Content Script V2
 * 图片单独存储版本
 */

interface CaptureOptions {
  inlineCSS?: boolean
  extractImages?: boolean // 改为提取图片而不是内联
  inlineFonts?: boolean
  removeScripts?: boolean
  removeHiddenElements?: boolean
  maxImageSize?: number
  timeout?: number
}

interface ImageData {
  originalUrl: string
  blob: Blob
  hash: string
  element: HTMLImageElement
}

interface CaptureResult {
  html: string
  images: ImageData[]
}

const DEFAULT_OPTIONS: CaptureOptions = {
  inlineCSS: true,
  extractImages: true,
  inlineFonts: false,
  removeScripts: true,
  removeHiddenElements: false,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  timeout: 30000,
}

/**
 * 计算简单哈希（用于图片去重）
 */
async function simpleHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

/**
 * 捕获页面（V2版本 - 图片单独提取）
 */
export async function capturePageV2(options: Partial<CaptureOptions> = {}): Promise<CaptureResult> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options }
  
  try {
    // 克隆文档
    const doc = document.cloneNode(true) as Document
    
    const images: ImageData[] = []
    
    // 1. 内联 CSS
    if (finalOptions.inlineCSS) {
      await inlineStylesheets(doc, finalOptions.timeout!)
    }
    
    // 2. 提取图片（不内联）
    if (finalOptions.extractImages) {
      const extractedImages = await extractImages(doc, finalOptions.maxImageSize!, finalOptions.timeout!)
      images.push(...extractedImages)
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
    
    return { html, images }
  } catch (error) {
    throw error
  }
}

/**
 * 提取所有图片（不内联到HTML）
 * 支持：img src, img srcset, picture source, video poster, CSS background-image
 */
async function extractImages(
  doc: Document,
  _maxSize: number,
  timeout: number
): Promise<ImageData[]> {
  const startTime = Date.now()
  const images: ImageData[] = []
  const imageMap = new Map<string, string>() // originalUrl -> hash
  
  // 辅助函数：处理单个图片 URL
  const processImageUrl = async (url: string): Promise<string | null> => {
    if (!url || url.startsWith('data:')) return null
    
    // 检查是否已经处理过
    if (imageMap.has(url)) {
      return imageMap.get(url)!
    }
    
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      
      const blob = await response.blob()
      const hash = await simpleHash(blob)
      
      images.push({
        originalUrl: url,
        blob,
        hash: hash,
        element: null as any,
      })
      
      imageMap.set(url, hash)
      return hash
    } catch (error) {
      return null
    }
  }
  
  // 1. 处理 <img src>
  const imgElements = Array.from(doc.querySelectorAll('img[src]'))
  
  for (const img of imgElements) {
    if (Date.now() - startTime > timeout) break
    
    const src = (img as HTMLImageElement).src
    const hash = await processImageUrl(src)
    if (hash) {
      ;(img as HTMLImageElement).src = `/api/snapshot-images/${hash}`
      ;(img as HTMLImageElement).setAttribute('data-original-src', src)
    }
  }
  
  // 2. 处理 <img srcset>
  const imgWithSrcset = Array.from(doc.querySelectorAll('img[srcset]'))
  
  for (const img of imgWithSrcset) {
    if (Date.now() - startTime > timeout) break
    
    const srcset = (img as HTMLImageElement).srcset
    if (!srcset) continue
    
    // 解析 srcset: "url1 1x, url2 2x" 或 "url1 100w, url2 200w"
    const srcsetParts = srcset.split(',').map(s => s.trim())
    const newSrcsetParts: string[] = []
    
    for (const part of srcsetParts) {
      const [url, descriptor] = part.split(/\s+/)
      const hash = await processImageUrl(url)
      if (hash) {
        newSrcsetParts.push(`/api/snapshot-images/${hash} ${descriptor || ''}`.trim())
      } else {
        newSrcsetParts.push(part)
      }
    }
    
    if (newSrcsetParts.length > 0) {
      ;(img as HTMLImageElement).srcset = newSrcsetParts.join(', ')
    }
  }
  
  // 3. 处理 <picture> <source>
  const sourceElements = Array.from(doc.querySelectorAll('picture source[srcset]'))
  
  for (const source of sourceElements) {
    if (Date.now() - startTime > timeout) break
    
    const srcset = (source as HTMLSourceElement).srcset
    if (!srcset) continue
    
    const srcsetParts = srcset.split(',').map(s => s.trim())
    const newSrcsetParts: string[] = []
    
    for (const part of srcsetParts) {
      const [url, descriptor] = part.split(/\s+/)
      const hash = await processImageUrl(url)
      if (hash) {
        newSrcsetParts.push(`/api/snapshot-images/${hash} ${descriptor || ''}`.trim())
      } else {
        newSrcsetParts.push(part)
      }
    }
    
    if (newSrcsetParts.length > 0) {
      ;(source as HTMLSourceElement).srcset = newSrcsetParts.join(', ')
    }
  }
  
  // 4. 处理 <video poster>
  const videoElements = Array.from(doc.querySelectorAll('video[poster]'))
  
  for (const video of videoElements) {
    if (Date.now() - startTime > timeout) break
    
    const poster = (video as HTMLVideoElement).poster
    const hash = await processImageUrl(poster)
    if (hash) {
      ;(video as HTMLVideoElement).poster = `/api/snapshot-images/${hash}`
    }
  }
  
  // 5. 处理 CSS background-image
  const elementsWithStyle = Array.from(doc.querySelectorAll('[style*="background"]'))
  
  for (const element of elementsWithStyle) {
    if (Date.now() - startTime > timeout) break
    
    const style = (element as HTMLElement).style.cssText
    if (!style) continue
    
    // 匹配 background-image: url(...)
    const urlMatches = style.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g)
    let newStyle = style
    
    for (const match of urlMatches) {
      const url = match[1]
      if (url.startsWith('data:')) continue
      
      try {
        const absoluteUrl = new URL(url, document.baseURI).href
        const hash = await processImageUrl(absoluteUrl)
        if (hash) {
          newStyle = newStyle.replace(match[0], `url(/api/snapshot-images/${hash})`)
        }
      } catch (error) {
        // Ignore invalid URLs
      }
    }
    
    if (newStyle !== style) {
      ;(element as HTMLElement).style.cssText = newStyle
    }
  }
  
  return images
}

/**
 * 内联所有样式表
 * 注意：CSS 中的图片 URL 会被转换为绝对 URL，但不会被提取
 * 因为 CSS 中的图片通常是装饰性的，而且可能很多
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
      const processedCSS = await processCSSUrls(css, href)
      
      const style = doc.createElement('style')
      style.setAttribute('data-original-href', href)
      style.textContent = processedCSS
      link.replaceWith(style)
    } catch (error) {
      // Silently handle error
    }
  }
}

/**
 * 处理 CSS 中的 URL
 */
async function processCSSUrls(css: string, baseUrl: string): Promise<string> {
  const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g
  const matches = Array.from(css.matchAll(urlRegex))
  let processedCSS = css
  
  for (const match of matches) {
    const originalUrl = match[1]
    if (originalUrl.startsWith('data:')) continue
    
    try {
      const absoluteUrl = new URL(originalUrl, baseUrl).href
      processedCSS = processedCSS.replace(match[0], `url(${absoluteUrl})`)
    } catch (error) {
      // Ignore
    }
  }
  
  return processedCSS
}

/**
 * 内联字体
 */
async function inlineFonts(_doc: Document, _timeout: number): Promise<void> {
  // 简化实现，暂时跳过
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
function removeHiddenElements(_doc: Document): void {
  // 简化实现
}

/**
 * 添加元数据
 */
function addMetadata(doc: Document): void {
  const meta = doc.createElement('meta')
  meta.setAttribute('name', 'tmarks-snapshot-v2')
  meta.setAttribute('content', JSON.stringify({
    capturedAt: new Date().toISOString(),
    originalUrl: document.location.href,
    title: document.title,
    version: 2,
  }))
  
  const head = doc.querySelector('head')
  if (head) {
    head.appendChild(meta)
  }
}
