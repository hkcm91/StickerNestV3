/**
 * StickerNest v2 - Social Store (Zustand)
 * =========================================
 *
 * Core state management for the "hidden" social media layer.
 * This store manages user relationships, privacy settings, and social preferences.
 *
 * ## Architecture Notes for Future Developers
 *
 * This store is part of the Social Media Layer architecture:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    STATE LAYER (Zustand)                    │
 * ├─────────────────┬─────────────────┬─────────────────────────┤
 * │  useSocialStore │  useFeedStore   │  useNotificationStore   │
 * │  (this file)    │  (feeds/cache)  │  (notifications)        │
 * └────────┬────────┴────────┬────────┴────────┬────────────────┘
 *          │                 │                 │
 *          └────────────┬────┴─────────────────┘
 *                       ▼
 *          ┌────────────────────────┐
 *          │   SocialEventBridge    │  ◄── Connects stores to EventBus
 *          └────────────┬───────────┘
 *                       ▼
 *          ┌────────────────────────┐
 *          │  Social Widgets        │  ◄── CommentWidget, FeedWidget, etc.
 *          │  (consume events)      │
 *          └────────────────────────┘
 * ```
 *
 * ## Key Concepts
 *
 * - **Privacy Modes**: Control who can see your social activity on canvas
 *   - 'public': Everyone can see
 *   - 'friends': Only followers/following can see
 *   - 'hidden': Social layer is completely hidden
 *
 * - **Relationships**: Tracks following/followers/blocked users
 *   - Stored as Sets for O(1) lookup performance
 *   - Synced from SocialGraphService on init
 *
 * - **Online Status**: Tracks which friends are currently online
 *   - Updated via PresenceManager events
 *
 * ## Usage
 *
 * ```tsx
 * // In components
 * const { following, isFollowing, toggleFollow } = useSocialStore();
 *
 * // Check if user is followed
 * if (isFollowing('user-123')) { ... }
 *
 * // Toggle follow state
 * await toggleFollow('user-123');
 * ```
 *
 * @see useFeedStore - For activity feed state
 * @see useNotificationStore - For notification state
 * @see SocialEventBridge - For event routing to widgets
 */

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { SocialGraphService } from '../services/social/SocialGraphService';

// ==================
// Types
// ==================

/**
 * Privacy mode for the social layer visibility
 * - 'public': Social widgets visible to everyone viewing your canvas
 * - 'friends': Only visible to users you follow / who follow you
 * - 'hidden': Social layer completely hidden (stealth mode)
 */
export type SocialPrivacyMode = 'public' | 'friends' | 'hidden';

/**
 * User profile data cached from API
 */
export interface SocialProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  /** Timestamp when this profile was last fetched */
  fetchedAt: number;
}

/**
 * Social layer visibility preferences
 */
export interface SocialLayerSettings {
  /** Whether the social layer is enabled/visible */
  enabled: boolean;
  /** Privacy mode for social content */
  privacyMode: SocialPrivacyMode;
  /** Show online status indicators */
  showOnlineStatus: boolean;
  /** Show activity feed on canvas */
  showActivityFeed: boolean;
  /** Allow comments on your canvas */
  allowComments: boolean;
  /** Show notification badge */
  showNotificationBadge: boolean;
}

// ==================
// Store State
// ==================

export interface SocialState {
  /** Current user ID (null if not logged in) */
  currentUserId: string | null;

  /** Set of user IDs we are following */
  following: Set<string>;

  /** Set of user IDs following us */
  followers: Set<string>;

  /** Set of blocked user IDs */
  blocked: Set<string>;

  /** Set of muted user IDs (don't show their activity) */
  muted: Set<string>;

  /** Set of online friend IDs (updated by PresenceManager) */
  onlineFriends: Set<string>;

  /** Cached user profiles for quick access */
  profileCache: Map<string, SocialProfile>;

  /** Social layer settings */
  settings: SocialLayerSettings;

  /** Loading state for async operations */
  isLoading: boolean;

  /** Error message if any operation failed */
  error: string | null;

  /** Last sync timestamp with backend */
  lastSyncAt: number | null;
}

// ==================
// Store Actions
// ==================

export interface SocialActions {
  // === Initialization ===
  /** Initialize store with user ID and fetch relationships */
  initialize: (userId: string) => Promise<void>;
  /** Reset store (on logout) */
  reset: () => void;

