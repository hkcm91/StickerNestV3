/**
 * Cache Adapter Tests
 * Tests for local cache adapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalCacheAdapter } from '../../lib/cache/local-adapter.js';
import { buildCacheKey, CACHE_KEYS, DEFAULT_TTL } from '../../lib/cache/types.js';

describe('LocalCacheAdapter', () => {
  let adapter: LocalCacheAdapter;

  beforeEach(() => {
    adapter = new LocalCacheAdapter({ defaultTTL: 60, maxSize: 100 });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await adapter.set('test-key', { name: 'test', value: 123 });
      const result = await adapter.get<{ name: string; value: number }>('test-key');

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return null for non-existent key', async () => {
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await adapter.set('delete-me', 'value');
      expect(await adapter.exists('delete-me')).toBe(true);

      const deleted = await adapter.delete('delete-me');
      expect(deleted).toBe(true);
      expect(await adapter.exists('delete-me')).toBe(false);
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await adapter.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists', async () => {
      await adapter.set('exists-key', 'value');

      expect(await adapter.exists('exists-key')).toBe(true);
      expect(await adapter.exists('not-exists')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      await adapter.set('expire-key', 'value', { ttl: 1 }); // 1 second

      expect(await adapter.get('expire-key')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(await adapter.get('expire-key')).toBeNull();
    });

    it('should not expire entries with no TTL', async () => {
      await adapter.set('permanent-key', 'value', { ttl: 0 });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(await adapter.get('permanent-key')).toBe('value');
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const results = await adapter.getMany<string>(['key1', 'key2', 'key4']);

      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
      expect(results.get('key4')).toBeNull();
    });

    it('should set multiple values', async () => {
      await adapter.setMany([
        { key: 'batch1', value: 'value1' },
        { key: 'batch2', value: 'value2' },
        { key: 'batch3', value: 'value3' },
      ]);

      expect(await adapter.get('batch1')).toBe('value1');
      expect(await adapter.get('batch2')).toBe('value2');
      expect(await adapter.get('batch3')).toBe('value3');
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching pattern', async () => {
      await adapter.set('user:1:profile', 'profile1');
      await adapter.set('user:1:settings', 'settings1');
      await adapter.set('user:2:profile', 'profile2');
      await adapter.set('canvas:1:data', 'canvas1');

      const deleted = await adapter.deletePattern('user:1:*');

      expect(deleted).toBe(2);
      expect(await adapter.exists('user:1:profile')).toBe(false);
      expect(await adapter.exists('user:1:settings')).toBe(false);
      expect(await adapter.exists('user:2:profile')).toBe(true);
      expect(await adapter.exists('canvas:1:data')).toBe(true);
    });
  });

  describe('Tag-based Invalidation', () => {
    it('should invalidate by tag', async () => {
      await adapter.set('item1', 'value1', { tags: ['group1'] });
      await adapter.set('item2', 'value2', { tags: ['group1'] });
      await adapter.set('item3', 'value3', { tags: ['group2'] });

      const invalidated = await adapter.invalidateTag('group1');

      expect(invalidated).toBe(2);
      expect(await adapter.exists('item1')).toBe(false);
      expect(await adapter.exists('item2')).toBe(false);
      expect(await adapter.exists('item3')).toBe(true);
    });

    it('should support multiple tags per entry', async () => {
      await adapter.set('multi-tag', 'value', { tags: ['tag1', 'tag2'] });

      expect(await adapter.exists('multi-tag')).toBe(true);

      await adapter.invalidateTag('tag1');
      expect(await adapter.exists('multi-tag')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await adapter.set('stat-key', 'value');

      // Generate hits
      await adapter.get('stat-key');
      await adapter.get('stat-key');

      // Generate misses
      await adapter.get('miss1');
      await adapter.get('miss2');
      await adapter.get('miss3');

      const stats = await adapter.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.keys).toBe(1);
    });
  });

  describe('Size Limits', () => {
    it('should evict oldest entries when at max size', async () => {
      const smallAdapter = new LocalCacheAdapter({ maxSize: 3 });

      await smallAdapter.set('first', 'value1');
      await smallAdapter.set('second', 'value2');
      await smallAdapter.set('third', 'value3');

      // This should evict 'first'
      await smallAdapter.set('fourth', 'value4');

      expect(await smallAdapter.exists('first')).toBe(false);
      expect(await smallAdapter.exists('second')).toBe(true);
      expect(await smallAdapter.exists('third')).toBe(true);
      expect(await smallAdapter.exists('fourth')).toBe(true);

      await smallAdapter.close();
    });
  });

  describe('Clear', () => {
    it('should clear all entries', async () => {
      await adapter.set('clear1', 'value1');
      await adapter.set('clear2', 'value2');
      await adapter.set('clear3', 'value3');

      await adapter.clear();

      const stats = await adapter.getStats();
      expect(stats.keys).toBe(0);
      expect(await adapter.exists('clear1')).toBe(false);
    });
  });
});

describe('Cache Key Builders', () => {
  it('should build cache keys with prefix', () => {
    const key = buildCacheKey(CACHE_KEYS.USER, 'usr_123');
    expect(key).toBe('user:usr_123');
  });

  it('should build cache keys with multiple parts', () => {
    const key = buildCacheKey(CACHE_KEYS.CANVAS_LIST, 'usr_123', '1');
    expect(key).toBe('canvas:list:usr_123:1');
  });
});

describe('Default TTL Values', () => {
  it('should have correct default TTL values', () => {
    expect(DEFAULT_TTL.SHORT).toBe(60);
    expect(DEFAULT_TTL.MEDIUM).toBe(300);
    expect(DEFAULT_TTL.LONG).toBe(3600);
    expect(DEFAULT_TTL.SESSION).toBe(86400);
    expect(DEFAULT_TTL.PERMANENT).toBe(604800);
  });
});
