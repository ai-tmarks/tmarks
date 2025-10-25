import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { db } from '@/lib/db';
import type { AIProvider, AIConnectionInfo } from '@/types';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { DEFAULT_PROMPT_TEMPLATE } from '@/lib/constants/prompts';
import { AIConfigSection } from './components/AIConfigSection';
import { TMarksConfigSection } from './components/TMarksConfigSection';
import { PreferencesSection } from './components/PreferencesSection';
import { CacheStatusSection } from './components/CacheStatusSection';
import { canFetchModels, fetchAvailableModels } from '@/lib/services/ai-models';

export function Options() {
  const { config, loadConfig, saveConfig, syncCache, error, successMessage, isLoading, setError, setSuccessMessage } = useAppStore();

  const [formData, setFormData] = useState({
    aiProvider: 'openai' as AIProvider,
    apiKey: '',
    apiUrl: '',
    aiModel: '',
    bookmarkApiUrl: '',
    bookmarkApiKey: '',
    enableCustomPrompt: false,
    customPrompt: DEFAULT_PROMPT_TEMPLATE,
    maxSuggestedTags: 5,
    defaultVisibility: 'public' as 'public' | 'private'
  });

  const [stats, setStats] = useState({
    tags: 0,
    bookmarks: 0,
    lastSync: 0
  });

  const [isTesting, setIsTesting] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [modelFetchNonce, setModelFetchNonce] = useState(0);
  const lastModelFetchSignature = useRef<string | null>(null);
  const [savedConnections, setSavedConnections] = useState<Partial<Record<AIProvider, AIConnectionInfo[]>>>({});
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const MAX_SAVED_CONNECTIONS = 10;
  const generateConnectionId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const normalizeSavedConnections = (input?: Partial<Record<AIProvider, AIConnectionInfo[]>>) => {
    const normalized: Partial<Record<AIProvider, AIConnectionInfo[]>> = {};

    if (!input) {
      return normalized;
    }

    (Object.keys(input) as AIProvider[]).forEach(provider => {
      const list = input[provider] || [];
      normalized[provider] = Array.isArray(list)
        ? list.slice(0, MAX_SAVED_CONNECTIONS).map(item => ({
            ...item,
            provider: item.provider || provider,
            id: item.id || generateConnectionId()
          }))
        : [];
    });

    return normalized;
  };

  const upsertSavedConnection = (
    existing: Partial<Record<AIProvider, AIConnectionInfo[]>>,
    provider: AIProvider,
    connection: AIConnectionInfo
  ): Partial<Record<AIProvider, AIConnectionInfo[]>> => {
    const list = existing[provider] || [];
    const normalizedUrl = (connection.apiUrl || '').trim();
    const normalizedKey = (connection.apiKey || '').trim();
    const normalizedModel = (connection.model || '').trim();

    const newEntry: AIConnectionInfo = {
      ...connection,
      apiUrl: normalizedUrl || undefined,
      apiKey: normalizedKey || undefined,
      model: normalizedModel || undefined,
      provider,
      label: connection.label?.trim() || connection.label,
      lastUsedAt: Date.now(),
      id: connection.id || generateConnectionId()
    };

    const hasId = Boolean(connection.id);
    const existingIndex = hasId ? list.findIndex(item => item.id && item.id === connection.id) : -1;
    let updatedList: AIConnectionInfo[];

    if (hasId && existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = newEntry;
    } else {
      updatedList = [newEntry, ...list].slice(0, MAX_SAVED_CONNECTIONS);
    }

    return {
      ...existing,
      [provider]: updatedList
    };
  };

  const handleSaveConnectionPreset = () => {
    const trimmedKey = formData.apiKey.trim();
    if (!trimmedKey) {
      setError('请先填写 API Key 再保存配置');
      return;
    }

    const defaultName = `配置 ${(savedConnections[formData.aiProvider]?.length || 0) + 1}`;
    setPresetLabel(defaultName);
    setPresetError(null);
    setIsPresetModalOpen(true);
  };

  const handleConfirmSaveConnectionPreset = async () => {
    const trimmedKey = formData.apiKey.trim();
    if (!trimmedKey) {
      setPresetError('请先填写 API Key 再保存配置');
      return;
    }

    const trimmedLabel = presetLabel.trim();
    if (!trimmedLabel) {
      setPresetError('配置名称不能为空');
      return;
    }

    if (!config) {
      setError('配置尚未加载，稍后再试');
      setIsPresetModalOpen(false);
      return;
    }

    setIsSavingPreset(true);
    setPresetError(null);

    const connection: AIConnectionInfo = {
      apiUrl: formData.apiUrl,
      apiKey: trimmedKey,
      model: formData.aiModel,
      label: trimmedLabel,
      provider: formData.aiProvider
    };

    const previous = savedConnections;
    const updated = upsertSavedConnection(previous, formData.aiProvider, connection);
    setSavedConnections(updated);

    try {
      await saveConfig({
        aiConfig: {
          ...config.aiConfig,
          savedConnections: updated
        }
      });
      setSuccessMessage(`已保存为「${trimmedLabel}」`);
      setTimeout(() => setSuccessMessage(null), 2000);
      setIsPresetModalOpen(false);
    } catch (err) {
      setSavedConnections(previous);
      setPresetError(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleClosePresetModal = () => {
    if (isSavingPreset) {
      return;
    }
    setIsPresetModalOpen(false);
    setPresetError(null);
  };

  const removeSavedConnection = (
    existing: Partial<Record<AIProvider, AIConnectionInfo[]>>,
    provider: AIProvider,
    target: AIConnectionInfo
  ): Partial<Record<AIProvider, AIConnectionInfo[]>> => {
    const list = existing[provider] || [];
    const normalizedUrl = (target.apiUrl || '').trim();
    const normalizedKey = (target.apiKey || '').trim();
    const normalizedModel = (target.model || '').trim();
    const filtered = list.filter(item => {
      if (target.id && item.id) {
        return item.id !== target.id;
      }

      return (
        (item.apiUrl || '').trim() !== normalizedUrl ||
        (item.apiKey || '').trim() !== normalizedKey ||
        (item.model || '').trim() !== normalizedModel
      );
    });

    const updated: Partial<Record<AIProvider, AIConnectionInfo[]>> = {
      ...existing
    };

    if (filtered.length > 0) {
      updated[provider] = filtered;
    } else {
      delete updated[provider];
    }

    return updated;
  };

  // Load config and stats on mount
  useEffect(() => {
    const init = async () => {
      await loadConfig();
      const dbStats = await db.getStats();
      setStats(dbStats);
    };

    init();
  }, []);

  // Update form when config loads
  useEffect(() => {
    if (config) {
      const currentProvider = config.aiConfig.provider;
      const currentApiKey = config.aiConfig.apiKeys[currentProvider] || '';
      const currentApiUrl = config.aiConfig.apiUrls?.[currentProvider] || '';

      setFormData({
        aiProvider: currentProvider,
        apiKey: currentApiKey,
        apiUrl: currentApiUrl,
        aiModel: config.aiConfig.model || '',
        bookmarkApiUrl: config.bookmarkSite.apiUrl,
        bookmarkApiKey: config.bookmarkSite.apiKey,
        enableCustomPrompt: config.aiConfig.enableCustomPrompt || false,
        customPrompt: config.aiConfig.customPrompt || formData.customPrompt,
        maxSuggestedTags: config.preferences.maxSuggestedTags,
        defaultVisibility: config.preferences.defaultVisibility
      });
      const normalizedSaved = normalizeSavedConnections(config.aiConfig.savedConnections);
      setSavedConnections(normalizedSaved);
    }
  }, [config]);

  // Update API key and URL when provider changes
  const handleProviderChange = (newProvider: AIProvider) => {
    const newApiKey = config?.aiConfig.apiKeys[newProvider] || '';
    const newApiUrl = config?.aiConfig.apiUrls?.[newProvider] || '';
    setFormData({
      ...formData,
      aiProvider: newProvider,
      apiKey: newApiKey,
      apiUrl: newApiUrl
    });
    setAvailableModels([]);
    setModelFetchError(null);
    lastModelFetchSignature.current = null;
  };

  useEffect(() => {
    const supported = canFetchModels(formData.aiProvider, formData.apiUrl);
    const trimmedKey = formData.apiKey.trim();

    if (!supported || !trimmedKey) {
      setAvailableModels([]);
      setModelFetchError(null);
      setIsFetchingModels(false);
      lastModelFetchSignature.current = null;
      return;
    }

    const signature = `${formData.aiProvider}|${(formData.apiUrl || '').trim()}|${trimmedKey}|${modelFetchNonce}`;

    if (lastModelFetchSignature.current === signature) {
      return;
    }

    let cancelled = false;
    
    const fetchModels = async () => {
      setIsFetchingModels(true);
      setModelFetchError(null);

      try {
        const models = await fetchAvailableModels(formData.aiProvider, trimmedKey, formData.apiUrl);
        
        if (cancelled) return;
        
        setAvailableModels(models);
        setIsFetchingModels(false);
        setModelFetchError(null);
        lastModelFetchSignature.current = signature;
        
        // 只在没有选中模型时自动选择第一个
        setFormData(prev => {
          if (prev.aiModel) {
            return prev;
          }
          return {
            ...prev,
            aiModel: models[0] || ''
          };
        });
      } catch (error) {
        if (cancelled) return;
        
        setAvailableModels([]);
        setModelFetchError(error instanceof Error ? error.message : String(error));
        setIsFetchingModels(false);
        lastModelFetchSignature.current = signature;
      }
    };

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, [formData.aiProvider, formData.apiUrl, formData.apiKey, modelFetchNonce]);

  const refreshModelOptions = () => {
    if (!canFetchModels(formData.aiProvider, formData.apiUrl) || !formData.apiKey.trim()) {
      return;
    }
    lastModelFetchSignature.current = null;
    setModelFetchNonce(prev => prev + 1);
  };

  const handleSave = async () => {
    try {
      await saveConfig({
        aiConfig: {
          provider: formData.aiProvider,
          apiKeys: {
            ...config?.aiConfig.apiKeys,
            [formData.aiProvider]: formData.apiKey
          },
          apiUrls: {
            ...config?.aiConfig.apiUrls,
            [formData.aiProvider]: formData.apiUrl
          },
          model: formData.aiModel,
          enableCustomPrompt: formData.enableCustomPrompt,
          customPrompt: formData.customPrompt,
          savedConnections
        },
        bookmarkSite: {
          apiUrl: formData.bookmarkApiUrl,
          apiKey: formData.bookmarkApiKey
        },
        preferences: {
          theme: config?.preferences.theme || 'auto',
          autoSync: config?.preferences.autoSync ?? true,
          syncInterval: config?.preferences.syncInterval ?? 24,
          maxSuggestedTags: formData.maxSuggestedTags,
          defaultVisibility: formData.defaultVisibility
        }
      });

      setSuccessMessage('设置已保存!');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleSync = async () => {
    try {
      await syncCache();
      const dbStats = await db.getStats();
      setStats(dbStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    }
  };

  const handleTestAPI = async () => {
    try {
      setIsTesting(true);
      setError(null);

      // Import AI provider
      const { getAIProvider } = await import('@/lib/providers');
      const provider = getAIProvider(formData.aiProvider);

      // Create test request
      const testRequest = {
        page: {
          title: 'Claude Code - AI 编程助手',
          url: 'https://claude.ai',
          description: 'Claude 是一个强大的 AI 编程助手',
          content: 'Claude Code 是 Anthropic 推出的智能编程工具，支持多种编程语言和框架。'
        },
        context: {
          existingTags: ['开发工具', 'AI', '编程', '效率'],
          recentBookmarks: []
        },
        options: {
          maxTags: 3,
          preferExisting: true
        }
      };

      // Call AI API
      const response = await provider.generateTags(
        testRequest,
        formData.apiKey,
        formData.aiModel || undefined,
        formData.apiUrl || undefined,
        formData.enableCustomPrompt ? formData.customPrompt : undefined
      );

      setSuccessMessage(`API 测试成功！返回 ${response.suggestedTags.length} 个标签：${response.suggestedTags.map(t => t.name).join(', ')}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('API test failed:', err);
      setError(err instanceof Error ? err.message : 'API 测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '从未同步';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
      setFormData({
        aiProvider: 'openai' as AIProvider,
        apiKey: '',
        apiUrl: '',
        aiModel: '',
        bookmarkApiUrl: '',
        bookmarkApiKey: '',
        enableCustomPrompt: false,
        customPrompt: DEFAULT_PROMPT_TEMPLATE,
        maxSuggestedTags: 5,
        defaultVisibility: 'public'
      });
      setSuccessMessage('设置已重置');
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  const allSavedConnections = useMemo(() => {
    return Object.entries(savedConnections).flatMap(([provider, list]) =>
      (list || []).map(connection => ({
        ...connection,
        provider: connection.provider || (provider as AIProvider)
      }))
    );
  }, [savedConnections]);
  const modelFetchSupported = canFetchModels(formData.aiProvider, formData.apiUrl);

  const handleApplySavedConnection = (connection: AIConnectionInfo, providerOverride?: AIProvider) => {
    const targetProvider = providerOverride || connection.provider || formData.aiProvider;

    setFormData(prev => ({
      ...prev,
      aiProvider: targetProvider,
      apiUrl: connection.apiUrl || '',
      apiKey: connection.apiKey || '',
      aiModel: connection.model || ''
    }));

    if (targetProvider !== formData.aiProvider) {
      setAvailableModels([]);
      setModelFetchError(null);
      lastModelFetchSignature.current = null;
    }
  };

  const handleDeleteSavedConnection = async (connection: AIConnectionInfo, providerOverride?: AIProvider) => {
    const provider = providerOverride || connection.provider || formData.aiProvider;
    if (!provider) {
      setError('无法确定配置所属的 AI 引擎');
      return;
    }
    const previous = savedConnections;
    const updated = removeSavedConnection(previous, provider, connection);
    setSavedConnections(updated);

    try {
      if (!config) {
        throw new Error('配置尚未加载');
      }
      await saveConfig({
        aiConfig: {
          ...config.aiConfig,
          savedConnections: updated
        }
      });
      setSuccessMessage('已删除保存的连接');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Failed to delete saved connection:', err);
      setSavedConnections(previous);
      setError(err instanceof Error ? err.message : '删除连接失败');
    }
  };

  return (
    <>
      <div className="min-h-screen w-screen bg-gradient-to-br from-gray-100 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/90 shadow-sm backdrop-blur mb-10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-purple-500/20 dark:from-blue-500/25 dark:via-indigo-500/20 dark:to-purple-500/25" />
            <div className="relative p-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-sm font-medium text-blue-600 dark:text-blue-300">
                设置中心
              </div>
              <h1 className="mt-4 text-4xl font-bold text-gray-900 dark:text-white tracking-tight">个性化你的书签助理</h1>
              <p className="mt-3 max-w-2xl text-base text-gray-600 dark:text-gray-300">
                管理 AI 接入、同步策略与服务端配置，为你的工作流打造顺滑的知识收集体验。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/20">AI 标签</span>
                <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/20">多端同步</span>
                <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/20">安全配置</span>
              </div>
            </div>
          </div>

          <div className="mb-10 space-y-4">
            {error && (
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            )}
            {successMessage && <SuccessMessage message={successMessage} />}
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-8">
              <AIConfigSection
                formData={formData}
                setFormData={setFormData}
                handleProviderChange={handleProviderChange}
                setSuccessMessage={setSuccessMessage}
                handleTestConnection={handleTestAPI}
                isTesting={isTesting}
                availableModels={availableModels}
                isFetchingModels={isFetchingModels}
                modelFetchError={modelFetchError}
                onRefreshModels={refreshModelOptions}
                modelFetchSupported={modelFetchSupported}
                allSavedConnections={allSavedConnections}
                onApplySavedConnection={handleApplySavedConnection}
                onDeleteSavedConnection={handleDeleteSavedConnection}
                onSaveConnectionPreset={handleSaveConnectionPreset}
              />
            </div>

            <div className="lg:col-span-4 space-y-8">
					<div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/90 shadow-sm backdrop-blur transition-shadow hover:shadow-lg">
						<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 via-gray-500 to-gray-700" />
						<div className="p-6 pt-10 space-y-6">
							<div>
								<h3 className="text-xl font-semibold text-gray-900 dark:text-white">保存与同步</h3>
								<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
									保存当前配置或快速重置为默认状态。
								</p>
							</div>
							<div className="flex flex-col sm:flex-row gap-3">
								<button
									onClick={handleReset}
									className="flex-1 rounded-lg border border-gray-300/80 dark:border-gray-600/70 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								>
									重置设置
								</button>
								<button
									onClick={handleSave}
									disabled={isLoading}
									className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
								>
									{isLoading ? '保存中...' : '保存设置'}
								</button>
							</div>
						</div>
					</div>

              <PreferencesSection
                formData={formData}
                setFormData={setFormData}
              />

              <TMarksConfigSection
                formData={formData}
                setFormData={setFormData}
              />

              <CacheStatusSection
                stats={stats}
                handleSync={handleSync}
                isLoading={isLoading}
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>
      </div>

      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-blue-500/20 bg-white/95 dark:bg-gray-900/95 shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="p-6 pt-10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">保存当前配置</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    为当前 AI 设置输入一个易记的名称。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClosePresetModal}
                  className="rounded-full border border-transparent px-3 py-1 text-xl leading-none text-gray-400 transition-colors hover:border-gray-200 hover:text-gray-600 dark:hover:border-gray-700 dark:hover:text-gray-300"
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  配置名称
                </label>
                <input
                  type="text"
                  value={presetLabel}
                  onChange={(e) => setPresetLabel(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：生产环境配置"
                />
              </div>

              {presetError && (
                <div className="rounded-lg border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                  {presetError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClosePresetModal}
                  disabled={isSavingPreset}
                  className="rounded-lg border border-gray-300/80 dark:border-gray-600/70 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveConnectionPreset}
                  disabled={isSavingPreset}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingPreset ? '保存中...' : '确认保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
