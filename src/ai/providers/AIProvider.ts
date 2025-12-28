/**
 * StickerNest v2 - AI Provider Interface
 * Model-agnostic interface for LLM providers
 * Supports multiple backends: Replicate, OpenAI, Anthropic, Local
 */

/** Options for text generation */
export interface GenerationOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for sampling (0-1) */
  temperature?: number;
  /** System prompt for context */
  systemPrompt?: string;
  /** Stop sequences to halt generation */
  stopSequences?: string[];
  /** Top-p sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
}

/** Model capabilities and metadata */
export interface ModelCapabilities {
  /** Maximum context window in tokens */
  maxContextLength: number;
  /** Whether the model supports streaming responses */
  supportsStreaming: boolean;
  /** Whether the model supports system prompts */
  supportsSystemPrompt: boolean;
  /** Whether the model is optimized for code generation */
  codeOptimized: boolean;
  /** Approximate cost per 1K tokens (input) */
  costPer1kInput?: number;
  /** Approximate cost per 1K tokens (output) */
  costPer1kOutput?: number;
  /** Model description */
  description?: string;
}

/** Generation result with metadata */
export interface GenerationResult {
  /** Generated text content */
  content: string;
  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Time taken in milliseconds */
  durationMs?: number;
  /** Model used for generation */
  model: string;
  /** Whether generation completed or was cut off */
  finishReason: 'stop' | 'length' | 'error';
}

/** Streaming chunk for real-time responses */
export interface StreamChunk {
  /** Text content of this chunk */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Accumulated content so far */
  accumulated?: string;
}

/**
 * Abstract AI Provider interface
 * Implement this for each LLM backend
 */
export interface AIProvider {
  /** Unique provider identifier */
  readonly id: string;
  
  /** Human-readable provider name */
  readonly name: string;
  
  /** Model identifier being used */
  readonly model: string;

  /**
   * Generate text completion
   * @param prompt - The input prompt
   * @param options - Generation options
   * @returns Promise resolving to generation result
   */
  generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;

  /**
   * Stream text completion (optional)
   * @param prompt - The input prompt
   * @param options - Generation options
   * @returns Async iterable of stream chunks
   */
  streamGenerate?(prompt: string, options?: GenerationOptions): AsyncIterable<StreamChunk>;

  /**
   * Get model capabilities
   * @returns Model capabilities and metadata
   */
  getCapabilities(): ModelCapabilities;

  /**
   * Check if provider is available and configured
   * @returns Promise resolving to availability status
   */
  isAvailable(): Promise<boolean>;

  /**
   * Abort any in-progress generation
   */
  abort?(): void;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider type */
  provider: 'replicate' | 'openai' | 'anthropic' | 'google' | 'local';
  /** Model identifier */
  model: string;
  /** API token (optional if using env vars) */
  apiToken?: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Default generation options */
  defaultOptions?: GenerationOptions;
}

/**
 * Task-specific model presets
 */
export type TaskType = 'widget' | 'modify' | 'pipeline' | 'security' | 'chat';

/**
 * Error thrown by AI providers
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: 'auth' | 'rate_limit' | 'timeout' | 'invalid_response' | 'network' | 'unknown',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

