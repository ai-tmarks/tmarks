/**
 * NewTab 数据同步 API
 * 路径: /api/tab/newtab/sync
 * 只同步核心数据：分组名称 + 快捷方式（标题、网址、所属分组、位置）
 * 不同步：图标(favicon/icon)、设置、文件夹等
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env, RouteParams } from '../../../lib/types'
import { success, badRequest, internalError } from '../../../lib/response'
import { requireApiKeyAuth, ApiKeyAuthContext } from '../../../middleware/api-key-auth-pages'
import { sanitizeString } from '../../../lib/validation'
import { generateUUID } from '../../../lib/crypto'

interface ShortcutRow {
  id: string
  user_id: string
  group_id: string | null
  title: string
  url: string
  position: number
  created_at: string
  updated_at: string
}

interface GroupRow {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
  updated_at: string
}

interface SyncRequest {
  shortcuts?: Array<{
    id?: string
    title: string
    url: string
    group_id?: string
    position: number
  }>
  groups?: Array<{
    id?: string
    name: string
    position: number
  }>
}

// GET /api/tab/newtab/sync - 获取所有 NewTab 数据
export const onRequestGet: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.read'),
  async (context) => {
    const userId = context.data.user_id

    try {
      // 获取快捷方式
      const { results: shortcuts } = await context.env.DB.prepare(
        'SELECT id, group_id, title, url, position FROM newtab_shortcuts WHERE user_id = ? ORDER BY position ASC'
      )
        .bind(userId)
        .all<ShortcutRow>()

      // 获取分组
      const { results: groups } = await context.env.DB.prepare(
        'SELECT id, name, position FROM newtab_groups WHERE user_id = ? ORDER BY position ASC'
      )
        .bind(userId)
        .all<GroupRow>()

      return success({
        shortcuts: (shortcuts || []).map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          groupId: s.group_id,
          position: s.position,
        })),
        groups: (groups || []).map((g) => ({
          id: g.id,
          name: g.name,
          position: g.position,
        })),
      })
    } catch (error) {
      console.error('Get sync data error:', error)
      return internalError('Failed to get sync data')
    }
  },
]

// POST /api/tab/newtab/sync - 同步所有 NewTab 数据
export const onRequestPost: PagesFunction<Env, RouteParams, ApiKeyAuthContext>[] = [
  requireApiKeyAuth('bookmarks.create'),
  async (context) => {
    const userId = context.data.user_id

    try {
      const body = (await context.request.json()) as SyncRequest
      const now = new Date().toISOString()

      // 同步分组
      if (body.groups && Array.isArray(body.groups)) {
        await context.env.DB.prepare('DELETE FROM newtab_groups WHERE user_id = ?')
          .bind(userId)
          .run()

        for (const item of body.groups) {
          const id = item.id || generateUUID()
          await context.env.DB.prepare(
            `INSERT INTO newtab_groups (id, user_id, name, icon, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              id,
              userId,
              sanitizeString(item.name, 50),
              '', // icon 不再同步，使用空字符串
              item.position,
              now,
              now
            )
            .run()
        }
      }

      // 同步快捷方式
      if (body.shortcuts && Array.isArray(body.shortcuts)) {
        await context.env.DB.prepare('DELETE FROM newtab_shortcuts WHERE user_id = ?')
          .bind(userId)
          .run()

        for (const item of body.shortcuts) {
          const id = item.id || generateUUID()
          await context.env.DB.prepare(
            `INSERT INTO newtab_shortcuts (id, user_id, group_id, folder_id, title, url, favicon, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              id,
              userId,
              item.group_id || null,
              null, // folder_id 不再同步
              sanitizeString(item.title, 200),
              sanitizeString(item.url, 2000),
              null, // favicon 不再同步
              item.position,
              now,
              now
            )
            .run()
        }
      }

      return success({ message: 'Sync completed', synced_at: now })
    } catch (error) {
      console.error('Sync data error:', error)
      return internalError('Failed to sync data')
    }
  },
]
