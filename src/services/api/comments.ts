/**
 * Comments API Module
 * Canvas comment management
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse, CanvasComment } from './types';

export const commentsApi = {
  /**
   * Get comments for a canvas
   */
  async list(
    canvasId: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<CanvasComment>>> {
    return request<PaginatedResponse<CanvasComment>>(
      `/canvas/${canvasId}/comments?page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
  },

  /**
   * Add comment
   */
  async add(
    canvasId: string,
    content: string,
    parentId?: string
  ): Promise<ApiResponse<{ comment: CanvasComment }>> {
    return request<{ comment: CanvasComment }>(`/canvas/${canvasId}/comments`, {
      method: 'POST',
      requiresAuth: true,
      body: { content, parentId },
    });
  },

  /**
   * Edit comment
   */
  async edit(commentId: string, content: string): Promise<ApiResponse<{ comment: CanvasComment }>> {
    return request<{ comment: CanvasComment }>(`/comments/${commentId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: { content },
    });
  },

  /**
   * Delete comment
   */
  async delete(commentId: string): Promise<ApiResponse<void>> {
    return request<void>(`/comments/${commentId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Like/unlike comment
   */
  async toggleLike(commentId: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return request<{ liked: boolean; likes: number }>(`/comments/${commentId}/like`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Get replies
   */
  async getReplies(
    commentId: string,
    page = 1,
    pageSize = 10
  ): Promise<ApiResponse<PaginatedResponse<CanvasComment>>> {
    return request<PaginatedResponse<CanvasComment>>(
      `/comments/${commentId}/replies?page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
  },
};
