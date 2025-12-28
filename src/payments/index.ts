/**
 * StickerNest v2 - Payment Module (Client)
 *
 * Client-side exports for payment functionality.
 */

// Types
export type {
  SubscriptionTier,
  BillingInterval,
  TierLimits,
  TierConfig,
  UserSubscription,
  CreatorAccount,
  CreatorPayoutInfo,
  WidgetPricing,
  WidgetPurchase,
  CheckoutSessionResponse,
  PortalSessionResponse,
  ConnectOnboardingResponse,
  UsageSummary,
  UsageCategory,
} from './types';

// Tier configuration
export {
  SUBSCRIPTION_TIERS,
  DEFAULT_PLATFORM_FEE_PERCENT,
  getTierConfig,
  getTierLimits,
  formatPrice,
  compareTiers,
  getUpgradePath,
} from './tiers';

// Services
export {
  SubscriptionService,
  UsageService,
  CreatorService,
  WidgetPurchaseService,
  PaymentEvents,
  type PaymentEventType,
  type PaymentEventHandler,
} from './PaymentService';

// Utilities
export {
  calculateYearlySavings,
  formatUsagePercent,
  getUsageStatusColor,
  formatBytes,
} from './PaymentService';
