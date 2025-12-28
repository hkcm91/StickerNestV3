/**
 * StickerNest v2 - Subscription Enforcement Middleware
 *
 * Server-side middleware to enforce subscription tier limits.
 * Validates user actions against their subscription plan.
 */

import type { Request, Response, NextFunction } from 'express';
import type { SubscriptionTier, TierLimits, UserSubscription } from '../../src/payments/types';
import { SUBSCRIPTION_TIERS, getTierConfig } from '../../src/payments/tiers';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscription?: UserSubscription;
  };
}

export interface UsageData {
  canvasCount: number;
  widgetCount: number;
  publishedWidgetCount: number;
  storageUsedBytes: number;
  aiCreditsUsed: number;
  bandwidthUsedBytes: number;
}

export type LimitType =
  | 'canvas'
  | 'widget'
  | 'published_widget'
  | 'storage'
  | 'ai_credits'
  | 'bandwidth';

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  message?: string;
}

// ============================================================================
// USAGE SERVICE INTERFACE
// ============================================================================

/**
 * Interface for the usage tracking service
 * Implementation should be injected or imported from a separate module
 */
export interface IUsageService {
  getUserUsage(userId: string): Promise<UsageData>;
  incrementUsage(userId: string, type: LimitType, amount?: number): Promise<void>;
  decrementUsage(userId: string, type: LimitType, amount?: number): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;
}

// ============================================================================
// IN-MEMORY USAGE STORE (DEVELOPMENT ONLY)
// ============================================================================

const inMemoryUsage: Map<string, UsageData> = new Map();

function getDefaultUsage(): UsageData {
  return {
    canvasCount: 0,
    widgetCount: 0,
    publishedWidgetCount: 0,
    storageUsedBytes: 0,
    aiCreditsUsed: 0,
    bandwidthUsedBytes: 0,
  };
}

/**
 * Development-only in-memory usage service
 */
export const devUsageService: IUsageService = {
  async getUserUsage(userId: string): Promise<UsageData> {
    return inMemoryUsage.get(userId) || getDefaultUsage();
  },

  async incrementUsage(userId: string, type: LimitType, amount: number = 1): Promise<void> {
    const usage = inMemoryUsage.get(userId) || getDefaultUsage();

    switch (type) {
      case 'canvas':
        usage.canvasCount += amount;
        break;
      case 'widget':
        usage.widgetCount += amount;
        break;
      case 'published_widget':
        usage.publishedWidgetCount += amount;
        break;
      case 'storage':
        usage.storageUsedBytes += amount;
        break;
      case 'ai_credits':
        usage.aiCreditsUsed += amount;
        break;
      case 'bandwidth':
        usage.bandwidthUsedBytes += amount;
        break;
    }

    inMemoryUsage.set(userId, usage);
  },

  async decrementUsage(userId: string, type: LimitType, amount: number = 1): Promise<void> {
    const usage = inMemoryUsage.get(userId) || getDefaultUsage();

    switch (type) {
      case 'canvas':
        usage.canvasCount = Math.max(0, usage.canvasCount - amount);
        break;
      case 'widget':
        usage.widgetCount = Math.max(0, usage.widgetCount - amount);
        break;
      case 'published_widget':
        usage.publishedWidgetCount = Math.max(0, usage.publishedWidgetCount - amount);
        break;
      case 'storage':
        usage.storageUsedBytes = Math.max(0, usage.storageUsedBytes - amount);
        break;
      case 'ai_credits':
        usage.aiCreditsUsed = Math.max(0, usage.aiCreditsUsed - amount);
        break;
      case 'bandwidth':
        usage.bandwidthUsedBytes = Math.max(0, usage.bandwidthUsedBytes - amount);
        break;
    }

    inMemoryUsage.set(userId, usage);
  },

  async resetMonthlyUsage(userId: string): Promise<void> {
    const usage = inMemoryUsage.get(userId) || getDefaultUsage();
    usage.aiCreditsUsed = 0;
    usage.bandwidthUsedBytes = 0;
    inMemoryUsage.set(userId, usage);
  },
};

