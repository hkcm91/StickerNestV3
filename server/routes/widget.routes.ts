import { Router } from 'express';
import * as widgetController from '../controllers/widget.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  createWidgetSchema,
  updateWidgetSchema,
  updateWidgetStateSchema,
  batchUpdateWidgetsSchema,
  widgetIdParamsSchema,
} from '../schemas/widget.schema.js';
import { canvasIdParamSchema } from '../schemas/canvas.schema.js';

const router = Router({ mergeParams: true }); // Merge params from parent router

/**
 * @route GET /api/canvas/:id/widgets
 * @desc Get all widgets for a canvas
 * @access Private
 */
router.get(
  '/',
  authenticate,
  validateParams(canvasIdParamSchema),
  widgetController.getByCanvas
);

/**
 * @route POST /api/canvas/:id/widgets
 * @desc Create a new widget instance
 * @access Private (owner only)
 */
router.post(
  '/',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(createWidgetSchema),
  widgetController.create
);

/**
 * @route PUT /api/canvas/:id/widgets/batch
 * @desc Batch update multiple widgets
 * @access Private (owner only)
 * @note Must be before /:wid routes
 */
router.put(
  '/batch',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(batchUpdateWidgetsSchema),
  widgetController.batchUpdate
);

/**
 * @route GET /api/canvas/:id/widgets/:wid
 * @desc Get a single widget
 * @access Private
 */
router.get(
  '/:wid',
  authenticate,
  validateParams(widgetIdParamsSchema),
  widgetController.getById
);

/**
 * @route PUT /api/canvas/:id/widgets/:wid
 * @desc Update a widget instance
 * @access Private (owner only)
 */
router.put(
  '/:wid',
  authenticate,
  validateParams(widgetIdParamsSchema),
  validateBody(updateWidgetSchema),
  widgetController.update
);

/**
 * @route PUT /api/canvas/:id/widgets/:wid/state
 * @desc Update widget state only
 * @access Private (owner only)
 */
router.put(
  '/:wid/state',
  authenticate,
  validateParams(widgetIdParamsSchema),
  validateBody(updateWidgetStateSchema),
  widgetController.updateState
);

/**
 * @route DELETE /api/canvas/:id/widgets/:wid
 * @desc Delete a widget instance
 * @access Private (owner only)
 */
router.delete(
  '/:wid',
  authenticate,
  validateParams(widgetIdParamsSchema),
  widgetController.remove
);

export default router;
