/**
 * Pub/Sub Module
 * Factory pattern for creating the appropriate adapter based on configuration
 */

import type { PubSubAdapter, PubSubConfig } from './types.js';
import { LocalPubSubAdapter } from './local-adapter.js';
import { RedisPubSubAdapter } from './redis-adapter.js';

export * from './types.js';
export { LocalPubSubAdapter } from './local-adapter.js';
export { RedisPubSubAdapter } from './redis-adapter.js';

let globalAdapter: PubSubAdapter | null = null;

/**
 * Create a pub/sub adapter based on configuration
 */
export async function createPubSubAdapter(config: PubSubConfig): Promise<PubSubAdapter> {
  if (config.adapter === 'redis' && config.redis?.url) {
    const adapter = new RedisPubSubAdapter(config.redis.url, config.redis.prefix);
    await (adapter as RedisPubSubAdapter).connect();
    return adapter;
  }

  // Default to local adapter
  return new LocalPubSubAdapter();
}

/**
 * Get or create the global pub/sub adapter
 */
export async function getPubSubAdapter(config?: PubSubConfig): Promise<PubSubAdapter> {
  if (!globalAdapter && config) {
    globalAdapter = await createPubSubAdapter(config);
  }

  if (!globalAdapter) {
    // Default to local if no config provided
    globalAdapter = new LocalPubSubAdapter();
  }

  return globalAdapter;
}

/**
 * Set the global adapter (useful for testing)
 */
export function setPubSubAdapter(adapter: PubSubAdapter): void {
  globalAdapter = adapter;
}

/**
 * Close the global adapter
 */
export async function closePubSubAdapter(): Promise<void> {
  if (globalAdapter) {
    await globalAdapter.close();
    globalAdapter = null;
  }
}
