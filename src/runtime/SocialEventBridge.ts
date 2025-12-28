/**
 * StickerNest v2 - Social Event Bridge
 * =====================================
 *
 * The bridge between social services/stores and the EventBus.
 * This is the KEY COMPONENT that enables social widgets to receive real-time updates.
 *
 * ## Architecture Notes for Future Developers
 *
 * The SocialEventBridge sits at the center of the social layer architecture:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    DATA SOURCES                                 │
 * ├──────────────────┬───────────────────┬──────────────────────────┤
 * │  Zustand Stores  │  Supabase RT      │  WebSocket               │
 * │  ─────────────   │  ───────────      │  ─────────               │
 * │  useSocialStore  │  Notifications    │  Collaboration events    │
 * │  useFeedStore    │  Activities       │  Presence updates        │
 * │  useNotification │                   │  Chat messages           │
 * └────────┬─────────┴─────────┬─────────┴───────────┬──────────────┘
 *          │                   │                     │
 *          └───────────────────┼─────────────────────┘
 *                              ▼
 *              ┌───────────────────────────────┐
 *              │      SocialEventBridge        │
 *              │                               │
 *              │  • Subscribes to all sources  │
 *              │  • Normalizes event format    │
 *              │  • Emits to EventBus          │
 *              │  • Handles WebSocket events   │
 *              └───────────────┬───────────────┘
 *                              │
 *                              ▼
 *              ┌───────────────────────────────┐
 *              │          EventBus             │
 *              │   (social:* event namespace)  │
 *              └───────────────┬───────────────┘
 *                              │
 *          ┌───────────────────┼───────────────────┐
 *          ▼                   ▼                   ▼
 *    ┌──────────┐       ┌──────────┐       ┌──────────┐
 *    │  Feed    │       │  Comment │       │ Presence │
 *    │  Widget  │       │  Widget  │       │  Widget  │
 *    └──────────┘       └──────────┘       └──────────┘
 * ```
 *
 * ## Event Namespace
 *
 * All social events use the `social:` prefix:
 *
 * | Event                    | Payload                                    |
 * |--------------------------|--------------------------------------------|
 * | social:activity-new      | { activity: FeedActivity }                 |
 * | social:notification-new  | { notification: Notification }             |
 * | social:notification-read | { notificationId: string }                 |
 * | social:comment-new       | { comment: Comment, targetId, targetType } |
 * | social:comment-deleted   | { commentId: string }                      |
 * | social:follow-new        | { followerId, followedId, profile }        |
 * | social:unfollow          | { followerId, followedId }                 |
 * | social:presence-update   | { userId, status, cursor? }                |
 * | social:chat-message      | { roomId, message, sender }                |
 * | social:typing-start      | { roomId, userId }                         |
 * | social:typing-stop       | { roomId, userId }                         |
 *
 * ## Usage
 *
 * The bridge is typically initialized once at app startup:
 *
 * ```tsx
 * // In App.tsx or similar
 * import { SocialEventBridge } from './runtime/SocialEventBridge';
 * import { eventBus } from './runtime/eventBus';
 *
 * // Initialize the bridge
 * const bridge = new SocialEventBridge(eventBus);
 * bridge.initialize();
 *
 * // Clean up on unmount
 * bridge.destroy();
 * ```
 *
 * ## Widget Consumption
 *
 * Widgets listen for these events via the WidgetAPI:
 *
 * ```javascript
 * // In widget code
 * API.on('social:activity-new', (payload) => {
 *   // Add new activity to feed
 *   addActivityToList(payload.activity);
 * });
 * ```
 *
 * @see EventBus - The event system these events are emitted to
 * @see useSocialStore - Social relationship state
 * @see useFeedStore - Activity feed state
 * @see useNotificationStore - Notification state
 */

import { EventBus } from './EventBus';
import { useSocialStore } from '../state/useSocialStore';
import { useFeedStore, type FeedActivity } from '../state/useFeedStore';
import { useNotificationStore, type Notification } from '../state/useNotificationStore';
import { NotificationService } from '../services/social/NotificationService';

