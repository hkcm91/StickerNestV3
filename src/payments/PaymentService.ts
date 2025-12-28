/**
 * StickerNest v2 - Client Payment Service
 *
 * Client-side service for interacting with payment APIs.
 * Handles subscriptions, usage tracking UI, and creator monetization.
 */

import type {
  SubscriptionTier,
  BillingInterval,
  UserSubscription,
  CreatorAccount,
  WidgetPricing,
  CheckoutSessionResponse,
  PortalSessionResponse,
  ConnectOnboardingResponse,
  UsageSummary,
} from './types';
import { SUBSCRIPTION_TIERS, getTierConfig, formatPrice, compareTiers } from './tiers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = '/api/payments';

// ============================================================================
// HTTP HELPERS
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
        code: data.code,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

// ============================================================================
// SUBSCRIPTION SERVICE
// ============================================================================

export const SubscriptionService = {
  /**
   * Get current user subscription
   */
  async getCurrentSubscription(): Promise<UserSubscription | null> {
    const response = await apiRequest<UserSubscription>('/subscription');
    return response.data || null;
  },

  /**
   * Get available subscription tiers
   */
  getTiers() {
    return SUBSCRIPTION_TIERS;
  },

  /**
   * Get tier configuration
   */
  getTierConfig(tier: SubscriptionTier) {
    return getTierConfig(tier);
  },

  /**
   * Compare two tiers
   */
  compareTiers(tierA: SubscriptionTier, tierB: SubscriptionTier) {
    return compareTiers(tierA, tierB);
  },

  /**
   * Format price for display
   */
  formatPrice(cents: number) {
    return formatPrice(cents);
  },

  /**
   * Create checkout session for subscription upgrade
   */
  async createCheckout(
    tier: SubscriptionTier,
    interval: BillingInterval
  ): Promise<CheckoutSessionResponse | null> {
    const response = await apiRequest<CheckoutSessionResponse>('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, interval }),
    });

    if (response.success && response.data?.url) {
      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    }

    return response.data || null;
  },

  /**
   * Open customer portal for subscription management
   */
  async openPortal(): Promise<PortalSessionResponse | null> {
    const response = await apiRequest<PortalSessionResponse>('/subscription/portal', {
      method: 'POST',
    });

    if (response.success && response.data?.url) {
      // Redirect to Stripe Customer Portal
      window.location.href = response.data.url;
    }

    return response.data || null;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(immediately: boolean = false): Promise<boolean> {
    const response = await apiRequest('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ immediately }),
    });

    return response.success;
  },

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(): Promise<boolean> {
    const response = await apiRequest('/subscription/resume', {
      method: 'POST',
    });

    return response.success;
  },

  /**
   * Change subscription tier
   */
  async changeTier(
    newTier: SubscriptionTier,
    interval: BillingInterval
  ): Promise<boolean> {
    const response = await apiRequest('/subscription/change-tier', {
      method: 'POST',
      body: JSON.stringify({ tier: newTier, interval }),
    });

    return response.success;
  },
};

// ============================================================================
// USAGE SERVICE
// ============================================================================

export const UsageService = {
  /**
   * Get current usage summary
   */
  async getUsageSummary(): Promise<UsageSummary | null> {
    const response = await apiRequest<UsageSummary>('/usage');
    return response.data || null;
  },

  /**
   * Get usage history
   */
  async getUsageHistory(months: number = 6): Promise<UsageSummary[]> {
    const response = await apiRequest<UsageSummary[]>(`/usage/history?months=${months}`);
    return response.data || [];
  },

  /**
   * Check if can perform action
   */
  async canPerformAction(action: string): Promise<{ allowed: boolean; message?: string }> {
    const response = await apiRequest<{ allowed: boolean; message?: string }>(
      `/usage/check?action=${encodeURIComponent(action)}`
    );
    return response.data || { allowed: false, message: 'Unable to check' };
  },

  /**
   * Get remaining AI credits
   */
  async getRemainingAICredits(): Promise<number> {
    const summary = await this.getUsageSummary();
    if (!summary) return 0;
    return summary.aiCredits.limit - summary.aiCredits.used;
  },
};

// ============================================================================
// CREATOR MONETIZATION SERVICE
// ============================================================================

