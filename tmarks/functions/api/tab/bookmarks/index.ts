/**
 * 对外 API - 书签管理
 * 路径: /api/tab/bookmarks
 * 认证: API Key (X-API-Key header)
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, Bookmark, BookmarkRow, RouteParams, SQLParam } from '../../../lib/types'
import { success, badRequest, created, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { isValidUrl, sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'
import { normalizeBookmark } from '../../../lib/bookmark-utils'
import { invalidatePublicShareCache } from '../../shared/cache'
import { uploadCoverImageToR2 } from '../../../lib/image-upload'

interface CreateBookmarkRequest {
  title?: string
  url?: string
  description?: string
  cover_image?: string
  favicon?: string
  tag_ids?: string[]  // 兼容旧版：标签 ID 数组
  tags?: string[]     // 新版：标签名称数组（推荐）
  is_pinned?: boolean
  is_public?: boolean
  bookmarks?: Array<{  // 批量创建
    title: string
    url: string
    description?: string
    cover_image?: string
    favicon?: string
    tags?: string[]
    is_pinned?: boolean
    is_archived?: boolean
    is_public?: boolean
  }>
}

// GET /api/bookmarks - 获取书签列表
interface BookmarkWithTags extends Bookmark {
  tags: Array<{ id: string; name: string; color: string | null }>
}

export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id
    const url = new URL(context.request.url)

    try {
      const keyword = url.searchParams.get('keyword')
      const tags = url.searchParams.get('tags')
      const pageSize = parseInt(url.searchParams.get('page_size') || '100')
      const pageCursor = url.searchParams.get('page_cursor')
      const sortBy = (url.searchParams.get('sort') as 'created' | 'updated' | 'pinned') || 'created'
      const pinnedParam = url.searchParams.get('pinned')
      const pinned = pinnedParam ? pinnedParam === 'true' : undefined

      // 构建查询
      let query = `
        SELECT DISTINCT b.*
        FROM bookmarks b
        WHERE b.user_id = ? AND b.deleted_at IS NULL
      `
      const params: SQLParam[] = [userId]

      // 置顶过滤
      if (pinned !== undefined) {
        query += ` AND b.is_pinned = ?`
        params.push(pinned ? 1 : 0)
      }

      // 关键词搜索
      if (keyword) {
        query += ` AND (b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ?)`
        const searchPattern = `%${keyword}%`
        params.push(searchPattern, searchPattern, searchPattern)
      }

      // 标签过滤（交集逻辑：必须包含所有选中的标签）
      if (tags) {
        const tagIds = tags.split(',').filter(Boolean)
        if (tagIds.length > 0) {
          query += ` AND b.id IN (
            SELECT bt.bookmark_id
            FROM bookmark_tags bt
            WHERE bt.tag_id IN (${tagIds.map(() => '?').join(',')})
            GROUP BY bt.bookmark_id
            HAVING COUNT(DISTINCT bt.tag_id) = ?
          )`
          params.push(...tagIds, tagIds.length)
        }
      }

      // 游标分页
      if (pageCursor) {
        query += ` AND b.id < ?`
        params.push(pageCursor)
      }

      // 排序（置顶书签按 pin_order 排序）
      let orderBy = ''
      switch (sortBy) {
        case 'updated':
          orderBy = 'ORDER BY b.is_pinned DESC, CASE WHEN b.is_pinned = 1 THEN b.pin_order ELSE NULL END ASC, b.updated_at DESC, b.id DESC'
          break
        case 'pinned':
          orderBy = 'ORDER BY b.is_pinned DESC, CASE WHEN b.is_pinned = 1 THEN b.pin_order ELSE NULL END ASC, b.created_at DESC, b.id DESC'
          break
        case 'created':
        default:
          orderBy = 'ORDER BY b.is_pinned DESC, CASE WHEN b.is_pinned = 1 THEN b.pin_order ELSE NULL END ASC, b.created_at DESC, b.id DESC'
          break
      }

      query += ` ${orderBy} LIMIT ?`
      params.push(pageSize + 1)

      const { results } = await context.env.DB.prepare(query).bind(...params).all<BookmarkRow>()

      // 调试日志：记录查询结果
      console.log(`[Bookmarks API] User: ${userId}, Query returned: ${results.length} bookmarks, pageSize: ${pageSize}`)

      const hasMore = results.length > pageSize
      const bookmarks = hasMore ? results.slice(0, pageSize) : results
      const nextCursor = hasMore && bookmarks.length > 0 ? String(bookmarks[bookmarks.length - 1].id) : null

      // 优化：使用单次查询获取所有书签的标签
      const bookmarkIds = bookmarks.map(b => b.id)

      // 一次性获取所有书签的标签
      let allTags: Array<{ bookmark_id: string; id: string; name: string; color: string | null }> = []

      if (bookmarkIds.length > 0) {
        const placeholders = bookmarkIds.map(() => '?').join(',')
        const { results: tagResults } = await context.env.DB.prepare(
          `SELECT
             bt.bookmark_id,
             t.id,
             t.name,
             t.color
           FROM tags t
           INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
           WHERE bt.bookmark_id IN (${placeholders})
             AND t.deleted_at IS NULL
           ORDER BY bt.bookmark_id, t.name`
        )
          .bind(...bookmarkIds)
          .all<{ bookmark_id: string; id: string; name: string; color: string | null }>()

        allTags = tagResults ?? []
      }

      // 将标签按书签ID分组
      const tagsByBookmarkId = new Map<string, Array<{ id: string; name: string; color: string | null }>>()
      for (const tag of allTags || []) {
        if (!tagsByBookmarkId.has(tag.bookmark_id)) {
          tagsByBookmarkId.set(tag.bookmark_id, [])
        }
        tagsByBookmarkId.get(tag.bookmark_id)!.push({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })
      }

      // 组装书签和标签数据
      const bookmarksWithTags: BookmarkWithTags[] = bookmarks.map(row => {
        const normalized = normalizeBookmark(row)
        return {
          ...normalized,
          tags: tagsByBookmarkId.get(row.id) || [],
        }
      })

      return success({
        bookmarks: bookmarksWithTags,
        meta: {
          page_size: pageSize,
          count: bookmarks.length,
          next_cursor: nextCursor,
          has_more: hasMore,
        },
      })
    } catch (error) {
      console.error('Get bookmarks error:', error)
      return internalError('Failed to get bookmarks')
    }
  },
]

// POST /api/bookmarks - 创建书签（支持单个和批量）
export const onRequestPost: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.create'),
  async (context) => {
    const userId = context.data.user_id

    try {
      const body = (await context.request.json()) as CreateBookmarkRequest

      console.log('[Bookmarks POST] ========== REQUEST DEBUG v3 ==========')
      console.log('[Bookmarks POST] Request body keys:', Object.keys(body))
      console.log('[Bookmarks POST] Has bookmarks array:', !!body.bookmarks)
      console.log('[Bookmarks POST] Bookmarks length:', body.bookmarks?.length)
      console.log('[Bookmarks POST] Body type:', typeof body)
      console.log('[Bookmarks POST] Is array:', Array.isArray(body))
      console.log('[Bookmarks POST] bookmarks is array:', Array.isArray(body.bookmarks))
      console.log('[Bookmarks POST] Full body:', JSON.stringify(body).substring(0, 500))
      console.log('[Bookmarks POST] Condition check:', {
        hasBookmarks: !!body.bookmarks,
        isArray: Array.isArray(body.bookmarks),
        hasLength: body.bookmarks && body.bookmarks.length > 0,
        finalResult: body.bookmarks && Array.isArray(body.bookmarks) && body.bookmarks.length > 0
      })
      console.log('[Bookmarks POST] ==========================================')

      // 检测是否为批量创建请求
      if (body.bookmarks && Array.isArray(body.bookmarks) && body.bookmarks.length > 0) {
        console.log('[Bookmarks POST] ===== BATCH MODE DETECTED v3 =====')
        console.log('[Bookmarks POST] Bookmarks count:', body.bookmarks.length)
        console.log('[Bookmarks POST] First bookmark:', JSON.stringify(body.bookmarks[0]))
        
        // 直接在这里处理批量逻辑，不导入外部模块
        try {
          const { success, badRequest, internalError } = await import('../../../lib/response')
          const { isValidUrl, sanitizeString } = await import('../../../lib/validation')
          const { generateUUID } = await import('../../../lib/crypto')
          const { invalidatePublicShareCache } = await import('../../shared/cache')
          
          if (body.bookmarks.length > 100) {
            return badRequest('Cannot create more than 100 bookmarks at once')
          }

          const result = {
            success: 0,
            failed: 0,
            skipped: 0,
            total: body.bookmarks.length,
            errors: [] as Array<{ index: number; url: string; error: string }>,
            created_bookmarks: [] as Array<{ id: string; url: string; title: string }>
          }

          const now = new Date().toISOString()

          // 批量处理书签
          for (let i = 0; i < body.bookmarks.length; i++) {
            const item = body.bookmarks[i]

            try {
              // 验证必填字段
              if (!item.title || !item.url) {
                result.failed++
                result.errors.push({
                  index: i,
                  url: item.url || '',
                  error: 'Title and URL are required'
                })
                continue
              }

              // 验证 URL 格式
              if (!isValidUrl(item.url)) {
                result.failed++
                result.errors.push({
                  index: i,
                  url: item.url,
                  error: 'Invalid URL format'
                })
                continue
              }

              const title = sanitizeString(item.title, 500)
              const url = sanitizeString(item.url, 2000)
              const description = item.description ? sanitizeString(item.description, 1000) : null
              const coverImage = item.cover_image ? sanitizeString(item.cover_image, 2000) : null
              const favicon = item.favicon ? sanitizeString(item.favicon, 2000) : null
              const isPinned = item.is_pinned ? 1 : 0
              const isArchived = item.is_archived ? 1 : 0
              const isPublic = item.is_public !== false ? 1 : 0

              // 检查 URL 是否已存在
              const existing = await context.env.DB.prepare(
                'SELECT id, deleted_at FROM bookmarks WHERE user_id = ? AND url = ?'
              )
                .bind(userId, url)
                .first<{ id: string; deleted_at: string | null }>()

              let bookmarkId: string

              if (existing) {
                if (!existing.deleted_at) {
                  result.skipped++
                  continue
                }

                bookmarkId = existing.id
                await context.env.DB.prepare(
                  `UPDATE bookmarks
                   SET title = ?, description = ?, cover_image = ?, favicon = ?,
                       is_pinned = ?, is_archived = ?, is_public = ?,
                       deleted_at = NULL, updated_at = ?
                   WHERE id = ?`
                )
                  .bind(title, description, coverImage, favicon, isPinned, isArchived, isPublic, now, bookmarkId)
                  .run()

                await context.env.DB.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?')
                  .bind(bookmarkId)
                  .run()
              } else {
                bookmarkId = generateUUID()
                await context.env.DB.prepare(
                  `INSERT INTO bookmarks (id, user_id, title, url, description, cover_image, cover_image_id, favicon, is_pinned, is_archived, is_public, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                  .bind(bookmarkId, userId, title, url, description, coverImage, null, favicon, isPinned, isArchived, isPublic, now, now)
                  .run()
              }

              // 处理标签
              if (item.tags && item.tags.length > 0) {
                const { createOrLinkTags } = await import('../../../lib/tags')
                await createOrLinkTags(context.env.DB, bookmarkId, item.tags, userId)
              }

              result.success++
              result.created_bookmarks.push({ id: bookmarkId, url, title })

            } catch (error) {
              result.failed++
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              result.errors.push({
                index: i,
                url: item.url || '',
                error: errorMessage
              })
              console.error(`[Batch] Failed to create bookmark ${i}:`, error)
            }
          }

          // 清理空错误数组
          if (result.errors.length === 0) {
            delete (result as any).errors
          }

          // 更新标签计数
          if (result.success > 0) {
            await context.env.DB.prepare(
              `UPDATE tags
               SET usage_count = (
                 SELECT COUNT(*) FROM bookmark_tags
                 WHERE tag_id = tags.id AND user_id = ?
               )
               WHERE user_id = ? AND deleted_at IS NULL`
            )
              .bind(userId, userId)
              .run()
          }

          await invalidatePublicShareCache(context.env, userId)

          console.log('[Batch] Complete:', result)
          return success(result)
        } catch (error) {
          console.error('[Batch] Error:', error)
          return internalError('Batch processing failed')
        }
      }

      console.log('[Bookmarks POST] Processing single bookmark')
      console.log('[Bookmarks POST] body.title:', body.title)
      console.log('[Bookmarks POST] body.url:', body.url)
      
      // 单个书签创建逻辑
      if (!body.title || !body.url) {
        console.log('[Bookmarks POST] Missing title or URL')
        return badRequest({
          message: 'Title and URL are required',
          code: 'MISSING_FIELDS',
          version: 'v2', // 版本标识
          details: {
            hasTitle: !!body.title,
            hasUrl: !!body.url,
            hasBookmarks: !!body.bookmarks,
            bodyKeys: Object.keys(body),
            bodyType: typeof body,
            isArray: Array.isArray(body),
            title: body.title,
            url: body.url
          }
        })
      }

      if (!isValidUrl(body.url)) {
        return badRequest('Invalid URL format')
      }

      const title = sanitizeString(body.title, 500)
      const url = sanitizeString(body.url, 2000)
      const description = body.description ? sanitizeString(body.description, 1000) : null
      let coverImage = body.cover_image ? sanitizeString(body.cover_image, 2000) : null
      const favicon = body.favicon ? sanitizeString(body.favicon, 2000) : null

      // 检查URL是否已存在（包括已删除的）
      const existing = await context.env.DB.prepare(
        'SELECT id, deleted_at FROM bookmarks WHERE user_id = ? AND url = ?'
      )
        .bind(userId, url)
        .first<{ id: string; deleted_at: string | null }>()

      const now = new Date().toISOString()
      let bookmarkId: string
      const isPinned = body.is_pinned ? 1 : 0
      const isPublic = body.is_public ? 1 : 0

      // 如果有封面图且配置了 R2 bucket，上传到 R2
      let coverImageId: string | null = null
      if (coverImage && context.env.SNAPSHOTS_BUCKET && context.env.R2_PUBLIC_URL) {
        // 生成临时 ID（如果是新书签）
        const tempBookmarkId = existing?.id || generateUUID()

        const uploadResult = await uploadCoverImageToR2(
          coverImage,
          userId,
          tempBookmarkId,
          context.env.SNAPSHOTS_BUCKET,
          context.env.DB,
          context.env.R2_PUBLIC_URL,
          context.env
        )

        // 如果上传成功，使用 R2 URL 和 imageId
        if (uploadResult.success && uploadResult.r2Url) {
          coverImage = uploadResult.r2Url
          coverImageId = uploadResult.imageId || null
        }
        // 如果上传失败，继续使用原始 URL（降级方案）
      }

      if (existing) {
        if (!existing.deleted_at) {
          // 返回现有书签信息，让前端可以为其创建快照
          const bookmarkRow = await context.env.DB.prepare('SELECT * FROM bookmarks WHERE id = ?')
            .bind(existing.id)
            .first<BookmarkRow>()

          const { results: tags } = await context.env.DB.prepare(
            `SELECT t.id, t.name, t.color
             FROM tags t
             INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
             WHERE bt.bookmark_id = ?`
          )
            .bind(existing.id)
            .all<{ id: string; name: string; color: string | null }>()

          // 获取快照数量
          const snapshotCountResult = await context.env.DB.prepare(
            `SELECT COUNT(*) as count FROM bookmark_snapshots WHERE bookmark_id = ? AND user_id = ?`
          )
            .bind(existing.id, userId)
            .first<{ count: number }>()

          const snapshotCount = snapshotCountResult?.count || 0

          if (!bookmarkRow) {
            return internalError('Failed to retrieve bookmark')
          }

          const bookmark = normalizeBookmark(bookmarkRow)

          return success(
            {
              bookmark: {
                ...bookmark,
                tags: tags || [],
                snapshot_count: snapshotCount,
                has_snapshot: snapshotCount > 0,
              },
            },
            {
              message: 'Bookmark already exists',
              code: 'BOOKMARK_EXISTS',
            }
          )
        }

        // 恢复已删除的书签
        bookmarkId = existing.id
        await context.env.DB.prepare(
          `UPDATE bookmarks
           SET title = ?, description = ?, cover_image = ?, favicon = ?,
               is_pinned = ?, is_public = ?,
               deleted_at = NULL, updated_at = ?
           WHERE id = ?`
        )
          .bind(
            title,
            description,
            coverImage,
            favicon,
            isPinned,
            isPublic,
            now,
            bookmarkId
          )
          .run()

        await context.env.DB.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?')
          .bind(bookmarkId)
          .run()
      } else {
        // 创建新书签
        bookmarkId = generateUUID()
        await context.env.DB.prepare(
          `INSERT INTO bookmarks (id, user_id, title, url, description, cover_image, cover_image_id, favicon, is_pinned, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            bookmarkId,
            userId,
            title,
            url,
            description,
            coverImage,
            coverImageId,
            favicon,
            isPinned,
            isPublic,
            now,
            now
          )
          .run()
      }

      // 处理标签（支持两种方式）
      if (body.tags && body.tags.length > 0) {
        // 新版：直接传标签名称，后端自动创建或链接
        const { createOrLinkTags } = await import('../../../lib/tags')
        await createOrLinkTags(context.env.DB, bookmarkId, body.tags, userId)
      } else if (body.tag_ids && body.tag_ids.length > 0) {
        // 兼容旧版：传标签 ID
        for (const tagId of body.tag_ids) {
          await context.env.DB.prepare(
            'INSERT INTO bookmark_tags (bookmark_id, tag_id, user_id, created_at) VALUES (?, ?, ?, ?)'
          )
            .bind(bookmarkId, tagId, userId, now)
            .run()
        }
      }

      // 获取完整的书签信息
      const bookmarkRow = await context.env.DB.prepare('SELECT * FROM bookmarks WHERE id = ?')
        .bind(bookmarkId)
        .first<BookmarkRow>()

      const { results: tags } = await context.env.DB.prepare(
        `SELECT t.id, t.name, t.color
         FROM tags t
         INNER JOIN bookmark_tags bt ON t.id = bt.tag_id
         WHERE bt.bookmark_id = ?`
      )
        .bind(bookmarkId)
        .all<{ id: string; name: string; color: string | null }>()

      if (!bookmarkRow) {
        return internalError('Failed to load bookmark after creation')
      }

      await invalidatePublicShareCache(context.env, userId)

      return created({
        bookmark: {
          ...normalizeBookmark(bookmarkRow),
          tags: tags || [],
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error('Create bookmark error:', {
        message: errorMessage,
        stack: errorStack,
        error
      })
      return internalError(`Failed to create bookmark: ${errorMessage}`)
    }
  },
]
