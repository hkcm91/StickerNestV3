import Replicate from 'replicate';
import { env } from '../../config/env.js';
import { AIGenerationError } from '../../utils/AppErrors.js';
import { log } from '../../utils/logger.js';
import { validateExternalUrl, validateExternalUrls } from '../../utils/security.js';

/**
 * Replicate provider - wraps Replicate API for image/video generation
 */
export class ReplicateProvider {
  private client: Replicate | null = null;

  private getClient(): Replicate {
    if (!this.client) {
      if (!env.REPLICATE_API_TOKEN) {
        throw new AIGenerationError('Replicate API token not configured', 'replicate');
      }
      this.client = new Replicate({
        auth: env.REPLICATE_API_TOKEN,
      });
    }
    return this.client;
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!env.REPLICATE_API_TOKEN;
  }

  /**
   * Generate text using LLaMA or other models
   */
  async generateText(options: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    content: string;
    model: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();

    const model = options.model || 'meta/meta-llama-3.1-70b-instruct';

    try {
      const output = await client.run(model as `${string}/${string}`, {
        input: {
          prompt: options.prompt,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature ?? 0.3,
        },
      });

      // Replicate returns an array of strings for text models
      const content = Array.isArray(output) ? output.join('') : String(output);

      log.ai('replicate', model, 'generateText', Date.now() - startTime);

      return {
        content,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Replicate text generation failed: ${message}`, 'replicate');
    }
  }

  /**
   * Generate images using Stable Diffusion or FLUX
   */
  async generateImage(options: {
    prompt: string;
    negativePrompt?: string;
    model?: string;
    width?: number;
    height?: number;
    numOutputs?: number;
    guidanceScale?: number;
    numInferenceSteps?: number;
    seed?: number;
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

    // Default to FLUX schnell for fast generation
    const model = options.model || 'black-forest-labs/flux-schnell';
    const width = options.width || 1024;
    const height = options.height || 1024;

    try {
      const output = await client.run(model as `${string}/${string}`, {
        input: {
          prompt: options.prompt,
          negative_prompt: options.negativePrompt,
          width,
          height,
          num_outputs: options.numOutputs || 1,
          guidance_scale: options.guidanceScale || 7.5,
          num_inference_steps: options.numInferenceSteps || 50,
          seed: options.seed,
        },
      });

      // Replicate returns array of URLs for image models
      const urls = Array.isArray(output) ? output : [output];
      const images = urls.map(url => ({
        url: String(url),
        width,
        height,
      }));

      log.ai('replicate', model, 'generateImage', Date.now() - startTime);

      return {
        images,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Replicate image generation failed: ${message}`, 'replicate');
    }
  }

  /**
   * Generate video from image or prompt
   * SECURITY: Validates imageUrl to prevent SSRF attacks
   */
  async generateVideo(options: {
    prompt: string;
    imageUrl?: string;
    model?: string;
    duration?: number;
    fps?: number;
    seed?: number;
  }): Promise<{
    videoUrl: string;
    model: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();

    // Use a video generation model
    const model = options.model || 'stability-ai/stable-video-diffusion';

    // SECURITY: Validate imageUrl to prevent SSRF attacks
    if (options.imageUrl) {
      const validation = validateExternalUrl(options.imageUrl);
      if (!validation.isValid) {
        throw new AIGenerationError(`Invalid image URL: ${validation.error}`, 'replicate');
      }
    }

    try {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        fps: options.fps || 24,
        seed: options.seed,
      };

      if (options.imageUrl) {
        input.image = options.imageUrl;
      }

      const output = await client.run(model as `${string}/${string}`, { input });

      const videoUrl = Array.isArray(output) ? output[0] : output;

      log.ai('replicate', model, 'generateVideo', Date.now() - startTime);

      return {
        videoUrl: String(videoUrl),
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Replicate video generation failed: ${message}`, 'replicate');
    }
  }

  /**
   * Train a LoRA model
   * SECURITY: Validates imageUrls to prevent SSRF attacks
   */
  async trainLora(options: {
    name: string;
    instancePrompt: string;
    classPrompt?: string;
    imageUrls: string[];
    trainingSteps?: number;
    learningRate?: number;
  }): Promise<{
    trainingId: string;
    status: string;
  }> {
    const client = this.getClient();
    const startTime = Date.now();

    // SECURITY: Validate all imageUrls to prevent SSRF attacks
    const validation = validateExternalUrls(options.imageUrls);
    if (!validation.isValid) {
      throw new AIGenerationError(`Invalid training image URL: ${validation.error}`, 'replicate');
    }

    try {
      // Create a training using Replicate's training API
      const training = await client.trainings.create(
        'stability-ai',
        'sdxl',
        '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        {
          destination: options.name as `${string}/${string}`,
          input: {
            input_images: options.imageUrls.join('\n'),
            instance_prompt: options.instancePrompt,
            class_prompt: options.classPrompt || '',
            max_train_steps: options.trainingSteps || 1000,
            learning_rate: options.learningRate || 1e-4,
          },
        }
      );

      log.ai('replicate', 'sdxl-lora', 'trainLora', Date.now() - startTime);

      return {
        trainingId: training.id,
        status: training.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Replicate LoRA training failed: ${message}`, 'replicate');
    }
  }

  /**
   * Get training status
   */
  async getTrainingStatus(trainingId: string): Promise<{
    status: string;
    model?: string;
    error?: string;
  }> {
    const client = this.getClient();

    try {
      const training = await client.trainings.get(trainingId);

      return {
        status: training.status,
        model: training.output ? String(training.output) : undefined,
        error: training.error ? String(training.error) : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AIGenerationError(`Failed to get training status: ${message}`, 'replicate');
    }
  }
}

// Export singleton instance
export const replicateProvider = new ReplicateProvider();
