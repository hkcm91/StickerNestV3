/**
 * StickerNest v2 - Creator Earnings Service
 *
 * Manages creator earnings, analytics, and payout operations.
 * Integrates with Stripe Connect for payouts.
 *
 * ARCHITECTURE NOTES:
 * - 85/15 revenue split (creator/platform)
 * - Earnings tracked per purchase in MarketplacePurchase
 * - Aggregated in CreatorAccount for quick access
 * - Minimum payout threshold: $10 (1000 cents)
 */

import Stripe from 'stripe';
import { db } from '../db/client.js';
import { log } from '../utils/logger.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/AppErrors.js';
import { platformSettings } from '../config/stripe.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const MINIMUM_PAYOUT = platformSettings.minimumPayoutAmount; // 1000 cents = $10

// Initialize Stripe
const isStripeConfigured = Boolean(STRIPE_SECRET_KEY?.startsWith('sk_'));
let stripe: Stripe | null = null;

if (isStripeConfigured) {
  stripe = new Stripe(STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

function requireStripe(): Stripe {
  if (!stripe) {
    throw new BadRequestError('Payments are not configured');
  }
  return stripe;
}

// ============================================================================
// TYPES
// ============================================================================

export interface EarningsSummary {
  totalEarnings: number;       // Lifetime earnings in cents
  availableBalance: number;    // Ready for payout in cents
  pendingBalance: number;      // Processing payments not yet available
  totalPaidOut: number;        // Total transferred to creator's bank
  totalSalesCount: number;     // Total sales
  thisMonthEarnings: number;   // Current month earnings
  thisMonthSales: number;      // Current month sales count
  canRequestPayout: boolean;   // Meets minimum threshold
  accountStatus: string;       // Creator account status
}

export interface SalesAnalytics {
  dailySales: Array<{ date: string; sales: number; revenue: number }>;
  topItems: Array<{ id: string; name: string; sales: number; revenue: number; downloads: number; rating: number }>;
  totalRevenue: number;
  totalSales: number;
  revenueByPeriod: {
    week: number;
    month: number;
    year: number;
  };
}

export interface ConnectOnboardingResult {
  accountId: string;
  onboardingUrl: string;
}

export interface PayoutResult {
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
}

// ============================================================================
// CREATOR EARNINGS SERVICE
// ============================================================================

export class CreatorEarningsService {
  /**
   * Get or create a creator account for a user
   */
  async getOrCreateCreatorAccount(userId: string): Promise<{
    id: string;
    stripeAccountId: string | null;
    status: string;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }> {
    let account = await db.creatorAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      // Create a placeholder - actual Stripe account created during onboarding
      account = await db.creatorAccount.create({
        data: {
          userId,
          stripeAccountId: '',  // Will be set during onboarding
          status: 'pending',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        },
      });
    }

    return {
      id: account.id,
      stripeAccountId: account.stripeAccountId || null,
      status: account.status,
      onboardingComplete: account.onboardingComplete,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
    };
  }

  /**
   * Start Stripe Connect onboarding
   */
  async startConnectOnboarding(
    userId: string,
    email: string,
    country: string = 'US'
  ): Promise<ConnectOnboardingResult> {
    const stripeClient = requireStripe();

    // Get existing creator account
    let creatorAccount = await db.creatorAccount.findUnique({
      where: { userId },
    });

    let stripeAccountId: string;

    if (creatorAccount?.stripeAccountId) {
      // Use existing Stripe account
      stripeAccountId = creatorAccount.stripeAccountId;
    } else {
      // Create new Stripe Express account
      const account = await stripeClient.accounts.create({
        type: 'express',
        email,
        country,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { userId },
      });
      stripeAccountId = account.id;

      // Update or create creator account
      if (creatorAccount) {
        await db.creatorAccount.update({
          where: { id: creatorAccount.id },
          data: {
            stripeAccountId,
            status: 'onboarding',
            country,
          },
        });
      } else {
        await db.creatorAccount.create({
          data: {
            userId,
            stripeAccountId,
            status: 'onboarding',
            country,
          },
        });
      }
    }

    // Create onboarding link
    const accountLink = await stripeClient.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${APP_URL}/settings?tab=creator&refresh=true`,
      return_url: `${APP_URL}/settings?tab=creator&connected=true`,
      type: 'account_onboarding',
    });

    return {
      accountId: stripeAccountId,
      onboardingUrl: accountLink.url,
    };
  }

  /**
   * Get creator earnings summary
   */
  async getEarningsSummary(userId: string): Promise<EarningsSummary> {
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId },
    });

    if (!creatorAccount) {
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalPaidOut: 0,
        totalSalesCount: 0,
        thisMonthEarnings: 0,
        thisMonthSales: 0,
        canRequestPayout: false,
        accountStatus: 'not_setup',
      };
    }

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await db.marketplacePurchase.aggregate({
      where: {
        item: { authorId: userId },
        status: 'active',
        purchasedAt: { gte: startOfMonth },
      },
      _sum: { creatorEarnings: true },
      _count: true,
    });

    // Calculate total paid out (total - pending = paid)
    const totalPaidOut = Math.max(0, creatorAccount.totalEarnings - creatorAccount.pendingPayout);

    return {
      totalEarnings: creatorAccount.totalEarnings,
      availableBalance: creatorAccount.pendingPayout, // Ready for payout
      pendingBalance: 0, // Would be calculated from recent payments not yet available
      totalPaidOut,
      totalSalesCount: creatorAccount.totalSalesCount,
      thisMonthEarnings: monthlyStats._sum.creatorEarnings || 0,
      thisMonthSales: monthlyStats._count || 0,
      canRequestPayout: creatorAccount.pendingPayout >= MINIMUM_PAYOUT && creatorAccount.payoutsEnabled,
      accountStatus: creatorAccount.status,
    };
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(userId: string, days: number = 30): Promise<SalesAnalytics> {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily sales
    const purchases = await db.marketplacePurchase.findMany({
      where: {
        item: { authorId: userId },
        status: 'active',
        purchasedAt: { gte: startDate },
      },
      include: {
        item: { select: { id: true, name: true, downloads: true, rating: true } },
      },
      orderBy: { purchasedAt: 'asc' },
    });

    // Aggregate by day
    const dailyMap = new Map<string, { sales: number; revenue: number }>();
    const itemStats = new Map<string, { name: string; sales: number; revenue: number; downloads: number; rating: number }>();

    // Calculate period boundaries
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    let weekRevenue = 0;
    let monthRevenue = 0;
    let yearRevenue = 0;

    for (const purchase of purchases) {
      // Daily aggregation
      const dateKey = purchase.purchasedAt.toISOString().split('T')[0];
      const dayData = dailyMap.get(dateKey) || { sales: 0, revenue: 0 };
      dayData.sales += 1;
      dayData.revenue += purchase.creatorEarnings;
      dailyMap.set(dateKey, dayData);

      // Item aggregation
      const itemData = itemStats.get(purchase.itemId) || {
        name: purchase.item.name,
        sales: 0,
        revenue: 0,
        downloads: purchase.item.downloads,
        rating: purchase.item.rating,
      };
      itemData.sales += 1;
      itemData.revenue += purchase.creatorEarnings;
      itemStats.set(purchase.itemId, itemData);

      // Period aggregation
      const purchaseDate = purchase.purchasedAt;
      if (purchaseDate >= weekAgo) weekRevenue += purchase.creatorEarnings;
      if (purchaseDate >= monthAgo) monthRevenue += purchase.creatorEarnings;
      if (purchaseDate >= yearAgo) yearRevenue += purchase.creatorEarnings;
    }

    // Fill in missing days with zeros
    const dailySales: Array<{ date: string; sales: number; revenue: number }> = [];
    const current = new Date(startDate);
    while (current <= new Date()) {
      const dateKey = current.toISOString().split('T')[0];
      const data = dailyMap.get(dateKey) || { sales: 0, revenue: 0 };
      dailySales.push({ date: dateKey, ...data });
      current.setDate(current.getDate() + 1);
    }

    // Sort items by revenue
    const topItems = Array.from(itemStats.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const totalRevenue = purchases.reduce((sum, p) => sum + p.creatorEarnings, 0);

    return {
      dailySales,
      topItems,
      totalRevenue,
      totalSales: purchases.length,
      revenueByPeriod: {
        week: weekRevenue,
        month: monthRevenue,
        year: yearRevenue,
      },
    };
  }

  /**
   * Request a payout
   */
  async requestPayout(userId: string): Promise<PayoutResult> {
    const stripeClient = requireStripe();

    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId },
    });

    if (!creatorAccount) {
      throw new NotFoundError('Creator account', userId);
    }

    if (!creatorAccount.payoutsEnabled) {
      throw new BadRequestError('Payouts are not enabled. Complete onboarding first.');
    }

    if (creatorAccount.pendingPayout < MINIMUM_PAYOUT) {
      throw new BadRequestError(
        `Minimum payout is $${(MINIMUM_PAYOUT / 100).toFixed(2)}. Current balance: $${(creatorAccount.pendingPayout / 100).toFixed(2)}`
      );
    }

    try {
      // Create transfer to creator's connected account
      const transfer = await stripeClient.transfers.create({
        amount: creatorAccount.pendingPayout,
        currency: platformSettings.currency,
        destination: creatorAccount.stripeAccountId,
        description: `Payout for ${creatorAccount.businessName || 'Creator'}`,
        metadata: {
          userId,
          creatorAccountId: creatorAccount.id,
        },
      });

      // Update pending payout (webhook will also handle this)
      await db.creatorAccount.update({
        where: { id: creatorAccount.id },
        data: { pendingPayout: 0 },
      });

      log.info('[Payout] Transfer created', {
        userId,
        amount: creatorAccount.pendingPayout,
        transferId: transfer.id,
      });

      return {
        success: true,
        transferId: transfer.id,
        amount: creatorAccount.pendingPayout,
      };
    } catch (error) {
      log.error('[Payout] Failed to create transfer', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payout failed',
      };
    }
  }

  /**
   * Get creator's dashboard link (Stripe Express Dashboard)
   */
  async getDashboardLink(userId: string): Promise<string> {
    const stripeClient = requireStripe();

    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId },
    });

    if (!creatorAccount?.stripeAccountId) {
      throw new NotFoundError('Creator account', userId);
    }

    const loginLink = await stripeClient.accounts.createLoginLink(
      creatorAccount.stripeAccountId
    );

    return loginLink.url;
  }

  /**
   * Get creator's published items with stats
   */
  async getCreatorItems(userId: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    itemType: string;
    status: string;
    isPublished: boolean;
    isFree: boolean;
    oneTimePrice: number;
    version: string;
    sales: number;
    downloads: number;
    rating: number;
    revenue: number;
    totalEarnings: number;
    thumbnail: string | null;
    thumbnailUrl: string | null;
    createdAt: string;
  }>> {
    const items = await db.marketplaceItem.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    // Get earnings and sales per item
    const statsMap = new Map<string, { earnings: number; sales: number }>();
    const purchases = await db.marketplacePurchase.groupBy({
      by: ['itemId'],
      where: {
        item: { authorId: userId },
        status: 'active',
      },
      _sum: { creatorEarnings: true },
      _count: true,
    });

    for (const p of purchases) {
      statsMap.set(p.itemId, {
        earnings: p._sum.creatorEarnings || 0,
        sales: p._count || 0,
      });
    }

    return items.map((item) => {
      const stats = statsMap.get(item.id) || { earnings: 0, sales: 0 };
      const latestVersion = item.versions[0]?.version || '1.0.0';

      // Determine status based on item state
      let status = 'draft';
      if (item.isPublished && item.isApproved) {
        status = 'published';
      } else if (item.isPublished && !item.isApproved) {
        status = 'pending';
      } else if (!item.isPublished && item.isApproved === false) {
        status = 'rejected';
      }

      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        itemType: item.itemType,
        status,
        isPublished: item.isPublished,
        isFree: item.isFree,
        oneTimePrice: item.oneTimePrice || 0,
        version: latestVersion,
        sales: stats.sales,
        downloads: item.downloads,
        rating: item.rating,
        revenue: stats.earnings,
        totalEarnings: stats.earnings,
        thumbnail: item.thumbnailUrl,
        thumbnailUrl: item.thumbnailUrl,
        createdAt: item.createdAt.toISOString(),
      };
    });
  }
}

// Export singleton instance
export const creatorEarningsService = new CreatorEarningsService();
