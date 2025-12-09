import { TMARKS_URLS } from '@/lib/constants/urls';

interface TMarksConfigSectionProps {
  formData: {
    bookmarkApiUrl: string;
    bookmarkApiKey: string;
  };
  setFormData: (data: any) => void;
}

export function TMarksConfigSection({ formData, setFormData }: TMarksConfigSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-200/70 dark:border-sky-500/20 bg-white/90 dark:bg-gray-900/90 shadow-sm backdrop-blur transition-shadow hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />

      <div className="p-6 pt-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">TMarks API 配置</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              设置官方或自建 TMarks 服务端以同步书签与标签数据。
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-sky-500/10 text-xs font-medium text-sky-600 dark:text-sky-300">
            推荐使用
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            服务器地址
          </label>
          <input
            type="url"
            value={formData.bookmarkApiUrl}
            onChange={(e) => setFormData({ ...formData, bookmarkApiUrl: e.target.value })}
            placeholder={TMARKS_URLS.DEFAULT_BASE_URL}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">TMarks 官方地址：</span>
            <code className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{TMARKS_URLS.DEFAULT_BASE_URL}</code>
          </p>
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-semibold text-blue-600 dark:text-blue-400">ℹ️ TMarks 说明：</span>
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• TMarks 是一个标签为主的书签导航</li>
              <li>• 支持多设备同步、标签管理、全文搜索等功能</li>
              <li>• 填写基础地址即可，系统会自动补全 /api 路径</li>
              <li>• 例如：<code className="px-1 bg-gray-100 dark:bg-gray-700 rounded">https://tmarks.669696.xyz</code></li>
            </ul>
          </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            API Key
          </label>
          <input
            type="password"
            value={formData.bookmarkApiKey}
            onChange={(e) => setFormData({ ...formData, bookmarkApiKey: e.target.value })}
            placeholder="请输入 TMarks API Key"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            在 TMarks 设置中生成 API Key
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
