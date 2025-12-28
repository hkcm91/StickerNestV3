/**
 * StickerNest v2 - AI Provider Factory
 * Creates and manages AI provider instances
 * Supports: Replicate, OpenAI, Anthropic, Google
 */

import type { AIProvider, ProviderConfig, TaskType } from './AIProvider';
import { AIProviderError } from './AIProvider';
import { ReplicateProvider } from './ReplicateProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GoogleProvider } from './GoogleProvider';
import { getModelRegistry } from './ModelRegistry';

export * from './AIProvider';
export * from './ModelRegistry';
export * from './ReplicateProvider';
export * from './OpenAIProvider';
export * from './AnthropicProvider';
export * from './GoogleProvider';

/** Cache of provider instances */
const providerCache = new Map<string, AIProvider>();

/**
 * Create an AI provider from configuration
 * @param config - Provider configuration
 * @returns AI provider instance
 */
export function createProvider(config: ProviderConfig): AIProvider {
  const cacheKey = `${config.provider}:${config.model}`;

  // Return cached instance if available
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  let provider: AIProvider;

  switch (config.provider) {
    case 'replicate':
      provider = new ReplicateProvider(config.model, config.apiToken);
      break;

    case 'openai':
      provider = new OpenAIProvider(config);
      break;

    case 'anthropic':
      provider = new AnthropicProvider(config);
      break;

    case 'google':
      provider = new GoogleProvider(config);
      break;

    case 'local':
      // Future: Local Ollama support
      throw new AIProviderError(
        'Local provider not yet implemented.',
        'local',
        'unknown'
      );

    default:
      throw new AIProviderError(
        `Unknown provider: ${config.provider}`,
        config.provider,
        'unknown'
      );
  }

  // Cache the instance
  providerCache.set(cacheKey, provider);

  return provider;
}

/**
 * Get the optimal provider for a specific task
 * @param task - Task type (widget, modify, pipeline, security, chat)
 * @returns AI provider configured for the task
 */
export function getProviderForTask(task: TaskType): AIProvider {
  const registry = getModelRegistry();
  const modelId = registry.getModelForTask(task);
  const config = registry.getProviderConfig(modelId);

  if (!config) {
    // Fall back to default
    return createProvider({
      provider: 'replicate',
      model: 'meta/meta-llama-3.1-70b-instruct',
    });
  }

  return createProvider(config);
}

/**
 * Create a provider for a specific model preset
 * @param presetId - Preset ID (default, fast, quality, code)
 * @returns AI provider for the preset
 */
export function getProviderByPreset(presetId: string): AIProvider {
  const registry = getModelRegistry();
  const config = registry.getProviderConfig(presetId);

  if (!config) {
    throw new AIProviderError(
      `Unknown preset: ${presetId}`,
      'factory',
      'unknown'
    );
  }

  return createProvider(config);
}

/**
 * Clear the provider cache
 * Useful for when API tokens change or for testing
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * Check if any AI provider is available
 * @returns Promise resolving to availability status
 */
export async function isAIAvailable(): Promise<boolean> {
  try {
    const provider = getProviderForTask('chat');
    return await provider.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Get a list of all available models
 */
export function getAvailableModels(): Array<{
  id: string;
  displayName: string;
  isCustom: boolean;
  recommendedFor: TaskType[];
}> {
  const registry = getModelRegistry();
  const allModels = registry.getAllModels();

  return allModels.map(model => {
    const preset = registry.getPreset(model.id);
    return {
      ...model,
      recommendedFor: preset?.recommendedFor || [],
    };
  });
}

