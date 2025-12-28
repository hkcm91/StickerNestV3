/**
 * SocialGraphService
 *
 * Manages social relationships (follow, block) via the backend API.
 * Previously used direct Supabase calls, now uses /api/social/* endpoints.
 */

import { followApi, blockApi, profileApi } from '../api';

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followedAt?: string;
}

export const SocialGraphService = {
  /**
   * Follow a user
   */
  async followUser(targetId: string): Promise<void> {
    const result = await followApi.follow(targetId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to follow user');
    }
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(targetId: string): Promise<void> {
    const result = await followApi.unfollow(targetId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to unfollow user');
    }
  },

  /**
   * Get followers for a user
   */
  async getFollowers(userId: string): Promise<UserProfile[]> {
    const result = await followApi.getFollowers(userId, 1, 100);
    if (!result.success || !result.data) {
      return [];
    }
    return result.data.items.map((item) => ({
      id: item.id,
      username: item.username,
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
      followedAt: item.followedAt,
    }));
  },

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    const result = await followApi.getFollowing(userId, 1, 100);
    if (!result.success || !result.data) {
      return [];
    }
    return result.data.items.map((item) => ({
      id: item.id,
      username: item.username,
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
      followedAt: item.followedAt,
    }));
  },

  /**
   * Check if current user is following target user
   */
  async checkIsFollowing(targetId: string): Promise<boolean> {
    const result = await followApi.isFollowing(targetId);
    if (!result.success || !result.data) {
      return false;
    }
    return result.data.isFollowing;
  },

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    const result = await blockApi.block(userId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to block user');
    }
  },

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    const result = await blockApi.unblock(userId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to unblock user');
    }
  },

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<UserProfile[]> {
    const result = await blockApi.getBlockedUsers(1, 100);
    if (!result.success || !result.data) {
      return [];
    }
    return result.data.items.map((item) => ({
      id: item.id,
      username: item.username,
      avatarUrl: item.avatarUrl,
    }));
  },

  /**
   * Get user's social profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await profileApi.getUserProfile(userId);
    if (!result.success || !result.data) {
      return null;
    }
    return {
      id: result.data.userId,
      username: result.data.displayName || userId,
      displayName: result.data.displayName,
      avatarUrl: undefined, // Profile endpoint doesn't include avatar
      bio: result.data.bio,
    };
  },
};
