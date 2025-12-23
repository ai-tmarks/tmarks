/**
 * NewTab 文件夹管理服务
 */

import {
  TMARKS_ROOT_TITLE,
  TMARKS_HOME_TITLE,
  TMARKS_STORAGE_KEY_ROOT_ID,
  TMARKS_STORAGE_KEY_HOME_ID,
  TMARKS_STORAGE_KEY_UUID,
} from '../constants';

export interface EnsureNewtabRootFolderResult {
  id: string;
  wasRecreated: boolean;
}

export interface EnsureNewtabHomeFolderResult {
  id: string;
  wasRecreated: boolean;
}

/**
 * 生成 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取或创建工作区 UUID
 */
async function getOrCreateWorkspaceUUID(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(TMARKS_STORAGE_KEY_UUID);
    const savedUUID = result[TMARKS_STORAGE_KEY_UUID];
    if (typeof savedUUID === 'string' && savedUUID.length > 0) {
      return savedUUID;
    }
    const newUUID = generateUUID();
    await chrome.storage.local.set({ [TMARKS_STORAGE_KEY_UUID]: newUUID });
    console.log('[TMarks Background] 已生成工作区 UUID:', newUUID);
    return newUUID;
  } catch {
    return generateUUID();
  }
}

/**
 * 从文件夹标题中提取 UUID（格式：TMarks 或 TMarks [uuid]）
 */
function extractUUIDFromTitle(title: string): string | null {
  const match = title.match(/^TMarks\s*\[([a-f0-9-]+)\]$/i);
  return match ? match[1] : null;
}

/**
 * 生成带 UUID 的文件夹标题
 */
function generateTitleWithUUID(uuid: string): string {
  return `${TMARKS_ROOT_TITLE} [${uuid}]`;
}

/**
 * 获取书签栏根目录 ID
 */
export async function getBookmarksBarRootId(): Promise<string | null> {
  try {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];

    const byId = root.children?.find((c) => c.id === '1' && !c.url);
    if (byId) return byId.id;

    const titles = new Set([
      'Bookmarks Bar',
      'Bookmarks bar',
      'Bookmarks Toolbar',
      '书签栏',
      '收藏夹栏',
      'Favorites bar',
      '收藏夹',
    ]);
    const byTitle = root.children?.find((c) => !c.url && titles.has(c.title));
    if (byTitle) return byTitle.id;

    const firstFolder = root.children?.find((c) => !c.url);
    return firstFolder?.id || null;
  } catch {
    return null;
  }
}

/**
 * 读取已保存的 TMarks 根文件夹 ID
 */
export async function getSavedNewtabRootFolderId(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(TMARKS_STORAGE_KEY_ROOT_ID);
    const savedId = result[TMARKS_STORAGE_KEY_ROOT_ID];
    return typeof savedId === 'string' ? savedId : null;
  } catch {
    return null;
  }
}

/**
 * 保存 TMarks 根文件夹 ID
 */
export async function saveNewtabRootFolderId(id: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [TMARKS_STORAGE_KEY_ROOT_ID]: id });
  } catch {
    // ignore
  }
}

/**
 * 读取已保存的首页文件夹 ID
 */
export async function getSavedNewtabHomeFolderId(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(TMARKS_STORAGE_KEY_HOME_ID);
    const savedId = result[TMARKS_STORAGE_KEY_HOME_ID];
    return typeof savedId === 'string' ? savedId : null;
  } catch {
    return null;
  }
}

/**
 * 保存首页文件夹 ID
 */
export async function saveNewtabHomeFolderId(id: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [TMARKS_STORAGE_KEY_HOME_ID]: id });
  } catch {
    // ignore
  }
}

/**
 * 检查书签文件夹是否存在（通过 ID）
 */
