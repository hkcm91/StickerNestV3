/**
 * StickerNest v2 - Feed Store (Zustand)
 * ======================================
 *
 * State management for the activity feed in the social layer.
 * Handles caching, pagination, optimistic updates, and real-time additions.
 *
 * ## Architecture Notes for Future Developers
 *
 * The feed system supports multiple feed types:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    FEED TYPES                               │
 * ├─────────────────────────────────────────────────────────────┤
 * │  'global'  │ All public activity across the platform        │
 * │  'user'    │ Activity from a specific user                  │
 * │  'friends' │ Activity from users you follow                 │
 * │  'canvas'  │ Activity related to a specific canvas          │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Caching Strategy
 *
 * Each feed type has its own cache keyed by feedId (feedType or feedType:userId):
 *
 * ```
 * feedCache: Map<feedId, {
 *   activities: Activity[],
 *   offset: number,
 *   hasMore: boolean,
 *   lastFetchedAt: number
 * }>
 * ```
 *
 * ## Real-time Updates
 *
 * When new activities arrive via EventBus (social:activity-posted):
 * 1. Activity is prepended to relevant feeds
 * 2. If activity is from a muted user, it's filtered out
 * 3. Duplicate detection prevents showing same activity twice
 *
 * ## Usage
 *
 * ```tsx
 * // In components
 * const { fetchFeed, activities, isLoading } = useFeedStore();
 *
 * // Fetch global feed
 * await fetchFeed('global');
 *
 * // Get activities for a feed
 * const globalActivities = useActivitiesForFeed('global');
 *
 * // Load more (infinite scroll)
 * await loadMore('global');
 * ```
 *
 * @see useSocialStore - For relationship/privacy state
 * @see FeedService - Backend API for feeds
 * @see SocialEventBridge - For real-time event routing
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { FeedService, Activity } from '../services/social/FeedService';
import { useSocialStore } from './useSocialStore';

// ==================
// Types
// ==================

/**
 * Feed types supported by the system
 */
export type FeedType = 'global' | 'user' | 'friends' | 'canvas';

/**
 * Activity with full profile data (as returned from API)
 */
export interface FeedActivity {
  id: string;
  actor_id: string;
  verb: 'published' | 'forked' | 'liked' | 'commented';
  object_type: 'widget' | 'canvas' | 'user';
  object_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  /** Populated from join with profiles table */
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Cache entry for a specific feed
 */
export interface FeedCacheEntry {
  /** Cached activities */
  activities: FeedActivity[];
  /** Current pagination offset */
  offset: number;
  /** Whether there are more activities to load */
  hasMore: boolean;
  /** Timestamp of last fetch */
  lastFetchedAt: number;
  /** Whether this feed is currently loading */
  isLoading: boolean;
}

/**
 * Generates a cache key for a feed
 * @param feedType The type of feed
 * @param targetId Optional target ID (user ID or canvas ID)
 */
export function getFeedCacheKey(feedType: FeedType, targetId?: string): string {
  if (targetId) {
    return `${feedType}:${targetId}`;
  }
  return feedType;
}

// ==================
// Store State
// ==================

export interface FeedState {
  /** Cache of feed data by feed key */
  feedCache: Map<string, FeedCacheEntry>;

  /** Currently active feed key (for UI) */
  activeFeedKey: string | null;

  /** Set of activity IDs that have been seen (for duplicate detection) */
  seenActivityIds: Set<string>;

  /** Global loading state */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;

  /** Default page size for pagination */
  pageSize: number;
}

// ==================
// Store Actions
// ==================

export interface FeedActions {
  // === Feed Fetching ===
  /** Fetch a feed (initial load) */
  fetchFeed: (feedType: FeedType, targetId?: string, forceRefresh?: boolean) => Promise<void>;
  /** Load more activities (pagination) */
  loadMore: (feedType: FeedType, targetId?: string) => Promise<void>;
  /** Refresh a feed (pull-to-refresh) */
  refreshFeed: (feedType: FeedType, targetId?: string) => Promise<void>;

