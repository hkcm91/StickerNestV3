/**
 * StickerNest v2 - API Settings Store
 * Zustand store for managing AI API keys and provider settings
 * Supports multiple providers: Replicate, OpenAI, Stability AI, etc.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// Types
// ============================================

/** Supported AI providers */
export type AIProvider =
  | 'replicate'
  | 'openai'
  | 'stability'
  | 'runway'
  | 'fal'
  | 'custom';

/** API key configuration for a provider */
export interface APIKeyConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  isValid?: boolean;
  lastValidated?: number;
  name?: string; // Display name for custom providers
}

/** Model configuration */
export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  type: 'image' | 'video' | 'audio' | 'lora';
  modelId: string; // Provider-specific model ID
  description?: string;
  isDefault?: boolean;
  settings?: Record<string, unknown>;
}

/** Generation defaults */
export interface GenerationDefaults {
  image: {
    width: number;
    height: number;
    numOutputs: number;
    guidanceScale: number;
    numInferenceSteps: number;
  };
  video: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    numFrames: number;
  };
}

/** Store state */
interface ApiSettingsState {
  /** API keys by provider */
  apiKeys: Record<string, APIKeyConfig>;
  /** Default provider for each type */
  defaultProviders: {
    image: AIProvider;
    video: AIProvider;
    audio: AIProvider;
    lora: AIProvider;
  };
  /** Custom models */
  customModels: ModelConfig[];
  /** Generation defaults */
  defaults: GenerationDefaults;
  /** Whether to save outputs automatically */
  autoSaveToGallery: boolean;
  /** Output directory preference */
  outputDirectory: string;
}

interface ApiSettingsActions {
  /** Set API key for a provider */
  setApiKey: (provider: AIProvider, apiKey: string, options?: { baseUrl?: string; name?: string }) => void;
  /** Remove API key for a provider */
  removeApiKey: (provider: AIProvider) => void;
  /** Get API key for a provider */
  getApiKey: (provider: AIProvider) => string | null;
  /** Check if provider has valid API key */
  hasApiKey: (provider: AIProvider) => boolean;
  /** Set default provider for a type */
  setDefaultProvider: (type: 'image' | 'video' | 'audio' | 'lora', provider: AIProvider) => void;
  /** Add custom model */
  addCustomModel: (model: Omit<ModelConfig, 'id'>) => ModelConfig;
  /** Remove custom model */
  removeCustomModel: (modelId: string) => void;
  /** Update generation defaults */
  updateDefaults: (type: 'image' | 'video', updates: Partial<GenerationDefaults['image'] | GenerationDefaults['video']>) => void;
  /** Set auto-save preference */
  setAutoSaveToGallery: (enabled: boolean) => void;
  /** Set output directory */
  setOutputDirectory: (dir: string) => void;
  /** Get all configured providers */
  getConfiguredProviders: () => AIProvider[];
  /** Validate API key (async) */
  validateApiKey: (provider: AIProvider) => Promise<boolean>;
  /** Export settings */
  exportSettings: () => string;
  /** Import settings */
  importSettings: (json: string) => boolean;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_GENERATION_SETTINGS: GenerationDefaults = {
  image: {
    width: 1024,
    height: 1024,
    numOutputs: 1,
    guidanceScale: 7.5,
    numInferenceSteps: 30,
  },
  video: {
    width: 1024,
    height: 576,
    fps: 24,
    duration: 4,
    numFrames: 25,
  },
};

// ============================================
// Store Creation
// ============================================

export const useApiSettingsStore = create<ApiSettingsState & ApiSettingsActions>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKeys: {},
      defaultProviders: {
        image: 'replicate',
        video: 'replicate',
        audio: 'replicate',
        lora: 'replicate',
      },
      customModels: [],
      defaults: DEFAULT_GENERATION_SETTINGS,
      autoSaveToGallery: true,
      outputDirectory: 'downloads',