export const CreatorService = {
  /**
   * Get creator account status
   */
  async getCreatorAccount(): Promise<CreatorAccount | null> {
    const response = await apiRequest<CreatorAccount>('/creator');
    return response.data || null;
  },

  /**
   * Start creator onboarding (Stripe Connect)
   */
  async startOnboarding(): Promise<ConnectOnboardingResponse | null> {
    const response = await apiRequest<ConnectOnboardingResponse>('/creator/onboarding', {
      method: 'POST',
    });

    if (response.success && response.data?.url) {
      // Redirect to Stripe Connect onboarding
      window.location.href = response.data.url;
    }

    return response.data || null;
  },

  /**
   * Get creator dashboard link
   */
  async getDashboardLink(): Promise<string | null> {
    const response = await apiRequest<{ url: string }>('/creator/dashboard');
    return response.data?.url || null;
  },

  /**
   * Set pricing for a widget
   */
  async setWidgetPricing(
    packageId: string,
    pricing: WidgetPricing
  ): Promise<boolean> {
    const response = await apiRequest('/creator/widgets/pricing', {
      method: 'POST',
      body: JSON.stringify({ packageId, pricing }),
    });

    return response.success;
  },

  /**
   * Get earnings summary
   */
  async getEarningsSummary(): Promise<{
    totalEarnings: number;
    pendingPayout: number;
    lastPayout?: { amount: number; date: string };
    salesCount: number;
  } | null> {
    const response = await apiRequest<{
      totalEarnings: number;
      pendingPayout: number;
      lastPayout?: { amount: number; date: string };
      salesCount: number;
    }>('/creator/earnings');

    return response.data || null;
  },

  /**
   * Get widget sales
   */
  async getWidgetSales(packageId?: string): Promise<
    Array<{
      packageId: string;
      packageName: string;
      salesCount: number;
      revenue: number;
      earnings: number;
    }>
  > {
    const url = packageId
      ? `/creator/sales?packageId=${encodeURIComponent(packageId)}`
      : '/creator/sales';

    const response = await apiRequest<
      Array<{
        packageId: string;
        packageName: string;
        salesCount: number;
        revenue: number;
        earnings: number;
      }>
    >(url);

    return response.data || [];
  },
};

// ============================================================================
// WIDGET PURCHASE SERVICE
// ============================================================================

export const WidgetPurchaseService = {
  /**
   * Check if user owns a widget
   */
  async checkOwnership(packageId: string): Promise<{
    owned: boolean;
    purchaseType?: 'one-time' | 'subscription';
    expiresAt?: string;
  }> {
    const response = await apiRequest<{
      owned: boolean;
      purchaseType?: 'one-time' | 'subscription';
      expiresAt?: string;
    }>(`/widgets/${encodeURIComponent(packageId)}/ownership`);

    return response.data || { owned: false };
  },

  /**
   * Get widget pricing
   */
  async getWidgetPricing(packageId: string): Promise<WidgetPricing | null> {
    const response = await apiRequest<WidgetPricing>(
      `/widgets/${encodeURIComponent(packageId)}/pricing`
    );
    return response.data || null;
  },

  /**
   * Purchase a widget (one-time or subscription)
   */
  async purchaseWidget(
    packageId: string,
    priceType: 'one-time' | 'monthly' | 'yearly'
  ): Promise<CheckoutSessionResponse | null> {
    const response = await apiRequest<CheckoutSessionResponse>(
      `/widgets/${encodeURIComponent(packageId)}/purchase`,
      {
        method: 'POST',
        body: JSON.stringify({ priceType }),
      }
    );

    if (response.success && response.data?.url) {
      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    }

    return response.data || null;
  },

  /**
   * Get user's purchased widgets
   */
  async getPurchasedWidgets(): Promise<
    Array<{
      packageId: string;
      packageName: string;
      purchaseType: 'one-time' | 'subscription';
      purchasedAt: string;
      expiresAt?: string;
    }>
  > {
    const response = await apiRequest<
      Array<{
        packageId: string;
        packageName: string;
        purchaseType: 'one-time' | 'subscription';
        purchasedAt: string;
        expiresAt?: string;
      }>
    >('/widgets/purchased');

    return response.data || [];
  },
};

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

type PaymentEventType =
  | 'subscription:updated'
  | 'subscription:canceled'
  | 'usage:updated'
  | 'usage:limit-approaching'
  | 'purchase:completed';

type PaymentEventHandler = (data: any) => void;

const eventHandlers: Map<PaymentEventType, Set<PaymentEventHandler>> = new Map();

export const PaymentEvents = {
  /**
   * Subscribe to payment events
   */
  on(event: PaymentEventType, handler: PaymentEventHandler): () => void {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }
    eventHandlers.get(event)!.add(handler);

    return () => {
      eventHandlers.get(event)?.delete(handler);
    };
  },

  /**
   * Emit a payment event
   */
  emit(event: PaymentEventType, data: any): void {
    eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error('[PaymentEvents] Handler error:', error);
      }
    });
  },

  /**
   * Clear all handlers
   */
  clear(): void {
    eventHandlers.clear();
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate savings for yearly vs monthly billing
 */
export function calculateYearlySavings(tier: SubscriptionTier): {
  monthlyCost: number;
  yearlyCost: number;
  savings: number;
  savingsPercent: number;
} {
  const config = getTierConfig(tier);

  const monthlyAnnualized = config.monthlyPrice * 12;
  const yearlyCost = config.yearlyPrice;
  const savings = monthlyAnnualized - yearlyCost;
  const savingsPercent = (savings / monthlyAnnualized) * 100;

  return {
    monthlyCost: config.monthlyPrice,
    yearlyCost,
    savings,
    savingsPercent: Math.round(savingsPercent),
  };
}

/**
 * Format usage percentage
 */
export function formatUsagePercent(used: number, limit: number): string {
  if (limit === 0) return '0%';
  const percent = Math.min(100, Math.round((used / limit) * 100));
  return `${percent}%`;
}

/**
 * Get usage status color
 */
export function getUsageStatusColor(used: number, limit: number): 'green' | 'yellow' | 'red' {
  if (limit === 0) return 'green';
  const percent = (used / limit) * 100;

  if (percent >= 90) return 'red';
  if (percent >= 75) return 'yellow';
  return 'green';
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type PaymentEventType,
  type PaymentEventHandler,
};
