/**
 * StickerNest v2 - Stripe Configuration
 *
 * Centralized Stripe configuration with environment variables
 * and price ID management.
 */

import { env } from './env.js';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export const stripeConfig = {
  // API Keys
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Connect
  connectClientId: process.env.STRIPE_CONNECT_CLIENT_ID || '',

  // Mode detection
  isLiveMode: () => stripeConfig.secretKey.startsWith('sk_live_'),
  isTestMode: () => stripeConfig.secretKey.startsWith('sk_test_'),

  // Validation
  isConfigured: () => Boolean(stripeConfig.secretKey && stripeConfig.webhookSecret),
};

// ============================================================================
// PRICE IDS
// ============================================================================

/**
 * Stripe Price IDs for subscription tiers
 *
 * These should be set via environment variables in production.
 * The format is: STRIPE_PRICE_{TIER}_{INTERVAL}
 *
 * Example .env:
 * STRIPE_PRICE_STARTER_MONTHLY=price_1234567890
 * STRIPE_PRICE_STARTER_YEARLY=price_0987654321
 */
export const stripePriceIds = {
  // Starter tier
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },

  // Pro tier
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },

  // Enterprise tier
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
  },
};

/**
 * Get price ID for a specific tier and interval
 */
export function getPriceId(
  tier: 'starter' | 'pro' | 'enterprise',
  interval: 'monthly' | 'yearly'
): string | null {
  const tierPrices = stripePriceIds[tier];
  if (!tierPrices) return null;
  return tierPrices[interval] || null;
}

/**
 * Get tier and interval from a price ID
 */
export function getTierFromPriceId(priceId: string): {
  tier: 'starter' | 'pro' | 'enterprise';
  interval: 'monthly' | 'yearly';
} | null {
  for (const [tier, prices] of Object.entries(stripePriceIds)) {
    for (const [interval, id] of Object.entries(prices)) {
      if (id === priceId) {
        return {
          tier: tier as 'starter' | 'pro' | 'enterprise',
          interval: interval as 'monthly' | 'yearly'
        };
      }
    }
  }
  return null;
}

// ============================================================================
// PRODUCT IDS
// ============================================================================

export const stripeProductIds = {
  // Subscription products
  subscription: {
    starter: process.env.STRIPE_PRODUCT_STARTER || '',
    pro: process.env.STRIPE_PRODUCT_PRO || '',
    enterprise: process.env.STRIPE_PRODUCT_ENTERPRISE || '',
  },
};

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

export const platformSettings = {
  // Platform fee percentage for marketplace sales (15%)
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT || '15', 10),

  // Minimum payout amount in cents ($10)
  minimumPayoutAmount: parseInt(process.env.MINIMUM_PAYOUT_AMOUNT || '1000', 10),

  // Currency
  currency: process.env.STRIPE_CURRENCY || 'usd',

  // Return URLs
  successUrl: process.env.STRIPE_SUCCESS_URL || `${process.env.APP_URL || 'http://localhost:5173'}/settings/billing?success=true`,
  cancelUrl: process.env.STRIPE_CANCEL_URL || `${process.env.APP_URL || 'http://localhost:5173'}/settings/billing?canceled=true`,

  // Connect return URLs
  connectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL || `${process.env.APP_URL || 'http://localhost:5173'}/settings/creator?connected=true`,
  connectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL || `${process.env.APP_URL || 'http://localhost:5173'}/settings/creator?refresh=true`,
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required keys
  if (!stripeConfig.secretKey) {
    errors.push('STRIPE_SECRET_KEY is not set');
  }
  if (!stripeConfig.webhookSecret) {
    errors.push('STRIPE_WEBHOOK_SECRET is not set');
  }

  // Recommended keys
  if (!stripeConfig.publishableKey) {
    warnings.push('STRIPE_PUBLISHABLE_KEY is not set (needed for client-side Stripe.js)');
  }

  // Price IDs
  const missingPrices: string[] = [];
  for (const [tier, prices] of Object.entries(stripePriceIds)) {
    for (const [interval, id] of Object.entries(prices)) {
      if (!id) {
        missingPrices.push(`${tier}_${interval}`);
      }
    }
  }
  if (missingPrices.length > 0) {
    warnings.push(`Missing price IDs: ${missingPrices.join(', ')}`);
  }

  // Mode check
  if (stripeConfig.isTestMode()) {
    warnings.push('Using Stripe test mode');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log Stripe configuration status
 */
export function logStripeConfig(): void {
  const validation = validateStripeConfig();

  console.log('[Stripe] Configuration status:');
  console.log(`  - Mode: ${stripeConfig.isLiveMode() ? 'LIVE' : stripeConfig.isTestMode() ? 'TEST' : 'NOT CONFIGURED'}`);
  console.log(`  - Configured: ${stripeConfig.isConfigured()}`);

  if (validation.errors.length > 0) {
    console.error('[Stripe] Configuration errors:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
  }

  if (validation.warnings.length > 0) {
    console.warn('[Stripe] Configuration warnings:');
    validation.warnings.forEach(w => console.warn(`  - ${w}`));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default stripeConfig;
