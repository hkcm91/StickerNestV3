import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { NotFoundError, AuthorizationError } from '../utils/AppErrors.js';
import type {
  CreateWidgetInput,
  UpdateWidgetInput,
  UpdateWidgetStateInput,
  BatchUpdateWidgetsInput,
  WidgetResponse,
} from '../schemas/widget.schema.js';

// JSON type alias for Prisma JSON fields
type JsonValue = unknown;

/**
 * Widget service - handles widget instance CRUD on canvases
 */
export class WidgetService {
  /**
   * Get all widgets for a canvas
   */
  async getByCanvas(canvasId: string, userId: string): Promise<WidgetResponse[]> {
    // Verify canvas access
    await this.verifyCanvasAccess(canvasId, userId);

    const widgets = await db.widgetInstance.findMany({
      where: { canvasId },
      orderBy: { zIndex: 'asc' },
    });

    return widgets.map((w: Parameters<WidgetService['formatWidget']>[0]) => this.formatWidget(w));
  }

  /**
   * Get a single widget
   */
  async getById(canvasId: string, widgetId: string, userId: string): Promise<WidgetResponse> {
    await this.verifyCanvasAccess(canvasId, userId);

    const widget = await db.widgetInstance.findFirst({
      where: { id: widgetId, canvasId },
    });

    if (!widget) {
      throw new NotFoundError('Widget', widgetId);
    }

    return this.formatWidget(widget);
  }

  /**
   * Create a new widget instance
   */
  async create(canvasId: string, userId: string, input: CreateWidgetInput): Promise<WidgetResponse> {
    await this.verifyCanvasOwnership(canvasId, userId);

    const widget = await db.widgetInstance.create({
      data: {
        id: idGenerators.widgetInstance(),
        canvasId,
        widgetDefId: input.widgetDefId,
        version: input.version,
        positionX: input.position.x,
        positionY: input.position.y,
        sizePreset: input.sizePreset,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        zIndex: input.zIndex,
        state: input.state as JsonValue,
        metadata: input.metadata as JsonValue,
        parentId: input.parentId,
        isContainer: input.isContainer,
        childIds: input.childIds,
        name: input.name,
        groupId: input.groupId,
        locked: input.locked,
        visible: input.visible,
        opacity: input.opacity,
        scaleMode: input.scaleMode,
        contentSize: input.contentSize as JsonValue,
      },
    });

    // Increment canvas version
    await db.canvas.update({
      where: { id: canvasId },
      data: { version: { increment: 1 } },
    });

    return this.formatWidget(widget);
  }

  /**
   * Update a widget instance
   */
  async update(
    canvasId: string,
    widgetId: string,
    userId: string,
    input: UpdateWidgetInput
  ): Promise<WidgetResponse> {
    await this.verifyCanvasOwnership(canvasId, userId);

    const existing = await db.widgetInstance.findFirst({
      where: { id: widgetId, canvasId },
    });

    if (!existing) {
      throw new NotFoundError('Widget', widgetId);
    }

    const updateData: Record<string, unknown> = {};

    if (input.widgetDefId !== undefined) updateData.widgetDefId = input.widgetDefId;
    if (input.version !== undefined) updateData.version = input.version;
    if (input.position !== undefined) {
      updateData.positionX = input.position.x;
      updateData.positionY = input.position.y;
    }
    if (input.sizePreset !== undefined) updateData.sizePreset = input.sizePreset;
    if (input.width !== undefined) updateData.width = input.width;
    if (input.height !== undefined) updateData.height = input.height;
    if (input.rotation !== undefined) updateData.rotation = input.rotation;
    if (input.zIndex !== undefined) updateData.zIndex = input.zIndex;
    if (input.state !== undefined) updateData.state = input.state as JsonValue;
    if (input.metadata !== undefined) updateData.metadata = input.metadata as JsonValue;
    if (input.parentId !== undefined) updateData.parentId = input.parentId;
    if (input.isContainer !== undefined) updateData.isContainer = input.isContainer;
    if (input.childIds !== undefined) updateData.childIds = input.childIds;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.groupId !== undefined) updateData.groupId = input.groupId;
    if (input.locked !== undefined) updateData.locked = input.locked;
    if (input.visible !== undefined) updateData.visible = input.visible;
    if (input.opacity !== undefined) updateData.opacity = input.opacity;
    if (input.scaleMode !== undefined) updateData.scaleMode = input.scaleMode;
    if (input.contentSize !== undefined) updateData.contentSize = input.contentSize as JsonValue;

    const widget = await db.widgetInstance.update({
      where: { id: widgetId },
      data: updateData,
    });

    // Increment canvas version
    await db.canvas.update({
      where: { id: canvasId },
      data: { version: { increment: 1 } },
    });

