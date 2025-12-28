import { anthropicProvider } from '../ai/providers/anthropic.provider.js';
import { openaiProvider } from '../ai/providers/openai.provider.js';
import { replicateProvider } from '../ai/providers/replicate.provider.js';
import { AIGenerationError } from '../utils/AppErrors.js';
import type {
  GenerateTextInput,
  GenerateImageInput,
  GenerateVideoInput,
  LoraTrainInput,
  GenerateWidgetInput,
  AIProvider,
} from '../schemas/ai.schema.js';

/**
 * AI service - unified interface for AI operations
 */
export class AIService {
  /**
   * Get available providers
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (anthropicProvider.isAvailable()) providers.push('anthropic');
    if (openaiProvider.isAvailable()) providers.push('openai');
    if (replicateProvider.isAvailable()) providers.push('replicate');
    return providers;
  }

  /**
   * Generate text
   */
  async generateText(input: GenerateTextInput): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    provider: AIProvider;
  }> {
    const provider = input.provider || 'anthropic';

    switch (provider) {
      case 'anthropic': {
        if (!anthropicProvider.isAvailable()) {
          throw new AIGenerationError('Anthropic provider not configured', 'anthropic');
        }
        const result = await anthropicProvider.generateText({
          prompt: input.prompt,
          system: input.system,
          model: input.model,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          topP: input.topP,
          stopSequences: input.stopSequences,
        });
        return { ...result, provider: 'anthropic' };
      }

      case 'openai': {
        if (!openaiProvider.isAvailable()) {
          throw new AIGenerationError('OpenAI provider not configured', 'openai');
        }
        const result = await openaiProvider.generateText({
          prompt: input.prompt,
          system: input.system,
          model: input.model,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          topP: input.topP,
          stopSequences: input.stopSequences,
        });
        return { ...result, provider: 'openai' };
      }

      case 'replicate': {
        if (!replicateProvider.isAvailable()) {
          throw new AIGenerationError('Replicate provider not configured', 'replicate');
        }
        const result = await replicateProvider.generateText({
          prompt: input.prompt,
          model: input.model,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
        });
        return { ...result, provider: 'replicate' };
      }

      default:
        throw new AIGenerationError(`Unknown provider: ${provider}`, provider);
    }
  }

  /**
   * Generate image
   */
  async generateImage(input: GenerateImageInput): Promise<{
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
    model: string;
    provider: AIProvider;
  }> {
    const provider = input.provider || 'replicate';

    switch (provider) {
      case 'openai': {
        if (!openaiProvider.isAvailable()) {
          throw new AIGenerationError('OpenAI provider not configured', 'openai');
        }
        // Map dimensions to OpenAI sizes
        const size = this.mapToOpenAISize(input.width, input.height);
        const result = await openaiProvider.generateImage({
          prompt: input.prompt,
          model: input.model,
          size,
          numOutputs: input.numOutputs,
        });
        return { ...result, provider: 'openai' };
      }

      case 'replicate': {
        if (!replicateProvider.isAvailable()) {
          throw new AIGenerationError('Replicate provider not configured', 'replicate');
        }
        const result = await replicateProvider.generateImage({
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          model: input.model,
          width: input.width,
          height: input.height,
          numOutputs: input.numOutputs,
          guidanceScale: input.guidanceScale,
          numInferenceSteps: input.numInferenceSteps,
          seed: input.seed,
        });
        return { ...result, provider: 'replicate' };
      }

      default:
        throw new AIGenerationError(`Provider ${provider} does not support image generation`, provider);
    }
  }

  /**
   * Generate video
   */
  async generateVideo(input: GenerateVideoInput): Promise<{
    videoUrl: string;
    model: string;
    provider: AIProvider;
  }> {
    const provider = input.provider || 'replicate';

    if (provider !== 'replicate') {
      throw new AIGenerationError(`Provider ${provider} does not support video generation`, provider);
    }

    if (!replicateProvider.isAvailable()) {
      throw new AIGenerationError('Replicate provider not configured', 'replicate');
    }

    const result = await replicateProvider.generateVideo({
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      model: input.model,
      duration: input.duration,
      fps: input.fps,
      seed: input.seed,
    });

    return { ...result, provider: 'replicate' };
  }

  /**
   * Train LoRA
   */
  async trainLora(input: LoraTrainInput): Promise<{
    trainingId: string;
    status: string;
    provider: AIProvider;
  }> {
    const provider = input.provider || 'replicate';

    if (provider !== 'replicate') {
      throw new AIGenerationError(`Provider ${provider} does not support LoRA training`, provider);
    }

    if (!replicateProvider.isAvailable()) {
      throw new AIGenerationError('Replicate provider not configured', 'replicate');
    }

    const result = await replicateProvider.trainLora({
      name: input.name,
      instancePrompt: input.instancePrompt,
      classPrompt: input.classPrompt,
      imageUrls: input.imageUrls,
      trainingSteps: input.trainingSteps,
      learningRate: input.learningRate,
    });

    return { ...result, provider: 'replicate' };
  }

  /**
   * Generate widget
   */
  async generateWidget(input: GenerateWidgetInput): Promise<{
    id: string;
    name: string;
    manifest: unknown;
    html: string;
    explanation: string;
    provider: AIProvider;
  }> {
    const provider = input.provider || 'anthropic';

    if (provider !== 'anthropic') {
      throw new AIGenerationError(`Provider ${provider} does not support widget generation`, provider);
    }

    if (!anthropicProvider.isAvailable()) {
      throw new AIGenerationError('Anthropic provider not configured', 'anthropic');
    }

    const result = await anthropicProvider.generateWidget({
      description: input.description,
      mode: input.mode,
      quality: input.quality,
      style: input.style,
      sourceWidget: input.sourceWidgetId ? undefined : undefined, // TODO: Load source widget
      pipelineId: input.pipelineId,
    });

    return { ...result, provider: 'anthropic' };
  }

  /**
   * Map dimensions to OpenAI supported sizes
   */
  private mapToOpenAISize(width: number, height: number): '1024x1024' | '1024x1792' | '1792x1024' {
    const ratio = width / height;

    if (ratio > 1.3) {
      return '1792x1024'; // Landscape
    } else if (ratio < 0.77) {
      return '1024x1792'; // Portrait
    }
    return '1024x1024'; // Square
  }
}

// Export singleton instance
export const aiService = new AIService();
