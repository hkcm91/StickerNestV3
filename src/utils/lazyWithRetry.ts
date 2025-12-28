/**
 * StickerNest v2 - Lazy Import with Retry
 * Handles chunk loading failures by retrying and auto-refreshing on hash mismatches
 */

import { lazy, ComponentType } from 'react';

interface LazyImportOptions {
  retries?: number;
  retryDelay?: number;
}

const SESSION_STORAGE_KEY = 'sn_chunk_load_retry';

/**
 * Detects if an error is a chunk load failure
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module') ||
    message.includes("cannot find module") ||
    (error.name === 'TypeError' && message.includes('failed to fetch'))
  );
}

/**
 * Checks if we've already attempted a refresh for this session
 */
function hasRefreshedRecently(): boolean {
  try {
    const lastRefresh = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!lastRefresh) return false;

    const timestamp = parseInt(lastRefresh, 10);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return timestamp > fiveMinutesAgo;
  } catch {
    return false;
  }
}

/**
 * Marks that we've attempted a refresh
 */
function markRefreshAttempt(): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, Date.now().toString());
  } catch {
    // Session storage may be unavailable
  }
}

/**
 * Clears the refresh marker (call on successful load)
 */
export function clearRefreshMarker(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Session storage may be unavailable
  }
}

/**
 * Creates a lazy component with automatic retry on chunk load failure
 *
 * @example
 * const GalleryPage = lazyWithRetry(() => import('../pages/GalleryPage'));
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyImportOptions = {}
): React.LazyExoticComponent<T> {
  const { retries = 3, retryDelay = 1000 } = options;

  return lazy(async () => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add cache-busting query param on retries to bypass CDN cache
        if (attempt > 0) {
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

        const module = await importFn();

        // Success! Clear any refresh markers
        clearRefreshMarker();

        return module;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isChunkLoadError(lastError)) {
          // Not a chunk load error, don't retry
          throw lastError;
        }

        console.warn(
          `[StickerNest] Chunk load attempt ${attempt + 1}/${retries + 1} failed:`,
          lastError.message
        );
      }
    }

    // All retries exhausted - try a page refresh if we haven't recently
    if (!hasRefreshedRecently()) {
      console.warn('[StickerNest] All retries exhausted. Attempting page refresh...');
      markRefreshAttempt();
      window.location.reload();
      // Return a never-resolving promise to prevent rendering while refreshing
      return new Promise(() => {});
    }

    // We've already tried refreshing, throw the error to show error UI
    throw lastError || new Error('Failed to load module after retries');
  });
}

/**
 * Variant that handles named exports
 *
 * @example
 * const BusinessCard = lazyWithRetryNamed(
 *   () => import('../pages/BusinessCardPage'),
 *   'BusinessCardPage'
 * );
 */
export function lazyWithRetryNamed<
  T extends ComponentType<unknown>,
  K extends string
>(
  importFn: () => Promise<Record<K, T>>,
  exportName: K,
  options: LazyImportOptions = {}
): React.LazyExoticComponent<T> {
  return lazyWithRetry(
    () => importFn().then(module => ({ default: module[exportName] })),
    options
  );
}

export default lazyWithRetry;
