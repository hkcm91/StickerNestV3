import { Router } from 'express';
import * as canvasController from '../controllers/canvas.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import {
  createCanvasSchema,
  updateCanvasSchema,
  shareCanvasSchema,
  forkCanvasSchema,
  canvasQuerySchema,
  canvasIdParamSchema,
  canvasVersionParamSchema,
} from '../schemas/canvas.schema.js';

const router = Router();

/**
 * @route POST /api/canvas
 * @desc Create a new canvas
 * @access Private
 */
router.post(
  '/',
  authenticate,
  validateBody(createCanvasSchema),
  canvasController.create
);

/**
 * @route GET /api/canvas
 * @desc List user's canvases
 * @access Private
 */
router.get(
  '/',
  authenticate,
  validateQuery(canvasQuerySchema),
  canvasController.list
);

/**
 * @route GET /api/canvas/s/:slug
 * @desc Get canvas by slug (public)
 * @access Public (with optional auth)
 */
router.get(
  '/s/:slug',
  optionalAuth,
  canvasController.getBySlug
);

/**
 * @route GET /api/canvas/:id
 * @desc Get canvas by ID
 * @access Public (with optional auth)
 */
router.get(
  '/:id',
  optionalAuth,
  validateParams(canvasIdParamSchema),
  canvasController.getById
);

/**
 * @route PUT /api/canvas/:id
 * @desc Update a canvas
 * @access Private (owner only)
 */
router.put(
  '/:id',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(updateCanvasSchema),
  canvasController.update
);

/**
 * @route DELETE /api/canvas/:id
 * @desc Delete a canvas
 * @access Private (owner only)
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(canvasIdParamSchema),
  canvasController.remove
);

/**
 * @route POST /api/canvas/:id/fork
 * @desc Fork a canvas
 * @access Private
 */
router.post(
  '/:id/fork',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(forkCanvasSchema),
  canvasController.fork
);

/**
 * @route PUT /api/canvas/:id/share
 * @desc Update share settings
 * @access Private (owner only)
 */
router.put(
  '/:id/share',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(shareCanvasSchema),
  canvasController.updateShare
);

/**
 * @route GET /api/canvas/:id/versions
 * @desc Get canvas versions
 * @access Private (owner only)
 */
router.get(
  '/:id/versions',
  authenticate,
  validateParams(canvasIdParamSchema),
  canvasController.getVersions
);

/**
 * @route POST /api/canvas/:id/versions
 * @desc Create a canvas version snapshot
 * @access Private (owner only)
 */
router.post(
  '/:id/versions',
  authenticate,
  validateParams(canvasIdParamSchema),
  canvasController.createVersion
);

/**
 * @route POST /api/canvas/:id/versions/:version/restore
 * @desc Restore a canvas version
 * @access Private (owner only)
 */
router.post(
  '/:id/versions/:version/restore',
  authenticate,
  validateParams(canvasVersionParamSchema),
  canvasController.restoreVersion
);

export default router;
