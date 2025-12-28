import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { AIGenerationError } from '../../utils/AppErrors.js';
import { log } from '../../utils/logger.js';

/**
 * Anthropic provider - wraps Claude API
 */
export class AnthropicProvider {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) {
        throw new AIGenerationError('Anthropic API key not configured', 'anthropic');
      }
      this.client = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate text using Claude
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

    const model = options.model || 'claude-3-5-sonnet-20241022';

    try {
      const response = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop_sequences: options.stopSequences,
        system: options.system,
        messages: [
          {
            role: 'user',
            content: options.prompt,
          },
        ],
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      log.ai('anthropic', model, 'generateText', Date.now() - startTime);

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Anthropic text generation failed: ${message}`, 'anthropic');
    }
  }

  /**
   * Generate widget code using Claude
   */
  async generateWidget(options: {
    description: string;
    mode: 'new' | 'variation' | 'layer';
    quality: 'basic' | 'standard' | 'advanced' | 'professional';
    style: 'minimal' | 'polished' | 'elaborate' | 'glass' | 'neon' | 'retro';
    sourceWidget?: { manifest: unknown; html: string };
    pipelineId?: string;
  }): Promise<{
    id: string;
    name: string;
    manifest: unknown;
    html: string;
    explanation: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();
    const model = 'claude-3-5-sonnet-20241022';

    // Build the system prompt based on mode and quality
    const systemPrompt = this.buildWidgetGenerationSystemPrompt(options);
    const userPrompt = this.buildWidgetGenerationUserPrompt(options);

    try {
      const response = await client.messages.create({
        model,
        max_tokens: 16000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      // Parse the response to extract widget components
      const result = this.parseWidgetResponse(content, options.description);

      log.ai('anthropic', model, 'generateWidget', Date.now() - startTime);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Widget generation failed: ${message}`, 'anthropic');
    }
  }

  /**
   * Build system prompt for widget generation
   */
  private buildWidgetGenerationSystemPrompt(options: {
    quality: string;
    style: string;
    mode: string;
  }): string {
    return `You are an expert widget generator for StickerNest, a modular widget platform.
Your task is to generate self-contained HTML widgets that communicate via postMessage protocol.

CRITICAL REQUIREMENTS:
1. Generate a COMPLETE, WORKING widget in a single HTML file
2. Include all CSS inline in a <style> tag
3. Include all JavaScript inline in a <script> tag
4. Widget MUST signal ready: window.parent.postMessage({ type: 'READY' }, '*')
5. Widget MUST emit events via: window.parent.postMessage({ type: 'widget:emit', payload: { type: '<outputId>', payload: <data> } }, '*')
6. Widget MUST listen for events via message event listener

OUTPUT FORMAT (JSON):
{
  "name": "Widget Name",
  "manifest": {
    "id": "widget-id",
    "name": "Widget Name",
    "version": "1.0.0",
    "kind": "2d",
    "entry": "index.html",
    "inputs": {},
    "outputs": {},
    "capabilities": { "draggable": true, "resizable": true },
    "io": { "inputs": [], "outputs": [] }
  },
  "html": "<!DOCTYPE html>...",
  "explanation": "Brief explanation of what the widget does"
}

QUALITY LEVEL: ${options.quality}
STYLE: ${options.style}
MODE: ${options.mode}

${options.quality === 'professional' ? 'Include animations, transitions, and polished UI.' : ''}
${options.style === 'glass' ? 'Use glassmorphism design with blur and transparency.' : ''}
${options.style === 'neon' ? 'Use neon colors, glow effects, and dark backgrounds.' : ''}
${options.style === 'retro' ? 'Use retro/pixel art aesthetic with limited color palette.' : ''}`;
  }

  /**
   * Build user prompt for widget generation
   */
  private buildWidgetGenerationUserPrompt(options: {
    description: string;
    mode: string;
    sourceWidget?: { manifest: unknown; html: string };
  }): string {
    let prompt = `Generate a widget based on this description:\n\n${options.description}`;

    if (options.mode === 'variation' && options.sourceWidget) {
      prompt += `\n\nBase this on the following existing widget (create a variation):\n`;
      prompt += `Manifest: ${JSON.stringify(options.sourceWidget.manifest, null, 2)}\n`;
      prompt += `HTML: ${options.sourceWidget.html}`;
    } else if (options.mode === 'layer' && options.sourceWidget) {
      prompt += `\n\nAdd a new layer/feature to this existing widget:\n`;
      prompt += `Manifest: ${JSON.stringify(options.sourceWidget.manifest, null, 2)}\n`;
      prompt += `HTML: ${options.sourceWidget.html}`;
    }

    prompt += '\n\nRespond with ONLY valid JSON matching the output format.';

    return prompt;
  }

  /**
   * Parse widget generation response
   */
  private parseWidgetResponse(content: string, description: string): {
    id: string;
    name: string;
    manifest: unknown;
    html: string;
    explanation: string;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Generate a valid widget ID if not present
      const id = parsed.manifest?.id || this.generateWidgetId(parsed.name || description);

      return {
        id,
        name: parsed.name || 'Generated Widget',
        manifest: {
          ...parsed.manifest,
          id,
        },
        html: parsed.html || '',
        explanation: parsed.explanation || 'AI-generated widget',
      };
    } catch {
      throw new AIGenerationError('Failed to parse widget generation response', 'anthropic');
    }
  }

  /**
   * Generate a valid widget ID from a name
   */
  private generateWidgetId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
    const suffix = Math.random().toString(36).slice(2, 10);
    return `${base || 'widget'}-${suffix}`;
  }
}

// Export singleton instance
export const anthropicProvider = new AnthropicProvider();
