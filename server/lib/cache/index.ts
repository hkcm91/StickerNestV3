/**
 * Cache Module
 * Factory pattern for creating cache adapters
 */

import type { CacheAdapter, CacheConfig } from './types.js';
import { LocalCacheAdapter } from './local-adapter.js';
import { RedisCacheAdapter } from './redis-adapter.js';

export * from './types.js';
export { LocalCacheAdapter } from './local-adapter.js';
export { RedisCacheAdapter } from './redis-adapter.js';

let globalAdapter: CacheAdapter | null = null;

/**
 * Create a cache adapter based on configuration
 */
export async function createCacheAdapter(config: CacheConfig): Promise<CacheAdapter> {
  if (config.adapter === 'redis' && config.redis?.url) {
    const adapter = new RedisCacheAdapter(
      config.redis.url,
      config.redis.prefix || 'cache',
      config.defaultTTL || 300
    );
    await adapter.connect();
    return adapter;
  }

  // Default to local adapter
  return new LocalCacheAdapter({
    defaultTTL: config.defaultTTL,
    maxSize: config.maxSize,
  });
}

/**
 * Get or create the global cache adapter
 */
export async function getCacheAdapter(config?: CacheConfig): Promise<CacheAdapter> {
  if (!globalAdapter && config) {
    globalAdapter = await createCacheAdapter(config);
  }

  if (!globalAdapter) {
    // Default to local if no config provided
    globalAdapter = new LocalCacheAdapter();
  }

  return globalAdapter;
}

/**
 * Set the global adapter (useful for testing)
 */
export function setCacheAdapter(adapter: CacheAdapter): void {
  globalAdapter = adapter;
}

/**
 * Close the global adapter
 */
export async function closeCacheAdapter(): Promise<void> {
  if (globalAdapter) {
    await globalAdapter.close();
    globalAdapter = null;
  }
}
