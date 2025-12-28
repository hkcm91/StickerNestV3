/**
 * Canvas API Module
 * Canvas CRUD and version management endpoints
 */

import { request } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Canvas,
  CanvasVersion,
  CreateCanvasInput,
  UpdateCanvasInput,
  CanvasListQuery,
} from './types';

export const canvasApi = {
  /**
   * Create a new canvas
   */
  async create(input: CreateCanvasInput): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>('/canvas', {
      method: 'POST',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * List user's canvases
   */
  async list(query?: CanvasListQuery): Promise<ApiResponse<PaginatedResponse<Canvas>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return request<PaginatedResponse<Canvas>>(`/canvas${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get canvas by ID
   */
  async getById(id: string): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>(`/canvas/${id}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get canvas by slug (public)
   */
  async getBySlug(slug: string): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>(`/canvas/s/${slug}`, {
      method: 'GET',
    });
  },

  /**
   * Update canvas
   */
  async update(id: string, input: UpdateCanvasInput): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>(`/canvas/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Delete canvas
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/canvas/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Fork a canvas
   */
  async fork(id: string, name?: string): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>(`/canvas/${id}/fork`, {
      method: 'POST',
      requiresAuth: true,
      body: name ? { name } : undefined,
    });
  },

  /**
   * Get canvas versions
   */
  async getVersions(id: string): Promise<ApiResponse<{ versions: CanvasVersion[] }>> {
    return request<{ versions: CanvasVersion[] }>(`/canvas/${id}/versions`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Create a version snapshot
   */
  async createVersion(id: string, name?: string): Promise<ApiResponse<{ version: CanvasVersion }>> {
    return request<{ version: CanvasVersion }>(`/canvas/${id}/versions`, {
      method: 'POST',
      requiresAuth: true,
      body: name ? { name } : undefined,
    });
  },

  /**
   * Restore to a version
   */
  async restoreVersion(canvasId: string, versionId: string): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>(`/canvas/${canvasId}/versions/${versionId}/restore`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
