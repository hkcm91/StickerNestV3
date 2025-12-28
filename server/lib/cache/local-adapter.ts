/**
 * Local In-Memory Cache Adapter
 * For development and single-instance deployments
 */

import type { CacheAdapter, CacheOptions, CacheStats } from './types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  tags: string[];
}

export class LocalCacheAdapter implements CacheAdapter {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private defaultTTL: number;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: { defaultTTL?: number; maxSize?: number } = {}) {
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes default
    this.maxSize = options.maxSize || 10000;

    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.removeFromTagIndex(key, entry.tags);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Evict if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const ttl = options?.ttl ?? this.defaultTTL;
    const tags = options?.tags || [];

    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : null,
      tags,
    };

    // Remove old entry from tag index if updating
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.removeFromTagIndex(key, oldEntry.tags);
    }

    this.cache.set(key, entry);
    this.addToTagIndex(key, tags);
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.removeFromTagIndex(key, entry.tags);
      return this.cache.delete(key);
    }
    return false;
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.delete(key);
        count++;
      }
    }

    return count;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.removeFromTagIndex(key, entry.tags);
      return false;
    }

    return true;
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    for (const key of keys) {
      results.set(key, await this.get<T>(key));
    }

    return results;
  }

  async setMany<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.options);
    }
  }

  async invalidateTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        count++;
      }
    }

    this.tagIndex.delete(tag);
    return count;
  }

  async getStats(): Promise<CacheStats> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    await this.clear();
  }

  getName(): string {
    return 'local';
  }

  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
        this.removeFromTagIndex(key, entry.tags);
      }
    }
  }

  private evictOldest(): void {
    // Simple FIFO eviction - remove first entry
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // String chars are 2 bytes
      size += JSON.stringify(entry.value).length * 2;
      size += 16; // Overhead for entry metadata
    }
    return size;
  }
}
