/**
 * StickerNest v2 - Notification Store (Zustand)
 * ==============================================
 *
 * State management for the notification system in the social layer.
 * Handles notification fetching, real-time updates, read/unread states, and grouping.
 *
 * ## Architecture Notes for Future Developers
 *
 * Notifications flow through the system like this:
 *
 * ```
 * ┌────────────────────────────────────────────────────────────────┐
 * │                  NOTIFICATION FLOW                             │
 * ├────────────────────────────────────────────────────────────────┤
 * │                                                                │
 * │  Backend Events ──► Supabase Realtime ──► NotificationStore   │
 * │                                              │                 │
 * │                                              ▼                 │
 * │                                      SocialEventBridge         │
 * │                                              │                 │
 * │                                              ▼                 │
 * │                                     NotificationWidget         │
 * │                                     (displays in canvas)       │
 * │                                                                │
 * └────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Notification Types
 *
 * | Type      | Description                          | Priority |
 * |-----------|--------------------------------------|----------|
 * | follow    | Someone followed you                 | normal   |
 * | like      | Someone liked your content           | low      |
 * | comment   | Someone commented on your content    | high     |
 * | mention   | Someone mentioned you                | high     |
 * | fork      | Someone forked your widget/canvas    | normal   |
 * | system    | System announcements                 | varies   |
 *
 * ## Grouping Strategy
 *
 * Similar notifications are grouped to avoid spam:
 * - "5 people liked your widget" instead of 5 separate notifications
 * - Groups are keyed by (type + object_id) within a time window
 *
 * ## Usage
 *
 * ```tsx
 * // In components
 * const {
 *   notifications,
 *   unreadCount,
 *   markAsRead,
 *   markAllAsRead
 * } = useNotificationStore();
 *
 * // Fetch notifications
 * await fetchNotifications();
 *
 * // Mark single as read
 * await markAsRead('notification-123');
 *
 * // Get unread count for badge
 * const count = useUnreadCount();
 * ```
 *
 * @see useSocialStore - For relationship/privacy state
 * @see NotificationService - Backend API for notifications
 * @see SocialEventBridge - For real-time event routing
 */

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { NotificationService } from '../services/social/NotificationService';

// ==================
// Types
// ==================

/**
 * Notification types supported by the system
 */
export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'mention'
  | 'fork'
  | 'system';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Individual notification from the API
 */
export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  object_type: 'widget' | 'canvas' | 'comment' | 'user' | null;
  object_id: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  /** Populated from join with profiles table */
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Grouped notification for UI display
 * Multiple similar notifications are grouped together
 */
export interface NotificationGroup {
  /** Unique group ID */
  id: string;
  /** Type of notifications in this group */
  type: NotificationType;
  /** Object this group relates to (if any) */
  objectType: 'widget' | 'canvas' | 'comment' | 'user' | null;
  objectId: string | null;
  /** Individual notifications in this group */
  notifications: Notification[];
  /** Actors involved (for "X, Y, and 3 others liked...") */
  actors: Array<{
    id: string;
    username: string;
    avatarUrl: string | null;
  }>;
  /** Whether any notification in group is unread */
  isUnread: boolean;
  /** Most recent timestamp */
  latestAt: string;
  /** Count of notifications in group */
  count: number;
}

/**
 * Notification filter options
 */
export interface NotificationFilter {
  types?: NotificationType[];
  unreadOnly?: boolean;
  since?: string;
}

// ==================
// Store State
// ==================

export interface NotificationState {
  /** All fetched notifications */
  notifications: Notification[];

  /** Grouped notifications for UI */
  groups: NotificationGroup[];

  /** Total unread count */
  unreadCount: number;

  /** Set of read notification IDs (for optimistic updates) */
  readIds: Set<string>;

  /** Pagination offset */
  offset: number;

  /** Whether there are more notifications to load */
  hasMore: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;

  /** Last fetch timestamp */
  lastFetchedAt: number | null;

  /** Active filter */
  filter: NotificationFilter;

  /** Whether real-time subscription is active */
  isSubscribed: boolean;

  /** Page size for pagination */
  pageSize: number;
}

// ==================
// Store Actions
// ==================

export interface NotificationActions {
  // === Fetching ===
  /** Fetch notifications (initial load) */
  fetchNotifications: (forceRefresh?: boolean) => Promise<void>;
  /** Load more notifications (pagination) */
  loadMore: () => Promise<void>;
  /** Refresh notifications */
  refresh: () => Promise<void>;

