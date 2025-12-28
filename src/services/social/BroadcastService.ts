/**
 * StickerNest v2 - Broadcast Service
 * ===================================
 *
 * Service for broadcasting widget state and canvas activity to followers.
 * Uses Supabase Realtime Broadcast for low-latency delivery.
 *
 * ## Architecture Notes
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   BROADCAST FLOW                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  Widget State Change ──► BroadcastService.broadcastState()  │
 * │                                  │                          │
 * │                                  ▼                          │
 * │                    Supabase Broadcast Channel               │
 * │                                  │                          │
 * │                                  ▼                          │
 * │         Followers' BroadcastService.subscribeToBroadcasts() │
 * │                                  │                          │
 * │                                  ▼                          │
 * │                    SocialEventBridge / Widgets              │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Event Types
 *
 * - **widget:state** - Widget state changes (for friend sync)
 * - **canvas:activity** - Canvas-level activities (publish, share)
 * - **user:status** - User status updates (online, busy, away)
 * - **cursor:position** - Real-time cursor for collaboration
 *
 * ## Channel Naming
 *
 * - User broadcasts: `broadcast:user:{userId}`
 * - Canvas broadcasts: `broadcast:canvas:{canvasId}`
 *
 * @see FriendSyncService - Consumes widget:state broadcasts
 * @see useSocialStore - Provides follower list
 */

import { supabaseClient, isLocalDevMode } from '../supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ==================
// Types
// ==================

/**
 * Broadcast event types
 */
export type BroadcastEventType =
  | 'widget:state'
  | 'widget:spawn'
  | 'widget:delete'
  | 'canvas:activity'
  | 'user:status'
  | 'cursor:position';

/**
 * Base broadcast payload
 */
export interface BroadcastPayload {
  type: BroadcastEventType;
  senderId: string;
  senderName?: string;
  timestamp: number;
}

/**
 * Widget state broadcast
 */
