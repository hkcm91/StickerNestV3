/**
 * StickerNest v2 - Model Registry
 * Pre-configured models and custom model management
 * Supports: Replicate, OpenAI, Anthropic, Google
 */

import type { ProviderConfig, GenerationOptions, TaskType, ModelCapabilities } from './AIProvider';

/** Provider types */
export type ProviderType = 'replicate' | 'openai' | 'anthropic' | 'google';

/** Model preset configuration */
export interface ModelPreset {
  id: string;
  displayName: string;
  description: string;
  provider: ProviderConfig['provider'];
  model: string;
  defaultOptions: GenerationOptions;
  capabilities: ModelCapabilities;
  /** Recommended tasks for this model */
  recommendedFor: TaskType[];
}

/** Custom model added by user */
export interface CustomModel {
  id: string;
  displayName: string;
  provider: ProviderConfig['provider'];
  model: string;
  options: GenerationOptions;
  addedAt: number;
}

/**
 * Pre-configured model presets optimized for StickerNest tasks
 * All models verified to work on Replicate as of 2024
 */
export const MODEL_PRESETS: Record<string, ModelPreset> = {
  // ===== LLAMA 3.1 MODELS (Latest) =====
  'llama-3.1-405b': {
    id: 'llama-3.1-405b',
    displayName: '🏆 Llama 3.1 405B (Best Quality)',
    description: 'Largest and most capable Llama model - best for complex widgets',
    provider: 'replicate',
    model: 'meta/meta-llama-3.1-405b-instruct',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.5,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'llama-3.1-70b': {
    id: 'llama-3.1-70b',
    displayName: '⭐ Llama 3.1 70B (Recommended)',
    description: 'Best balance of quality and speed for widgets',
    provider: 'replicate',
    model: 'meta/meta-llama-3-70b-instruct',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'chat', 'modify'],
  },

  'llama-3.1-8b': {
    id: 'llama-3.1-8b',
    displayName: '⚡ Llama 3.1 8B (Fast)',
    description: 'Fastest Llama 3.1 - good for simple widgets',
    provider: 'replicate',
    model: 'meta/meta-llama-3-8b-instruct',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== LLAMA 3 MODELS =====
  'llama-3-70b': {
    id: 'llama-3-70b',
    displayName: 'Llama 3 70B',
    description: 'Stable Llama 3 model for reliable results',
    provider: 'replicate',
    model: 'meta/meta-llama-3-70b-instruct',
    defaultOptions: {
      maxTokens: 6000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'chat'],
  },

  'llama-3-8b': {
    id: 'llama-3-8b',
    displayName: 'Llama 3 8B',
    description: 'Fast Llama 3 for quick iterations',
    provider: 'replicate',
    model: 'meta/meta-llama-3-8b-instruct',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== LLAMA 2 MODELS (Stable/Legacy) =====
  'llama-2-70b': {
    id: 'llama-2-70b',
    displayName: 'Llama 2 70B (Stable)',
    description: 'Battle-tested Llama 2 model',
    provider: 'replicate',
    model: 'meta/llama-2-70b-chat',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 4096,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  'llama-2-13b': {
    id: 'llama-2-13b',
    displayName: 'Llama 2 13B',
    description: 'Smaller Llama 2 for testing',
    provider: 'replicate',
    model: 'meta/llama-2-13b-chat',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 4096,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== MISTRAL MODELS =====
  'mixtral-8x7b': {
    id: 'mixtral-8x7b',
    displayName: 'Mixtral 8x7B MoE',
    description: 'Mixture of Experts - efficient and capable',
    provider: 'replicate',
    model: 'mistralai/mixtral-8x7b-instruct-v0.1',
    defaultOptions: {
      maxTokens: 6000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 32000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'chat'],
  },

  'mistral-7b': {
    id: 'mistral-7b',
    displayName: 'Mistral 7B v0.2',
    description: 'Fast and efficient Mistral model',
    provider: 'replicate',
    model: 'mistralai/mistral-7b-instruct-v0.2',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== CODE-SPECIALIZED MODELS =====
  'codellama-70b': {
    id: 'codellama-70b',
    displayName: '💻 CodeLlama 70B',
    description: 'Specialized for code generation',
    provider: 'replicate',
    model: 'meta/codellama-70b-instruct',
    defaultOptions: {
      maxTokens: 6000,
      temperature: 0.4,
    },
    capabilities: {
      maxContextLength: 16000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify', 'security'],
  },

  'codellama-34b': {
    id: 'codellama-34b',
    displayName: '💻 CodeLlama 34B',
    description: 'Code-specialized, balanced size',
    provider: 'replicate',
    model: 'meta/codellama-34b-instruct',
    defaultOptions: {
      maxTokens: 6000,
      temperature: 0.4,
    },
    capabilities: {
      maxContextLength: 16000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify'],
  },

  'codellama-13b': {
    id: 'codellama-13b',
    displayName: '💻 CodeLlama 13B (Fast)',
    description: 'Fast code generation',
    provider: 'replicate',
    model: 'meta/codellama-13b-instruct',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.5,
    },
    capabilities: {
      maxContextLength: 16000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget'],
  },

  // ===== SNOWFLAKE / ARCTIC =====
  'snowflake-arctic': {
    id: 'snowflake-arctic',
    displayName: '❄️ Snowflake Arctic Instruct',
    description: 'Enterprise-grade, efficient model',
    provider: 'replicate',
    model: 'snowflake/snowflake-arctic-instruct',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 4096,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'chat'],
  },

  // ===== QWEN MODELS =====
  'qwen-2.5-72b': {
    id: 'qwen-2.5-72b',
    displayName: '🔮 Qwen 2.5 72B',
    description: 'Excellent instruction following and code',
    provider: 'replicate',
    model: 'qwen/qwen-2.5-72b-instruct',
    defaultOptions: {
      maxTokens: 6000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 32000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify'],
  },

  'qwen-2.5-coder-32b': {
    id: 'qwen-2.5-coder-32b',
    displayName: '💻 Qwen 2.5 Coder 32B',
    description: 'Specialized for code generation',
    provider: 'replicate',
    model: 'qwen/qwen-2.5-coder-32b-instruct',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.4,
    },
    capabilities: {
      maxContextLength: 32000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify', 'security'],
  },

  'qwen-2-72b': {
    id: 'qwen-2-72b',
    displayName: 'Qwen 2 72B',
    description: 'Previous gen Qwen model',
    provider: 'replicate',
    model: 'qwen/qwen-2-72b-instruct',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 32000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['chat', 'widget'],
  },

  // ===== DEEPSEEK MODELS =====
  'deepseek-v3': {
    id: 'deepseek-v3',
    displayName: '🧠 DeepSeek V3',
    description: 'Latest DeepSeek - excellent reasoning',
    provider: 'replicate',
    model: 'deepseek-ai/deepseek-v3',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.5,
    },
    capabilities: {
      maxContextLength: 64000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'deepseek-r1': {
    id: 'deepseek-r1',
    displayName: '🧠 DeepSeek R1',
    description: 'Reasoning model with chain-of-thought',
    provider: 'replicate',
    model: 'deepseek-ai/deepseek-r1',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.5,
    },
    capabilities: {
      maxContextLength: 64000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  // ===== WIZARDLM / WIZARD CODER =====
  'wizardcoder-34b': {
    id: 'wizardcoder-34b',
    displayName: '🧙 WizardCoder 34B',
    description: 'Strong code generation model',
    provider: 'replicate',
    model: 'wizardlm/wizardcoder-34b-v1.0',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.4,
    },
    capabilities: {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify'],
  },

  // ===== PHIND =====
  'phind-codellama-34b': {
    id: 'phind-codellama-34b',
    displayName: '💻 Phind CodeLlama 34B',
    description: 'Fine-tuned for coding assistance',
    provider: 'replicate',
    model: 'phind/phind-codellama-34b-v2',
    defaultOptions: {
      maxTokens: 6000,
      temperature: 0.4,
    },
    capabilities: {
      maxContextLength: 16000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify'],
  },

  // ===== NOUS RESEARCH =====
  'nous-hermes-2-mixtral': {
    id: 'nous-hermes-2-mixtral',
    displayName: 'Nous Hermes 2 Mixtral',
    description: 'Fine-tuned Mixtral for instructions',
    provider: 'replicate',
    model: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 32000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== YI MODELS =====
  'yi-34b': {
    id: 'yi-34b',
    displayName: 'Yi 34B Chat',
    description: 'Strong multilingual model',
    provider: 'replicate',
    model: '01-ai/yi-34b-chat',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 4096,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== GEMMA =====
  'gemma-2-27b': {
    id: 'gemma-2-27b',
    displayName: '💎 Gemma 2 27B',
    description: 'Google open model - good quality',
    provider: 'replicate',
    model: 'google-deepmind/gemma-2-27b-it',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat', 'widget'],
  },

  'gemma-2-9b': {
    id: 'gemma-2-9b',
    displayName: '💎 Gemma 2 9B (Fast)',
    description: 'Google smaller model - fast',
    provider: 'replicate',
    model: 'google-deepmind/gemma-2-9b-it',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== DOLPHIN =====
  'dolphin-2.6-mixtral': {
    id: 'dolphin-2.6-mixtral',
    displayName: '🐬 Dolphin 2.6 Mixtral',
    description: 'Uncensored Mixtral fine-tune',
    provider: 'replicate',
    model: 'cognitivecomputations/dolphin-2.6-mixtral-8x7b',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 32000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    },
    recommendedFor: ['chat'],
  },

  // ===== STARCODER =====
  'starcoder2-15b': {
    id: 'starcoder2-15b',
    displayName: '⭐ StarCoder 2 15B',
    description: 'Code completion specialist',
    provider: 'replicate',
    model: 'bigcode/starcoder2-15b-instruct-v0.1',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.3,
    },
    capabilities: {
      maxContextLength: 16000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    },
    recommendedFor: ['widget', 'modify'],
  },

  // =========================================================
  // OPENAI MODELS (Requires OPENAI_API_KEY)
  // =========================================================

  'gpt-4o': {
    id: 'gpt-4o',
    displayName: '🟢 GPT-4o (Best)',
    description: 'Most capable GPT model - fast and smart',
    provider: 'openai',
    model: 'gpt-4o',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    displayName: '🟢 GPT-4o Mini (Fast)',
    description: 'Smaller, faster, cheaper GPT-4o',
    provider: 'openai',
    model: 'gpt-4o-mini',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
    },
    recommendedFor: ['chat', 'widget'],
  },

  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    displayName: '🟢 GPT-4 Turbo',
    description: 'Previous flagship model',
    provider: 'openai',
    model: 'gpt-4-turbo',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
    },
    recommendedFor: ['widget', 'modify'],
  },

  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    displayName: '🟢 GPT-3.5 Turbo',
    description: 'Fast and affordable',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 16385,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
      costPer1kInput: 0.0005,
      costPer1kOutput: 0.0015,
    },
    recommendedFor: ['chat'],
  },

  'o1': {
    id: 'o1',
    displayName: '🟢 o1 (Reasoning)',
    description: 'Best reasoning - takes time to think',
    provider: 'openai',
    model: 'o1',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 1, // o1 uses fixed temperature
    },
    capabilities: {
      maxContextLength: 200000,
      supportsStreaming: false,
      supportsSystemPrompt: false,
      codeOptimized: true,
      costPer1kInput: 0.015,
      costPer1kOutput: 0.06,
    },
    recommendedFor: ['widget', 'pipeline'],
  },

  'o1-mini': {
    id: 'o1-mini',
    displayName: '🟢 o1-mini (Fast Reasoning)',
    description: 'Faster reasoning model',
    provider: 'openai',
    model: 'o1-mini',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 1,
    },
    capabilities: {
      maxContextLength: 128000,
      supportsStreaming: false,
      supportsSystemPrompt: false,
      codeOptimized: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.012,
    },
    recommendedFor: ['widget', 'modify'],
  },

  // =========================================================
  // ANTHROPIC CLAUDE MODELS (Requires ANTHROPIC_API_KEY)
  // =========================================================

  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    displayName: '🟣 Claude Sonnet 4 (Best)',
    description: 'Latest Claude - excellent at code',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 200000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    displayName: '🟣 Claude 3.5 Sonnet',
    description: 'Great balance of quality and speed',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 200000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'claude-3.5-haiku': {
    id: 'claude-3.5-haiku',
    displayName: '🟣 Claude 3.5 Haiku (Fast)',
    description: 'Fastest Claude model',
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 200000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.0008,
      costPer1kOutput: 0.004,
    },
    recommendedFor: ['chat', 'widget'],
  },

  'claude-3-opus': {
    id: 'claude-3-opus',
    displayName: '🟣 Claude 3 Opus',
    description: 'Most powerful Claude 3',
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 200000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
    },
    recommendedFor: ['widget', 'pipeline'],
  },

  // =========================================================
  // GOOGLE GEMINI MODELS (Requires GOOGLE_API_KEY)
  // =========================================================

  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: '🔵 Gemini 2.0 Flash',
    description: 'Latest Gemini - very fast',
    provider: 'google',
    model: 'gemini-2.0-flash',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 1000000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.0,
      costPer1kOutput: 0.0,
    },
    recommendedFor: ['widget', 'chat'],
  },

  'gemini-2.0-flash-thinking': {
    id: 'gemini-2.0-flash-thinking',
    displayName: '🔵 Gemini 2.0 Flash Thinking',
    description: 'Reasoning model with thinking',
    provider: 'google',
    model: 'gemini-2.0-flash-thinking-exp',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 1000000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.0,
      costPer1kOutput: 0.0,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    displayName: '🔵 Gemini 1.5 Pro',
    description: 'Best Gemini for complex tasks',
    provider: 'google',
    model: 'gemini-1.5-pro',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.6,
    },
    capabilities: {
      maxContextLength: 2000000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.00125,
      costPer1kOutput: 0.005,
    },
    recommendedFor: ['widget', 'modify', 'pipeline'],
  },

  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    displayName: '🔵 Gemini 1.5 Flash',
    description: 'Fast and efficient',
    provider: 'google',
    model: 'gemini-1.5-flash',
    defaultOptions: {
      maxTokens: 8000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 1000000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
      costPer1kInput: 0.000075,
      costPer1kOutput: 0.0003,
    },
    recommendedFor: ['chat', 'widget'],
  },

  'gemini-1.5-flash-8b': {
    id: 'gemini-1.5-flash-8b',
    displayName: '🔵 Gemini 1.5 Flash 8B',
    description: 'Smallest and fastest Gemini',
    provider: 'google',
    model: 'gemini-1.5-flash-8b',
    defaultOptions: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    capabilities: {
      maxContextLength: 1000000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
      costPer1kInput: 0.0000375,
      costPer1kOutput: 0.00015,
    },
    recommendedFor: ['chat'],
  },
};

