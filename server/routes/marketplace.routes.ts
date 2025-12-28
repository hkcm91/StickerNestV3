import { Router } from 'express';
import * as marketplaceController from '../controllers/marketplace.controller.js';
import * as marketplaceItemsController from '../controllers/marketplace-items.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { browseLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import {
  publishWidgetSchema,
  widgetListQuerySchema,
  rateWidgetSchema,
  commentWidgetSchema,
  widgetPackageIdParamSchema,
  createWidgetListingSchema,
} from '../schemas/marketplace.schema.js';
import {
  createMarketplaceItemSchema,
  updateMarketplaceItemSchema,
  marketplaceItemListQuerySchema,
  publishVersionSchema,
  rateItemSchema,
  commentSchema,
} from '../schemas/marketplace-items.schema.js';

const router = Router();

// ===========================================
// New Multi-Type Marketplace Items Routes
// ===========================================

/**
 * @route GET /api/marketplace/items
 * @desc List all marketplace items (widgets, stickers, pipelines, etc.)
 * @access Public
 */
router.get(
  '/items',
  browseLimiter,
  validateQuery(marketplaceItemListQuerySchema),
  marketplaceItemsController.listItems
);

/**
 * @route POST /api/marketplace/items
 * @desc Create a new marketplace item
 * @access Private
 */
router.post(
  '/items',
  authenticate,
  validateBody(createMarketplaceItemSchema),
  marketplaceItemsController.createItem
);

/**
 * @route GET /api/marketplace/featured
 * @desc Get featured items
 * @access Public
 */
router.get(
  '/featured',
  browseLimiter,
  marketplaceItemsController.getFeatured
);

/**
 * @route GET /api/marketplace/trending
 * @desc Get trending items
 * @access Public
 */
router.get(
  '/trending',
  browseLimiter,
  marketplaceItemsController.getTrending
);

/**
 * @route GET /api/marketplace/discover
 * @desc Get discovery sections for homepage
 * @access Public
 */
router.get(
  '/discover',
  browseLimiter,
  marketplaceItemsController.getDiscoverySections
);

/**
 * @route GET /api/marketplace/my-items
 * @desc Get user's marketplace items
 * @access Private
 */
router.get(
  '/my-items',
  authenticate,
  marketplaceItemsController.getMyItems
);

/**
 * @route GET /api/marketplace/purchases
 * @desc Get user's purchased items
 * @access Private
 */
router.get(
  '/purchases',
  authenticate,
  marketplaceItemsController.getUserPurchases
);

/**
 * @route GET /api/marketplace/sticker-packs/:packId/stickers
 * @desc Get stickers from a pack
 * @access Public
 */
router.get(
  '/sticker-packs/:packId/stickers',
  browseLimiter,
  marketplaceItemsController.getStickers
);

/**
 * @route DELETE /api/marketplace/sticker-packs/:packId/stickers/:stickerId
 * @desc Remove sticker from a pack
 * @access Private
 */
router.delete(
  '/sticker-packs/:packId/stickers/:stickerId',
  authenticate,
  marketplaceItemsController.removeSticker
);

/**
 * @route GET /api/marketplace/items/:slug
 * @desc Get item by slug or ID
 * @access Public
 */
router.get(
  '/items/:slug',
  browseLimiter,
  marketplaceItemsController.getItem
);

/**
 * @route PUT /api/marketplace/items/:id
 * @desc Update a marketplace item
 * @access Private
 */
router.put(
  '/items/:id',
  authenticate,
  validateBody(updateMarketplaceItemSchema),
  marketplaceItemsController.updateItem
);

/**
 * @route DELETE /api/marketplace/items/:id
 * @desc Delete a marketplace item
 * @access Private
 */
router.delete(
  '/items/:id',
  authenticate,
  marketplaceItemsController.deleteItem
);

/**
 * @route POST /api/marketplace/items/:id/versions
 * @desc Publish a new version
 * @access Private
 */
