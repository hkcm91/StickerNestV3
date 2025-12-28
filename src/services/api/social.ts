/**
 * Social API Module
 * Complete social layer endpoints: follows, blocks, notifications, chat, feed, collaboration
 *
 * Backend routes: /api/social/*
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse, FollowedUser, Notification } from './types';

// =============================================================================
// Social Types
// =============================================================================

export interface SocialProfile {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  twitterHandle?: string;
  githubHandle?: string;
  discordHandle?: string;
  privacyMode: 'public' | 'friends_only' | 'private';
  showOnlineStatus: boolean;
  allowDMs: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  twitterHandle?: string;
  githubHandle?: string;
  discordHandle?: string;
  privacyMode?: 'public' | 'friends_only' | 'private';
  showOnlineStatus?: boolean;
  allowDMs?: boolean;
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  members: ChatMember[];
  unreadCount?: number;
}

export interface ChatMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'canvas_link' | 'widget_link';
  replyToId?: string;
  attachments?: ChatAttachment[];
  reactions: Record<string, string[]>; // emoji -> userIds
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
}

export interface Activity {
  id: string;
  actorId: string;
  type: string;
  objectType: string;
  objectId: string;
  metadata?: Record<string, unknown>;
  visibility: 'public' | 'followers_only' | 'private';
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface CollaborationRoom {
  id: string;
  canvasId: string;
  ownerId: string;
  allowAnonymous: boolean;
  maxParticipants: number;
  isActive: boolean;
  createdAt: string;
  members: CollaborationMember[];
}

export interface CollaborationMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  username: string;
  avatarUrl?: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

// =============================================================================
// Follow API
// =============================================================================

export const followApi = {
  /**
   * Follow a user
   */
  async follow(userId: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/follow/${userId}`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Unfollow a user
   */
  async unfollow(userId: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/follow/${userId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Check if following a user
   */
  async isFollowing(userId: string): Promise<ApiResponse<{ isFollowing: boolean }>> {
    return request<{ isFollowing: boolean }>(`/social/follow/${userId}/check`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get followers
   */
  async getFollowers(
    userId?: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<FollowedUser>>> {
    const endpoint = userId ? `/social/followers/${userId}` : '/social/followers';
    return request<PaginatedResponse<FollowedUser>>(
      `${endpoint}?page=${page}&pageSize=${pageSize}`,
      { method: 'GET', requiresAuth: !userId }
    );
  },

  /**
   * Get following
   */
  async getFollowing(
    userId?: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<FollowedUser>>> {
    const endpoint = userId ? `/social/following/${userId}` : '/social/following';
    return request<PaginatedResponse<FollowedUser>>(
      `${endpoint}?page=${page}&pageSize=${pageSize}`,
      { method: 'GET', requiresAuth: !userId }
    );
  },
};

// =============================================================================
// Profile API
// =============================================================================

export const profileApi = {
  /**
   * Get current user's social profile
   */
  async getMyProfile(): Promise<ApiResponse<SocialProfile>> {
    return request<SocialProfile>('/social/profile', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Update current user's social profile
   */
  async updateProfile(data: UpdateProfileInput): Promise<ApiResponse<SocialProfile>> {
    return request<SocialProfile>('/social/profile', {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    });
  },

  /**
   * Get another user's profile
   */
  async getUserProfile(userId: string): Promise<ApiResponse<SocialProfile & { isFollowing?: boolean }>> {
    return request<SocialProfile & { isFollowing?: boolean }>(`/social/profile/${userId}`, {
      method: 'GET',
      requiresAuth: false,
    });
  },
};

// =============================================================================
// Block API
// =============================================================================

export const blockApi = {
  /**
   * Block a user
   */
  async block(userId: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/block/${userId}`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Unblock a user
   */
  async unblock(userId: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/block/${userId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Get blocked users
   */
  async getBlockedUsers(
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<{ id: string; username: string; avatarUrl?: string; blockedAt: string }>>> {
    return request(`/social/blocked?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

// =============================================================================
// Social Notifications API
// =============================================================================

export const socialNotificationsApi = {
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
      `/social/notifications?${params.toString()}`,
      { method: 'GET', requiresAuth: true }
    );
  },

  /**
   * Mark notification as read
   */
  async markRead(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/notifications/${id}/read`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Mark all as read
   */
  async markAllRead(): Promise<ApiResponse<{ count: number }>> {
    return request<{ count: number }>('/social/notifications/read-all', {
      method: 'POST',
      requiresAuth: true,
    });
  },
};

// =============================================================================
// Chat API
// =============================================================================

export const chatApi = {
  /**
   * Get chat rooms
   */
  async getRooms(): Promise<ApiResponse<ChatRoom[]>> {
    return request<ChatRoom[]>('/social/chat/rooms', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Create a chat room
   */
  async createRoom(data: {
    type: 'direct' | 'group';
    memberIds: string[];
    name?: string;
  }): Promise<ApiResponse<ChatRoom>> {
    return request<ChatRoom>('/social/chat/rooms', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  /**
   * Get a chat room by ID
   */
  async getRoom(roomId: string): Promise<ApiResponse<ChatRoom>> {
    return request<ChatRoom>(`/social/chat/rooms/${roomId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get messages in a room
   */
  async getMessages(
    roomId: string,
    page = 1,
    pageSize = 50,
    before?: string
  ): Promise<ApiResponse<PaginatedResponse<ChatMessage>>> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (before) params.set('before', before);
    return request<PaginatedResponse<ChatMessage>>(
      `/social/chat/rooms/${roomId}/messages?${params.toString()}`,
      { method: 'GET', requiresAuth: true }
    );
  },

  /**
   * Send a message
   */
  async sendMessage(
    roomId: string,
    data: {
      content: string;
      contentType?: 'text' | 'image' | 'file' | 'canvas_link' | 'widget_link';
      replyToId?: string;
      attachments?: ChatAttachment[];
    }
  ): Promise<ApiResponse<ChatMessage>> {
    return request<ChatMessage>(`/social/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  /**
   * Edit a message
   */
  async editMessage(
    roomId: string,
    messageId: string,
    content: string
  ): Promise<ApiResponse<ChatMessage>> {
    return request<ChatMessage>(`/social/chat/rooms/${roomId}/messages/${messageId}`, {
      method: 'PUT',
      body: { content },
      requiresAuth: true,
    });
  },

  /**
   * Delete a message
   */
  async deleteMessage(roomId: string, messageId: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/chat/rooms/${roomId}/messages/${messageId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Add reaction to message
   */
  async addReaction(
    roomId: string,
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<void>> {
    return request<void>(`/social/chat/rooms/${roomId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: { emoji },
      requiresAuth: true,
    });
  },

  /**
   * Remove reaction from message
   */
  async removeReaction(
    roomId: string,
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<void>> {
    return request<void>(`/social/chat/rooms/${roomId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

// =============================================================================
// Activity Feed API
// =============================================================================

export const feedApi = {
  /**
   * Get activity feed (global, following, or user-specific)
   */
  async getFeed(
    type: 'global' | 'following' | 'user' = 'global',
    options?: {
      userId?: string;
      page?: number;
      pageSize?: number;
      activityType?: string;
    }
  ): Promise<ApiResponse<PaginatedResponse<Activity>>> {
    const params = new URLSearchParams({
      page: String(options?.page || 1),
      pageSize: String(options?.pageSize || 20),
    });
    if (options?.activityType) params.set('type', options.activityType);

    let endpoint = '/social/feed';
    if (type === 'following') {
      endpoint = '/social/feed/following';
    } else if (type === 'user' && options?.userId) {
      endpoint = `/social/feed/user/${options.userId}`;
    }

    return request<PaginatedResponse<Activity>>(
      `${endpoint}?${params.toString()}`,
      { method: 'GET', requiresAuth: type === 'following' }
    );
  },
};

// =============================================================================
// Collaboration API
// =============================================================================

export const collabApi = {
  /**
   * Create collaboration room for a canvas
   */
  async createRoom(data: {
    canvasId: string;
    allowAnonymous?: boolean;
    maxParticipants?: number;
  }): Promise<ApiResponse<CollaborationRoom>> {
    return request<CollaborationRoom>('/social/collab/rooms', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  /**
   * Get collaboration room
   */
  async getRoom(roomId: string): Promise<ApiResponse<CollaborationRoom>> {
    return request<CollaborationRoom>(`/social/collab/rooms/${roomId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Join collaboration room
   */
  async joinRoom(roomId: string): Promise<ApiResponse<{ token: string }>> {
    return request<{ token: string }>(`/social/collab/rooms/${roomId}/join`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Leave collaboration room
   */
  async leaveRoom(roomId: string): Promise<ApiResponse<void>> {
    return request<void>(`/social/collab/rooms/${roomId}/leave`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Invite user to collaboration room
   */
  async invite(
    roomId: string,
    userId: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<ApiResponse<void>> {
    return request<void>(`/social/collab/rooms/${roomId}/invite`, {
      method: 'POST',
      body: { userId, role },
      requiresAuth: true,
    });
  },
};

// =============================================================================
// Combined Social API
// =============================================================================

export const socialApi = {
  follow: followApi,
  profile: profileApi,
  block: blockApi,
  notifications: socialNotificationsApi,
  chat: chatApi,
  feed: feedApi,
  collab: collabApi,
};

export default socialApi;
