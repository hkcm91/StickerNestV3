/**
 * Marketplace API Module
 * Marketplace items, stickers, widgets, and purchases
 */

import { request } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  MarketplaceItem,
  MarketplaceItemType,
  MarketplaceItemListQuery,
  CreateMarketplaceItemInput,
  MarketplaceComment,
  Sticker,
  MarketplaceWidget,
  MarketplaceListQuery,
  PublishWidgetInput,
} from './types';

/**
 * New multi-type marketplace API
 */
export const marketplaceItemsApi = {
  /**
   * List marketplace items (all types)
   */
  async list(query?: MarketplaceItemListQuery): Promise<ApiResponse<PaginatedResponse<MarketplaceItem>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, String(v)));
          } else {
            params.set(key, String(value));
          }
        }
      });
    }
    const queryString = params.toString();
    return request<PaginatedResponse<MarketplaceItem>>(
      `/marketplace/items${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  /**
   * Get item by slug or ID
   */
  async getBySlug(slug: string): Promise<ApiResponse<{ item: MarketplaceItem; stickers?: Sticker[] }>> {
    return request<{ item: MarketplaceItem; stickers?: Sticker[] }>(`/marketplace/items/${slug}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new marketplace item
   */
  async create(input: CreateMarketplaceItemInput): Promise<ApiResponse<{ item: MarketplaceItem }>> {
    return request<{ item: MarketplaceItem }>('/marketplace/items', {
      method: 'POST',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Update a marketplace item
   */
  async update(id: string, input: Partial<CreateMarketplaceItemInput>): Promise<ApiResponse<{ item: MarketplaceItem }>> {
    return request<{ item: MarketplaceItem }>(`/marketplace/items/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Delete a marketplace item
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/marketplace/items/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Publish a new version
   */
  async publishVersion(id: string, data: {
    version: string;
    content: Record<string, unknown>;
    changelog?: string;
    bundlePath?: string;
  }): Promise<ApiResponse<{ version: { id: string; version: string } }>> {
    return request<{ version: { id: string; version: string } }>(`/marketplace/items/${id}/versions`, {
      method: 'POST',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Rate an item
   */
  async rate(id: string, rating: number): Promise<ApiResponse<void>> {
    return request<void>(`/marketplace/items/${id}/rate`, {
      method: 'POST',
      requiresAuth: true,
      body: { rating },
    });
  },

  /**
   * Add a comment
   */
  async addComment(id: string, content: string, parentId?: string): Promise<ApiResponse<{ comment: MarketplaceComment }>> {
    return request<{ comment: MarketplaceComment }>(`/marketplace/items/${id}/comments`, {
      method: 'POST',
      requiresAuth: true,
      body: { content, parentId },
    });
  },

  /**
   * Get comments for an item
   */
  async getComments(
    id: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<MarketplaceComment>>> {
    return request<PaginatedResponse<MarketplaceComment>>(
      `/marketplace/items/${id}/comments?page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
  },

  /**
   * Get my marketplace items
   */
  async getMyItems(itemType?: MarketplaceItemType): Promise<ApiResponse<{ items: MarketplaceItem[] }>> {
    const params = itemType ? `?itemType=${itemType}` : '';
    return request<{ items: MarketplaceItem[] }>(`/marketplace/my-items${params}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get featured items
   */
  async getFeatured(itemType?: MarketplaceItemType): Promise<ApiResponse<{ items: MarketplaceItem[] }>> {
    const params = itemType ? `?itemType=${itemType}` : '';
    return request<{ items: MarketplaceItem[] }>(`/marketplace/featured${params}`, {
      method: 'GET',
    });
  },

  /**
   * Get stickers from a sticker pack
   */
  async getStickers(packId: string): Promise<ApiResponse<{ stickers: Sticker[] }>> {
    return request<{ stickers: Sticker[] }>(`/marketplace/sticker-packs/${packId}/stickers`, {
      method: 'GET',
    });
  },

  /**
   * Add sticker to a pack
   */
  async addSticker(packId: string, sticker: FormData): Promise<ApiResponse<{ sticker: Sticker }>> {
    return request<{ sticker: Sticker }>(`/marketplace/sticker-packs/${packId}/stickers`, {
      method: 'POST',
      requiresAuth: true,
      body: sticker,
    });
  },

  /**
   * Remove sticker from a pack
   */
  async removeSticker(packId: string, stickerId: string): Promise<ApiResponse<void>> {
    return request<void>(`/marketplace/sticker-packs/${packId}/stickers/${stickerId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Purchase an item
   */
  async purchase(itemId: string, priceType: 'one_time' | 'monthly' | 'yearly' = 'one_time'): Promise<ApiResponse<{
    free?: boolean;
    checkoutUrl?: string;
    purchaseId?: string;
  }>> {
    return request<{ free?: boolean; checkoutUrl?: string; purchaseId?: string }>(`/marketplace/items/${itemId}/purchase`, {
      method: 'POST',
      requiresAuth: true,
      body: { priceType },
    });
  },

  /**
   * Check if user owns an item
   */
  async checkOwnership(itemId: string): Promise<ApiResponse<{ owned: boolean; purchase?: { id: string; purchasedAt: string } }>> {
    return request<{ owned: boolean; purchase?: { id: string; purchasedAt: string } }>(`/marketplace/items/${itemId}/ownership`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

/**
 * Legacy Marketplace API (Widgets Only - Backward Compatibility)
 */
export const marketplaceApi = {
  /**
   * List marketplace widgets (legacy)
   */
  async list(query?: MarketplaceListQuery): Promise<ApiResponse<PaginatedResponse<MarketplaceWidget>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v));
          } else {
            params.set(key, String(value));
          }
        }
      });
    }
    const queryString = params.toString();
    return request<PaginatedResponse<MarketplaceWidget>>(
      `/marketplace/list${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  /**
   * Get widget by ID (legacy)
   */
  async getById(id: string): Promise<ApiResponse<{ widget: MarketplaceWidget }>> {
    return request<{ widget: MarketplaceWidget }>(`/marketplace/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Publish a widget (legacy)
   */
  async publish(input: PublishWidgetInput): Promise<ApiResponse<{ widget: MarketplaceWidget }>> {
    return request<{ widget: MarketplaceWidget }>('/marketplace/publish', {
      method: 'POST',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Rate a widget (legacy)
   */
  async rate(id: string, rating: number): Promise<ApiResponse<void>> {
    return request<void>(`/marketplace/${id}/rate`, {
      method: 'POST',
      requiresAuth: true,
      body: { rating },
    });
  },

  /**
   * Add a comment (legacy)
   */
  async addComment(id: string, content: string): Promise<ApiResponse<{ comment: MarketplaceComment }>> {
    return request<{ comment: MarketplaceComment }>(`/marketplace/${id}/comment`, {
      method: 'POST',
      requiresAuth: true,
      body: { content },
    });
  },

  /**
   * Get comments for a widget (legacy)
   */
  async getComments(
    id: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<MarketplaceComment>>> {
    return request<PaginatedResponse<MarketplaceComment>>(
      `/marketplace/${id}/comments?page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
  },
};
