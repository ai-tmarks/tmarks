/**

import type { ExportTabGroup, ExportTabGroupItem } from '../../../../shared/import-export-types'

type EscapeHtml = (text: string) => string
type ToUnixTimestamp = (isoString: string) => string

export function generateTabGroupsNetscapeSection(params: {
  tabGroups: ExportTabGroup[] | undefined
  exportedAt: string
  escapeHtml: EscapeHtml
  toUnixTimestamp: ToUnixTimestamp
}): string {
  const { tabGroups, exportedAt, escapeHtml, toUnixTimestamp } = params
  if (!tabGroups || tabGroups.length === 0) return ''

  type TabGroupNode = ExportTabGroup & { children: TabGroupNode[] }

  const nodeById = new Map<string, TabGroupNode>()
  for (const group of tabGroups) {
    nodeById.set(group.id, { ...group, children: [] })
  }

  const roots: TabGroupNode[] = []
  for (const node of nodeById.values()) {
    const parentId = node.parent_id
    const parent = parentId && parentId !== node.id ? nodeById.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortTree = (nodes: TabGroupNode[]) => {
    nodes.sort((a, b) => a.position - b.position)
    nodes.forEach((n) => sortTree(n.children))
  }
  sortTree(roots)

  const generateTabGroupItemEntry = (item: ExportTabGroupItem, depth: number): string => {
    const indent = '    '.repeat(Math.max(depth, 0))
    const addDate = item.created_at ? toUnixTimestamp(item.created_at) : toUnixTimestamp(new Date().toISOString())

    const tags: string[] = ['tmarks_tab_group']
    if (item.is_pinned) tags.push('pinned')
    if (item.is_todo) tags.push('todo')
    if (item.is_archived) tags.push('archived')

    const attributes = [
      `HREF="${escapeHtml(item.url)}"`,
      `ADD_DATE="${addDate}"`,
      `LAST_MODIFIED="${addDate}"`,
      `TAGS="${escapeHtml(tags.join(','))}"`
    ]

    let entry = `${indent}    <DT><A ${attributes.join(' ')}>${escapeHtml(item.title)}</A>\n`
    if (item.is_todo || item.is_archived || item.is_pinned) {
      const flags = [
        item.is_pinned ? 'pinned' : null,
        item.is_todo ? 'todo' : null,
        item.is_archived ? 'archived' : null
      ].filter(Boolean).join(', ')
      entry += `${indent}    <DD>Status: ${escapeHtml(flags)}\n`
    }
    return entry
  }

  const renderNode = (node: TabGroupNode, depth: number, visited: Set<string>): string => {
    if (visited.has(node.id)) return ''
    visited.add(node.id)

    const indent = '    '.repeat(Math.max(depth, 0))
    const addDate = toUnixTimestamp(node.created_at || exportedAt)
    const lastModified = toUnixTimestamp(node.updated_at || node.created_at || exportedAt)

    let html = ''
    html += `${indent}<DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${escapeHtml(node.title)}</H3>\n`
    html += `${indent}<DL><p>\n`

    const items = [...(node.items || [])].sort((a, b) => a.position - b.position)
    for (const item of items) {
      html += generateTabGroupItemEntry(item, depth + 1)
    }

    for (const child of node.children) {
      html += renderNode(child, depth + 1, visited)
    }

    html += `${indent}</DL><p>\n`
    return html
  }

  const headerAddDate = toUnixTimestamp(exportedAt)
  let html = ''
  html += `    <DT><H3 ADD_DATE="${headerAddDate}" LAST_MODIFIED="${headerAddDate}">Tab Groups (TMarks)</H3>\n`
  html += `    <DL><p>\n`
  const visited = new Set<string>()
  for (const root of roots) {
    html += renderNode(root, 2, visited)
  }
  html += `    </DL><p>\n`
  return html
}

