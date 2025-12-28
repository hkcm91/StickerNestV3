/**
 * StickerNest v2 - Payment Module (Server)
 *
 * Server-side exports for payment functionality.
 */

// Stripe integration
export {
  stripe,
  getOrCreateCustomer,
  updateCustomer,
  createSubscriptionCheckout,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  changeSubscriptionTier,
  createConnectAccount,
  createConnectOnboarding,
  getConnectAccount,
  createConnectLoginLink,
  createWidgetProduct,
  createWidgetPrices,
  createWidgetPurchaseCheckout,
  createTransfer,
  constructWebhookEvent,
  processWebhookEvent,
  webhookHandlers,
  type WebhookHandler,
} from './stripe';

// Middleware
export {
  requireAuth,
  requireTier,
  requireFeature,
  checkLimitMiddleware,
  checkCanvasLimit,
  checkWidgetLimit,
  checkPublishLimit,
  checkAICredits,
  checkStorageLimit,
  trackBandwidth,
  checkLimit,
  checkAllLimits,
  hasFeature,
  trackCanvasCreated,
  trackCanvasDeleted,
  trackWidgetCreated,
  trackWidgetDeleted,
  trackWidgetPublished,
  trackAICredits,
  trackStorageUsed,
  trackStorageFreed,
  setUsageService,
  type AuthenticatedRequest,
  type UsageData,
  type LimitType,
  type LimitCheckResult,
  type IUsageService,
} from './middleware';

// Usage tracking
export {
  UsageService,
  getUsageService,
  initUsageService,
  scheduleMonthlyResets,
  onUsageAlert,
  emitUsageAlert,
  checkAndEmitAlerts,
  type UsageRecord,
  type UsageSnapshot,
  type StorageBackend,
  type UsageAlert,
  type AlertHandler,
  type IRedisClient,
  type IDatabaseClient,
} from './usage';