  // === Relationship Management ===
  /** Follow a user */
  followUser: (targetId: string) => Promise<void>;
  /** Unfollow a user */
  unfollowUser: (targetId: string) => Promise<void>;
  /** Toggle follow state */
  toggleFollow: (targetId: string) => Promise<void>;
  /** Block a user */
  blockUser: (userId: string) => Promise<void>;
  /** Unblock a user */
  unblockUser: (userId: string) => Promise<void>;
  /** Mute a user (hide their activity) */
  muteUser: (userId: string) => void;
  /** Unmute a user */
  unmuteUser: (userId: string) => void;

  // === Queries ===
  /** Check if we are following a user */
  isFollowing: (userId: string) => boolean;
  /** Check if a user is following us */
  isFollower: (userId: string) => boolean;
  /** Check if a user is blocked */
  isBlocked: (userId: string) => boolean;
  /** Check if a user is muted */
  isMuted: (userId: string) => boolean;
  /** Check if a user is online */
  isOnline: (userId: string) => boolean;
  /** Check if a user is a "friend" (mutual follow) */
  isFriend: (userId: string) => boolean;

  // === Profile Cache ===
  /** Get cached profile (or undefined if not cached) */
  getCachedProfile: (userId: string) => SocialProfile | undefined;
  /** Cache a profile */
  cacheProfile: (profile: SocialProfile) => void;
  /** Clear stale profiles from cache */
  clearStaleProfiles: (maxAgeMs?: number) => void;

  // === Online Status ===
  /** Update online friends set (called by PresenceManager) */
  setOnlineFriends: (friendIds: string[]) => void;
  /** Add a friend to online set */
  addOnlineFriend: (friendId: string) => void;
  /** Remove a friend from online set */
  removeOnlineFriend: (friendId: string) => void;

  // === Settings ===
  /** Update social layer settings */
  updateSettings: (settings: Partial<SocialLayerSettings>) => void;
  /** Toggle social layer visibility */
  toggleSocialLayer: () => void;
  /** Set privacy mode */
  setPrivacyMode: (mode: SocialPrivacyMode) => void;

  // === Internal ===
  /** Sync relationships from backend */
  syncRelationships: () => Promise<void>;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
}

// ==================
// Initial State
// ==================

const initialSettings: SocialLayerSettings = {
  enabled: true,
  privacyMode: 'friends',
  showOnlineStatus: true,
  showActivityFeed: true,
  allowComments: true,
  showNotificationBadge: true,
};

const initialState: SocialState = {
  currentUserId: null,
  following: new Set(),
  followers: new Set(),
  blocked: new Set(),
  muted: new Set(),
  onlineFriends: new Set(),
  profileCache: new Map(),
  settings: initialSettings,
  isLoading: false,
  error: null,
  lastSyncAt: null,
};

// ==================
// Custom JSON Storage for Sets/Maps
// ==================

/**
 * Custom JSON reviver to restore Sets and Maps from localStorage
 *
 * NOTE: We serialize Sets as { __type: 'Set', values: [...] }
 * and Maps as { __type: 'Map', entries: [...] }
 */
const jsonReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.__type === 'Set') {
      return new Set(obj.values as unknown[]);
    }
    if (obj.__type === 'Map') {
      return new Map(obj.entries as [string, unknown][]);
    }
  }
  return value;
};

/**
 * Custom JSON replacer to serialize Sets and Maps for localStorage
 */
const jsonReplacer = (_key: string, value: unknown) => {
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value) };
  }
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }
  return value;
};

// ==================
// Store Creation
// ==================

