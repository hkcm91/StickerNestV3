/**
 * Redis Cache Adapter
 * For production distributed caching
 */

import { createClient, RedisClientType } from 'redis';
import type { CacheAdapter, CacheOptions, CacheStats } from './types.js';
import { log } from '../../utils/logger.js';

export class RedisCacheAdapter implements CacheAdapter {
  private client: RedisClientType;
  private prefix: string;
  private defaultTTL: number;
  private connected = false;
  private stats = { hits: 0, misses: 0 };

  constructor(url: string, prefix: string = 'cache', defaultTTL: number = 300) {
    this.client = createClient({ url }) as RedisClientType;
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;

    this.client.on('error', (err) => {
      log.error('Redis cache error', err);
    });

    this.client.on('connect', () => {
      log.info('Redis cache connected');
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  private tagKey(tag: string): string {
    return `${this.prefix}:tag:${tag}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(this.key(key));

      if (!data) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      log.error('Cache get error', error as Error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.defaultTTL;
      const tags = options?.tags || [];
      const fullKey = this.key(key);

      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.client.setEx(fullKey, ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      // Add to tag sets for invalidation
      if (tags.length > 0) {
        const multi = this.client.multi();
        for (const tag of tags) {
          multi.sAdd(this.tagKey(tag), fullKey);
          if (ttl > 0) {
            // Set tag expiry slightly longer than the cached value
            multi.expire(this.tagKey(tag), ttl + 60);
          }
        }
        await multi.exec();
      }
    } catch (error) {
      log.error('Cache set error', error as Error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.key(key));
      return result > 0;
    } catch (error) {
      log.error('Cache delete error', error as Error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.key(pattern);
      let count = 0;
      let cursor = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: fullPattern,
          COUNT: 100,
        });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          const deleted = await this.client.del(result.keys);
          count += deleted;
        }
      } while (cursor !== 0);

      return count;
    } catch (error) {
      log.error('Cache deletePattern error', error as Error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.key(key));
      return result > 0;
    } catch (error) {
      log.error('Cache exists error', error as Error);
      return false;
    }
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    if (keys.length === 0) {
      return results;
    }

    try {
      const fullKeys = keys.map((k) => this.key(k));
      const values = await this.client.mGet(fullKeys);

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value) {
          this.stats.hits++;
          results.set(keys[i], JSON.parse(value) as T);
        } else {
          this.stats.misses++;
          results.set(keys[i], null);
        }
      }
    } catch (error) {
      log.error('Cache getMany error', error as Error);
      for (const key of keys) {
        results.set(key, null);
      }
    }

    return results;
  }

  async setMany<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    if (entries.length === 0) return;

    try {
      const multi = this.client.multi();

      for (const entry of entries) {
        const ttl = entry.options?.ttl ?? this.defaultTTL;
        const fullKey = this.key(entry.key);
        const serialized = JSON.stringify(entry.value);

        if (ttl > 0) {
          multi.setEx(fullKey, ttl, serialized);
        } else {
          multi.set(fullKey, serialized);
        }

        // Handle tags
        if (entry.options?.tags) {
          for (const tag of entry.options.tags) {
            multi.sAdd(this.tagKey(tag), fullKey);
            if (ttl > 0) {
              multi.expire(this.tagKey(tag), ttl + 60);
            }
          }
        }
      }

      await multi.exec();
    } catch (error) {
      log.error('Cache setMany error', error as Error);
    }
  }

  async invalidateTag(tag: string): Promise<number> {
    try {
      const tagKeyName = this.tagKey(tag);
      const keys = await this.client.sMembers(tagKeyName);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.client.del([...keys, tagKeyName]);
      return deleted - 1; // Subtract 1 for the tag key itself
    } catch (error) {
      log.error('Cache invalidateTag error', error as Error);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');

      // Parse memory usage from INFO
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : undefined;

      // Parse key count from keyspace info
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const keys = keysMatch ? parseInt(keysMatch[1], 10) : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys,
        memoryUsage,
      };
    } catch (error) {
      log.error('Cache getStats error', error as Error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys: 0,
      };
    }
  }

  async clear(): Promise<void> {
    try {
      // Only clear keys with our prefix
      await this.deletePattern('*');
      this.stats = { hits: 0, misses: 0 };
    } catch (error) {
      log.error('Cache clear error', error as Error);
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  getName(): string {
    return 'redis';
  }
}
