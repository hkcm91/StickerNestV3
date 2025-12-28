/**
 * Marketplace Store Tests
 *
 * Unit tests for the marketplace Zustand store including:
 * - Purchase fetching
 * - Ownership checking
 * - Purchase flow
 * - Filters management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useMarketplaceStore,
  useMarketplacePurchases,
  useMarketplaceFilters,
  usePurchaseFlow,
  useIsItemOwned,
  useIsLoadingPurchases,
  type PurchasedItem,
} from './useMarketplaceStore';

// ==================
// Mock Setup
// ==================

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock responses
function createMockResponse<T>(data: T, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  };
}

// Mock purchase data
const mockPurchases: PurchasedItem[] = [
  {
    id: 'purchase-1',
    itemId: 'item-1',
    purchaseType: 'one_time',
    status: 'completed',
    purchasedAt: '2024-01-15T00:00:00Z',
    item: {
      id: 'item-1',
      name: 'Widget One',
      slug: 'widget-one',
      thumbnailUrl: null,
    },
  },
  {
    id: 'purchase-2',
    itemId: 'item-2',
    purchaseType: 'free',
    status: 'completed',
    purchasedAt: '2024-01-16T00:00:00Z',
    item: {
      id: 'item-2',
      name: 'Widget Two',
      slug: 'widget-two',
      thumbnailUrl: '/images/widget-two.png',
    },
  },
];

// ==================
// Tests
// ==================

describe('useMarketplaceStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useMarketplaceStore.getState().reset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useMarketplaceStore.getState();

      expect(state.purchases).toEqual([]);
      expect(state.ownedItemIds.size).toBe(0);
      expect(state.isLoadingPurchases).toBe(false);
      expect(state.lastFetchedAt).toBeNull();
      expect(state.purchaseFlow.isProcessing).toBe(false);
      expect(state.purchaseFlow.error).toBeNull();
      expect(state.filters.search).toBe('');
      expect(state.filters.sortBy).toBe('popular');
    });
  });

  describe('fetchPurchases', () => {
    it('should fetch and store purchases', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: mockPurchases })
      );

      await act(async () => {
        await useMarketplaceStore.getState().fetchPurchases();
      });

      const state = useMarketplaceStore.getState();

      expect(state.purchases).toHaveLength(2);
      expect(state.ownedItemIds.has('item-1')).toBe(true);
      expect(state.ownedItemIds.has('item-2')).toBe(true);
      expect(state.isLoadingPurchases).toBe(false);
      expect(state.lastFetchedAt).not.toBeNull();
    });

    it('should skip fetch if recently fetched', async () => {
      // First fetch
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: mockPurchases })
      );

      await act(async () => {
        await useMarketplaceStore.getState().fetchPurchases();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second fetch immediately after
      await act(async () => {
        await useMarketplaceStore.getState().fetchPurchases();
      });

      // Should still be 1 call (skipped second)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useMarketplaceStore.getState().fetchPurchases();
      });

      const state = useMarketplaceStore.getState();

      expect(state.purchases).toEqual([]);
      expect(state.isLoadingPurchases).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(fetchPromise);

      // Start fetch
      const fetchAction = useMarketplaceStore.getState().fetchPurchases();

      // Check loading state
      expect(useMarketplaceStore.getState().isLoadingPurchases).toBe(true);

      // Resolve fetch
      await act(async () => {
        resolvePromise!(createMockResponse({ success: true, purchases: [] }));
        await fetchAction;
      });

      expect(useMarketplaceStore.getState().isLoadingPurchases).toBe(false);
    });
  });

  describe('checkOwnership', () => {
    it('should return true from cache if already owned', async () => {
      // Add item to owned set
      useMarketplaceStore.getState().addOwnedItem('item-cached');

      const owned = await useMarketplaceStore.getState().checkOwnership('item-cached');

      expect(owned).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch ownership if not in cache', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, owned: true })
      );

      const owned = await useMarketplaceStore.getState().checkOwnership('item-new');

      expect(owned).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/marketplace/items/item-new/ownership',
        expect.any(Object)
      );

      // Should now be in cache
      expect(useMarketplaceStore.getState().ownedItemIds.has('item-new')).toBe(true);
    });

    it('should return false if not owned', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, owned: false })
      );

      const owned = await useMarketplaceStore.getState().checkOwnership('item-notowned');

      expect(owned).toBe(false);
      expect(useMarketplaceStore.getState().ownedItemIds.has('item-notowned')).toBe(false);
    });

    it('should handle error and return false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed'));

      const owned = await useMarketplaceStore.getState().checkOwnership('item-error');

      expect(owned).toBe(false);
    });
  });

  describe('initiatePurchase', () => {
    it('should handle free item purchase', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, free: true })
      );
      // Mock fetchPurchases call
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: [] })
      );

      const checkoutUrl = await useMarketplaceStore.getState().initiatePurchase(
        'item-free',
        'one_time'
      );

      expect(checkoutUrl).toBeNull();
      expect(useMarketplaceStore.getState().ownedItemIds.has('item-free')).toBe(true);
      expect(useMarketplaceStore.getState().purchaseFlow.isProcessing).toBe(false);
    });

    it('should handle already owned item', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, alreadyOwned: true })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: [] })
      );

      const checkoutUrl = await useMarketplaceStore.getState().initiatePurchase(
        'item-owned',
        'one_time'
      );

      expect(checkoutUrl).toBeNull();
      expect(useMarketplaceStore.getState().ownedItemIds.has('item-owned')).toBe(true);
    });

    it('should return checkout URL for paid item', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          checkoutUrl: 'https://checkout.stripe.com/test',
          sessionId: 'cs_test123',
        })
      );

      const checkoutUrl = await useMarketplaceStore.getState().initiatePurchase(
        'item-paid',
        'one_time'
      );

      expect(checkoutUrl).toBe('https://checkout.stripe.com/test');
      expect(useMarketplaceStore.getState().purchaseFlow.isProcessing).toBe(false);
      expect(useMarketplaceStore.getState().purchaseFlow.itemId).toBe('item-paid');
    });

    it('should handle purchase error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Item not available' }, false)
      );

      const checkoutUrl = await useMarketplaceStore.getState().initiatePurchase(
        'item-unavailable',
        'one_time'
      );

      expect(checkoutUrl).toBeNull();
      expect(useMarketplaceStore.getState().purchaseFlow.error).toBe('Item not available');
      expect(useMarketplaceStore.getState().purchaseFlow.isProcessing).toBe(false);
    });

    it('should set processing state during purchase', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(fetchPromise);

      // Start purchase
      const purchasePromise = useMarketplaceStore.getState().initiatePurchase(
        'item-123',
        'monthly'
      );

      // Check processing state
      expect(useMarketplaceStore.getState().purchaseFlow.isProcessing).toBe(true);
      expect(useMarketplaceStore.getState().purchaseFlow.itemId).toBe('item-123');
      expect(useMarketplaceStore.getState().purchaseFlow.purchaseType).toBe('monthly');

      // Resolve
      await act(async () => {
        resolvePromise!(createMockResponse({ success: true, free: true }));
        await purchasePromise;
      });
    });
  });

  describe('completePurchase', () => {
    it('should add item to owned and clear purchase flow', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: [] })
      );

      await act(async () => {
        useMarketplaceStore.getState().completePurchase('item-completed');
      });

      const state = useMarketplaceStore.getState();

      expect(state.ownedItemIds.has('item-completed')).toBe(true);
      expect(state.purchaseFlow.isProcessing).toBe(false);
      expect(state.purchaseFlow.itemId).toBeNull();
    });
  });

  describe('clearPurchaseError', () => {
    it('should clear error while preserving other purchase flow state', async () => {
      // Set up error state
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Test error' }, false)
      );

      await useMarketplaceStore.getState().initiatePurchase('item-error', 'one_time');

      expect(useMarketplaceStore.getState().purchaseFlow.error).toBe('Test error');

      // Clear error
      act(() => {
        useMarketplaceStore.getState().clearPurchaseError();
      });

      const state = useMarketplaceStore.getState();

      expect(state.purchaseFlow.error).toBeNull();
      expect(state.purchaseFlow.itemId).toBe('item-error');
    });
  });

  describe('Filters', () => {
    it('should update filters partially', () => {
      act(() => {
        useMarketplaceStore.getState().setFilters({ search: 'widget' });
      });

      expect(useMarketplaceStore.getState().filters.search).toBe('widget');
      expect(useMarketplaceStore.getState().filters.sortBy).toBe('popular'); // Unchanged
    });

    it('should update multiple filters', () => {
      act(() => {
        useMarketplaceStore.getState().setFilters({
          search: 'sticker',
          category: 'art',
          freeOnly: true,
        });
      });

      const filters = useMarketplaceStore.getState().filters;

      expect(filters.search).toBe('sticker');
      expect(filters.category).toBe('art');
      expect(filters.freeOnly).toBe(true);
    });

    it('should reset filters to defaults', () => {
      // Set some filters
      act(() => {
        useMarketplaceStore.getState().setFilters({
          search: 'test',
          category: 'tools',
          freeOnly: true,
        });
      });

      // Reset
      act(() => {
        useMarketplaceStore.getState().resetFilters();
      });

      const filters = useMarketplaceStore.getState().filters;

      expect(filters.search).toBe('');
      expect(filters.category).toBe('');
      expect(filters.freeOnly).toBe(false);
      expect(filters.sortBy).toBe('popular');
    });
  });

  describe('addOwnedItem', () => {
    it('should add item to owned set', () => {
      act(() => {
        useMarketplaceStore.getState().addOwnedItem('new-item');
      });

      expect(useMarketplaceStore.getState().ownedItemIds.has('new-item')).toBe(true);
    });

    it('should not duplicate items', () => {
      act(() => {
        useMarketplaceStore.getState().addOwnedItem('item-x');
        useMarketplaceStore.getState().addOwnedItem('item-x');
      });

      expect(useMarketplaceStore.getState().ownedItemIds.size).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', async () => {
      // Modify state
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: mockPurchases })
      );

      await act(async () => {
        await useMarketplaceStore.getState().fetchPurchases();
        useMarketplaceStore.getState().setFilters({ search: 'test' });
      });

      // Verify modified
      expect(useMarketplaceStore.getState().purchases.length).toBeGreaterThan(0);
      expect(useMarketplaceStore.getState().filters.search).toBe('test');

      // Reset
      act(() => {
        useMarketplaceStore.getState().reset();
      });

      const state = useMarketplaceStore.getState();

      expect(state.purchases).toEqual([]);
      expect(state.ownedItemIds.size).toBe(0);
      expect(state.filters.search).toBe('');
      expect(state.lastFetchedAt).toBeNull();
    });
  });
});

// ==================
// Selector Hooks Tests
// ==================

describe('Selector Hooks', () => {
  beforeEach(() => {
    useMarketplaceStore.getState().reset();
    mockFetch.mockReset();
  });

  describe('useMarketplacePurchases', () => {
    it('should return purchases from store', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true, purchases: mockPurchases })
      );

      await act(async () => {
        await useMarketplaceStore.getState().fetchPurchases();
      });

      const { result } = renderHook(() => useMarketplacePurchases());

      expect(result.current).toHaveLength(2);
      expect(result.current[0].item.name).toBe('Widget One');
    });
  });

  describe('useMarketplaceFilters', () => {
    it('should return current filters', () => {
      act(() => {
        useMarketplaceStore.getState().setFilters({ category: 'tools' });
      });

      const { result } = renderHook(() => useMarketplaceFilters());

      expect(result.current.category).toBe('tools');
    });
  });

  describe('usePurchaseFlow', () => {
    it('should return purchase flow state', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const purchasePromise = useMarketplaceStore.getState().initiatePurchase(
        'item-test',
        'yearly'
      );

      const { result } = renderHook(() => usePurchaseFlow());

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.itemId).toBe('item-test');
      expect(result.current.purchaseType).toBe('yearly');

      // Cleanup
      await act(async () => {
        resolvePromise!(createMockResponse({ success: true, free: true }));
        await purchasePromise;
      });
    });
  });

  describe('useIsItemOwned', () => {
    it('should return true for owned item', () => {
      act(() => {
        useMarketplaceStore.getState().addOwnedItem('owned-item');
      });

      const { result } = renderHook(() => useIsItemOwned('owned-item'));

      expect(result.current).toBe(true);
    });

    it('should return false for non-owned item', () => {
      const { result } = renderHook(() => useIsItemOwned('not-owned'));

      expect(result.current).toBe(false);
    });

    it('should update when ownership changes', async () => {
      const { result, rerender } = renderHook(() => useIsItemOwned('dynamic-item'));

      expect(result.current).toBe(false);

      act(() => {
        useMarketplaceStore.getState().addOwnedItem('dynamic-item');
      });

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('useIsLoadingPurchases', () => {
    it('should return loading state', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const fetchPromise = useMarketplaceStore.getState().fetchPurchases();

      const { result } = renderHook(() => useIsLoadingPurchases());

      expect(result.current).toBe(true);

      // Cleanup
      await act(async () => {
        resolvePromise!(createMockResponse({ success: true, purchases: [] }));
        await fetchPromise;
      });
    });
  });
});
