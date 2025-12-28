/**
 * StickerNest v2 - Payment API Routes
 *
 * Express routes for payment-related endpoints.
 */

import { Router, Request, Response } from 'express';
import type { SubscriptionTier, BillingInterval } from '../../src/payments/types';
import { getTierConfig, getTierLimits } from '../../src/payments/tiers';
import {
  getOrCreateCustomer,
  createSubscriptionCheckout,
  createPortalSession,
  cancelSubscription,
  resumeSubscription,
  changeSubscriptionTier,
  createConnectAccount,
  createConnectOnboarding,
  getConnectAccount,
  createConnectLoginLink,
  createWidgetPurchaseCheckout,
  constructWebhookEvent,
  processWebhookEvent,
} from './stripe';
import {
  requireAuth,
  requireTier,
  requireFeature,
  checkCanvasLimit,
  checkPublishLimit,
  type AuthenticatedRequest,
} from './middleware';
import { getUsageService } from './usage';
import { db } from '../db/client.js';

const router = Router();

// ============================================================================
// SUBSCRIPTION ROUTES
// ============================================================================

/**
 * GET /api/payments/subscription
 * Get current user subscription
 */
router.get('/subscription', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = req.user?.subscription;

    if (!subscription) {
      // Return free tier defaults
      return res.json({
        tier: 'free',
        status: 'active',
        limits: getTierLimits('free'),
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error('[Payments] Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

/**
 * POST /api/payments/subscription/checkout
 * Create checkout session for subscription
 */
router.post('/subscription/checkout', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tier, interval } = req.body as {
      tier: SubscriptionTier;
      interval: BillingInterval;
    };

    if (!tier || !interval) {
      return res.status(400).json({ error: 'Missing tier or interval' });
    }

    if (tier === 'free') {
      return res.status(400).json({ error: 'Cannot checkout free tier' });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      req.user!.id,
      req.user!.email
    );

    // Create checkout session
    const session = await createSubscriptionCheckout(
      customer.id,
      tier,
      interval
    );

    res.json(session);
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/subscription/portal
 * Create customer portal session
 */
router.post('/subscription/portal', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = req.user?.subscription;

    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await createPortalSession(subscription.stripeCustomerId);
    res.json(session);
  } catch (error) {
    console.error('[Payments] Portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * POST /api/payments/subscription/cancel
 * Cancel subscription
 */
router.post('/subscription/cancel', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = req.user?.subscription;
    const { immediately } = req.body as { immediately?: boolean };

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    await cancelSubscription(subscription.stripeSubscriptionId, immediately);
    res.json({ success: true });
  } catch (error) {
    console.error('[Payments] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/payments/subscription/resume
 * Resume canceled subscription
 */
router.post('/subscription/resume', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = req.user?.subscription;

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    await resumeSubscription(subscription.stripeSubscriptionId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Payments] Resume error:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

/**
 * POST /api/payments/subscription/change-tier
 * Change subscription tier
 */
router.post('/subscription/change-tier', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = req.user?.subscription;
    const { tier, interval } = req.body as {
      tier: SubscriptionTier;
      interval: BillingInterval;
    };

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    await changeSubscriptionTier(subscription.stripeSubscriptionId, tier, interval);
    res.json({ success: true });
  } catch (error) {
    console.error('[Payments] Change tier error:', error);
    res.status(500).json({ error: 'Failed to change tier' });
  }
});

// ============================================================================
// USAGE ROUTES
// ============================================================================

/**
 * GET /api/payments/usage
 * Get usage summary
 */
router.get('/usage', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usageService = getUsageService();
    const usage = await usageService.getUserUsage(req.user!.id);
    const tier = req.user?.subscription?.tier || 'free';
    const limits = getTierLimits(tier);

    res.json({
      canvases: {
        used: usage.canvasCount,
        limit: limits.maxCanvases,
      },
      widgets: {
        used: usage.widgetCount,
        limit: limits.maxWidgetsPerCanvas * limits.maxCanvases,
      },
      publishedWidgets: {
        used: usage.publishedWidgetCount,
        limit: limits.maxPublishedWidgets,
      },
      storage: {
        used: usage.storageUsedBytes,
        limit: limits.storageGB * 1024 * 1024 * 1024,
      },
      aiCredits: {
        used: usage.aiCreditsUsed,
        limit: limits.aiCreditsPerMonth,
      },
      bandwidth: {
        used: usage.bandwidthUsedBytes,
        limit: limits.bandwidthGB * 1024 * 1024 * 1024,
      },
    });
  } catch (error) {
    console.error('[Payments] Usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

/**
 * GET /api/payments/usage/check
 * Check if action is allowed
 */
router.get('/usage/check', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const action = req.query.action as string;

    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter' });
    }

    // Map actions to limit checks
    const actionLimits: Record<string, () => Promise<boolean>> = {
      'create-canvas': async () => {
        const usageService = getUsageService();
        const usage = await usageService.getUserUsage(req.user!.id);
        const tier = req.user?.subscription?.tier || 'free';
        const limits = getTierLimits(tier);
        return usage.canvasCount < limits.maxCanvases;
      },
      'create-widget': async () => {
        const usageService = getUsageService();
        const usage = await usageService.getUserUsage(req.user!.id);
        const tier = req.user?.subscription?.tier || 'free';
        const limits = getTierLimits(tier);
        return usage.widgetCount < limits.maxWidgetsPerCanvas * limits.maxCanvases;
      },
      'use-ai': async () => {
        const usageService = getUsageService();
        const usage = await usageService.getUserUsage(req.user!.id);
        const tier = req.user?.subscription?.tier || 'free';
        const limits = getTierLimits(tier);
        return usage.aiCreditsUsed < limits.aiCreditsPerMonth;
      },
      'publish-widget': async () => {
        const usageService = getUsageService();
        const usage = await usageService.getUserUsage(req.user!.id);
        const tier = req.user?.subscription?.tier || 'free';
        const limits = getTierLimits(tier);
        return usage.publishedWidgetCount < limits.maxPublishedWidgets;
      },
    };

    const checker = actionLimits[action];

    if (!checker) {
      return res.json({ allowed: true });
    }

    const allowed = await checker();
    res.json({
      allowed,
      message: allowed ? undefined : `Limit reached for ${action}`,
    });
  } catch (error) {
    console.error('[Payments] Check error:', error);
    res.status(500).json({ error: 'Failed to check action' });
  }
});

// ============================================================================
// CREATOR ROUTES
// ============================================================================

/**
 * GET /api/payments/creator
 * Get creator account status
 */
router.get('/creator', requireAuth(), requireFeature('marketplace'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: req.user!.id }
    });

    if (!creatorAccount) {
      return res.json({
        isCreator: false,
        onboardingComplete: false,
        canReceivePayments: false,
      });
    }

    res.json({
      isCreator: true,
      status: creatorAccount.status,
      onboardingComplete: creatorAccount.onboardingComplete,
      canReceivePayments: creatorAccount.chargesEnabled && creatorAccount.payoutsEnabled,
      chargesEnabled: creatorAccount.chargesEnabled,
      payoutsEnabled: creatorAccount.payoutsEnabled,
      businessName: creatorAccount.businessName,
    });
  } catch (error) {
    console.error('[Payments] Creator status error:', error);
    res.status(500).json({ error: 'Failed to get creator status' });
  }
});

/**
 * POST /api/payments/creator/onboarding
 * Start Stripe Connect onboarding
 */
router.post('/creator/onboarding', requireAuth(), requireFeature('marketplace'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Create Connect account if not exists
    const account = await createConnectAccount(
      req.user!.id,
      req.user!.email
    );

    // Create onboarding link
    const onboarding = await createConnectOnboarding(account.id);

    res.json(onboarding);
  } catch (error) {
    console.error('[Payments] Onboarding error:', error);
    res.status(500).json({ error: 'Failed to start onboarding' });
  }
});

/**
 * GET /api/payments/creator/dashboard
 * Get Stripe Connect dashboard link
 */
router.get('/creator/dashboard', requireAuth(), requireFeature('marketplace'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: req.user!.id }
    });

    if (!creatorAccount) {
      return res.status(400).json({ error: 'Creator account not found' });
    }

    if (!creatorAccount.onboardingComplete) {
      return res.status(400).json({ error: 'Please complete onboarding first' });
    }

    const loginLink = await createConnectLoginLink(creatorAccount.stripeAccountId);
    res.json({ url: loginLink });
  } catch (error) {
    console.error('[Payments] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard link' });
  }
});

