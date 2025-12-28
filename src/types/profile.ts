/**
 * StickerNest v2 - Profile Types
 * Types for user profiles, public profiles, and profile-related features
 */

import type { CanvasVisibility } from './domain';

// ============================================
// Social Links
// ============================================

export interface SocialLinks {
  twitter?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

// ============================================
// Profile Settings
// ============================================

export interface ProfileSettings {
  /** Profile theme accent color */
  themeColor?: string;
  /** Preferred layout for canvas gallery */
  layoutPreference?: 'grid' | 'masonry' | 'list';
  /** Show stats on profile */
  showStats?: boolean;
  /** Show follower/following counts */
  showFollowers?: boolean;
  /** Featured canvas IDs to highlight */
  featuredCanvasIds?: string[];
  /** Custom banner position */
  bannerPosition?: 'top' | 'center' | 'bottom';
}

// ============================================
// User Stats
// ============================================

export interface ProfileStats {
  /** Number of public canvases */
  publicCanvases: number;
  /** Number of followers */
  followers: number;
  /** Number of users following */
  following: number;
  /** Total views across all public canvases */
  totalViews: number;
  /** Total likes across all public canvases */
  totalLikes?: number;
}

// ============================================
// Public Profile
// ============================================

export interface PublicProfile {
  // Core identity
  id: string;
  username: string;
  email?: string; // Only for own profile

  // Display info
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  location?: string;

  // Links
  website?: string;
  socialLinks?: SocialLinks;

  // Status
  isVerified: boolean;
  isCreator: boolean;
  role: 'user' | 'creator' | 'admin';

  // Customization
  profileSettings?: ProfileSettings;

  // Stats
  stats: ProfileStats;

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  joinedAt?: string; // Alias for createdAt for display
}

// ============================================
// Canvas Preview (for profile galleries)
// ============================================

export interface CanvasPreview {
  id: string;
  name: string;
  description?: string;
  visibility: CanvasVisibility;
  slug?: string;
  thumbnailUrl?: string;
  previewGif?: string;

  // Stats
  viewCount: number;
  likeCount: number;
  commentCount?: number;

  // Metadata
  tags?: string[];
  category?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  // Owner (for favorites/collections)
  owner?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

// ============================================
// Collection
// ============================================

export interface Collection {
  id: string;
  userId: string;
  name: string;
  slug?: string;
  description?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  isPublic: boolean;
  canvasCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Profile Tab Types
// ============================================

export type ProfileTab = 'canvases' | 'collections' | 'favorites' | 'about';

// ============================================
// Profile API Response Types
// ============================================

export interface ProfileResponse {
  profile: PublicProfile;
}

export interface ProfileCanvasesResponse {
  canvases: CanvasPreview[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ProfileCollectionsResponse {
  collections: Collection[];
  total: number;
}

// ============================================
// Follow Types
// ============================================

export interface FollowStatus {
  isFollowing: boolean;
  followedAt?: string;
}

export interface FollowResponse {
  success: boolean;
  isFollowing: boolean;
  followerCount: number;
}

// ============================================
// Share Types
// ============================================

export type SharePlatform = 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy';

export interface ShareData {
  url: string;
  title: string;
  description?: string;
  image?: string;
}
