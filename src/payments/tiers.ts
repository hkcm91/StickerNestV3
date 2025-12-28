/**
 * StickerNest v2 - Subscription Tiers
 *
 * Configuration for all subscription tiers and their limits.
 */

import type { TierConfig, SubscriptionTier, TierLimits } from './types';

// ============================================================================
// TIER CONFIGURATIONS
// ============================================================================

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'free',
    displayName: 'Free',
    description: 'Get started with basic features',
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    limits: {
      maxCanvases: 3,
      maxWidgetsPerCanvas: 10,
      maxTotalWidgets: 25,
      aiCreditsPerMonth: 50,
      maxStorageBytes: 50 * 1024 * 1024, // 50MB
      maxCollaborators: 0,
      canPublishWidgets: false,
      canUsePremiumWidgets: false,
      hasAPIAccess: false,
      hasPrioritySupport: false,
      hasCustomBranding: false,
    },
    features: [
      '3 canvases',
      '25 widgets total',
      '50 AI credits/month',
      '50MB storage',
      'Basic widgets',
      'Community support',
    ],
  },

  starter: {
    name: 'starter',
    displayName: 'Starter',
    description: 'Perfect for personal projects',
    monthlyPrice: 999, // $9.99
    yearlyPrice: 9990, // $99.90 (2 months free)
    stripePriceIdMonthly: 'price_starter_monthly', // Placeholder
    stripePriceIdYearly: 'price_starter_yearly', // Placeholder
    limits: {
      maxCanvases: 10,
      maxWidgetsPerCanvas: 30,
      maxTotalWidgets: 100,
      aiCreditsPerMonth: 300,
      maxStorageBytes: 500 * 1024 * 1024, // 500MB
      maxCollaborators: 2,
      canPublishWidgets: true,
      canUsePremiumWidgets: true,
      hasAPIAccess: false,
      hasPrioritySupport: false,
      hasCustomBranding: false,
    },
    features: [
      '10 canvases',
      '100 widgets total',
      '300 AI credits/month',
      '500MB storage',
      'All widgets',
      'Publish to marketplace',
      '2 collaborators',
      'Email support',
    ],
    recommended: true,
  },

  pro: {
    name: 'pro',
    displayName: 'Pro',
    description: 'For power users and small teams',
    monthlyPrice: 2999, // $29.99
    yearlyPrice: 29990, // $299.90 (2 months free)
    stripePriceIdMonthly: 'price_pro_monthly', // Placeholder
    stripePriceIdYearly: 'price_pro_yearly', // Placeholder
    limits: {
      maxCanvases: 50,
      maxWidgetsPerCanvas: 100,
      maxTotalWidgets: 500,
      aiCreditsPerMonth: 1000,
      maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5GB
      maxCollaborators: 10,
      canPublishWidgets: true,
      canUsePremiumWidgets: true,
      hasAPIAccess: true,
      hasPrioritySupport: true,
      hasCustomBranding: false,
    },
    features: [
      '50 canvases',
      '500 widgets total',
      '1,000 AI credits/month',
      '5GB storage',
      'All widgets',
      'Publish to marketplace',
      '10 collaborators',
      'API access',
      'Priority support',
    ],
  },

  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For large teams with advanced needs',
    monthlyPrice: 9999, // $99.99
    yearlyPrice: 99990, // $999.90 (2 months free)
    stripePriceIdMonthly: 'price_enterprise_monthly', // Placeholder
    stripePriceIdYearly: 'price_enterprise_yearly', // Placeholder
    limits: {
      maxCanvases: -1, // Unlimited
      maxWidgetsPerCanvas: -1, // Unlimited
      maxTotalWidgets: -1, // Unlimited
      aiCreditsPerMonth: 10000,
      maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100GB
      maxCollaborators: -1, // Unlimited
      canPublishWidgets: true,
      canUsePremiumWidgets: true,
      hasAPIAccess: true,
      hasPrioritySupport: true,
      hasCustomBranding: true,
    },
    features: [
      'Unlimited canvases',
      'Unlimited widgets',
      '10,000 AI credits/month',
      '100GB storage',
      'All widgets',
      'Publish to marketplace',
      'Unlimited collaborators',
      'API access',
      'Priority support',
      'Custom branding',
      'SSO/SAML',
      'Dedicated success manager',
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tier configuration by name
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return SUBSCRIPTION_TIERS[tier].limits;
}

/**
 * Get all tier names
 */
export function getAllTiers(): SubscriptionTier[] {
  return Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTier[];
}

/**
 * Get all tier configs as array
 */
export function getAllTierConfigs(): TierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

/**
 * Get paid tiers only
 */
export function getPaidTiers(): TierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS).filter(t => t.monthlyPrice > 0);
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, interval?: 'monthly' | 'yearly'): string {
  if (cents === 0) return 'Free';

  const dollars = (cents / 100).toFixed(2);
  const suffix = interval === 'monthly' ? '/mo' : interval === 'yearly' ? '/yr' : '';

  return `$${dollars}${suffix}`;
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(tier: SubscriptionTier): number {
  const config = SUBSCRIPTION_TIERS[tier];
  const monthlyTotal = config.monthlyPrice * 12;
  return monthlyTotal - config.yearlyPrice;
}

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number): string {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
}

/**
 * Format storage for display
 */
export function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

/**
 * Compare two tiers (returns positive if tier1 > tier2)
 */
export function compareTiers(tier1: SubscriptionTier, tier2: SubscriptionTier): number {
  const order: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  return order.indexOf(tier1) - order.indexOf(tier2);
}

/**
 * Check if upgrade is available
 */
export function canUpgradeTo(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  return compareTiers(targetTier, currentTier) > 0;
}

/**
 * Get next tier (for upgrade prompts)
 */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const order: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = order.indexOf(currentTier);
  if (currentIndex < order.length - 1) {
    return order[currentIndex + 1];
  }
  return null;
}

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

/**
 * Default platform fee percentage for creator earnings
 */
export const DEFAULT_PLATFORM_FEE_PERCENT = 15;

/**
 * Minimum widget price in cents
 */
export const MIN_WIDGET_PRICE = 99; // $0.99

/**
 * Maximum widget price in cents
 */
export const MAX_WIDGET_PRICE = 99999; // $999.99
