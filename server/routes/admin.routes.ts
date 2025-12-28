/**
 * StickerNest v2 - Admin Routes
 *
 * API routes for admin operations:
 * - Dashboard stats
 * - Content review queue
 * - Approval/rejection workflow
 * - User verification
 */

import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { createLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Admin rate limiter - 60 requests per minute
// Stricter than browse but allows reasonable admin workflow
const adminLimiter = createLimiter(60 * 1000, 60, 'Too many admin requests');

// All admin routes require authentication and rate limiting
router.use(authenticate);
router.use(adminLimiter);

/**
 * @route GET /api/admin/stats
 * @desc Get admin dashboard stats
 * @access Admin
 */
router.get('/stats', adminController.getStats);

/**
 * @route GET /api/admin/review/queue
 * @desc Get review queue
 * @access Admin
 */
router.get('/review/queue', adminController.getReviewQueue);

/**
 * @route POST /api/admin/review/:id/approve
 * @desc Approve an item
 * @access Admin
 */
router.post('/review/:id/approve', adminController.approveItem);

/**
 * @route POST /api/admin/review/:id/reject
 * @desc Reject an item
 * @access Admin
 */
router.post('/review/:id/reject', adminController.rejectItem);

/**
 * @route POST /api/admin/review/:id/request-changes
 * @desc Request changes on an item
 * @access Admin
 */
router.post('/review/:id/request-changes', adminController.requestChanges);

/**
 * @route GET /api/admin/review/:id/history
 * @desc Get review history for an item
 * @access Admin
 */
router.get('/review/:id/history', adminController.getReviewHistory);

/**
 * @route POST /api/admin/items/:id/featured
 * @desc Toggle featured status
 * @access Admin
 */
router.post('/items/:id/featured', adminController.toggleFeatured);

/**
 * @route POST /api/admin/users/:id/verify
 * @desc Verify a creator
 * @access Admin
 */
router.post('/users/:id/verify', adminController.verifyCreator);

/**
 * @route GET /api/admin/flagged
 * @desc Get flagged items
 * @access Admin
 */
router.get('/flagged', adminController.getFlaggedItems);

export default router;
