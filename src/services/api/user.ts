/**
 * User API Module
 * User profile and stats management
 */

import { request } from './client';
import type {
  ApiResponse,
  UserProfile,
  UserStats,
  ExtendedUserProfile,
  UpdateProfileInput,
} from './types';

/** Searchable user result */
export interface SearchableUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  isCreator: boolean;
  followerCount: number;
  canvasCount: number;
}

export const userApi = {
  /**
   * Get user stats (for dashboard)
   */
  async getStats(): Promise<ApiResponse<UserStats>> {
    return request<UserStats>('/user/stats', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get own profile
   */
  async getProfile(): Promise<ApiResponse<{ profile: ExtendedUserProfile }>> {
    return request<{ profile: ExtendedUserProfile }>('/user/profile', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get user profile by username (public)
   */
  async getProfileByUsername(username: string): Promise<ApiResponse<{ profile: ExtendedUserProfile }>> {
    return request<{ profile: ExtendedUserProfile }>(`/user/profile/${username}`, {
      method: 'GET',
    });
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileInput): Promise<ApiResponse<{ user: UserProfile }>> {
    return request<{ user: UserProfile }>('/user/profile', {
      method: 'PUT',
      requiresAuth: true,
      body: data,
    });
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return request<{ avatarUrl: string }>('/user/avatar', {
      method: 'POST',
      requiresAuth: true,
      body: formData,
    });
  },

  /**
   * Search for users by username or display name
   */
  async searchUsers(query: string, limit = 20): Promise<ApiResponse<{ users: SearchableUser[] }>> {
    return request<{ users: SearchableUser[] }>(`/user/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      method: 'GET',
    });
  },

  /**
   * Get suggested users to follow
   */
  async getSuggestedUsers(limit = 5): Promise<ApiResponse<{ users: SearchableUser[] }>> {
    return request<{ users: SearchableUser[] }>(`/user/suggested?limit=${limit}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
