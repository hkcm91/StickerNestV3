import { Request, Response } from 'express';
import { aiService } from '../services/ai.service.js';
import { pipelineExecutionService, type Pipeline } from '../services/pipeline-execution.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type {
  GenerateTextInput,
  GenerateImageInput,
  GenerateVideoInput,
  LoraTrainInput,
  GenerateWidgetInput,
  ExecutePipelineInput,
} from '../schemas/ai.schema.js';

/**
 * Get available AI providers
 * GET /api/ai/providers
 */
export const getProviders = asyncHandler(async (_req: Request, res: Response) => {
  const providers = aiService.getAvailableProviders();

  res.json({
    success: true,
    providers,
  });
});

/**
 * Generate text
 * POST /api/ai/generate-text
 */
export const generateText = asyncHandler(async (req: Request, res: Response) => {
  const input: GenerateTextInput = req.body;

  const result = await aiService.generateText(input);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Generate image
 * POST /api/ai/generate-image
 */
export const generateImage = asyncHandler(async (req: Request, res: Response) => {
  const input: GenerateImageInput = req.body;

  const result = await aiService.generateImage(input);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Generate video
 * POST /api/ai/generate-video
 */
export const generateVideo = asyncHandler(async (req: Request, res: Response) => {
  const input: GenerateVideoInput = req.body;

  const result = await aiService.generateVideo(input);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Train LoRA
 * POST /api/ai/lora-train
 */
export const trainLora = asyncHandler(async (req: Request, res: Response) => {
  const input: LoraTrainInput = req.body;

  const result = await aiService.trainLora(input);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Execute pipeline
 * POST /api/ai/pipeline
 *
 * Executes a pipeline with the provided inputs.
 * Pipeline must be provided in request body along with pipelineId and inputs.
 *
 * For stored pipelines, the client should first fetch the pipeline from the database
 * and include it in the request. Future enhancement: Load pipeline from DB by ID.
 */
export const executePipeline = asyncHandler(async (req: Request, res: Response) => {
  const { pipelineId, inputs, pipeline } = req.body as ExecutePipelineInput & { pipeline?: Pipeline };

  if (!pipeline) {
    // In a full implementation, we would load the pipeline from the database here
    // For now, require the pipeline to be provided in the request
    res.status(400).json({
      success: false,
      error: 'Pipeline must be provided in request body',
      message: 'Include the full pipeline object in the request body',
    });
    return;
  }

  // Validate pipeline structure
  if (!pipeline.nodes || !Array.isArray(pipeline.nodes)) {
    res.status(400).json({
      success: false,
      error: 'Invalid pipeline: nodes array is required',
    });
    return;
  }

  if (!pipeline.connections || !Array.isArray(pipeline.connections)) {
    res.status(400).json({
      success: false,
      error: 'Invalid pipeline: connections array is required',
    });
    return;
  }

  // Execute the pipeline
  const result = await pipelineExecutionService.executePipeline(
    { pipelineId, inputs: inputs || {} },
    pipeline,
    (progress) => {
      // Progress is reported via WebSocket in production
      // For now, log to console
      console.log(`[Pipeline:${pipelineId}] Progress:`, progress.percentage + '%', progress.message);
    }
  );

  // Return results
  if (result.status === 'failed') {
    res.status(500).json({
      success: false,
      error: result.error,
      nodeResults: result.nodeResults,
      duration: result.endTime ? result.endTime - result.startTime : undefined,
    });
    return;
  }

  res.json({
    success: true,
    status: result.status,
    nodeResults: result.nodeResults,
    outputs: result.finalOutputs,
    duration: result.endTime ? result.endTime - result.startTime : undefined,
  });
});

/**
 * Generate widget
 * POST /api/ai/generate-widget
 */
export const generateWidget = asyncHandler(async (req: Request, res: Response) => {
  const input: GenerateWidgetInput = req.body;

  const result = await aiService.generateWidget(input);

  res.json({
    success: true,
    widget: {
      id: result.id,
      name: result.name,
      manifest: result.manifest,
      html: result.html,
      explanation: result.explanation,
    },
  });
});
