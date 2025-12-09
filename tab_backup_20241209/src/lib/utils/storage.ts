import type { StorageConfig, AIProvider, AIConnectionInfo } from '@/types';

const DEFAULT_CONFIG: StorageConfig = {
  aiConfig: {
    provider: 'openai',
    apiKeys: {},
    apiUrls: {},
    model: 'gpt-4o',
    enableCustomPrompt: false,
    customPrompt: undefined,
    savedConnections: {}
  },
  bookmarkSite: {
    apiUrl: '',
    apiKey: ''
  },
  preferences: {
    theme: 'auto',
    autoSync: true,
    syncInterval: 24,
    maxSuggestedTags: 5,
    defaultVisibility: 'public',
    enableAI: true,
    defaultIncludeThumbnail: true,
    defaultCreateSnapshot: false
  }
};

const cloneDefaultConfig = (): StorageConfig => ({
  aiConfig: {
    provider: DEFAULT_CONFIG.aiConfig.provider,
    apiKeys: { ...DEFAULT_CONFIG.aiConfig.apiKeys },
    apiUrls: { ...DEFAULT_CONFIG.aiConfig.apiUrls },
    model: DEFAULT_CONFIG.aiConfig.model,
    enableCustomPrompt: DEFAULT_CONFIG.aiConfig.enableCustomPrompt,
    customPrompt: DEFAULT_CONFIG.aiConfig.customPrompt,
    savedConnections: {}
  },
  bookmarkSite: { ...DEFAULT_CONFIG.bookmarkSite },
  preferences: { ...DEFAULT_CONFIG.preferences }
});

export class StorageService {
  private static STORAGE_KEY = 'config';
  private static configCache: StorageConfig | null = null;
  private static initialized = false;

  private static cloneSavedConnections(
    input?: Partial<Record<AIProvider, AIConnectionInfo[]>>
  ): Partial<Record<AIProvider, AIConnectionInfo[]>> {
    const result: Partial<Record<AIProvider, AIConnectionInfo[]>> = {};
    if (!input) {
      return result;
    }

    (Object.entries(input) as Array<[AIProvider, AIConnectionInfo[] | undefined]>).forEach(
      ([provider, list]) => {
        if (!Array.isArray(list)) {
          return;
        }
        result[provider] = list.map(item => ({ ...item }));
      }
    );

    return result;
  }

  private static mergeWithDefaults(config?: StorageConfig): StorageConfig {
    const defaults = cloneDefaultConfig();
    if (!config) {
      return defaults;
    }

    return {
      aiConfig: {
        provider: config.aiConfig?.provider || defaults.aiConfig.provider,
        apiKeys: {
          ...defaults.aiConfig.apiKeys,
          ...(config.aiConfig?.apiKeys || {})
        },
        apiUrls: {
          ...defaults.aiConfig.apiUrls,
          ...(config.aiConfig?.apiUrls || {})
        },
        model: config.aiConfig?.model ?? defaults.aiConfig.model,
        customPrompt: config.aiConfig?.customPrompt ?? defaults.aiConfig.customPrompt,
        enableCustomPrompt: config.aiConfig?.enableCustomPrompt ?? defaults.aiConfig.enableCustomPrompt,
        savedConnections: {
          ...(defaults.aiConfig.savedConnections || {}),
          ...(config.aiConfig?.savedConnections || {})
        }
      },
      bookmarkSite: {
        apiUrl: config.bookmarkSite?.apiUrl ?? defaults.bookmarkSite.apiUrl,
        apiKey: config.bookmarkSite?.apiKey ?? defaults.bookmarkSite.apiKey
      },
      preferences: {
        theme: config.preferences?.theme ?? defaults.preferences.theme,
        autoSync: config.preferences?.autoSync ?? defaults.preferences.autoSync,
        syncInterval: config.preferences?.syncInterval ?? defaults.preferences.syncInterval,
        maxSuggestedTags: config.preferences?.maxSuggestedTags ?? defaults.preferences.maxSuggestedTags,
        defaultVisibility: config.preferences?.defaultVisibility ?? defaults.preferences.defaultVisibility,
        enableAI: config.preferences?.enableAI ?? defaults.preferences.enableAI,
        defaultIncludeThumbnail: config.preferences?.defaultIncludeThumbnail ?? defaults.preferences.defaultIncludeThumbnail,
        defaultCreateSnapshot: config.preferences?.defaultCreateSnapshot ?? defaults.preferences.defaultCreateSnapshot
      }
    };
  }

