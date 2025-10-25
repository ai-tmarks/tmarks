import { tabGroupsService } from '@/services/tab-groups'
import type { TabGroup } from '@/lib/types'

export interface TabGroupMenuActions {
  onOpenInNewWindow: (group: TabGroup) => void
  onOpenInCurrentWindow: (group: TabGroup) => void
  onOpenInIncognito: (group: TabGroup) => void
  onRename: (group: TabGroup) => void
  onShare: (group: TabGroup) => void
  onCopyToClipboard: (group: TabGroup) => void
  onImportLinks: (group: TabGroup) => void
  onCreateFolderAbove: (group: TabGroup) => void
  onCreateFolderInside: (group: TabGroup) => void
  onCreateFolderBelow: (group: TabGroup) => void
  onCreateGroupAbove: (group: TabGroup) => void
  onCreateGroupInside: (group: TabGroup) => void
  onCreateGroupBelow: (group: TabGroup) => void
  onPinToTop: (group: TabGroup) => void
  onRemoveDuplicates: (group: TabGroup) => void
  onLock: (group: TabGroup) => void
  onMove: (group: TabGroup) => Promise<void>
  onMoveToTrash: (group: TabGroup) => void
}

interface UseTabGroupMenuProps {
  onRefresh?: () => Promise<void>
  onStartRename: (groupId: string, title: string) => void
  onOpenMoveDialog?: (group: TabGroup) => void
}

