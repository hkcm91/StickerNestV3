/**
 * StickerNest v2 - Creator Controller
 *
 * Handles creator-related API endpoints:
 * - Stripe Connect onboarding
 * - Earnings summary and analytics
 * - Payout requests
 * - Item management
 */

import { Request, Response } from 'express';
import { creatorEarningsService } from '../services/creator-earnings.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { db } from '../db/client.js';

/**
 * Get creator account status
 * GET /api/creator/account
 */
export const getCreatorAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const account = await creatorEarningsService.getOrCreateCreatorAccount(userId);

  res.json({
    success: true,
    account,
  });
});

/**
 * Start Stripe Connect onboarding
 * POST /api/creator/connect/onboard
 */
export const startOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { email, country = 'US' } = req.body;

  // Use user's email if not provided
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const result = await creatorEarningsService.startConnectOnboarding(
    userId,
    email || user?.email || '',
    country
  );

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get earnings summary
 * GET /api/creator/earnings
 */
export const getEarnings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const summary = await creatorEarningsService.getEarningsSummary(userId);

  res.json({
    success: true,
    ...summary,
  });
});

/**
 * Get sales analytics
 * GET /api/creator/analytics
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const days = parseInt(req.query.days as string) || 30;

  const analytics = await creatorEarningsService.getSalesAnalytics(userId, days);

  res.json({
    success: true,
    ...analytics,
  });
});

/**
 * Request a payout
 * POST /api/creator/payout/request
 */
export const requestPayout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await creatorEarningsService.requestPayout(userId);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.json({
    success: true,
    transferId: result.transferId,
    amount: result.amount,
  });
});

/**
 * Get Stripe Express Dashboard link
 * GET /api/creator/dashboard-link
 */
export const getDashboardLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const url = await creatorEarningsService.getDashboardLink(userId);

  res.json({
    success: true,
    url,
  });
});

/**
 * Get creator's items with stats
 * GET /api/creator/items
 */
export const getCreatorItems = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const items = await creatorEarningsService.getCreatorItems(userId);

  res.json({
    success: true,
    items,
  });
});
