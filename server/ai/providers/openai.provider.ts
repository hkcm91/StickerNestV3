import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { AIGenerationError } from '../../utils/AppErrors.js';
import { log } from '../../utils/logger.js';

/**
 * OpenAI provider - wraps OpenAI API for text and image generation
 */
export class OpenAIProvider {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      if (!env.OPENAI_API_KEY) {
        throw new AIGenerationError('OpenAI API key not configured', 'openai');
      }
      this.client = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
    return this.client;
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!env.OPENAI_API_KEY;
  }

  /**
   * Generate text using GPT
   */
  async generateText(options: {
    prompt: string;
    system?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  }): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();

    const model = options.model || 'gpt-4-turbo-preview';

    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      if (options.system) {
        messages.push({ role: 'system', content: options.system });
      }

      messages.push({ role: 'user', content: options.prompt });

      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop: options.stopSequences,
      });

      const content = response.choices[0]?.message?.content || '';

      log.ai('openai', model, 'generateText', Date.now() - startTime);

      return {
        content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`OpenAI text generation failed: ${message}`, 'openai');
    }
  }

  /**
   * Generate images using DALL-E
   */
  async generateImage(options: {
    prompt: string;
    model?: string;
    size?: '1024x1024' | '1024x1792' | '1792x1024';
    quality?: 'standard' | 'hd';
    numOutputs?: number;
  }): Promise<{
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
    model: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();

    const model = options.model || 'dall-e-3';
    const size = options.size || '1024x1024';

    try {
      const response = await client.images.generate({
        model,
        prompt: options.prompt,
        size,
        quality: options.quality || 'standard',
        n: options.numOutputs || 1,
        response_format: 'url',
      });

      const [width, height] = size.split('x').map(Number);

      const images = (response.data || []).map((img: { url?: string }) => ({
        url: img.url || '',
        width,
        height,
      }));

      log.ai('openai', model, 'generateImage', Date.now() - startTime);

      return {
        images,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`OpenAI image generation failed: ${message}`, 'openai');
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(options: {
    input: string | string[];
    model?: string;
  }): Promise<{
    embeddings: number[][];
    model: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();

    const model = options.model || 'text-embedding-3-small';

    try {
      const response = await client.embeddings.create({
        model,
        input: options.input,
      });

      const embeddings = response.data.map(item => item.embedding);

      log.ai('openai', model, 'generateEmbedding', Date.now() - startTime);

      return {
        embeddings,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`OpenAI embedding generation failed: ${message}`, 'openai');
    }
  }
}

// Export singleton instance
export const openaiProvider = new OpenAIProvider();