export async function checkNewtabFolderExists(
  folderId: string
): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  try {
    const nodes = await chrome.bookmarks.get(folderId);
    const node = nodes?.[0];
    if (node && !node.url) {
      return node;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 确保 TMarks 根文件夹存在
 * 
 * 绑定逻辑：
 * 1. 优先使用已保存的文件夹 ID（如果存在且有效）
 * 2. 如果 ID 失效，通过 UUID 匹配查找（标题格式：TMarks [uuid]）
 * 3. 如果找不到匹配的 UUID，查找旧格式的 "TMarks" 文件夹并升级
 * 4. 如果都没有，创建新的带 UUID 的文件夹
 */
export async function ensureNewtabRootFolder(): Promise<EnsureNewtabRootFolderResult | null> {
  try {
    const barId = await getBookmarksBarRootId();
    if (!barId) return null;

    const workspaceUUID = await getOrCreateWorkspaceUUID();
    const savedId = await getSavedNewtabRootFolderId();

    // 1. 检查已保存的 ID 是否有效
    if (savedId) {
      const existingNode = await checkNewtabFolderExists(savedId);
      if (existingNode) {
        // 验证 UUID 匹配（如果标题包含 UUID）
        const titleUUID = extractUUIDFromTitle(existingNode.title);
        if (titleUUID && titleUUID !== workspaceUUID) {
          console.warn('[TMarks Background] 文件夹 UUID 不匹配，可能是其他扩展实例的文件夹');
          // 不使用这个文件夹，继续查找
        } else {
          // 确保文件夹在书签栏中
          const parentId = (existingNode as any).parentId;
          if (parentId && parentId !== barId) {
            try {
              await chrome.bookmarks.move(savedId, { parentId: barId });
            } catch (error) {
              console.warn('[TMarks Background] 无法移动根文件夹到书签栏:', error);
            }
          }
          // 如果是旧格式（没有 UUID），升级标题
          if (!titleUUID) {
            try {
              await chrome.bookmarks.update(savedId, { title: generateTitleWithUUID(workspaceUUID) });
              console.log('[TMarks Background] 已升级文件夹标题，添加 UUID');
            } catch {
              // ignore
            }
          }
          return { id: savedId, wasRecreated: false };
        }
      }
      console.log('[TMarks Background] 保存的根文件夹 ID 无效，尝试通过 UUID 查找...');
    }

    // 2. 通过 UUID 查找
    const barChildren = await chrome.bookmarks.getChildren(barId);
    const expectedTitle = generateTitleWithUUID(workspaceUUID);
    
    const existingByUUID = barChildren.find((c) => {
      if (c.url) return false;
      const titleUUID = extractUUIDFromTitle(c.title);
      return titleUUID === workspaceUUID;
    });

    if (existingByUUID) {
      await saveNewtabRootFolderId(existingByUUID.id);
      console.log('[TMarks Background] 通过 UUID 找到根文件夹:', existingByUUID.id);
      return { id: existingByUUID.id, wasRecreated: false };
    }

    // 3. 查找旧格式的 "TMarks" 文件夹并升级
    const existingOldFormat = barChildren.find((c) => !c.url && c.title === TMARKS_ROOT_TITLE);
    if (existingOldFormat) {
      try {
        await chrome.bookmarks.update(existingOldFormat.id, { title: expectedTitle });
        console.log('[TMarks Background] 已升级旧格式文件夹，添加 UUID');
      } catch {
        // ignore
      }
      await saveNewtabRootFolderId(existingOldFormat.id);
      return { id: existingOldFormat.id, wasRecreated: false };
    }

    // 4. 查找更旧的格式
    const OLD_ROOT_TITLE = 'AI 书签助手 NewTab';
    const existingVeryOld = barChildren.find((c) => !c.url && c.title === OLD_ROOT_TITLE);
    if (existingVeryOld) {
      try {
        await chrome.bookmarks.update(existingVeryOld.id, { title: expectedTitle });
        console.log('[TMarks Background] 已升级非常旧的文件夹格式');
      } catch {
        // ignore
      }
      await saveNewtabRootFolderId(existingVeryOld.id);
      return { id: existingVeryOld.id, wasRecreated: false };
    }

    // 5. 创建新的带 UUID 的文件夹
    const createdRoot = await chrome.bookmarks.create({ 
      parentId: barId, 
      title: expectedTitle 
    });
    await saveNewtabRootFolderId(createdRoot.id);

    const wasRecreated = savedId !== null;
    if (wasRecreated) {
      console.log('[TMarks Background] 根文件夹已重新创建，ID:', createdRoot.id, 'UUID:', workspaceUUID);
    } else {
      console.log('[TMarks Background] 根文件夹已创建，ID:', createdRoot.id, 'UUID:', workspaceUUID);
    }

    return { id: createdRoot.id, wasRecreated };
  } catch (error) {
    console.error('[TMarks Background] ensureNewtabRootFolder 失败:', error);
    return null;
  }
}

/**
 * 确保 TMarks 首页文件夹存在
 */
export async function ensureNewtabHomeFolder(
  rootId: string
): Promise<EnsureNewtabHomeFolderResult | null> {
  if (!rootId) return null;

  const savedId = await getSavedNewtabHomeFolderId();
  if (savedId) {
    try {
      const nodes = await chrome.bookmarks.get(savedId);
      const node = nodes?.[0];
      if (node && !node.url) {
        const parentId = (node as any).parentId;
        if (parentId !== rootId) {
          try {
            await chrome.bookmarks.move(savedId, { parentId: rootId });
          } catch (error) {
            console.warn('[TMarks Background] 无法移动首页文件夹到根目录:', error);
          }
        }
        await saveNewtabHomeFolderId(node.id);
        return { id: node.id, wasRecreated: false };
      }
    } catch {
      console.log('[TMarks Background] 保存的首页文件夹 ID 无效，重新查找/创建');
    }
  }

  try {
    const children = await chrome.bookmarks.getChildren(rootId);
    const existing = children.find((c) => !c.url && c.title === TMARKS_HOME_TITLE);
    if (existing) {
      await saveNewtabHomeFolderId(existing.id);
      return { id: existing.id, wasRecreated: false };
    }

    const created = await chrome.bookmarks.create({
      parentId: rootId,
      title: TMARKS_HOME_TITLE,
    });
    await saveNewtabHomeFolderId(created.id);
    return { id: created.id, wasRecreated: savedId !== null };
  } catch (error) {
    console.error('[TMarks Background] 创建首页文件夹失败:', error);
    return null;
  }
}

/**
 * 确保工作区文件夹存在
 */
export async function ensureNewtabWorkspaceFolders(): Promise<{
  rootId: string;
  homeId: string | null;
} | null> {
  const rootResult = await ensureNewtabRootFolder();
  if (!rootResult) return null;
  const homeResult = await ensureNewtabHomeFolder(rootResult.id);
  return {
    rootId: rootResult.id,
    homeId: homeResult?.id ?? null,
  };
}

/**
 * 处理书签节点删除事件
 */
export async function handleBookmarkNodeRemoved(removedId: string) {
  try {
    const [savedRootId, savedHomeId] = await Promise.all([
      getSavedNewtabRootFolderId(),
      getSavedNewtabHomeFolderId(),
    ]);

    if (removedId && savedRootId && removedId === savedRootId) {
      await ensureNewtabWorkspaceFolders();
      return;
    }

    if (removedId && savedHomeId && removedId === savedHomeId) {
      const rootResult = await ensureNewtabRootFolder();
      if (rootResult) {
        await ensureNewtabHomeFolder(rootResult.id);
      }
    }
  } catch (error) {
    console.error('[TMarks Background] 处理书签删除事件失败:', error);
  }
}

/**
 * 处理书签节点移动事件
 */
export async function handleBookmarkNodeMoved(id: string) {
  try {
    const [savedRootId, savedHomeId] = await Promise.all([
      getSavedNewtabRootFolderId(),
      getSavedNewtabHomeFolderId(),
    ]);

    if (savedRootId && id === savedRootId) {
      await ensureNewtabRootFolder();
      return;
    }

    if (savedHomeId && id === savedHomeId) {
      const rootResult = await ensureNewtabRootFolder();
      if (rootResult) {
        await ensureNewtabHomeFolder(rootResult.id);
      }
    }
  } catch (error) {
    console.error('[TMarks Background] 处理书签移动事件失败:', error);
  }
}
