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
    return request<PaginatedResponse<ExtendedUserProfile>>(
      `/search/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`,
      { method: 'GET' }
    );
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
