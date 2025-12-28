/**
 * StickerNest v2 - Stripe Integration
 *
 * Server-side Stripe integration for payments and subscriptions.
 * Handles subscriptions, widget purchases, and creator payouts.
 */

import Stripe from 'stripe';
import { db } from '../db/client.js';
import { log } from '../utils/logger.js';
import type {
  SubscriptionTier,
  BillingInterval,
  CheckoutSessionResponse,
  PortalSessionResponse,
  ConnectOnboardingResponse,
} from '../../src/payments/types.js';
import { SUBSCRIPTION_TIERS, DEFAULT_PLATFORM_FEE_PERCENT } from '../../src/payments/tiers.js';
import { marketplacePurchaseService } from '../services/marketplace-purchase.service.js';
import { emailService } from '../services/email.service.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Environment variables - MUST be configured for Stripe functionality
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Check if Stripe is properly configured
const isStripeConfigured = Boolean(STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith('sk_'));

// Only initialize Stripe if properly configured
let stripe: Stripe | null = null;
if (isStripeConfigured) {
  stripe = new Stripe(STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
  log.info('Stripe initialized successfully');
} else {
  log.warn('Stripe not configured - payment features will be disabled. Set STRIPE_SECRET_KEY to enable payments.');
}

/**
 * Ensure Stripe is configured before making API calls
 */
function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable to enable payment features.');
  }
  return stripe;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get subscription tier from Stripe price ID
 */
function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.stripePriceIdMonthly === priceId || config.stripePriceIdYearly === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return 'free';
}

/**
 * Get billing interval from Stripe price ID
 */
function getIntervalFromPriceId(priceId: string): BillingInterval {
  for (const config of Object.values(SUBSCRIPTION_TIERS)) {
    if (config.stripePriceIdYearly === priceId) {
      return 'yearly';
    }
  }
  return 'monthly';
}

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  const stripeClient = requireStripe();

  // Check if user already has a Stripe customer ID
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true }
  });

  if (user?.stripeCustomerId) {
    const customer = await stripeClient.customers.retrieve(user.stripeCustomerId);
    if (!customer.deleted) {
      return customer as Stripe.Customer;
    }
  }

  // Search for existing customer by email
  const existingCustomers = await stripeClient.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    // Update user with Stripe customer ID
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: existingCustomers.data[0].id }
    });
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripeClient.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // Update user with Stripe customer ID
  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id }
  });

  return customer;
}

/**
 * Update customer details
 */
export async function updateCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  return requireStripe().customers.update(customerId, updates);
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Create a checkout session for subscription
 */
export async function createSubscriptionCheckout(
  customerId: string,
  tier: SubscriptionTier,
  interval: BillingInterval,
  successUrl: string = `${APP_URL}/subscription/success`,
  cancelUrl: string = `${APP_URL}/subscription/cancel`
): Promise<CheckoutSessionResponse> {
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (!tierConfig || tierConfig.monthlyPrice === 0) {
    throw new Error('Cannot checkout free tier');
  }

  const priceId = interval === 'monthly'
    ? tierConfig.stripePriceIdMonthly
    : tierConfig.stripePriceIdYearly;

  const session = await requireStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        tier,
        interval,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url || '',
  };
}

/**
 * Create a customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string = `${APP_URL}/account`
): Promise<PortalSessionResponse> {
  const session = await requireStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await requireStripe().subscriptions.retrieve(subscriptionId);
  } catch (error) {
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelImmediately: boolean = false
): Promise<Stripe.Subscription> {
  if (cancelImmediately) {
    return requireStripe().subscriptions.cancel(subscriptionId);
  }

  return requireStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return requireStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Change subscription tier
 */
export async function changeSubscriptionTier(
  subscriptionId: string,
  newTier: SubscriptionTier,
  interval: BillingInterval
): Promise<Stripe.Subscription> {
  const subscription = await requireStripe().subscriptions.retrieve(subscriptionId);
  const tierConfig = SUBSCRIPTION_TIERS[newTier];

  const priceId = interval === 'monthly'
    ? tierConfig.stripePriceIdMonthly
    : tierConfig.stripePriceIdYearly;

  return requireStripe().subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      tier: newTier,
      interval,
    },
  });
}

// ============================================================================
// STRIPE CONNECT (CREATOR MONETIZATION)
// ============================================================================

/**
 * Create a Stripe Connect account for a creator
 */
export async function createConnectAccount(
  userId: string,
  email: string,
  country: string = 'US'
): Promise<Stripe.Account> {
  const account = await requireStripe().accounts.create({
    type: 'express',
    email,
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      userId,
    },
  });

  // Create creator account record in database
  await db.creatorAccount.create({
    data: {
      userId,
      stripeAccountId: account.id,
      status: 'pending',
      country,
    }
  });

  return account;
}

