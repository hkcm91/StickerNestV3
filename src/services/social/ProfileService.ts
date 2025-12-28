/**
 * StickerNest v2 - Profile Service
 * =================================
 *
 * Backend service for user profile management using Supabase.
 * Handles CRUD operations, search, and real-time profile updates.
 *
 * ## Architecture Notes
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    PROFILE FLOW                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  Auth (signup) ──► ProfileService.createProfile()          │
 * │                              │                              │
 * │                              ▼                              │
 * │              profiles table (Supabase)                      │
 * │                              │                              │
 * │                              ▼                              │
 * │              ProfileService.subscribeToProfile()            │
 * │                              │                              │
 * │                              ▼                              │
 * │                   useProfileStore                           │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Database Schema (profiles table)
 *
 * | Column       | Type      | Description                       |
 * |--------------|-----------|-----------------------------------|
 * | id           | uuid      | Primary key (matches auth.users)  |
 * | username     | text      | Unique username                   |
 * | display_name | text      | Display name                      |
 * | avatar_url   | text      | Avatar image URL                  |
 * | bio          | text      | User bio/description              |
 * | created_at   | timestamp | Creation timestamp                |
 * | updated_at   | timestamp | Last update timestamp             |
 *
 * @see SocialGraphService - For follow/unfollow operations
 * @see FeedService - For activity feed
 */

import { supabaseClient, isLocalDevMode } from '../supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ==================
// Types
// ==================

/**
 * Profile row from the database
 */
export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a profile
 */
