import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppErrors.js';
import type {
  PublishWidgetInput,
  WidgetListQuery,
  RateWidgetInput,
  CommentWidgetInput,
  WidgetPackageResponse,
  CreateWidgetListingInput,
} from '../schemas/marketplace.schema.js';

// JSON type alias for Prisma JSON fields
type JsonValue = unknown;

/**
 * Marketplace service - handles widget publishing and discovery
 */
export class MarketplaceService {
  /**
   * Publish a widget to the marketplace
   */
  async publishWidget(userId: string, input: PublishWidgetInput): Promise<WidgetPackageResponse> {
    const packageId = input.manifest.id;

    // Check if package already exists
    let existingPackage = await db.widgetPackage.findUnique({
      where: { packageId },
    });

    if (existingPackage && existingPackage.authorId !== userId) {
      throw new ConflictError('Widget package ID is already taken by another user');
    }

    // Check if this version already exists
    if (existingPackage) {
      const existingVersion = await db.widgetPackageVersion.findUnique({
        where: {
          packageId_version: {
            packageId: existingPackage.id,
            version: input.manifest.version,
          },
        },
      });

      if (existingVersion) {
        throw new ConflictError(`Version ${input.manifest.version} already exists`);
      }
    }

    // Create or update package
    const result = await db.$transaction(async (tx: typeof db) => {
      let pkg: Awaited<ReturnType<typeof tx.widgetPackage.create>>;

      if (existingPackage) {
        // Update existing package
        pkg = await tx.widgetPackage.update({
          where: { id: existingPackage.id },
          data: {
            name: input.manifest.name,
            description: input.description || input.manifest.description,
            category: input.category,
            tags: input.tags,
            thumbnailUrl: input.thumbnailUrl,
            previewUrl: input.previewUrl,
          },
          include: { author: true },
        });

        // Mark previous version as not latest
        await tx.widgetPackageVersion.updateMany({
          where: { packageId: existingPackage.id, isLatest: true },
          data: { isLatest: false },
        });
      } else {
        // Create new package
        pkg = await tx.widgetPackage.create({
          data: {
            id: idGenerators.widgetPackage(),
            authorId: userId,
            packageId,
            name: input.manifest.name,
            description: input.description || input.manifest.description,
            category: input.category,
            tags: input.tags,
            thumbnailUrl: input.thumbnailUrl,
            previewUrl: input.previewUrl,
            isPublished: true,
          },
          include: { author: true },
        });
      }

      // Create new version
      const version = await tx.widgetPackageVersion.create({
        data: {
          id: idGenerators.version(),
          packageId: pkg.id,
          version: input.manifest.version,
          manifest: input.manifest as JsonValue,
          bundlePath: `${userId}/${packageId}/${input.manifest.version}/`,
          bundleSize: input.html.length,
          changelog: input.changelog,
          isLatest: true,
        },
      });

      return { pkg, version };
    });

    return this.formatPackage(result.pkg, result.version);
  }

  /**
   * Create a widget listing (simplified form for Settings page)
   * Creates a draft widget package that can later be completed with code
   */
  async createWidgetListing(userId: string, input: CreateWidgetListingInput): Promise<WidgetPackageResponse> {
    // Generate a package ID from the name
    const basePackageId = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    const packageId = `${basePackageId}-${Date.now().toString(36)}`;

    // Create the widget package (as draft until code is uploaded)
    const pkg = await db.widgetPackage.create({
      data: {
        id: idGenerators.widgetPackage(),
        authorId: userId,
        packageId,
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags,
        thumbnailUrl: input.thumbnailUrl,
        isPublished: false, // Draft until code is uploaded
        isFree: input.isFree,
        oneTimePrice: input.isFree ? 0 : input.oneTimePrice,
      },
      include: { author: true },
    });

    // Create a placeholder version
    const version = await db.widgetPackageVersion.create({
      data: {
        id: idGenerators.version(),
        packageId: pkg.id,
        version: '0.0.1',
        manifest: {
          id: packageId,
          name: input.name,
          version: '0.0.1',
          kind: '2d',
          entry: 'index.html',
          capabilities: { draggable: true, resizable: true },
          description: input.description,
        } as JsonValue,
        bundlePath: '',
        bundleSize: 0,
        isLatest: true,
      },
    });

    return this.formatPackage(pkg, version);
  }