// ============================================================================
// LIMIT CHECKING
// ============================================================================

let usageService: IUsageService = devUsageService;

/**
 * Set the usage service implementation
 */
export function setUsageService(service: IUsageService): void {
  usageService = service;
}

/**
 * Get tier limits for a subscription
 */
function getTierLimits(tier: SubscriptionTier): TierLimits {
  return getTierConfig(tier).limits;
}

/**
 * Check if a specific limit would be exceeded
 */
export async function checkLimit(
  userId: string,
  tier: SubscriptionTier,
  limitType: LimitType,
  additionalAmount: number = 1
): Promise<LimitCheckResult> {
  const limits = getTierLimits(tier);
  const usage = await usageService.getUserUsage(userId);

  let current: number;
  let limit: number;

  switch (limitType) {
    case 'canvas':
      current = usage.canvasCount;
      limit = limits.maxCanvases;
      break;
    case 'widget':
      current = usage.widgetCount;
      limit = limits.maxWidgetsPerCanvas * limits.maxCanvases; // Total widgets
      break;
    case 'published_widget':
      current = usage.publishedWidgetCount;
      limit = limits.maxPublishedWidgets;
      break;
    case 'storage':
      current = usage.storageUsedBytes;
      limit = limits.storageGB * 1024 * 1024 * 1024; // Convert GB to bytes
      break;
    case 'ai_credits':
      current = usage.aiCreditsUsed;
      limit = limits.aiCreditsPerMonth;
      break;
    case 'bandwidth':
      current = usage.bandwidthUsedBytes;
      limit = limits.bandwidthGB * 1024 * 1024 * 1024; // Convert GB to bytes
      break;
    default:
      return { allowed: true, limit: Infinity, current: 0, remaining: Infinity };
  }

  const wouldExceed = current + additionalAmount > limit;
  const remaining = Math.max(0, limit - current);

  return {
    allowed: !wouldExceed,
    limit,
    current,
    remaining,
    message: wouldExceed
      ? `${limitType} limit exceeded. Current: ${current}, Limit: ${limit}, Requested: ${additionalAmount}`
      : undefined,
  };
}

/**
 * Check all relevant limits for an action
 */
export async function checkAllLimits(
  userId: string,
  tier: SubscriptionTier,
  checks: Array<{ type: LimitType; amount?: number }>
): Promise<{ allowed: boolean; results: Record<LimitType, LimitCheckResult> }> {
  const results: Record<string, LimitCheckResult> = {};
  let allowed = true;

  for (const check of checks) {
    const result = await checkLimit(userId, tier, check.type, check.amount ?? 1);
    results[check.type] = result;
    if (!result.allowed) {
      allowed = false;
    }
  }

  return { allowed, results: results as Record<LimitType, LimitCheckResult> };
}

// ============================================================================
// MIDDLEWARE FACTORIES
// ============================================================================

/**
 * Middleware to require authentication
 */
export function requireAuth() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }
    next();
  };
}

/**
 * Middleware to require a minimum subscription tier
 */
export function requireTier(minimumTier: SubscriptionTier) {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  const minimumIndex = tierOrder.indexOf(minimumTier);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const userTier = req.user.subscription?.tier || 'free';
    const userIndex = tierOrder.indexOf(userTier);

    if (userIndex < minimumIndex) {
      return res.status(403).json({
        error: `This feature requires ${minimumTier} tier or higher`,
        code: 'INSUFFICIENT_TIER',
        requiredTier: minimumTier,
        currentTier: userTier,
      });
    }

    next();
  };
}

/**
 * Middleware to check a specific limit before allowing an action
 */
export function checkLimitMiddleware(limitType: LimitType, getAmount?: (req: Request) => number) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const tier = req.user.subscription?.tier || 'free';
    const amount = getAmount ? getAmount(req) : 1;
    const result = await checkLimit(req.user.id, tier, limitType, amount);

    if (!result.allowed) {
      return res.status(403).json({
        error: result.message,
        code: 'LIMIT_EXCEEDED',
        limitType,
        limit: result.limit,
        current: result.current,
        remaining: result.remaining,
      });
    }

    // Attach result to request for later use
    (req as any).limitCheck = result;
    next();
  };
}

