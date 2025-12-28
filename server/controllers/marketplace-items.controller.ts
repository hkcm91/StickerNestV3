import { Request, Response } from 'express';
import { marketplaceItemsService } from '../services/marketplace-items.service.js';
import { marketplacePurchaseService, type PurchaseType } from '../services/marketplace-purchase.service.js';
import { marketplaceDiscoveryService } from '../services/marketplace-discovery.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  createMarketplaceItemSchema,
  updateMarketplaceItemSchema,
  marketplaceItemListQuerySchema,
  publishVersionSchema,
  rateItemSchema,
  commentSchema,
  marketplaceItemTypeSchema,
} from '../schemas/marketplace-items.schema.js';
import type {
  CreateMarketplaceItemInput,
  UpdateMarketplaceItemInput,
  MarketplaceItemListQuery,
  PublishVersionInput,
  RateItemInput,
  CommentInput,
  MarketplaceItemType,
} from '../schemas/marketplace-items.schema.js';

/**
 * List marketplace items
 * GET /api/marketplace/items
 */
export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const query = marketplaceItemListQuerySchema.parse(req.query) as MarketplaceItemListQuery;
  const result = await marketplaceItemsService.list(query);

  res.json({
    success: true,
    items: result.items,
    total: result.pagination.total,
    page: result.pagination.page,
    pageSize: result.pagination.pageSize,
    totalPages: result.pagination.totalPages,
  });
});

/**
 * Get item by slug or ID
 * GET /api/marketplace/items/:slug
 */
export const getItem = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const item = await marketplaceItemsService.getBySlugOrId(slug);

  // If it's a sticker pack, also get stickers
  let stickers;
  if (item.itemType === 'sticker_pack') {
    stickers = await marketplaceItemsService.getStickers(item.id);
  }

  res.json({
    success: true,
    item,
    stickers,
  });
});

/**
 * Create a new marketplace item
 * POST /api/marketplace/items
 */
export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input = createMarketplaceItemSchema.parse(req.body) as CreateMarketplaceItemInput;

  const item = await marketplaceItemsService.create(userId, input);

  res.status(201).json({
    success: true,
    item,
  });
});

/**
 * Update a marketplace item
 * PUT /api/marketplace/items/:id
 */
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const input = updateMarketplaceItemSchema.parse(req.body) as UpdateMarketplaceItemInput;

  const item = await marketplaceItemsService.update(userId, id, input);

  res.json({
    success: true,
    item,
  });
});

/**
 * Delete a marketplace item
 * DELETE /api/marketplace/items/:id
 */
export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await marketplaceItemsService.delete(userId, id);

  res.json({
    success: true,
    message: 'Item deleted successfully',
  });
});

/**
 * Publish a new version
 * POST /api/marketplace/items/:id/versions
 */
export const publishVersion = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const input = publishVersionSchema.parse(req.body) as PublishVersionInput;

  const version = await marketplaceItemsService.publishVersion(userId, id, input);

  res.status(201).json({
    success: true,
    version,
  });
});

/**
 * Rate an item
 * POST /api/marketplace/items/:id/rate
 */
export const rateItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const input = rateItemSchema.parse(req.body) as RateItemInput;

  await marketplaceItemsService.rate(userId, id, input);

  res.json({
    success: true,
    message: 'Rating submitted',
  });
});

/**
 * Add a comment
 * POST /api/marketplace/items/:id/comments
 */
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const input = commentSchema.parse(req.body) as CommentInput;

  const comment = await marketplaceItemsService.addComment(userId, id, input);

  res.status(201).json({
    success: true,
    comment,
  });
});

/**
 * Get comments for an item
 * GET /api/marketplace/items/:id/comments
 */
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const result = await marketplaceItemsService.getComments(id, page, pageSize);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get my marketplace items
 * GET /api/marketplace/my-items
 */
export const getMyItems = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const itemType = req.query.itemType as MarketplaceItemType | undefined;

  // Validate itemType if provided
  if (itemType) {
    marketplaceItemTypeSchema.parse(itemType);
  }

  const items = await marketplaceItemsService.getMyItems(userId, itemType);

  res.json({
    success: true,
    items,
  });
});

/**
 * Get featured items
 * GET /api/marketplace/featured
 */
export const getFeatured = asyncHandler(async (req: Request, res: Response) => {
  const itemType = req.query.itemType as MarketplaceItemType | undefined;

  // Validate itemType if provided
  if (itemType) {
    marketplaceItemTypeSchema.parse(itemType);
  }

  const items = await marketplaceItemsService.getFeatured(itemType);

  res.json({
    success: true,
    items,
  });
});

/**
 * Get trending items
 * GET /api/marketplace/trending
 */
export const getTrending = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const category = req.query.category as string | undefined;
  const itemType = req.query.itemType as string | undefined;
  const priceRange = req.query.priceRange as 'free' | 'paid' | 'all' | undefined;

  const items = await marketplaceDiscoveryService.getTrending(limit, {
    category,
    itemType,
    priceRange,
  });

  res.json({
    success: true,
    items,
  });
});

/**
 * Get discovery sections for homepage
 * GET /api/marketplace/discover
 */
export const getDiscoverySections = asyncHandler(async (_req: Request, res: Response) => {
  const sections = await marketplaceDiscoveryService.getDiscoverySections();

  res.json({
    success: true,
    sections,
  });
});

/**
 * Get related items
 * GET /api/marketplace/items/:id/related
 */
export const getRelated = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 8;

  const items = await marketplaceDiscoveryService.getRelated(id, limit);

  res.json({
    success: true,
    items,
  });
});

/**
 * Get stickers from a pack
 * GET /api/marketplace/sticker-packs/:packId/stickers
 */
export const getStickers = asyncHandler(async (req: Request, res: Response) => {
  const { packId } = req.params;
  const stickers = await marketplaceItemsService.getStickers(packId);

  res.json({
    success: true,
    stickers,
  });
});

/**
 * Remove sticker from a pack
 * DELETE /api/marketplace/sticker-packs/:packId/stickers/:stickerId
 */
export const removeSticker = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { packId, stickerId } = req.params;

  await marketplaceItemsService.removeSticker(userId, packId, stickerId);

  res.json({
    success: true,
    message: 'Sticker removed successfully',
  });
});

/**
 * Check ownership of an item
 * GET /api/marketplace/items/:id/ownership
 */
export const checkOwnership = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const result = await marketplaceItemsService.checkOwnership(userId, id);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Purchase an item
 * POST /api/marketplace/items/:id/purchase
 *
 * Body: { purchaseType?: 'one_time' | 'monthly' | 'yearly' }
 */
export const purchaseItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const purchaseType = (req.body.purchaseType || 'one_time') as PurchaseType;

  // Validate purchase type
  if (!['one_time', 'monthly', 'yearly'].includes(purchaseType)) {
    res.status(400).json({
      success: false,
      error: 'Invalid purchase type. Must be one_time, monthly, or yearly',
    });
    return;
  }

  const result = await marketplacePurchaseService.initiatePurchase(
    userId,
    id,
    purchaseType
  );

  res.json(result);
});

/**
 * Get user's purchased items
 * GET /api/marketplace/purchases
 */
export const getUserPurchases = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const purchases = await marketplacePurchaseService.getUserPurchases(userId);

  res.json({
    success: true,
    purchases,
  });
});