export function useTabGroupMenu({ onRefresh, onStartRename, onOpenMoveDialog }: UseTabGroupMenuProps): TabGroupMenuActions {
  // 打开所有标签页
  const openAllTabs = (group: TabGroup, mode: 'new' | 'current' | 'incognito') => {
    if (!group.items || group.items.length === 0) {
      alert('没有可打开的标签页')
      return
    }

    const modeText = mode === 'new' ? '新窗口' : mode === 'current' ? '当前窗口' : '隐身窗口'
    
    // 确认打开多个标签页
    if (group.items.length > 5) {
      if (!confirm(`确定要在${modeText}中打开 ${group.items.length} 个标签页吗？`)) {
        return
      }
    }

    // 对于"当前窗口"模式，使用传统方法
    if (mode === 'current' && group.items && group.items.length > 0) {
      const firstItem = group.items[0]
      if (firstItem) {
        window.location.href = firstItem.url
      }
      return
    }

    try {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>正在打开标签页...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 1rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      max-width: 600px;
    }
    h1 { margin: 0 0 1rem 0; font-size: 2rem; }
    .progress {
      margin: 2rem 0;
      font-size: 1.5rem;
      font-weight: bold;
    }
    .status {
      margin: 1rem 0;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }
    .links {
      margin-top: 2rem;
      text-align: left;
      max-height: 300px;
      overflow-y: auto;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.5rem;
    }
    .link-item {
      padding: 0.5rem;
      margin: 0.25rem 0;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.25rem;
      font-size: 0.85rem;
      word-break: break-all;
    }
    .link-item.opened {
      background: rgba(76, 175, 80, 0.3);
    }
    .link-item.failed {
      background: rgba(244, 67, 54, 0.3);
    }
    button {
      margin-top: 1rem;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: bold;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 正在打开标签页</h1>
    <div class="progress">
      <span id="current">0</span> / <span id="total">${group.items.length}</span>
    </div>
    <div class="status" id="status">准备打开...</div>
    <div class="links" id="links"></div>
    <button onclick="window.close()" style="display:none" id="closeBtn">关闭此窗口</button>
  </div>
  <script>
    const urls = ${JSON.stringify(group.items.map((item) => ({ url: item.url, title: item.title })))};
    let opened = 0;
    let failed = 0;
    
    const linksContainer = document.getElementById('links');
    const statusEl = document.getElementById('status');
    const currentEl = document.getElementById('current');
    const closeBtnEl = document.getElementById('closeBtn');
    
    urls.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'link-item';
      div.id = 'link-' + index;
      div.textContent = (index + 1) + '. ' + item.title;
      linksContainer.appendChild(div);
    });
    
    async function openTabs() {
      for (let i = 0; i < urls.length; i++) {
        const item = urls[i];
        const linkEl = document.getElementById('link-' + i);
        
        try {
          statusEl.textContent = '正在打开: ' + item.title;
          const newWindow = window.open(item.url, '_blank', 'noopener,noreferrer');
          
          if (newWindow) {
            opened++;
            linkEl.className = 'link-item opened';
          } else {
            failed++;
            linkEl.className = 'link-item failed';
          }
        } catch (error) {
          console.error('Failed to open:', item.url, error);
          failed++;
          linkEl.className = 'link-item failed';
        }
        
        currentEl.textContent = (i + 1);
        
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (failed > 0) {
        statusEl.textContent = '✅ 成功打开 ' + opened + ' 个，❌ 失败 ' + failed + ' 个';
        statusEl.style.background = 'rgba(255, 152, 0, 0.3)';
      } else {
        statusEl.textContent = '✅ 全部打开成功！共 ' + opened + ' 个标签页';
        statusEl.style.background = 'rgba(76, 175, 80, 0.3)';
      }
      
      closeBtnEl.style.display = 'block';
    }
    
    setTimeout(openTabs, 500);
  </script>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank', 'width=800,height=600')

      if (newWindow) {
        alert(`已在${modeText}中打开标签页管理器`)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      } else {
        alert('无法打开新窗口，请检查浏览器弹窗设置')
      }
    } catch (error) {
      console.error('Failed to open tabs:', error)
      alert('打开标签页失败，请重试')
    }
  }

  const onOpenInNewWindow = (group: TabGroup) => {
    openAllTabs(group, 'new')
  }

  const onOpenInCurrentWindow = (group: TabGroup) => {
    openAllTabs(group, 'current')
  }

  const onOpenInIncognito = (group: TabGroup) => {
    openAllTabs(group, 'incognito')
  }

  const onRename = (group: TabGroup) => {
    onStartRename(group.id, group.title)
  }

  const onShare = async (group: TabGroup) => {
    try {
      const shareData = await tabGroupsService.createShare(group.id, {
        is_public: true,
        expires_in_days: 30
      })

      const shareUrl = shareData.share_url

      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert(`分享链接已创建并复制到剪贴板：\n\n${shareUrl}\n\n有效期：30天`)
      } catch (err) {
        alert(`分享链接已创建：\n\n${shareUrl}\n\n有效期：30天\n\n（复制到剪贴板失败，请手动复制）`)
      }
    } catch (err) {
      console.error('Failed to create share:', err)
      alert('创建分享链接失败')
    }
  }

  const onCopyToClipboard = async (group: TabGroup) => {
    if (!group.items || group.items.length === 0) {
      alert('此分组没有标签页')
      return
    }

    const text = group.items.map(item => `${item.title}\n${item.url}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('复制失败')
    }
  }

  const onImportLinks = async (group: TabGroup) => {
    const text = prompt('请粘贴要导入的链接（每行一个）：\n\n提示：可以粘贴多行链接，每行一个URL')
    if (!text) return

    const urls = text.split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.startsWith('http://') || line.startsWith('https://')))

    if (urls.length === 0) {
      alert('没有找到有效的链接')
      return
    }

    try {
      // 将 URL 转换为标签页项格式
      const items = urls.map(url => {
        try {
          const urlObj = new URL(url)
          return {
            title: urlObj.hostname,
            url: url,
            favicon: `${urlObj.origin}/favicon.ico`,
          }
        } catch {
          return {
            title: url,
            url: url,
          }
        }
      })

      // 批量添加
      await tabGroupsService.addItemsToGroup(group.id, items)
      alert(`成功导入 ${urls.length} 个链接`)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to import:', err)
      alert('导入失败')
    }
  }

  const onCreateFolderAbove = async (group: TabGroup) => {
    try {
      await tabGroupsService.createFolder('新文件夹', group.parent_id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('创建文件夹失败')
    }
  }

  const onCreateFolderInside = async (group: TabGroup) => {
    if (group.is_folder !== 1) return
    try {
      await tabGroupsService.createFolder('新文件夹', group.id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('创建文件夹失败')
    }
  }

  const onCreateFolderBelow = async (group: TabGroup) => {
    try {
      await tabGroupsService.createFolder('新文件夹', group.parent_id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('创建文件夹失败')
    }
  }

  const onCreateGroupAbove = async (group: TabGroup) => {
    try {
      await tabGroupsService.createTabGroup({
        title: '新分组',
        parent_id: group.parent_id,
        is_folder: false
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create group:', err)
      alert('创建分组失败')
    }
  }

  const onCreateGroupInside = async (group: TabGroup) => {
    if (group.is_folder !== 1) return
    try {
      await tabGroupsService.createTabGroup({
        title: '新分组',
        parent_id: group.id,
        is_folder: false
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create group:', err)
      alert('创建分组失败')
    }
  }

  const onCreateGroupBelow = async (group: TabGroup) => {
    try {
      await tabGroupsService.createTabGroup({
        title: '新分组',
        parent_id: group.parent_id,
        is_folder: false
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to create group:', err)
      alert('创建分组失败')
    }
  }

  const onPinToTop = async (group: TabGroup) => {
    try {
      // 将该项的 position 设置为 -1（最小值），这样排序时会在最前面
      await tabGroupsService.updateTabGroup(group.id, {
        position: -1
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to pin to top:', err)
      alert('固定失败')
    }
  }

  const onRemoveDuplicates = async (group: TabGroup) => {
    if (!group.items || group.items.length === 0) return

    const seen = new Set<string>()
    const duplicates: string[] = []

    group.items.forEach(item => {
      if (seen.has(item.url)) {
        duplicates.push(item.id)
      } else {
        seen.add(item.url)
      }
    })

    if (duplicates.length === 0) {
      alert('没有找到重复项')
      return
    }

    if (confirm(`找到 ${duplicates.length} 个重复项，是否删除？`)) {
      try {
        await Promise.all(duplicates.map(id => tabGroupsService.deleteTabGroupItem(id)))
        await onRefresh?.()
        alert(`已删除 ${duplicates.length} 个重复项`)
      } catch (err) {
        console.error('Failed to remove duplicates:', err)
        alert('删除失败')
      }
    }
  }

  const onLock = async (group: TabGroup) => {
    // 锁定功能：使用 tags 字段存储锁定状态
    try {
      const currentTags = group.tags || []
      const isLocked = currentTags.includes('__locked__')

      let newTags: string[]
      if (isLocked) {
        // 解锁：移除 __locked__ 标签
        newTags = currentTags.filter(tag => tag !== '__locked__')
      } else {
        // 锁定：添加 __locked__ 标签
        newTags = [...currentTags, '__locked__']
      }

      await tabGroupsService.updateTabGroup(group.id, {
        tags: newTags
      })
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to lock/unlock:', err)
      alert('操作失败')
    }
  }

  const onMove = async (group: TabGroup) => {
    if (onOpenMoveDialog) {
      onOpenMoveDialog(group)
    } else {
      alert('移动功能开发中（请使用拖拽）')
    }
  }

  const onMoveToTrash = async (group: TabGroup) => {
    if (!confirm(`确定要删除"${group.title}"吗？`)) return

    try {
      await tabGroupsService.deleteTabGroup(group.id)
      await onRefresh?.()
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('删除失败')
    }
  }

  return {
    onOpenInNewWindow,
    onOpenInCurrentWindow,
    onOpenInIncognito,
    onRename,
    onShare,
    onCopyToClipboard,
    onImportLinks,
    onCreateFolderAbove,
    onCreateFolderInside,
    onCreateFolderBelow,
    onCreateGroupAbove,
    onCreateGroupInside,
    onCreateGroupBelow,
    onPinToTop,
    onRemoveDuplicates,
    onLock,
    onMove,
    onMoveToTrash,
  }
}

