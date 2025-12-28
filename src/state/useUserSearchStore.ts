/**
 * StickerNest v2 - User Search Store (Zustand)
 * Manages user search functionality with API integration
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { userApi } from '../services/api';
import { isLocalDevMode, supabaseClient } from '../services/supabaseClient';

// ============================================
// Types
// ============================================

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

// ============================================
// Store Types
// ============================================

interface UserSearchState {
  /** Search query */
  query: string;
  /** Search results */
  results: SearchableUser[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Whether search modal is open */
  isModalOpen: boolean;
  /** Recent searches (usernames) */
  recentSearches: string[];
  /** Suggested users to follow */
  suggestedUsers: SearchableUser[];
}

interface UserSearchActions {
  /** Set search query */
  setQuery: (query: string) => void;
  /** Search for users */
  searchUsers: (query: string) => Promise<void>;
  /** Clear search results */
  clearResults: () => void;
  /** Open search modal */
  openModal: () => void;
  /** Close search modal */
  closeModal: () => void;
  /** Add to recent searches */
  addRecentSearch: (username: string) => void;
  /** Clear recent searches */
  clearRecentSearches: () => void;
  /** Load suggested users */
  loadSuggestedUsers: () => Promise<void>;
  /** Reset store */
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: UserSearchState = {
  query: '',
  results: [],
  isLoading: false,
  error: null,
  isModalOpen: false,
  recentSearches: [],
  suggestedUsers: [],
};

// ============================================
// Mock Data (for local dev mode)
// ============================================

const MOCK_USERS: SearchableUser[] = [
  {
    id: 'user-1',
    username: 'creativecoder',
    displayName: 'Creative Coder',
    avatarUrl: undefined,
    bio: 'Designer & developer building interactive experiences',
    isVerified: true,
    isCreator: true,
    followerCount: 1234,
    canvasCount: 12,
  },
  {
    id: 'user-2',
    username: 'sarahdesigns',
    displayName: 'Sarah Chen',
    avatarUrl: undefined,
    bio: 'UI/UX designer passionate about digital art',
    isVerified: false,
    isCreator: true,
    followerCount: 5600,
    canvasCount: 28,
  },
  {
    id: 'user-3',
    username: 'techteacher',
    displayName: 'Alex Thompson',
    avatarUrl: undefined,
    bio: 'Teaching tech through interactive tutorials',
    isVerified: true,
    isCreator: true,
    followerCount: 3200,
    canvasCount: 15,
  },
  {
    id: 'user-4',
    username: 'artisan_dev',
    displayName: 'Artisan Developer',
    avatarUrl: undefined,
    bio: 'Crafting beautiful code and experiences',
    isVerified: false,
    isCreator: false,
    followerCount: 890,
    canvasCount: 5,
  },
  {
    id: 'user-5',
    username: 'pixelperfect',
    displayName: 'Pixel Perfect',
    avatarUrl: undefined,
    bio: 'Obsessed with the details',
    isVerified: false,
    isCreator: true,
    followerCount: 2100,
    canvasCount: 18,
  },
];

// ============================================
// Store
// ============================================

export const useUserSearchStore = create<UserSearchState & UserSearchActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Set Query
      // ==================

      setQuery: (query) => {
        set({ query }, false, 'setQuery');
      },

      // ==================
      // Search Users
      // ==================

      searchUsers: async (query) => {
        if (!query.trim()) {
          set({ results: [], isLoading: false }, false, 'searchUsers:empty');
          return;
        }

        set({ isLoading: true, error: null, query }, false, 'searchUsers:start');

        try {
          if (isLocalDevMode) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 300));

            // Filter mock users by query
            const lowerQuery = query.toLowerCase();
            const results = MOCK_USERS.filter(
              user =>
                user.username.toLowerCase().includes(lowerQuery) ||
                user.displayName.toLowerCase().includes(lowerQuery)
            );

