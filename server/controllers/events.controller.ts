import { Request, Response } from 'express';
import { eventsService } from '../services/events.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { CreateEventInput, EventQuery } from '../schemas/events.schema.js';

/**
 * Create an event
 * POST /api/events/:canvasId
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { canvasId } = req.params;
  const input: CreateEventInput = req.body;

  const event = await eventsService.createEvent(canvasId, userId, input);

  res.status(201).json({
    success: true,
    event,
  });
});

/**
 * Get events for a canvas
 * GET /api/events/:canvasId
 */
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { canvasId } = req.params;
  const query = req.query as unknown as EventQuery;

  const result = await eventsService.getEvents(canvasId, userId, query);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get events since a timestamp (for polling)
 * GET /api/events/:canvasId/since
 */
export const getEventsSince = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { canvasId } = req.params;
  const since = new Date(req.query.since as string);
  const limit = parseInt(req.query.limit as string, 10) || 100;

  if (isNaN(since.getTime())) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid since timestamp',
      },
    });
    return;
  }

  const events = await eventsService.getEventsSince(canvasId, userId, since, limit);

  res.json({
    success: true,
    events,
  });
});

/**
 * Get event statistics
 * GET /api/events/:canvasId/stats
 */
export const getEventStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { canvasId } = req.params;

  const stats = await eventsService.getEventStats(canvasId, userId);

  res.json({
    success: true,
    stats,
  });
});