// Set default as the recommended model
MODEL_PRESETS['default'] = MODEL_PRESETS['llama-3.1-70b'];

/** Default model for each task type */
export const TASK_MODEL_DEFAULTS: Record<TaskType, string> = {
  widget: 'llama-3.1-70b',
  modify: 'llama-3.1-405b',
  pipeline: 'llama-3.1-405b',
  security: 'codellama-70b',
  chat: 'llama-3-8b',
};

/**
 * Fallback chains for each task type
 * If primary model fails, try next in chain
 */
export const TASK_FALLBACK_CHAINS: Record<TaskType, string[]> = {
  widget: [
    'llama-3.1-70b',      // Primary: Replicate Llama 3.1
    'qwen-2.5-coder-32b', // Fallback 1: Qwen Coder
    'codellama-70b',      // Fallback 2: CodeLlama
    'llama-3.1-8b',       // Fallback 3: Fast Llama
  ],
  modify: [
    'llama-3.1-405b',     // Primary: Best quality
    'llama-3.1-70b',      // Fallback 1: Good quality
    'qwen-2.5-72b',       // Fallback 2: Qwen
    'codellama-70b',      // Fallback 3: CodeLlama
  ],
  pipeline: [
    'llama-3.1-405b',     // Primary: Best reasoning
    'llama-3.1-70b',      // Fallback 1
    'qwen-2.5-72b',       // Fallback 2
    'mixtral-8x7b',       // Fallback 3
  ],
  security: [
    'codellama-70b',      // Primary: Code-focused
    'qwen-2.5-coder-32b', // Fallback 1: Coder
    'llama-3.1-70b',      // Fallback 2: General
    'codellama-34b',      // Fallback 3: Smaller CodeLlama
  ],
  chat: [
    'llama-3-8b',         // Primary: Fast
    'llama-3.1-8b',       // Fallback 1
    'mistral-7b',         // Fallback 2
    'llama-2-7b',         // Fallback 3
  ],
};

