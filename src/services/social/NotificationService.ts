/**
 * StickerNest v2 - Notification Service
 * ======================================
 *
 * Backend service for notification management.
 * Handles fetching, read state, and real-time subscriptions via Supabase.
 *
 * ## Architecture Notes for Future Developers
 *
 * This service integrates with:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                  NOTIFICATION FLOW                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  Database Trigger ──► Supabase Realtime Channel            │
 * │                              │                              │
 * │                              ▼                              │
 * │              NotificationService.subscribeToNotifications() │
 * │                              │                              │
 * │                              ▼                              │
 * │                   useNotificationStore                      │
 * │                              │                              │
 * │                              ▼                              │
 * │                   SocialEventBridge                         │
 * │                              │                              │
 * │                              ▼                              │
 * │                   NotificationWidget (EventBus)             │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Database Schema (notifications table)
 *
 * | Column       | Type      | Description                       |
 * |--------------|-----------|-----------------------------------|
 * | id           | uuid      | Primary key                       |
 * | recipient_id | uuid      | User receiving the notification   |
 * | actor_id     | uuid      | User who triggered (nullable)     |
 * | type         | text      | follow, like, comment, etc.       |
 * | object_type  | text      | widget, canvas, comment, user     |
 * | object_id    | uuid      | ID of the related object          |
 * | message      | text      | Optional custom message           |
 * | metadata     | jsonb     | Additional data                   |
 * | read_at      | timestamp | When marked as read (nullable)    |
 * | created_at   | timestamp | Creation timestamp                |
 *
 * ## Supabase Realtime Setup
 *
 * To enable real-time notifications, ensure Row Level Security (RLS) is configured:
 *
 * ```sql
 * -- Enable realtime for notifications table
 * ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
 *
 * -- RLS policy for recipients
 * CREATE POLICY "Users can see their own notifications"
 *   ON notifications FOR SELECT
 *   USING (auth.uid() = recipient_id);
 * ```
 *
 * @see useNotificationStore - For client-side state management
 * @see SocialEventBridge - For event routing to widgets
 */

import { supabaseClient, isLocalDevMode } from '../supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ==================
// Types
// ==================

/**
 * Notification from the database
 */
export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'fork' | 'system';
  object_type: 'widget' | 'canvas' | 'comment' | 'user' | null;
  object_id: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Notification with joined profile data
 */
export interface NotificationWithProfile extends NotificationRow {
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Callback type for real-time subscription
 */
export type NotificationCallback = (
  payload: RealtimePostgresChangesPayload<NotificationRow>
) => void;

// ==================
// Service State
// ==================

/** Active subscription channel (singleton) */
let activeChannel: RealtimeChannel | null = null;

/** Current user ID for subscription filtering */
let subscribedUserId: string | null = null;

// ==================
// Service Methods
// ==================

export const NotificationService = {
  /**
   * Fetch notifications for the current user
   *
   * @param limit - Maximum number to fetch (default 20)
   * @param offset - Pagination offset (default 0)
   * @returns Array of notifications with profile data
   *
   * @example
   * const notifications = await NotificationService.getNotifications(20, 0);
   */
  async getNotifications(
    limit = 20,
    offset = 0
  ): Promise<NotificationWithProfile[]> {
    if (!supabaseClient) {
      // Return mock data in local dev mode
      if (isLocalDevMode) {
        console.log('[NotificationService] Local dev mode - returning mock data');
        return [];
      }
      return [];
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*, profiles!actor_id(*)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []) as NotificationWithProfile[];
  },

  /**
   * Get unread notification count
   *
   * @returns Number of unread notifications
   */
  async getUnreadCount(): Promise<number> {
    if (!supabaseClient) return 0;

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (error) {
      console.error('[NotificationService] Failed to get unread count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Mark a single notification as read
   *
   * @param notificationId - ID of the notification to mark
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(): Promise<void> {
    if (!supabaseClient) return;

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabaseClient
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (error) throw error;
  },

  /**
   * Delete a notification
   *
   * @param notificationId - ID of the notification to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Subscribe to real-time notification updates
   *
   * NOTE: This creates a Supabase Realtime subscription that listens for
   * INSERT, UPDATE, and DELETE events on the notifications table.
   *
   * ## Implementation Notes for Future Developers
   *
   * 1. The subscription is user-scoped (recipient_id filter)
   * 2. Only one subscription can be active at a time (singleton pattern)
   * 3. Call the returned unsubscribe function to clean up
   * 4. Events are: INSERT (new notification), UPDATE (marked read), DELETE
   *
   * @param callback - Function called when notifications change
   * @returns Unsubscribe function
   *
   * @example
   * const unsubscribe = NotificationService.subscribeToNotifications((payload) => {
   *   if (payload.eventType === 'INSERT') {
   *     // New notification received
   *     console.log('New notification:', payload.new);
   *   }
   * });
   *
   * // Later, when component unmounts:
   * unsubscribe();
   */
  subscribeToNotifications(callback: NotificationCallback): () => void {
    if (!supabaseClient) {
      console.log('[NotificationService] No Supabase client - skipping subscription');
      return () => {};
    }

    // Clean up existing subscription if any
    if (activeChannel) {
      console.log('[NotificationService] Cleaning up existing subscription');
      supabaseClient.removeChannel(activeChannel);
      activeChannel = null;
    }

    // Get current user for filtering
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        console.warn('[NotificationService] No user - cannot subscribe');
        return;
      }

      subscribedUserId = user.id;

      // Create the channel with a unique name
      const channelName = `notifications:${user.id}:${Date.now()}`;

      activeChannel = supabaseClient
        .channel(channelName)
        .on<NotificationRow>(
          'postgres_changes',
          {
            event: '*', // Listen for INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[NotificationService] Realtime event:', payload.eventType);
            callback(payload);
          }
        )
        .subscribe((status) => {
          console.log('[NotificationService] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[NotificationService] Successfully subscribed to notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[NotificationService] Subscription error');
          }
        });
    });

    // Return unsubscribe function
    return () => {
      if (activeChannel && supabaseClient) {
        console.log('[NotificationService] Unsubscribing from notifications');
        supabaseClient.removeChannel(activeChannel);
        activeChannel = null;
        subscribedUserId = null;
      }
    };
  },

  /**
   * Check if currently subscribed to notifications
   */
  isSubscribed(): boolean {
    return activeChannel !== null;
  },

  /**
   * Get the currently subscribed user ID
   */
  getSubscribedUserId(): string | null {
    return subscribedUserId;
  },
};

export default NotificationService;
