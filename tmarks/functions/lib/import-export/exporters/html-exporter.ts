/**

 *  Netscape ，
 */

import type { 
  Exporter, 
  TMarksExportData, 
  ExportOptions, 
  ExportOutput
} from '../../../../shared/import-export-types'

import { generateTabGroupsNetscapeSection } from './tab-groups-netscape'

export class HtmlExporter implements Exporter {
  readonly format = 'html' as const

  async export(data: TMarksExportData, options?: ExportOptions): Promise<ExportOutput> {
    try {
      //  HTML 
      const htmlContent = this.generateHtml(data, options)

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

    const tabGroupsSection = generateTabGroupsNetscapeSection({
      tabGroups: data.tab_groups,
      exportedAt: data.exported_at,
      escapeHtml: (text) => this.escapeHtml(text),
      toUnixTimestamp: (iso) => this.toUnixTimestamp(iso),
    })
    
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>

<DL><p>
${tabGroupsSection}
${this.generateBookmarkFolders(bookmarksByFolder, data.exported_at)}
${includeMetadata ? this.generateMetadataComment(data) : ''}
</DL><p>`

    return html
  }

  private organizeBookmarksByFolder(bookmarks: Array<Record<string, unknown>>, includeTags: boolean): Map<string, Array<Record<string, unknown>>> {
    const folderMap = new Map<string, Array<Record<string, unknown>>>()

    bookmarks.forEach(bookmark => {
      if (!includeTags || bookmark.tags.length === 0) {
        // 
        const uncategorized = folderMap.get('
        if (uncategorized) {
          uncategorized.push(bookmark)
        }
      } else {

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
    
    // 
    const uncategorized = folderMap.get('
    if (uncategorized && uncategorized.length === 0) {
      folderMap.delete('
    }
    
    return folderMap
  }

  private generateBookmarkFolders(folderMap: Map<string, Array<Record<string, unknown>>>, exportedAt: string): string {
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

  private generateBookmarkEntry(bookmark: Record<string, unknown>): string {
    const addDate = bookmark.created_at ? this.toUnixTimestamp(bookmark.created_at) : this.toUnixTimestamp(new Date().toISOString())
    const lastModified = bookmark.updated_at ? this.toUnixTimestamp(bookmark.updated_at) : addDate

    const attributes = [
      `HREF="${this.escapeHtml(bookmark.url)}"`,
      `ADD_DATE="${addDate}"`,
      `LAST_MODIFIED="${lastModified}"`
    ]

    if (bookmark.is_pinned) {
      attributes.push('PERSONAL_TOOLBAR_FOLDER="true"')
    }
    
    if (bookmark.tags && bookmark.tags.length > 0) {
      attributes.push(`TAGS="${this.escapeHtml(bookmark.tags.join(','))}"`)
    }
    
    // 
    let entry = `        <DT><A ${attributes.join(' ')}>${this.escapeHtml(bookmark.title)}</A>\n`
    
    // 
    if (bookmark.description) {
      entry += `        <DD>${this.escapeHtml(bookmark.description)}\n`
    }
    
    return entry
  }

  private generateMetadataComment(data: TMarksExportData): string {
    const stats = {
      totalBookmarks: data.bookmarks.length,
      totalTags: data.tags.length,
      totalTabGroups: data.tab_groups?.length || 0,
      totalTabGroupItems: data.tab_groups?.reduce((sum, g) => sum + (g.items?.length || 0), 0) || 0,
      exportedAt: data.exported_at,
      version: data.version
    }
    
    return `
<!-- TMarks Export Metadata
     Total Bookmarks: ${stats.totalBookmarks}
     Total Tags: ${stats.totalTags}
     Total Tab Groups: ${stats.totalTabGroups}
     Total Tab Group Items: ${stats.totalTabGroupItems}
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

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   *  HTML 
   */
  validateData(data: TMarksExportData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 
    if (!Array.isArray(data.bookmarks)) {
      errors.push('Bookmarks must be an array')
    }

    // 
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
   *  HTML 
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

 */
export function createHtmlExporter(): HtmlExporter {
  return new HtmlExporter()
}

/**

 */
export async function exportToHtml(
  data: TMarksExportData, 
  options?: ExportOptions
): Promise<string> {
  const exporter = createHtmlExporter()
  const result = await exporter.export(data, options)
  return result.content as string
}
