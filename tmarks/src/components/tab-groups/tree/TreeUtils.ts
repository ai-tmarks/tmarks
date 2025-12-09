import type { TabGroup } from '@/lib/types'

/**
 * 递归计算分组及其所有子分组的标签页总数
 */
export function getTotalItemCount(group: TabGroup): number {
  let total = 0
  
  // 如果是文件夹，不计算自己的 item_count
  if (group.is_folder !== 1) {
    total += group.item_count || 0
  }
  
  // 递归计算所有子项的数量
  if (group.children && group.children.length > 0) {
    total += group.children.reduce((sum, child) => sum + getTotalItemCount(child), 0)
  }
  
  return total
}

/**
 * 构建树形结构
 */
export function buildTree(groups: TabGroup[]): TabGroup[] {
  const groupMap = new Map<string, TabGroup>()
  const rootGroups: TabGroup[] = []

  // 第一遍：创建映射并初始化 children
  groups.forEach(group => {
    groupMap.set(group.id, { ...group, children: [] })
  })

  // 第二遍：构建父子关系
  groups.forEach(group => {
    const node = groupMap.get(group.id)!
    if (group.parent_id) {
      const parent = groupMap.get(group.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        // 父节点不存在，作为根节点
        rootGroups.push(node)
      }
    } else {
      rootGroups.push(node)
    }
  })

  // 按 position 排序所有层级
  const sortByPosition = (nodes: TabGroup[]) => {
    nodes.sort((a, b) => (a.position || 0) - (b.position || 0))
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortByPosition(node.children)
      }
    })
  }

  sortByPosition(rootGroups)
  return rootGroups
}
