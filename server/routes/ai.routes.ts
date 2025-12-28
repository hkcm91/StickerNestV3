import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  generateTextSchema,
  generateImageSchema,
  generateVideoSchema,
  loraTrainSchema,
  executePipelineSchema,
  generateWidgetSchema,
} from '../schemas/ai.schema.js';

const router = Router();

/**
 * @route GET /api/ai/providers
 * @desc Get available AI providers
 * @access Private
 */
router.get('/providers', authenticate, aiController.getProviders);

/**
 * @route POST /api/ai/generate-text
 * @desc Generate text using AI
 * @access Private
 */
router.post(
  '/generate-text',
  authenticate,
  aiLimiter,
  validateBody(generateTextSchema),
  aiController.generateText
);

/**
 * @route POST /api/ai/generate-image
 * @desc Generate image using AI
 * @access Private
 */
router.post(
  '/generate-image',
  authenticate,
  aiLimiter,
  validateBody(generateImageSchema),
  aiController.generateImage
);

/**
 * @route POST /api/ai/generate-video
 * @desc Generate video using AI
 * @access Private
 */
router.post(
  '/generate-video',
  authenticate,
  aiLimiter,
  validateBody(generateVideoSchema),
  aiController.generateVideo
);

/**
 * @route POST /api/ai/lora-train
 * @desc Train a LoRA model
 * @access Private
 */
router.post(
  '/lora-train',
  authenticate,
  aiLimiter,
  validateBody(loraTrainSchema),
  aiController.trainLora
);

/**
 * @route POST /api/ai/pipeline
 * @desc Execute a pipeline
 * @access Private
 */
router.post(
  '/pipeline',
  authenticate,
  aiLimiter,
  validateBody(executePipelineSchema),
  aiController.executePipeline
);

/**
 * @route POST /api/ai/generate-widget
 * @desc Generate a widget using AI
 * @access Private
 */
router.post(
  '/generate-widget',
  authenticate,
  aiLimiter,
  validateBody(generateWidgetSchema),
  aiController.generateWidget
);

export default router;
