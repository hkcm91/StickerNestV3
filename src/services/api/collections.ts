/**
 * Collections API Module
 * Canvas folder/collection management
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse, Canvas, CanvasCollection } from './types';

export const collectionsApi = {
  /**
   * List collections
   */
  async list(): Promise<ApiResponse<{ collections: CanvasCollection[] }>> {
    return request<{ collections: CanvasCollection[] }>('/collections', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Create collection
   */
  async create(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<ApiResponse<{ collection: CanvasCollection }>> {
    return request<{ collection: CanvasCollection }>('/collections', {
      method: 'POST',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Update collection
   */
  async update(
    id: string,
    data: { name?: string; description?: string; color?: string; icon?: string }
  ): Promise<ApiResponse<{ collection: CanvasCollection }>> {
    return request<{ collection: CanvasCollection }>(`/collections/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Delete collection
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/collections/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Get canvases in collection
   */
  async getCanvases(
    id: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<Canvas>>> {
    return request<PaginatedResponse<Canvas>>(
      `/collections/${id}/canvases?page=${page}&pageSize=${pageSize}`,
      { method: 'GET', requiresAuth: true }
    );
  },

  /**
   * Add canvas to collection
   */
  async addCanvas(collectionId: string, canvasId: string): Promise<ApiResponse<void>> {
    return request<void>(`/collections/${collectionId}/canvases`, {
      method: 'POST',
      requiresAuth: true,
      body: { canvasId },
    });
  },

  /**
   * Remove canvas from collection
   */
  async removeCanvas(collectionId: string, canvasId: string): Promise<ApiResponse<void>> {
    return request<void>(`/collections/${collectionId}/canvases/${canvasId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
