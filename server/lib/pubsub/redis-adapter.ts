/**
 * Redis Pub/Sub Adapter
 * For multi-server deployments - uses Redis pub/sub for cross-instance messaging
 */

import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import type { PubSubAdapter, PubSubMessage } from './types.js';

export class RedisPubSubAdapter implements PubSubAdapter {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private serverId: string;
  private prefix: string;
  private handlers: Map<string, (message: PubSubMessage) => void>;
  private ready: boolean = false;

  constructor(redisUrl: string, prefix: string = 'stickernest:pubsub:') {
    this.serverId = uuidv4();
    this.prefix = prefix;
    this.handlers = new Map();

    // Create two separate clients - Redis requires separate connections for pub/sub
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.publisher.on('error', (err: Error) => {
      console.error('[RedisPubSub] Publisher error:', err);
    });

    this.subscriber.on('error', (err: Error) => {
      console.error('[RedisPubSub] Subscriber error:', err);
    });

    this.publisher.on('reconnecting', () => {
      console.log('[RedisPubSub] Publisher reconnecting...');
    });

    this.subscriber.on('reconnecting', () => {
      console.log('[RedisPubSub] Subscriber reconnecting...');
    });
  }

  async connect(): Promise<void> {
    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect(),
    ]);
    this.ready = true;
    console.log(`[RedisPubSub] Connected with server ID: ${this.serverId}`);
  }

  getName(): string {
    return 'redis';
  }

  isReady(): boolean {
    return this.ready;
  }

  private prefixedChannel(channel: string): string {
    return `${this.prefix}${channel}`;
  }

  async publish(channel: string, data: unknown, senderId?: string): Promise<void> {
    if (!this.ready) {
      throw new Error('Redis pub/sub not connected');
    }

    const message: PubSubMessage = {
      channel,
      data,
      senderId: senderId || this.serverId,
      timestamp: Date.now(),
    };

    await this.publisher.publish(
      this.prefixedChannel(channel),
      JSON.stringify(message)
    );
  }

  async subscribe(channel: string, handler: (message: PubSubMessage) => void): Promise<void> {
    if (!this.ready) {
      throw new Error('Redis pub/sub not connected');
    }

    const prefixedChannel = this.prefixedChannel(channel);
    this.handlers.set(channel, handler);

    await this.subscriber.subscribe(prefixedChannel, (messageStr: string) => {
      try {
        const message: PubSubMessage = JSON.parse(messageStr);
        // Don't echo messages from this server instance
        if (message.senderId !== this.serverId) {
          handler(message);
        }
      } catch (error) {
        console.error('[RedisPubSub] Failed to parse message:', error);
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.ready) return;

    const prefixedChannel = this.prefixedChannel(channel);
    this.handlers.delete(channel);
    await this.subscriber.unsubscribe(prefixedChannel);
  }

  async psubscribe(pattern: string, handler: (message: PubSubMessage) => void): Promise<void> {
    if (!this.ready) {
      throw new Error('Redis pub/sub not connected');
    }

    const prefixedPattern = this.prefixedChannel(pattern);
    this.handlers.set(`pattern:${pattern}`, handler);

    await this.subscriber.pSubscribe(prefixedPattern, (messageStr: string, _channel: string) => {
      try {
        const message: PubSubMessage = JSON.parse(messageStr);
        // Don't echo messages from this server instance
        if (message.senderId !== this.serverId) {
          handler(message);
        }
      } catch (error) {
        console.error('[RedisPubSub] Failed to parse pattern message:', error);
      }
    });
  }

  async punsubscribe(pattern: string): Promise<void> {
    if (!this.ready) return;

    const prefixedPattern = this.prefixedChannel(pattern);
    this.handlers.delete(`pattern:${pattern}`);
    await this.subscriber.pUnsubscribe(prefixedPattern);
  }

  async close(): Promise<void> {
    this.ready = false;

    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);

    this.handlers.clear();
    console.log('[RedisPubSub] Closed');
  }

  /**
   * Get the server instance ID (useful for debugging)
   */
  getServerId(): string {
    return this.serverId;
  }
}