  private static ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      const change = changes[this.STORAGE_KEY];
      if (!change) {
        return;
      }

      this.configCache = this.mergeWithDefaults(change.newValue as StorageConfig | undefined);
    });

    this.initialized = true;
  }

  /**
   * Load configuration from chrome.storage.local
   */
  static async loadConfig(): Promise<StorageConfig> {
    this.ensureInitialized();

    if (this.configCache) {
      return this.configCache;
    }

    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const config = this.mergeWithDefaults(result[this.STORAGE_KEY] as StorageConfig | undefined);
      this.configCache = config;
      return config;
    } catch (error) {
      const fallback = cloneDefaultConfig();
      this.configCache = fallback;
      return fallback;
    }
  }

  /**
   * Save configuration to chrome.storage.local
   */
  static async saveConfig(config: Partial<StorageConfig>): Promise<void> {
    try {
      const currentConfig = await this.loadConfig();
      const hasSavedConnectionsOverride = Boolean(
        config.aiConfig && Object.prototype.hasOwnProperty.call(config.aiConfig, 'savedConnections')
      );

      let nextSavedConnections: Partial<Record<AIProvider, AIConnectionInfo[]>>;
      if (hasSavedConnectionsOverride) {
        nextSavedConnections = this.cloneSavedConnections(config.aiConfig?.savedConnections);
      } else {
        nextSavedConnections = this.cloneSavedConnections({
          ...(currentConfig.aiConfig.savedConnections || {}),
          ...(config.aiConfig?.savedConnections || {})
        });
      }

      const { savedConnections: _ignoredSavedConnections, ...aiConfigUpdates } = config.aiConfig || {};
      const newConfig: StorageConfig = {
        ...currentConfig,
        ...config,
        aiConfig: {
          ...currentConfig.aiConfig,
          ...aiConfigUpdates,
          savedConnections: nextSavedConnections
        },
        bookmarkSite: {
          ...currentConfig.bookmarkSite,
          ...(config.bookmarkSite || {})
        },
        preferences: {
          ...currentConfig.preferences,
          ...(config.preferences || {})
        }
      };

      await chrome.storage.local.set({ [this.STORAGE_KEY]: newConfig });
      this.configCache = this.mergeWithDefaults(newConfig);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get AI API Key for the current provider
   */
  static async getAIApiKey(): Promise<string | undefined> {
    const config = await this.loadConfig();
    const provider = config.aiConfig.provider;
    return config.aiConfig.apiKeys[provider];
  }

  /**
   * Set AI API Key for a specific provider
   */
  static async setAIApiKey(provider: AIProvider, apiKey: string): Promise<void> {
    const config = await this.loadConfig();
    await this.saveConfig({
      aiConfig: {
        ...config.aiConfig,
        apiKeys: {
          ...config.aiConfig.apiKeys,
          [provider]: apiKey
        }
      }
    });
  }

  /**
   * Get bookmark site API key
   */
  static async getBookmarkSiteApiKey(): Promise<string> {
    const config = await this.loadConfig();
    return config.bookmarkSite.apiKey;
  }

  /**
   * Get bookmark site API URL
   */
  static async getBookmarkSiteApiUrl(): Promise<string> {
    const config = await this.loadConfig();
    return config.bookmarkSite.apiUrl;
  }

  /**
   * Get TMarks configuration (API URL and API Key)
   */
  static async getTMarksConfig(): Promise<{ bookmarkApiUrl: string; bookmarkApiKey: string }> {
    const config = await this.loadConfig();
    return {
      bookmarkApiUrl: config.bookmarkSite.apiUrl,
      bookmarkApiKey: config.bookmarkSite.apiKey
    };
  }

  /**
   * Clear all stored data
   */
  static async clear(): Promise<void> {
    await chrome.storage.local.clear();
    this.configCache = null;
  }
}
