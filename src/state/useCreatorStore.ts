/**
 * StickerNest v2 - Creator Store (Zustand)
 *
 * Manages creator dashboard state:
 * - Account status and onboarding
 * - Earnings summary
 * - Sales analytics
 * - Published items
 */

import { create } from 'zustand';

// ==================
// Types
// ==================

export interface CreatorAccount {
  id: string;
  stripeAccountId: string | null;
  status: 'not_setup' | 'pending' | 'onboarding' | 'active' | 'restricted' | 'disabled';
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export interface EarningsSummary {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalPaidOut: number;
  totalSalesCount: number;
  thisMonthEarnings: number;
  thisMonthSales: number;
  canRequestPayout: boolean;
  accountStatus: string;
}

export interface DailySale {
  date: string;
  sales: number;
  revenue: number;
}

export interface TopItem {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  downloads: number;
  rating: number;
}

export interface SalesAnalytics {
  dailySales: DailySale[];
  topItems: TopItem[];
  totalRevenue: number;
  totalSales: number;
  revenueByPeriod: {
    week: number;
    month: number;
    year: number;
  };
}

export interface CreatorItem {
  id: string;
  name: string;
  slug: string;
  itemType: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
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
}

// ==================
// Store State
// ==================

export interface CreatorState {
  account: CreatorAccount | null;
  earnings: EarningsSummary | null;
  analytics: SalesAnalytics | null;
  items: CreatorItem[];
  isLoading: boolean;
  isLoadingEarnings: boolean;
  isLoadingAnalytics: boolean;
  isLoadingItems: boolean;
  error: string | null;
}

// ==================
// Store Actions
// ==================

export interface CreatorActions {
  fetchAccount: () => Promise<void>;
  fetchEarnings: () => Promise<void>;
  fetchAnalytics: (days?: number) => Promise<void>;
  fetchItems: () => Promise<void>;
  startOnboarding: (email?: string, country?: string) => Promise<string | null>;
  requestPayout: () => Promise<{ success: boolean; error?: string } | null>;
  getDashboardLink: () => Promise<string | null>;
  openStripeDashboard: () => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: CreatorState = {
  account: null,
  earnings: null,
  analytics: null,
  items: [],
  isLoading: false,
  isLoadingEarnings: false,
  isLoadingAnalytics: false,
  isLoadingItems: false,
  error: null,
};

// ==================
// API Helpers
// ==================

const API_BASE = '/api/creator';

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// ==================
// Store Creation
// ==================

export const useCreatorStore = create<CreatorState & CreatorActions>()((set, get) => ({
  ...initialState,

  fetchAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{ success: boolean; account: CreatorAccount }>(
        '/account'
      );
      set({ account: data.account, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch account',
        isLoading: false,
      });
    }
  },

  fetchEarnings: async () => {
    set({ isLoadingEarnings: true, error: null });
    try {
      const data = await apiRequest<{ success: boolean } & EarningsSummary>(
        '/earnings'
      );
      const { success, ...earnings } = data;
      set({ earnings, isLoadingEarnings: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch earnings',
        isLoadingEarnings: false,
      });
    }
  },

  fetchAnalytics: async (days = 30) => {
    set({ isLoadingAnalytics: true, error: null });
    try {
      const data = await apiRequest<{ success: boolean } & SalesAnalytics>(
        `/analytics?days=${days}`
      );
      const { success, ...analytics } = data;
      set({ analytics, isLoadingAnalytics: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
        isLoadingAnalytics: false,
      });
    }
  },

  fetchItems: async () => {
    set({ isLoadingItems: true, error: null });
    try {
      const data = await apiRequest<{ success: boolean; items: CreatorItem[] }>(
        '/items'
      );
      set({ items: data.items, isLoadingItems: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch items',
        isLoadingItems: false,
      });
    }
  },

  startOnboarding: async (email?: string, country?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{
        success: boolean;
        accountId: string;
        onboardingUrl: string;
      }>('/connect/onboard', {
        method: 'POST',
        body: JSON.stringify({ email, country }),
      });
      set({ isLoading: false });
      return data.onboardingUrl;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start onboarding',
        isLoading: false,
      });
      return null;
    }
  },

  requestPayout: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{
        success: boolean;
        transferId?: string;
        amount?: number;
        error?: string;
      }>('/payout/request', {
        method: 'POST',
      });

      if (!data.success) {
        set({ error: data.error || 'Payout failed', isLoading: false });
        return { success: false, error: data.error };
      }

      // Refresh earnings after payout
      await get().fetchEarnings();
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payout failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  getDashboardLink: async () => {
    try {
      const data = await apiRequest<{ success: boolean; url: string }>(
        '/dashboard-link'
      );
      return data.url;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get dashboard link',
      });
      return null;
    }
  },

  openStripeDashboard: async () => {
    const url = await get().getDashboardLink();
    if (url) {
      window.open(url, '_blank');
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    set(initialState);
  },
}));

// ==================
// Selector Hooks
// ==================

export const useCreatorAccount = () => useCreatorStore((state) => state.account);
export const useCreatorEarnings = () => useCreatorStore((state) => state.earnings);
export const useCreatorAnalytics = () => useCreatorStore((state) => state.analytics);
export const useCreatorItems = () => useCreatorStore((state) => state.items);
export const useCreatorLoading = () => useCreatorStore((state) => state.isLoading);
export const useCreatorError = () => useCreatorStore((state) => state.error);
