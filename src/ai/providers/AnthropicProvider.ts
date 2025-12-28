/**
 * StickerNest v2 - Anthropic Provider
 * Supports Claude 3.5, Claude 3, and Claude 2 models
 */

import type { 
  AIProvider, 
  GenerationOptions, 
  GenerationResult, 
  ModelCapabilities,
  ProviderConfig 
} from './AIProvider';
import { AIProviderError } from './AIProvider';

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';
  readonly model: string;
  
  private apiKey: string | null = null;
  private baseUrl: string;
  private defaultOptions: GenerationOptions;
  private abortController: AbortController | null = null;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.apiKey = config.apiToken || null;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.defaultOptions = config.defaultOptions || {};
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      // Call through our proxy to avoid CORS
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: mergedOptions.maxTokens || 4000,
          system: mergedOptions.systemPrompt,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: mergedOptions.temperature || 0.7,
          top_p: mergedOptions.topP,
          stop_sequences: mergedOptions.stopSequences,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new AIProviderError(
          error.error?.message || error.error || 'Anthropic API error',
          'anthropic',
          response.status === 401 ? 'auth' : 
          response.status === 429 ? 'rate_limit' : 'unknown',
          error
        );
      }

      const result = await response.json();
      const content = result.content?.[0]?.text || '';

      return {
        content,
        usage: result.usage ? {
          promptTokens: result.usage.input_tokens,
          completionTokens: result.usage.output_tokens,
          totalTokens: (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0),
        } : undefined,
        durationMs: Date.now() - startTime,
        model: this.model,
        finishReason: result.stop_reason === 'end_turn' ? 'stop' : 'length',
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AIProviderError('Generation aborted', 'anthropic', 'timeout');
      }
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(error.message, 'anthropic', 'network', error);
    }
  }

  getCapabilities(): ModelCapabilities {
    const capabilities: Record<string, ModelCapabilities> = {
      'claude-sonnet-4-20250514': {
        maxContextLength: 200000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      'claude-3-5-sonnet-20241022': {
        maxContextLength: 200000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      'claude-3-5-haiku-20241022': {
        maxContextLength: 200000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
      },
      'claude-3-opus-20240229': {
        maxContextLength: 200000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
      },
      'claude-3-sonnet-20240229': {
        maxContextLength: 200000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      'claude-3-haiku-20240307': {
        maxContextLength: 200000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: false,
        costPer1kInput: 0.00025,
        costPer1kOutput: 0.00125,
      },
    };

    return capabilities[this.model] || {
      maxContextLength: 200000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/anthropic/status');
      return response.ok;
    } catch {
      return false;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}


