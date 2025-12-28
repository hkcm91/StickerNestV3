/**
 * StickerNest v2 - Follow Store (Zustand)
 * Manages user follow relationships with API integration
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { followApi } from '../services/api';
import { isLocalDevMode } from '../services/supabaseClient';

// ============================================
// Types
// ============================================

export interface FollowRelation {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface FollowStats {
  userId: string;
  followerCount: number;
  followingCount: number;
  isFollowedByCurrentUser: boolean;
  isFollowingCurrentUser: boolean;
}

export interface UserPreview {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

// ============================================
// Store Types
// ============================================

interface FollowState {
  // IDs of users the current user follows
  followingIds: Set<string>;

  // User follow counts (userId -> { followers, following })
  userStats: Map<string, { followers: number; following: number }>;

  // Loading states
  isLoading: boolean;
  isTogglingFollow: string | null;
}

interface FollowActions {
  // Follow/unfollow a user
  toggleFollow: (userId: string) => Promise<void>;

  // Check if current user follows a user
  isFollowing: (userId: string) => boolean;

  // Get follow stats for a user
  getStats: (userId: string) => { followers: number; following: number };

  // Load follow status for a user from API
  checkFollowStatus: (userId: string) => Promise<boolean>;

  // Load follow status for multiple users
  loadFollowStatus: (userIds: string[]) => Promise<void>;

  // Load current user's following list
  loadFollowing: () => Promise<void>;

  // Initialize with mock data
  initializeMockData: () => void;

  // Reset state
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: FollowState = {
  followingIds: new Set(),
  userStats: new Map(),
  isLoading: false,
  isTogglingFollow: null,
};

// ============================================
// Mock Data (for local dev mode)
// ============================================

const MOCK_USER_STATS: Record<string, { followers: number; following: number }> = {
  'user-alice': { followers: 1234, following: 567 },
  'user-bob': { followers: 890, following: 234 },
  'user-charlie': { followers: 456, following: 123 },
  'user-designer': { followers: 5678, following: 890 },
  'user-developer': { followers: 2345, following: 456 },
};

const MOCK_FOLLOWING = ['user-alice', 'user-designer'];

// ============================================
// Store
// ============================================

export const useFollowStore = create<FollowState & FollowActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Toggle Follow
        // ==================

        toggleFollow: async (userId) => {
          const { followingIds, userStats, isTogglingFollow } = get();

          // Prevent double-clicks
          if (isTogglingFollow === userId) return;

          set({ isTogglingFollow: userId }, false, 'toggleFollow:start');

          const isCurrentlyFollowing = followingIds.has(userId);
          const currentStats = userStats.get(userId) || { followers: 0, following: 0 };

          // Optimistic update
          const newFollowingIds = new Set(followingIds);
          const newStats = new Map(userStats);

          if (isCurrentlyFollowing) {
            newFollowingIds.delete(userId);
            newStats.set(userId, {
              ...currentStats,
              followers: Math.max(0, currentStats.followers - 1),
            });
          } else {
            newFollowingIds.add(userId);
            newStats.set(userId, {
              ...currentStats,
              followers: currentStats.followers + 1,
            });
          }

          set(
            { followingIds: newFollowingIds, userStats: newStats },
            false,
            'toggleFollow:optimistic'
          );

          try {
            if (!isLocalDevMode) {
              // Call API
              if (isCurrentlyFollowing) {
                const response = await followApi.unfollow(userId);
                if (!response.success) {
                  throw new Error(response.error?.message || 'Failed to unfollow');
                }
              } else {
                const response = await followApi.follow(userId);
                if (!response.success) {
                  throw new Error(response.error?.message || 'Failed to follow');
                }
              }
            } else {
              // Simulate API delay in local dev mode
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            set(
              { isTogglingFollow: null },
              false,
              isCurrentlyFollowing ? 'unfollow:success' : 'follow:success'
            );
          } catch (error) {
            console.error('Failed to toggle follow:', error);

            // Revert optimistic update
            set(
              { followingIds, userStats, isTogglingFollow: null },
              false,
              'toggleFollow:revert'
            );
          }
        },

        // ==================
        // Check Follow Status
        // ==================

        isFollowing: (userId) => {
          return get().followingIds.has(userId);
        },

        // ==================
        // Get Stats
        // ==================

        getStats: (userId) => {
          return get().userStats.get(userId) || { followers: 0, following: 0 };
        },

        // ==================
        // Check Follow Status (API)
        // ==================

        checkFollowStatus: async (userId) => {
          if (!isLocalDevMode) {
            try {
              const response = await followApi.isFollowing(userId);
              if (response.success && response.data) {
                const { followingIds } = get();
                const newFollowingIds = new Set(followingIds);

                if (response.data.isFollowing) {
                  newFollowingIds.add(userId);
                } else {
                  newFollowingIds.delete(userId);
                }

                set({ followingIds: newFollowingIds }, false, 'checkFollowStatus');
                return response.data.isFollowing;
              }
            } catch (error) {
              console.error('Failed to check follow status:', error);
            }
          }

          return get().followingIds.has(userId);
        },

        // ==================
        // Load Follow Status
        // ==================

        loadFollowStatus: async (userIds) => {
          set({ isLoading: true }, false, 'loadFollowStatus:start');

          try {
            const { userStats } = get();
            const newStats = new Map(userStats);

            if (!isLocalDevMode) {
              // In production, check each user's follow status
              for (const userId of userIds) {
                if (!newStats.has(userId)) {
                  // API doesn't have a bulk endpoint, so we use defaults
                  // The profile endpoint should return follower counts
                  newStats.set(userId, { followers: 0, following: 0 });
                }
              }
            } else {
              // Local dev mode - use mock data
              await new Promise(resolve => setTimeout(resolve, 150));
              userIds.forEach((id) => {
                if (!newStats.has(id)) {
                  const mockStats = MOCK_USER_STATS[id];
                  if (mockStats) {
                    newStats.set(id, mockStats);
                  } else {
                    newStats.set(id, {
                      followers: Math.floor(Math.random() * 1000),
                      following: Math.floor(Math.random() * 500),
                    });
                  }
                }
              });
            }

            set(
              { userStats: newStats, isLoading: false },
              false,
              'loadFollowStatus:success'
            );
          } catch (error) {
            console.error('Failed to load follow status:', error);
            set({ isLoading: false }, false, 'loadFollowStatus:error');
          }
        },

        // ==================
        // Load Following List
        // ==================

        loadFollowing: async () => {
          set({ isLoading: true }, false, 'loadFollowing:start');

          try {
            if (!isLocalDevMode) {
              const response = await followApi.getFollowing();
              if (response.success && response.data) {
                const followingIds = new Set(response.data.items.map(user => user.id));
                set(
                  { followingIds, isLoading: false },
                  false,
                  'loadFollowing:success'
                );
                return;
              }
            }

            // Local dev mode - use mock data
            await new Promise(resolve => setTimeout(resolve, 200));
            set(
              { followingIds: new Set(MOCK_FOLLOWING), isLoading: false },
              false,
              'loadFollowing:mock'
            );
          } catch (error) {
            console.error('Failed to load following:', error);
            set({ isLoading: false }, false, 'loadFollowing:error');
          }
        },

        // ==================
        // Initialize Mock Data
        // ==================

        initializeMockData: () => {
          const { followingIds, userStats } = get();

          // Only initialize if empty
          if (followingIds.size > 0) return;

          const newFollowingIds = new Set(MOCK_FOLLOWING);
          const newStats = new Map<string, { followers: number; following: number }>();

          Object.entries(MOCK_USER_STATS).forEach(([id, stats]) => {
            newStats.set(id, stats);
          });

          set(
            {
              followingIds: newFollowingIds,
              userStats: newStats,
            },
            false,
            'initializeMockData'
          );
        },

        // ==================
        // Reset
        // ==================

        reset: () => {
          set(initialState, false, 'reset');
        },
      }),
      {
        name: 'follow-storage',
        // Custom serialization for Set and Map
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;

            const data = JSON.parse(str);
            return {
              state: {
                followingIds: new Set(data.state.followingIds || []),
                userStats: new Map(Object.entries(data.state.userStats || {})),
                isLoading: false,
                isTogglingFollow: null,
              },
            };
          },
          setItem: (name, value) => {
            const data = {
              state: {
                followingIds: Array.from(value.state.followingIds),
                userStats: Object.fromEntries(value.state.userStats),
              },
            };
            localStorage.setItem(name, JSON.stringify(data));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    ),
    {
      name: 'FollowStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useIsFollowing = (userId: string) =>
  useFollowStore((s) => s.followingIds.has(userId));

export const useFollowerCount = (userId: string) =>
  useFollowStore((s) => s.userStats.get(userId)?.followers || 0);

export const useFollowingCount = (userId: string) =>
  useFollowStore((s) => s.userStats.get(userId)?.following || 0);

export const useIsTogglingFollow = (userId: string) =>
  useFollowStore((s) => s.isTogglingFollow === userId);

// ============================================
// Hook for Profile Pages
// ============================================

export function useUserFollow(userId: string) {
  const isFollowing = useFollowStore((s) => s.followingIds.has(userId));
  const stats = useFollowStore((s) => s.userStats.get(userId));
  const isToggling = useFollowStore((s) => s.isTogglingFollow === userId);
  const toggleFollow = useFollowStore((s) => s.toggleFollow);

  return {
    isFollowing,
    followerCount: stats?.followers || 0,
    followingCount: stats?.following || 0,
    isToggling,
    toggleFollow: () => toggleFollow(userId),
  };
}
