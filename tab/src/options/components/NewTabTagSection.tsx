import { useState } from 'react';
import { NEWTAB_FOLDER_PROMPT_TEMPLATE } from '@/lib/constants/newtabPrompts';

interface NewTabTagSectionProps {
  formData: {
    enableNewtabAI: boolean;
    newtabFolderRecommendCount: number;
    enableNewtabFolderPrompt: boolean;
    newtabFolderPrompt: string;
    aiBookmarkClassifyScope: 'newtab_root' | 'bookmarks_bar' | 'all';
  };
  setFormData: (data: any) => void;
  setSuccessMessage: (msg: string | null) => void;
}

export function NewTabTagSection({ formData, setFormData, setSuccessMessage }: NewTabTagSectionProps) {
  const [isLoadingFolderPaths, setIsLoadingFolderPaths] = useState(false);
  const [folderPathsError, setFolderPathsError] = useState<string | null>(null);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);

  const loadFolderPaths = async () => {
    try {
      setIsLoadingFolderPaths(true);
      setFolderPathsError(null);

      if (!chrome?.runtime?.sendMessage) {
        throw new Error('当前环境不支持 chrome.runtime');
      }

      const resp = (await chrome.runtime.sendMessage({
        type: 'GET_NEWTAB_FOLDERS',
      })) as {
        success: boolean;
        data?: {
          rootId: string;
          folders: Array<{ id: string; title: string; parentId: string | null; path: string }>;
        };
        error?: string;
      };

      if (!resp?.success) {
        throw new Error(resp?.error || '加载候选路径失败');
      }

      const paths = (resp.data?.folders || [])
        .filter((f) => f.id !== resp.data?.rootId)
        .map((f) => f.path)
        .filter(Boolean);

      setFolderPaths(paths);
      setSuccessMessage('加载候选路径成功');
    } catch (e) {
      setFolderPathsError(e instanceof Error ? e.message : '加载候选路径失败');
      setFolderPaths([]);
    } finally {
      setIsLoadingFolderPaths(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--tab-options-card-border)] bg-[color:var(--tab-options-card-bg)] shadow-sm backdrop-blur transition-shadow hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--tab-options-modal-topbar-from)] via-[var(--tab-options-modal-topbar-via)] to-[var(--tab-options-modal-topbar-to)]" />

      <div className="p-6 pt-10 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[var(--tab-options-title)]">NewTab 文件夹推荐</h2>
          <p className="mt-2 text-sm text-[var(--tab-options-text)]">
            配置 Popup「保存到 NewTab」的文件夹 AI 推荐。
          </p>
          <p className="mt-2 text-xs text-[var(--tab-options-text-muted)]">
            NewTab 根目录固定为浏览器书签栏下的文件夹：TMarks。
          </p>
          <p className="mt-1 text-xs text-[var(--tab-options-text-muted)]">
            后续"AI 整理"会在该根目录范围内创建备份并复制生成整理后的书签结构（可通过下方"AI 分类范围"调整）。
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[var(--tab-options-text)]">
                启用 NewTab 文件夹 AI 推荐
              </label>
              <p className="mt-1 text-xs text-[var(--tab-options-text-muted)]">
                启用后，保存到 NewTab 时可使用 AI 推荐文件夹。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.enableNewtabAI}
              onClick={() => setFormData({ ...formData, enableNewtabAI: !formData.enableNewtabAI })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--tab-options-button-primary-bg)] focus:ring-offset-2 ${
                formData.enableNewtabAI
                  ? 'bg-[var(--tab-options-button-primary-bg)]'
                  : 'bg-[var(--tab-options-button-hover-bg)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--tab-options-switch-thumb)] shadow ring-0 transition duration-200 ease-in-out ${
                  formData.enableNewtabAI ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--tab-options-text)] mb-2">AI 分类范围</label>
            <div className="inline-flex rounded-xl border border-[color:var(--tab-options-card-border)] bg-[color:var(--tab-options-card-bg)] p-1 text-sm font-medium text-[var(--tab-options-text)]">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, aiBookmarkClassifyScope: 'newtab_root' })}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  formData.aiBookmarkClassifyScope === 'newtab_root'
                    ? 'bg-[var(--tab-options-button-primary-bg)] text-[var(--tab-options-button-primary-text)] shadow'
                    : 'hover:text-[var(--tab-options-title)]'
                }`}
              >
                仅 NewTab 根目录
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, aiBookmarkClassifyScope: 'bookmarks_bar' })}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  formData.aiBookmarkClassifyScope === 'bookmarks_bar'
                    ? 'bg-[var(--tab-options-button-primary-bg)] text-[var(--tab-options-button-primary-text)] shadow'
                    : 'hover:text-[var(--tab-options-title)]'
                }`}
              >
                书签栏
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, aiBookmarkClassifyScope: 'all' })}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  formData.aiBookmarkClassifyScope === 'all'
                    ? 'bg-[var(--tab-options-button-primary-bg)] text-[var(--tab-options-button-primary-text)] shadow'
                    : 'hover:text-[var(--tab-options-title)]'
                }`}
              >
                全部书签
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--tab-options-text-muted)]">
              用于后续"AI 批量整理/分类既有书签"功能的作用范围。默认只处理 NewTab 根目录。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--tab-options-text)] mb-2">
              推荐文件夹数量: {formData.newtabFolderRecommendCount}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={formData.newtabFolderRecommendCount}
              onChange={(e) =>
                setFormData({ ...formData, newtabFolderRecommendCount: Number(e.target.value) })
              }
              className="w-full"
            />
            <p className="mt-1 text-xs text-[var(--tab-options-text-muted)]">
              AI 推荐的候选文件夹数量（1-20）
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--tab-options-text)]">
                自定义 Prompt
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={formData.enableNewtabFolderPrompt}
                onClick={() =>
                  setFormData({ ...formData, enableNewtabFolderPrompt: !formData.enableNewtabFolderPrompt })
                }
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.enableNewtabFolderPrompt
                    ? 'bg-[var(--tab-options-button-primary-bg)]'
                    : 'bg-[var(--tab-options-button-hover-bg)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--tab-options-switch-thumb)] shadow ring-0 transition duration-200 ease-in-out ${
                    formData.enableNewtabFolderPrompt ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {formData.enableNewtabFolderPrompt && (
              <div className="space-y-2">
                <textarea
                  value={formData.newtabFolderPrompt}
                  onChange={(e) => setFormData({ ...formData, newtabFolderPrompt: e.target.value })}
                  placeholder={NEWTAB_FOLDER_PROMPT_TEMPLATE}
                  rows={8}
                  className="w-full rounded-lg border border-[var(--tab-options-card-border)] bg-[var(--tab-options-card-bg)] px-3 py-2 text-sm text-[var(--tab-options-text)] placeholder-[var(--tab-options-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tab-options-button-primary-bg)]"
                />
                <p className="text-xs text-[var(--tab-options-text-muted)]">
                  可用变量: {'{{title}}'}, {'{{url}}'}, {'{{description}}'}, {'{{folderPaths}}'},{' '}
                  {'{{recommendCount}}'}
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={loadFolderPaths}
              disabled={isLoadingFolderPaths}
              className="rounded-lg bg-[var(--tab-options-button-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--tab-options-button-primary-text)] hover:opacity-90 disabled:opacity-50"
            >
              {isLoadingFolderPaths ? '加载中...' : '加载候选路径'}
            </button>
            {folderPathsError && (
              <p className="mt-2 text-xs text-red-500">{folderPathsError}</p>
            )}
            {folderPaths.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-[var(--tab-options-card-border)] bg-[var(--tab-options-card-bg)] p-2">
                <p className="text-xs text-[var(--tab-options-text-muted)] mb-1">
                  已加载 {folderPaths.length} 个候选路径:
                </p>
                {folderPaths.slice(0, 10).map((path, i) => (
                  <div key={i} className="text-xs text-[var(--tab-options-text)]">
                    {path}
                  </div>
                ))}
                {folderPaths.length > 10 && (
                  <div className="text-xs text-[var(--tab-options-text-muted)]">
                    ...还有 {folderPaths.length - 10} 个
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
