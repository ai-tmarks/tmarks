import type { PageInfo, Message, MessageResponse } from '@/types';

/**
 * Content script for extracting page information
 */
class PageContentExtractor {
  /**
   * Extract page information
   */
  extract(): PageInfo {
    const thumbnails = this.getAllThumbnails();
    return {
      title: this.getTitle(),
      url: window.location.href,
      description: this.getDescription(),
      content: this.getMainContent(),
      thumbnail: thumbnails[0] || '',
      thumbnails: thumbnails,
      favicon: this.getFavicon()
    };
  }

  /**
   * Get page title
   */
  private getTitle(): string {
    // Priority: <title>, og:title, first <h1>, or 'Untitled'
    return (
      document.title ||
      this.getMeta('og:title') ||
      document.querySelector('h1')?.textContent?.trim() ||
      'Untitled'
    );
  }

  /**
   * Get page description
   */
  private getDescription(): string {
    return (
      this.getMeta('description') ||
      this.getMeta('og:description') ||
      this.getMeta('twitter:description') ||
      ''
    );
  }

  /**
   * Get main content from page
   */
  private getMainContent(): string {
    // Priority: <article>, <main>, <body>
    const contentElement =
      document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.body;

    if (!contentElement) {
      return '';
    }

    // Clone element to avoid modifying the actual page
    const clone = contentElement.cloneNode(true) as HTMLElement;

    // Remove unwanted elements
    clone.querySelectorAll('script, style, nav, header, footer, iframe, noscript').forEach(el => {
      el.remove();
    });

    // Extract text content
    const text = clone.textContent || '';

    // Clean up whitespace and return first 1000 characters
    return text.replace(/\s+/g, ' ').trim().substring(0, 1000);
  }

  /**
   * Get website favicon/logo
   */
  private getFavicon(): string {
    // 辅助函数：安全地解析URL
    const safeParseUrl = (urlString: string, baseUrl?: string): string => {
      if (!urlString || typeof urlString !== 'string') return '';
      
      try {
        urlString = urlString.trim();
        if (!urlString) return '';
        
        const absoluteUrl = new URL(urlString, baseUrl || window.location.href);
        
        if (absoluteUrl.protocol !== 'http:' && absoluteUrl.protocol !== 'https:') {
          return '';
        }
        
        return absoluteUrl.href;
      } catch (e) {
        return '';
      }
    };

    // 1. 尝试获取高清的 Apple Touch Icon (通常是180x180或更大)
    try {
      const appleTouchIcons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]'));
      if (appleTouchIcons.length > 0) {
        // 优先选择带sizes属性的最大尺寸
        let largestIcon: HTMLLinkElement | undefined;
        let maxSize = 0;

        for (const icon of appleTouchIcons) {
          if (icon.href) {
            const sizes = icon.getAttribute('sizes');
            if (sizes) {
              const size = parseInt(sizes.split('x')[0]);
              if (!isNaN(size) && size > maxSize) {
                maxSize = size;
                largestIcon = icon;
              }
            } else if (!largestIcon) {
              largestIcon = icon;
            }
          }
        }

        if (largestIcon && largestIcon.href) {
          const url = safeParseUrl(largestIcon.href);
          if (url) {
            return url;
          }
        }
      }
    } catch (e) {
      // Silently handle error
    }

