import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import {
  NotFoundError,
  AuthorizationError,
} from '../utils/AppErrors.js';
import type {
  CreateCanvasInput,
  UpdateCanvasInput,
  ShareCanvasInput,
  CanvasQuery,
  CanvasResponse,
} from '../schemas/canvas.schema.js';
import { CanvasVisibility, Prisma } from '@prisma/client';

// JSON type alias for Prisma JSON fields
type JsonValue = any;

/**
 * Canvas service - handles canvas CRUD operations
 */
export class CanvasService {
  /**
   * Create a new canvas
   */
  async create(userId: string, input: CreateCanvasInput): Promise<CanvasResponse> {
    const canvas = await db.canvas.create({
      data: {
        id: idGenerators.canvas(),
        userId,
        name: input.name,
        visibility: input.visibility as CanvasVisibility,
        description: input.description,
        width: input.width,
        height: input.height,
        backgroundConfig: input.backgroundConfig as JsonValue,
        settings: input.settings as JsonValue,
      },
    });

    return this.formatCanvas(canvas);
  }

  /**
   * Get a canvas by ID
   */
  async getById(
    canvasId: string,
    userId?: string,
    password?: string
  ): Promise<CanvasResponse> {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', canvasId);
    }

    // Check access permissions
    await this.checkReadAccess(canvas, userId, password);

