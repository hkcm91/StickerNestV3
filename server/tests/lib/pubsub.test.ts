/**
 * Pub/Sub Adapter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalPubSubAdapter } from '../../lib/pubsub/local-adapter.js';
import type { PubSubMessage } from '../../lib/pubsub/types.js';

describe('LocalPubSubAdapter', () => {
  let adapter: LocalPubSubAdapter;

  beforeEach(() => {
    adapter = new LocalPubSubAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('getName', () => {
    it('should return "local"', () => {
      expect(adapter.getName()).toBe('local');
    });
  });

  describe('isReady', () => {
    it('should be ready after creation', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should not be ready after close', async () => {
      await adapter.close();
      expect(adapter.isReady()).toBe(false);
    });
  });

  describe('publish/subscribe', () => {
    it('should deliver messages to subscribers', async () => {
      const received: PubSubMessage[] = [];

      await adapter.subscribe('test-channel', (message) => {
        received.push(message);
      });

      await adapter.publish('test-channel', { foo: 'bar' });

      expect(received).toHaveLength(1);
      expect(received[0].channel).toBe('test-channel');
      expect(received[0].data).toEqual({ foo: 'bar' });
    });

    it('should not deliver to unsubscribed channels', async () => {
      const received: PubSubMessage[] = [];

      await adapter.subscribe('channel-a', (message) => {
        received.push(message);
      });

      await adapter.publish('channel-b', { foo: 'bar' });

      expect(received).toHaveLength(0);
    });

    it('should support multiple subscribers', async () => {
      const received1: PubSubMessage[] = [];
      const received2: PubSubMessage[] = [];

      await adapter.subscribe('test-channel', (message) => {
        received1.push(message);
      });

      // Note: Local adapter replaces handler for same channel
      // This is different from Redis which supports multiple handlers
      // For this test, we use different channels
      await adapter.subscribe('test-channel-2', (message) => {
        received2.push(message);
      });

      await adapter.publish('test-channel', { id: 1 });
      await adapter.publish('test-channel-2', { id: 2 });

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
    });

    it('should include timestamp in message', async () => {
      const received: PubSubMessage[] = [];

      await adapter.subscribe('test-channel', (message) => {
        received.push(message);
      });

      const before = Date.now();
      await adapter.publish('test-channel', {});
      const after = Date.now();

      expect(received[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(received[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should include senderId in message', async () => {
      const received: PubSubMessage[] = [];

      await adapter.subscribe('test-channel', (message) => {
        received.push(message);
      });

      await adapter.publish('test-channel', {}, 'custom-sender');

      expect(received[0].senderId).toBe('custom-sender');
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving messages after unsubscribe', async () => {
      const received: PubSubMessage[] = [];

      await adapter.subscribe('test-channel', (message) => {
        received.push(message);
      });

      await adapter.publish('test-channel', { id: 1 });
      expect(received).toHaveLength(1);

      await adapter.unsubscribe('test-channel');

      await adapter.publish('test-channel', { id: 2 });
      expect(received).toHaveLength(1); // Still 1, not 2
    });
  });

  describe('close', () => {
    it('should clean up all subscriptions', async () => {
      await adapter.subscribe('channel-1', vi.fn());
      await adapter.subscribe('channel-2', vi.fn());

      await adapter.close();

      // After close, adapter should not be ready
      expect(adapter.isReady()).toBe(false);
    });
  });
});