/**
 * Provider priority order for multi-provider setups
 * Used when checking availability across providers
 */
export const PROVIDER_PRIORITY: ProviderType[] = [
  'replicate',   // Primary: Most models available
  'openai',      // Fallback 1: GPT models
  'anthropic',   // Fallback 2: Claude models
  'google',      // Fallback 3: Gemini models
];

/** Local storage key for custom models */
const CUSTOM_MODELS_KEY = 'stickernest:custom-models';

/** Local storage key for model preferences */
const MODEL_PREFERENCES_KEY = 'stickernest:model-preferences';

/**
 * Model Registry - manages presets and custom models
 */
export class ModelRegistry {
  private customModels: Map<string, CustomModel> = new Map();
  private taskPreferences: Map<TaskType, string> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get all available presets
   */
  getPresets(): ModelPreset[] {
    return Object.values(MODEL_PRESETS).filter(p => p.id !== 'default');
  }

  /**
   * Get presets sorted by recommendation
   */
  getPresetsSorted(): ModelPreset[] {
    const order = [
      'llama-3.1-405b',
      'llama-3.1-70b',
      'codellama-70b',
      'mixtral-8x7b',
      'llama-3.1-8b',
      'llama-3-70b',
      'codellama-34b',
      'mistral-7b',
    ];

    return this.getPresets().sort((a, b) => {
      const aIdx = order.indexOf(a.id);
      const bIdx = order.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }

  /**
   * Get a specific preset by ID
   */
  getPreset(id: string): ModelPreset | undefined {
    return MODEL_PRESETS[id];
  }

  /**
   * Get all custom models
   */
  getCustomModels(): CustomModel[] {
    return Array.from(this.customModels.values());
  }

  /**
   * Add a custom model
   */
  addCustomModel(model: Omit<CustomModel, 'id' | 'addedAt'>): CustomModel {
    const id = `custom-${Date.now()}`;
    const customModel: CustomModel = {
      ...model,
      id,
      addedAt: Date.now(),
    };
    this.customModels.set(id, customModel);
    this.saveToStorage();
    return customModel;
  }

  /**
   * Remove a custom model
   */
  removeCustomModel(id: string): boolean {
    const removed = this.customModels.delete(id);
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  /**
   * Get the preferred model for a task
   */
  getModelForTask(task: TaskType): string {
    return this.taskPreferences.get(task) || TASK_MODEL_DEFAULTS[task];
  }

  /**
   * Set the preferred model for a task
   */
  setModelForTask(task: TaskType, modelId: string): void {
    this.taskPreferences.set(task, modelId);
    this.saveToStorage();
  }

  /**
   * Get provider config for a model ID
   */
  getProviderConfig(modelId: string): ProviderConfig | null {
    // Check presets first
    const preset = MODEL_PRESETS[modelId];
    if (preset) {
      return {
        provider: preset.provider,
        model: preset.model,
        defaultOptions: preset.defaultOptions,
      };
    }

    // Check custom models
    const custom = this.customModels.get(modelId);
    if (custom) {
      return {
        provider: custom.provider,
        model: custom.model,
        defaultOptions: custom.options,
      };
    }

    return null;
  }

  /**
   * Get capabilities for a model
   */
  getCapabilities(modelId: string): ModelCapabilities | null {
    const preset = MODEL_PRESETS[modelId];
    if (preset) {
      return preset.capabilities;
    }

    // Custom models have unknown capabilities
    if (this.customModels.has(modelId)) {
      return {
        maxContextLength: 8000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: false,
      };
    }

    return null;
  }

  /**
   * Get all available models (presets + custom)
   */
  getAllModels(): Array<{ id: string; displayName: string; isCustom: boolean }> {
    const models: Array<{ id: string; displayName: string; isCustom: boolean }> = [];

    // Add presets (excluding 'default' alias)
    for (const preset of this.getPresetsSorted()) {
      models.push({
        id: preset.id,
        displayName: preset.displayName,
        isCustom: false,
      });
    }

    // Add custom models
    for (const custom of this.customModels.values()) {
      models.push({
        id: custom.id,
        displayName: custom.displayName,
        isCustom: true,
      });
    }

    return models;
  }

  /**
   * Get fallback chain for a task
   */
  getFallbackChain(task: TaskType): string[] {
    return TASK_FALLBACK_CHAINS[task] || [TASK_MODEL_DEFAULTS[task]];
  }

  /**
   * Get the next fallback model for a task after a failure
   */
  getNextFallback(task: TaskType, failedModelId: string): string | null {
    const chain = this.getFallbackChain(task);
    const failedIndex = chain.indexOf(failedModelId);

    if (failedIndex === -1 || failedIndex >= chain.length - 1) {
      return null;
    }

    return chain[failedIndex + 1];
  }

  /**
   * Get all models recommended for a specific task
   */
  getModelsForTask(task: TaskType): ModelPreset[] {
    return Object.values(MODEL_PRESETS)
      .filter(preset =>
        preset.id !== 'default' &&
        preset.recommendedFor.includes(task)
      )
      .sort((a, b) => {
        // Sort by position in fallback chain
        const chainA = TASK_FALLBACK_CHAINS[task].indexOf(a.id);
        const chainB = TASK_FALLBACK_CHAINS[task].indexOf(b.id);
        if (chainA !== -1 && chainB !== -1) return chainA - chainB;
        if (chainA !== -1) return -1;
        if (chainB !== -1) return 1;
        return 0;
      });
  }

  /**
   * Get models by provider type
   */
  getModelsByProvider(provider: ProviderType): ModelPreset[] {
    return Object.values(MODEL_PRESETS)
      .filter(preset => preset.id !== 'default' && preset.provider === provider);
  }

  /**
   * Get provider config with fallback chain support
   * Returns configs for primary + fallback models
   */
  getProviderConfigsForTask(task: TaskType): ProviderConfig[] {
    const chain = this.getFallbackChain(task);
    const configs: ProviderConfig[] = [];

    for (const modelId of chain) {
      const config = this.getProviderConfig(modelId);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * Load state from localStorage
   */
  private loadFromStorage(): void {
    try {
      // Load custom models
      const customJson = localStorage.getItem(CUSTOM_MODELS_KEY);
      if (customJson) {
        const models = JSON.parse(customJson) as CustomModel[];
        for (const model of models) {
          this.customModels.set(model.id, model);
        }
      }

      // Load preferences
      const prefsJson = localStorage.getItem(MODEL_PREFERENCES_KEY);
      if (prefsJson) {
        const prefs = JSON.parse(prefsJson) as Record<TaskType, string>;
        for (const [task, modelId] of Object.entries(prefs)) {
          this.taskPreferences.set(task as TaskType, modelId);
        }
      }
    } catch (error) {
      console.warn('[ModelRegistry] Failed to load from storage:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveToStorage(): void {
    try {
      // Save custom models
      const models = Array.from(this.customModels.values());
      localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));

      // Save preferences
      const prefs: Record<string, string> = {};
      for (const [task, modelId] of this.taskPreferences.entries()) {
        prefs[task] = modelId;
      }
      localStorage.setItem(MODEL_PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.warn('[ModelRegistry] Failed to save to storage:', error);
    }
  }
}

/** Singleton instance */
let registryInstance: ModelRegistry | null = null;

/**
 * Get the model registry singleton
 */
export function getModelRegistry(): ModelRegistry {
  if (!registryInstance) {
    registryInstance = new ModelRegistry();
  }
  return registryInstance;
}
