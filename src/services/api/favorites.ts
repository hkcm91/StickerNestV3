/**
 * Favorites API Module
 * Canvas favorites and collections management
 */

import { request } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  FavoriteCanvas,
  FavoriteCollection,
} from './types';

export const favoritesApi = {
  /**
   * Add canvas to favorites
   */
  async add(canvasId: string, collectionId?: string): Promise<ApiResponse<{ favorite: FavoriteCanvas }>> {
    return request<{ favorite: FavoriteCanvas }>('/favorites', {
      method: 'POST',
      requiresAuth: true,
      body: { canvasId, collectionId },
    });
  },

  /**
   * Remove from favorites
   */
  async remove(canvasId: string): Promise<ApiResponse<void>> {
    return request<void>(`/favorites/${canvasId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Check if canvas is favorited
   */
  async isFavorited(canvasId: string): Promise<ApiResponse<{ isFavorited: boolean }>> {
    return request<{ isFavorited: boolean }>(`/favorites/${canvasId}/check`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * List favorites
   */
  async list(
    collectionId?: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<FavoriteCanvas>>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (collectionId) params.set('collectionId', collectionId);
    return request<PaginatedResponse<FavoriteCanvas>>(`/favorites?${params.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Create a collection
   */
  async createCollection(data: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<{ collection: FavoriteCollection }>> {
    return request<{ collection: FavoriteCollection }>('/favorites/collections', {
      method: 'POST',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * List collections
   */
  async listCollections(): Promise<ApiResponse<{ collections: FavoriteCollection[] }>> {
    return request<{ collections: FavoriteCollection[] }>('/favorites/collections', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Update a collection
   */
  async updateCollection(
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean }
  ): Promise<ApiResponse<{ collection: FavoriteCollection }>> {
    return request<{ collection: FavoriteCollection }>(`/favorites/collections/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Delete a collection
   */
  async deleteCollection(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/favorites/collections/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Move item to collection
   */
  async moveToCollection(canvasId: string, collectionId: string | null): Promise<ApiResponse<void>> {
    return request<void>(`/favorites/${canvasId}/move`, {
      method: 'PUT',
      requiresAuth: true,
      body: { collectionId },
    });
  },
};