/**
 * Create Connect account onboarding link
 */
export async function createConnectOnboarding(
  accountId: string,
  refreshUrl: string = `${APP_URL}/creator/onboarding/refresh`,
  returnUrl: string = `${APP_URL}/creator/onboarding/complete`
): Promise<ConnectOnboardingResponse> {
  const accountLink = await requireStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return {
    url: accountLink.url,
  };
}

/**
 * Get Connect account details
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account | null> {
  try {
    return await requireStripe().accounts.retrieve(accountId);
  } catch (error) {
    return null;
  }
}

/**
 * Create a login link for Connect account dashboard
 */
export async function createConnectLoginLink(
  accountId: string
): Promise<string> {
  const loginLink = await requireStripe().accounts.createLoginLink(accountId);
  return loginLink.url;
}

// ============================================================================
// WIDGET PURCHASES (CREATOR MONETIZATION)
// ============================================================================

/**
 * Create a product for a widget
 */
export async function createWidgetProduct(
  packageId: string,
  name: string,
  description: string,
  creatorConnectId: string
): Promise<Stripe.Product> {
  return requireStripe().products.create({
    name,
    description,
    metadata: {
      packageId,
      creatorConnectId,
    },
  });
}

/**
 * Create prices for a widget
 */
export async function createWidgetPrices(
  productId: string,
  pricing: {
    oneTime?: number;
    monthly?: number;
    yearly?: number;
  }
): Promise<{
  oneTime?: Stripe.Price;
  monthly?: Stripe.Price;
  yearly?: Stripe.Price;
}> {
  const prices: {
    oneTime?: Stripe.Price;
    monthly?: Stripe.Price;
    yearly?: Stripe.Price;
  } = {};

  if (pricing.oneTime) {
    prices.oneTime = await requireStripe().prices.create({
      product: productId,
      unit_amount: pricing.oneTime,
      currency: 'usd',
    });
  }

  if (pricing.monthly) {
    prices.monthly = await requireStripe().prices.create({
      product: productId,
      unit_amount: pricing.monthly,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    });
  }

  if (pricing.yearly) {
    prices.yearly = await requireStripe().prices.create({
      product: productId,
      unit_amount: pricing.yearly,
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
    });
  }

  return prices;
}

/**
 * Create checkout session for widget purchase
 */
