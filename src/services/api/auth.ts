/**
 * Auth API Module
 * Authentication and account management endpoints
 */

import { request, setAccessToken, cacheUser, clearAuthData } from './client';
import type { ApiResponse, UserProfile } from './types';

export const authApi = {
  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    username?: string;
    inviteCode?: string;
  }): Promise<ApiResponse<{ user: UserProfile; accessToken: string }>> {
    const response = await request<{ user: UserProfile; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: data,
    });

    if (response.success && response.data) {
      setAccessToken(response.data.accessToken);
      cacheUser(response.data.user);
    }

    return response;
  },

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<ApiResponse<{ user: UserProfile; accessToken: string }>> {
    const response = await request<{ user: UserProfile; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (response.success && response.data) {
      setAccessToken(response.data.accessToken);
      cacheUser(response.data.user);
    }

    return response;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await request<void>('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    });

    clearAuthData();
    return response;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: UserProfile }>> {
    const response = await request<{ user: UserProfile }>('/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });

    if (response.success && response.data) {
      cacheUser(response.data.user);
    }

    return response;
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },

  /**
   * Update password (authenticated)
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/update-password', {
      method: 'POST',
      requiresAuth: true,
      body: { currentPassword, newPassword },
    });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  },

  /**
   * Resend verification email
   */
  async resendVerification(): Promise<ApiResponse<void>> {
    return request<void>('/auth/resend-verification', {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Delete account
   */
  async deleteAccount(password: string): Promise<ApiResponse<void>> {
    const response = await request<void>('/auth/delete-account', {
      method: 'DELETE',
      requiresAuth: true,
      body: { password },
    });

    if (response.success) {
      clearAuthData();
    }

    return response;
  },
};