// ==================
// Types
// ==================

/**
 * Social event types for the EventBus
 */
export type SocialEventType =
  | 'social:activity-new'
  | 'social:notification-new'
  | 'social:notification-read'
  | 'social:comment-new'
  | 'social:comment-deleted'
  | 'social:comment-liked'
  | 'social:follow-new'
  | 'social:unfollow'
  | 'social:presence-update'
  | 'social:chat-message'
  | 'social:typing-start'
  | 'social:typing-stop'
  | 'social:friends-loaded'
  | 'social:online-status-changed';

/**
 * Payloads for each social event type
 */
export interface SocialEventPayloads {
  'social:activity-new': {
    activity: FeedActivity;
  };
  'social:notification-new': {
    notification: Notification;
  };
  'social:notification-read': {
    notificationId: string;
    allRead?: boolean;
  };
  'social:comment-new': {
    comment: {
      id: string;
      content: string;
      authorId: string;
      authorName: string;
      authorAvatar: string | null;
      createdAt: string;
      parentId: string | null;
    };
    targetId: string;
    targetType: 'widget' | 'canvas';
  };
  'social:comment-deleted': {
    commentId: string;
    targetId: string;
    targetType: 'widget' | 'canvas';
  };
  'social:comment-liked': {
    commentId: string;
    userId: string;
    liked: boolean;
  };
  'social:follow-new': {
    followerId: string;
    followedId: string;
    profile: {
      id: string;
      username: string;
      avatarUrl: string | null;
    };
  };
  'social:unfollow': {
    followerId: string;
    followedId: string;
  };
  'social:presence-update': {
    userId: string;
    status: 'online' | 'away' | 'offline';
    cursor?: { x: number; y: number };
    canvasId?: string;
  };
  'social:chat-message': {
    roomId: string;
    message: {
      id: string;
      content: string;
      senderId: string;
      senderName: string;
      senderAvatar: string | null;
      timestamp: string;
    };
  };
  'social:typing-start': {
    roomId: string;
    userId: string;
    username: string;
  };
  'social:typing-stop': {
    roomId: string;
    userId: string;
  };
  'social:friends-loaded': {
    friendIds: string[];
  };
  'social:online-status-changed': {
    userId: string;
    isOnline: boolean;
  };
}

// ==================
// Bridge Class
// ==================

/**
 * SocialEventBridge - Connects social data sources to EventBus
 *
 * ## Lifecycle
 *
 * 1. Create instance with EventBus reference
 * 2. Call initialize() to set up subscriptions
 * 3. Bridge automatically emits events as data changes
 * 4. Call destroy() to clean up subscriptions
 *
 * ## Notes for Future Developers
 *
 * - The bridge uses Zustand's subscribe API to watch store changes
 * - Supabase realtime events are subscribed via NotificationService
 * - WebSocket events come through the existing TransportManager
 * - All unsubscribe functions are stored for cleanup in destroy()
 */
