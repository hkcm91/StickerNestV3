/**
 * StickerNest v2 - Creator Routes
 *
 * API routes for creator monetization:
 * - Stripe Connect onboarding
 * - Earnings and analytics
 * - Payout requests
 */

import { Router } from 'express';
import * as creatorController from '../controllers/creator.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All creator routes require authentication
router.use(authenticate);

/**
 * @route GET /api/creator/account
 * @desc Get creator account status
 * @access Private
 */
router.get('/account', creatorController.getCreatorAccount);

/**
 * @route POST /api/creator/connect/onboard
 * @desc Start Stripe Connect onboarding
 * @access Private
 */
router.post('/connect/onboard', creatorController.startOnboarding);

/**
 * @route GET /api/creator/earnings
 * @desc Get earnings summary
 * @access Private
 */
router.get('/earnings', creatorController.getEarnings);

/**
 * @route GET /api/creator/analytics
 * @desc Get sales analytics
 * @access Private
 */
router.get('/analytics', creatorController.getAnalytics);

/**
 * @route POST /api/creator/payout/request
 * @desc Request a payout
 * @access Private
 */
router.post('/payout/request', creatorController.requestPayout);

/**
 * @route GET /api/creator/dashboard-link
 * @desc Get Stripe Express Dashboard link
 * @access Private
 */
router.get('/dashboard-link', creatorController.getDashboardLink);

/**
 * @route GET /api/creator/items
 * @desc Get creator's items with stats
 * @access Private
 */
router.get('/items', creatorController.getCreatorItems);

export default router;
