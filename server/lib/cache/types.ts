/**
 * Cache Abstraction Types
 * For caching frequently accessed data (canvases, users, widgets)
 */

export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Cache tags for invalidation */
  tags?: string[];
}

export interface CacheAdapter {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Delete a key from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Delete multiple keys by pattern
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get multiple values
   */
  getMany<T>(keys: string[]): Promise<Map<string, T | null>>;

  /**
   * Set multiple values
   */
  setMany<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void>;

  /**
   * Invalidate by tag
   */
  invalidateTag(tag: string): Promise<number>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;

  /**
   * Close connection
   */
  close(): Promise<void>;

  /**
   * Get adapter name
   */
  getName(): string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage?: number;
}

export interface CacheConfig {
  adapter: 'local' | 'redis';
  redis?: {
    url: string;
    prefix?: string;
  };
  defaultTTL?: number;
  maxSize?: number;
}

/**
 * Cache key prefixes for different entity types
 */
export const CACHE_KEYS = {
  USER: 'user',
  CANVAS: 'canvas',
  CANVAS_LIST: 'canvas:list',
  WIDGET: 'widget',
  SESSION: 'session',
  RATE_LIMIT: 'rate',
  API_RESPONSE: 'api',
} as const;

/**
 * Helper to build cache keys
 */
export function buildCacheKey(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].join(':');
}

/**
 * Default TTL values (in seconds)
 */
export const DEFAULT_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  SESSION: 86400,      // 24 hours
  PERMANENT: 604800,   // 7 days
} as const;
