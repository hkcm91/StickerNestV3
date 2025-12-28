/**
 * StickerNest v2 - Marketplace Discovery Service
 *
 * Handles trending, featured, and recommendation algorithms.
 *
 * ARCHITECTURE NOTES:
 * - Trending score is calculated based on recent activity
 * - Featured items are manually curated by admins
 * - Related items use category, tags, and purchase patterns
 */

import { db } from '../db/client.js';
import { log } from '../utils/logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TrendingItem {
  id: string;
  name: string;
  slug: string;
  itemType: string;
  thumbnailUrl: string | null;
  rating: number;
  downloads: number;
  isFree: boolean;
  oneTimePrice: number | null;
  trendingScore: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface FeaturedSection {
  id: string;
  title: string;
  subtitle: string | null;
  items: TrendingItem[];
}

export interface DiscoveryFilters {
  category?: string;
  itemType?: string;
  minRating?: number;
  priceRange?: 'free' | 'paid' | 'all';
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Trending score weights
const WEIGHTS = {
  DOWNLOADS_7D: 3.0,        // Recent downloads (last 7 days)
  DOWNLOADS_30D: 1.0,       // Monthly downloads
  RATING: 2.0,              // Rating weight
  RATING_COUNT: 0.5,        // Number of ratings
  RECENCY: 1.5,             // How recently published
  VIEWS: 0.1,               // View count
};

// Time periods in milliseconds
const ONE_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * ONE_DAY;
const THIRTY_DAYS = 30 * ONE_DAY;

// ============================================================================
// MARKETPLACE DISCOVERY SERVICE
// ============================================================================

export class MarketplaceDiscoveryService {
  /**
   * Calculate trending score for an item
   */
  calculateTrendingScore(item: {
    downloads: number;
    rating: number;
    ratingCount: number;
    viewCount: number;
    createdAt: Date;
    recentDownloads7d?: number;
    recentDownloads30d?: number;
  }): number {
    const now = Date.now();
    const ageInDays = (now - item.createdAt.getTime()) / ONE_DAY;

    // Recency bonus (items less than 7 days old get a boost)
    const recencyBonus = Math.max(0, (7 - ageInDays) / 7) * WEIGHTS.RECENCY * 100;

    // Calculate score components
    const downloads7dScore = (item.recentDownloads7d || 0) * WEIGHTS.DOWNLOADS_7D;
    const downloads30dScore = (item.recentDownloads30d || item.downloads) * WEIGHTS.DOWNLOADS_30D;
    const ratingScore = item.rating * item.ratingCount * WEIGHTS.RATING;
    const ratingCountScore = Math.min(item.ratingCount, 100) * WEIGHTS.RATING_COUNT;
    const viewScore = (item.viewCount || 0) * WEIGHTS.VIEWS;

    const totalScore =
      downloads7dScore +
      downloads30dScore +
      ratingScore +
      ratingCountScore +
      viewScore +
      recencyBonus;

    return Math.round(totalScore * 100) / 100;
  }

  /**
   * Get trending items
   */
  async getTrending(limit: number = 20, filters?: DiscoveryFilters): Promise<TrendingItem[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS);

    // Build where clause
    const where: Record<string, unknown> = {
      isPublished: true,
      isApproved: true,
    };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.itemType) {
      where.itemType = filters.itemType;
    }
    if (filters?.minRating) {
      where.rating = { gte: filters.minRating };
    }
    if (filters?.priceRange === 'free') {
      where.isFree = true;
    } else if (filters?.priceRange === 'paid') {
      where.isFree = false;
    }

