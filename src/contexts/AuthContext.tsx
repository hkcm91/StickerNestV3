/**
 * StickerNest v2 - Auth Context
 * Provides authentication state and methods throughout the app
 * Uses backend JWT auth for API calls, with Supabase for OAuth
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabaseClient, isLocalDevMode } from '../services/supabaseClient';
import { authApi, getAccessToken, clearAuthData, cacheUser, getCachedUser } from '../services/apiClient';
import { IdentityManager } from '../runtime/IdentityManager';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  avatarUrl?: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthError {
  message: string;
}

interface AuthContextValue extends AuthState {
  /** Alias for user - for component compatibility */
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, username?: string, inviteCode?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
  refreshUser: () => Promise<void>;
  isLocalDevMode: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Demo user for local dev mode
const DEMO_USER: UserProfile = {
  id: 'demo-user-123',
  email: 'kimbermaddox@gmail.com',
  username: 'kimbermaddox',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

/**
 * Convert Supabase user to UserProfile
 */
function supabaseUserToProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email || '',
    username: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    role: 'user',
    createdAt: user.created_at,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /**
   * Sync user state with IdentityManager
   */
  const syncIdentity = useCallback((user: UserProfile | null) => {
    if (user) {
      IdentityManager.setUserId(user.id);
      cacheUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: user.avatarUrl,
      });
    } else {
      IdentityManager.setUserId(undefined);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Demo mode flag - set to false for real authentication with API
    // When true, bypasses auth but causes API calls to fail (no token)
    const FORCE_DEMO_MODE = false;

    console.log('[Auth] Initializing, FORCE_DEMO_MODE:', FORCE_DEMO_MODE, 'isLocalDevMode:', isLocalDevMode);

    if (FORCE_DEMO_MODE || isLocalDevMode) {
      // In local dev mode, use demo user
      console.log('[Auth] Setting demo user (forced)');
      setState({
        user: DEMO_USER,
        isLoading: false,
        isAuthenticated: true,
      });
      syncIdentity(DEMO_USER);
      return;
    }

    // Check for existing JWT token first (backend auth)
    const initAuth = async () => {
      try {
        const token = getAccessToken();

        if (token) {
          // We have a token, verify it by calling /auth/me
          const response = await authApi.getCurrentUser();

          if (response.success && response.data?.user) {
            const user: UserProfile = {
              id: response.data.user.id,
              email: response.data.user.email,
              username: response.data.user.username,
              role: response.data.user.role as 'user' | 'admin',
              createdAt: response.data.user.createdAt,
              avatarUrl: response.data.user.avatarUrl,
            };
            setState({
              user,
              isLoading: false,
              isAuthenticated: true,
            });
            syncIdentity(user);
            return;
          } else {
            // Token invalid, clear it
            clearAuthData();
          }
        }

        // No valid JWT token - check for cached user (may have Supabase session)
        const cachedUser = getCachedUser();
        if (cachedUser) {
          // Try to refresh using cached credentials
          // For now, just clear and require re-login
          clearAuthData();
        }

        // Not authenticated
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        syncIdentity(null);
      } catch (err) {
        console.error('[Auth] Init error:', err);
        clearAuthData();
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        syncIdentity(null);
      }
    };

    initAuth();

    // Listen for Supabase auth state changes (for OAuth)
    if (supabaseClient) {
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          console.log('[Auth] Supabase state change:', event, session?.user?.email || 'no user');

          // Handle OAuth sign-in events
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
            // Check if we already have this user in state to avoid unnecessary updates
            const currentUser = getCachedUser();
            if (currentUser?.id === session.user.id) {
              console.log('[Auth] User already authenticated, skipping update');
              return;
            }

            console.log('[Auth] Updating state with Supabase user:', session.user.email);
            const user = supabaseUserToProfile(session.user);
            setState({
              user,
              isLoading: false,
              isAuthenticated: true,
            });
            syncIdentity(user);
          } else if (event === 'SIGNED_OUT') {
            console.log('[Auth] Signed out event received');
            clearAuthData();
            setState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
            });
            syncIdentity(null);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [syncIdentity]);

  // Sign in with email/password using backend API
  const signIn = useCallback(async (email: string, password: string) => {
    if (isLocalDevMode) {
      setState({
        user: DEMO_USER,
        isLoading: false,
        isAuthenticated: true,
      });
      syncIdentity(DEMO_USER);
      return { error: null };
    }

    try {
      const response = await authApi.login(email, password);

      if (!response.success || !response.data) {
        return { error: { message: response.error?.message || 'Login failed' } };
      }

      const user: UserProfile = {
        id: response.data.user.id,
        email: response.data.user.email,
        username: response.data.user.username,
        role: response.data.user.role as 'user' | 'admin',
        createdAt: response.data.user.createdAt,
        avatarUrl: response.data.user.avatarUrl,
      };

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      syncIdentity(user);

      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Login failed' } };
    }
  }, [syncIdentity]);

  // Sign up with email/password using backend API
  const signUp = useCallback(async (
    email: string,
    password: string,
    username?: string,
    inviteCode?: string
  ) => {
    if (isLocalDevMode) {
      setState({
        user: DEMO_USER,
        isLoading: false,
        isAuthenticated: true,
      });
      syncIdentity(DEMO_USER);
      return { error: null };
    }

    try {
      const response = await authApi.register({
        email,
        password,
        username: username || email.split('@')[0],
        inviteCode,
      });

      if (!response.success || !response.data) {
        return { error: { message: response.error?.message || 'Registration failed' } };
      }

      const user: UserProfile = {
        id: response.data.user.id,
        email: response.data.user.email,
        username: response.data.user.username,
        role: response.data.user.role as 'user' | 'admin',
        createdAt: response.data.user.createdAt,
        avatarUrl: response.data.user.avatarUrl,
      };

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      syncIdentity(user);

      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Registration failed' } };
    }
  }, [syncIdentity]);

  // Sign in with OAuth provider (Google, GitHub) using popup to bypass cached sessions
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    if (isLocalDevMode || !supabaseClient) {
      console.log('[Auth] Local dev mode - using demo user');
      setState({
        user: DEMO_USER,
        isLoading: false,
        isAuthenticated: true,
      });
      return { error: null };
    }

    console.log('[Auth] Starting OAuth flow for:', provider);

    // Get the OAuth URL without redirecting
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
        queryParams: provider === 'google' ? {
          prompt: 'select_account',
          access_type: 'offline',
        } : undefined,
      },
    });

    if (error) {
      console.error('[Auth] OAuth error:', error);
      return { error: { message: error.message } };
    }

    if (data?.url) {
      console.log('[Auth] Opening OAuth popup...');
      // Open in popup window - this bypasses cached Google sessions better
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('[Auth] Popup was blocked, falling back to redirect');
        // Fallback to redirect flow
        window.location.href = data.url;
        return { error: null };
      }

      console.log('[Auth] Popup opened, polling for close...');

      // Poll for popup close and check for auth
      let attempts = 0;
      const maxAttempts = 600; // 5 minutes max
      const pollTimer = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          console.warn('[Auth] Popup polling timeout');
          clearInterval(pollTimer);
          return;
        }

        if (popup.closed) {
          clearInterval(pollTimer);
          console.log('[Auth] Popup closed, checking for session...');

          // Small delay to ensure session is persisted
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if we got authenticated
          if (!supabaseClient) return;
          const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

          if (sessionError) {
            console.error('[Auth] Session check error:', sessionError);
            return;
          }

          if (sessionData?.session?.user) {
            console.log('[Auth] Session found after popup close!', sessionData.session.user.email);
            const user = supabaseUserToProfile(sessionData.session.user);
            setState({
              user,
              isLoading: false,
              isAuthenticated: true,
            });
            syncIdentity(user);
          } else {
            console.warn('[Auth] No session found after popup close');
          }
        }
      }, 500);
    }

    return { error: null };
  }, [syncIdentity]);

  // Sign out using backend API
  const signOut = useCallback(async () => {
    if (isLocalDevMode) {
      // In dev mode, actually sign out (clear auth state)
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      // Call backend logout
      await authApi.logout();
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    }

    // Also sign out of Supabase if available (for OAuth sessions)
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.error('[Auth] Supabase logout error:', err);
      }
    }

    // Clear all auth data
    clearAuthData();
    syncIdentity(null);

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [syncIdentity]);

  // Refresh user data from backend
  const refreshUser = useCallback(async () => {
    if (isLocalDevMode) return;

    try {
      const response = await authApi.getCurrentUser();

      if (response.success && response.data?.user) {
        const user: UserProfile = {
          id: response.data.user.id,
          email: response.data.user.email,
          username: response.data.user.username,
          role: response.data.user.role as 'user' | 'admin',
          createdAt: response.data.user.createdAt,
          avatarUrl: response.data.user.avatarUrl,
        };
        setState(prev => ({
          ...prev,
          user,
        }));
        syncIdentity(user);
      }
    } catch (err) {
      console.error('[Auth] Refresh user error:', err);
    }
  }, [syncIdentity]);

  const value: AuthContextValue = {
    ...state,
    profile: state.user, // Alias for compatibility
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    refreshUser,
    isLocalDevMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Legacy compatibility - getCurrentUser function for existing code
export const getCurrentUser = (): UserProfile => {
  if (isLocalDevMode) {
    return DEMO_USER;
  }
  // Try to get from localStorage cache
  try {
    const cached = localStorage.getItem('stickernest:current-user');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return DEMO_USER;
};