/**
 * GET /api/payments/creator/earnings
 * Get creator earnings summary
 */
router.get('/creator/earnings', requireAuth(), requireFeature('marketplace'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: req.user!.id }
    });

    if (!creatorAccount) {
      return res.json({
        totalEarnings: 0,
        pendingPayout: 0,
        salesCount: 0,
        isCreator: false,
      });
    }

    res.json({
      totalEarnings: creatorAccount.totalEarnings,
      pendingPayout: creatorAccount.pendingPayout,
      salesCount: creatorAccount.totalSalesCount,
      isCreator: true,
      canReceivePayments: creatorAccount.chargesEnabled && creatorAccount.payoutsEnabled,
    });
  } catch (error) {
    console.error('[Payments] Earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

// ============================================================================
// WIDGET PURCHASE ROUTES
// ============================================================================

/**
 * GET /api/payments/widgets/:packageId/ownership
 * Check widget ownership
 */
router.get('/widgets/:packageId/ownership', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { packageId } = req.params;

    // Check if user owns this widget (either purchased or is the author)
    const [purchase, widgetPackage] = await Promise.all([
      db.widgetPurchase.findUnique({
        where: {
          userId_packageId: {
            userId: req.user!.id,
            packageId,
          }
        }
      }),
      db.widgetPackage.findUnique({
        where: { id: packageId },
        select: { authorId: true, isFree: true }
      })
    ]);

    // User owns if: they purchased it, they're the author, or it's free
    const owned = !!(
      purchase?.status === 'active' ||
      widgetPackage?.authorId === req.user!.id ||
      widgetPackage?.isFree
    );

    res.json({
      owned,
      purchaseType: purchase?.purchaseType || null,
      isAuthor: widgetPackage?.authorId === req.user!.id,
      isFree: widgetPackage?.isFree || false,
    });
  } catch (error) {
    console.error('[Payments] Ownership check error:', error);
    res.status(500).json({ error: 'Failed to check ownership' });
  }
});

