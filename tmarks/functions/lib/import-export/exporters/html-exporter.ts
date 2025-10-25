/**
 * HTML 格式导出器
 * 将书签数据导出为 Netscape 书签格式，兼容主流浏览器
 */

import type { 
  Exporter, 
  TMarksExportData, 
  ExportOptions, 
  ExportOutput 
} from '../../../../shared/import-export-types'

export class HtmlExporter implements Exporter {
  readonly format = 'html' as const

  async export(data: TMarksExportData, options?: ExportOptions): Promise<ExportOutput> {
    try {
      // 生成 HTML 内容
      const htmlContent = this.generateHtml(data, options)
      
      // 生成文件名
      const filename = this.generateFilename(data.exported_at)
      
      return {
        content: htmlContent,
        filename,
        mimeType: 'text/html',
        size: new TextEncoder().encode(htmlContent).length
      }
    } catch (error) {
      throw new Error(`HTML export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private generateHtml(data: TMarksExportData, options?: ExportOptions): string {
    const includeMetadata = options?.include_metadata ?? true
    const includeTags = options?.include_tags ?? true
    
    // 按文件夹组织书签（使用标签作为文件夹）
    const bookmarksByFolder = this.organizeBookmarksByFolder(data.bookmarks, includeTags)
    
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>

<DL><p>
${this.generateBookmarkFolders(bookmarksByFolder, data.exported_at)}
${includeMetadata ? this.generateMetadataComment(data) : ''}
</DL><p>`

    return html
  }

  private organizeBookmarksByFolder(bookmarks: any[], includeTags: boolean): Map<string, any[]> {
    const folderMap = new Map<string, any[]>()
    
    // 未分类书签
    folderMap.set('未分类', [])
    
    bookmarks.forEach(bookmark => {
      if (!includeTags || bookmark.tags.length === 0) {
        // 没有标签的书签放入未分类
        const uncategorized = folderMap.get('未分类')
        if (uncategorized) {
          uncategorized.push(bookmark)
        }
      } else {
        // 有标签的书签，为每个标签创建文件夹
        bookmark.tags.forEach((tag: string) => {
          if (!folderMap.has(tag)) {
            folderMap.set(tag, [])
          }
          const folder = folderMap.get(tag)
          if (folder) {
            folder.push(bookmark)
          }
        })
      }
    })
    
    // 移除空的未分类文件夹
    const uncategorized = folderMap.get('未分类')
    if (uncategorized && uncategorized.length === 0) {
      folderMap.delete('未分类')
    }
    
    return folderMap
  }

  private generateBookmarkFolders(folderMap: Map<string, any[]>, exportedAt: string): string {
    let html = ''
    
    folderMap.forEach((bookmarks, folderName) => {
      if (bookmarks.length === 0) return
      
      html += `    <DT><H3 ADD_DATE="${this.toUnixTimestamp(exportedAt)}" LAST_MODIFIED="${this.toUnixTimestamp(exportedAt)}">${this.escapeHtml(folderName)}</H3>\n`
      html += `    <DL><p>\n`
      
      bookmarks.forEach(bookmark => {
        html += this.generateBookmarkEntry(bookmark)
      })
      
      html += `    </DL><p>\n`
    })
    
    return html
  }

  private generateBookmarkEntry(bookmark: any): string {
    const addDate = bookmark.created_at ? this.toUnixTimestamp(bookmark.created_at) : this.toUnixTimestamp(new Date().toISOString())
    const lastModified = bookmark.updated_at ? this.toUnixTimestamp(bookmark.updated_at) : addDate
    
    // 构建属性
    const attributes = [
      `HREF="${this.escapeHtml(bookmark.url)}"`,
      `ADD_DATE="${addDate}"`,
      `LAST_MODIFIED="${lastModified}"`
    ]
    
    // 添加可选属性
    if (bookmark.is_pinned) {
      attributes.push('PERSONAL_TOOLBAR_FOLDER="true"')
    }
    
    if (bookmark.tags && bookmark.tags.length > 0) {
      attributes.push(`TAGS="${this.escapeHtml(bookmark.tags.join(','))}"`)
    }
    
    // 生成书签条目
    let entry = `        <DT><A ${attributes.join(' ')}>${this.escapeHtml(bookmark.title)}</A>\n`
    
    // 添加描述
    if (bookmark.description) {
      entry += `        <DD>${this.escapeHtml(bookmark.description)}\n`
    }
    
    return entry
  }

  private generateMetadataComment(data: TMarksExportData): string {
    const stats = {
      totalBookmarks: data.bookmarks.length,
      totalTags: data.tags.length,
      exportedAt: data.exported_at,
      version: data.version
    }
    
    return `
<!-- TMarks Export Metadata
     Total Bookmarks: ${stats.totalBookmarks}
     Total Tags: ${stats.totalTags}
     Exported At: ${stats.exportedAt}
     Export Version: ${stats.version}
-->`
  }

  private generateFilename(exportedAt: string): string {
    const date = new Date(exportedAt)
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    return `tmarks-bookmarks-${dateStr}.html`
  }

  private toUnixTimestamp(isoString: string): string {
    return Math.floor(new Date(isoString).getTime() / 1000).toString()
  }

  private escapeHtml(text: string): string {
    // 使用标准的 HTML 转义方法
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * 验证 HTML 导出数据
   */
  validateData(data: TMarksExportData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查必需字段
    if (!Array.isArray(data.bookmarks)) {
      errors.push('Bookmarks must be an array')
    }

    // 检查每个书签的必需字段
    data.bookmarks.forEach((bookmark, index) => {
      if (!bookmark.title) {
        errors.push(`Bookmark ${index}: missing title`)
      }
      if (!bookmark.url) {
        errors.push(`Bookmark ${index}: missing url`)
      }
      if (!this.isValidUrl(bookmark.url)) {
        errors.push(`Bookmark ${index}: invalid URL format`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取 HTML 导出预览
   */
  getPreview(data: TMarksExportData, maxItems: number = 5): string {
    const previewData = {
      ...data,
      bookmarks: data.bookmarks.slice(0, maxItems)
    }
    
    return this.generateHtml(previewData, { 
      include_metadata: false, 
      include_tags: true,
      format_options: {}
    })
  }
}

/**
 * 创建 HTML 导出器实例
 */
export function createHtmlExporter(): HtmlExporter {
  return new HtmlExporter()
}

/**
 * 快速导出为 HTML 字符串
 */
export async function exportToHtml(
  data: TMarksExportData, 
  options?: ExportOptions
): Promise<string> {
  const exporter = createHtmlExporter()
  const result = await exporter.export(data, options)
  return result.content as string
}
