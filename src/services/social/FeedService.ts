/**
 * FeedService
 *
 * Provides access to activity feeds via the backend API.
 * Previously used direct Supabase calls, now uses /api/social/feed/* endpoints.
 */

import { feedApi, Activity as ApiActivity } from '../api';

export interface Activity {
  id: string;
  actor_id: string;
  verb: 'published' | 'forked' | 'liked' | 'commented' | string;
  object_type: 'widget' | 'canvas' | 'user' | string;
  object_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Transform API activity to legacy format
 */
function transformActivity(apiActivity: ApiActivity): Activity {
  return {
    id: apiActivity.id,
    actor_id: apiActivity.actorId,
    verb: apiActivity.type as Activity['verb'],
    object_type: apiActivity.objectType as Activity['object_type'],
    object_id: apiActivity.objectId,
    metadata: apiActivity.metadata as Record<string, unknown>,
    created_at: apiActivity.createdAt,
    profiles: apiActivity.actor ? {
      id: apiActivity.actor.id,
      username: apiActivity.actor.username,
      avatar_url: apiActivity.actor.avatarUrl || null,
    } : null,
  };
}

export const FeedService = {
  /**
   * Get global activity feed
   */
  async getGlobalFeed(limit = 20, offset = 0): Promise<Activity[]> {
    const page = Math.floor(offset / limit) + 1;
    const result = await feedApi.getFeed('global', {
      page,
      pageSize: limit,
    });

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.items.map(transformActivity);
  },

  /**
   * Get activity feed for a specific user
   */
  async getUserFeed(userId: string, limit = 20, offset = 0): Promise<Activity[]> {
    const page = Math.floor(offset / limit) + 1;
    const result = await feedApi.getFeed('user', {
      userId,
      page,
      pageSize: limit,
    });

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.items.map(transformActivity);
  },

  /**
   * Get feed of activities from users the current user is following
   */
  async getFriendsFeed(limit = 20, offset = 0): Promise<Activity[]> {
    const page = Math.floor(offset / limit) + 1;
    const result = await feedApi.getFeed('following', {
      page,
      pageSize: limit,
    });

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.items.map(transformActivity);
  },

  /**
   * Get feed of activities for a specific canvas
   * Note: This requires a backend endpoint that doesn't exist yet.
   * Falls back to global feed filtered client-side.
   */
  async getCanvasFeed(canvasId: string, limit = 20, offset = 0): Promise<Activity[]> {
    // TODO: Add dedicated canvas feed endpoint to backend
    // For now, fetch global and filter client-side (not ideal for pagination)
    const page = Math.floor(offset / limit) + 1;
    const result = await feedApi.getFeed('global', {
      page,
      pageSize: limit * 3, // Fetch more to account for filtering
    });

    if (!result.success || !result.data) {
      return [];
    }

    // Filter to canvas-related activities
    const filtered = result.data.items
      .filter(item => item.objectType === 'canvas' && item.objectId === canvasId)
      .slice(0, limit);

    return filtered.map(transformActivity);
  },

  /**
   * Post a new activity (for local optimistic updates)
   * The actual activity is typically created server-side.
   */
  async postActivity(activity: Omit<Activity, 'id' | 'created_at' | 'profiles'>): Promise<void> {
    // Activities are created server-side when actions occur
    // This method is kept for compatibility but doesn't call the API
    console.warn('FeedService.postActivity: Activities are created server-side');
  },
};
