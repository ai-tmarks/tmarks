/**
 *  API -  API 
 * : /api
 * 
 */

import type { PagesFunction } from '@cloudflare/workers-types'
import type { Env } from '../lib/types'

export const onRequestGet: PagesFunction<Env> = async () => {
  return Response.json({
    name: 'TMarks API',
    version: 'v1',
    description: 'TMarks Bookmark Management API',
    documentation: '/api/docs',
    endpoints: {
      bookmarks: {
        list: 'GET /api/bookmarks',
        create: 'POST /api/bookmarks',
        get: 'GET /api/bookmarks/:id',
        update: 'PATCH /api/bookmarks/:id',
        delete: 'DELETE /api/bookmarks/:id',
      },
      tags: {
        list: 'GET /api/tags',
        create: 'POST /api/tags',
        get: 'GET /api/tags/:id',
        update: 'PATCH /api/tags/:id',
        delete: 'DELETE /api/tags/:id',
      },
      user: {
        me: 'GET /api/me',
      },
      search: {
        global: 'GET /api/search?q=keyword',
      },
    },
    authentication: {
      type: 'API Key',
      header: 'X-API-Key',
      format: 'tmk_live_xxxxxxxxxxxxxxxxxxxx',
      how_to_get: 'Create an API Key in TMarks Settings > API Keys',
    },
    rate_limits: {
      per_minute: 60,
      per_hour: 1000,
      per_day: 10000,
    },
    support: {
      docs: '/help',
    },
  })
}