  // === Real-time Updates ===
  /** Prepend a new activity to relevant feeds */
  prependActivity: (activity: FeedActivity) => void;
  /** Remove an activity (e.g., if deleted) */
  removeActivity: (activityId: string) => void;

  // === Cache Management ===
  /** Get cache entry for a feed */
  getCacheEntry: (feedKey: string) => FeedCacheEntry | undefined;
  /** Clear cache for a specific feed */
  clearFeed: (feedKey: string) => void;
  /** Clear all feed caches */
  clearAllFeeds: () => void;
  /** Check if cache is stale */
  isCacheStale: (feedKey: string, maxAgeMs?: number) => boolean;

  // === UI State ===
  /** Set the active feed key */
  setActiveFeed: (feedKey: string | null) => void;
  /** Set page size */
  setPageSize: (size: number) => void;

  // === Internal ===
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Reset store */
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: FeedState = {
  feedCache: new Map(),
  activeFeedKey: null,
  seenActivityIds: new Set(),
  isLoading: false,
  error: null,
  pageSize: 20,
};

// ==================
// Store Creation
// ==================

export const useFeedStore = create<FeedState & FeedActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Feed Fetching
      // ==================

      fetchFeed: async (feedType: FeedType, targetId?: string, forceRefresh = false) => {
        const feedKey = getFeedCacheKey(feedType, targetId);
        const { feedCache, pageSize } = get();

        // Check cache freshness (5 minutes default)
        if (!forceRefresh && !get().isCacheStale(feedKey, 5 * 60 * 1000)) {
          const cached = feedCache.get(feedKey);
          if (cached && cached.activities.length > 0) {
            // Use cached data
            return;
          }
        }

        // Update loading state for this specific feed
        set((state) => {
          const newCache = new Map(state.feedCache);
          const existing = newCache.get(feedKey) || {
            activities: [],
            offset: 0,
            hasMore: true,
            lastFetchedAt: 0,
            isLoading: true,
          };
          newCache.set(feedKey, { ...existing, isLoading: true });
          return { feedCache: newCache, error: null };
        });

        try {
          let activities: FeedActivity[];

          // Fetch based on feed type
          switch (feedType) {
            case 'global':
              activities = await FeedService.getGlobalFeed(pageSize, 0);
              break;
            case 'user':
              if (!targetId) throw new Error('User ID required for user feed');
              activities = await FeedService.getUserFeed(targetId, pageSize, 0);
              break;
            case 'friends':
              activities = await FeedService.getFriendsFeed(pageSize, 0);
              break;
            case 'canvas':
              if (!targetId) throw new Error('Canvas ID required for canvas feed');
              activities = await FeedService.getCanvasFeed(targetId, pageSize, 0);
              break;
            default:
              activities = [];
          }

          // Update cache
          set((state) => {
            const newCache = new Map(state.feedCache);
            const seenIds = new Set(state.seenActivityIds);

            // Track seen activity IDs
            activities.forEach((a) => seenIds.add(a.id));

            newCache.set(feedKey, {
              activities,
              offset: activities.length,
              hasMore: activities.length >= pageSize,
              lastFetchedAt: Date.now(),
              isLoading: false,
            });

            return { feedCache: newCache, seenActivityIds: seenIds };
          });
        } catch (err) {
          set((state) => {
            const newCache = new Map(state.feedCache);
            const existing = newCache.get(feedKey);
            if (existing) {
              newCache.set(feedKey, { ...existing, isLoading: false });
            }
            return {
              feedCache: newCache,
              error: err instanceof Error ? err.message : 'Failed to fetch feed',
            };
          });
        }
      },

