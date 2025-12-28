/**
 * StickerNest v2 - OpenAI Provider
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5, and o1 models
 */

import type { 
  AIProvider, 
  GenerationOptions, 
  GenerationResult, 
  ModelCapabilities,
  ProviderConfig 
} from './AIProvider';
import { AIProviderError } from './AIProvider';

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly model: string;
  
  private apiKey: string | null = null;
  private baseUrl: string;
  private defaultOptions: GenerationOptions;
  private abortController: AbortController | null = null;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.apiKey = config.apiToken || null;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultOptions = config.defaultOptions || {};
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    
    if (mergedOptions.systemPrompt) {
      messages.push({ role: 'system', content: mergedOptions.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      // Call through our proxy to avoid CORS
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: mergedOptions.maxTokens || 4000,
          temperature: mergedOptions.temperature || 0.7,
          top_p: mergedOptions.topP,
          frequency_penalty: mergedOptions.frequencyPenalty,
          presence_penalty: mergedOptions.presencePenalty,
          stop: mergedOptions.stopSequences,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new AIProviderError(
          error.error?.message || error.error || 'OpenAI API error',
          'openai',
          response.status === 401 ? 'auth' : 
          response.status === 429 ? 'rate_limit' : 'unknown',
          error
        );
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      return {
        content,
        usage: result.usage ? {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        } : undefined,
        durationMs: Date.now() - startTime,
        model: this.model,
        finishReason: result.choices?.[0]?.finish_reason === 'stop' ? 'stop' : 'length',
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AIProviderError('Generation aborted', 'openai', 'timeout');
      }
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(error.message, 'openai', 'network', error);
    }
  }

  getCapabilities(): ModelCapabilities {
    // Return capabilities based on model
    const capabilities: Record<string, ModelCapabilities> = {
      'gpt-4o': {
        maxContextLength: 128000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.005,
        costPer1kOutput: 0.015,
      },
      'gpt-4o-mini': {
        maxContextLength: 128000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006,
      },
      'gpt-4-turbo': {
        maxContextLength: 128000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.01,
        costPer1kOutput: 0.03,
      },
      'gpt-4': {
        maxContextLength: 8192,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.03,
        costPer1kOutput: 0.06,
      },
      'gpt-3.5-turbo': {
        maxContextLength: 16385,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: false,
        costPer1kInput: 0.0005,
        costPer1kOutput: 0.0015,
      },
      'o1': {
        maxContextLength: 200000,
        supportsStreaming: false,
        supportsSystemPrompt: false,
        codeOptimized: true,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.06,
      },
      'o1-mini': {
        maxContextLength: 128000,
        supportsStreaming: false,
        supportsSystemPrompt: false,
        codeOptimized: true,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.012,
      },
    };

    return capabilities[this.model] || {
      maxContextLength: 8000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: false,
    };
  }

  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    try {
      const response = await fetch('/api/openai/status');
      return response.ok;
    } catch {
      return false;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}


