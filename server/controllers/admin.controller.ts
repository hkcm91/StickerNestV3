/**
 * StickerNest v2 - Admin Controller
 *
 * API handlers for admin operations.
 */

import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Get admin dashboard stats
 * GET /api/admin/stats
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await adminService.requireAdmin(userId);

  const stats = await adminService.getDashboardStats();

  res.json({
    success: true,
    stats,
  });
});

/**
 * Get review queue
 * GET /api/admin/review/queue
 */
export const getReviewQueue = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await adminService.requireAdmin(userId);

  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const itemType = req.query.itemType as string | undefined;

  const result = await adminService.getReviewQueue(limit, offset, itemType);

  res.json({
    success: true,
    items: result.items,
    total: result.total,
    limit,
    offset,
  });
});

/**
 * Approve an item
 * POST /api/admin/review/:id/approve
 */
export const approveItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { notes } = req.body;

  await adminService.approveItem(userId, id, notes);

  res.json({
    success: true,
    message: 'Item approved successfully',
  });
});

/**
 * Reject an item
 * POST /api/admin/review/:id/reject
 */
export const rejectItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { reason, notes } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Rejection reason is required',
    });
  }

  await adminService.rejectItem(userId, id, reason, notes);

  res.json({
    success: true,
    message: 'Item rejected',
  });
});

/**
 * Request changes on an item
 * POST /api/admin/review/:id/request-changes
 */
export const requestChanges = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { reason, notes } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Reason for changes is required',
    });
  }

  await adminService.requestChanges(userId, id, reason, notes);

  res.json({
    success: true,
    message: 'Change request sent',
  });
});

/**
 * Get review history for an item
 * GET /api/admin/review/:id/history
 */
export const getReviewHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await adminService.requireAdmin(userId);

  const { id } = req.params;
  const history = await adminService.getReviewHistory(id);

  res.json({
    success: true,
    history,
  });
});

/**
 * Toggle featured status
 * POST /api/admin/items/:id/featured
 */
export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { featured } = req.body;

  await adminService.toggleFeatured(userId, id, featured === true);

  res.json({
    success: true,
    message: `Item ${featured ? 'featured' : 'unfeatured'}`,
  });
});

/**
 * Verify a creator
 * POST /api/admin/users/:id/verify
 */
export const verifyCreator = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const { id } = req.params;

  await adminService.verifyCreator(adminId, id);

  res.json({
    success: true,
    message: 'Creator verified',
  });
});

/**
 * Get flagged items
 * GET /api/admin/flagged
 */
export const getFlaggedItems = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await adminService.requireAdmin(userId);

  const limit = parseInt(req.query.limit as string) || 20;
  const items = await adminService.getFlaggedItems(limit);

  res.json({
    success: true,
    items,
  });
});
