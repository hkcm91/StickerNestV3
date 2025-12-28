/**
 * Queue Module
 * Factory pattern for creating job queue adapters
 */

import type { QueueAdapter, QueueConfig } from './types.js';
import { LocalQueueAdapter } from './local-adapter.js';
import { RedisQueueAdapter } from './redis-adapter.js';

export * from './types.js';
export { LocalQueueAdapter } from './local-adapter.js';
export { RedisQueueAdapter } from './redis-adapter.js';

let globalAdapter: QueueAdapter | null = null;

/**
 * Create a queue adapter based on configuration
 */
export async function createQueueAdapter(config: QueueConfig): Promise<QueueAdapter> {
  if ((config.adapter === 'redis' || config.adapter === 'bullmq') && config.redis?.url) {
    const adapter = new RedisQueueAdapter(
      config.redis.url,
      config.redis.prefix,
      config.defaultOptions
    );
    await (adapter as RedisQueueAdapter).connect();
    return adapter;
  }

  // Default to local adapter
  return new LocalQueueAdapter(config.defaultOptions);
}

/**
 * Get or create the global queue adapter
 */
export async function getQueueAdapter(config?: QueueConfig): Promise<QueueAdapter> {
  if (!globalAdapter && config) {
    globalAdapter = await createQueueAdapter(config);
  }

  if (!globalAdapter) {
    // Default to local if no config provided
    globalAdapter = new LocalQueueAdapter();
  }

  return globalAdapter;
}

/**
 * Set the global adapter (useful for testing)
 */
export function setQueueAdapter(adapter: QueueAdapter): void {
  globalAdapter = adapter;
}

/**
 * Close the global adapter
 */
export async function closeQueueAdapter(): Promise<void> {
  if (globalAdapter) {
    await globalAdapter.close();
    globalAdapter = null;
  }
}
