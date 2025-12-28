/**
 * Search API Module
 * Global search and autocomplete
 */

import { request } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Canvas,
  ExtendedUserProfile,
  SearchResults,
  SearchQuery,
} from './types';

// Mock users for local development when backend is unavailable
const MOCK_USERS: ExtendedUserProfile[] = [
  {
    id: 'mock-user-1',
    username: 'alice_demo',
    displayName: 'Alice Demo',
    email: 'alice@demo.com',
    avatarUrl: null,
    bio: 'Demo user for testing social features',
    isVerified: true,
    isCreator: true,
    followersCount: 150,
    followingCount: 75,
    canvasCount: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-2',
    username: 'bob_builder',
    displayName: 'Bob Builder',
    email: 'bob@demo.com',
    avatarUrl: null,
    bio: 'Widget creator and canvas enthusiast',
    isVerified: false,
    isCreator: true,
    followersCount: 89,
    followingCount: 42,
    canvasCount: 8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-3',
    username: 'charlie_creative',
    displayName: 'Charlie Creative',
    email: 'charlie@demo.com',
    avatarUrl: null,
    bio: 'Artist and sticker designer',
    isVerified: true,
    isCreator: false,
    followersCount: 234,
    followingCount: 156,
    canvasCount: 25,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-4',
    username: 'diana_dev',
    displayName: 'Diana Developer',
    email: 'diana@demo.com',
    avatarUrl: null,
    bio: 'Full-stack developer building cool widgets',
    isVerified: false,
    isCreator: true,
    followersCount: 67,
    followingCount: 120,
    canvasCount: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-5',
    username: 'eve_explorer',
    displayName: 'Eve Explorer',
    email: 'eve@demo.com',
    avatarUrl: null,
    bio: 'Discovering amazing canvases every day',
    isVerified: false,
    isCreator: false,
    followersCount: 45,
    followingCount: 200,
    canvasCount: 3,
    createdAt: new Date().toISOString(),
  },
];

export const searchApi = {
  /**
   * Global search
   */
  async search(query: SearchQuery): Promise<ApiResponse<SearchResults>> {
    const params = new URLSearchParams();
    params.set('q', query.q);
    if (query.type) params.set('type', query.type);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.sortBy) params.set('sortBy', query.sortBy);
    return request<SearchResults>(`/search?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Search canvases
   */
  async searchCanvases(
    q: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<Canvas>>> {
    return request<PaginatedResponse<Canvas>>(
      `/search/canvases?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
  },

  /**
   * Search users
   */
  async searchUsers(
    q: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<ExtendedUserProfile>>> {
    try {
      const result = await request<PaginatedResponse<ExtendedUserProfile>>(
        `/search/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`,
        { method: 'GET' }
      );
      return result;
    } catch (error) {
      // Fallback to mock data when backend unavailable
      console.warn('[searchApi] Backend unavailable, using mock user data');
      const query = q.toLowerCase();
      const filtered = MOCK_USERS.filter(
        user =>
          user.username.toLowerCase().includes(query) ||
          (user.displayName && user.displayName.toLowerCase().includes(query)) ||
          (user.bio && user.bio.toLowerCase().includes(query))
      );

      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      return {
        success: true,
        data: {
          items,
          total: filtered.length,
          page,
          pageSize,
          totalPages: Math.ceil(filtered.length / pageSize),
        },
      };
    }
  },

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(q: string): Promise<ApiResponse<{ suggestions: string[] }>> {
    return request<{ suggestions: string[] }>(
      `/search/suggestions?q=${encodeURIComponent(q)}`,
      { method: 'GET' }
    );
  },
};
