import { Request, Response } from 'express';
import { widgetService } from '../services/widget.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type {
  CreateWidgetInput,
  UpdateWidgetInput,
  UpdateWidgetStateInput,
  BatchUpdateWidgetsInput,
} from '../schemas/widget.schema.js';

/**
 * Get all widgets for a canvas
 * GET /api/canvas/:id/widgets
 */
export const getByCanvas = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId } = req.params;
  const userId = req.user!.userId;

  const widgets = await widgetService.getByCanvas(canvasId, userId);

  res.json({
    success: true,
    widgets,
  });
});

/**
 * Get a single widget
 * GET /api/canvas/:id/widgets/:wid
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId, wid: widgetId } = req.params;
  const userId = req.user!.userId;

  const widget = await widgetService.getById(canvasId, widgetId, userId);

  res.json({
    success: true,
    widget,
  });
});

/**
 * Create a new widget instance
 * POST /api/canvas/:id/widgets
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId } = req.params;
  const userId = req.user!.userId;
  const input: CreateWidgetInput = req.body;

  const widget = await widgetService.create(canvasId, userId, input);

  res.status(201).json({
    success: true,
    widget,
  });
});

/**
 * Update a widget instance
 * PUT /api/canvas/:id/widgets/:wid
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId, wid: widgetId } = req.params;
  const userId = req.user!.userId;
  const input: UpdateWidgetInput = req.body;

  const widget = await widgetService.update(canvasId, widgetId, userId, input);

  res.json({
    success: true,
    widget,
  });
});

/**
 * Update widget state only
 * PUT /api/canvas/:id/widgets/:wid/state
 */
export const updateState = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId, wid: widgetId } = req.params;
  const userId = req.user!.userId;
  const input: UpdateWidgetStateInput = req.body;

  const widget = await widgetService.updateState(canvasId, widgetId, userId, input);

  res.json({
    success: true,
    widget,
  });
});

/**
 * Delete a widget instance
 * DELETE /api/canvas/:id/widgets/:wid
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId, wid: widgetId } = req.params;
  const userId = req.user!.userId;

  await widgetService.delete(canvasId, widgetId, userId);

  res.json({
    success: true,
    message: 'Widget deleted',
  });
});

/**
 * Batch update multiple widgets
 * PUT /api/canvas/:id/widgets/batch
 */
export const batchUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { id: canvasId } = req.params;
  const userId = req.user!.userId;
  const input: BatchUpdateWidgetsInput = req.body;

  const widgets = await widgetService.batchUpdate(canvasId, userId, input);

  res.json({
    success: true,
    widgets,
  });
});
