import { LoadingSpinner } from '@/components/LoadingSpinner';

interface CacheStatusSectionProps {
  stats: {
    tags: number;
    bookmarks: number;
    lastSync: number;
  };
  handleSync: () => Promise<void>;
  isLoading: boolean;
  formatDate: (timestamp: number) => string;
}

export function CacheStatusSection({
  stats,
  handleSync,
  isLoading,
  formatDate
}: CacheStatusSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20 bg-white/90 dark:bg-gray-900/90 shadow-sm backdrop-blur transition-shadow hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500" />

      <div className="p-6 pt-10 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">缓存状态</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            查看本地缓存概况并手动触发一次同步。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{stats.tags}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-emerald-700/70 dark:text-emerald-200/70">标签数</p>
          </div>
          <div className="rounded-xl border border-blue-200/60 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{stats.bookmarks}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-blue-700/70 dark:text-blue-200/70">书签数</p>
          </div>
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-600/40 bg-slate-50/70 dark:bg-slate-600/20 p-4 text-center">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{formatDate(stats.lastSync)}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">上次同步</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              <span>同步中...</span>
            </>
          ) : (
            '立即同步'
          )}
        </button>
      </div>
    </div>
  );
}
