/**
 * StickerNest v2 - Public Profile Store (Zustand)
 * Manages state for viewing public user profiles with API integration
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  PublicProfile,
  CanvasPreview,
  Collection,
  ProfileTab,
} from '../types/profile';
import { userApi, followApi, searchApi, favoritesApi } from '../services/api';
import { isLocalDevMode } from '../services/supabaseClient';

// ============================================
// Store Types
// ============================================

interface PublicProfileState {
  // Profile data
  profile: PublicProfile | null;
  canvases: CanvasPreview[];
  collections: Collection[];
  favorites: CanvasPreview[];

  // Navigation
  activeTab: ProfileTab;

  // Follow state
  isFollowing: boolean;
  followLoading: boolean;

  // Pagination
  canvasPage: number;
  canvasPageSize: number;
  hasMoreCanvases: boolean;
  totalCanvases: number;

  // Loading states
  isLoading: boolean;
  isLoadingCanvases: boolean;
  isLoadingMore: boolean;

  // Error state
  error: string | null;

  // View state
  isOwnProfile: boolean;
}

interface PublicProfileActions {
  // Data fetching
  fetchProfile: (username: string, currentUserId?: string) => Promise<void>;
  fetchCanvases: (userId: string) => Promise<void>;
  fetchFavorites: (userId: string) => Promise<void>;
  fetchCollections: (userId: string) => Promise<void>;
  loadMoreCanvases: () => Promise<void>;

  // Tab navigation
  setActiveTab: (tab: ProfileTab) => void;

  // Follow actions
  toggleFollow: () => Promise<void>;
  checkFollowStatus: (userId: string) => Promise<void>;

  // Utilities
  reset: () => void;
  clearError: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: PublicProfileState = {
  profile: null,
  canvases: [],
  collections: [],
  favorites: [],
  activeTab: 'canvases',
  isFollowing: false,
  followLoading: false,
  canvasPage: 1,
  canvasPageSize: 12,
  hasMoreCanvases: false,
  totalCanvases: 0,
  isLoading: true,
  isLoadingCanvases: false,
  isLoadingMore: false,
  error: null,
  isOwnProfile: false,
};

// ============================================
// Store
// ============================================

export const usePublicProfileStore = create<PublicProfileState & PublicProfileActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Data Fetching
      // ==================

      fetchProfile: async (username, currentUserId) => {
        set({ isLoading: true, error: null }, false, 'fetchProfile:start');

        try {
          if (!isLocalDevMode) {
            // Fetch profile from API
            const response = await userApi.getProfileByUsername(username);
            if (response.success && response.data) {
              const apiProfile = response.data.profile;
              const profile: PublicProfile = {
                id: apiProfile.id,
                username: apiProfile.username,
                displayName: apiProfile.displayName || apiProfile.username,
                avatarUrl: apiProfile.avatarUrl,
                bannerUrl: undefined, // Not in API yet
                bio: apiProfile.bio,
                website: apiProfile.website,
                location: apiProfile.location,
                socialLinks: apiProfile.socialLinks || {},
                role: apiProfile.role || 'user',
                isVerified: apiProfile.isVerified || false,
                isCreator: apiProfile.isCreator || false,
                profileSettings: {
                  themeColor: '#8b5cf6',
                  layoutPreference: 'grid',
                  showStats: true,
                  showFollowers: true,
                },
                stats: {
                  publicCanvases: apiProfile.stats?.publicCanvases || 0,
                  followers: apiProfile.stats?.followers || 0,
                  following: apiProfile.stats?.following || 0,
                  totalViews: apiProfile.stats?.totalViews || 0,
                  totalLikes: 0, // Computed client-side
                },
                createdAt: apiProfile.createdAt,
                joinedAt: apiProfile.createdAt,
              };

              const isOwn = currentUserId === profile.id;
              set({
                profile,
                isOwnProfile: isOwn,
                isLoading: false,
              }, false, 'fetchProfile:success');

              // Also fetch canvases and check follow status
              get().fetchCanvases(profile.id);
              if (!isOwn && currentUserId) {
                get().checkFollowStatus(profile.id);
              }
              return;
            }
            throw new Error(response.error?.message || 'Failed to load profile');
          }

          // Local dev mode - no API available
          throw new Error('Profile API not available in local dev mode');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load profile',
            isLoading: false,
          }, false, 'fetchProfile:error');
        }
      },

      fetchCanvases: async (userId: string) => {
        set({ isLoadingCanvases: true }, false, 'fetchCanvases:start');

        try {
          if (!isLocalDevMode) {
            // Use search API to find user's public canvases
            const response = await searchApi.searchCanvases(`user:${userId}`, 1, 12);
            if (response.success && response.data) {
              const canvases: CanvasPreview[] = response.data.items.map(mapCanvasToPreview);
              set({
                canvases,
                totalCanvases: response.data.total || canvases.length,
                hasMoreCanvases: response.data.page < response.data.totalPages,
                canvasPage: 1,
                isLoadingCanvases: false,
              }, false, 'fetchCanvases:success');
              return;
            }
          }

          // Local dev mode - no canvases available
          set({
            canvases: [],
            totalCanvases: 0,
            hasMoreCanvases: false,
            canvasPage: 1,
            isLoadingCanvases: false,
          }, false, 'fetchCanvases:localdev');
        } catch (error) {
          set({ isLoadingCanvases: false }, false, 'fetchCanvases:error');
        }
      },

      fetchFavorites: async (_userId: string) => {
        try {
          if (!isLocalDevMode) {
            // Fetch current user's favorites (API returns authed user's favorites)
            const response = await favoritesApi.list(undefined, 1, 20);
            if (response.success && response.data) {
              const favorites: CanvasPreview[] = response.data.items.map((fav) => ({
                id: fav.canvasId,
                name: fav.canvas?.name || 'Canvas',
                description: fav.canvas?.description,
                visibility: fav.canvas?.visibility || 'public',
                slug: fav.canvas?.slug,
                thumbnailUrl: fav.canvas?.thumbnail,
                viewCount: fav.canvas?.viewCount || 0,
                likeCount: 0,
                commentCount: 0,
                tags: [],
                category: undefined,
                createdAt: fav.canvas?.createdAt,
                updatedAt: fav.canvas?.updatedAt,
                owner: fav.canvas?.owner,
              }));
              set({ favorites }, false, 'fetchFavorites:success');
              return;
            }
          }

          // Local dev mode - no favorites available
          set({ favorites: [] }, false, 'fetchFavorites:localdev');
        } catch (error) {
          console.error('Failed to fetch favorites:', error);
        }
      },

      fetchCollections: async (_username) => {
        // Collections feature - placeholder for now
        set({ collections: [] }, false, 'fetchCollections');
      },

      loadMoreCanvases: async () => {
        const { profile, hasMoreCanvases, isLoadingMore } = get();

        if (!profile || !hasMoreCanvases || isLoadingMore) return;

        set({ isLoadingMore: true }, false, 'loadMoreCanvases:start');

        try {
          // TODO: Implement pagination
          set({ isLoadingMore: false, hasMoreCanvases: false }, false, 'loadMoreCanvases:complete');
        } catch (error) {
          set({ isLoadingMore: false }, false, 'loadMoreCanvases:error');
        }
      },

      // ==================
      // Tab Navigation
      // ==================

      setActiveTab: (tab) => {
        const { activeTab, favorites, isOwnProfile, profile } = get();

        if (tab === activeTab) return;

        set({ activeTab: tab }, false, 'setActiveTab');

        // Load favorites if switching to favorites tab and haven't loaded yet
        if (tab === 'favorites' && favorites.length === 0 && isOwnProfile && profile) {
          get().fetchFavorites(profile.id);
        }
      },

      // ==================
      // Follow Actions
      // ==================

      toggleFollow: async () => {
        const { profile, isFollowing, followLoading } = get();

        if (!profile || followLoading) return;

        set({ followLoading: true }, false, 'toggleFollow:start');

        // Optimistic update
        const newFollowing = !isFollowing;
        set((state) => ({
          isFollowing: newFollowing,
          profile: state.profile ? {
            ...state.profile,
            stats: {
              ...state.profile.stats,
              followers: state.profile.stats.followers + (newFollowing ? 1 : -1),
            },
          } : null,
        }), false, 'toggleFollow:optimistic');

        try {
          if (!isLocalDevMode) {
            if (isFollowing) {
              const response = await followApi.unfollow(profile.id);
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to unfollow');
              }
            } else {
              const response = await followApi.follow(profile.id);
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to follow');
              }
            }
          } else {
            // Simulate API delay in local dev mode
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          set({ followLoading: false }, false, isFollowing ? 'unfollow:success' : 'follow:success');
        } catch (error) {
          // Revert optimistic update
          set((state) => ({
            isFollowing,
            followLoading: false,
            profile: state.profile ? {
              ...state.profile,
              stats: {
                ...state.profile.stats,
                followers: state.profile.stats.followers + (isFollowing ? 0 : -1) - (isFollowing ? -1 : 0),
              },
            } : null,
          }), false, 'toggleFollow:revert');
        }
      },

      checkFollowStatus: async (userId: string) => {
        if (!isLocalDevMode) {
          try {
            const response = await followApi.isFollowing(userId);
            if (response.success && response.data) {
              set({ isFollowing: response.data.isFollowing }, false, 'checkFollowStatus:success');
            }
          } catch (error) {
            console.error('Failed to check follow status:', error);
          }
        }
      },

      // ==================
      // Utilities
      // ==================

      reset: () => {
        set(initialState, false, 'reset');
      },

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },
    }),
    {
      name: 'PublicProfileStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================
// Helper Functions
// ============================================

function mapCanvasToPreview(canvas: any): CanvasPreview {
  return {
    id: canvas.id,
    name: canvas.name,
    description: canvas.description,
    visibility: canvas.visibility,
    slug: canvas.slug,
    thumbnailUrl: canvas.thumbnail || canvas.thumbnailUrl,
    viewCount: canvas.viewCount || 0,
    likeCount: canvas.likeCount || 0,
    commentCount: canvas.commentCount || 0,
    tags: canvas.tags || [],
    category: canvas.category,
    createdAt: canvas.createdAt,
    updatedAt: canvas.updatedAt,
    publishedAt: canvas.publishedAt,
    owner: canvas.owner,
  };
}

// ============================================
// Selector Hooks
// ============================================

export const useProfile = () => usePublicProfileStore((s) => s.profile);
export const useProfileCanvases = () => usePublicProfileStore((s) => s.canvases);
export const useProfileFavorites = () => usePublicProfileStore((s) => s.favorites);
export const useProfileTab = () => usePublicProfileStore((s) => s.activeTab);
export const useIsFollowing = () => usePublicProfileStore((s) => s.isFollowing);
export const useFollowLoading = () => usePublicProfileStore((s) => s.followLoading);
export const useProfileLoading = () => usePublicProfileStore((s) => s.isLoading);
export const useProfileError = () => usePublicProfileStore((s) => s.error);
export const useIsOwnProfile = () => usePublicProfileStore((s) => s.isOwnProfile);
