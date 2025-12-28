/**
 * Verification API Module
 * Email verification and password reset
 */

import { request } from './client';
import type { ApiResponse } from './types';

export const verificationApi = {
  /**
   * Send verification email
   */
  async sendVerificationEmail(): Promise<ApiResponse<void>> {
    return request<void>('/auth/send-verification', {
      method: 'POST',
      requiresAuth: true,
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
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  },
};