    return this.formatWidget(widget);
  }

  /**
   * Update widget state only (optimized for frequent state updates)
   */
  async updateState(
    canvasId: string,
    widgetId: string,
    userId: string,
    input: UpdateWidgetStateInput
  ): Promise<WidgetResponse> {
    await this.verifyCanvasOwnership(canvasId, userId);

    const existing = await db.widgetInstance.findFirst({
      where: { id: widgetId, canvasId },
    });

    if (!existing) {
      throw new NotFoundError('Widget', widgetId);
    }

    const widget = await db.widgetInstance.update({
      where: { id: widgetId },
      data: {
        state: input.state as JsonValue,
      },
    });

    return this.formatWidget(widget);
  }

  /**
   * Delete a widget instance
   */
  async delete(canvasId: string, widgetId: string, userId: string): Promise<void> {
    await this.verifyCanvasOwnership(canvasId, userId);

    const existing = await db.widgetInstance.findFirst({
      where: { id: widgetId, canvasId },
    });

    if (!existing) {
      throw new NotFoundError('Widget', widgetId);
    }

    // If widget has children, update them to remove parent reference
    if (existing.childIds.length > 0) {
      await db.widgetInstance.updateMany({
        where: { id: { in: existing.childIds } },
        data: { parentId: null },
      });
    }

    // If widget has a parent, remove from parent's childIds
    if (existing.parentId) {
      const parent = await db.widgetInstance.findUnique({
        where: { id: existing.parentId },
      });
      if (parent) {
        await db.widgetInstance.update({
          where: { id: existing.parentId },
          data: {
            childIds: parent.childIds.filter((id: string) => id !== widgetId),
          },
        });
      }
    }

    await db.widgetInstance.delete({
      where: { id: widgetId },
    });

    // Increment canvas version
    await db.canvas.update({
      where: { id: canvasId },
      data: { version: { increment: 1 } },
    });
  }

  /**
   * Batch update multiple widgets
   */
  async batchUpdate(
    canvasId: string,
    userId: string,
    input: BatchUpdateWidgetsInput
  ): Promise<WidgetResponse[]> {
    await this.verifyCanvasOwnership(canvasId, userId);

    const results: WidgetResponse[] = [];

    // Process updates in transaction
    await db.$transaction(async (tx: typeof db) => {
      for (const { id, data } of input.updates) {
        const existing = await tx.widgetInstance.findFirst({
          where: { id, canvasId },
        });

        if (!existing) {
          throw new NotFoundError('Widget', id);
        }

        const updateData: Record<string, unknown> = {};

        if (data.widgetDefId !== undefined) updateData.widgetDefId = data.widgetDefId;
        if (data.version !== undefined) updateData.version = data.version;
        if (data.position !== undefined) {
          updateData.positionX = data.position.x;
          updateData.positionY = data.position.y;
        }
        if (data.sizePreset !== undefined) updateData.sizePreset = data.sizePreset;
        if (data.width !== undefined) updateData.width = data.width;
        if (data.height !== undefined) updateData.height = data.height;
        if (data.rotation !== undefined) updateData.rotation = data.rotation;
        if (data.zIndex !== undefined) updateData.zIndex = data.zIndex;
        if (data.state !== undefined) updateData.state = data.state as JsonValue;
        if (data.metadata !== undefined) updateData.metadata = data.metadata as JsonValue;
        if (data.parentId !== undefined) updateData.parentId = data.parentId;
        if (data.isContainer !== undefined) updateData.isContainer = data.isContainer;
        if (data.childIds !== undefined) updateData.childIds = data.childIds;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.groupId !== undefined) updateData.groupId = data.groupId;
        if (data.locked !== undefined) updateData.locked = data.locked;
        if (data.visible !== undefined) updateData.visible = data.visible;
        if (data.opacity !== undefined) updateData.opacity = data.opacity;
        if (data.scaleMode !== undefined) updateData.scaleMode = data.scaleMode;
        if (data.contentSize !== undefined) updateData.contentSize = data.contentSize as JsonValue;

        const widget = await tx.widgetInstance.update({
          where: { id },
          data: updateData,
        });

        results.push(this.formatWidget(widget));
      }

      // Increment canvas version once
      await tx.canvas.update({
        where: { id: canvasId },
        data: { version: { increment: 1 } },
      });
    });

    return results;
  }

  /**
   * Verify user has read access to canvas
   */
  private async verifyCanvasAccess(canvasId: string, userId: string): Promise<void> {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', canvasId);
    }

    // Owner always has access
    if (canvas.userId === userId) {
      return;
    }

    // Private canvases are not accessible
    if (canvas.visibility === 'private') {
      throw new AuthorizationError('Canvas is private');
    }
  }

  /**
   * Verify user owns the canvas
   */
  private async verifyCanvasOwnership(canvasId: string, userId: string): Promise<void> {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', canvasId);
    }

    if (canvas.userId !== userId) {
      throw new AuthorizationError('Not authorized to modify this canvas');
    }
  }

  /**
   * Format widget for response
   */
  private formatWidget(widget: {
    id: string;
    canvasId: string;
    widgetDefId: string;
    version: string;
    positionX: number;
    positionY: number;
    sizePreset: string;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
    state: JsonValue;
    metadata: JsonValue;
    parentId: string | null;
    isContainer: boolean;
    childIds: string[];
    name: string | null;
    groupId: string | null;
    locked: boolean;
    visible: boolean;
    opacity: number;
    scaleMode: string;
    contentSize: JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): WidgetResponse {
    return {
      id: widget.id,
      canvasId: widget.canvasId,
      widgetDefId: widget.widgetDefId,
      version: widget.version,
      position: { x: widget.positionX, y: widget.positionY },
      sizePreset: widget.sizePreset as 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'banner' | 'full',
      width: widget.width,
      height: widget.height,
      rotation: widget.rotation,
      zIndex: widget.zIndex,
      state: widget.state as Record<string, unknown>,
      metadata: widget.metadata,
      parentId: widget.parentId,
      isContainer: widget.isContainer,
      childIds: widget.childIds,
      name: widget.name,
      groupId: widget.groupId,
      locked: widget.locked,
      visible: widget.visible,
      opacity: widget.opacity,
      scaleMode: widget.scaleMode,
      contentSize: widget.contentSize,
      createdAt: widget.createdAt.toISOString(),
      updatedAt: widget.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const widgetService = new WidgetService();
