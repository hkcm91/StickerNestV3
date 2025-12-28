/**
 * Templates API Module
 * Canvas templates management
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse, Canvas, CanvasTemplate } from './types';

export const templatesApi = {
  /**
   * List templates
   */
  async list(
    category?: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<CanvasTemplate>>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (category) params.set('category', category);
    return request<PaginatedResponse<CanvasTemplate>>(`/templates?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<ApiResponse<{ template: CanvasTemplate; canvas: Canvas }>> {
    return request<{ template: CanvasTemplate; canvas: Canvas }>(`/templates/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create canvas from template
   */
  async useTemplate(templateId: string, name?: string): Promise<ApiResponse<{ canvas: Canvas }>> {
    return request<{ canvas: Canvas }>(`/templates/${templateId}/use`, {
      method: 'POST',
      requiresAuth: true,
      body: name ? { name } : undefined,
    });
  },

  /**
   * Get template categories
   */
  async getCategories(): Promise<ApiResponse<{ categories: { name: string; count: number }[] }>> {
    return request<{ categories: { name: string; count: number }[] }>('/templates/categories', {
      method: 'GET',
    });
  },
};