    // 2. 尝试获取标准的 icon 或 shortcut icon
    try {
      const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]'));
      if (iconLinks.length > 0) {
        // 优先选择PNG/SVG格式，然后是最大尺寸
        let bestIcon: HTMLLinkElement | undefined;
        let maxSize = 0;

        for (const icon of iconLinks) {
          if (icon.href) {
            const type = icon.getAttribute('type') || '';
            const sizes = icon.getAttribute('sizes');
            const href = icon.href.toLowerCase();

            // SVG优先（矢量图，无损缩放）
            if (type.includes('svg') || href.endsWith('.svg')) {
              bestIcon = icon;
              break;
            }

            // PNG次之
            if (type.includes('png') || href.endsWith('.png')) {
              if (sizes) {
                const size = parseInt(sizes.split('x')[0]);
                if (!isNaN(size) && size > maxSize) {
                  maxSize = size;
                  bestIcon = icon;
                }
              } else if (!bestIcon || maxSize === 0) {
                bestIcon = icon;
              }
            }

            // 如果还没找到，接受任何icon
            if (!bestIcon) {
              bestIcon = icon;
            }
          }
        }

        if (bestIcon && bestIcon.href) {
          const url = safeParseUrl(bestIcon.href);
          if (url) {
            return url;
          }
        }
      }
    } catch (e) {
      // Silently handle error
    }

    // 3. 使用Chrome的favicon API（高清版本）
    try {
      const domain = window.location.origin;
      // Chrome的favicon API支持高清图标，size参数可以是16, 32, 64等
      // @2x表示Retina屏幕的2倍分辨率
      const chromeIconUrl = `chrome://favicon/size/64@2x/${domain}`;
      return chromeIconUrl;
    } catch (e) {
      // Silently handle error
    }

    // 4. 回退到标准favicon.ico路径
    try {
      const faviconUrl = new URL('/favicon.ico', window.location.origin).href;
      return faviconUrl;
    } catch (e) {
      // Silently handle error
    }

    return '';
  }

  /**
   * Get all possible page thumbnails/cover images
   */
  private getAllThumbnails(): string[] {
    const thumbnails: string[] = [];
    
    // 辅助函数：安全地解析URL
    const safeParseUrl = (urlString: string, baseUrl?: string): string => {
      if (!urlString || typeof urlString !== 'string') return '';
      
      try {
        // 移除可能的空白字符
        urlString = urlString.trim();
        if (!urlString) return '';
        
        // 如果是相对URL，使用baseUrl或当前页面URL
        const absoluteUrl = new URL(urlString, baseUrl || window.location.href);
        
        // 验证协议（只接受http/https）
        if (absoluteUrl.protocol !== 'http:' && absoluteUrl.protocol !== 'https:') {
          return '';
        }
        
        return absoluteUrl.href;
      } catch (e) {
        return '';
      }
    };

    // 1. 尝试获取 Open Graph image
    try {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage instanceof HTMLMetaElement && ogImage.content) {
        const url = safeParseUrl(ogImage.content);
        if (url && !thumbnails.includes(url)) {
          thumbnails.push(url);
        }
      }
    } catch (e) {
      // Silently handle error
    }

    // 2. 尝试获取 Twitter image
    try {
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage instanceof HTMLMetaElement && twitterImage.content) {
        const url = safeParseUrl(twitterImage.content);
        if (url && !thumbnails.includes(url)) {
          thumbnails.push(url);
        }
      }
    } catch (e) {
      // Silently handle error
    }

    // 3. 尝试在页面中查找多个大图片
    try {
      const searchAreas = [
        document.querySelector('main'),
        document.querySelector('[role="main"]'),
        document.querySelector('article'),
        document.body
      ].filter(Boolean) as HTMLElement[];

      const foundImages: Array<{ url: string; area: number }> = [];

      for (const area of searchAreas) {
        if (!area) continue;

        const images = area.querySelectorAll('img');

        for (const img of images) {
          try {
            if (!img.src) continue;
            if (img.src.startsWith('data:') || img.src.startsWith('blob:')) continue;

            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (width === 0 || height === 0) {
              const attrWidth = img.getAttribute('width');
              const attrHeight = img.getAttribute('height');
              
              if (attrWidth && attrHeight) {
                const parsedWidth = parseInt(attrWidth);
                const parsedHeight = parseInt(attrHeight);
                if (!isNaN(parsedWidth) && !isNaN(parsedHeight)) {
                  width = parsedWidth;
                  height = parsedHeight;
                }
              }
              
              if (width === 0 || height === 0) {
                width = img.width || img.offsetWidth || img.clientWidth;
                height = img.height || img.offsetHeight || img.clientHeight;
              }
            }

            if (width > 200 && height > 200 && width < 5000 && height < 5000) {
              const url = safeParseUrl(img.src);
              if (url && !foundImages.some(item => item.url === url)) {
                foundImages.push({ url, area: width * height });
              }
            }
          } catch (imgError) {
            continue;
          }
        }
      }

      // 按面积排序，取前5张
      foundImages.sort((a, b) => b.area - a.area);
      const topImages = foundImages.slice(0, 5);
      
      for (const { url } of topImages) {
        if (!thumbnails.includes(url)) {
          thumbnails.push(url);
        }
      }
    } catch (e) {
      // Silently handle error
    }

    return thumbnails;
  }



  /**
   * Get meta tag content
   */
  private getMeta(name: string): string {
    const meta =
      document.querySelector(`meta[name="${name}"]`) ||
      document.querySelector(`meta[property="${name}"]`);

    return meta?.getAttribute('content') || '';
  }
}

