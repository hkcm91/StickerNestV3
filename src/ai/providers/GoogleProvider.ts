/**
 * StickerNest v2 - Google Provider
 * Supports Gemini 2.0, 1.5, and 1.0 models
 */

import type { 
  AIProvider, 
  GenerationOptions, 
  GenerationResult, 
  ModelCapabilities,
  ProviderConfig 
} from './AIProvider';
import { AIProviderError } from './AIProvider';

export class GoogleProvider implements AIProvider {
  readonly id = 'google';
  readonly name = 'Google AI';
  readonly model: string;
  
  private apiKey: string | null = null;
  private defaultOptions: GenerationOptions;
  private abortController: AbortController | null = null;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.apiKey = config.apiToken || null;
    this.defaultOptions = config.defaultOptions || {};
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    const mergedOptions = { ...this.defaultOptions, ...options };

    // Build content parts
    const contents = [];
    
    if (mergedOptions.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: mergedOptions.systemPrompt }]
      });
      contents.push({
        role: 'model', 
        parts: [{ text: 'Understood. I will follow these instructions.' }]
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    try {
      // Call through our proxy to avoid CORS
      const response = await fetch('/api/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          contents,
          generationConfig: {
            maxOutputTokens: mergedOptions.maxTokens || 4000,
            temperature: mergedOptions.temperature || 0.7,
            topP: mergedOptions.topP,
            stopSequences: mergedOptions.stopSequences,
          },
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new AIProviderError(
          error.error?.message || error.error || 'Google AI API error',
          'google',
          response.status === 401 ? 'auth' : 
          response.status === 429 ? 'rate_limit' : 'unknown',
          error
        );
      }

      const result = await response.json();
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content,
        usage: result.usageMetadata ? {
          promptTokens: result.usageMetadata.promptTokenCount || 0,
          completionTokens: result.usageMetadata.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata.totalTokenCount || 0,
        } : undefined,
        durationMs: Date.now() - startTime,
        model: this.model,
        finishReason: result.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : 'length',
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AIProviderError('Generation aborted', 'google', 'timeout');
      }
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(error.message, 'google', 'network', error);
    }
  }

  getCapabilities(): ModelCapabilities {
    const capabilities: Record<string, ModelCapabilities> = {
      'gemini-2.0-flash': {
        maxContextLength: 1000000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.0,  // Free tier available
        costPer1kOutput: 0.0,
      },
      'gemini-2.0-flash-thinking': {
        maxContextLength: 1000000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
      },
      'gemini-1.5-pro': {
        maxContextLength: 2000000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.00125,
        costPer1kOutput: 0.005,
      },
      'gemini-1.5-flash': {
        maxContextLength: 1000000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: true,
        costPer1kInput: 0.000075,
        costPer1kOutput: 0.0003,
      },
      'gemini-1.5-flash-8b': {
        maxContextLength: 1000000,
        supportsStreaming: true,
        supportsSystemPrompt: true,
        codeOptimized: false,
        costPer1kInput: 0.0000375,
        costPer1kOutput: 0.00015,
      },
    };

    return capabilities[this.model] || {
      maxContextLength: 1000000,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      codeOptimized: true,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/google/status');
      return response.ok;
    } catch {
      return false;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}