router.post(
  '/items/:id/versions',
  authenticate,
  validateBody(publishVersionSchema),
  marketplaceItemsController.publishVersion
);

/**
 * @route POST /api/marketplace/items/:id/rate
 * @desc Rate an item
 * @access Private
 */
router.post(
  '/items/:id/rate',
  authenticate,
  validateBody(rateItemSchema),
  marketplaceItemsController.rateItem
);

/**
 * @route POST /api/marketplace/items/:id/comments
 * @desc Add a comment to an item
 * @access Private
 */
router.post(
  '/items/:id/comments',
  authenticate,
  validateBody(commentSchema),
  marketplaceItemsController.addComment
);

/**
 * @route GET /api/marketplace/items/:id/comments
 * @desc Get comments for an item
 * @access Public
 */
router.get(
  '/items/:id/comments',
  browseLimiter,
  marketplaceItemsController.getComments
);

/**
 * @route GET /api/marketplace/items/:id/ownership
 * @desc Check if user owns an item
 * @access Private
 */
router.get(
  '/items/:id/ownership',
  authenticate,
  marketplaceItemsController.checkOwnership
);

/**
 * @route POST /api/marketplace/items/:id/purchase
 * @desc Purchase an item
 * @access Private
 */
router.post(
  '/items/:id/purchase',
  authenticate,
  marketplaceItemsController.purchaseItem
);

/**
 * @route GET /api/marketplace/items/:id/related
 * @desc Get related items
 * @access Public
 */
router.get(
  '/items/:id/related',
  browseLimiter,
  marketplaceItemsController.getRelated
);

// ===========================================
// Legacy Widget Marketplace Routes
// (Kept for backward compatibility)
// ===========================================

/**
 * @route POST /api/marketplace/publish
 * @desc Publish a widget to the marketplace
 * @access Private
 */
router.post(
  '/publish',
  authenticate,
  validateBody(publishWidgetSchema),
  marketplaceController.publishWidget
);

/**
 * @route GET /api/marketplace/list
 * @desc List widgets in the marketplace
 * @access Public
 */
router.get(
  '/list',
  browseLimiter,
  validateQuery(widgetListQuerySchema),
  marketplaceController.listWidgets
);

/**
 * @route GET /api/marketplace/my-widgets
 * @desc Get user's published widgets
 * @access Private
 */
router.get(
  '/my-widgets',
  authenticate,
  marketplaceController.getMyWidgets
);

/**
 * @route GET /api/marketplace/analytics
 * @desc Get creator analytics
 * @access Private
 */
router.get(
  '/analytics',
  authenticate,
  marketplaceController.getCreatorAnalytics
);

/**
 * @route POST /api/marketplace/widgets
 * @desc Create a widget listing (simplified form for Settings page)
 * @access Private
 */
router.post(
  '/widgets',
  authenticate,
  validateBody(createWidgetListingSchema),
  marketplaceController.createWidgetListing
);

/**
 * @route GET /api/marketplace/:id
 * @desc Get a widget by ID
 * @access Public
 */
router.get(
  '/:id',
  browseLimiter,
  validateParams(widgetPackageIdParamSchema),
  marketplaceController.getWidget
);

/**
 * @route POST /api/marketplace/:id/rate
 * @desc Rate a widget
 * @access Private
 */
router.post(
  '/:id/rate',
  authenticate,
  validateParams(widgetPackageIdParamSchema),
  validateBody(rateWidgetSchema),
  marketplaceController.rateWidget
);

/**
 * @route POST /api/marketplace/:id/comment
 * @desc Add a comment to a widget
 * @access Private
 */
router.post(
  '/:id/comment',
  authenticate,
  validateParams(widgetPackageIdParamSchema),
  validateBody(commentWidgetSchema),
  marketplaceController.addComment
);

/**
 * @route GET /api/marketplace/:id/comments
 * @desc Get comments for a widget
 * @access Public
 */
router.get(
  '/:id/comments',
  browseLimiter,
  validateParams(widgetPackageIdParamSchema),
  marketplaceController.getComments
);

export default router;
