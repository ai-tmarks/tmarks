import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PROMPT_TEMPLATE } from '@/lib/constants/prompts';
import type { AIProvider, AIConnectionInfo } from '@/types';
import { AI_SERVICE_URLS, AI_SERVICE_DOCS } from '@/lib/constants/urls';

interface AIConfigSectionProps {
  formData: {
    aiProvider: AIProvider;
    apiKey: string;
    apiUrl: string;
    aiModel: string;
    enableCustomPrompt: boolean;
    customPrompt: string;
    maxSuggestedTags: number;
  };
  setFormData: (data: any) => void;
  handleProviderChange: (provider: AIProvider) => void;
  setSuccessMessage: (msg: string | null) => void;
  handleTestConnection: () => Promise<void>;
  isTesting: boolean;
  availableModels: string[];
  isFetchingModels: boolean;
  modelFetchError: string | null;
  onRefreshModels: () => void;
  modelFetchSupported: boolean;
  allSavedConnections: Array<AIConnectionInfo & { provider: AIProvider }>;
  onApplySavedConnection: (connection: AIConnectionInfo, providerOverride?: AIProvider) => void;
  onDeleteSavedConnection: (connection: AIConnectionInfo, providerOverride?: AIProvider) => void;
  onSaveConnectionPreset: () => void;
}

