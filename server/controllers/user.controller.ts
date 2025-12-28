import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Subscription tier limits
 */
const TIER_LIMITS = {
  free: {
    canvasLimit: 3,
    aiCreditsLimit: 50,
    storageLimit: 100 * 1024 * 1024, // 100 MB
  },
  pro: {
    canvasLimit: -1, // unlimited
    aiCreditsLimit: 500,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5 GB
  },
  creator: {
    canvasLimit: -1, // unlimited
    aiCreditsLimit: -1, // unlimited
    storageLimit: 50 * 1024 * 1024 * 1024, // 50 GB
  },
} as const;

/**
 * Get user stats (for dashboard)
 * GET /api/user/stats
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Not authenticated',
      },
    });
    return;
  }

  const userId = req.user.userId;

  // Get or create usage record
  let usageRecord = await db.usageRecord.findUnique({
    where: { userId },
  });

  if (!usageRecord) {
    // Create a new usage record if one doesn't exist
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    usageRecord = await db.usageRecord.create({
      data: {
        userId,
        periodStart: now,
        periodEnd,
      },
    });
  }

  // Get subscription tier for limits
  const subscription = await db.userSubscription.findUnique({
    where: { userId },
  });

  const tier = subscription?.tier || 'free';
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  // Get actual counts from database
  const [canvasCount, widgetInstanceCount, totalViews] = await Promise.all([
    db.canvas.count({ where: { userId } }),
    db.widgetInstance.count({
      where: {
        canvas: { userId },
      },
    }),
    db.canvas.aggregate({
      where: { userId },
      _sum: { viewCount: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      canvasCount,
      widgetCount: widgetInstanceCount,
      totalViews: totalViews._sum.viewCount || 0,
      totalAiGenerations: usageRecord.aiCreditsUsed,
      storageUsed: Number(usageRecord.storageUsedBytes),
      storageLimit: limits.storageLimit,
    },
  });
});

/**
 * Update user profile
 * PUT /api/user/profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Not authenticated',
      },
    });
    return;
  }

  const userId = req.user.userId;
  const { username, avatarUrl } = req.body;

  // Validate username if provided
  if (username !== undefined) {
    if (typeof username !== 'string' || username.length < 2 || username.length > 50) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username must be between 2 and 50 characters',
        },
      });
      return;
    }

    // Check if username is already taken
    const existingUser = await db.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username is already taken',
        },
      });
      return;
    }
  }

  // Build update data
  const updateData: Record<string, any> = {};
  if (username !== undefined) updateData.username = username;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  // Update user
  const updatedUser = await db.user.update({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      subscription: {
        select: {
          tier: true,
          status: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: 'user',
        createdAt: updatedUser.createdAt.toISOString(),
        subscription: updatedUser.subscription
          ? {
              tier: updatedUser.subscription.tier,
              status: updatedUser.subscription.status,
            }
          : undefined,
      },
    },
  });
});

/**
 * Get user usage details
 * GET /api/user/usage
 */
export const getUsage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Not authenticated',
      },
    });
    return;
  }

  const userId = req.user.userId;

  const [usageRecord, subscription] = await Promise.all([
    db.usageRecord.findUnique({ where: { userId } }),
    db.userSubscription.findUnique({ where: { userId } }),
  ]);

  const tier = subscription?.tier || 'free';
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  res.json({
    success: true,
    data: {
      tier,
      usage: {
        canvases: usageRecord?.canvasCount || 0,
        widgets: usageRecord?.widgetCount || 0,
        publishedWidgets: usageRecord?.publishedWidgetCount || 0,
        aiCredits: usageRecord?.aiCreditsUsed || 0,
        storage: Number(usageRecord?.storageUsedBytes || 0),
        bandwidth: Number(usageRecord?.bandwidthUsedBytes || 0),
      },
      limits: {
        canvases: limits.canvasLimit,
        aiCredits: limits.aiCreditsLimit,
        storage: limits.storageLimit,
      },
      period: {
        start: usageRecord?.periodStart?.toISOString(),
        end: usageRecord?.periodEnd?.toISOString(),
      },
    },
  });
});