/**
 * Middleware to check canvas creation limit
 */
export function checkCanvasLimit() {
  return checkLimitMiddleware('canvas');
}

/**
 * Middleware to check widget creation limit
 */
export function checkWidgetLimit() {
  return checkLimitMiddleware('widget');
}

/**
 * Middleware to check widget publishing limit
 */
export function checkPublishLimit() {
  return checkLimitMiddleware('published_widget');
}

/**
 * Middleware to check AI credit usage
 */
export function checkAICredits(getCredits?: (req: Request) => number) {
  return checkLimitMiddleware('ai_credits', getCredits);
}

/**
 * Middleware to check storage limit
 */
export function checkStorageLimit(getBytes?: (req: Request) => number) {
  return checkLimitMiddleware('storage', getBytes);
}

/**
 * Middleware to track and enforce bandwidth
 */
export function trackBandwidth() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const tier = req.user.subscription?.tier || 'free';

    // Estimate request size
    const requestSize = parseInt(req.headers['content-length'] || '0', 10);

    // Check bandwidth limit
    const result = await checkLimit(req.user.id, tier, 'bandwidth', requestSize);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Bandwidth limit exceeded',
        code: 'BANDWIDTH_EXCEEDED',
        limit: result.limit,
        current: result.current,
      });
    }

    // Track request bandwidth
    await usageService.incrementUsage(req.user.id, 'bandwidth', requestSize);

    // Track response bandwidth
    const originalSend = res.send.bind(res);
    res.send = function(body: any) {
      const responseSize = Buffer.byteLength(body || '', 'utf8');
      usageService.incrementUsage(req.user!.id, 'bandwidth', responseSize);
      return originalSend(body);
    };

    next();
  };
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof TierLimits['features']): boolean {
  const limits = getTierLimits(tier);
  return limits.features[feature] ?? false;
}

/**
 * Middleware to require a specific feature
 */
export function requireFeature(feature: keyof TierLimits['features']) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const tier = req.user.subscription?.tier || 'free';

    if (!hasFeature(tier, feature)) {
      return res.status(403).json({
        error: `This feature requires a higher subscription tier`,
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        currentTier: tier,
      });
    }

    next();
  };
}

// ============================================================================
// USAGE TRACKING HELPERS
// ============================================================================

/**
 * Track canvas creation
 */
export async function trackCanvasCreated(userId: string): Promise<void> {
  await usageService.incrementUsage(userId, 'canvas');
}

/**
 * Track canvas deletion
 */
export async function trackCanvasDeleted(userId: string): Promise<void> {
  await usageService.decrementUsage(userId, 'canvas');
}

/**
 * Track widget creation
 */
export async function trackWidgetCreated(userId: string): Promise<void> {
  await usageService.incrementUsage(userId, 'widget');
}

/**
 * Track widget deletion
 */
export async function trackWidgetDeleted(userId: string): Promise<void> {
  await usageService.decrementUsage(userId, 'widget');
}

/**
 * Track widget publishing
 */
export async function trackWidgetPublished(userId: string): Promise<void> {
  await usageService.incrementUsage(userId, 'published_widget');
}

/**
 * Track AI credit usage
 */
export async function trackAICredits(userId: string, credits: number): Promise<void> {
  await usageService.incrementUsage(userId, 'ai_credits', credits);
}

/**
 * Track storage usage
 */
export async function trackStorageUsed(userId: string, bytes: number): Promise<void> {
  await usageService.incrementUsage(userId, 'storage', bytes);
}

/**
 * Track storage freed
 */
export async function trackStorageFreed(userId: string, bytes: number): Promise<void> {
  await usageService.decrementUsage(userId, 'storage', bytes);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { usageService };