      loadMore: async (feedType: FeedType, targetId?: string) => {
        const feedKey = getFeedCacheKey(feedType, targetId);
        const { feedCache, pageSize } = get();
        const cacheEntry = feedCache.get(feedKey);

        // Don't load if already loading or no more data
        if (!cacheEntry || cacheEntry.isLoading || !cacheEntry.hasMore) {
          return;
        }

        // Update loading state
        set((state) => {
          const newCache = new Map(state.feedCache);
          newCache.set(feedKey, { ...cacheEntry, isLoading: true });
          return { feedCache: newCache };
        });

        try {
          let newActivities: FeedActivity[];
          const offset = cacheEntry.offset;

          switch (feedType) {
            case 'global':
              newActivities = await FeedService.getGlobalFeed(pageSize, offset);
              break;
            case 'user':
              if (!targetId) throw new Error('User ID required for user feed');
              newActivities = await FeedService.getUserFeed(targetId, pageSize, offset);
              break;
            case 'friends':
              newActivities = await FeedService.getFriendsFeed(pageSize, offset);
              break;
            case 'canvas':
              if (!targetId) throw new Error('Canvas ID required for canvas feed');
              newActivities = await FeedService.getCanvasFeed(targetId, pageSize, offset);
              break;
            default:
              newActivities = [];
          }

          // Append to cache
          set((state) => {
            const newCache = new Map(state.feedCache);
            const existing = newCache.get(feedKey)!;
            const seenIds = new Set(state.seenActivityIds);

            // Filter duplicates and track new IDs
            const uniqueActivities = newActivities.filter((a) => !seenIds.has(a.id));
            uniqueActivities.forEach((a) => seenIds.add(a.id));

            newCache.set(feedKey, {
              activities: [...existing.activities, ...uniqueActivities],
              offset: existing.offset + uniqueActivities.length,
              hasMore: newActivities.length >= pageSize,
              lastFetchedAt: Date.now(),
              isLoading: false,
            });

            return { feedCache: newCache, seenActivityIds: seenIds };
          });
        } catch (err) {
          set((state) => {
            const newCache = new Map(state.feedCache);
            const existing = newCache.get(feedKey);
            if (existing) {
              newCache.set(feedKey, { ...existing, isLoading: false });
            }
            return {
              feedCache: newCache,
              error: err instanceof Error ? err.message : 'Failed to load more',
            };
          });
        }
      },

      refreshFeed: async (feedType: FeedType, targetId?: string) => {
        // Force refresh clears and refetches
        const feedKey = getFeedCacheKey(feedType, targetId);

        set((state) => {
          const newCache = new Map(state.feedCache);
          newCache.delete(feedKey);
          return { feedCache: newCache };
        });

        await get().fetchFeed(feedType, targetId, true);
      },

      // ==================
      // Real-time Updates
      // ==================

      prependActivity: (activity: FeedActivity) => {
        const { seenActivityIds, feedCache } = get();

        // Skip duplicates
        if (seenActivityIds.has(activity.id)) {
          return;
        }

        // Check if actor is someone we follow (for friends feed)
        const socialState = useSocialStore.getState();
        const isActorFollowed = socialState.following.has(activity.actor_id);

        set((state) => {
          const newCache = new Map(state.feedCache);
          const seenIds = new Set(state.seenActivityIds);
          seenIds.add(activity.id);

          // Add to global feed
          const globalEntry = newCache.get('global');
          if (globalEntry) {
            newCache.set('global', {
              ...globalEntry,
              activities: [activity, ...globalEntry.activities],
              offset: globalEntry.offset + 1,
            });
          }

          // Add to user's personal feed
          const userFeedKey = `user:${activity.actor_id}`;
          const userEntry = newCache.get(userFeedKey);
          if (userEntry) {
            newCache.set(userFeedKey, {
              ...userEntry,
              activities: [activity, ...userEntry.activities],
              offset: userEntry.offset + 1,
            });
          }

          // Add to friends feed if actor is followed
          if (isActorFollowed) {
            const friendsEntry = newCache.get('friends');
            if (friendsEntry) {
              newCache.set('friends', {
                ...friendsEntry,
                activities: [activity, ...friendsEntry.activities],
                offset: friendsEntry.offset + 1,
              });
            }
          }

          // Add to canvas-specific feed if activity is about a canvas
          if (activity.object_type === 'canvas' && activity.object_id) {
            const canvasFeedKey = `canvas:${activity.object_id}`;
            const canvasEntry = newCache.get(canvasFeedKey);
            if (canvasEntry) {
              newCache.set(canvasFeedKey, {
                ...canvasEntry,
                activities: [activity, ...canvasEntry.activities],
                offset: canvasEntry.offset + 1,
              });
            }
          }

          return { feedCache: newCache, seenActivityIds: seenIds };
        });
      },

