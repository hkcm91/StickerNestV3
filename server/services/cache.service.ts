/**
 * Cache Service
 * High-level caching utilities for application entities
 */

import { getCacheAdapter, CACHE_KEYS, buildCacheKey, DEFAULT_TTL } from '../lib/cache/index.js';
import type { CacheOptions } from '../lib/cache/types.js';
import { log } from '../utils/logger.js';

/**
 * Cache service for entity-level caching
 */
export class CacheService {
  /**
   * Get a user from cache
   */
  async getUser<T>(userId: string): Promise<T | null> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.USER, userId);
    return cache.get<T>(key);
  }

  /**
   * Cache a user
   */
  async setUser<T>(userId: string, user: T, ttl: number = DEFAULT_TTL.MEDIUM): Promise<void> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.USER, userId);
    await cache.set(key, user, { ttl, tags: [`user:${userId}`] });
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const cache = await getCacheAdapter();
    await cache.invalidateTag(`user:${userId}`);
    log.debug(`Invalidated cache for user ${userId}`);
  }

  /**
   * Get a canvas from cache
   */
  async getCanvas<T>(canvasId: string): Promise<T | null> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.CANVAS, canvasId);
    return cache.get<T>(key);
  }

  /**
   * Cache a canvas
   */
  async setCanvas<T>(canvasId: string, canvas: T, ttl: number = DEFAULT_TTL.MEDIUM): Promise<void> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.CANVAS, canvasId);
    await cache.set(key, canvas, { ttl, tags: [`canvas:${canvasId}`] });
  }

  /**
   * Invalidate canvas cache
   */
  async invalidateCanvas(canvasId: string): Promise<void> {
    const cache = await getCacheAdapter();
    await cache.invalidateTag(`canvas:${canvasId}`);
    log.debug(`Invalidated cache for canvas ${canvasId}`);
  }

  /**
   * Get user's canvas list from cache
   */
  async getCanvasList<T>(userId: string, page: number = 1): Promise<T | null> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.CANVAS_LIST, userId, String(page));
    return cache.get<T>(key);
  }

  /**
   * Cache user's canvas list
   */
  async setCanvasList<T>(userId: string, page: number, list: T, ttl: number = DEFAULT_TTL.SHORT): Promise<void> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.CANVAS_LIST, userId, String(page));
    await cache.set(key, list, { ttl, tags: [`user:${userId}:canvases`] });
  }

  /**
   * Invalidate user's canvas list cache
   */
  async invalidateCanvasList(userId: string): Promise<void> {
    const cache = await getCacheAdapter();
    await cache.invalidateTag(`user:${userId}:canvases`);
    log.debug(`Invalidated canvas list cache for user ${userId}`);
  }

  /**
   * Get a widget from cache
   */
  async getWidget<T>(widgetId: string): Promise<T | null> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.WIDGET, widgetId);
    return cache.get<T>(key);
  }

  /**
   * Cache a widget
   */
  async setWidget<T>(widgetId: string, canvasId: string, widget: T, ttl: number = DEFAULT_TTL.MEDIUM): Promise<void> {
    const cache = await getCacheAdapter();
    const key = buildCacheKey(CACHE_KEYS.WIDGET, widgetId);
    await cache.set(key, widget, {
      ttl,
      tags: [`widget:${widgetId}`, `canvas:${canvasId}:widgets`],
    });
  }

  /**
   * Invalidate widget cache
   */
  async invalidateWidget(widgetId: string): Promise<void> {
    const cache = await getCacheAdapter();
    await cache.invalidateTag(`widget:${widgetId}`);
  }

  /**
   * Invalidate all widgets for a canvas
   */
  async invalidateCanvasWidgets(canvasId: string): Promise<void> {
    const cache = await getCacheAdapter();
    await cache.invalidateTag(`canvas:${canvasId}:widgets`);
    log.debug(`Invalidated widget cache for canvas ${canvasId}`);
  }

  /**
   * Generic cache get with callback for cache miss
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cache = await getCacheAdapter();

    // Try cache first
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch and cache
    const value = await fetchFn();
    await cache.set(key, value, options);
    return value;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const cache = await getCacheAdapter();
    return cache.getStats();
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    const cache = await getCacheAdapter();
    await cache.clear();
    log.info('Cache cleared');
  }
}

// Export singleton instance
export const cacheService = new CacheService();
