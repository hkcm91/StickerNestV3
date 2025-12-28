import { Router } from 'express';
import * as eventsController from '../controllers/events.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import {
  createEventSchema,
  eventQuerySchema,
  eventCanvasIdParamSchema,
} from '../schemas/events.schema.js';

const router = Router();

/**
 * @route POST /api/events/:canvasId
 * @desc Create an event for a canvas
 * @access Private
 */
router.post(
  '/:canvasId',
  authenticate,
  validateParams(eventCanvasIdParamSchema),
  validateBody(createEventSchema),
  eventsController.createEvent
);

/**
 * @route GET /api/events/:canvasId
 * @desc Get events for a canvas
 * @access Private
 */
router.get(
  '/:canvasId',
  authenticate,
  validateParams(eventCanvasIdParamSchema),
  validateQuery(eventQuerySchema),
  eventsController.getEvents
);

/**
 * @route GET /api/events/:canvasId/since
 * @desc Get events since a timestamp (for polling)
 * @access Private
 */
router.get(
  '/:canvasId/since',
  authenticate,
  validateParams(eventCanvasIdParamSchema),
  eventsController.getEventsSince
);

/**
 * @route GET /api/events/:canvasId/stats
 * @desc Get event statistics for a canvas
 * @access Private
 */
router.get(
  '/:canvasId/stats',
  authenticate,
  validateParams(eventCanvasIdParamSchema),
  eventsController.getEventStats
);

export default router;
