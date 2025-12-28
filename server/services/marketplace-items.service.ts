import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/AppErrors.js';
import type {
  CreateMarketplaceItemInput,
  UpdateMarketplaceItemInput,
  MarketplaceItemListQuery,
  PublishVersionInput,
  RateItemInput,
  CommentInput,
  MarketplaceItemResponse,
  StickerResponse,
  MarketplaceItemType,
  StickerFormat,
} from '../schemas/marketplace-items.schema.js';

// JSON type alias for Prisma JSON fields
type JsonValue = any;

/**
 * Generate a URL-friendly slug from name
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Marketplace Items Service - handles multi-type marketplace items
 */
export class MarketplaceItemsService {
  /**
   * Create a new marketplace item
   */
  async create(userId: string, input: CreateMarketplaceItemInput): Promise<MarketplaceItemResponse> {
    const slug = generateSlug(input.name);

    const item = await db.marketplaceItem.create({
      data: {
        id: idGenerators.marketplaceItem(),
        authorId: userId,
        slug,
        name: input.name,
        description: input.description,
        shortDescription: input.shortDescription,
        itemType: input.itemType,
        category: input.category,
        tags: input.tags || [],
        isFree: input.isFree ?? true,
        oneTimePrice: input.isFree ? null : input.oneTimePrice,
        monthlyPrice: input.isFree ? null : input.monthlyPrice,
        yearlyPrice: input.isFree ? null : input.yearlyPrice,
        license: input.license || 'standard',
        metadata: input.metadata as JsonValue,
        thumbnailUrl: input.thumbnailUrl,
        previewUrls: input.previewUrls || [],
        previewVideo: input.previewVideo,
        isPublished: false,
      },
      include: { author: true },
    });

    return this.formatItem(item);
  }

  /**
   * Update a marketplace item
   */
  async update(userId: string, itemId: string, input: UpdateMarketplaceItemInput): Promise<MarketplaceItemResponse> {
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    if (item.authorId !== userId) {
      throw new ForbiddenError('You can only update your own items');
    }

    const updated = await db.marketplaceItem.update({
      where: { id: itemId },
      data: {
        name: input.name,
        description: input.description,
        shortDescription: input.shortDescription,
        category: input.category,
        tags: input.tags,
        isFree: input.isFree,
        oneTimePrice: input.isFree ? null : input.oneTimePrice,
        monthlyPrice: input.isFree ? null : input.monthlyPrice,
        yearlyPrice: input.isFree ? null : input.yearlyPrice,
        license: input.license,
        metadata: input.metadata as JsonValue,
        thumbnailUrl: input.thumbnailUrl,
        previewUrls: input.previewUrls,
        previewVideo: input.previewVideo,
      },
      include: { author: true },
    });

    return this.formatItem(updated);
  }

