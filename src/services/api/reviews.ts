/**
 * Reviews API Module
 * Marketplace widget reviews
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse, WidgetReview } from './types';

export const reviewsApi = {
  /**
   * Get reviews for a widget
   */
  async list(
    widgetId: string,
    page = 1,
    pageSize = 10
  ): Promise<ApiResponse<PaginatedResponse<WidgetReview> & { averageRating: number; ratingBreakdown: Record<number, number> }>> {
    return request<PaginatedResponse<WidgetReview> & { averageRating: number; ratingBreakdown: Record<number, number> }>(
      `/marketplace/${widgetId}/reviews?page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
  },

  /**
   * Add review
   */
  async add(
    widgetId: string,
    data: { rating: number; title?: string; content: string }
  ): Promise<ApiResponse<{ review: WidgetReview }>> {
    return request<{ review: WidgetReview }>(`/marketplace/${widgetId}/reviews`, {
      method: 'POST',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Edit review
   */
  async edit(
    reviewId: string,
    data: { rating?: number; title?: string; content?: string }
  ): Promise<ApiResponse<{ review: WidgetReview }>> {
    return request<{ review: WidgetReview }>(`/reviews/${reviewId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Delete review
   */
  async delete(reviewId: string): Promise<ApiResponse<void>> {
    return request<void>(`/reviews/${reviewId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string): Promise<ApiResponse<{ helpful: number }>> {
    return request<{ helpful: number }>(`/reviews/${reviewId}/helpful`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
