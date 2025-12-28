/**
 * Pub/Sub Abstraction Types
 * Allows switching between local (single-server) and Redis (multi-server) pub/sub
 */

export interface PubSubMessage {
  channel: string;
  data: unknown;
  senderId: string;
  timestamp: number;
}

export interface PubSubAdapter {
  /**
   * Publish a message to a channel
   */
  publish(channel: string, data: unknown, senderId?: string): Promise<void>;

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, handler: (message: PubSubMessage) => void): Promise<void>;

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): Promise<void>;

  /**
   * Subscribe to a pattern (e.g., "canvas:*")
   */
  psubscribe?(pattern: string, handler: (message: PubSubMessage) => void): Promise<void>;

  /**
   * Unsubscribe from a pattern
   */
  punsubscribe?(pattern: string): Promise<void>;

  /**
   * Get the adapter name
   */
  getName(): string;

  /**
   * Check if the adapter is connected/ready
   */
  isReady(): boolean;

  /**
   * Graceful shutdown
   */
  close(): Promise<void>;
}

export interface PubSubConfig {
  adapter: 'local' | 'redis';
  redis?: {
    url: string;
    prefix?: string;
  };
}

// Channel naming conventions
export const CHANNELS = {
  canvas: (canvasId: string) => `canvas:${canvasId}`,
  user: (userId: string) => `user:${userId}`,
  broadcast: 'broadcast:all',
  system: 'system:events',
} as const;
