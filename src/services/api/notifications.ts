/**
 * Notifications API Module
 * User notifications and preferences
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse, Notification } from './types';

export const notificationsApi = {
  /**
   * Get notifications
   */
  async list(
    page = 1,
    pageSize = 20,
    unreadOnly = false
  ): Promise<ApiResponse<PaginatedResponse<Notification> & { unreadCount: number }>> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      unreadOnly: String(unreadOnly),
    });
    return request<PaginatedResponse<Notification> & { unreadCount: number }>(
      `/notifications?${params.toString()}`,
      { method: 'GET', requiresAuth: true }
    );
  },

  /**
   * Mark notification as read
   */
  async markRead(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/notifications/${id}/read`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Mark all as read
   */
  async markAllRead(): Promise<ApiResponse<void>> {
    return request<void>('/notifications/read-all', {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return request<{ count: number }>('/notifications/unread-count', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(prefs: {
    emailNotifications?: boolean;
    followNotifications?: boolean;
    commentNotifications?: boolean;
    marketingEmails?: boolean;
  }): Promise<ApiResponse<void>> {
    return request<void>('/notifications/preferences', {
      method: 'PUT',
      requiresAuth: true,
      body: prefs,
    });
  },
};
