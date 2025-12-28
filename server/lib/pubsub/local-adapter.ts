/**
 * Local Pub/Sub Adapter
 * For single-server deployments - uses EventEmitter internally
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { PubSubAdapter, PubSubMessage } from './types.js';

export class LocalPubSubAdapter implements PubSubAdapter {
  private emitter: EventEmitter;
  private serverId: string;
  private subscriptions: Map<string, (message: PubSubMessage) => void>;
  private ready: boolean = true;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(1000); // Support many canvas rooms
    this.serverId = uuidv4();
    this.subscriptions = new Map();
  }

  getName(): string {
    return 'local';
  }

  isReady(): boolean {
    return this.ready;
  }

  async publish(channel: string, data: unknown, senderId?: string): Promise<void> {
    const message: PubSubMessage = {
      channel,
      data,
      senderId: senderId || this.serverId,
      timestamp: Date.now(),
    };

    // Emit synchronously for local adapter
    this.emitter.emit(channel, message);
  }

  async subscribe(channel: string, handler: (message: PubSubMessage) => void): Promise<void> {
    this.subscriptions.set(channel, handler);
    this.emitter.on(channel, handler);
  }

  async unsubscribe(channel: string): Promise<void> {
    const handler = this.subscriptions.get(channel);
    if (handler) {
      this.emitter.off(channel, handler);
      this.subscriptions.delete(channel);
    }
  }

  async psubscribe(pattern: string, handler: (message: PubSubMessage) => void): Promise<void> {
    // For local adapter, convert pattern to regex and listen to all events
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

    // Store with pattern as key
    const patternHandler = (_event: string, message: PubSubMessage) => {
      if (regex.test(message.channel)) {
        handler(message);
      }
    };

    this.subscriptions.set(`pattern:${pattern}`, patternHandler as unknown as (message: PubSubMessage) => void);

    // For local, we need to intercept all emits - simplified approach
    // In production with Redis, psubscribe handles this natively
    console.log(`[LocalPubSub] Pattern subscribe: ${pattern} (limited in local mode)`);
  }

  async punsubscribe(pattern: string): Promise<void> {
    this.subscriptions.delete(`pattern:${pattern}`);
  }

  async close(): Promise<void> {
    this.ready = false;
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
  }
}
