/**
 * StickerNest v2 - Favorites & Bookmarks Types
 *
 * Types for the user favorites system including:
 * - Canvas favorites
 * - Widget favorites
 * - Creator follows
 */

import { z } from 'zod';

// =============================================================================
// Favorite Types
// =============================================================================

/**
 * Types of items that can be favorited
 */
export const FavoriteTypeSchema = z.enum([
  'canvas',
  'widget',
  'sticker_pack',
  'template',
  'creator',
]);
export type FavoriteType = z.infer<typeof FavoriteTypeSchema>;

/**
 * A favorited item
 */
export const FavoriteItemSchema = z.object({
  /** Unique favorite ID */
  id: z.string(),

  /** User who favorited */
  userId: z.string(),

  /** Type of item */
  type: FavoriteTypeSchema,

  /** ID of the favorited item */
  itemId: z.string(),

  /** When it was favorited */
  createdAt: z.string().datetime(),

  /** Optional note/tag */
  note: z.string().optional(),

  /** Collection/folder it belongs to */
  collectionId: z.string().optional(),
});
export type FavoriteItem = z.infer<typeof FavoriteItemSchema>;

/**
 * Collection for organizing favorites
 */
export const FavoriteCollectionSchema = z.object({
  /** Collection ID */
  id: z.string(),

  /** User who owns this collection */
  userId: z.string(),

  /** Collection name */
  name: z.string(),

  /** Collection description */
  description: z.string().optional(),

  /** Whether this collection is public */
  isPublic: z.boolean().default(false),

  /** Collection icon */
  icon: z.string().optional(),

  /** Collection color */
  color: z.string().optional(),

  /** Number of items in collection */
  itemCount: z.number().default(0),

  /** When created */
  createdAt: z.string().datetime(),

  /** When last updated */
  updatedAt: z.string().datetime(),
});
export type FavoriteCollection = z.infer<typeof FavoriteCollectionSchema>;

// =============================================================================
// Creator Following
// =============================================================================

/**
 * A creator follow relationship
 */
export const CreatorFollowSchema = z.object({
  /** Follow ID */
  id: z.string(),

  /** User doing the following */
  followerId: z.string(),

  /** Creator being followed */
  followingId: z.string(),

  /** When the follow happened */
  createdAt: z.string().datetime(),

  /** Whether to receive notifications */
  notifications: z.boolean().default(true),
});
export type CreatorFollow = z.infer<typeof CreatorFollowSchema>;

// =============================================================================
// Canvas Bookmark with Preview Data
// =============================================================================

/**
 * A bookmarked canvas with preview data
 */
export interface BookmarkedCanvas {
  /** Favorite entry ID */
  favoriteId: string;

  /** Canvas ID */
  canvasId: string;

  /** Canvas name */
  name: string;

  /** Canvas description */
  description?: string;

  /** Thumbnail URL */
  thumbnailUrl?: string;

  /** Canvas slug for sharing */
  slug?: string;

  /** View count */
  viewCount: number;

  /** Creator info */
  creator: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };

  /** When favorited */
  favoritedAt: string;

  /** When canvas was last updated */
  canvasUpdatedAt: string;

  /** Collection this belongs to */
  collection?: {
    id: string;
    name: string;
  };
}

/**
 * A followed creator with profile data
 */
export interface FollowedCreator {
  /** Follow entry ID */
  followId: string;

  /** Creator info */
  creator: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    isVerified?: boolean;
  };

  /** Stats */
  stats: {
    publicCanvases: number;
    followers: number;
    totalViews: number;
  };

  /** When followed */
  followedAt: string;

  /** Whether notifications are enabled */
  notificationsEnabled: boolean;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Add favorite request
 */
export interface AddFavoriteRequest {
  type: FavoriteType;
  itemId: string;
  collectionId?: string;
  note?: string;
}

/**
 * Remove favorite request
 */
export interface RemoveFavoriteRequest {
  type: FavoriteType;
  itemId: string;
}

/**
 * List favorites request
 */
export interface ListFavoritesRequest {
  type?: FavoriteType;
  collectionId?: string;
  page?: number;
  limit?: number;
}

/**
 * Create collection request
 */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  icon?: string;
  color?: string;
}

/**
 * Favorites state for client
 */
export interface FavoritesState {
  /** Map of item IDs to favorite entries (for quick lookup) */
  items: Map<string, FavoriteItem>;

  /** User's collections */
  collections: FavoriteCollection[];

  /** Followed creators */
  following: CreatorFollow[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;
}

/**
 * Empty favorites state
 */
export const EMPTY_FAVORITES_STATE: FavoritesState = {
  items: new Map(),
  collections: [],
  following: [],
  isLoading: false,
  error: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an item is favorited
 */
export function isFavorited(state: FavoritesState, type: FavoriteType, itemId: string): boolean {
  const key = `${type}:${itemId}`;
  return state.items.has(key);
}

/**
 * Get favorite entry for an item
 */
export function getFavorite(state: FavoritesState, type: FavoriteType, itemId: string): FavoriteItem | undefined {
  const key = `${type}:${itemId}`;
  return state.items.get(key);
}

/**
 * Check if following a creator
 */
export function isFollowing(state: FavoritesState, creatorId: string): boolean {
  return state.following.some(f => f.followingId === creatorId);
}