// Create extractor instance
const extractor = new PageContentExtractor();

// 防止重复注入
if ((window as any).__AITMARKS_CONTENT_SCRIPT_LOADED__) {
  // Already loaded, skip initialization
} else {
  (window as any).__AITMARKS_CONTENT_SCRIPT_LOADED__ = true;

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener(
    (
      message: Message,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      // 心跳响应 - 用于检测 content script 是否存活（优先处理，最快响应）
      if (message.type === 'PING') {
        try {
          sendResponse({ success: true, data: 'pong' });
        } catch (error) {
          // Silently handle error
        }
        return true;
      }

      // 提取页面信息
      if (message.type === 'EXTRACT_PAGE_INFO') {
        // 使用异步处理，避免阻塞
        (async () => {
          try {
            // 检查文档是否准备就绪
            if (document.readyState === 'loading') {
              await new Promise(resolve => {
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', resolve, { once: true });
                } else {
                  resolve(null);
                }
              });
            }

            const pageInfo = extractor.extract();
            
            // 验证提取的数据
            if (!pageInfo.url) {
              pageInfo.url = window.location.href;
            }
            if (!pageInfo.title) {
              pageInfo.title = document.title || 'Untitled';
            }

            sendResponse({
              success: true,
              data: pageInfo
            });
          } catch (error) {
            // 即使失败也返回基本信息
            sendResponse({
              success: true,
              data: {
                title: document.title || 'Untitled',
                url: window.location.href,
                description: '',
                content: '',
                thumbnail: ''
              }
            });
          }
        })();
        
        return true; // Keep message channel open for async response
      }

      // SingleFile 页面捕获
      if (message.type === 'CAPTURE_PAGE') {
        (async () => {
          try {
            const { capturePage } = await import('./singlefile-capture');
            const html = await capturePage(message.options || {});
            const size = new Blob([html]).size;
            
            sendResponse({ success: true, html, size });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })();
        
        return true; // Keep message channel open
      }

      // SingleFile V2 页面捕获（图片单独存储）
      if (message.type === 'CAPTURE_PAGE_V2') {
        (async () => {
          try {
            const { capturePageV2 } = await import('./singlefile-capture-v2');
            const result = await capturePageV2(message.options || {});
            
            // 将图片 blob 转换为 base64
            const images = await Promise.all(
              result.images.map(async (img) => {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(img.blob);
                });
                
                return {
                  hash: img.hash,
                  data: base64,
                  type: img.blob.type,
                  size: img.blob.size,
                };
              })
            );
            
            sendResponse({ 
              success: true, 
              data: {
                html: result.html,
                images,
              }
            });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })();
        
        return true; // Keep message channel open
      }

      // 未知消息类型
      return false;
    }
  );
}
