import type { AIProvider as AIProviderType } from '@/types';
import { AIProvider } from './base';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { DeepSeekProvider } from './deepseek';
import { ZhipuProvider } from './zhipu';
import { ModelScopeProvider } from './modelscope';
import { SiliconFlowProvider } from './siliconflow';
import { IFlowProvider } from './iflow';
import { CustomProvider } from './custom';

// Provider registry
const providers = new Map<AIProviderType, AIProvider>([
  ['openai', new OpenAIProvider()],
  ['claude', new ClaudeProvider()],
  ['deepseek', new DeepSeekProvider()],
  ['zhipu', new ZhipuProvider()],
  ['modelscope', new ModelScopeProvider()],
  ['siliconflow', new SiliconFlowProvider()],
  ['iflow', new IFlowProvider()],
  ['custom', new CustomProvider()]
]);

/**
 * Get AI provider by name
 */
export function getAIProvider(providerName: AIProviderType): AIProvider {
  const provider = providers.get(providerName);
  if (!provider) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }
  return provider;
}

/**
 * Get all available providers
 */
export function getAllProviders(): AIProvider[] {
  return Array.from(providers.values());
}

export { AIProvider, OpenAIProvider, ClaudeProvider, DeepSeekProvider, ZhipuProvider, ModelScopeProvider, SiliconFlowProvider, IFlowProvider, CustomProvider };