export interface CreateProfileInput {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

/**
 * Input for updating a profile
 */
export interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

/**
 * Profile with follower/following counts
 */
export interface ProfileWithStats extends ProfileRow {
  follower_count: number;
  following_count: number;
  is_following?: boolean; // Only when viewed by another user
}

/**
 * Callback type for real-time subscription
 */
export type ProfileCallback = (
  payload: RealtimePostgresChangesPayload<ProfileRow>
) => void;

// ==================
// Service State
// ==================

/** Active subscription channel */
let activeChannel: RealtimeChannel | null = null;

// ==================
// Mock Data for Local Dev
// ==================

const MOCK_PROFILES: ProfileRow[] = [
  {
    id: 'demo-user-1',
    username: 'sticker_queen',
    display_name: 'Sticker Queen',
    avatar_url: null,
    bio: 'Creating beautiful stickers for everyone!',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-user-2',
    username: 'widget_wizard',
    display_name: 'Widget Wizard',
    avatar_url: null,
    bio: 'Interactive widget enthusiast',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ==================
// Service Methods
// ==================

export const ProfileService = {
  /**
   * Get the current user's profile
   *
   * @returns The current user's profile or null
   *
   * @example
   * const profile = await ProfileService.getCurrentProfile();
   */
  async getCurrentProfile(): Promise<ProfileRow | null> {
    if (!supabaseClient) {
      if (isLocalDevMode) {
        console.log('[ProfileService] Local dev mode - returning mock profile');
        return MOCK_PROFILES[0];
      }
      return null;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ProfileService] Failed to get current profile:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get a profile by user ID
   *
   * @param userId - The user's ID
   * @returns The profile or null
   */
  async getProfile(userId: string): Promise<ProfileRow | null> {
    if (!supabaseClient) {
      if (isLocalDevMode) {
        return MOCK_PROFILES.find((p) => p.id === userId) || null;
      }
      return null;
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ProfileService] Failed to get profile:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get a profile by username
   *
   * @param username - The username to look up
   * @returns The profile or null
   */
  async getProfileByUsername(username: string): Promise<ProfileRow | null> {
    if (!supabaseClient) {
      if (isLocalDevMode) {
        return MOCK_PROFILES.find((p) => p.username === username) || null;
      }
      return null;
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ProfileService] Failed to get profile by username:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get a profile with follower/following statistics
   *
   * @param userId - The user's ID
   * @returns Profile with stats
   */
  async getProfileWithStats(userId: string): Promise<ProfileWithStats | null> {
    if (!supabaseClient) {
      if (isLocalDevMode) {
        const profile = MOCK_PROFILES.find((p) => p.id === userId);
        if (!profile) return null;
        return { ...profile, follower_count: 42, following_count: 18 };
      }
      return null;
    }

    // Get profile
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    // Get follower count
    const { count: followerCount } = await supabaseClient
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    // Get following count
    const { count: followingCount } = await supabaseClient
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    // Check if current user is following this profile
    let isFollowing: boolean | undefined;
    const {
      data: { user: currentUser },
    } = await supabaseClient.auth.getUser();
    if (currentUser && currentUser.id !== userId) {
      const { data: followData } = await supabaseClient
        .from('follows')
        .select('follower_id')
        .match({ follower_id: currentUser.id, following_id: userId })
        .single();
      isFollowing = !!followData;
    }

    return {
      ...profile,
      follower_count: followerCount || 0,
      following_count: followingCount || 0,
      is_following: isFollowing,
    };
  },

  /**
   * Create a profile for a new user
   *
   * @param userId - The user's ID from auth
   * @param input - Profile data
   * @returns The created profile
   */
  async createProfile(
    userId: string,
    input: CreateProfileInput = {}
  ): Promise<ProfileRow> {
    if (!supabaseClient) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        username: input.username || null,
        display_name: input.display_name || null,
        avatar_url: input.avatar_url || null,
        bio: input.bio || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to create profile:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update the current user's profile
   *
   * @param input - Fields to update
   * @returns The updated profile
   */
  async updateProfile(input: UpdateProfileInput): Promise<ProfileRow> {
    if (!supabaseClient) {
      throw new Error('Supabase not configured');
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.username !== undefined) updateData.username = input.username;
    if (input.display_name !== undefined) updateData.display_name = input.display_name;
    if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url;
    if (input.bio !== undefined) updateData.bio = input.bio;

    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update profile:', error);
      throw error;
    }

    return data;
  },

  /**
   * Check if a username is available
   *
   * @param username - Username to check
   * @returns true if available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!supabaseClient) return true;

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found = username is available
      return true;
    }

    if (error) throw error;
    return !data;
  },

  /**
   * Search for profiles by username or display name
   *
   * @param query - Search query
   * @param limit - Maximum results (default 20)
   * @returns Array of matching profiles
   */
  async searchProfiles(query: string, limit = 20): Promise<ProfileRow[]> {
    if (!supabaseClient) {
      if (isLocalDevMode) {
        const q = query.toLowerCase();
        return MOCK_PROFILES.filter(
          (p) =>
            p.username?.toLowerCase().includes(q) ||
            p.display_name?.toLowerCase().includes(q)
        );
      }
      return [];
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[ProfileService] Failed to search profiles:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get multiple profiles by IDs
   *
   * @param userIds - Array of user IDs
   * @returns Array of profiles
   */
  async getProfiles(userIds: string[]): Promise<ProfileRow[]> {
    if (!supabaseClient || userIds.length === 0) {
      if (isLocalDevMode) {
        return MOCK_PROFILES.filter((p) => userIds.includes(p.id));
      }
      return [];
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (error) {
      console.error('[ProfileService] Failed to get profiles:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Subscribe to real-time profile updates for a specific user
   *
   * @param userId - User ID to subscribe to
   * @param callback - Function called when profile changes
   * @returns Unsubscribe function
   */
  subscribeToProfile(userId: string, callback: ProfileCallback): () => void {
    if (!supabaseClient) {
      console.log('[ProfileService] No Supabase client - skipping subscription');
      return () => {};
    }

    // Clean up existing subscription
    if (activeChannel) {
      supabaseClient.removeChannel(activeChannel);
      activeChannel = null;
    }

    const channelName = `profile:${userId}:${Date.now()}`;

    activeChannel = supabaseClient
      .channel(channelName)
      .on<ProfileRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[ProfileService] Realtime event:', payload.eventType);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('[ProfileService] Subscription status:', status);
      });

    return () => {
      if (activeChannel && supabaseClient) {
        console.log('[ProfileService] Unsubscribing from profile');
        supabaseClient.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  },

  /**
   * Ensure a profile exists for the current user
   * Creates one if it doesn't exist
   *
   * @returns The profile (existing or newly created)
   */
  async ensureProfile(): Promise<ProfileRow | null> {
    if (!supabaseClient) return null;

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return null;

    // Check if profile exists
    let profile = await this.getProfile(user.id);

    // Create if it doesn't exist
    if (!profile) {
      profile = await this.createProfile(user.id, {
        display_name: user.email?.split('@')[0] || 'User',
      });
    }

    return profile;
  },
};

export default ProfileService;