export const useSocialStore = create<SocialState & SocialActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Initialization
        // ==================

        initialize: async (userId: string) => {
          set({ currentUserId: userId, isLoading: true, error: null });

          try {
            await get().syncRelationships();
            set({ isLoading: false, lastSyncAt: Date.now() });
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to initialize social store',
            });
          }
        },

        reset: () => {
          set(initialState);
        },

        // ==================
        // Relationship Management
        // ==================

        followUser: async (targetId: string) => {
          const { following, blocked } = get();

          // Can't follow blocked users
          if (blocked.has(targetId)) {
            set({ error: 'Cannot follow a blocked user' });
            return;
          }

          // Already following
          if (following.has(targetId)) {
            return;
          }

          // Optimistic update
          set((state) => ({
            following: new Set(state.following).add(targetId),
            error: null,
          }));

          try {
            await SocialGraphService.followUser(targetId);
          } catch (err) {
            // Rollback on failure
            set((state) => {
              const newFollowing = new Set(state.following);
              newFollowing.delete(targetId);
              return {
                following: newFollowing,
                error: err instanceof Error ? err.message : 'Failed to follow user',
              };
            });
          }
        },

        unfollowUser: async (targetId: string) => {
          const { following } = get();

          // Not following
          if (!following.has(targetId)) {
            return;
          }

          // Optimistic update
          set((state) => {
            const newFollowing = new Set(state.following);
            newFollowing.delete(targetId);
            return { following: newFollowing, error: null };
          });

          try {
            await SocialGraphService.unfollowUser(targetId);
          } catch (err) {
            // Rollback on failure
            set((state) => ({
              following: new Set(state.following).add(targetId),
              error: err instanceof Error ? err.message : 'Failed to unfollow user',
            }));
          }
        },

        toggleFollow: async (targetId: string) => {
          if (get().isFollowing(targetId)) {
            await get().unfollowUser(targetId);
          } else {
            await get().followUser(targetId);
          }
        },

        blockUser: async (userId: string) => {
          const { blocked } = get();

          // Already blocked
          if (blocked.has(userId)) {
            return;
          }

          // Optimistic update - add to blocked and remove from following
          set((state) => {
            const newBlocked = new Set(state.blocked).add(userId);
            const newFollowing = new Set(state.following);
            newFollowing.delete(userId);
            return { blocked: newBlocked, following: newFollowing, error: null };
          });

          try {
            await SocialGraphService.blockUser(userId);
          } catch (err) {
            // Rollback on failure
            set((state) => {
              const newBlocked = new Set(state.blocked);
              newBlocked.delete(userId);
              return {
                blocked: newBlocked,
                error: err instanceof Error ? err.message : 'Failed to block user',
              };
            });
          }
        },

        unblockUser: async (userId: string) => {
          const { blocked } = get();

          // Not blocked
          if (!blocked.has(userId)) {
            return;
          }

          // Optimistic update
          set((state) => {
            const newBlocked = new Set(state.blocked);
            newBlocked.delete(userId);
            return { blocked: newBlocked, error: null };
          });

          try {
            await SocialGraphService.unblockUser(userId);
          } catch (err) {
            // Rollback on failure
            set((state) => ({
              blocked: new Set(state.blocked).add(userId),
              error: err instanceof Error ? err.message : 'Failed to unblock user',
            }));
          }
        },

        muteUser: (userId: string) => {
          set((state) => ({
            muted: new Set(state.muted).add(userId),
          }));
        },

        unmuteUser: (userId: string) => {
          set((state) => {
            const newMuted = new Set(state.muted);
            newMuted.delete(userId);
            return { muted: newMuted };
          });
        },

        // ==================
        // Queries
        // ==================

        isFollowing: (userId: string) => {
          return get().following.has(userId);
        },

        isFollower: (userId: string) => {
          return get().followers.has(userId);
        },

        isBlocked: (userId: string) => {
          return get().blocked.has(userId);
        },

        isMuted: (userId: string) => {
          return get().muted.has(userId);
        },

        isOnline: (userId: string) => {
          return get().onlineFriends.has(userId);
        },

        isFriend: (userId: string) => {
          // Mutual follow = friend
          return get().following.has(userId) && get().followers.has(userId);
        },

        // ==================
        // Profile Cache
        // ==================

        getCachedProfile: (userId: string) => {
          return get().profileCache.get(userId);
        },

        cacheProfile: (profile: SocialProfile) => {
          set((state) => {
            const newCache = new Map(state.profileCache);
            newCache.set(profile.id, { ...profile, fetchedAt: Date.now() });
            return { profileCache: newCache };
          });
        },

        clearStaleProfiles: (maxAgeMs: number = 5 * 60 * 1000) => {
          const now = Date.now();
          set((state) => {
            const newCache = new Map(state.profileCache);
            for (const [id, profile] of newCache) {
              if (now - profile.fetchedAt > maxAgeMs) {
                newCache.delete(id);
              }
            }
            return { profileCache: newCache };
          });
        },

        // ==================
        // Online Status
        // ==================

        setOnlineFriends: (friendIds: string[]) => {
          set({ onlineFriends: new Set(friendIds) });
        },

        addOnlineFriend: (friendId: string) => {
          set((state) => ({
            onlineFriends: new Set(state.onlineFriends).add(friendId),
          }));
        },

        removeOnlineFriend: (friendId: string) => {
          set((state) => {
            const newOnline = new Set(state.onlineFriends);
            newOnline.delete(friendId);
            return { onlineFriends: newOnline };
          });
        },

        // ==================
        // Settings
        // ==================

        updateSettings: (settings: Partial<SocialLayerSettings>) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
          }));
        },

        toggleSocialLayer: () => {
          set((state) => ({
            settings: { ...state.settings, enabled: !state.settings.enabled },
          }));
        },

        setPrivacyMode: (mode: SocialPrivacyMode) => {
          set((state) => ({
            settings: { ...state.settings, privacyMode: mode },
          }));
        },

        // ==================
        // Internal
        // ==================

        syncRelationships: async () => {
          const { currentUserId } = get();
          if (!currentUserId) return;

          set({ isLoading: true });

          try {
            // Fetch following, followers, and blocked users in parallel
            const [followingList, followersList, blockedList] = await Promise.all([
              SocialGraphService.getFollowing(currentUserId),
              SocialGraphService.getFollowers(currentUserId),
              SocialGraphService.getBlockedUsers(),
            ]);

            // Extract IDs and create Sets
            const following = new Set(followingList.map((p: { id: string }) => p.id));
            const followers = new Set(followersList.map((p: { id: string }) => p.id));
            const blocked = new Set(blockedList.map((p: { id: string }) => p.id));

            // Also cache the profiles
            const profileCache = new Map(get().profileCache);
            const now = Date.now();

            [...followingList, ...followersList].forEach((profile: { id: string; username?: string; avatarUrl?: string; bio?: string }) => {
              profileCache.set(profile.id, {
                id: profile.id,
                username: profile.username || 'Unknown',
                avatarUrl: profile.avatarUrl || null,
                bio: profile.bio || null,
                fetchedAt: now,
              });
            });

            set({
              following,
              followers,
              blocked,
              profileCache,
              isLoading: false,
              lastSyncAt: now,
            });
          } catch (err) {
            // Graceful degradation: use mock data when backend is unavailable
            const errorMessage = err instanceof Error ? err.message : 'Failed to sync relationships';
            const isBackendUnavailable = errorMessage.includes('Backend server') ||
                                         errorMessage.includes('NETWORK_ERROR') ||
                                         errorMessage.includes('fetch');

            if (isBackendUnavailable) {
              console.warn('[useSocialStore] Backend unavailable, using mock data for local development');

              // Mock data for local development
              const mockUsers = [
                { id: 'mock-user-1', username: 'alice_demo', avatarUrl: null, bio: 'Demo user for testing' },
                { id: 'mock-user-2', username: 'bob_demo', avatarUrl: null, bio: 'Another demo user' },
                { id: 'mock-user-3', username: 'charlie_demo', avatarUrl: null, bio: 'Third demo user' },
              ];

              const profileCache = new Map(get().profileCache);
              const now = Date.now();
              mockUsers.forEach((user) => {
                profileCache.set(user.id, { ...user, fetchedAt: now });
              });

              set({
                following: new Set(['mock-user-1', 'mock-user-2']),
                followers: new Set(['mock-user-1', 'mock-user-3']),
                blocked: new Set(),
                profileCache,
                isLoading: false,
                lastSyncAt: now,
                error: null, // Clear error since we have fallback data
              });
            } else {
              set({
                isLoading: false,
                error: errorMessage,
              });
            }
          }
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },

        setError: (error: string | null) => {
          set({ error });
        },
      }),
      {
        name: 'stickernest-social',
        storage: createJSONStorage(() => localStorage, {
          reviver: jsonReviver,
          replacer: jsonReplacer,
        }),
        // Only persist these fields (not loading states or errors)
        partialize: (state) => ({
          currentUserId: state.currentUserId,
          following: state.following,
          followers: state.followers,
          blocked: state.blocked,
          muted: state.muted,
          settings: state.settings,
          // Don't persist: profileCache, onlineFriends, isLoading, error, lastSyncAt
        }),
      }
    ),
    { name: 'SocialStore', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

/** Select current user ID */
export const useCurrentUserId = () => useSocialStore((state) => state.currentUserId);

/** Select following set as array */
export const useFollowing = () =>
  useSocialStore(useShallow((state) => Array.from(state.following)));

/** Select followers set as array */
export const useFollowers = () =>
  useSocialStore(useShallow((state) => Array.from(state.followers)));

/** Select online friends as array */
export const useOnlineFriends = () =>
  useSocialStore(useShallow((state) => Array.from(state.onlineFriends)));

/** Select social layer settings */
export const useSocialSettings = () =>
  useSocialStore(useShallow((state) => state.settings));

/** Select if social layer is enabled */
export const useSocialLayerEnabled = () =>
  useSocialStore((state) => state.settings.enabled);

/** Select privacy mode */
export const useSocialPrivacyMode = () =>
  useSocialStore((state) => state.settings.privacyMode);

/** Select loading state */
export const useSocialLoading = () =>
  useSocialStore((state) => state.isLoading);

/** Select error state */
export const useSocialError = () =>
  useSocialStore((state) => state.error);

/** Get friend count (mutual follows) */
export const useFriendCount = () =>
  useSocialStore((state) => {
    let count = 0;
    for (const userId of state.following) {
      if (state.followers.has(userId)) count++;
    }
    return count;
  });

export default useSocialStore;
