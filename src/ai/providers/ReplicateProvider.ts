/**
 * StickerNest v2 - Replicate AI Provider
 * Implements AIProvider interface for Replicate's API
 * Supports multiple models through Replicate's unified interface
 */

import type {
  AIProvider,
  GenerationOptions,
  GenerationResult,
  StreamChunk,
  ModelCapabilities,
} from './AIProvider';
import { AIProviderError } from './AIProvider';
import { MODEL_PRESETS } from './ModelRegistry';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

/** Replicate prediction status */
interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  urls?: {
    get: string;
    cancel: string;
    stream?: string;
  };
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Replicate AI Provider implementation
 */
export class ReplicateProvider implements AIProvider {
  readonly id = 'replicate';
  readonly name = 'Replicate';
  readonly model: string;

  private apiToken: string;
  private abortController: AbortController | null = null;
  private capabilities: ModelCapabilities;

  constructor(model: string, apiToken?: string) {
    this.model = model;
    this.apiToken = apiToken || this.getApiToken();
    this.capabilities = this.resolveCapabilities();
  }

  /**
   * Get API token from environment
   */
  private getApiToken(): string {
    // Try Vite env first
    const viteToken = (import.meta as any).env?.VITE_REPLICATE_API_TOKEN;
    if (viteToken) return viteToken;

    // Try process.env (for SSR/API routes)
    if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
      const proc = (globalThis as { process?: { env?: Record<string, string> } }).process;
      if (proc?.env?.VITE_REPLICATE_API_TOKEN) {
        return proc.env.VITE_REPLICATE_API_TOKEN;
      }
    }

    return '';
  }

  /**
   * Resolve model capabilities from presets or defaults
   */
  private resolveCapabilities(): ModelCapabilities {
    // Check if this model matches a preset
    for (const preset of Object.values(MODEL_PRESETS)) {
      if (preset.model === this.model) {
        return preset.capabilities;
      }
    }

    // Default capabilities for unknown models
    return {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    };
  }

  /**
   * Generate text using Replicate API via local proxy (to avoid CORS)
   */
  async generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    try {
      // Call our local API proxy to avoid CORS issues
      const response = await fetch('/api/replicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: this.model,
          max_tokens: options?.maxTokens || 4000,
          temperature: options?.temperature || 0.7,
          system_prompt: options?.systemPrompt,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new AIProviderError(
          `API proxy error: ${errorData.error || errorData.details || response.statusText}`,
          this.id,
          response.status === 401 ? 'auth' :
            response.status === 429 ? 'rate_limit' : 'unknown'
        );
      }

      const result = await response.json();
      const durationMs = Date.now() - startTime;

      // Process output
      let content = '';
      if (result.output) {
        content = Array.isArray(result.output) ? result.output.join('') : result.output;
      }

      return {
        content,
        model: this.model,
        durationMs,
        finishReason: 'stop',
        usage: {
          promptTokens: 0, // Replicate doesn't provide token counts
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AIProviderError('Generation aborted', this.id, 'unknown');
        }
        throw new AIProviderError(error.message, this.id, 'network', error);
      }

      throw new AIProviderError('Unknown error during generation', this.id, 'unknown', error);
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Stream generation using Replicate's streaming API
   */
  /**
   * Stream generation using Replicate's streaming API
   * Note: Since we're running in a browser environment, we must use the local proxy to avoid CORS.
   * The current proxy implementation buffers the response, so this will yield the full result at once.
   * TODO: Update proxy to support true SSE streaming.
   */
  async *streamGenerate(prompt: string, options?: GenerationOptions): AsyncIterable<StreamChunk> {
    // Use the generate method which uses the proxy
    try {
      const result = await this.generate(prompt, options);

      yield {
        content: result.content,
        done: true,
        accumulated: result.content,
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error during generation',
        this.id,
        'unknown',
        error
      );
    }
  }

  /**
   * Stream from SSE endpoint
   */
  private async *streamFromUrl(streamUrl: string): AsyncIterable<StreamChunk> {
    const response = await fetch(streamUrl, {
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Accept': 'text/event-stream',
      },
      signal: this.abortController?.signal,
    });

    if (!response.ok || !response.body) {
      throw new AIProviderError(
        'Failed to connect to stream',
        this.id,
        'network'
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield { content: '', done: true, accumulated };
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true, accumulated };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.output || parsed.text || data;
              accumulated += content;
              yield { content, done: false, accumulated };
            } catch {
              // Plain text data
              accumulated += data;
              yield { content: data, done: false, accumulated };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get model capabilities
   */
  getCapabilities(): ModelCapabilities {
    return this.capabilities;
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    return !!this.apiToken;
  }

  /**
   * Abort current generation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Poll for prediction result
   */
  private async pollForResult(url: string, maxAttempts = 60): Promise<ReplicatePrediction> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(1000);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
        },
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new AIProviderError(
          `Failed to get prediction status: ${response.status}`,
          this.id,
          'unknown'
        );
      }

      const prediction: ReplicatePrediction = await response.json();

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw new AIProviderError(
          `Prediction failed: ${prediction.error || 'Unknown error'}`,
          this.id,
          'unknown',
          prediction.error
        );
      }

      if (prediction.status === 'canceled') {
        throw new AIProviderError('Prediction was canceled', this.id, 'unknown');
      }
    }

    throw new AIProviderError('Prediction timed out', this.id, 'timeout');
  }

  /**
   * Extract version ID from model string
   */
  private extractVersion(): string {
    // Format: "owner/model:version" or "owner/model"
    const parts = this.model.split(':');
    if (parts.length > 1) {
      return parts[1];
    }

    // For models without explicit version, use a placeholder
    // The actual version resolution happens on Replicate's side
    return 'latest';
  }

  /**
   * Build model-specific input parameters
   */
  private buildInput(prompt: string, options?: GenerationOptions): Record<string, any> {
    const input: Record<string, any> = {
      prompt,
    };

    // Common parameters
    if (options?.maxTokens) {
      input.max_tokens = options.maxTokens;
      input.max_new_tokens = options.maxTokens; // Some models use this
    }

    if (options?.temperature !== undefined) {
      input.temperature = options.temperature;
    }

    if (options?.topP !== undefined) {
      input.top_p = options.topP;
    }

    // Model-specific adjustments
    if (this.model.includes('llama')) {
      input.max_length = options?.maxTokens || 4096;
    }

    if (this.model.includes('claude')) {
      input.max_tokens_to_sample = options?.maxTokens || 8000;
    }

    if (this.model.includes('gemini')) {
      input.max_output_tokens = options?.maxTokens || 6000;
    }

    return input;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

