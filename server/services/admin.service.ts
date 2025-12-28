/**
 * StickerNest v2 - Admin Service
 *
 * Handles admin operations for marketplace moderation:
 * - Content review queue
 * - Approval/rejection workflow
 * - User verification
 * - Featured item management
 */

import { db } from '../db/client.js';
import { log } from '../utils/logger.js';
import { NotFoundError, ForbiddenError } from '../utils/AppErrors.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewQueueItem {
  id: string;
  name: string;
  slug: string;
  itemType: string;
  description: string;
  thumbnailUrl: string | null;
  isFree: boolean;
  oneTimePrice: number | null;
  submittedAt: Date;
  author: {
    id: string;
    displayName: string;
    email: string;
    isVerified: boolean;
  };
  stats: {
    previousItems: number;
    totalSales: number;
  };
}

export interface ReviewAction {
  itemId: string;
  action: 'approve' | 'reject' | 'request_changes';
  reason?: string;
  notes?: string;
}

export interface ReviewDecision {
  id: string;
  itemId: string;
  reviewerId: string;
  action: string;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface AdminStats {
  pendingReviews: number;
  approvedToday: number;
  rejectedToday: number;
  totalItems: number;
  totalCreators: number;
  totalRevenue: number;
}

// ============================================================================
// ADMIN SERVICE
// ============================================================================

export class AdminService {
  /**
   * Check if user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'admin' || user?.role === 'moderator';
  }

  /**
   * Require admin access
   */
  async requireAdmin(userId: string): Promise<void> {
    const isAdmin = await this.isAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }
  }

  /**
   * Get items pending review
   */
  async getReviewQueue(
    limit: number = 20,
    offset: number = 0,
    itemType?: string
  ): Promise<{ items: ReviewQueueItem[]; total: number }> {
    const where: Record<string, unknown> = {
      isPublished: true,
      isApproved: false,
      rejectedAt: null,
    };

    if (itemType) {
      where.itemType = itemType;
    }

    const [items, total] = await Promise.all([
      db.marketplaceItem.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      db.marketplaceItem.count({ where }),
    ]);

    // Get author stats
    const result: ReviewQueueItem[] = await Promise.all(
      items.map(async (item) => {
        const [previousItems, salesCount] = await Promise.all([
          db.marketplaceItem.count({
            where: {
              authorId: item.authorId,
              isApproved: true,
            },
          }),
          db.marketplacePurchase.count({
            where: {
              item: { authorId: item.authorId },
              status: 'active',
            },
          }),
        ]);

        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
          itemType: item.itemType,
          description: item.description || '',
          thumbnailUrl: item.thumbnailUrl,
          isFree: item.isFree,
          oneTimePrice: item.oneTimePrice,
          submittedAt: item.createdAt,
          author: item.author,
          stats: {
            previousItems,
            totalSales: salesCount,
          },
        };
      })
    );

    return { items: result, total };
  }

  /**
   * Approve an item
   */
  async approveItem(
    reviewerId: string,
    itemId: string,
    notes?: string
  ): Promise<void> {
    await this.requireAdmin(reviewerId);

    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item', itemId);
    }

    await db.$transaction([
      db.marketplaceItem.update({
        where: { id: itemId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: reviewerId,
        },
      }),
      db.marketplaceReviewLog.create({
        data: {
          itemId,
          reviewerId,
          action: 'approve',
          notes,
        },
      }),
    ]);

    log.info(`[Admin] Item ${itemId} approved by ${reviewerId}`);
  }

  /**
   * Reject an item
   */
  async rejectItem(
    reviewerId: string,
    itemId: string,
    reason: string,
    notes?: string
  ): Promise<void> {
    await this.requireAdmin(reviewerId);

    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item', itemId);
    }

    await db.$transaction([
      db.marketplaceItem.update({
        where: { id: itemId },
        data: {
          isPublished: false,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      }),
      db.marketplaceReviewLog.create({
        data: {
          itemId,
          reviewerId,
          action: 'reject',
          reason,
          notes,
        },
      }),
    ]);

    log.info(`[Admin] Item ${itemId} rejected by ${reviewerId}: ${reason}`);

    // TODO: Send notification to creator
  }

  /**
   * Request changes on an item
   */
  async requestChanges(
    reviewerId: string,
    itemId: string,
    reason: string,
    notes?: string
  ): Promise<void> {
    await this.requireAdmin(reviewerId);

    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item', itemId);
    }

    await db.marketplaceReviewLog.create({
      data: {
        itemId,
        reviewerId,
        action: 'request_changes',
        reason,
        notes,
      },
    });

    log.info(`[Admin] Changes requested for item ${itemId} by ${reviewerId}`);

    // TODO: Send notification to creator
  }

  /**
   * Get review history for an item
   */
  async getReviewHistory(itemId: string): Promise<ReviewDecision[]> {
    const logs = await db.marketplaceReviewLog.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  /**
   * Toggle featured status
   */
  async toggleFeatured(
    adminId: string,
    itemId: string,
    featured: boolean
  ): Promise<void> {
    await this.requireAdmin(adminId);

    await db.marketplaceItem.update({
      where: { id: itemId },
      data: {
        isFeatured: featured,
        featuredAt: featured ? new Date() : null,
      },
    });

    log.info(`[Admin] Item ${itemId} featured: ${featured} by ${adminId}`);
  }

  /**
   * Verify a creator
   */
  async verifyCreator(adminId: string, userId: string): Promise<void> {
    await this.requireAdmin(adminId);

    await db.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    log.info(`[Admin] User ${userId} verified by ${adminId}`);
  }

  /**
   * Get admin dashboard stats
   */
  async getDashboardStats(): Promise<AdminStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingReviews,
      approvedToday,
      rejectedToday,
      totalItems,
      totalCreators,
      revenueData,
    ] = await Promise.all([
      db.marketplaceItem.count({
        where: {
          isPublished: true,
          isApproved: false,
          rejectedAt: null,
        },
      }),
      db.marketplaceReviewLog.count({
        where: {
          action: 'approve',
          createdAt: { gte: today },
        },
      }),
      db.marketplaceReviewLog.count({
        where: {
          action: 'reject',
          createdAt: { gte: today },
        },
      }),
      db.marketplaceItem.count({
        where: { isPublished: true, isApproved: true },
      }),
      db.creatorAccount.count({
        where: { status: 'active' },
      }),
      db.marketplacePurchase.aggregate({
        where: { status: 'active' },
        _sum: { platformFee: true },
      }),
    ]);

    return {
      pendingReviews,
      approvedToday,
      rejectedToday,
      totalItems,
      totalCreators,
      totalRevenue: revenueData._sum.platformFee || 0,
    };
  }

  /**
   * Get flagged/reported items
   */
  async getFlaggedItems(limit: number = 20): Promise<ReviewQueueItem[]> {
    // This would query a reports table - simplified for now
    const items = await db.marketplaceItem.findMany({
      where: {
        isPublished: true,
        // Would filter by report count > 0
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            isVerified: true,
          },
        },
      },
      take: limit,
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      itemType: item.itemType,
      description: item.description || '',
      thumbnailUrl: item.thumbnailUrl,
      isFree: item.isFree,
      oneTimePrice: item.oneTimePrice,
      submittedAt: item.createdAt,
      author: item.author,
      stats: {
        previousItems: 0,
        totalSales: 0,
      },
    }));
  }
}

// Export singleton
export const adminService = new AdminService();