      // Actions
      setApiKey: (provider, apiKey, options = {}) => {
        set(state => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: {
              provider,
              apiKey,
              baseUrl: options.baseUrl,
              name: options.name,
              isValid: undefined,
              lastValidated: undefined,
            },
          },
        }));
      },

      removeApiKey: (provider) => {
        set(state => {
          const { [provider]: removed, ...rest } = state.apiKeys;
          return { apiKeys: rest };
        });
      },

      getApiKey: (provider) => {
        const config = get().apiKeys[provider];
        return config?.apiKey || null;
      },

      hasApiKey: (provider) => {
        const config = get().apiKeys[provider];
        return !!(config?.apiKey && config.apiKey.length > 0);
      },

      setDefaultProvider: (type, provider) => {
        set(state => ({
          defaultProviders: {
            ...state.defaultProviders,
            [type]: provider,
          },
        }));
      },

      addCustomModel: (modelData) => {
        const model: ModelConfig = {
          ...modelData,
          id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        };
        set(state => ({
          customModels: [...state.customModels, model],
        }));
        return model;
      },

      removeCustomModel: (modelId) => {
        set(state => ({
          customModels: state.customModels.filter(m => m.id !== modelId),
        }));
      },

      updateDefaults: (type, updates) => {
        set(state => ({
          defaults: {
            ...state.defaults,
            [type]: {
              ...state.defaults[type],
              ...updates,
            },
          },
        }));
      },

      setAutoSaveToGallery: (enabled) => {
        set({ autoSaveToGallery: enabled });
      },

      setOutputDirectory: (dir) => {
        set({ outputDirectory: dir });
      },

      getConfiguredProviders: () => {
        return Object.keys(get().apiKeys).filter(
          key => get().apiKeys[key]?.apiKey
        ) as AIProvider[];
      },

      validateApiKey: async (provider) => {
        const config = get().apiKeys[provider];
        if (!config?.apiKey) return false;

        try {
          // Provider-specific validation
          let isValid = false;

          switch (provider) {
            case 'replicate': {
              const response = await fetch('https://api.replicate.com/v1/account', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
              });
              isValid = response.ok;
              break;
            }
            case 'openai': {
              const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
              });
              isValid = response.ok;
              break;
            }
            case 'stability': {
              const response = await fetch('https://api.stability.ai/v1/user/account', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
              });
              isValid = response.ok;
              break;
            }
            case 'fal': {
              const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
                method: 'HEAD',
                headers: { 'Authorization': `Key ${config.apiKey}` },
              });
              isValid = response.status !== 401;
              break;
            }
            default:
              // For custom providers, assume valid if key exists
              isValid = true;
          }

          set(state => ({
            apiKeys: {
              ...state.apiKeys,
              [provider]: {
                ...state.apiKeys[provider],
                isValid,
                lastValidated: Date.now(),
              },
            },
          }));

          return isValid;
        } catch (error) {
          console.error(`[ApiSettings] Validation failed for ${provider}:`, error);
          return false;
        }
      },

      exportSettings: () => {
        const state = get();
        // Don't export actual API keys for security
        const exportData = {
          defaultProviders: state.defaultProviders,
          customModels: state.customModels,
          defaults: state.defaults,
          autoSaveToGallery: state.autoSaveToGallery,
          outputDirectory: state.outputDirectory,
          configuredProviders: Object.keys(state.apiKeys),
        };
        return JSON.stringify(exportData, null, 2);
      },

      importSettings: (json) => {
        try {
          const data = JSON.parse(json);
          set(state => ({
            defaultProviders: data.defaultProviders || state.defaultProviders,
            customModels: data.customModels || state.customModels,
            defaults: data.defaults || state.defaults,
            autoSaveToGallery: data.autoSaveToGallery ?? state.autoSaveToGallery,
            outputDirectory: data.outputDirectory || state.outputDirectory,
          }));
          return true;
        } catch (error) {
          console.error('[ApiSettings] Import failed:', error);
          return false;
        }
      },
    }),
    {
      name: 'stickernest-api-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        defaultProviders: state.defaultProviders,
        customModels: state.customModels,
        defaults: state.defaults,
        autoSaveToGallery: state.autoSaveToGallery,
        outputDirectory: state.outputDirectory,
      }),
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

/** Get API key for provider */
export const useApiKey = (provider: AIProvider) =>
  useApiSettingsStore(state => state.apiKeys[provider]?.apiKey);

/** Get default provider for type */
export const useDefaultProvider = (type: 'image' | 'video' | 'audio' | 'lora') =>
  useApiSettingsStore(state => state.defaultProviders[type]);

/** Get generation defaults */
export const useGenerationDefaults = () =>
  useApiSettingsStore(state => state.defaults);

/** Get configured providers */
export const useConfiguredProviders = () =>
  useApiSettingsStore(state => state.getConfiguredProviders());

/** Check if any API key is configured */
export const useHasAnyApiKey = () =>
  useApiSettingsStore(state => Object.keys(state.apiKeys).length > 0);

/** Get custom models for type */
export const useCustomModels = (type?: 'image' | 'video' | 'audio' | 'lora') =>
  useApiSettingsStore(state =>
    type ? state.customModels.filter(m => m.type === type) : state.customModels
  );

export default useApiSettingsStore;
