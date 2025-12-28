/**
 * StickerNest v2 - API Types
 * Shared type definitions for API responses and requests
 *
 * REFACTORING NOTE (Dec 2024):
 * Extracted from apiClient.ts (2,059 lines) to improve maintainability.
 * These types are shared across all API modules.
 */

// =============================================================================
// Core Types
// =============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// User Types
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'creator';
  createdAt: string;
  subscription?: {
    tier: 'free' | 'pro' | 'creator';
    status: string;
  };
}

export interface ExtendedUserProfile extends UserProfile {
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  isCreator?: boolean;
  isVerified?: boolean;
  stats: {
    publicCanvases: number;
    followers: number;
    following: number;
    totalViews: number;
  };
  socialLinks?: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
  };
}

export interface UserStats {
  canvasCount: number;
  widgetCount: number;
  totalViews: number;
  totalAiGenerations: number;
  storageUsed: number;
  storageLimit: number;
}

export interface UpdateProfileInput {
  username?: string;
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
  };
}

export interface FollowedUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isCreator?: boolean;
  followedAt: string;
}

// =============================================================================
// Canvas Types
// =============================================================================

export interface Canvas {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  visibility: 'private' | 'unlisted' | 'public';
  widgets: CanvasWidget[];
  settings: CanvasSettings;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  viewCount?: number;
  forkCount?: number;
}

export interface CanvasWidget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, unknown>;
  zIndex: number;
}

export interface CanvasSettings {
  background?: string;
  gridSize?: number;
  snapToGrid?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface CanvasVersion {
  id: string;
  version: number;
  name?: string;
  createdAt: string;
}

export interface CreateCanvasInput {
  name: string;
  description?: string;
  visibility?: 'private' | 'unlisted' | 'public';
  template?: string;
}

export interface UpdateCanvasInput {
  name?: string;
  description?: string;
  visibility?: 'private' | 'unlisted' | 'public';
  widgets?: CanvasWidget[];
  settings?: Partial<CanvasSettings>;
  thumbnail?: string;
}

export interface CanvasListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  visibility?: 'private' | 'unlisted' | 'public';
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// Marketplace Types
// =============================================================================

export type MarketplaceItemType =
  | 'canvas_widget'   // Frontend-only interactive widgets
  | 'system_widget'   // Backend-powered widgets with server logic
  | 'sticker_pack'    // Collection of stickers (PNGs, Lotties, SVGs, GIFs)
  | 'pipeline'        // AI pipeline/workflow templates
  | 'theme'           // Canvas themes and styling presets
  | 'template';       // Pre-built canvas templates

export type StickerFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'apng' | 'svg' | 'lottie';

export interface MarketplaceItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  shortDescription?: string;
  itemType: MarketplaceItemType;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  viewCount: number;
  isPublished: boolean;
  isOfficial: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  thumbnailUrl?: string;
  previewUrls: string[];
  previewVideo?: string;
  isFree: boolean;
  oneTimePrice?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  license: string;
  metadata?: Record<string, unknown>;
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  latestVersion?: {
    version: string;
    changelog?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Sticker {
  id: string;
  packId: string;
  name: string;
  filename: string;
  format: StickerFormat;
  publicUrl?: string;
  width?: number;
  height?: number;
  isAnimated: boolean;
  duration?: number;
  frameCount?: number;
  fileSize: number;
  metadata?: Record<string, unknown>;
  sortOrder: number;
}

/** @deprecated Use MarketplaceItem instead */
export interface MarketplaceWidget {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  thumbnail?: string;
  screenshots?: string[];
  category: string;
  tags: string[];
  version: string;
  price: number;
  currency: string;
  rating: number;
  ratingCount: number;
  downloadCount: number;
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceComment {
  id: string;
  content: string;
  rating?: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface MarketplaceItemListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  itemType?: MarketplaceItemType | MarketplaceItemType[];
  category?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  featured?: boolean;
  official?: boolean;
  sortBy?: 'popular' | 'recent' | 'rating' | 'price' | 'downloads';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateMarketplaceItemInput {
  name: string;
  description?: string;
  shortDescription?: string;
  itemType: MarketplaceItemType;
  category: string;
  tags?: string[];
  isFree?: boolean;
  oneTimePrice?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  license?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateStickerPackInput extends CreateMarketplaceItemInput {
  itemType: 'sticker_pack';
  stickers: Array<{
    name: string;
    file: File;
  }>;
}

/** @deprecated Use MarketplaceItemListQuery instead */
export interface MarketplaceListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'popular' | 'recent' | 'rating' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface PublishWidgetInput {
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  tags?: string[];
  version: string;
  price: number;
  widgetCode: string;
  thumbnail?: string;
  screenshots?: string[];
}

// =============================================================================
// Social Types
// =============================================================================

export interface FavoriteCanvas {
  id: string;
  canvasId: string;
  canvas: Canvas;
  favoritedAt: string;
  collectionId?: string;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasComment {
  id: string;
  content: string;
  parentId?: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  likes: number;
  isLiked?: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'fork' | 'mention' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: {
    userId?: string;
    username?: string;
    canvasId?: string;
    canvasName?: string;
    commentId?: string;
  };
  createdAt: string;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchResults {
  canvases: {
    items: Canvas[];
    total: number;
  };
  users: {
    items: ExtendedUserProfile[];
    total: number;
  };
  widgets: {
    items: MarketplaceWidget[];
    total: number;
  };
}

export interface SearchQuery {
  q: string;
  type?: 'all' | 'canvases' | 'users' | 'widgets';
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'recent' | 'popular';
}

// =============================================================================
// Collections & Templates Types
// =============================================================================

export interface CanvasCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault: boolean;
  canvasCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: string;
  tags: string[];
  isOfficial: boolean;
  usageCount: number;
  creator?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

// =============================================================================
// Reviews Types
// =============================================================================

export interface WidgetReview {
  id: string;
  rating: number;
  title?: string;
  content: string;
  helpful: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  reply?: {
    content: string;
    createdAt: string;
  };
}