    // Get items with basic info
    const items = await db.marketplaceItem.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      take: limit * 2, // Get more to account for scoring
    });

    // Get recent download counts
    const itemIds = items.map((i) => i.id);

    const recentPurchases = await db.marketplacePurchase.groupBy({
      by: ['itemId'],
      where: {
        itemId: { in: itemIds },
        purchasedAt: { gte: sevenDaysAgo },
        status: 'active',
      },
      _count: true,
    });

    const monthlyPurchases = await db.marketplacePurchase.groupBy({
      by: ['itemId'],
      where: {
        itemId: { in: itemIds },
        purchasedAt: { gte: thirtyDaysAgo },
        status: 'active',
      },
      _count: true,
    });

    const recentMap = new Map(recentPurchases.map((p) => [p.itemId, p._count]));
    const monthlyMap = new Map(monthlyPurchases.map((p) => [p.itemId, p._count]));

    // Calculate scores and sort
    const scored = items.map((item) => ({
      ...item,
      trendingScore: this.calculateTrendingScore({
        downloads: item.downloads,
        rating: item.rating,
        ratingCount: item.ratingCount,
        viewCount: item.viewCount,
        createdAt: item.createdAt,
        recentDownloads7d: recentMap.get(item.id) || 0,
        recentDownloads30d: monthlyMap.get(item.id) || 0,
      }),
    }));

    scored.sort((a, b) => b.trendingScore - a.trendingScore);

    return scored.slice(0, limit).map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      itemType: item.itemType,
      thumbnailUrl: item.thumbnailUrl,
      rating: item.rating,
      downloads: item.downloads,
      isFree: item.isFree,
      oneTimePrice: item.oneTimePrice,
      trendingScore: item.trendingScore,
      author: item.author,
    }));
  }

  /**
   * Get featured items (manually curated)
   */
  async getFeatured(): Promise<TrendingItem[]> {
    const items = await db.marketplaceItem.findMany({
      where: {
        isPublished: true,
        isApproved: true,
        isFeatured: true,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { featuredAt: 'desc' },
      take: 10,
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      itemType: item.itemType,
      thumbnailUrl: item.thumbnailUrl,
      rating: item.rating,
      downloads: item.downloads,
      isFree: item.isFree,
      oneTimePrice: item.oneTimePrice,
      trendingScore: 0,
      author: item.author,
    }));
  }

  /**
   * Get related items based on category, tags, and author
   */
  async getRelated(itemId: string, limit: number = 8): Promise<TrendingItem[]> {
    // Get the source item
    const sourceItem = await db.marketplaceItem.findUnique({
      where: { id: itemId },
      select: {
        category: true,
        tags: true,
        authorId: true,
        itemType: true,
      },
    });

    if (!sourceItem) return [];

    // Find related items
    const items = await db.marketplaceItem.findMany({
      where: {
        id: { not: itemId },
        isPublished: true,
        isApproved: true,
        OR: [
          { category: sourceItem.category },
          { tags: { hasSome: sourceItem.tags } },
          { authorId: sourceItem.authorId },
          { itemType: sourceItem.itemType },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ rating: 'desc' }, { downloads: 'desc' }],
      take: limit,
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      itemType: item.itemType,
      thumbnailUrl: item.thumbnailUrl,
      rating: item.rating,
      downloads: item.downloads,
      isFree: item.isFree,
      oneTimePrice: item.oneTimePrice,
      trendingScore: 0,
      author: item.author,
    }));
  }

  /**
   * Get curated sections for homepage
   */
  async getDiscoverySections(): Promise<FeaturedSection[]> {
    const sections: FeaturedSection[] = [];

    // Featured section
    const featured = await this.getFeatured();
    if (featured.length > 0) {
      sections.push({
        id: 'featured',
        title: 'Featured',
        subtitle: 'Hand-picked by our team',
        items: featured,
      });
    }

    // Trending section
    const trending = await this.getTrending(10);
    if (trending.length > 0) {
      sections.push({
        id: 'trending',
        title: 'Trending',
        subtitle: 'Hot right now',
        items: trending,
      });
    }

    // New releases
    const newItems = await db.marketplaceItem.findMany({
      where: {
        isPublished: true,
        isApproved: true,
        createdAt: { gte: new Date(Date.now() - SEVEN_DAYS) },
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (newItems.length > 0) {
      sections.push({
        id: 'new',
        title: 'New Releases',
        subtitle: 'Fresh from creators',
        items: newItems.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          itemType: item.itemType,
          thumbnailUrl: item.thumbnailUrl,
          rating: item.rating,
          downloads: item.downloads,
          isFree: item.isFree,
          oneTimePrice: item.oneTimePrice,
          trendingScore: 0,
          author: item.author,
        })),
      });
    }

    // Free picks
    const freeItems = await this.getTrending(10, { priceRange: 'free' });
    if (freeItems.length > 0) {
      sections.push({
        id: 'free',
        title: 'Free Picks',
        subtitle: 'No cost, all value',
        items: freeItems,
      });
    }

    return sections;
  }

  /**
   * Set item as featured (admin only)
   */
  async setFeatured(itemId: string, featured: boolean): Promise<void> {
    await db.marketplaceItem.update({
      where: { id: itemId },
      data: {
        isFeatured: featured,
        featuredAt: featured ? new Date() : null,
      },
    });

    log.info(`[Discovery] Item ${itemId} featured: ${featured}`);
  }

  /**
   * Record a view for analytics
   */
  async recordView(itemId: string): Promise<void> {
    await db.marketplaceItem.update({
      where: { id: itemId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  }
}

// Export singleton instance
export const marketplaceDiscoveryService = new MarketplaceDiscoveryService();