    // Increment view count for public/unlisted canvases viewed by non-owners
    if (canvas.userId !== userId && canvas.visibility !== 'private') {
      await db.canvas.update({
        where: { id: canvasId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return this.formatCanvas(canvas);
  }

  /**
   * Get canvas by slug
   */
  async getBySlug(
    slug: string,
    userId?: string,
    password?: string
  ): Promise<CanvasResponse> {
    const canvas = await db.canvas.findUnique({
      where: { slug },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', slug);
    }

    await this.checkReadAccess(canvas, userId, password);

    // Increment view count
    if (canvas.userId !== userId) {
      await db.canvas.update({
        where: { id: canvas.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return this.formatCanvas(canvas);
  }

  /**
   * List canvases for a user
   */
  async list(userId: string, query: CanvasQuery): Promise<{
    canvases: CanvasResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.CanvasWhereInput = { userId };

    if (query.visibility) {
      where.visibility = query.visibility as CanvasVisibility;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CanvasOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [canvases, total] = await Promise.all([
      db.canvas.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.canvas.count({ where }),
    ]);

    return {
      canvases: canvases.map((c) => this.formatCanvas(c)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Update a canvas
   */
  async update(
    canvasId: string,
    userId: string,
    input: UpdateCanvasInput
  ): Promise<CanvasResponse> {
    await this.getOwnedCanvas(canvasId, userId);

    const updated = await db.canvas.update({
      where: { id: canvasId },
      data: {
        name: input.name,
        visibility: input.visibility as CanvasVisibility,
        description: input.description,
        width: input.width,
        height: input.height,
        backgroundConfig: input.backgroundConfig as JsonValue,
        settings: input.settings as JsonValue,
        version: { increment: 1 },
      },
    });

    return this.formatCanvas(updated);
  }

  /**
   * Delete a canvas
   */
  async delete(canvasId: string, userId: string): Promise<void> {
    await this.getOwnedCanvas(canvasId, userId);

    await db.canvas.delete({
      where: { id: canvasId },
    });
  }

  /**
   * Update share settings
   */
  async updateShare(
    canvasId: string,
    userId: string,
    input: ShareCanvasInput
  ): Promise<CanvasResponse> {
    const canvas = await this.getOwnedCanvas(canvasId, userId);

    // Determine the slug to use
    let slugToUse = input.slug;

    // Auto-generate slug if publishing (non-private) and no slug provided or exists
    if (
      input.visibility !== 'private' &&
      !slugToUse &&
      !canvas.slug
    ) {
      // Generate slug from canvas name
      slugToUse = this.generateSlug(canvas.name, canvasId);
    }

    // Check slug uniqueness if we have one
    if (slugToUse) {
      const existing = await db.canvas.findFirst({
        where: {
          slug: slugToUse,
          id: { not: canvasId },
        },
      });
      if (existing) {
        // Add random suffix if slug exists
        slugToUse = `${slugToUse}-${canvasId.slice(-6)}`;
      }
    }

    // Prepare update data
    const updateData: Prisma.CanvasUpdateInput = {};
    if (input.visibility) updateData.visibility = input.visibility as CanvasVisibility;

    // Only update slug if we have a new one (don't clear existing)
    if (slugToUse) {
      updateData.slug = slugToUse;
    } else if (input.slug === null) {
      // Explicitly clear slug only if null is passed
      updateData.slug = null;
    }

    // Handle password
    if (input.removePassword) {
      updateData.hasPassword = false;
      updateData.passwordHash = null;
    } else if (input.password) {
      updateData.hasPassword = true;
      updateData.passwordHash = await hashPassword(input.password);
    }

    const updated = await db.canvas.update({
      where: { id: canvasId },
      data: updateData,
    });

    return this.formatCanvas(updated);
  }

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(name: string, canvasId: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    // Add short ID suffix for uniqueness
    return `${baseSlug || 'canvas'}-${canvasId.slice(-6)}`;
  }

  /**
   * Fork a canvas
   */
  async fork(
    canvasId: string,
    userId: string,
    name?: string
  ): Promise<CanvasResponse> {
    const original = await db.canvas.findUnique({
      where: { id: canvasId },
      include: {
        widgetInstances: true,
        pipelines: true,
      },
    });

    if (!original) {
      throw new NotFoundError('Canvas', canvasId);
    }

    // Check if user can read the canvas
    if (original.visibility === 'private' && original.userId !== userId) {
      throw new AuthorizationError('Cannot fork private canvas');
    }

    // Create forked canvas
    const newCanvasId = idGenerators.canvas();
    const forkedCanvas = await db.canvas.create({
      data: {
        id: newCanvasId,
        userId,
        name: name || `${original.name} (fork)`,
        visibility: 'private',
        description: original.description,
        width: original.width,
        height: original.height,
        backgroundConfig: original.backgroundConfig as JsonValue,
        settings: original.settings as JsonValue,
      },
    });

    // Copy widget instances
    if (original.widgetInstances.length > 0) {
      const widgetIdMap = new Map<string, string>();

      // First pass: create all widgets with new IDs
      for (const widget of original.widgetInstances) {
        const newId = idGenerators.widgetInstance();
        widgetIdMap.set(widget.id, newId);
      }

      // Second pass: create widgets with updated references
      type WidgetType = typeof original.widgetInstances[number];
      await db.widgetInstance.createMany({
        data: original.widgetInstances.map((widget: WidgetType) => ({
          id: widgetIdMap.get(widget.id)!,
          canvasId: newCanvasId,
          widgetDefId: widget.widgetDefId,
          version: widget.version,
          positionX: widget.positionX,
          positionY: widget.positionY,
          width: widget.width,
          height: widget.height,
          rotation: widget.rotation,
          zIndex: widget.zIndex,
          sizePreset: widget.sizePreset,
          state: widget.state as JsonValue,
          metadata: widget.metadata as JsonValue,
          parentId: widget.parentId ? widgetIdMap.get(widget.parentId) : null,
          isContainer: widget.isContainer,
          childIds: widget.childIds.map((id: string) => widgetIdMap.get(id) || id),
          name: widget.name,
          groupId: widget.groupId,
          locked: widget.locked,
          visible: widget.visible,
          opacity: widget.opacity,
          scaleMode: widget.scaleMode,
          contentSize: widget.contentSize as JsonValue,
        })),
      });
    }

    // Copy pipelines
    if (original.pipelines.length > 0) {
      type PipelineType = typeof original.pipelines[number];
      await db.pipeline.createMany({
        data: original.pipelines.map((pipeline: PipelineType) => ({
          id: idGenerators.pipeline(),
          canvasId: newCanvasId,
          name: pipeline.name,
          description: pipeline.description,
          nodes: pipeline.nodes as JsonValue,
          connections: pipeline.connections as JsonValue,
          enabled: pipeline.enabled,
          widgetEdits: pipeline.widgetEdits as JsonValue,
        })),
      });
    }

    return this.formatCanvas(forkedCanvas);
  }

  /**
   * Get canvas versions
   */
  async getVersions(canvasId: string, userId: string): Promise<{
    versions: Array<{
      id: string;
      version: number;
      name: string | null;
      createdAt: string;
    }>;
  }> {
    await this.getOwnedCanvas(canvasId, userId);

    const versions = await db.canvasVersion.findMany({
      where: { canvasId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        name: true,
        createdAt: true,
      },
    });

    return {
      versions: versions.map((v: typeof versions[number]) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Create a version snapshot
   */
  async createVersion(canvasId: string, userId: string, name?: string): Promise<void> {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      include: {
        widgetInstances: true,
        pipelines: true,
      },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', canvasId);
    }

    if (canvas.userId !== userId) {
      throw new AuthorizationError('Not authorized to version this canvas');
    }

    // Get next version number
    const lastVersion = await db.canvasVersion.findFirst({
      where: { canvasId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Create snapshot
    await db.canvasVersion.create({
      data: {
        id: idGenerators.version(),
        canvasId,
        version: nextVersion,
        name,
        snapshot: {
          canvas: {
            name: canvas.name,
            description: canvas.description,
            width: canvas.width,
            height: canvas.height,
            backgroundConfig: canvas.backgroundConfig,
            settings: canvas.settings,
          },
          widgets: canvas.widgetInstances,
          pipelines: canvas.pipelines,
        },
      },
    });
  }

  /**
   * Restore a canvas version
   */
  async restoreVersion(
    canvasId: string,
    userId: string,
    version: number
  ): Promise<CanvasResponse> {
    await this.getOwnedCanvas(canvasId, userId);

    const canvasVersion = await db.canvasVersion.findUnique({
      where: {
        canvasId_version: { canvasId, version },
      },
    });

    if (!canvasVersion) {
      throw new NotFoundError('Canvas version', `${canvasId}:${version}`);
    }

    const snapshot = canvasVersion.snapshot as {
      canvas: {
        name: string;
        description: string | null;
        width: number | null;
        height: number | null;
        backgroundConfig: JsonValue;
        settings: JsonValue;
      };
      widgets: Array<Record<string, unknown>>;
      pipelines: Array<Record<string, unknown>>;
    };

    // Restore in transaction
    const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete current widgets and pipelines
      await tx.widgetInstance.deleteMany({ where: { canvasId } });
      await tx.pipeline.deleteMany({ where: { canvasId } });

      // Restore canvas settings
      const updatedCanvas = await tx.canvas.update({
        where: { id: canvasId },
        data: {
          name: snapshot.canvas.name,
          description: snapshot.canvas.description,
          width: snapshot.canvas.width,
          height: snapshot.canvas.height,
          backgroundConfig: snapshot.canvas.backgroundConfig as JsonValue,
          settings: snapshot.canvas.settings as JsonValue,
          version: { increment: 1 },
        },
      });

      // Restore widgets
      if (snapshot.widgets.length > 0) {
        await tx.widgetInstance.createMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: snapshot.widgets as any,
        });
      }

      // Restore pipelines
      if (snapshot.pipelines.length > 0) {
        await tx.pipeline.createMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: snapshot.pipelines as any,
        });
      }

      return updatedCanvas;
    });

    return this.formatCanvas(updated);
  }

  /**
   * Check if user has read access to canvas
   */
  private async checkReadAccess(
    canvas: { userId: string; visibility: string; hasPassword: boolean; passwordHash: string | null },
    userId?: string,
    password?: string
  ): Promise<void> {
    // Owner always has access
    if (canvas.userId === userId) {
      return;
    }

    // Private canvases are not accessible
    if (canvas.visibility === 'private') {
      throw new AuthorizationError('Canvas is private');
    }

    // Check password if required
    if (canvas.hasPassword && canvas.passwordHash) {
      if (!password) {
        throw new AuthorizationError('Password required');
      }
      const isValid = await verifyPassword(password, canvas.passwordHash);
      if (!isValid) {
        throw new AuthorizationError('Invalid password');
      }
    }
  }

  /**
   * Get canvas and verify ownership
   */
  private async getOwnedCanvas(canvasId: string, userId: string) {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', canvasId);
    }

    if (canvas.userId !== userId) {
      throw new AuthorizationError('Not authorized to modify this canvas');
    }

    return canvas;
  }

  /**
   * Format canvas for response
   */
  private formatCanvas(canvas: {
    id: string;
    userId: string;
    name: string;
    visibility: string;
    slug: string | null;
    description: string | null;
    thumbnailUrl: string | null;
    viewCount: number;
    width: number | null;
    height: number | null;
    hasPassword: boolean;
    backgroundConfig: JsonValue;
    settings: JsonValue;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): CanvasResponse {
    return {
      id: canvas.id,
      userId: canvas.userId,
      name: canvas.name,
      visibility: canvas.visibility as 'private' | 'unlisted' | 'public',
      slug: canvas.slug,
      description: canvas.description,
      thumbnailUrl: canvas.thumbnailUrl,
      viewCount: canvas.viewCount,
      width: canvas.width,
      height: canvas.height,
      hasPassword: canvas.hasPassword,
      backgroundConfig: canvas.backgroundConfig,
      settings: canvas.settings,
      version: canvas.version,
      createdAt: canvas.createdAt.toISOString(),
      updatedAt: canvas.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const canvasService = new CanvasService();
