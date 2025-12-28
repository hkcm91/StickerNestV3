/**
 * OAuth API Module
 * Social login and provider management
 */

import { request, API_BASE_URL, setAccessToken, cacheUser } from './client';
import type { ApiResponse, UserProfile } from './types';

export const oauthApi = {
  /**
   * Get OAuth login URL
   */
  getLoginUrl(provider: 'google' | 'github' | 'discord'): string {
    return `${API_BASE_URL}/auth/oauth/${provider}`;
  },

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    provider: 'google' | 'github' | 'discord',
    code: string
  ): Promise<ApiResponse<{ user: UserProfile; accessToken: string }>> {
    const response = await request<{ user: UserProfile; accessToken: string }>(
      `/auth/oauth/${provider}/callback`,
      {
        method: 'POST',
        body: { code },
      }
    );

    if (response.success && response.data) {
      setAccessToken(response.data.accessToken);
      cacheUser(response.data.user);
    }

    return response;
  },

  /**
   * Link OAuth provider to existing account
   */
  async linkProvider(
    provider: 'google' | 'github' | 'discord',
    code: string
  ): Promise<ApiResponse<void>> {
    return request<void>(`/auth/oauth/${provider}/link`, {
      method: 'POST',
      requiresAuth: true,
      body: { code },
    });
  },

  /**
   * Unlink OAuth provider
   */
  async unlinkProvider(provider: 'google' | 'github' | 'discord'): Promise<ApiResponse<void>> {
    return request<void>(`/auth/oauth/${provider}/unlink`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Get linked providers
   */
  async getLinkedProviders(): Promise<ApiResponse<{ providers: string[] }>> {
    return request<{ providers: string[] }>('/auth/oauth/linked', {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