  // === Read State ===
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Check if a notification is read */
  isRead: (notificationId: string) => boolean;

  // === Real-time ===
  /** Add a new notification (from real-time) */
  addNotification: (notification: Notification) => void;
  /** Remove a notification */
  removeNotification: (notificationId: string) => void;
  /** Subscribe to real-time updates */
  subscribe: () => () => void;
  /** Update subscription status */
  setSubscribed: (subscribed: boolean) => void;

  // === Grouping ===
  /** Recalculate notification groups */
  recalculateGroups: () => void;

  // === Filtering ===
  /** Set notification filter */
  setFilter: (filter: NotificationFilter) => void;
  /** Clear filter */
  clearFilter: () => void;

  // === Internal ===
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Reset store */
  reset: () => void;
}

// ==================
// Helper Functions
// ==================

/**
 * Get priority for a notification type
 */
function getNotificationPriority(type: NotificationType): NotificationPriority {
  switch (type) {
    case 'mention':
    case 'comment':
      return 'high';
    case 'follow':
    case 'fork':
      return 'normal';
    case 'like':
      return 'low';
    case 'system':
      return 'normal';
    default:
      return 'normal';
  }
}

/**
 * Generate a group key for a notification
 * Groups are keyed by type + object (within a time window)
 */
function getGroupKey(notification: Notification): string {
  const { type, object_type, object_id } = notification;
  if (object_type && object_id) {
    return `${type}:${object_type}:${object_id}`;
  }
  return `${type}:single:${notification.id}`;
}

/**
 * Group notifications for UI display
 * Groups similar notifications (same type + object) together
 *
 * NOTE: This is a simplified grouping. For production, you might want
 * to add time-window based grouping (e.g., group likes within 1 hour)
 */
function groupNotifications(notifications: Notification[], readIds: Set<string>): NotificationGroup[] {
  const groupMap = new Map<string, Notification[]>();

  // Group by key
  for (const notification of notifications) {
    const key = getGroupKey(notification);
    const existing = groupMap.get(key) || [];
    existing.push(notification);
    groupMap.set(key, existing);
  }

  // Convert to NotificationGroup objects
  const groups: NotificationGroup[] = [];

  for (const [key, notifs] of groupMap) {
    // Sort by most recent first
    notifs.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const first = notifs[0];
    const actors = notifs
      .filter((n) => n.profiles)
      .map((n) => ({
        id: n.actor_id!,
        username: n.profiles!.username,
        avatarUrl: n.profiles!.avatar_url,
      }))
      // Dedupe actors
      .filter((actor, index, self) =>
        index === self.findIndex((a) => a.id === actor.id)
      );

    groups.push({
      id: key,
      type: first.type,
      objectType: first.object_type,
      objectId: first.object_id,
      notifications: notifs,
      actors,
      isUnread: notifs.some((n) => !n.read_at && !readIds.has(n.id)),
      latestAt: first.created_at,
      count: notifs.length,
    });
  }

  // Sort groups by most recent
  groups.sort((a, b) =>
    new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );

  return groups;
}

// ==================
// Initial State
// ==================

const initialState: NotificationState = {
  notifications: [],
  groups: [],
  unreadCount: 0,
  readIds: new Set(),
  offset: 0,
  hasMore: true,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  filter: {},
  isSubscribed: false,
  pageSize: 20,
};

// ==================
// Custom JSON Storage for Sets
// ==================

const jsonReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.__type === 'Set') {
      return new Set(obj.values as unknown[]);
    }
  }
  return value;
};

const jsonReplacer = (_key: string, value: unknown) => {
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value) };
  }
  return value;
};