  /**
   * List widgets in the marketplace
   */
  async listWidgets(query: WidgetListQuery): Promise<{
    widgets: WidgetPackageResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: {
      isPublished: boolean;
      category?: string;
      OR?: Array<Record<string, unknown>>;
      tags?: Record<string, unknown>;
      isOfficial?: boolean;
    } = {
      isPublished: true,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    if (query.tags) {
      const tagList = query.tags.split(',').map((t: string) => t.trim());
      where.tags = { hasEvery: tagList };
    }

    if (query.official !== undefined) {
      where.isOfficial = query.official;
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {
      [query.sortBy]: query.sortOrder,
    };

    const [packages, total] = await Promise.all([
      db.widgetPackage.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: true,
          versions: {
            where: { isLatest: true },
            take: 1,
          },
        },
      }),
      db.widgetPackage.count({ where }),
    ]);

    return {
      widgets: packages.map((pkg: typeof packages[number]) => this.formatPackage(pkg, pkg.versions[0])),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Get a widget package by ID
   */
  async getWidget(packageId: string): Promise<WidgetPackageResponse> {
    const pkg = await db.widgetPackage.findFirst({
      where: {
        OR: [
          { id: packageId },
          { packageId },
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

    if (!pkg) {
      throw new NotFoundError('Widget package', packageId);
    }

    // Increment download count
    await db.widgetPackage.update({
      where: { id: pkg.id },
      data: { downloads: { increment: 1 } },
    });

    return this.formatPackage(pkg, pkg.versions[0]);
  }

  /**
   * Rate a widget
   */
  async rateWidget(packageId: string, userId: string, input: RateWidgetInput): Promise<void> {
    const pkg = await db.widgetPackage.findFirst({
      where: {
        OR: [
          { id: packageId },
          { packageId },
        ],
      },
    });

    if (!pkg) {
      throw new NotFoundError('Widget package', packageId);
    }

    // Upsert rating
    await db.widgetRating.upsert({
      where: {
        packageId_userId: {
          packageId: pkg.id,
          userId,
        },
      },
      create: {
        id: idGenerators.rating(),
        packageId: pkg.id,
        userId,
        rating: input.rating,
      },
      update: {
        rating: input.rating,
      },
    });

    // Update package average rating
    const stats = await db.widgetRating.aggregate({
      where: { packageId: pkg.id },
      _avg: { rating: true },
      _count: true,
    });

    await db.widgetPackage.update({
      where: { id: pkg.id },
      data: {
        rating: stats._avg.rating || 0,
        ratingCount: stats._count,
      },
    });
  }

  /**
   * Add a comment to a widget
   */
  async addComment(
    packageId: string,
    userId: string,
    input: CommentWidgetInput
  ): Promise<{
    id: string;
    content: string;
    parentId: string | null;
    createdAt: string;
    user: { id: string; username: string };
  }> {
    const pkg = await db.widgetPackage.findFirst({
      where: {
        OR: [
          { id: packageId },
          { packageId },
        ],
      },
    });

    if (!pkg) {
      throw new NotFoundError('Widget package', packageId);
    }

    // If parentId is provided, verify it exists
    if (input.parentId) {
      const parentComment = await db.widgetComment.findUnique({
        where: { id: input.parentId },
      });
      if (!parentComment || parentComment.packageId !== pkg.id) {
        throw new ValidationError('Invalid parent comment');
      }
    }

    const comment = await db.widgetComment.create({
      data: {
        id: idGenerators.comment(),
        packageId: pkg.id,
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
   * Get comments for a widget
   */
  async getComments(packageId: string): Promise<Array<{
    id: string;
    content: string;
    parentId: string | null;
    createdAt: string;
    user: { id: string; username: string };
  }>> {
    const pkg = await db.widgetPackage.findFirst({
      where: {
        OR: [
          { id: packageId },
          { packageId },
        ],
      },
    });

    if (!pkg) {
      throw new NotFoundError('Widget package', packageId);
    }

    const comments = await db.widgetComment.findMany({
      where: { packageId: pkg.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return comments.map((c: typeof comments[number]) => ({
      id: c.id,
      content: c.content,
      parentId: c.parentId,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    }));
  }

  /**
   * Get creator analytics
   */
  async getCreatorAnalytics(userId: string): Promise<{
    overview: {
      totalWidgets: number;
      publishedWidgets: number;
      totalDownloads: number;
      totalRevenue: number;
      avgRating: number;
    };
    recentDownloads: Array<{
      date: string;
      count: number;
    }>;
    topWidgets: Array<{
      id: string;
      name: string;
      downloads: number;
      revenue: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
    }>;
  }> {
    // Get all widgets for this creator
    const widgets = await db.widgetPackage.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        name: true,
        downloads: true,
        rating: true,
        isPublished: true,
        isFree: true,
        oneTimePrice: true,
      },
    });

    const totalWidgets = widgets.length;
    const publishedWidgets = widgets.filter(w => w.isPublished).length;
    const totalDownloads = widgets.reduce((sum, w) => sum + w.downloads, 0);
    const avgRating = widgets.length > 0
      ? widgets.reduce((sum, w) => sum + w.rating, 0) / widgets.length
      : 0;

    // Get purchases for revenue calculation
    const purchases = await db.widgetPurchase.findMany({
      where: {
        widgetPackage: { authorId: userId },
        status: 'completed',
      },
      select: {
        amount: true,
        createdAt: true,
        widgetPackageId: true,
      },
    });

    const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);

    // Calculate top widgets (by downloads)
    const topWidgets = widgets
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5)
      .map(w => {
        const widgetRevenue = purchases
          .filter(p => p.widgetPackageId === w.id)
          .reduce((sum, p) => sum + p.amount, 0);
        return {
          id: w.id,
          name: w.name,
          downloads: w.downloads,
          revenue: widgetRevenue,
        };
      });

    // Calculate recent downloads (last 30 days, simulated from purchase dates)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPurchases = purchases.filter(p => p.createdAt >= thirtyDaysAgo);
    const downloadsByDate: Record<string, number> = {};

    // Initialize all dates in range
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      downloadsByDate[dateStr] = 0;
    }

    // Count purchases by date
    recentPurchases.forEach(p => {
      const dateStr = p.createdAt.toISOString().split('T')[0];
      if (downloadsByDate[dateStr] !== undefined) {
        downloadsByDate[dateStr]++;
      }
    });

    const recentDownloads = Object.entries(downloadsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueByMonthMap: Record<string, number> = {};
    purchases
      .filter(p => p.createdAt >= sixMonthsAgo)
      .forEach(p => {
        const monthKey = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
        revenueByMonthMap[monthKey] = (revenueByMonthMap[monthKey] || 0) + p.amount;
      });

    const revenueByMonth = Object.entries(revenueByMonthMap)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      overview: {
        totalWidgets,
        publishedWidgets,
        totalDownloads,
        totalRevenue,
        avgRating: Math.round(avgRating * 10) / 10,
      },
      recentDownloads,
      topWidgets,
      revenueByMonth,
    };
  }

  /**
   * Get widgets published by a specific user
   */
  async getMyWidgets(userId: string): Promise<WidgetPackageResponse[]> {
    const packages = await db.widgetPackage.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: true,
        versions: {
          where: { isLatest: true },
          take: 1,
        },
      },
    });

    return packages.map((pkg: typeof packages[number]) => this.formatPackage(pkg, pkg.versions[0]));
  }

  /**
   * Format package for response
   */
  private formatPackage(
    pkg: {
      id: string;
      packageId: string;
      name: string;
      description: string | null;
      category: string;
      tags: string[];
      downloads: number;
      rating: number;
      ratingCount: number;
      isPublished: boolean;
      isOfficial: boolean;
      thumbnailUrl: string | null;
      previewUrl: string | null;
      isFree: boolean;
      oneTimePrice: number | null;
      author: { id: string; username: string };
      createdAt: Date;
      updatedAt: Date;
    },
    latestVersion?: {
      version: string;
      manifest: JsonValue;
      changelog: string | null;
      createdAt: Date;
    }
  ): WidgetPackageResponse {
    return {
      id: pkg.id,
      packageId: pkg.packageId,
      name: pkg.name,
      description: pkg.description,
      category: pkg.category,
      tags: pkg.tags,
      downloads: pkg.downloads,
      rating: pkg.rating,
      ratingCount: pkg.ratingCount,
      isPublished: pkg.isPublished,
      isOfficial: pkg.isOfficial,
      thumbnailUrl: pkg.thumbnailUrl,
      previewUrl: pkg.previewUrl,
      isFree: pkg.isFree,
      oneTimePrice: pkg.oneTimePrice,
      author: {
        id: pkg.author.id,
        username: pkg.author.username,
      },
      latestVersion: latestVersion ? {
        version: latestVersion.version,
        manifest: latestVersion.manifest,
        changelog: latestVersion.changelog,
        createdAt: latestVersion.createdAt.toISOString(),
      } : undefined,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();
