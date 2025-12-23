/**
 * 设置面板 - 常规标签页
 */

import { useNewtabStore } from '../../../hooks/useNewtabStore';
import { SEARCH_ENGINES } from '../../../constants';
import {
  SettingSection,
  ToggleItem,
  TextItem,
  SelectItem,
  CacheFaviconsButton,
} from '../components/SettingItems';
import type { ClockFormat, SearchEngine } from '../../../types';

export function GeneralTab() {
  const { settings, updateSettings } = useNewtabStore();

  return (
    <div className="space-y-6">
      {/* 个性化 */}
      <SettingSection title="个性化">
        <ToggleItem
          label="显示问候语"
          checked={settings.showGreeting}
          onChange={(v) => updateSettings({ showGreeting: v })}
        />
        <TextItem
          label="你的名字"
          value={settings.userName}
          placeholder="可选"
          onChange={(v) => updateSettings({ userName: v })}
        />
      </SettingSection>

      {/* 时钟 */}
      <SettingSection title="时钟">
        <ToggleItem
          label="显示时钟"
          checked={settings.showClock}
          onChange={(v) => updateSettings({ showClock: v })}
        />
        {settings.showClock && (
          <>
            <ToggleItem
              label="显示日期"
              checked={settings.showDate}
              onChange={(v) => updateSettings({ showDate: v })}
            />
            <ToggleItem
              label="显示秒数"
              checked={settings.showSeconds}
              onChange={(v) => updateSettings({ showSeconds: v })}
            />
            <ToggleItem
              label="显示农历"
              checked={settings.showLunar}
              onChange={(v) => updateSettings({ showLunar: v })}
            />
            <SelectItem
              label="时间格式"
              value={settings.clockFormat}
              options={[
                { value: '24h', label: '24 小时制' },
                { value: '12h', label: '12 小时制' },
              ]}
              onChange={(v) => updateSettings({ clockFormat: v as ClockFormat })}
            />
          </>
        )}
      </SettingSection>

      <SettingSection title="诗词">
        <ToggleItem
          label="显示每日诗词"
          checked={settings.showPoetry}
          onChange={(v) => updateSettings({ showPoetry: v })}
        />
      </SettingSection>

      <SettingSection title="搜索">
        <ToggleItem
          label="显示搜索框"
          checked={settings.showSearch}
          onChange={(v) => updateSettings({ showSearch: v })}
        />
        <SelectItem
          label="搜索引擎"
          value={settings.searchEngine}
          options={SEARCH_ENGINES.map((e) => ({ value: e.id, label: e.name }))}
          onChange={(v) => updateSettings({ searchEngine: v as SearchEngine })}
        />
      </SettingSection>

      <SettingSection title="离线缓存">
        <CacheFaviconsButton />
      </SettingSection>

      <SettingSection title="使用说明">
        <div className="text-sm text-white/70 leading-relaxed space-y-2">
          <div>1. 编辑模式下，双击文件夹可以进入文件夹。</div>
          <div>2. 滚轮切换：左右两侧30%区域滚轮切换分组，中间40%区域滚轮切换图标翻页。</div>
          <div>3. 单个分组图标过多时，可在图标区域滚动进行左右翻页。</div>
        </div>
      </SettingSection>
    </div>
  );
}
