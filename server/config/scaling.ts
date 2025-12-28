/**
 * Horizontal Scaling Configuration
 * Configure adapters for single-server or multi-server deployments
 */

import { env } from './env.js';
import type { PubSubConfig } from '../lib/pubsub/types.js';
import type { QueueConfig } from '../lib/queue/types.js';
import type { CacheConfig } from '../lib/cache/types.js';

/**
 * Scaling mode based on environment
 */
export type ScalingMode = 'local' | 'distributed';

/**
 * Determine scaling mode from environment
 */
export function getScalingMode(): ScalingMode {
  // Check if we're in a distributed environment
  // In production with multiple instances, set SCALING_MODE=distributed
  const mode = process.env.SCALING_MODE?.toLowerCase();

  if (mode === 'distributed' || mode === 'cluster') {
    return 'distributed';
  }

  // Auto-detect: if Redis URL is provided and not localhost, assume distributed
  if (env.REDIS_URL && !env.REDIS_URL.includes('localhost') && !env.REDIS_URL.includes('127.0.0.1')) {
    return 'distributed';
  }

  return 'local';
}

/**
 * Get pub/sub configuration based on scaling mode
 */
export function getPubSubConfig(): PubSubConfig {
  const mode = getScalingMode();

  if (mode === 'distributed' && env.REDIS_URL) {
    return {
      adapter: 'redis',
      redis: {
        url: env.REDIS_URL,
        prefix: 'stickernest:pubsub:',
      },
    };
  }

  return {
    adapter: 'local',
  };
}

/**
 * Get queue configuration based on scaling mode
 */
export function getQueueConfig(): QueueConfig {
  const mode = getScalingMode();

  if (mode === 'distributed' && env.REDIS_URL) {
    return {
      adapter: 'redis',
      redis: {
        url: env.REDIS_URL,
        prefix: 'stickernest:queue:',
      },
      defaultOptions: {
        maxAttempts: 3,
        backoffMs: 1000,
        timeoutMs: 60000, // 1 minute for AI jobs
      },
    };
  }

  return {
    adapter: 'local',
    defaultOptions: {
      maxAttempts: 3,
      backoffMs: 1000,
      timeoutMs: 60000,
    },
  };
}

/**
 * Get cache configuration based on scaling mode
 */
export function getCacheConfig(): CacheConfig {
  const mode = getScalingMode();

  if (mode === 'distributed' && env.REDIS_URL) {
    return {
      adapter: 'redis',
      redis: {
        url: env.REDIS_URL,
        prefix: 'stickernest:cache',
      },
      defaultTTL: 300, // 5 minutes
    };
  }

  return {
    adapter: 'local',
    defaultTTL: 300,
    maxSize: 10000,
  };
}

/**
 * Scaling configuration summary
 */
export interface ScalingConfig {
  mode: ScalingMode;
  pubsub: PubSubConfig;
  queue: QueueConfig;
  cache: CacheConfig;
  features: {
    crossInstanceSync: boolean;
    distributedQueue: boolean;
    distributedCache: boolean;
    sessionReplication: boolean;
  };
}

/**
 * Get full scaling configuration
 */
export function getScalingConfig(): ScalingConfig {
  const mode = getScalingMode();
  const isDistributed = mode === 'distributed';

  return {
    mode,
    pubsub: getPubSubConfig(),
    queue: getQueueConfig(),
    cache: getCacheConfig(),
    features: {
      crossInstanceSync: isDistributed,
      distributedQueue: isDistributed,
      distributedCache: isDistributed,
      sessionReplication: isDistributed,
    },
  };
}

/**
 * Log scaling configuration on startup
 */
export function logScalingConfig(): void {
  const config = getScalingConfig();

  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│         SCALING CONFIGURATION               │');
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Mode:              ${config.mode.padEnd(22)} │`);
  console.log(`│  PubSub Adapter:    ${config.pubsub.adapter.padEnd(22)} │`);
  console.log(`│  Queue Adapter:     ${config.queue.adapter.padEnd(22)} │`);
  console.log(`│  Cache Adapter:     ${config.cache.adapter.padEnd(22)} │`);
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Cross-Instance:    ${(config.features.crossInstanceSync ? 'enabled' : 'disabled').padEnd(22)} │`);
  console.log(`│  Distributed Queue: ${(config.features.distributedQueue ? 'enabled' : 'disabled').padEnd(22)} │`);
  console.log(`│  Distributed Cache: ${(config.features.distributedCache ? 'enabled' : 'disabled').padEnd(22)} │`);
  console.log(`│  Session Replicate: ${(config.features.sessionReplication ? 'enabled' : 'disabled').padEnd(22)} │`);
  console.log('└─────────────────────────────────────────────┘\n');

  if (config.mode === 'local') {
    console.log('ℹ️  Running in local mode. Set SCALING_MODE=distributed for multi-server support.');
  }
}