export interface WidgetStateBroadcast extends BroadcastPayload {
  type: 'widget:state';
  canvasId: string;
  widgetId: string;
  widgetDefId: string;
  state: Record<string, unknown>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

/**
 * Widget spawn broadcast
 */
export interface WidgetSpawnBroadcast extends BroadcastPayload {
  type: 'widget:spawn';
  canvasId: string;
  widget: {
    id: string;
    widgetDefId: string;
    name: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    state: Record<string, unknown>;
  };
}

/**
 * Widget delete broadcast
 */
export interface WidgetDeleteBroadcast extends BroadcastPayload {
  type: 'widget:delete';
  canvasId: string;
  widgetId: string;
}

/**
 * Canvas activity broadcast
 */
export interface CanvasActivityBroadcast extends BroadcastPayload {
  type: 'canvas:activity';
  canvasId: string;
  canvasName: string;
  activity: 'published' | 'updated' | 'shared' | 'forked';
  thumbnailUrl?: string;
}

/**
 * User status broadcast
 */
export interface UserStatusBroadcast extends BroadcastPayload {
  type: 'user:status';
  status: 'online' | 'away' | 'busy' | 'offline';
  currentCanvasId?: string;
  currentCanvasName?: string;
}

/**
 * Cursor position broadcast
 */
export interface CursorPositionBroadcast extends BroadcastPayload {
  type: 'cursor:position';
  canvasId: string;
  x: number;
  y: number;
  color?: string;
}

/**
 * Union of all broadcast types
 */
export type Broadcast =
  | WidgetStateBroadcast
  | WidgetSpawnBroadcast
  | WidgetDeleteBroadcast
  | CanvasActivityBroadcast
  | UserStatusBroadcast
  | CursorPositionBroadcast;

/**
 * Callback for broadcast events
 */
export type BroadcastCallback = (broadcast: Broadcast) => void;

/**
 * Broadcast options
 */
export interface BroadcastOptions {
  /** Only broadcast to friends (mutual follows) */
  friendsOnly?: boolean;
  /** Include self in broadcast (for testing) */
  includeSelf?: boolean;
}

// ==================
// Service State
// ==================

/** Active broadcast channels by key (user:id or canvas:id) */
const broadcastChannels: Map<string, RealtimeChannel> = new Map();

/** Subscription callbacks by channel key */
const subscriptionCallbacks: Map<string, Set<BroadcastCallback>> = new Map();

/** Current user ID */
let currentUserId: string | null = null;

/** Debounce timers for rate-limiting broadcasts */
const broadcastDebounce: Map<string, NodeJS.Timeout> = new Map();
const BROADCAST_DEBOUNCE_MS = 50; // 50ms debounce for rapid state changes

// ==================
// Service Methods
// ==================

export const BroadcastService = {
  /**
   * Initialize the broadcast service with current user
   *
   * @param userId - Current user's ID
   */
  initialize(userId: string): void {
    currentUserId = userId;
    console.log('[BroadcastService] Initialized for user:', userId);
  },

  /**
   * Broadcast a message to all followers or specific channels
   *
   * @param broadcast - The broadcast payload
   * @param options - Broadcast options
   */
  async broadcast(broadcast: Broadcast, options: BroadcastOptions = {}): Promise<void> {
    if (!supabaseClient || !currentUserId) {
      if (isLocalDevMode) {
        console.log('[BroadcastService] Local dev mode - broadcast simulated:', broadcast.type);
      }
      return;
    }

    // Get or create the user's broadcast channel
    const channelKey = `user:${currentUserId}`;
    let channel = broadcastChannels.get(channelKey);

    if (!channel) {
      const channelName = `broadcast:${channelKey}`;
      channel = supabaseClient.channel(channelName, {
        config: { broadcast: { self: options.includeSelf || false } },
      });
      await channel.subscribe();
      broadcastChannels.set(channelKey, channel);
    }

    // Send the broadcast
    channel.send({
      type: 'broadcast',
      event: broadcast.type,
      payload: broadcast,
    });

    console.log('[BroadcastService] Sent broadcast:', broadcast.type);
  },

  /**
   * Broadcast widget state change (debounced)
   *
   * @param canvasId - Canvas containing the widget
   * @param widgetId - Widget ID
   * @param widgetDefId - Widget definition ID
   * @param state - New widget state
   * @param position - Optional position update
   * @param size - Optional size update
   */
  broadcastWidgetState(
    canvasId: string,
    widgetId: string,
    widgetDefId: string,
    state: Record<string, unknown>,
    position?: { x: number; y: number },
    size?: { width: number; height: number }
  ): void {
    if (!currentUserId) return;

    // Debounce rapid state changes
    const debounceKey = `widget:${widgetId}`;
    const existing = broadcastDebounce.get(debounceKey);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      broadcastDebounce.delete(debounceKey);

      const broadcast: WidgetStateBroadcast = {
        type: 'widget:state',
        senderId: currentUserId!,
        timestamp: Date.now(),
        canvasId,
        widgetId,
        widgetDefId,
        state,
        position,
        size,
      };

      this.broadcast(broadcast);
    }, BROADCAST_DEBOUNCE_MS);

