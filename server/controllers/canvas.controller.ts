import { Request, Response } from 'express';
import { canvasService } from '../services/canvas.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type {
  CreateCanvasInput,
  UpdateCanvasInput,
  ShareCanvasInput,
  CanvasQuery,
} from '../schemas/canvas.schema.js';

/**
 * Create a new canvas
 * POST /api/canvas
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const input: CreateCanvasInput = req.body;
  const userId = req.user!.userId;

  const canvas = await canvasService.create(userId, input);

  res.status(201).json({
    success: true,
    canvas,
  });
});

/**
 * List user's canvases
 * GET /api/canvas
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const query = req.query as unknown as CanvasQuery;

  const result = await canvasService.list(userId, query);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get a canvas by ID
 * GET /api/canvas/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const password = req.headers['x-canvas-password'] as string | undefined;

  const canvas = await canvasService.getById(id, userId, password);

  res.json({
    success: true,
    canvas,
  });
});

/**
 * Get a canvas by slug
 * GET /api/canvas/s/:slug
 */
export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = req.user?.userId;
  const password = req.headers['x-canvas-password'] as string | undefined;

  const canvas = await canvasService.getBySlug(slug, userId, password);

  res.json({
    success: true,
    canvas,
  });
});

/**
 * Update a canvas
 * PUT /api/canvas/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const input: UpdateCanvasInput = req.body;

  const canvas = await canvasService.update(id, userId, input);

  res.json({
    success: true,
    canvas,
  });
});

/**
 * Delete a canvas
 * DELETE /api/canvas/:id
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  await canvasService.delete(id, userId);

  res.json({
    success: true,
    message: 'Canvas deleted',
  });
});

/**
 * Fork a canvas
 * POST /api/canvas/:id/fork
 */
export const fork = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { name } = req.body;

  const canvas = await canvasService.fork(id, userId, name);

  res.status(201).json({
    success: true,
    canvas,
  });
});

/**
 * Update share settings
 * PUT /api/canvas/:id/share
 */
export const updateShare = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const input: ShareCanvasInput = req.body;

  const canvas = await canvasService.updateShare(id, userId, input);

  res.json({
    success: true,
    canvas,
  });
});

/**
 * Get canvas versions
 * GET /api/canvas/:id/versions
 */
export const getVersions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const result = await canvasService.getVersions(id, userId);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Create a canvas version snapshot
 * POST /api/canvas/:id/versions
 */
export const createVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { name } = req.body;

  await canvasService.createVersion(id, userId, name);

  res.status(201).json({
    success: true,
    message: 'Version created',
  });
});

/**
 * Restore a canvas version
 * POST /api/canvas/:id/versions/:version/restore
 */
export const restoreVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id, version } = req.params;
  const userId = req.user!.userId;

  const canvas = await canvasService.restoreVersion(id, userId, parseInt(version, 10));

  res.json({
    success: true,
    canvas,
  });
});