  /**
   * Delete a marketplace item
   */
  async delete(userId: string, itemId: string): Promise<void> {
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    if (item.authorId !== userId) {
      throw new ForbiddenError('You can only delete your own items');
    }

    await db.marketplaceItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * List marketplace items with filtering and pagination
   */
  async list(query: MarketplaceItemListQuery): Promise<{
    items: MarketplaceItemResponse[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const where: {
      isPublished: boolean;
      itemType?: { in: MarketplaceItemType[] } | MarketplaceItemType;
      category?: string;
      OR?: Array<Record<string, unknown>>;
      tags?: Record<string, unknown>;
      isOfficial?: boolean;
      isFeatured?: boolean;
      isFree?: boolean;
      oneTimePrice?: Record<string, number>;
    } = {
      isPublished: true,
    };

    // Filter by item type
    if (query.itemType) {
      const types = Array.isArray(query.itemType) ? query.itemType : [query.itemType];
      if (types.length === 1) {
        where.itemType = types[0];
      } else if (types.length > 1) {
        where.itemType = { in: types };
      }
    }

    // Filter by category
    if (query.category) {
      where.category = query.category;
    }

    // Search
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      const tagList = Array.isArray(query.tags) ? query.tags : [query.tags];
      where.tags = { hasEvery: tagList };
    }

    // Filter by official/featured
    if (query.official !== undefined) {
      where.isOfficial = query.official;
    }
    if (query.featured !== undefined) {
      where.isFeatured = query.featured;
    }

    // Filter by price
    if (query.freeOnly) {
      where.isFree = true;
    } else {
      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        where.oneTimePrice = {};
        if (query.minPrice !== undefined) {
          where.oneTimePrice.gte = query.minPrice;
        }
        if (query.maxPrice !== undefined) {
          where.oneTimePrice.lte = query.maxPrice;
        }
      }
    }

    // Determine sort field
    const sortFieldMap: Record<string, string> = {
      popular: 'downloads',
      recent: 'createdAt',
      rating: 'rating',
      price: 'oneTimePrice',
      downloads: 'downloads',
    };

    const orderBy: Record<string, 'asc' | 'desc'> = {
      [sortFieldMap[query.sortBy] || 'downloads']: query.sortOrder,
    };

    const [items, total] = await Promise.all([
      db.marketplaceItem.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          author: true,
          versions: {
            where: { isLatest: true },
            take: 1,
          },
        },
      }),
      db.marketplaceItem.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatItem(item, item.versions[0])),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * Get item by slug or ID
   */
  async getBySlugOrId(slugOrId: string): Promise<MarketplaceItemResponse> {
    const item = await db.marketplaceItem.findFirst({
      where: {
        OR: [
          { id: slugOrId },
          { slug: slugOrId },
        ],
      },
      include: {
        author: true,
        versions: {
          where: { isLatest: true },
          take: 1,
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', slugOrId);
    }

    // Increment view count
    await db.marketplaceItem.update({
      where: { id: item.id },
      data: { viewCount: { increment: 1 } },
    });

    return this.formatItem(item, item.versions[0]);
  }

  /**
   * Get featured items
   */
  async getFeatured(itemType?: MarketplaceItemType): Promise<MarketplaceItemResponse[]> {
    const where: { isPublished: boolean; isFeatured: boolean; itemType?: MarketplaceItemType } = {
      isPublished: true,
      isFeatured: true,
    };

    if (itemType) {
      where.itemType = itemType;
    }

    const items = await db.marketplaceItem.findMany({
      where,
      orderBy: { downloads: 'desc' },
      take: 12,
      include: {
        author: true,
        versions: {
          where: { isLatest: true },
          take: 1,
        },
      },
    });

    return items.map((item) => this.formatItem(item, item.versions[0]));
  }

  /**
   * Get user's own items
   */
  async getMyItems(userId: string, itemType?: MarketplaceItemType): Promise<MarketplaceItemResponse[]> {
    const where: { authorId: string; itemType?: MarketplaceItemType } = {
      authorId: userId,
    };

    if (itemType) {
      where.itemType = itemType;
    }

    const items = await db.marketplaceItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: true,
        versions: {
          where: { isLatest: true },
          take: 1,
        },
      },
    });

    return items.map((item) => this.formatItem(item, item.versions[0]));
  }

  /**
   * Publish a new version
   */
  async publishVersion(userId: string, itemId: string, input: PublishVersionInput): Promise<{
    id: string;
    version: string;
    createdAt: string;
  }> {
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    if (item.authorId !== userId) {
      throw new ForbiddenError('You can only publish versions for your own items');
    }

    // Check if version already exists
    const existingVersion = await db.marketplaceItemVersion.findUnique({
      where: {
        itemId_version: {
          itemId,
          version: input.version,
        },
      },
    });

    if (existingVersion) {
      throw new ConflictError(`Version ${input.version} already exists`);
    }

    // Create new version
    const result = await db.$transaction(async (tx) => {
      // Mark previous versions as not latest
      await tx.marketplaceItemVersion.updateMany({
        where: { itemId, isLatest: true },
        data: { isLatest: false },
      });

      // Create new version
      const version = await tx.marketplaceItemVersion.create({
        data: {
          id: idGenerators.marketplaceItemVersion(),
          itemId,
          version: input.version,
          content: input.content as JsonValue,
          changelog: input.changelog,
          bundlePath: input.bundlePath,
          minAppVersion: input.minAppVersion,
          isLatest: true,
        },
      });

      // Mark item as published
      await tx.marketplaceItem.update({
        where: { id: itemId },
        data: { isPublished: true },
      });

      return version;
    });

    return {
      id: result.id,
      version: result.version,
      createdAt: result.createdAt.toISOString(),
    };
  }

  /**
   * Rate an item
   */
  async rate(userId: string, itemId: string, input: RateItemInput): Promise<void> {
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    // Upsert rating
    await db.marketplaceRating.upsert({
      where: {
        itemId_userId: {
          itemId,
          userId,
        },
      },
      create: {
        id: idGenerators.rating(),
        itemId,
        userId,
        rating: input.rating,
      },
      update: {
        rating: input.rating,
      },
    });

    // Update item average rating
    const stats = await db.marketplaceRating.aggregate({
      where: { itemId },
      _avg: { rating: true },
      _count: true,
    });

    await db.marketplaceItem.update({
      where: { id: itemId },
      data: {
        rating: stats._avg.rating || 0,
        ratingCount: stats._count,
      },
    });
  }

  /**
   * Add a comment
   */
  async addComment(userId: string, itemId: string, input: CommentInput): Promise<{
    id: string;
    content: string;
    parentId: string | null;
    createdAt: string;
    user: { id: string; username: string };
  }> {
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    // Verify parent comment if provided
    if (input.parentId) {
      const parent = await db.marketplaceComment.findUnique({
        where: { id: input.parentId },
      });
      if (!parent || parent.itemId !== itemId) {
        throw new NotFoundError('Parent comment', input.parentId);
      }
    }

    const comment = await db.marketplaceComment.create({
      data: {
        id: idGenerators.comment(),
        itemId,
        userId,
        content: input.content,
        parentId: input.parentId,
      },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    };
  }

  /**
   * Get comments for an item
   */
  async getComments(itemId: string, page = 1, pageSize = 20): Promise<{
    items: Array<{
      id: string;
      content: string;
      parentId: string | null;
      createdAt: string;
      user: { id: string; username: string };
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const [comments, total] = await Promise.all([
      db.marketplaceComment.findMany({
        where: { itemId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      }),
      db.marketplaceComment.count({ where: { itemId } }),
    ]);

    return {
      items: comments.map((c) => ({
        id: c.id,
        content: c.content,
        parentId: c.parentId,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get stickers from a pack
   */
  async getStickers(packId: string): Promise<StickerResponse[]> {
    const pack = await db.marketplaceItem.findUnique({
      where: { id: packId },
    });

    if (!pack || pack.itemType !== 'sticker_pack') {
      throw new NotFoundError('Sticker pack', packId);
    }

    const stickers = await db.sticker.findMany({
      where: { packId },
      orderBy: { sortOrder: 'asc' },
    });

    return stickers.map((s) => this.formatSticker(s));
  }

  /**
   * Add sticker to a pack
   */
  async addSticker(
    userId: string,
    packId: string,
    input: {
      name: string;
      filename: string;
      format: StickerFormat;
      storagePath: string;
      publicUrl?: string;
      width?: number;
      height?: number;
      isAnimated?: boolean;
      duration?: number;
      frameCount?: number;
      fileSize: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<StickerResponse> {
    const pack = await db.marketplaceItem.findUnique({
      where: { id: packId },
    });

    if (!pack || pack.itemType !== 'sticker_pack') {
      throw new NotFoundError('Sticker pack', packId);
    }

    if (pack.authorId !== userId) {
      throw new ForbiddenError('You can only add stickers to your own packs');
    }

    // Get current max sort order
    const lastSticker = await db.sticker.findFirst({
      where: { packId },
      orderBy: { sortOrder: 'desc' },
    });

    const sticker = await db.sticker.create({
      data: {
        id: idGenerators.sticker(),
        packId,
        name: input.name,
        filename: input.filename,
        format: input.format,
        storagePath: input.storagePath,
        publicUrl: input.publicUrl,
        width: input.width,
        height: input.height,
        isAnimated: input.isAnimated || false,
        duration: input.duration,
        frameCount: input.frameCount,
        fileSize: input.fileSize,
        metadata: input.metadata as JsonValue,
        sortOrder: (lastSticker?.sortOrder ?? -1) + 1,
      },
    });

    // Update sticker count in metadata
    const stickerCount = await db.sticker.count({ where: { packId } });
    await db.marketplaceItem.update({
      where: { id: packId },
      data: {
        metadata: {
          ...(pack.metadata as Record<string, unknown> || {}),
          stickerCount,
        },
      },
    });

    return this.formatSticker(sticker);
  }

  /**
   * Remove sticker from a pack
   */
  async removeSticker(userId: string, packId: string, stickerId: string): Promise<void> {
    const pack = await db.marketplaceItem.findUnique({
      where: { id: packId },
    });

    if (!pack || pack.itemType !== 'sticker_pack') {
      throw new NotFoundError('Sticker pack', packId);
    }

    if (pack.authorId !== userId) {
      throw new ForbiddenError('You can only remove stickers from your own packs');
    }

    const sticker = await db.sticker.findUnique({
      where: { id: stickerId },
    });

    if (!sticker || sticker.packId !== packId) {
      throw new NotFoundError('Sticker', stickerId);
    }

    await db.sticker.delete({
      where: { id: stickerId },
    });

    // Update sticker count in metadata
    const stickerCount = await db.sticker.count({ where: { packId } });
    await db.marketplaceItem.update({
      where: { id: packId },
      data: {
        metadata: {
          ...(pack.metadata as Record<string, unknown> || {}),
          stickerCount,
        },
      },
    });
  }

  /**
   * Check ownership of an item
   */
  async checkOwnership(userId: string, itemId: string): Promise<{
    owned: boolean;
    purchase?: { id: string; purchasedAt: string };
  }> {
    const item = await db.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Marketplace item', itemId);
    }

    // Free items are always "owned"
    if (item.isFree) {
      return { owned: true };
    }

    // Check for existing purchase
    const purchase = await db.marketplacePurchase.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (purchase && purchase.status === 'active') {
      return {
        owned: true,
        purchase: {
          id: purchase.id,
          purchasedAt: purchase.purchasedAt.toISOString(),
        },
      };
    }

    return { owned: false };
  }

  /**
   * Format item for response
   */
  private formatItem(
    item: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      shortDescription: string | null;
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
      thumbnailUrl: string | null;
      previewUrls: string[];
      previewVideo: string | null;
      isFree: boolean;
      oneTimePrice: number | null;
      monthlyPrice: number | null;
      yearlyPrice: number | null;
      license: string;
      metadata: JsonValue;
      author: { id: string; username: string };
      createdAt: Date;
      updatedAt: Date;
    },
    latestVersion?: {
      version: string;
      content: JsonValue;
      changelog: string | null;
      createdAt: Date;
    }
  ): MarketplaceItemResponse {
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      shortDescription: item.shortDescription,
      itemType: item.itemType,
      category: item.category,
      tags: item.tags,
      downloads: item.downloads,
      rating: item.rating,
      ratingCount: item.ratingCount,
      viewCount: item.viewCount,
      isPublished: item.isPublished,
      isOfficial: item.isOfficial,
      isFeatured: item.isFeatured,
      isVerified: item.isVerified,
      thumbnailUrl: item.thumbnailUrl,
      previewUrls: item.previewUrls,
      previewVideo: item.previewVideo,
      isFree: item.isFree,
      oneTimePrice: item.oneTimePrice,
      monthlyPrice: item.monthlyPrice,
      yearlyPrice: item.yearlyPrice,
      license: item.license,
      metadata: item.metadata,
      author: {
        id: item.author.id,
        username: item.author.username,
      },
      latestVersion: latestVersion ? {
        version: latestVersion.version,
        content: latestVersion.content,
        changelog: latestVersion.changelog,
        createdAt: latestVersion.createdAt.toISOString(),
      } : undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  /**
   * Format sticker for response
   */
  private formatSticker(sticker: {
    id: string;
    packId: string;
    name: string;
    filename: string;
    format: StickerFormat;
    storagePath: string;
    publicUrl: string | null;
    width: number | null;
    height: number | null;
    isAnimated: boolean;
    duration: number | null;
    frameCount: number | null;
    fileSize: number;
    metadata: JsonValue;
    sortOrder: number;
    createdAt: Date;
  }): StickerResponse {
    return {
      id: sticker.id,
      packId: sticker.packId,
      name: sticker.name,
      filename: sticker.filename,
      format: sticker.format,
      publicUrl: sticker.publicUrl,
      width: sticker.width,
      height: sticker.height,
      isAnimated: sticker.isAnimated,
      duration: sticker.duration,
      frameCount: sticker.frameCount,
      fileSize: sticker.fileSize,
      metadata: sticker.metadata,
      sortOrder: sticker.sortOrder,
      createdAt: sticker.createdAt.toISOString(),
    };
  }
}

// Export singleton instance
export const marketplaceItemsService = new MarketplaceItemsService();
