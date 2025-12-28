/**
 * StickerNest v2 - API Client
 * Base HTTP client with JWT token management and automatic refresh
 *
 * REFACTORING NOTE (Dec 2024):
 * Extracted from apiClient.ts (2,059 lines) to improve maintainability.
 * This module handles all HTTP communication and authentication.
 */

import type { ApiResponse, UserProfile } from './types';

// =============================================================================
// Configuration
// =============================================================================

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// =============================================================================
// Token Management
// =============================================================================

const TOKEN_STORAGE_KEY = 'stickernest:access_token';
const USER_STORAGE_KEY = 'stickernest:current_user';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Store access token in memory and localStorage
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  return accessToken;
}

/**
 * Clear all auth data including Supabase session
 */
export function clearAuthData(): void {
  accessToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);

  // Clear any Supabase auth keys from localStorage to prevent auto-login
  const localKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      localKeysToRemove.push(key);
    }
  }
  localKeysToRemove.forEach(key => localStorage.removeItem(key));

  // Also clear sessionStorage
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
}

/**
 * Cache user profile
 */
export function cacheUser(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

/**
 * Get cached user profile
 */
export function getCachedUser(): UserProfile | null {
  try {
    const cached = localStorage.getItem(USER_STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// =============================================================================
// Token Utilities
// =============================================================================

/**
 * Check if a JWT token is expired (with 30s buffer)
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 30000; // 30s buffer
  } catch {
    return true;
  }
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<string | null> {
  // Prevent multiple simultaneous refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include HTTP-only refresh token cookie
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        clearAuthData();
        return null;
      }

      const data = await response.json();
      if (data.success && data.accessToken) {
        setAccessToken(data.accessToken);
        return data.accessToken;
      }

      clearAuthData();
      return null;
    } catch {
      clearAuthData();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// =============================================================================
// HTTP Client
// =============================================================================

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  requiresAuth?: boolean;
  skipRefresh?: boolean;
}

/**
 * Make an authenticated API request
 */
export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, requiresAuth = false, skipRefresh = false, ...fetchOptions } = options;

  // Build headers
  const headers = new Headers(fetchOptions.headers);
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Handle authentication
  if (requiresAuth) {
    let token = getAccessToken();

    // Check if token needs refresh
    if (token && isTokenExpired(token) && !skipRefresh) {
      token = await refreshAccessToken();
    }

    if (!token) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Not authenticated',
        },
      };
    }

    headers.set('Authorization', `Bearer ${token}`);
  }

  // Make request
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include', // Always include cookies for refresh token
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 - attempt token refresh once
    if (response.status === 401 && requiresAuth && !skipRefresh) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry with new token
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...fetchOptions,
          credentials: 'include',
          headers,
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        });
        return retryResponse.json();
      }
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Non-JSON response - likely HTML error page or backend not running
      const text = await response.text();
      const isHtml = text.trim().startsWith('<!') || text.trim().startsWith('<html');

      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: isHtml
            ? 'Backend server is not running or unreachable. Please ensure the backend is started on port 3001.'
            : `Server returned non-JSON response (${response.status})`,
        },
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Backend server returned an invalid response. Please ensure the backend is running.',
        },
      };
    }

    // Network errors
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}