      removeActivity: (activityId: string) => {
        set((state) => {
          const newCache = new Map(state.feedCache);

          // Remove from all feeds
          for (const [key, entry] of newCache) {
            const filtered = entry.activities.filter((a) => a.id !== activityId);
            if (filtered.length !== entry.activities.length) {
              newCache.set(key, {
                ...entry,
                activities: filtered,
                offset: entry.offset - 1,
              });
            }
          }

          const seenIds = new Set(state.seenActivityIds);
          seenIds.delete(activityId);

          return { feedCache: newCache, seenActivityIds: seenIds };
        });
      },

      // ==================
      // Cache Management
      // ==================

      getCacheEntry: (feedKey: string) => {
        return get().feedCache.get(feedKey);
      },

      clearFeed: (feedKey: string) => {
        set((state) => {
          const newCache = new Map(state.feedCache);
          newCache.delete(feedKey);
          return { feedCache: newCache };
        });
      },

      clearAllFeeds: () => {
        set({
          feedCache: new Map(),
          seenActivityIds: new Set(),
        });
      },

      isCacheStale: (feedKey: string, maxAgeMs = 5 * 60 * 1000) => {
        const entry = get().feedCache.get(feedKey);
        if (!entry) return true;
        return Date.now() - entry.lastFetchedAt > maxAgeMs;
      },

      // ==================
      // UI State
      // ==================

      setActiveFeed: (feedKey: string | null) => {
        set({ activeFeedKey: feedKey });
      },

      setPageSize: (size: number) => {
        set({ pageSize: Math.max(1, Math.min(100, size)) });
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
    { name: 'FeedStore', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

/**
 * Get activities for a specific feed
 *
 * @example
 * const activities = useActivitiesForFeed('global');
 * const userActivities = useActivitiesForFeed('user', 'user-123');
 */
export const useActivitiesForFeed = (feedType: FeedType, targetId?: string) => {
  const feedKey = getFeedCacheKey(feedType, targetId);
  return useFeedStore(
    useShallow((state) => state.feedCache.get(feedKey)?.activities || [])
  );
};

/**
 * Get loading state for a specific feed
 */
export const useFeedLoading = (feedType: FeedType, targetId?: string) => {
  const feedKey = getFeedCacheKey(feedType, targetId);
  return useFeedStore((state) => state.feedCache.get(feedKey)?.isLoading || false);
};

/**
 * Get hasMore state for a specific feed
 */
export const useFeedHasMore = (feedType: FeedType, targetId?: string) => {
  const feedKey = getFeedCacheKey(feedType, targetId);
  return useFeedStore((state) => state.feedCache.get(feedKey)?.hasMore ?? true);
};

/**
 * Get the active feed activities
 */
export const useActiveFeedActivities = () =>
  useFeedStore(
    useShallow((state) => {
      if (!state.activeFeedKey) return [];
      return state.feedCache.get(state.activeFeedKey)?.activities || [];
    })
  );

/**
 * Get global error state
 */
export const useFeedError = () => useFeedStore((state) => state.error);

/**
 * Get activity count for a feed
 */
export const useActivityCount = (feedType: FeedType, targetId?: string) => {
  const feedKey = getFeedCacheKey(feedType, targetId);
  return useFeedStore((state) => state.feedCache.get(feedKey)?.activities.length || 0);
};

export default useFeedStore;