// ==================
// Store Creation
// ==================

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Fetching
        // ==================

        fetchNotifications: async (forceRefresh = false) => {
          const { lastFetchedAt, isLoading, pageSize } = get();

          // Skip if already loading
          if (isLoading) return;

          // Check cache freshness (1 minute)
          if (!forceRefresh && lastFetchedAt && Date.now() - lastFetchedAt < 60 * 1000) {
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const notifications = await NotificationService.getNotifications(pageSize, 0);

            // Calculate unread count
            const unreadCount = notifications.filter(
              (n: Notification) => !n.read_at
            ).length;

            set((state) => {
              const groups = groupNotifications(notifications, state.readIds);
              return {
                notifications,
                groups,
                unreadCount,
                offset: notifications.length,
                hasMore: notifications.length >= pageSize,
                isLoading: false,
                lastFetchedAt: Date.now(),
              };
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
            const isBackendUnavailable = errorMessage.includes('Backend server') ||
                                         errorMessage.includes('NETWORK_ERROR') ||
                                         errorMessage.includes('fetch');

            if (isBackendUnavailable) {
              console.warn('[useNotificationStore] Backend unavailable, using mock notifications');

              const mockNotifications: Notification[] = [
                {
                  id: 'mock-notif-1',
                  recipient_id: 'demo-user-123',
                  actor_id: 'mock-user-1',
                  type: 'follow',
                  object_type: 'user',
                  object_id: 'demo-user-123',
                  message: 'started following you',
                  metadata: null,
                  read_at: null,
                  created_at: new Date(Date.now() - 1800000).toISOString(),
                  profiles: { id: 'mock-user-1', username: 'alice_demo', avatar_url: null },
                },
                {
                  id: 'mock-notif-2',
                  recipient_id: 'demo-user-123',
                  actor_id: 'mock-user-2',
                  type: 'like',
                  object_type: 'widget',
                  object_id: 'widget-123',
                  message: 'liked your widget',
                  metadata: null,
                  read_at: new Date(Date.now() - 86400000).toISOString(),
                  created_at: new Date(Date.now() - 86400000).toISOString(),
                  profiles: { id: 'mock-user-2', username: 'bob_demo', avatar_url: null },
                },
                {
                  id: 'mock-notif-3',
                  recipient_id: 'demo-user-123',
                  actor_id: null,
                  type: 'system',
                  object_type: null,
                  object_id: null,
                  message: 'Welcome to StickerNest! Start creating widgets.',
                  metadata: null,
                  read_at: new Date(Date.now() - 172800000).toISOString(),
                  created_at: new Date(Date.now() - 172800000).toISOString(),
                  profiles: null,
                },
              ];

              const unreadCount = mockNotifications.filter((n) => !n.read_at).length;

              set((state) => {
                const groups = groupNotifications(mockNotifications, state.readIds);
                return {
                  notifications: mockNotifications,
                  groups,
                  unreadCount,
                  offset: mockNotifications.length,
                  hasMore: false,
                  isLoading: false,
                  lastFetchedAt: Date.now(),
                  error: null,
                };
              });
            } else {
              set({
                isLoading: false,
                error: errorMessage,
              });
            }
          }
        },

        loadMore: async () => {
          const { offset, hasMore, isLoading, pageSize, notifications, readIds } = get();

          // Don't load if already loading or no more
          if (isLoading || !hasMore) return;

          set({ isLoading: true });

          try {
            const newNotifications = await NotificationService.getNotifications(
              pageSize,
              offset
            );

            set((state) => {
              const allNotifications = [...state.notifications, ...newNotifications];
              const groups = groupNotifications(allNotifications, state.readIds);
              return {
                notifications: allNotifications,
                groups,
                offset: state.offset + newNotifications.length,
                hasMore: newNotifications.length >= pageSize,
                isLoading: false,
              };
            });
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to load more',
            });
          }
        },

        refresh: async () => {
          set({ offset: 0, hasMore: true, notifications: [], groups: [] });
          await get().fetchNotifications(true);
        },

        // ==================
        // Read State
        // ==================

        markAsRead: async (notificationId: string) => {
          // Optimistic update
          set((state) => {
            const newReadIds = new Set(state.readIds).add(notificationId);
            const newUnreadCount = Math.max(0, state.unreadCount - 1);
            const groups = groupNotifications(state.notifications, newReadIds);
            return {
              readIds: newReadIds,
              unreadCount: newUnreadCount,
              groups,
            };
          });

          try {
            await NotificationService.markAsRead(notificationId);
          } catch (err) {
            // Rollback on failure
            set((state) => {
              const newReadIds = new Set(state.readIds);
              newReadIds.delete(notificationId);
              const groups = groupNotifications(state.notifications, newReadIds);
              return {
                readIds: newReadIds,
                unreadCount: state.unreadCount + 1,
                groups,
                error: err instanceof Error ? err.message : 'Failed to mark as read',
              };
            });
          }
        },

        markAllAsRead: async () => {
          const { notifications } = get();

          // Optimistic update
          set((state) => {
            const newReadIds = new Set(state.readIds);
            notifications.forEach((n) => newReadIds.add(n.id));
            const groups = groupNotifications(notifications, newReadIds);
            return {
              readIds: newReadIds,
              unreadCount: 0,
              groups,
            };
          });

          try {
            await NotificationService.markAllAsRead();
          } catch (err) {
            // On failure, recalculate from server state
            set({
              error: err instanceof Error ? err.message : 'Failed to mark all as read',
            });
            // Refetch to get accurate state
            await get().fetchNotifications(true);
          }
        },

        isRead: (notificationId: string) => {
          const { notifications, readIds } = get();
          const notification = notifications.find((n) => n.id === notificationId);
          if (!notification) return true;
          return !!notification.read_at || readIds.has(notificationId);
        },

        // ==================
        // Real-time
        // ==================

        addNotification: (notification: Notification) => {
          set((state) => {
            // Check for duplicate
            if (state.notifications.some((n) => n.id === notification.id)) {
              return state;
            }

            const newNotifications = [notification, ...state.notifications];
            const groups = groupNotifications(newNotifications, state.readIds);
            const newUnreadCount = notification.read_at
              ? state.unreadCount
              : state.unreadCount + 1;

            return {
              notifications: newNotifications,
              groups,
              unreadCount: newUnreadCount,
            };
          });
        },

        removeNotification: (notificationId: string) => {
          set((state) => {
            const notification = state.notifications.find((n) => n.id === notificationId);
            const newNotifications = state.notifications.filter(
              (n) => n.id !== notificationId
            );
            const groups = groupNotifications(newNotifications, state.readIds);

            // Adjust unread count if notification was unread
            const wasUnread = notification && !notification.read_at && !state.readIds.has(notificationId);

            return {
              notifications: newNotifications,
              groups,
              unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
            };
          });
        },

        subscribe: () => {
          // Set up real-time subscription
          // This returns an unsubscribe function from NotificationService
          const unsubscribe = NotificationService.subscribeToNotifications((payload: any) => {
            if (payload.eventType === 'INSERT') {
              get().addNotification(payload.new as Notification);
            } else if (payload.eventType === 'DELETE') {
              get().removeNotification(payload.old.id);
            } else if (payload.eventType === 'UPDATE') {
              // Handle read status updates from other devices
              const updated = payload.new as Notification;
              if (updated.read_at) {
                set((state) => {
                  const newReadIds = new Set(state.readIds).add(updated.id);
                  return { readIds: newReadIds };
                });
              }
            }
          });

          set({ isSubscribed: true });

          return () => {
            unsubscribe();
            set({ isSubscribed: false });
          };
        },

        setSubscribed: (isSubscribed: boolean) => {
          set({ isSubscribed });
        },

        // ==================
        // Grouping
        // ==================

        recalculateGroups: () => {
          set((state) => ({
            groups: groupNotifications(state.notifications, state.readIds),
          }));
        },

        // ==================
        // Filtering
        // ==================

        setFilter: (filter: NotificationFilter) => {
          set({ filter });
          // Recalculate groups with filter
          // TODO: Implement filtered grouping
        },

        clearFilter: () => {
          set({ filter: {} });
          get().recalculateGroups();
        },

        // ==================
        // Internal
        // ==================

        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'stickernest-notifications',
        storage: createJSONStorage(() => localStorage, {
          reviver: jsonReviver,
          replacer: jsonReplacer,
        }),
        // Only persist read IDs (notifications should be fetched fresh)
        partialize: (state) => ({
          readIds: state.readIds,
        }),
      }
    ),
    { name: 'NotificationStore', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

/**
 * Get all notification groups (for UI display)
 */
export const useNotificationGroups = () =>
  useNotificationStore(useShallow((state) => state.groups));

/**
 * Get unread notification count (for badge)
 */
export const useUnreadCount = () =>
  useNotificationStore((state) => state.unreadCount);

/**
 * Get unread notifications only
 */
export const useUnreadNotifications = () =>
  useNotificationStore(
    useShallow((state) =>
      state.notifications.filter((n) => !n.read_at && !state.readIds.has(n.id))
    )
  );

/**
 * Get notifications loading state
 */
export const useNotificationsLoading = () =>
  useNotificationStore((state) => state.isLoading);

/**
 * Get notifications error state
 */
export const useNotificationsError = () =>
  useNotificationStore((state) => state.error);

/**
 * Check if there are more notifications to load
 */
export const useHasMoreNotifications = () =>
  useNotificationStore((state) => state.hasMore);

/**
 * Get subscription status
 */
export const useNotificationSubscribed = () =>
  useNotificationStore((state) => state.isSubscribed);

/**
 * Get notifications by type
 */
export const useNotificationsByType = (type: NotificationType) =>
  useNotificationStore(
    useShallow((state) => state.notifications.filter((n) => n.type === type))
  );

export default useNotificationStore;