    broadcastDebounce.set(debounceKey, timer);
  },

  /**
   * Broadcast widget spawn event
   *
   * @param canvasId - Canvas where widget was spawned
   * @param widget - Widget data
   */
  broadcastWidgetSpawn(
    canvasId: string,
    widget: WidgetSpawnBroadcast['widget']
  ): void {
    if (!currentUserId) return;

    const broadcast: WidgetSpawnBroadcast = {
      type: 'widget:spawn',
      senderId: currentUserId,
      timestamp: Date.now(),
      canvasId,
      widget,
    };

    this.broadcast(broadcast);
  },

  /**
   * Broadcast widget delete event
   *
   * @param canvasId - Canvas where widget was deleted
   * @param widgetId - Deleted widget ID
   */
  broadcastWidgetDelete(canvasId: string, widgetId: string): void {
    if (!currentUserId) return;

    const broadcast: WidgetDeleteBroadcast = {
      type: 'widget:delete',
      senderId: currentUserId,
      timestamp: Date.now(),
      canvasId,
      widgetId,
    };

    this.broadcast(broadcast);
  },

  /**
   * Broadcast canvas activity (publish, share, etc.)
   *
   * @param canvasId - Canvas ID
   * @param canvasName - Canvas name
   * @param activity - Activity type
   * @param thumbnailUrl - Optional thumbnail
   */
  broadcastCanvasActivity(
    canvasId: string,
    canvasName: string,
    activity: CanvasActivityBroadcast['activity'],
    thumbnailUrl?: string
  ): void {
    if (!currentUserId) return;

    const broadcast: CanvasActivityBroadcast = {
      type: 'canvas:activity',
      senderId: currentUserId,
      timestamp: Date.now(),
      canvasId,
      canvasName,
      activity,
      thumbnailUrl,
    };

    this.broadcast(broadcast);
  },

  /**
   * Broadcast user status update
   *
   * @param status - New status
   * @param currentCanvasId - Current canvas being viewed
   * @param currentCanvasName - Current canvas name
   */
  broadcastUserStatus(
    status: UserStatusBroadcast['status'],
    currentCanvasId?: string,
    currentCanvasName?: string
  ): void {
    if (!currentUserId) return;

    const broadcast: UserStatusBroadcast = {
      type: 'user:status',
      senderId: currentUserId,
      timestamp: Date.now(),
      status,
      currentCanvasId,
      currentCanvasName,
    };

    this.broadcast(broadcast);
  },

  /**
   * Broadcast cursor position (for real-time collaboration)
   *
   * @param canvasId - Canvas ID
   * @param x - X position
   * @param y - Y position
   * @param color - Cursor color
   */
  broadcastCursorPosition(
    canvasId: string,
    x: number,
    y: number,
    color?: string
  ): void {
    if (!currentUserId) return;

    // Heavy debounce for cursor positions
    const debounceKey = `cursor:${currentUserId}`;
    const existing = broadcastDebounce.get(debounceKey);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      broadcastDebounce.delete(debounceKey);

      const broadcast: CursorPositionBroadcast = {
        type: 'cursor:position',
        senderId: currentUserId!,
        timestamp: Date.now(),
        canvasId,
        x,
        y,
        color,
      };

      this.broadcast(broadcast);
    }, 16); // ~60fps max

    broadcastDebounce.set(debounceKey, timer);
  },

  /**
   * Subscribe to broadcasts from a specific user
   *
   * @param userId - User ID to subscribe to
   * @param callback - Function called when broadcasts are received
   * @returns Unsubscribe function
   */
  subscribeToUser(userId: string, callback: BroadcastCallback): () => void {
    if (!supabaseClient) {
      console.log('[BroadcastService] No Supabase client - skipping subscription');
      return () => {};
    }

    const channelKey = `user:${userId}`;
    const channelName = `broadcast:${channelKey}`;

    // Track callback
    if (!subscriptionCallbacks.has(channelKey)) {
      subscriptionCallbacks.set(channelKey, new Set());
    }
    subscriptionCallbacks.get(channelKey)!.add(callback);

    // Get or create channel
    let channel = broadcastChannels.get(channelKey);

    if (!channel) {
      channel = supabaseClient.channel(channelName);

      // Listen for all broadcast event types
      const eventTypes: BroadcastEventType[] = [
        'widget:state',
        'widget:spawn',
        'widget:delete',
        'canvas:activity',
        'user:status',
        'cursor:position',
      ];

      eventTypes.forEach((eventType) => {
        channel!.on('broadcast', { event: eventType }, ({ payload }) => {
          const callbacks = subscriptionCallbacks.get(channelKey);
          callbacks?.forEach((cb) => cb(payload as Broadcast));
        });
      });

      channel.subscribe((status) => {
        console.log(`[BroadcastService] User subscription (${userId}):`, status);
      });

      broadcastChannels.set(channelKey, channel);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = subscriptionCallbacks.get(channelKey);
      callbacks?.delete(callback);

      // If no more callbacks, remove the channel
      if (callbacks?.size === 0) {
        const ch = broadcastChannels.get(channelKey);
        if (ch && supabaseClient) {
          supabaseClient.removeChannel(ch);
          broadcastChannels.delete(channelKey);
          subscriptionCallbacks.delete(channelKey);
        }
      }
    };
  },

  /**
   * Subscribe to broadcasts from multiple users (friends)
   *
   * @param userIds - Array of user IDs to subscribe to
   * @param callback - Function called when broadcasts are received
   * @returns Unsubscribe function
   */
  subscribeToUsers(userIds: string[], callback: BroadcastCallback): () => void {
    const unsubscribers = userIds.map((userId) =>
      this.subscribeToUser(userId, callback)
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  },

  /**
   * Subscribe to canvas-specific broadcasts (for collaboration)
   *
   * @param canvasId - Canvas ID to subscribe to
   * @param callback - Function called when broadcasts are received
   * @returns Unsubscribe function
   */
  subscribeToCanvas(canvasId: string, callback: BroadcastCallback): () => void {
    if (!supabaseClient) {
      return () => {};
    }

    const channelKey = `canvas:${canvasId}`;
    const channelName = `broadcast:${channelKey}`;

    // Track callback
    if (!subscriptionCallbacks.has(channelKey)) {
      subscriptionCallbacks.set(channelKey, new Set());
    }
    subscriptionCallbacks.get(channelKey)!.add(callback);

    // Get or create channel
    let channel = broadcastChannels.get(channelKey);

    if (!channel) {
      channel = supabaseClient.channel(channelName);

      // Canvas broadcasts are mainly cursor and widget state
      ['widget:state', 'widget:spawn', 'widget:delete', 'cursor:position'].forEach(
        (eventType) => {
          channel!.on('broadcast', { event: eventType }, ({ payload }) => {
            const callbacks = subscriptionCallbacks.get(channelKey);
            callbacks?.forEach((cb) => cb(payload as Broadcast));
          });
        }
      );

      channel.subscribe((status) => {
        console.log(`[BroadcastService] Canvas subscription (${canvasId}):`, status);
      });

      broadcastChannels.set(channelKey, channel);
    }

    return () => {
      const callbacks = subscriptionCallbacks.get(channelKey);
      callbacks?.delete(callback);

      if (callbacks?.size === 0) {
        const ch = broadcastChannels.get(channelKey);
        if (ch && supabaseClient) {
          supabaseClient.removeChannel(ch);
          broadcastChannels.delete(channelKey);
          subscriptionCallbacks.delete(channelKey);
        }
      }
    };
  },

  /**
   * Check if subscribed to a user
   */
  isSubscribedToUser(userId: string): boolean {
    return broadcastChannels.has(`user:${userId}`);
  },

  /**
   * Check if subscribed to a canvas
   */
  isSubscribedToCanvas(canvasId: string): boolean {
    return broadcastChannels.has(`canvas:${canvasId}`);
  },

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return currentUserId;
  },

  /**
   * Cleanup all subscriptions and channels
   */
  cleanup(): void {
    if (!supabaseClient) return;

    // Clear all debounce timers
    broadcastDebounce.forEach((timer) => clearTimeout(timer));
    broadcastDebounce.clear();

    // Remove all channels
    broadcastChannels.forEach((channel, key) => {
      supabaseClient.removeChannel(channel);
      console.log(`[BroadcastService] Cleaned up channel: ${key}`);
    });
    broadcastChannels.clear();

    // Clear callbacks
    subscriptionCallbacks.clear();

    currentUserId = null;
    console.log('[BroadcastService] Cleanup complete');
  },
};

export default BroadcastService;
