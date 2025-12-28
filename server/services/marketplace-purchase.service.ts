/**
 * StickerNest v2 - Marketplace Purchase Service
 *
 * Handles purchasing marketplace items via Stripe.
 * Supports one-time purchases and subscriptions.
 *
 * ARCHITECTURE NOTES:
 * - Uses Stripe Checkout Sessions for payment flow
 * - Supports Stripe Connect for creator payouts (85/15 split)
 * - Records purchases in MarketplacePurchase table
 * - Webhook handlers complete the purchase flow
 */

import Stripe from 'stripe';
import { db } from '../db/client.js';
import { log } from '../utils/logger.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/AppErrors.js';
import { platformSettings } from '../config/stripe.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Initialize Stripe if configured
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
    throw new BadRequestError('Payments are not configured. Contact support.');
  }
  return stripe;
}

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseType = 'one_time' | 'monthly' | 'yearly';

export interface CreateCheckoutResult {
  sessionId: string;
  url: string;
}

export interface PurchaseResult {
  success: boolean;
  free?: boolean;
  alreadyOwned?: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  message?: string;
}

// ============================================================================
// MARKETPLACE PURCHASE SERVICE
// ============================================================================

export class MarketplacePurchaseService {
  /**
   * Initiate a purchase for a marketplace item
   */
  async initiatePurchase(
    userId: string,
    itemId: string,
    purchaseType: PurchaseType = 'one_time'
  ): Promise<PurchaseResult> {
    // Get the item
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
      include: {
        author: {
          include: { creatorAccount: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    if (!item.isPublished) {
      throw new BadRequestError('This item is not available for purchase');
    }

    // Check if already owned
    const existingPurchase = await db.marketplacePurchase.findUnique({
      where: {
        userId_itemId: { userId, itemId },
      },
    });

    if (existingPurchase?.status === 'active') {
      return {
        success: true,
        alreadyOwned: true,
        message: 'You already own this item',
      };
    }

    // Handle free items
    if (item.isFree) {
      await this.recordFreePurchase(userId, itemId);
      return {
        success: true,
        free: true,
        message: 'Item added to your library',
      };
    }

    // Get the price based on purchase type
    const priceAmount = this.getPriceAmount(item, purchaseType);
    if (!priceAmount) {
      throw new BadRequestError(`${purchaseType} pricing not available for this item`);
    }

    // Check if creator has Stripe Connect set up
    const creatorConnectId = item.author.creatorAccount?.stripeAccountId;
    if (!creatorConnectId || !item.author.creatorAccount?.chargesEnabled) {
      throw new BadRequestError('Creator has not completed payment setup');
    }

    // Create Stripe checkout session
    const checkout = await this.createCheckoutSession(
      userId,
      item,
      purchaseType,
      priceAmount,
      creatorConnectId
    );

    return {
      success: true,
      checkoutUrl: checkout.url,
      sessionId: checkout.sessionId,
      message: 'Checkout session created',
    };
  }

  /**
   * Create Stripe checkout session for item purchase
   */
  private async createCheckoutSession(
    userId: string,
    item: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      stripeProductId: string | null;
      stripeOneTimePriceId: string | null;
      stripeMonthlyPriceId: string | null;
      stripeYearlyPriceId: string | null;
      oneTimePrice: number | null;
      monthlyPrice: number | null;
      yearlyPrice: number | null;
    },
    purchaseType: PurchaseType,
    priceAmount: number,
    creatorConnectId: string
  ): Promise<CreateCheckoutResult> {
    const stripeClient = requireStripe();

    // Get or create Stripe customer
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.username,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Determine mode and get/create price
    const isSubscription = purchaseType !== 'one_time';
    const mode: Stripe.Checkout.SessionCreateParams.Mode = isSubscription
      ? 'subscription'
      : 'payment';

    // Get or create the price ID
    const priceId = await this.getOrCreatePrice(
      item,
      purchaseType,
      priceAmount
    );

    // Calculate platform fee
    const platformFeePercent = platformSettings.platformFeePercent;
    const platformFee = Math.round(priceAmount * (platformFeePercent / 100));

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/marketplace/${item.slug}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/marketplace/${item.slug}?purchase=canceled`,
      metadata: {
        itemId: item.id,
        userId,
        purchaseType,
        creatorConnectId,
      },
    };

    // Add payment/subscription specific options for creator payout
    if (mode === 'payment') {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorConnectId,
        },
        metadata: {
          itemId: item.id,
          userId,
          purchaseType,
        },
      };
    } else {
      sessionParams.subscription_data = {
        application_fee_percent: platformFeePercent,
        transfer_data: {
          destination: creatorConnectId,
        },
        metadata: {
          itemId: item.id,
          userId,
          purchaseType,
        },
      };
    }

    const session = await stripeClient.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * Get or create a Stripe price for the item
   */
  private async getOrCreatePrice(
    item: {
      id: string;
      name: string;
      description: string | null;
      stripeProductId: string | null;
      stripeOneTimePriceId: string | null;
      stripeMonthlyPriceId: string | null;
      stripeYearlyPriceId: string | null;
    },
    purchaseType: PurchaseType,
    priceAmount: number
  ): Promise<string> {
    const stripeClient = requireStripe();

    // Check if price already exists
    const existingPriceId =
      purchaseType === 'one_time'
        ? item.stripeOneTimePriceId
        : purchaseType === 'monthly'
          ? item.stripeMonthlyPriceId
          : item.stripeYearlyPriceId;

    if (existingPriceId) {
      return existingPriceId;
    }

    // Get or create product
    let productId = item.stripeProductId;
    if (!productId) {
      const product = await stripeClient.products.create({
        name: item.name,
        description: item.description || undefined,
        metadata: { itemId: item.id },
      });
      productId = product.id;
      await db.marketplaceItem.update({
        where: { id: item.id },
        data: { stripeProductId: productId },
      });
    }

    // Create price
    const priceParams: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: priceAmount,
      currency: platformSettings.currency,
    };

    if (purchaseType !== 'one_time') {
      priceParams.recurring = {
        interval: purchaseType === 'monthly' ? 'month' : 'year',
      };
    }

    const price = await stripeClient.prices.create(priceParams);

    // Save price ID
    const updateField =
      purchaseType === 'one_time'
        ? 'stripeOneTimePriceId'
        : purchaseType === 'monthly'
          ? 'stripeMonthlyPriceId'
          : 'stripeYearlyPriceId';

    await db.marketplaceItem.update({
      where: { id: item.id },
      data: { [updateField]: price.id },
    });

    return price.id;
  }

  /**
   * Record a free item "purchase"
   */
  private async recordFreePurchase(userId: string, itemId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      // Create or update purchase record
      await tx.marketplacePurchase.upsert({
        where: {
          userId_itemId: { userId, itemId },
        },
        create: {
          userId,
          itemId,
          purchaseType: 'one_time',
          status: 'active',
          priceAmount: 0,
          creatorEarnings: 0,
          platformFee: 0,
        },
        update: {
          status: 'active',
          priceAmount: 0,
        },
      });

      // Increment download count
      await tx.marketplaceItem.update({
        where: { id: itemId },
        data: { downloads: { increment: 1 } },
      });
    });

    log.info('[Purchase] Free item claimed', { userId, itemId });
  }

  /**
   * Complete a purchase after successful payment (called by webhook)
   */
  async completePurchase(
    sessionId: string,
    paymentIntentId?: string,
    subscriptionId?: string
  ): Promise<void> {
    const stripeClient = requireStripe();

    // Retrieve session to get metadata
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    const { itemId, userId, purchaseType, creatorConnectId } = session.metadata || {};

    if (!itemId || !userId) {
      log.warn('[Purchase] Missing metadata in checkout session', { sessionId });
      return;
    }

    const amount = session.amount_total || 0;
    const platformFeePercent = platformSettings.platformFeePercent;
    const platformFee = Math.round(amount * (platformFeePercent / 100));
    const creatorEarnings = amount - platformFee;

    await db.$transaction(async (tx) => {
      // Create or update purchase record
      await tx.marketplacePurchase.upsert({
        where: {
          userId_itemId: { userId, itemId },
        },
        create: {
          userId,
          itemId,
          purchaseType: purchaseType === 'one_time' ? 'one_time' : 'subscription',
          status: 'active',
          priceAmount: amount,
          stripePaymentIntentId: paymentIntentId,
          stripeSubscriptionId: subscriptionId,
          creatorEarnings,
          platformFee,
          currentPeriodStart: subscriptionId ? new Date() : null,
          currentPeriodEnd: subscriptionId
            ? new Date(Date.now() + (purchaseType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
            : null,
        },
        update: {
          status: 'active',
          priceAmount: amount,
          stripePaymentIntentId: paymentIntentId,
          stripeSubscriptionId: subscriptionId,
          creatorEarnings,
          platformFee,
        },
      });

      // Increment download count
      await tx.marketplaceItem.update({
        where: { id: itemId },
        data: { downloads: { increment: 1 } },
      });

      // Update creator earnings if they have a creator account
      if (creatorConnectId) {
        await tx.creatorAccount.updateMany({
          where: { stripeAccountId: creatorConnectId },
          data: {
            totalEarnings: { increment: creatorEarnings },
            pendingPayout: { increment: creatorEarnings },
            totalSalesCount: { increment: 1 },
          },
        });
      }
    });

    log.info('[Purchase] Purchase completed', { userId, itemId, amount });
  }

  /**
   * Handle subscription renewal
   */
  async handleSubscriptionRenewal(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const purchase = await db.marketplacePurchase.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!purchase) {
      log.warn('[Purchase] Subscription not found for renewal', { subscriptionId });
      return;
    }

    await db.marketplacePurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    log.info('[Purchase] Subscription renewed', { purchaseId: purchase.id });
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCancellation(subscriptionId: string): Promise<void> {
    const purchase = await db.marketplacePurchase.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!purchase) {
      log.warn('[Purchase] Subscription not found for cancellation', { subscriptionId });
      return;
    }

    await db.marketplacePurchase.update({
      where: { id: purchase.id },
      data: { status: 'canceled' },
    });

    log.info('[Purchase] Subscription canceled', { purchaseId: purchase.id });
  }

  /**
   * Get price amount based on purchase type
   */
  private getPriceAmount(
    item: {
      oneTimePrice: number | null;
      monthlyPrice: number | null;
      yearlyPrice: number | null;
    },
    purchaseType: PurchaseType
  ): number | null {
    switch (purchaseType) {
      case 'one_time':
        return item.oneTimePrice;
      case 'monthly':
        return item.monthlyPrice;
      case 'yearly':
        return item.yearlyPrice;
      default:
        return null;
    }
  }

  /**
   * Get user's purchased items
   */
  async getUserPurchases(userId: string): Promise<Array<{
    id: string;
    itemId: string;
    purchaseType: string;
    status: string;
    purchasedAt: string;
    item: {
      id: string;
      name: string;
      slug: string;
      thumbnailUrl: string | null;
    };
  }>> {
    const purchases = await db.marketplacePurchase.findMany({
      where: { userId, status: 'active' },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    return purchases.map((p) => ({
      id: p.id,
      itemId: p.itemId,
      purchaseType: p.purchaseType,
      status: p.status,
      purchasedAt: p.purchasedAt.toISOString(),
      item: p.item,
    }));
  }
}

// Export singleton instance
export const marketplacePurchaseService = new MarketplacePurchaseService();