/**
 * GET /api/payments/widgets/:packageId/pricing
 * Get widget pricing
 */
router.get('/widgets/:packageId/pricing', async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const widgetPackage = await db.widgetPackage.findUnique({
      where: { id: packageId },
      select: {
        isFree: true,
        oneTimePrice: true,
        monthlyPrice: true,
        yearlyPrice: true,
        stripeProductId: true,
        stripeOneTimePriceId: true,
        stripeMonthlyPriceId: true,
        stripeYearlyPriceId: true,
      }
    });

    if (!widgetPackage) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    res.json({
      isFree: widgetPackage.isFree,
      oneTimePrice: widgetPackage.oneTimePrice || 0,
      monthlyPrice: widgetPackage.monthlyPrice || 0,
      yearlyPrice: widgetPackage.yearlyPrice || 0,
      hasStripeProduct: !!widgetPackage.stripeProductId,
    });
  } catch (error) {
    console.error('[Payments] Pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

/**
 * POST /api/payments/widgets/:packageId/purchase
 * Purchase a widget
 */
router.post('/widgets/:packageId/purchase', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { packageId } = req.params;
    const { priceType } = req.body as { priceType: 'one-time' | 'monthly' | 'yearly' };

    if (!priceType || !['one-time', 'monthly', 'yearly'].includes(priceType)) {
      return res.status(400).json({ error: 'Invalid price type. Must be one-time, monthly, or yearly.' });
    }

    // Fetch widget package with author and creator account
    const widgetPackage = await db.widgetPackage.findUnique({
      where: { id: packageId },
      include: {
        author: {
          include: {
            creatorAccount: true
          }
        }
      }
    });

    if (!widgetPackage) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Check if it's free
    if (widgetPackage.isFree) {
      // For free widgets, just create a "purchase" record
      await db.widgetPurchase.upsert({
        where: {
          userId_packageId: {
            userId: req.user!.id,
            packageId,
          }
        },
        create: {
          userId: req.user!.id,
          packageId,
          purchaseType: 'one_time',
          status: 'active',
          priceAmount: 0,
          creatorEarnings: 0,
          platformFee: 0,
        },
        update: {
          status: 'active',
        }
      });

      // Increment download count
      await db.widgetPackage.update({
        where: { id: packageId },
        data: { downloads: { increment: 1 } }
      });

      return res.json({ success: true, free: true });
    }

    // Check if creator has a connected Stripe account
    if (!widgetPackage.author.creatorAccount?.stripeAccountId) {
      return res.status(400).json({ error: 'Creator has not set up payments yet' });
    }

    if (!widgetPackage.author.creatorAccount.chargesEnabled) {
      return res.status(400).json({ error: 'Creator cannot receive payments at this time' });
    }

    // Get the appropriate Stripe price ID
    let stripePriceId: string | null = null;
    switch (priceType) {
      case 'one-time':
        stripePriceId = widgetPackage.stripeOneTimePriceId;
        break;
      case 'monthly':
        stripePriceId = widgetPackage.stripeMonthlyPriceId;
        break;
      case 'yearly':
        stripePriceId = widgetPackage.stripeYearlyPriceId;
        break;
    }

    if (!stripePriceId) {
      return res.status(400).json({ error: `${priceType} pricing not available for this widget` });
    }

    // Get or create Stripe customer for buyer
    const customer = await getOrCreateCustomer(req.user!.id, req.user!.email);

    // Create checkout session with destination charge to creator
    const session = await createWidgetPurchaseCheckout(
      customer.id,
      stripePriceId,
      widgetPackage.author.creatorAccount.stripeAccountId,
      packageId,
      priceType === 'one-time' ? 'payment' : 'subscription'
    );

    res.json(session);
  } catch (error) {
    console.error('[Payments] Purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

/**
 * GET /api/payments/widgets/purchased
 * Get purchased widgets
 */
router.get('/widgets/purchased', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchases = await db.widgetPurchase.findMany({
      where: {
        userId: req.user!.id,
        status: 'active',
      },
      include: {
        package: {
          select: {
            id: true,
            packageId: true,
            name: true,
            description: true,
            category: true,
            thumbnailUrl: true,
            author: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc',
      }
    });

    res.json(purchases.map(p => ({
      purchaseId: p.id,
      purchaseType: p.purchaseType,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      widget: {
        id: p.package.id,
        packageId: p.package.packageId,
        name: p.package.name,
        description: p.package.description,
        category: p.package.category,
        thumbnailUrl: p.package.thumbnailUrl,
        authorId: p.package.author.id,
        authorName: p.package.author.username,
      }
    })));
  } catch (error) {
    console.error('[Payments] Purchased widgets error:', error);
    res.status(500).json({ error: 'Failed to get purchased widgets' });
  }
});

// ============================================================================
// WEBHOOK ROUTE
// ============================================================================

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  try {
    // Parse raw body for webhook verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const event = constructWebhookEvent(rawBody, signature);

    // Process the event
    await processWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    console.error('[Payments] Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export { router as paymentRoutes };