export function AIConfigSection({
  formData,
  setFormData,
  handleProviderChange,
  setSuccessMessage,
  handleTestConnection,
  isTesting,
  availableModels,
  isFetchingModels,
  modelFetchError,
  onRefreshModels,
  modelFetchSupported,
  allSavedConnections,
  onApplySavedConnection,
  onDeleteSavedConnection,
  onSaveConnectionPreset
}: AIConfigSectionProps) {
  const hasModelOptions = availableModels.length > 0;
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);
  const providerNameMap: Record<AIProvider, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    deepseek: 'DeepSeek',
    zhipu: '智谱AI',
    modelscope: 'ModelScope',
    siliconflow: 'SiliconFlow',
    iflow: '讯飞星火',
    custom: '自定义'
  };

  useEffect(() => {
    if (!modelDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modelDropdownOpen]);

  useEffect(() => {
    if (!hasModelOptions) {
      setModelDropdownOpen(false);
    }
  }, [hasModelOptions]);

  useEffect(() => {
    if (allSavedConnections.length <= 3 && showAllConnections) {
      setShowAllConnections(false);
    }
  }, [allSavedConnections.length, showAllConnections]);

  const handleSelectModel = (model: string) => {
    setFormData((prev: any) => ({
      ...prev,
      aiModel: model
    }));
    setModelDropdownOpen(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/90 shadow-sm backdrop-blur transition-shadow hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <div className="p-8 pt-12 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">AI 配置</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              连接你的智能标签服务，管理模型与调用策略。
            </p>
          </div>
          <button
            type="button"
            onClick={onSaveConnectionPreset}
            disabled={!formData.apiKey.trim()}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              formData.apiKey.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            保存当前配置
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">已保存的全部配置</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>共 {allSavedConnections.length} 个</span>
                {allSavedConnections.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllConnections(prev => !prev)}
                    className="rounded-full border border-gray-300/80 px-2 py-0.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600/70 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {showAllConnections ? '收起' : `展开更多 (${allSavedConnections.length - 3})`}
                  </button>
                )}
              </div>
            </div>
            {allSavedConnections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300/80 dark:border-gray-600/70 bg-gray-50/70 dark:bg-gray-800/40 p-6 text-sm text-gray-500 dark:text-gray-400">
                目前还没有保存过任何配置，填写好 API 信息后点击「保存当前配置」即可创建预设。
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(showAllConnections ? allSavedConnections : allSavedConnections.slice(0, 3)).map((connection, index) => (
                  <div
                    key={connection.id || `${connection.provider || 'unknown'}-${connection.label || connection.apiUrl || 'default'}-${index}`}
                    className="group flex flex-col justify-between gap-3 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/70 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
                        title={connection.label || connection.apiUrl || '未命名配置'}
                      >
                        {connection.label || '未命名配置'}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 px-2 py-0.5 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500/80" />
                        {providerNameMap[connection.provider || formData.aiProvider]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onApplySavedConnection(connection, connection.provider)}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        使用
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavedConnection(connection, connection.provider)}
                        className="rounded-lg border border-gray-300/80 dark:border-gray-600/70 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              AI 引擎
            </label>
            <select
              value={formData.aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
              <option value="claude">Claude (Anthropic)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="zhipu">智谱AI (GLM-4)</option>
              <option value="modelscope">ModelScope (通义千问)</option>
              <option value="siliconflow">SiliconFlow</option>
              <option value="iflow">iFlytek Spark (讯飞星火)</option>
              <option value="custom">自定义 API</option>
            </select>
          </div>

          {(formData.aiProvider === 'custom' || formData.aiProvider === 'siliconflow' || formData.aiProvider === 'deepseek' || formData.aiProvider === 'openai') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                API 地址
              </label>
              <input
                type="url"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder={
                  formData.aiProvider === 'openai'
                    ? AI_SERVICE_URLS.OPENAI
                    : formData.aiProvider === 'deepseek'
                      ? AI_SERVICE_URLS.DEEPSEEK
                      : formData.aiProvider === 'siliconflow'
                        ? AI_SERVICE_URLS.SILICONFLOW
                        : '请输入自定义 API 地址'
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              API Key
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder={
                formData.aiProvider === 'openai'
                  ? '请输入 OpenAI API Key'
                  : formData.aiProvider === 'claude'
                    ? '请输入 Claude API Key'
                    : formData.aiProvider === 'deepseek'
                      ? '请输入 DeepSeek API Key'
                      : formData.aiProvider === 'zhipu'
                        ? '请输入智谱 API Key'
                        : formData.aiProvider === 'modelscope'
                          ? '请输入 ModelScope API Key'
                          : formData.aiProvider === 'siliconflow'
                            ? '请输入 SiliconFlow API Key'
                            : formData.aiProvider === 'iflow'
                              ? '请输入讯飞星火 API Key'
                              : '请输入 API Key'
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formData.aiProvider === 'openai' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.OPENAI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              )}
              {formData.aiProvider === 'claude' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.CLAUDE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Anthropic Console
                  </a>
                </>
              )}
              {formData.aiProvider === 'deepseek' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.DEEPSEEK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    DeepSeek Platform
                  </a>
                </>
              )}
              {formData.aiProvider === 'zhipu' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.ZHIPU}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    智谱AI开放平台
                  </a>
                </>
              )}
              {formData.aiProvider === 'modelscope' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.MODELSCOPE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    ModelScope
                  </a>
                </>
              )}
              {formData.aiProvider === 'siliconflow' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.SILICONFLOW}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    SiliconFlow
                  </a>
                </>
              )}
              {formData.aiProvider === 'iflow' && (
                <>
                  获取 API Key：
                  <a
                    href={AI_SERVICE_DOCS.IFLOW}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    讯飞开放平台
                  </a>
                </>
              )}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                模型
              </label>
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={!modelFetchSupported || isFetchingModels || !formData.apiKey.trim()}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  !modelFetchSupported || isFetchingModels || !formData.apiKey.trim()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFetchingModels ? '获取中...' : '刷新模型'}
              </button>
            </div>
            <div className="relative w-full" ref={modelDropdownRef}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.aiModel}
                  onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                  placeholder={
                    formData.aiProvider === 'openai'
                      ? 'gpt-4o-mini (推荐) 或 gpt-4o'
                      : formData.aiProvider === 'claude'
                        ? 'claude-3-5-sonnet-20241022 (推荐)'
                        : formData.aiProvider === 'deepseek'
                          ? 'deepseek-chat'
                          : formData.aiProvider === 'zhipu'
                            ? 'glm-4-flash (推荐) 或 glm-4-plus'
                            : formData.aiProvider === 'modelscope'
                              ? 'qwen-plus 或 qwen-turbo'
                              : formData.aiProvider === 'siliconflow'
                                ? 'Qwen/Qwen2.5-7B-Instruct'
                                : formData.aiProvider === 'iflow'
                                  ? 'spark-lite 或 spark-pro'
                                  : '请输入模型名称'
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {hasModelOptions && (
                  <button
                    type="button"
                    onClick={() => setModelDropdownOpen((open) => !open)}
                    className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                  >
                    <span className="text-sm font-medium">选择模型</span>
                    <span className={`transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                )}
              </div>
              {hasModelOptions && modelDropdownOpen && (
                <div className="absolute z-20 mt-2 right-0 w-full max-h-[33vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                  {availableModels.map((model) => {
                    const isActive = formData.aiModel === model;
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => handleSelectModel(model)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {model}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {hasModelOptions && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                已获取 {availableModels.length} 个模型，可直接选择或手动输入。
              </p>
            )}
            {modelFetchError && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                模型列表加载失败：{modelFetchError}
              </p>
            )}
            {!hasModelOptions && modelFetchSupported && !modelFetchError && !isFetchingModels && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                输入 API 地址与 Key 后可刷新获取可用模型列表。
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              最大推荐标签数
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.maxSuggestedTags}
              onChange={(e) => setFormData({ ...formData, maxSuggestedTags: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !formData.apiKey}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
            >
              {isTesting ? '测试中...' : '测试连接'}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                自定义 Prompt
              </label>
              <button
                onClick={() => setFormData({ ...formData, enableCustomPrompt: !formData.enableCustomPrompt })}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  formData.enableCustomPrompt
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {formData.enableCustomPrompt ? '已启用' : '已禁用'}
              </button>
            </div>

            {formData.enableCustomPrompt && (
              <div className="space-y-3">
                <textarea
                  value={formData.customPrompt}
                  onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  placeholder="自定义 AI 提示词..."
                />

                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                    💡 专业示例 Prompt：
                  </p>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
{DEFAULT_PROMPT_TEMPLATE}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        setFormData({ ...formData, customPrompt: DEFAULT_PROMPT_TEMPLATE });
                      }}
                      className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors duration-200"
                    >
                      使用此示例
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(DEFAULT_PROMPT_TEMPLATE).then(() => {
                          setSuccessMessage('示例 Prompt 已复制到剪贴板');
                          setTimeout(() => setSuccessMessage(null), 2000);
                        });
                      }}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                    >
                      复制示例
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, enableCustomPrompt: !formData.enableCustomPrompt })}
                      className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                    >
                      {formData.enableCustomPrompt ? '禁用' : '启用'}自定义
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
