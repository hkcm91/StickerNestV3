/**
 * StickerNest v2 - Marketplace Store (Zustand)
 *
 * Manages marketplace state including:
 * - User purchases and owned items
 * - Purchase flow state
 * - Marketplace browsing preferences
 *
 * ARCHITECTURE NOTES:
 * - Integrates with /api/marketplace endpoints
 * - Handles Stripe checkout redirect flow
 * - Caches ownership checks for performance
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==================
// Types
// ==================

export type PurchaseType = 'one_time' | 'monthly' | 'yearly';

export interface PurchasedItem {
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
}

export interface MarketplaceFilters {
  search: string;
  category: string;
  itemType: string;
  sortBy: 'popular' | 'recent' | 'rating' | 'price';
  freeOnly: boolean;
}

export interface PurchaseFlowState {
  isProcessing: boolean;
  itemId: string | null;
  purchaseType: PurchaseType | null;
  error: string | null;
}

// ==================
// Store State
// ==================

export interface MarketplaceState {
  /** User's purchased items */
  purchases: PurchasedItem[];
  /** Set of owned item IDs for quick lookup */
  ownedItemIds: Set<string>;
  /** Current purchase flow state */
  purchaseFlow: PurchaseFlowState;
  /** Browse filters */
  filters: MarketplaceFilters;
  /** Loading states */
  isLoadingPurchases: boolean;
  /** Last fetch timestamp */
  lastFetchedAt: number | null;
}

// ==================
// Store Actions
// ==================

export interface MarketplaceActions {
  /** Fetch user's purchases from API */
  fetchPurchases: () => Promise<void>;
  /** Check if user owns an item */
  checkOwnership: (itemId: string) => Promise<boolean>;
  /** Initiate purchase flow */
  initiatePurchase: (itemId: string, purchaseType: PurchaseType) => Promise<string | null>;
  /** Complete purchase (after redirect back) */
  completePurchase: (itemId: string) => void;
  /** Clear purchase flow error */
  clearPurchaseError: () => void;
  /** Update filters */
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
  /** Reset filters to defaults */
  resetFilters: () => void;
  /** Add item to owned set (optimistic update) */
  addOwnedItem: (itemId: string) => void;
  /** Reset store */
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialFilters: MarketplaceFilters = {
  search: '',
  category: '',
  itemType: '',
  sortBy: 'popular',
  freeOnly: false,
};

const initialPurchaseFlow: PurchaseFlowState = {
  isProcessing: false,
  itemId: null,
  purchaseType: null,
  error: null,
};

const initialState: MarketplaceState = {
  purchases: [],
  ownedItemIds: new Set(),
  purchaseFlow: initialPurchaseFlow,
  filters: initialFilters,
  isLoadingPurchases: false,
  lastFetchedAt: null,
};

// ==================
// API Helpers
// ==================

const API_BASE = '/api/marketplace';

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

export const useMarketplaceStore = create<MarketplaceState & MarketplaceActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchPurchases: async () => {
        // Skip if recently fetched (within 5 minutes)
        const { lastFetchedAt } = get();
        if (lastFetchedAt && Date.now() - lastFetchedAt < 5 * 60 * 1000) {
          return;
        }

        set({ isLoadingPurchases: true });

        try {
          const data = await apiRequest<{
            success: boolean;
            purchases: PurchasedItem[];
          }>('/purchases');

          const ownedIds = new Set(data.purchases.map((p) => p.itemId));

          set({
            purchases: data.purchases,
            ownedItemIds: ownedIds,
            isLoadingPurchases: false,
            lastFetchedAt: Date.now(),
          });
        } catch (error) {
          console.error('[Marketplace] Failed to fetch purchases:', error);
          set({ isLoadingPurchases: false });
        }
      },

      checkOwnership: async (itemId: string) => {
        const { ownedItemIds } = get();

        // Check cache first
        if (ownedItemIds.has(itemId)) {
          return true;
        }

        try {
          const data = await apiRequest<{
            success: boolean;
            owned: boolean;
          }>(`/items/${itemId}/ownership`);

          if (data.owned) {
            set((state) => ({
              ownedItemIds: new Set([...state.ownedItemIds, itemId]),
            }));
          }

          return data.owned;
        } catch (error) {
          console.error('[Marketplace] Failed to check ownership:', error);
          return false;
        }
      },

      initiatePurchase: async (itemId: string, purchaseType: PurchaseType) => {
        set({
          purchaseFlow: {
            isProcessing: true,
            itemId,
            purchaseType,
            error: null,
          },
        });

        try {
          const data = await apiRequest<{
            success: boolean;
            free?: boolean;
            alreadyOwned?: boolean;
            checkoutUrl?: string;
            sessionId?: string;
            message?: string;
          }>(`/items/${itemId}/purchase`, {
            method: 'POST',
            body: JSON.stringify({ purchaseType }),
          });

          // Handle free item or already owned
          if (data.free || data.alreadyOwned) {
            set((state) => ({
              ownedItemIds: new Set([...state.ownedItemIds, itemId]),
              purchaseFlow: {
                ...initialPurchaseFlow,
              },
            }));
            // Refresh purchases
            get().fetchPurchases();
            return null;
          }

          // Return checkout URL for redirect
          if (data.checkoutUrl) {
            set({
              purchaseFlow: {
                isProcessing: false,
                itemId,
                purchaseType,
                error: null,
              },
            });
            return data.checkoutUrl;
          }

          throw new Error(data.message || 'Purchase failed');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Purchase failed';
          set({
            purchaseFlow: {
              isProcessing: false,
              itemId,
              purchaseType,
              error: message,
            },
          });
          return null;
        }
      },

      completePurchase: (itemId: string) => {
        set((state) => ({
          ownedItemIds: new Set([...state.ownedItemIds, itemId]),
          purchaseFlow: initialPurchaseFlow,
        }));
        // Refresh purchases list
        get().fetchPurchases();
      },

      clearPurchaseError: () => {
        set((state) => ({
          purchaseFlow: {
            ...state.purchaseFlow,
            error: null,
          },
        }));
      },

      setFilters: (filters: Partial<MarketplaceFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: initialFilters });
      },

      addOwnedItem: (itemId: string) => {
        set((state) => ({
          ownedItemIds: new Set([...state.ownedItemIds, itemId]),
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'marketplace-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist filters, not purchase state
      partialize: (state) => ({
        filters: state.filters,
      }),
      // Handle Set serialization
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.ownedItemIds = new Set();
        }
      },
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const useMarketplacePurchases = () =>
  useMarketplaceStore((state) => state.purchases);

export const useMarketplaceFilters = () =>
  useMarketplaceStore((state) => state.filters);

export const usePurchaseFlow = () =>
  useMarketplaceStore((state) => state.purchaseFlow);

export const useIsItemOwned = (itemId: string) =>
  useMarketplaceStore((state) => state.ownedItemIds.has(itemId));

export const useIsLoadingPurchases = () =>
  useMarketplaceStore((state) => state.isLoadingPurchases);
