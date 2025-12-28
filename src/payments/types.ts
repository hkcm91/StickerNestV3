/**
 * StickerNest v2 - Payment Types
 *
 * Type definitions for the payment and monetization system.
 */

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

/**
 * Available subscription tier names
 */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

/**
 * Billing interval
 */
export type BillingInterval = 'monthly' | 'yearly';

/**
 * Subscription tier configuration
 */
export interface TierConfig {
  /** Tier name */
  name: SubscriptionTier;

  /** Display name */
  displayName: string;

  /** Description */
  description: string;

  /** Monthly price in cents */
  monthlyPrice: number;

  /** Yearly price in cents (typically discounted) */
  yearlyPrice: number;

  /** Stripe price ID for monthly billing */
  stripePriceIdMonthly: string;

  /** Stripe price ID for yearly billing */
  stripePriceIdYearly: string;

  /** Tier limits */
  limits: TierLimits;

  /** Features included in this tier */
  features: string[];

  /** Is this the recommended tier */
  recommended?: boolean;
}

/**
 * Tier limits
 */
export interface TierLimits {
  /** Maximum number of canvases */
  maxCanvases: number;

  /** Maximum number of widgets per canvas */
  maxWidgetsPerCanvas: number;

  /** Maximum total widgets across all canvases */
  maxTotalWidgets: number;

  /** AI generation credits per month */
  aiCreditsPerMonth: number;

  /** Maximum file storage in bytes */
  maxStorageBytes: number;

  /** Maximum collaborators (for shared canvases) */
  maxCollaborators: number;

  /** Can publish widgets to marketplace */
  canPublishWidgets: boolean;

  /** Can use premium widgets */
  canUsePremiumWidgets: boolean;

  /** Can use API access */
  hasAPIAccess: boolean;

  /** Priority support */
  hasPrioritySupport: boolean;

  /** Custom branding */
  hasCustomBranding: boolean;
}

// ============================================================================
// USER SUBSCRIPTION
// ============================================================================

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

/**
 * User subscription
 */
export interface UserSubscription {
  /** Subscription ID */
  id: string;

  /** User ID */
  userId: string;

  /** Current tier */
  tier: SubscriptionTier;

  /** Subscription status */
  status: SubscriptionStatus;

  /** Billing interval */
  billingInterval: BillingInterval;

  /** Stripe subscription ID */
  stripeSubscriptionId: string | null;

  /** Stripe customer ID */
  stripeCustomerId: string | null;

  /** Current period start */
  currentPeriodStart: Date;

  /** Current period end */
  currentPeriodEnd: Date;

  /** Cancel at period end */
  cancelAtPeriodEnd: boolean;

  /** Trial end date (if trialing) */
  trialEnd: Date | null;

  /** AI credits used this period */
  aiCreditsUsed: number;

  /** Created at */
  createdAt: Date;

  /** Updated at */
  updatedAt: Date;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Resource usage
 */
export interface ResourceUsage {
  /** User ID */
  userId: string;

  /** Canvas count */
  canvasCount: number;

  /** Total widget count */
  totalWidgetCount: number;

  /** AI credits used this month */
  aiCreditsUsedThisMonth: number;

  /** Storage used in bytes */
  storageUsedBytes: number;

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Usage check result
 */
export interface UsageCheckResult {
  /** Is the user within limits */
  withinLimits: boolean;

  /** Current usage */
  usage: ResourceUsage;

  /** Current limits */
  limits: TierLimits;

  /** Specific limit violations */
  violations: UsageViolation[];
}

/**
 * Usage violation
 */
export interface UsageViolation {
  /** Resource type */
  resource: 'canvases' | 'widgets' | 'ai_credits' | 'storage' | 'collaborators';

  /** Current value */
  current: number;

  /** Limit value */
  limit: number;

  /** Violation message */
  message: string;
}

// ============================================================================
// CREATOR MONETIZATION
// ============================================================================

/**
 * Creator account status
 */
export type CreatorStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'restricted';

/**
 * Creator account
 */
export interface CreatorAccount {
  /** Creator account ID */
  id: string;

  /** User ID */
  userId: string;

  /** Status */
  status: CreatorStatus;

  /** Stripe Connect account ID */
  stripeConnectId: string | null;

  /** Onboarding completed */
  onboardingComplete: boolean;

  /** Charges enabled on Connect account */
  chargesEnabled: boolean;

  /** Payouts enabled on Connect account */
  payoutsEnabled: boolean;

  /** Revenue share percentage (platform fee) */
  platformFeePercent: number;

  /** Total earnings (in cents) */
  totalEarnings: number;

  /** Pending payout (in cents) */
  pendingPayout: number;

  /** Created at */
  createdAt: Date;

  /** Updated at */
  updatedAt: Date;
}

/**
 * Widget pricing model
 */
export type WidgetPricingModel = 'free' | 'one_time' | 'subscription';

/**
 * Widget pricing configuration
 */
export interface WidgetPricing {
  /** Widget package ID */
  packageId: string;

  /** Pricing model */
  model: WidgetPricingModel;

  /** One-time price in cents (for one_time model) */
  oneTimePrice: number | null;

  /** Monthly subscription price in cents (for subscription model) */
  monthlyPrice: number | null;

  /** Yearly subscription price in cents (for subscription model) */
  yearlyPrice: number | null;

  /** Stripe product ID */
  stripeProductId: string | null;

  /** Stripe price IDs */
  stripePriceIds: {
    oneTime?: string;
    monthly?: string;
    yearly?: string;
  };

  /** Free tier available */
  hasFreeTier: boolean;

  /** Free tier limits (if applicable) */
  freeTierLimits?: {
    usageLimit?: number;
    expiresAfterDays?: number;
  };
}

/**
 * Widget purchase
 */
export interface WidgetPurchase {
  /** Purchase ID */
  id: string;

  /** User ID (buyer) */
  userId: string;

  /** Widget package ID */
  packageId: string;

  /** Creator user ID (seller) */
  creatorId: string;

  /** Pricing model used */
  pricingModel: WidgetPricingModel;

  /** Amount paid in cents */
  amount: number;

  /** Platform fee in cents */
  platformFee: number;

  /** Creator earnings in cents */
  creatorEarnings: number;

  /** Stripe payment intent ID */
  stripePaymentIntentId: string | null;

  /** Stripe subscription ID (for subscription model) */
  stripeSubscriptionId: string | null;

  /** Status */
  status: 'pending' | 'completed' | 'refunded' | 'failed';

  /** Purchase date */
  purchasedAt: Date;

  /** Subscription end date (for subscription model) */
  subscriptionEndsAt: Date | null;
}

// ============================================================================
// PAYOUT
// ============================================================================

/**
 * Payout status
 */
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

/**
 * Creator payout
 */
export interface CreatorPayout {
  /** Payout ID */
  id: string;

  /** Creator account ID */
  creatorAccountId: string;

  /** Amount in cents */
  amount: number;

  /** Status */
  status: PayoutStatus;

  /** Stripe transfer ID */
  stripeTransferId: string | null;

  /** Created at */
  createdAt: Date;

  /** Paid at */
  paidAt: Date | null;
}

// ============================================================================
// API RESPONSES
// ============================================================================

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  /** Stripe checkout session ID */
  sessionId: string;

  /** Checkout URL */
  url: string;
}

/**
 * Portal session response
 */
export interface PortalSessionResponse {
  /** Portal URL */
  url: string;
}

/**
 * Connect onboarding response
 */
export interface ConnectOnboardingResponse {
  /** Account link URL */
  url: string;
}