            set({ results, isLoading: false }, false, 'searchUsers:mock');
            return;
          }

          // Try backend API first
          try {
            const response = await userApi.searchUsers(query);
            if (response.success && response.data) {
              set(
                { results: response.data.users, isLoading: false },
                false,
                'searchUsers:success'
              );
              return;
            }
          } catch (apiError) {
            console.log('[UserSearch] Backend API unavailable, falling back to Supabase');
          }

          // Fallback: Search directly in Supabase user_profiles
          if (supabaseClient) {
            const { data, error: sbError } = await supabaseClient
              .from('user_profiles')
              .select('user_id, username, display_name, avatar_url, bio, is_verified, is_creator')
              .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,email.ilike.%${query}%`)
              .limit(20);

            if (sbError) {
              console.error('[UserSearch] Supabase error:', sbError);
              throw new Error(sbError.message);
            }

            // Map Supabase results to SearchableUser format
            const results: SearchableUser[] = (data || []).map((profile) => ({
              id: profile.user_id,
              username: profile.username || 'user',
              displayName: profile.display_name || profile.username || 'User',
              avatarUrl: profile.avatar_url,
              bio: profile.bio,
              isVerified: profile.is_verified || false,
              isCreator: profile.is_creator || false,
              followerCount: 0,
              canvasCount: 0,
            }));

            set({ results, isLoading: false }, false, 'searchUsers:supabase');
            return;
          }

          throw new Error('No search backend available');
        } catch (error) {
          console.error('Failed to search users:', error);
          set(
            {
              error: error instanceof Error ? error.message : 'Search failed',
              isLoading: false,
              results: [],
            },
            false,
            'searchUsers:error'
          );
        }
      },

      // ==================
      // Clear Results
      // ==================

      clearResults: () => {
        set({ results: [], query: '', error: null }, false, 'clearResults');
      },

      // ==================
      // Modal Control
      // ==================

      openModal: () => {
        set({ isModalOpen: true }, false, 'openModal');
      },

      closeModal: () => {
        set({ isModalOpen: false, query: '', results: [] }, false, 'closeModal');
      },

      // ==================
      // Recent Searches
      // ==================

      addRecentSearch: (username) => {
        const { recentSearches } = get();
        const newSearches = [
          username,
          ...recentSearches.filter(s => s !== username),
        ].slice(0, 5); // Keep only last 5

        set({ recentSearches: newSearches }, false, 'addRecentSearch');

        // Persist to localStorage
        try {
          localStorage.setItem('sn-recent-user-searches', JSON.stringify(newSearches));
        } catch (e) {
          // Ignore storage errors
        }
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] }, false, 'clearRecentSearches');
        try {
          localStorage.removeItem('sn-recent-user-searches');
        } catch (e) {
          // Ignore storage errors
        }
      },

      // ==================
      // Suggested Users
      // ==================

      loadSuggestedUsers: async () => {
        try {
          if (isLocalDevMode) {
            // Return random selection of mock users
            const shuffled = [...MOCK_USERS].sort(() => Math.random() - 0.5);
            set({ suggestedUsers: shuffled.slice(0, 3) }, false, 'loadSuggestedUsers:mock');
            return;
          }

          const response = await userApi.getSuggestedUsers();
          if (response.success && response.data) {
            set({ suggestedUsers: response.data.users }, false, 'loadSuggestedUsers:success');
          }
        } catch (error) {
          console.error('Failed to load suggested users:', error);
        }
      },

      // ==================
      // Reset
      // ==================

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'UserSearchStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useSearchQuery = () => useUserSearchStore(s => s.query);
export const useSearchResults = () => useUserSearchStore(s => s.results);
export const useSearchLoading = () => useUserSearchStore(s => s.isLoading);
export const useSearchModalOpen = () => useUserSearchStore(s => s.isModalOpen);
export const useRecentSearches = () => useUserSearchStore(s => s.recentSearches);
export const useSuggestedUsers = () => useUserSearchStore(s => s.suggestedUsers);

// Initialize recent searches from localStorage
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('sn-recent-user-searches');
    if (stored) {
      const recentSearches = JSON.parse(stored);
      useUserSearchStore.setState({ recentSearches });
    }
  } catch (e) {
    // Ignore parse errors
  }
}
