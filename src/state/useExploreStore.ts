/**
 * StickerNest v2 - Explore Store (Zustand)
 * Manages state for the public canvas discovery/explore page with API integration
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CanvasPreview } from '../types/profile';
import { searchApi } from '../services/api';
import { isLocalDevMode } from '../services/supabaseClient';

// ============================================
// Types
// ============================================

export type SortOption = 'trending' | 'newest' | 'popular' | 'mostViewed';
export type ViewMode = 'grid' | 'list';

export interface ExploreFilters {
  category?: string;
  tags?: string[];
  sortBy: SortOption;
  search?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// ============================================
// Mock Data
// ============================================

const mockCategories: Category[] = [
  { id: 'all', name: 'All', icon: 'grid', count: 156 },
  { id: 'portfolio', name: 'Portfolio', icon: 'briefcase', count: 42 },
  { id: 'dashboard', name: 'Dashboard', icon: 'layout', count: 38 },
  { id: 'art', name: 'Art & Creative', icon: 'palette', count: 31 },
  { id: 'education', name: 'Education', icon: 'books', count: 24 },
  { id: 'productivity', name: 'Productivity', icon: 'checkSquare', count: 21 },
];

const mockTags = [
  'interactive', 'data-viz', 'animation', 'minimal', 'colorful',
  'dark-mode', '3d', 'generative', 'responsive', 'experimental',
];

const mockFeaturedCanvases: CanvasPreview[] = [
  {
    id: 'featured-1',
    name: 'Interactive Data Story',
    description: 'A stunning visualization of climate change data with interactive charts',
    visibility: 'public',
    slug: 'interactive-data-story',
    thumbnailUrl: undefined,
    viewCount: 12500,
    likeCount: 1890,
    commentCount: 145,
    tags: ['data-viz', 'interactive', 'storytelling'],
    category: 'dashboard',
    createdAt: '2024-10-15T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
    publishedAt: '2024-10-16T00:00:00Z',
    owner: {
      id: 'user-featured-1',
      username: 'dataartist',
      displayName: 'Data Artist',
      avatarUrl: undefined,
    },
  },
  {
    id: 'featured-2',
    name: 'Generative Art Gallery',
    description: 'Real-time generative artwork powered by WebGL shaders',
    visibility: 'public',
    slug: 'generative-art-gallery',
    thumbnailUrl: undefined,
    viewCount: 8900,
    likeCount: 1456,
    commentCount: 89,
    tags: ['generative', '3d', 'art', 'webgl'],
    category: 'art',
    createdAt: '2024-09-20T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
    publishedAt: '2024-09-21T00:00:00Z',
    owner: {
      id: 'user-featured-2',
      username: 'shadermaster',
      displayName: 'Shader Master',
      avatarUrl: undefined,
    },
  },
  {
    id: 'featured-3',
    name: 'Portfolio Template Pro',
    description: 'A professional portfolio template with smooth animations',
    visibility: 'public',
    slug: 'portfolio-template-pro',
    thumbnailUrl: undefined,
    viewCount: 15200,
    likeCount: 2340,
    commentCount: 178,
    tags: ['portfolio', 'template', 'animation', 'professional'],
    category: 'portfolio',
    createdAt: '2024-08-10T00:00:00Z',
    updatedAt: '2024-11-28T00:00:00Z',
    publishedAt: '2024-08-11T00:00:00Z',
    owner: {
      id: 'user-featured-3',
      username: 'designpro',
      displayName: 'Design Pro',
      avatarUrl: undefined,
    },
  },
];

const mockCanvases: CanvasPreview[] = [
  ...mockFeaturedCanvases,
  {
    id: 'canvas-explore-1',
    name: 'Music Visualizer 2.0',
    description: 'Audio-reactive visualization with particle effects',
    visibility: 'public',
    slug: 'music-visualizer-2',
    thumbnailUrl: undefined,
    viewCount: 4500,
    likeCount: 567,
    commentCount: 34,
    tags: ['music', 'visualization', 'particles'],
    category: 'art',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    owner: {
      id: 'user-4',
      username: 'audiovisual',
      displayName: 'Audio Visual',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-2',
    name: 'Project Management Hub',
    description: 'Complete project management dashboard with Kanban boards',
    visibility: 'public',
    slug: 'project-hub',
    thumbnailUrl: undefined,
    viewCount: 3200,
    likeCount: 423,
    commentCount: 28,
    tags: ['productivity', 'dashboard', 'kanban'],
    category: 'productivity',
    createdAt: '2024-10-20T00:00:00Z',
    updatedAt: '2024-11-25T00:00:00Z',
    owner: {
      id: 'user-5',
      username: 'productivityguru',
      displayName: 'Productivity Guru',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-3',
    name: 'Interactive Resume',
    description: 'A creative resume with animated sections and skills visualization',
    visibility: 'public',
    slug: 'interactive-resume',
    thumbnailUrl: undefined,
    viewCount: 6700,
    likeCount: 892,
    commentCount: 56,
    tags: ['portfolio', 'resume', 'animation', 'interactive'],
    category: 'portfolio',
    createdAt: '2024-09-15T00:00:00Z',
    updatedAt: '2024-11-20T00:00:00Z',
    owner: {
      id: 'user-6',
      username: 'creativecv',
      displayName: 'Creative CV',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-4',
    name: 'Learning Path Builder',
    description: 'Interactive course builder with progress tracking',
    visibility: 'public',
    slug: 'learning-path',
    thumbnailUrl: undefined,
    viewCount: 2800,
    likeCount: 345,
    commentCount: 21,
    tags: ['education', 'interactive', 'learning'],
    category: 'education',
    createdAt: '2024-11-10T00:00:00Z',
    updatedAt: '2024-12-08T00:00:00Z',
    owner: {
      id: 'user-7',
      username: 'edutech',
      displayName: 'EduTech',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-5',
    name: 'Crypto Dashboard',
    description: 'Real-time cryptocurrency tracking with portfolio management',
    visibility: 'public',
    slug: 'crypto-dashboard',
    thumbnailUrl: undefined,
    viewCount: 5100,
    likeCount: 678,
    commentCount: 45,
    tags: ['dashboard', 'data-viz', 'finance', 'real-time'],
    category: 'dashboard',
    createdAt: '2024-10-05T00:00:00Z',
    updatedAt: '2024-12-12T00:00:00Z',
    owner: {
      id: 'user-8',
      username: 'cryptotracker',
      displayName: 'Crypto Tracker',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-6',
    name: 'Abstract Art Generator',
    description: 'Create unique abstract art with customizable parameters',
    visibility: 'public',
    slug: 'abstract-generator',
    thumbnailUrl: undefined,
    viewCount: 3900,
    likeCount: 534,
    commentCount: 32,
    tags: ['generative', 'art', 'interactive', 'colorful'],
    category: 'art',
    createdAt: '2024-11-05T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
    owner: {
      id: 'user-9',
      username: 'abstracto',
      displayName: 'Abstracto',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-7',
    name: 'Recipe Collection',
    description: 'Beautiful recipe cards with ingredient scaling',
    visibility: 'public',
    slug: 'recipe-collection',
    thumbnailUrl: undefined,
    viewCount: 2100,
    likeCount: 289,
    commentCount: 18,
    tags: ['lifestyle', 'interactive', 'minimal'],
    category: 'productivity',
    createdAt: '2024-10-25T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
    owner: {
      id: 'user-10',
      username: 'foodie',
      displayName: 'Foodie Dev',
      avatarUrl: undefined,
    },
  },
  {
    id: 'canvas-explore-8',
    name: 'Physics Simulator',
    description: 'Interactive physics demonstrations for learning',
    visibility: 'public',
    slug: 'physics-sim',
    thumbnailUrl: undefined,
    viewCount: 4200,
    likeCount: 567,
    commentCount: 42,
    tags: ['education', 'physics', 'interactive', 'simulation'],
    category: 'education',
    createdAt: '2024-09-30T00:00:00Z',
    updatedAt: '2024-11-28T00:00:00Z',
    owner: {
      id: 'user-11',
      username: 'physicslab',
      displayName: 'Physics Lab',
      avatarUrl: undefined,
    },
  },
];

// ============================================
// Store Types
// ============================================

interface ExploreState {
  // Data
  canvases: CanvasPreview[];
  featuredCanvases: CanvasPreview[];
  categories: Category[];
  popularTags: string[];

  // Filters & Sorting
  filters: ExploreFilters;
  viewMode: ViewMode;

  // Pagination
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount: number;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;

  // Search
  searchQuery: string;
  searchResults: CanvasPreview[];
  isSearching: boolean;
}

interface ExploreActions {
  // Data fetching
  fetchCanvases: () => Promise<void>;
  fetchFeatured: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Filters
  setCategory: (category: string | undefined) => void;
  setTags: (tags: string[]) => void;
  setSortBy: (sortBy: SortOption) => void;
  clearFilters: () => void;

  // Search
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;

  // View
  setViewMode: (mode: ViewMode) => void;

  // Utilities
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialFilters: ExploreFilters = {
  category: undefined,
  tags: [],
  sortBy: 'trending',
  search: undefined,
};

const initialState: ExploreState = {
  canvases: [],
  featuredCanvases: [],
  categories: mockCategories,
  popularTags: mockTags,
  filters: initialFilters,
  viewMode: 'grid',
  page: 1,
  pageSize: 12,
  hasMore: true,
  totalCount: 0,
  isLoading: true,
  isLoadingMore: false,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
};

// ============================================
// Store
// ============================================

export const useExploreStore = create<ExploreState & ExploreActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Data Fetching
      // ==================

      fetchCanvases: async () => {
        set({ isLoading: true }, false, 'fetchCanvases:start');

        try {
          const { filters, pageSize } = get();

          if (!isLocalDevMode) {
            // Use search API - build search query from filters
            const searchQuery = filters.category && filters.category !== 'all'
              ? `category:${filters.category}`
              : '*';

            const response = await searchApi.searchCanvases(searchQuery, 1, pageSize);

            if (response.success && response.data) {
              const canvases: CanvasPreview[] = response.data.items.map(mapApiCanvasToPreview);
              set({
                canvases,
                totalCount: response.data.total || canvases.length,
                hasMore: response.data.page < response.data.totalPages,
                page: 1,
                isLoading: false,
              }, false, 'fetchCanvases:success');
              return;
            }
          }

          // Local dev mode - use mock data
          await new Promise(resolve => setTimeout(resolve, 400));

          let filtered = [...mockCanvases];

          // Apply category filter
          if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(c => c.category === filters.category);
          }

          // Apply tag filter
          if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(c =>
              filters.tags!.some(tag => c.tags?.includes(tag))
            );
          }

          // Apply sorting
          switch (filters.sortBy) {
            case 'newest':
              filtered.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              break;
            case 'popular':
              filtered.sort((a, b) => b.likeCount - a.likeCount);
              break;
            case 'mostViewed':
              filtered.sort((a, b) => b.viewCount - a.viewCount);
              break;
            case 'trending':
            default:
              // Trending: combination of recency and engagement
              filtered.sort((a, b) => {
                const scoreA = a.likeCount * 2 + a.viewCount + (a.commentCount || 0) * 3;
                const scoreB = b.likeCount * 2 + b.viewCount + (b.commentCount || 0) * 3;
                return scoreB - scoreA;
              });
              break;
          }

          const paginated = filtered.slice(0, pageSize);

          set({
            canvases: paginated,
            totalCount: filtered.length,
            hasMore: filtered.length > pageSize,
            page: 1,
            isLoading: false,
          }, false, 'fetchCanvases:mock');
        } catch (error) {
          set({ isLoading: false }, false, 'fetchCanvases:error');
        }
      },

      fetchFeatured: async () => {
        try {
          if (!isLocalDevMode) {
            // Use search API to find featured canvases
            const response = await searchApi.searchCanvases('featured:true', 1, 3);
            if (response.success && response.data) {
              const featured: CanvasPreview[] = response.data.items.map(mapApiCanvasToPreview);
              set({ featuredCanvases: featured }, false, 'fetchFeatured:success');
              return;
            }
          }

          // Local dev mode - use mock data
          await new Promise(resolve => setTimeout(resolve, 200));
          set({ featuredCanvases: mockFeaturedCanvases }, false, 'fetchFeatured:mock');
        } catch (error) {
          console.error('Failed to fetch featured:', error);
        }
      },

      loadMore: async () => {
        const { page, pageSize, canvases, hasMore, isLoadingMore, filters } = get();

        if (!hasMore || isLoadingMore) return;

        set({ isLoadingMore: true }, false, 'loadMore:start');

        try {
          const nextPage = page + 1;
          const offset = page * pageSize;

          if (!isLocalDevMode) {
            // Use search API for pagination
            const searchQuery = filters.category && filters.category !== 'all'
              ? `category:${filters.category}`
              : '*';

            const response = await searchApi.searchCanvases(searchQuery, nextPage, pageSize);

            if (response.success && response.data) {
              const newCanvases: CanvasPreview[] = response.data.items.map(mapApiCanvasToPreview);
              set({
                canvases: [...canvases, ...newCanvases],
                page: nextPage,
                hasMore: response.data.page < response.data.totalPages,
                isLoadingMore: false,
              }, false, 'loadMore:success');
              return;
            }
          }

          // Local dev mode - use mock data
          await new Promise(resolve => setTimeout(resolve, 300));

          let filtered = [...mockCanvases];

          // Apply filters (same as fetchCanvases)
          if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(c => c.category === filters.category);
          }
          if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(c =>
              filters.tags!.some(tag => c.tags?.includes(tag))
            );
          }

          const end = offset + pageSize;
          const newCanvases = filtered.slice(offset, end);

          set({
            canvases: [...canvases, ...newCanvases],
            page: nextPage,
            hasMore: end < filtered.length,
            isLoadingMore: false,
          }, false, 'loadMore:mock');
        } catch (error) {
          set({ isLoadingMore: false }, false, 'loadMore:error');
        }
      },

      // ==================
      // Filters
      // ==================

      setCategory: (category) => {
        set(
          (state) => ({
            filters: { ...state.filters, category },
            page: 1,
          }),
          false,
          'setCategory'
        );
        get().fetchCanvases();
      },

      setTags: (tags) => {
        set(
          (state) => ({
            filters: { ...state.filters, tags },
            page: 1,
          }),
          false,
          'setTags'
        );
        get().fetchCanvases();
      },

      setSortBy: (sortBy) => {
        set(
          (state) => ({
            filters: { ...state.filters, sortBy },
            page: 1,
          }),
          false,
          'setSortBy'
        );
        get().fetchCanvases();
      },

      clearFilters: () => {
        set({ filters: initialFilters, page: 1 }, false, 'clearFilters');
        get().fetchCanvases();
      },

      // ==================
      // Search
      // ==================

      setSearchQuery: (query) => {
        set({ searchQuery: query }, false, 'setSearchQuery');
      },

      search: async (query) => {
        if (!query.trim()) {
          get().clearSearch();
          return;
        }

        set({ isSearching: true, searchQuery: query }, false, 'search:start');

        try {
          if (!isLocalDevMode) {
            const response = await searchApi.searchCanvases(query, 1, 20);
            if (response.success && response.data) {
              const results: CanvasPreview[] = response.data.items.map(mapApiCanvasToPreview);
              set({
                searchResults: results,
                isSearching: false,
              }, false, 'search:success');
              return;
            }
          }

          // Local dev mode - use mock data
          await new Promise(resolve => setTimeout(resolve, 300));

          const lowerQuery = query.toLowerCase();
          const results = mockCanvases.filter(c =>
            c.name.toLowerCase().includes(lowerQuery) ||
            c.description?.toLowerCase().includes(lowerQuery) ||
            c.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            c.owner?.username.toLowerCase().includes(lowerQuery)
          );

          set({
            searchResults: results,
            isSearching: false,
          }, false, 'search:mock');
        } catch (error) {
          set({ isSearching: false }, false, 'search:error');
        }
      },

      clearSearch: () => {
        set({
          searchQuery: '',
          searchResults: [],
          isSearching: false,
        }, false, 'clearSearch');
      },

      // ==================
      // View
      // ==================

      setViewMode: (mode) => {
        set({ viewMode: mode }, false, 'setViewMode');
      },

      // ==================
      // Utilities
      // ==================

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'ExploreStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================
// Helper Functions
// ============================================

function mapApiCanvasToPreview(canvas: any): CanvasPreview {
  return {
    id: canvas.id,
    name: canvas.name,
    description: canvas.description,
    visibility: canvas.visibility || 'public',
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
    owner: canvas.owner ? {
      id: canvas.owner.id,
      username: canvas.owner.username,
      displayName: canvas.owner.displayName || canvas.owner.username,
      avatarUrl: canvas.owner.avatarUrl,
    } : undefined,
  };
}

// ============================================
// Selector Hooks
// ============================================

export const useExploreCanvases = () => useExploreStore((s) => s.canvases);
export const useFeaturedCanvases = () => useExploreStore((s) => s.featuredCanvases);
export const useExploreFilters = () => useExploreStore((s) => s.filters);
export const useExploreCategories = () => useExploreStore((s) => s.categories);
export const useExploreLoading = () => useExploreStore((s) => s.isLoading);
export const useExploreViewMode = () => useExploreStore((s) => s.viewMode);
export const useExploreSearch = () => useExploreStore((s) => ({
  query: s.searchQuery,
  results: s.searchResults,
  isSearching: s.isSearching,
}));
