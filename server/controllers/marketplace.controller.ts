import { Request, Response } from 'express';
import { marketplaceService } from '../services/marketplace.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type {
  PublishWidgetInput,
  WidgetListQuery,
  RateWidgetInput,
  CommentWidgetInput,
  CreateWidgetListingInput,
} from '../schemas/marketplace.schema.js';

/**
 * Publish a widget
 * POST /api/marketplace/publish
 */
export const publishWidget = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input: PublishWidgetInput = req.body;

  const widget = await marketplaceService.publishWidget(userId, input);

  res.status(201).json({
    success: true,
    widget,
  });
});

/**
 * List widgets in marketplace
 * GET /api/marketplace/list
 */
export const listWidgets = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as WidgetListQuery;

  const result = await marketplaceService.listWidgets(query);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get a widget by ID
 * GET /api/marketplace/:id
 */
export const getWidget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const widget = await marketplaceService.getWidget(id);

  res.json({
    success: true,
    widget,
  });
});

/**
 * Rate a widget
 * POST /api/marketplace/:id/rate
 */
export const rateWidget = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const input: RateWidgetInput = req.body;

  await marketplaceService.rateWidget(id, userId, input);

  res.json({
    success: true,
    message: 'Rating submitted',
  });
});

/**
 * Add a comment to a widget
 * POST /api/marketplace/:id/comment
 */
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const input: CommentWidgetInput = req.body;

  const comment = await marketplaceService.addComment(id, userId, input);

  res.status(201).json({
    success: true,
    comment,
  });
});

/**
 * Get comments for a widget
 * GET /api/marketplace/:id/comments
 */
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const comments = await marketplaceService.getComments(id);

  res.json({
    success: true,
    comments,
  });
});

/**
 * Get user's published widgets
 * GET /api/marketplace/my-widgets
 */
export const getMyWidgets = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const widgets = await marketplaceService.getMyWidgets(userId);

  res.json({
    success: true,
    data: widgets,
  });
});

/**
 * Create a widget listing (simplified)
 * POST /api/marketplace/widgets
 */
export const createWidgetListing = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input: CreateWidgetListingInput = req.body;

  const widget = await marketplaceService.createWidgetListing(userId, input);

  res.status(201).json({
    success: true,
    widget,
  });
});

/**
 * Get creator analytics
 * GET /api/marketplace/analytics
 */
export const getCreatorAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const analytics = await marketplaceService.getCreatorAnalytics(userId);

  res.json({
    success: true,
    data: analytics,
  });
});