export async function createWidgetPurchaseCheckout(
  customerId: string,
  priceId: string,
  creatorConnectId: string,
  packageId: string,
  mode: 'payment' | 'subscription',
  successUrl: string = `${APP_URL}/widgets/purchase/success`,
  cancelUrl: string = `${APP_URL}/widgets/purchase/cancel`
): Promise<CheckoutSessionResponse> {
  // Calculate platform fee (application fee)
  const price = await requireStripe().prices.retrieve(priceId);
  const amount = price.unit_amount || 0;
  const platformFee = Math.round(amount * (DEFAULT_PLATFORM_FEE_PERCENT / 100));

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
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&package=${packageId}`,
    cancel_url: cancelUrl,
    metadata: {
      packageId,
      creatorConnectId,
    },
    payment_intent_data: mode === 'payment' ? {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: creatorConnectId,
      },
    } : undefined,
    subscription_data: mode === 'subscription' ? {
      application_fee_percent: DEFAULT_PLATFORM_FEE_PERCENT,
      transfer_data: {
        destination: creatorConnectId,
      },
      metadata: {
        packageId,
        creatorConnectId,
      },
    } : undefined,
  };

  const session = await requireStripe().checkout.sessions.create(sessionParams);

  return {
    sessionId: session.id,
    url: session.url || '',
  };
}

/**
 * Create a transfer to a creator
 */
export async function createTransfer(
  amount: number,
  destinationAccountId: string,
  description: string
): Promise<Stripe.Transfer> {
  return requireStripe().transfers.create({
    amount,
    currency: 'usd',
    destination: destinationAccountId,
    description,
  });
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Verify and parse a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripeClient = requireStripe();
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return stripeClient.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Handle webhook events
 */
export type WebhookHandler = (event: Stripe.Event) => Promise<void>;

export const webhookHandlers: Record<string, WebhookHandler> = {
  // ========================================
  // Subscription Events
  // ========================================

  'customer.subscription.created': async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    log.info('[Webhook] Subscription created:', { subscriptionId: subscription.id });

    // Get user ID from customer metadata
    const customer = await requireStripe().customers.retrieve(subscription.customer as string);
    if (customer.deleted) return;

    const userId = customer.metadata?.userId;
    if (!userId) {
      log.warn('[Webhook] No userId in customer metadata', { customerId: customer.id });
      return;
    }

    // Get price ID and determine tier
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = subscription.metadata?.tier as SubscriptionTier || getTierFromPriceId(priceId || '');
    const interval = subscription.metadata?.interval as BillingInterval || getIntervalFromPriceId(priceId || '');

    // Upsert user subscription
    await db.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: subscription.status === 'active' ? 'active' : 'past_due',
        billingInterval: interval,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
      update: {
        tier,
        status: subscription.status === 'active' ? 'active' : 'past_due',
        billingInterval: interval,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: null,
      }
    });

    log.info('[Webhook] User subscription created/updated', { userId, tier, interval });
  },

  'customer.subscription.updated': async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    log.info('[Webhook] Subscription updated:', { subscriptionId: subscription.id });

    // Find subscription in database
    const userSubscription = await db.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!userSubscription) {
      log.warn('[Webhook] Subscription not found in database', { subscriptionId: subscription.id });
      return;
    }

    // Get price ID and determine tier
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = subscription.metadata?.tier as SubscriptionTier || getTierFromPriceId(priceId || '');
    const interval = subscription.metadata?.interval as BillingInterval || getIntervalFromPriceId(priceId || '');

    // Map Stripe status to our status
    let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active';
    if (subscription.status === 'canceled') status = 'canceled';
    else if (subscription.status === 'past_due') status = 'past_due';
    else if (subscription.status === 'trialing') status = 'trialing';

    // Update subscription
    await db.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        tier,
        status,
        billingInterval: interval,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      }
    });

    log.info('[Webhook] User subscription updated', { userId: userSubscription.userId, tier, status });
  },

  'customer.subscription.deleted': async (event) => {
    const subscription = event.data.object as Stripe.Subscription;
    log.info('[Webhook] Subscription deleted:', { subscriptionId: subscription.id });

    // Find and update subscription in database
    const userSubscription = await db.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!userSubscription) {
      log.warn('[Webhook] Subscription not found in database', { subscriptionId: subscription.id });
      return;
    }

    // Mark as canceled and revert to free tier
    await db.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        tier: 'free',
        status: 'canceled',
        canceledAt: new Date(),
        stripeSubscriptionId: null,
        stripePriceId: null,
      }
    });

    log.info('[Webhook] User subscription canceled', { userId: userSubscription.userId });
  },

  // ========================================
  // Invoice Events
  // ========================================

  'invoice.payment_succeeded': async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    log.info('[Webhook] Invoice paid:', { invoiceId: invoice.id });

    if (!invoice.subscription) return;

    // Find subscription
    const userSubscription = await db.userSubscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string }
    });

    if (!userSubscription) {
      log.warn('[Webhook] Subscription not found for invoice', { subscriptionId: invoice.subscription });
      return;
    }

    // Update subscription period and status
    await db.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'active',
        currentPeriodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
        currentPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
      }
    });

    // Reset monthly AI usage if applicable
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Create or update usage snapshot for this month
    await db.usageSnapshot.upsert({
      where: {
        userId_month: {
          userId: userSubscription.userId,
          month: currentMonth
        }
      },
      create: {
        userId: userSubscription.userId,
        month: currentMonth,
        aiGenerations: 0,
        storageBytes: 0,
        canvasCount: 0,
      },
      update: {
        aiGenerations: 0, // Reset AI generations for new billing period
      }
    });

    log.info('[Webhook] Updated subscription and reset usage', { userId: userSubscription.userId });
  },

  'invoice.payment_failed': async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    log.info('[Webhook] Invoice payment failed:', { invoiceId: invoice.id });

    if (!invoice.subscription) return;

    // Find subscription
    const userSubscription = await db.userSubscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string }
    });

    if (!userSubscription) return;

    // Update subscription status
    await db.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'past_due',
      }
    });

    log.info('[Webhook] Subscription marked as past_due', { userId: userSubscription.userId });

    // Send notification email to user about failed payment
    const invoice = event.data.object as Stripe.Invoice;
    await emailService.sendPaymentFailedNotification(userSubscription.userId, {
      amount: invoice.amount_due,
      retryUrl: `${process.env.APP_URL || 'https://stickernest.com'}/settings/billing`,
    });
  },

  // ========================================
  // Checkout Events
  // ========================================

  'checkout.session.completed': async (event) => {
    const session = event.data.object as Stripe.Checkout.Session;
    log.info('[Webhook] Checkout completed:', { sessionId: session.id });

    // Check if this is a marketplace item purchase (new system)
    const itemId = session.metadata?.itemId;
    if (itemId) {
      await marketplacePurchaseService.completePurchase(
        session.id,
        session.payment_intent as string || undefined,
        session.subscription as string || undefined
      );
      return;
    }

    // Legacy: Check if this is a widget package purchase (old system)
    const packageId = session.metadata?.packageId;
    if (packageId && session.customer) {
      // Get user from Stripe customer
      const customer = await requireStripe().customers.retrieve(session.customer as string);
      if (customer.deleted) return;

      const userId = customer.metadata?.userId;
      if (!userId) return;

      // Get package and creator info
      const widgetPackage = await db.widgetPackage.findUnique({
        where: { id: packageId },
        include: { author: { include: { creatorAccount: true } } }
      });

      if (!widgetPackage) {
        log.warn('[Webhook] Widget package not found', { packageId });
        return;
      }

      // Determine purchase type and amount
      const isSubscription = session.mode === 'subscription';
      const amount = session.amount_total || 0;
      const platformFee = Math.round(amount * (DEFAULT_PLATFORM_FEE_PERCENT / 100));
      const creatorEarnings = amount - platformFee;

      // Create purchase record
      await db.widgetPurchase.upsert({
        where: {
          userId_packageId: { userId, packageId }
        },
        create: {
          userId,
          packageId,
          purchaseType: isSubscription ? 'subscription' : 'one_time',
          status: 'active',
          priceAmount: amount,
          stripePaymentIntentId: session.payment_intent as string || null,
          stripeSubscriptionId: session.subscription as string || null,
          creatorEarnings,
          platformFee,
        },
        update: {
          status: 'active',
          priceAmount: amount,
          stripePaymentIntentId: session.payment_intent as string || null,
          stripeSubscriptionId: session.subscription as string || null,
          creatorEarnings,
          platformFee,
        }
      });

      // Update creator account earnings
      if (widgetPackage.author.creatorAccount) {
        await db.creatorAccount.update({
          where: { id: widgetPackage.author.creatorAccount.id },
          data: {
            totalEarnings: { increment: creatorEarnings },
            pendingPayout: { increment: creatorEarnings },
            totalSalesCount: { increment: 1 },
          }
        });
      }

      // Increment package download count
      await db.widgetPackage.update({
        where: { id: packageId },
        data: { downloads: { increment: 1 } }
      });

      log.info('[Webhook] Widget purchase completed', { userId, packageId, amount });
    }
  },

  // ========================================
  // Connect Events
  // ========================================

  'account.updated': async (event) => {
    const account = event.data.object as Stripe.Account;
    log.info('[Webhook] Connect account updated:', { accountId: account.id });

    // Find creator account
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { stripeAccountId: account.id }
    });

    if (!creatorAccount) {
      log.warn('[Webhook] Creator account not found', { stripeAccountId: account.id });
      return;
    }

    // Determine status
    let status: 'pending' | 'active' | 'restricted' | 'disabled' = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.requirements?.disabled_reason) {
      status = 'disabled';
    } else if (account.requirements?.currently_due?.length) {
      status = 'restricted';
    }

    // Update creator account
    await db.creatorAccount.update({
      where: { id: creatorAccount.id },
      data: {
        status,
        onboardingComplete: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        businessName: account.business_profile?.name || null,
      }
    });

    log.info('[Webhook] Creator account updated', { userId: creatorAccount.userId, status });
  },

  'transfer.created': async (event) => {
    const transfer = event.data.object as Stripe.Transfer;
    log.info('[Webhook] Transfer created:', { transferId: transfer.id });

    // Find creator account by destination
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { stripeAccountId: transfer.destination as string }
    });

    if (!creatorAccount) {
      log.warn('[Webhook] Creator account not found for transfer', { destination: transfer.destination });
      return;
    }

    // Update pending payout (subtract the transferred amount)
    await db.creatorAccount.update({
      where: { id: creatorAccount.id },
      data: {
        pendingPayout: { decrement: transfer.amount },
      }
    });

    log.info('[Webhook] Payout recorded', {
      userId: creatorAccount.userId,
      amount: transfer.amount
    });
  },

  'payout.paid': async (event) => {
    const payout = event.data.object as Stripe.Payout;
    log.info('[Webhook] Payout paid:', { payoutId: payout.id });
    // Payout tracking is handled at the transfer level
  },
};

/**
 * Process a webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const handler = webhookHandlers[event.type];

  if (handler) {
    try {
      await handler(event);
    } catch (error) {
      log.error('[Webhook] Handler error:', error as Error);
      throw error;
    }
  } else {
    log.debug('[Webhook] Unhandled event type:', { type: event.type });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { isStripeConfigured };
