/**
 * 设置面板 - 同步标签页
 */

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { useNewtabStore } from '../../../hooks/useNewtabStore';
import { StorageService } from '@/lib/utils/storage';
import { getTMarksUrls } from '@/lib/constants/urls';
import { SettingSection, ToggleItem, SelectItem } from '../components/SettingItems';

export function SyncTab() {
  const { settings, updateSettings } = useNewtabStore();
  const [tmarksUrl, setTmarksUrl] = useState('');

  useEffect(() => {
    const loadTMarksUrl = async () => {
      const config = await StorageService.getTMarksConfig();
      if (config?.bookmarkApiUrl) {
        const baseUrl = config.bookmarkApiUrl.replace(/\/api\/?$/, '');
        setTmarksUrl(baseUrl);
      } else {
        setTmarksUrl(getTMarksUrls().BASE_URL);
      }
    };
    loadTMarksUrl();
  }, []);

  return (
    <div className="space-y-6">
      <SettingSection title="TMarks 同步">
        <ToggleItem
          label="显示置顶书签"
          checked={settings.showPinnedBookmarks}
          onChange={(v) => updateSettings({ showPinnedBookmarks: v })}
        />
        <ToggleItem
          label="搜索建议"
          checked={settings.enableSearchSuggestions}
          onChange={(v) => updateSettings({ enableSearchSuggestions: v })}
        />
        {tmarksUrl && (
          <a
            href={tmarksUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 mt-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="text-sm text-white/70">打开 TMarks 网站</span>
            <ExternalLink className="w-4 h-4 text-white/50" />
          </a>
        )}
        <div className="text-xs text-white/40 mt-2">
          在扩展设置中配置 API Key 以启用同步功能
        </div>
      </SettingSection>

      <SettingSection title="自动刷新">
        <ToggleItem
          label="定时刷新置顶书签"
          checked={settings.autoRefreshPinnedBookmarks}
          onChange={(v) => updateSettings({ autoRefreshPinnedBookmarks: v })}
        />
        {settings.autoRefreshPinnedBookmarks && (
          <>
            <SelectItem
              label="刷新时间"
              value={settings.pinnedBookmarksRefreshTime}
              options={[
                { value: 'morning', label: '早上 8:00' },
                { value: 'evening', label: '晚上 22:00' },
              ]}
              onChange={(v) => updateSettings({ pinnedBookmarksRefreshTime: v as 'morning' | 'evening' })}
            />
            <div className="text-xs text-white/40 -mt-1 ml-1">
              每天自动更新置顶书签缓存，保持数据最新
            </div>
          </>
        )}
      </SettingSection>
    </div>
  );
}
