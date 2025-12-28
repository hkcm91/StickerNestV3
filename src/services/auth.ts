/**
 * StickerNest v2 - Auth Service
 * Authentication utilities and legacy compatibility layer
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';

export interface UserProfile {
    userId: string;
    email?: string;
    username?: string;
    avatarUrl?: string;
    role: 'user' | 'admin';
}

// Demo user for local dev mode or when not authenticated
const DEMO_USER: UserProfile = {
    userId: 'demo-user-123',
    email: 'kimbermaddox@gmail.com',
    username: 'kimbermaddox',
    role: 'admin'
};

/**
 * Get current user profile
 * This is a synchronous fallback for components that can't use hooks
 * Prefer using useAuth() hook when possible
 */
export const getCurrentUser = (): UserProfile => {
    if (isLocalDevMode || !supabaseClient) {
        return DEMO_USER;
    }

    // Try to get from localStorage cache (set by AuthContext)
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

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    if (isLocalDevMode) {
        return true; // Always "authenticated" in dev mode
    }

    const user = getCurrentUser();
    return user.userId !== DEMO_USER.userId;
};

/**
 * Get the Supabase session token for authenticated API calls
 */
export const getSessionToken = async (): Promise<string | null> => {
    if (isLocalDevMode || !supabaseClient) {
        return null;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.access_token || null;
};

/**
 * Cache user profile to localStorage for synchronous access
 */
export const cacheUserProfile = (profile: UserProfile): void => {
    try {
        localStorage.setItem('stickernest:current-user', JSON.stringify(profile));
    } catch {
        // Ignore storage errors
    }
};

/**
 * Clear cached user profile
 */
export const clearUserCache = (): void => {
    try {
        localStorage.removeItem('stickernest:current-user');
    } catch {
        // Ignore storage errors
    }
};