export class SocialEventBridge {
  private eventBus: EventBus;
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize the bridge and set up all subscriptions
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('[SocialEventBridge] Already initialized');
      return;
    }

    console.log('[SocialEventBridge] Initializing...');

    // 1. Subscribe to notification store changes
    this.subscribeToNotifications();

    // 2. Subscribe to feed store changes
    this.subscribeToFeed();

    // 3. Subscribe to social store changes (follows, online status)
    this.subscribeToSocialState();

    // 4. Set up Supabase realtime for notifications
    this.setupRealtimeNotifications();

    // 5. Listen for existing EventBus events that should be bridged
    this.setupEventBusListeners();

    this.isInitialized = true;
    console.log('[SocialEventBridge] Initialized successfully');
  }

  /**
   * Clean up all subscriptions
   */
  destroy(): void {
    console.log('[SocialEventBridge] Destroying...');

    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe();
      } catch (err) {
        console.error('[SocialEventBridge] Error unsubscribing:', err);
      }
    }

    this.unsubscribers = [];
    this.isInitialized = false;
    console.log('[SocialEventBridge] Destroyed');
  }

  // ==================
  // Subscription Setup
  // ==================

  /**
   * Subscribe to useNotificationStore for notification changes
   */
  private subscribeToNotifications(): void {
    const store = useNotificationStore;

    // Watch for new notifications being added
    let previousNotifications: Notification[] = [];

    const unsubscribe = store.subscribe((state) => {
      const currentNotifications = state.notifications;

      // Find new notifications
      const newNotifications = currentNotifications.filter(
        (n) => !previousNotifications.some((p) => p.id === n.id)
      );

      // Emit events for new notifications
      for (const notification of newNotifications) {
        this.emitSocialEvent('social:notification-new', { notification });
      }

      previousNotifications = currentNotifications;
    });

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Subscribe to useFeedStore for activity feed changes
   */
  private subscribeToFeed(): void {
    const store = useFeedStore;

    // Track seen activity IDs to detect new ones
    let seenActivityIds = new Set<string>();

    const unsubscribe = store.subscribe((state) => {
      // Check all cached feeds for new activities
      for (const [, entry] of state.feedCache) {
        for (const activity of entry.activities) {
          if (!seenActivityIds.has(activity.id)) {
            seenActivityIds.add(activity.id);
            // Only emit for truly new activities (not initial load)
            if (seenActivityIds.size > entry.activities.length) {
              this.emitSocialEvent('social:activity-new', { activity });
            }
          }
        }
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Subscribe to useSocialStore for relationship/online status changes
   */
  private subscribeToSocialState(): void {
    const store = useSocialStore;

    // Track previous state for change detection
    let previousOnline = new Set<string>();
    let previousFollowing = new Set<string>();

    const unsubscribe = store.subscribe((state) => {
      // Detect online status changes
      for (const userId of state.onlineFriends) {
        if (!previousOnline.has(userId)) {
          this.emitSocialEvent('social:online-status-changed', {
            userId,
            isOnline: true,
          });
        }
      }

      for (const userId of previousOnline) {
        if (!state.onlineFriends.has(userId)) {
          this.emitSocialEvent('social:online-status-changed', {
            userId,
            isOnline: false,
          });
        }
      }

      // Detect follow changes
      for (const userId of state.following) {
        if (!previousFollowing.has(userId)) {
          // New follow - get cached profile if available
          const profile = state.profileCache.get(userId);
          this.emitSocialEvent('social:follow-new', {
            followerId: state.currentUserId || '',
            followedId: userId,
            profile: profile
              ? {
                  id: profile.id,
                  username: profile.username,
                  avatarUrl: profile.avatarUrl,
                }
              : { id: userId, username: 'Unknown', avatarUrl: null },
          });
        }
      }

      for (const userId of previousFollowing) {
        if (!state.following.has(userId)) {
          this.emitSocialEvent('social:unfollow', {
            followerId: state.currentUserId || '',
            followedId: userId,
          });
        }
      }

      previousOnline = new Set(state.onlineFriends);
      previousFollowing = new Set(state.following);
    });

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Set up Supabase realtime subscription for notifications
   */
  private setupRealtimeNotifications(): void {
    const unsubscribe = NotificationService.subscribeToNotifications((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        // New notification from database
        const notification = payload.new as unknown as Notification;

        // Also add to store (which will trigger the store subscription)
        useNotificationStore.getState().addNotification(notification);
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        // Notification updated (e.g., marked as read)
        const updated = payload.new;
        if (updated.read_at) {
          this.emitSocialEvent('social:notification-read', {
            notificationId: updated.id,
          });
        }
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Listen for existing EventBus events and re-emit as social events
   *
   * NOTE: This bridges events from other parts of the system
   * (like SocialManager) into the social: namespace
   */
  private setupEventBusListeners(): void {
    // Bridge social:friends-loaded from SocialManager
    const unsubFriends = this.eventBus.on('social:friends-loaded', (event) => {
      // Already in correct format, just ensure widgets receive it
      // No re-emit needed since it's already on EventBus
    });
    this.unsubscribers.push(unsubFriends);

    // Bridge presence updates
    const unsubPresence = this.eventBus.on('presence:user-joined', (event) => {
      this.emitSocialEvent('social:presence-update', {
        userId: event.payload.userId,
        status: 'online',
        canvasId: event.payload.canvasId,
      });
    });
    this.unsubscribers.push(unsubPresence);

    const unsubPresenceLeft = this.eventBus.on('presence:user-left', (event) => {
      this.emitSocialEvent('social:presence-update', {
        userId: event.payload.userId,
        status: 'offline',
        canvasId: event.payload.canvasId,
      });
    });
    this.unsubscribers.push(unsubPresenceLeft);
  }

  // ==================
  // Event Emission
  // ==================

  /**
   * Emit a social event to the EventBus
   */
  private emitSocialEvent<T extends SocialEventType>(
    type: T,
    payload: SocialEventPayloads[T]
  ): void {
    this.eventBus.emit({
      type,
      scope: 'global',
      payload,
      timestamp: Date.now(),
    });
  }

  // ==================
  // Public API
  // ==================

  /**
   * Manually emit a comment event
   * Call this when a comment is added via UI
   */
  emitCommentNew(
    comment: SocialEventPayloads['social:comment-new']['comment'],
    targetId: string,
    targetType: 'widget' | 'canvas'
  ): void {
    this.emitSocialEvent('social:comment-new', {
      comment,
      targetId,
      targetType,
    });
  }

  /**
   * Manually emit a comment deleted event
   */
  emitCommentDeleted(
    commentId: string,
    targetId: string,
    targetType: 'widget' | 'canvas'
  ): void {
    this.emitSocialEvent('social:comment-deleted', {
      commentId,
      targetId,
      targetType,
    });
  }

  /**
   * Manually emit a comment liked event
   */
  emitCommentLiked(commentId: string, userId: string, liked: boolean): void {
    this.emitSocialEvent('social:comment-liked', {
      commentId,
      userId,
      liked,
    });
  }

  /**
   * Manually emit a chat message event
   * Call this when a chat message is sent
   */
  emitChatMessage(
    roomId: string,
    message: SocialEventPayloads['social:chat-message']['message']
  ): void {
    this.emitSocialEvent('social:chat-message', {
      roomId,
      message,
    });
  }

  /**
   * Manually emit typing start event
   */
  emitTypingStart(roomId: string, userId: string, username: string): void {
    this.emitSocialEvent('social:typing-start', {
      roomId,
      userId,
      username,
    });
  }

  /**
   * Manually emit typing stop event
   */
  emitTypingStop(roomId: string, userId: string): void {
    this.emitSocialEvent('social:typing-stop', {
      roomId,
      userId,
    });
  }

  /**
   * Check if bridge is initialized
   */
  isActive(): boolean {
    return this.isInitialized;
  }
}

// ==================
// Singleton Export
// ==================

/**
 * Create a singleton instance of SocialEventBridge
 *
 * ## Usage
 *
 * ```tsx
 * import { createSocialEventBridge } from './runtime/SocialEventBridge';
 * import { eventBus } from './runtime/eventBus';
 *
 * const bridge = createSocialEventBridge(eventBus);
 * bridge.initialize();
 * ```
 */
let bridgeInstance: SocialEventBridge | null = null;

export function createSocialEventBridge(eventBus: EventBus): SocialEventBridge {
  if (!bridgeInstance) {
    bridgeInstance = new SocialEventBridge(eventBus);
  }
  return bridgeInstance;
}

export function getSocialEventBridge(): SocialEventBridge | null {
  return bridgeInstance;
}

export default SocialEventBridge;
