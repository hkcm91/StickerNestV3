/**
 * StickerNest v2 - API Module
 * Re-exports all API types, client functions, and API endpoints
 *
 * REFACTORING NOTE (Dec 2024):
 * This module provides a clean public API for the split apiClient.
 * Import from here instead of individual files for convenience.
 *
 * Usage:
 * ```ts
 * // Import types and client
 * import { request, ApiResponse, Canvas } from '@/services/api';
 *
 * // Import specific API modules
 * import { authApi, canvasApi } from '@/services/api';
 *
 * // Import combined API object
 * import { api } from '@/services/api';
 * ```
 */

// Re-export all types
export * from './types';

// Re-export client functions
export {
  API_BASE_URL,
  request,
  setAccessToken,
  getAccessToken,
  clearAuthData,
  cacheUser,
  getCachedUser,
  type RequestOptions,
} from './client';

// Re-export API modules
export { authApi } from './auth';
export { canvasApi } from './canvas';
export { marketplaceItemsApi, marketplaceApi } from './marketplace';
export { userApi } from './user';
export {
  followApi,
  profileApi,
  blockApi,
  socialNotificationsApi,
  chatApi,
  feedApi,
  collabApi,
  socialApi,
} from './social';
export type {
  SocialProfile,
  UpdateProfileInput,
  ChatRoom,
  ChatMember,
  ChatMessage,
  ChatAttachment,
  Activity,
  CollaborationRoom,
  CollaborationMember,
} from './social';
export { favoritesApi } from './favorites';
export { notificationsApi } from './notifications';
export { searchApi } from './search';
export { commentsApi } from './comments';
export { collectionsApi } from './collections';
export { templatesApi } from './templates';
export { reviewsApi } from './reviews';
export { verificationApi } from './verification';
export { oauthApi } from './oauth';
export { commerceApi, productsApi, checkoutApi, ordersApi, formsApi, customerAuthApi, creatorCommerceApi } from './commerce';

// Import for combined API object
import { request } from './client';
import type { ApiResponse } from './types';
import { authApi } from './auth';
import { canvasApi } from './canvas';
import { marketplaceItemsApi, marketplaceApi } from './marketplace';
import { userApi } from './user';
import { followApi, profileApi, blockApi, socialNotificationsApi, chatApi, feedApi, collabApi, socialApi } from './social';
import { favoritesApi } from './favorites';
import { notificationsApi } from './notifications';
import { searchApi } from './search';
import { commentsApi } from './comments';
import { collectionsApi } from './collections';
import { templatesApi } from './templates';
import { reviewsApi } from './reviews';
import { verificationApi } from './verification';
import { oauthApi } from './oauth';
import { commerceApi } from './commerce';

/**
 * Generic GET request
 */
async function get<T>(endpoint: string, options?: { requiresAuth?: boolean }): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'GET',
    requiresAuth: options?.requiresAuth,
  });
}

/**
 * Generic POST request
 */
async function post<T>(endpoint: string, body?: unknown, options?: { requiresAuth?: boolean }): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'POST',
    body,
    requiresAuth: options?.requiresAuth ?? true,
  });
}

/**
 * Generic PUT request
 */
async function put<T>(endpoint: string, body?: unknown, options?: { requiresAuth?: boolean }): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'PUT',
    body,
    requiresAuth: options?.requiresAuth ?? true,
  });
}

/**
 * Generic DELETE request
 */
async function del<T>(endpoint: string, options?: { requiresAuth?: boolean }): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'DELETE',
    requiresAuth: options?.requiresAuth ?? true,
  });
}

/**
 * Combined API object with all modules
 */
export const api = {
  // Generic methods for direct HTTP calls
  get,
  post,
  put,
  delete: del,

  // Module-specific APIs
  auth: authApi,
  canvas: canvasApi,
  marketplace: marketplaceApi,           // Legacy widgets-only API
  marketplaceItems: marketplaceItemsApi, // New multi-type marketplace API
  user: userApi,
  // Social layer APIs
  follow: followApi,
  profile: profileApi,
  block: blockApi,
  socialNotifications: socialNotificationsApi,
  chat: chatApi,
  feed: feedApi,
  collab: collabApi,
  social: socialApi,  // Combined social API object
  favorites: favoritesApi,
  notifications: notificationsApi,
  search: searchApi,
  comments: commentsApi,
  collections: collectionsApi,
  templates: templatesApi,
  reviews: reviewsApi,
  verification: verificationApi,
  oauth: oauthApi,
  commerce: commerceApi,
};

export default api;
