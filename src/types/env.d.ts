/**
 * StickerNest v2 - Environment Variables Type Definitions
 *
 * Provides TypeScript types for Vite environment variables.
 * All custom env vars must be prefixed with VITE_ to be exposed.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Built-in: true in development mode */
  readonly DEV: boolean;

  /** Built-in: true in production mode */
  readonly PROD: boolean;

  /** Built-in: "development" | "production" | "test" */
  readonly MODE: string;

  /** Built-in: Base URL of the app */
  readonly BASE_URL: string;

  /** Backend API base URL (e.g., https://api.stickernest.com) */
  readonly VITE_API_URL?: string;

  /** Supabase project URL */
  readonly VITE_SUPABASE_URL?: string;

  /** Supabase anonymous/public API key */
  readonly VITE_SUPABASE_ANON_KEY?: string;

  /** Enable local development mode (skips authentication) */
  readonly VITE_LOCAL_DEV_MODE?: string;

  /** OAuth callback URL override */
  readonly VITE_OAUTH_CALLBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Environment variable usage examples:
 *
 * @example Check if in development mode
 * ```ts
 * if (import.meta.env.DEV) {
 *   console.log('Running in development mode');
 * }
 * ```
 *
 * @example Get API URL with fallback
 * ```ts
 * const apiUrl = import.meta.env.VITE_API_URL || '/api';
 * ```
 *
 * @example Check local dev mode
 * ```ts
 * const isLocalDev = import.meta.env.VITE_LOCAL_DEV_MODE === 'true';
 * ```
 */
