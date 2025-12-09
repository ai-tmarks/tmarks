interface PreferencesSectionProps {
  formData: {
    defaultVisibility: 'public' | 'private';
    enableAI: boolean;
    defaultIncludeThumbnail: boolean;
    defaultCreateSnapshot: boolean;
  };
  setFormData: (data: any) => void;
}

export function PreferencesSection({ formData, setFormData }: PreferencesSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-500/20 bg-white/90 dark:bg-gray-900/90 shadow-sm backdrop-blur transition-shadow hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

      <div className="p-6 pt-10 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">偏好设置</h2>
        </div>

        <div className="space-y-6">
          {/* Enable AI */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  AI 标签推荐
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  启用后，保存书签时自动调用 AI 分析页面并推荐标签。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.enableAI}
                onClick={() => setFormData({ ...formData, enableAI: !formData.enableAI })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.enableAI ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.enableAI ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {!formData.enableAI && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  关闭后将跳过 AI 推荐，你可以直接从标签库中选择标签。
                </p>
              </div>
            )}
          </div>

          {/* Default Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              默认可见性
            </label>
            <div className="inline-flex rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-white/60 dark:bg-gray-800/70 p-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, defaultVisibility: 'public' })}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  formData.defaultVisibility === 'public'
                    ? 'bg-blue-600 text-white shadow'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                公开
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, defaultVisibility: 'private' })}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  formData.defaultVisibility === 'private'
                    ? 'bg-slate-700 text-white shadow'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                隐私
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              选择保存书签时默认使用的可见性，可在保存前随时切换。
            </p>
          </div>

          {/* Default Include Thumbnail */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  默认包含封面图
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  保存书签时默认是否包含页面封面图。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.defaultIncludeThumbnail}
                onClick={() => setFormData({ ...formData, defaultIncludeThumbnail: !formData.defaultIncludeThumbnail })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  formData.defaultIncludeThumbnail ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.defaultIncludeThumbnail ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Default Create Snapshot */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  默认创建快照
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  保存书签时默认是否创建网页快照。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.defaultCreateSnapshot}
                onClick={() => setFormData({ ...formData, defaultCreateSnapshot: !formData.defaultCreateSnapshot })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  formData.defaultCreateSnapshot ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.defaultCreateSnapshot ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
