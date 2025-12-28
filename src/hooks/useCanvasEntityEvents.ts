/**
 * StickerNest v2 - Canvas Entity Events Hook
 *
 * Listens for canvas:add-* events and creates corresponding canvas entities.
 * This bridges the tool system with the entity rendering system.
 */

import { useEffect, useCallback } from 'react';
import type { EventBus } from '../runtime/EventBus';
import { useCanvasEntityStore } from '../state/useCanvasEntityStore';
import { useToolStore } from '../state/useToolStore';
import type { VectorShapeType } from '../types/entities';

// ============================================================================
// Types
// ============================================================================

interface UseCanvasEntityEventsOptions {
  /** EventBus instance */
  eventBus: EventBus | null;
  /** Canvas ID */
  canvasId: string;
  /** Whether event handling is enabled */
  enabled?: boolean;
}

/** Shape event payload from useToolCanvasInteraction or widgets */
interface ShapeEventPayload {
  type: VectorShapeType;
  svg?: string;
  fill?: { enabled: boolean; color: string };
  stroke?: { enabled: boolean; color: string; width: number };
  cornerRadius?: number;
  opacity?: number;
  shadow?: { enabled: boolean; blur: number; color?: string };
  position?: { x: number; y: number };
}

/** Text event payload from useToolCanvasInteraction or widgets */
interface TextEventPayload {
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | 'normal' | 'bold';
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: string;
  fontStyle?: string;
  textDecoration?: string;
  position?: { x: number; y: number };
}

/** Image event payload from useToolCanvasInteraction or widgets */
interface ImageEventPayload {
  src: string;
  naturalWidth?: number;
  naturalHeight?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  opacity?: number;
  borderRadius?: number;
  mask?: string;
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    grayscale?: number;
  };
  shadow?: { enabled: boolean; blur: number };
  position?: { x: number; y: number };
}

/** Default position for entities created without position (center of viewport) */
const DEFAULT_POSITION = { x: 400, y: 300 };

// ============================================================================
// Hook
// ============================================================================

export function useCanvasEntityEvents({
  eventBus,
  canvasId,
  enabled = true,
}: UseCanvasEntityEventsOptions) {
  const createVector = useCanvasEntityStore((s) => s.createVector);
  const createText = useCanvasEntityStore((s) => s.createText);
  const createImage = useCanvasEntityStore((s) => s.createImage);
  const selectEntity = useCanvasEntityStore((s) => s.selectEntity);
  const deselectAll = useCanvasEntityStore((s) => s.deselectAll);
  const updateEntity = useCanvasEntityStore((s) => s.updateEntity);
  const removeEntity = useCanvasEntityStore((s) => s.removeEntity);

  const shapeDefaults = useToolStore((s) => s.shapeDefaults);
  const textDefaults = useToolStore((s) => s.textDefaults);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /** Handle canvas:add-shape event */
  const handleAddShape = useCallback(
    (payload: ShapeEventPayload) => {
      if (!enabled) return;

      // Use provided position or default to center
      const position = payload.position || DEFAULT_POSITION;

      // Create vector entity with defaults merged with payload
      const entity = createVector({
        x: position.x,
        y: position.y,
        width: 100,
        height: 100,
        shapeType: payload.type,
        fill: payload.fill?.color || shapeDefaults.fill,
        fillOpacity: payload.fill?.enabled !== false ? shapeDefaults.fillOpacity : 0,
        stroke: payload.stroke?.color || shapeDefaults.stroke,
        strokeWidth: payload.stroke?.enabled ? (payload.stroke.width || shapeDefaults.strokeWidth) : 0,
        strokeOpacity: shapeDefaults.strokeOpacity,
        cornerRadius: payload.cornerRadius || shapeDefaults.cornerRadius,
        opacity: payload.opacity !== undefined ? payload.opacity / 100 : 1,
      });

      // Select the newly created entity
      deselectAll();
      selectEntity(entity.id);

      console.log('[CanvasEntityEvents] Created shape:', entity.id, payload.type);
    },
    [enabled, createVector, selectEntity, deselectAll, shapeDefaults]
  );

  /** Handle canvas:add-text event */
  const handleAddText = useCallback(
    (payload: TextEventPayload) => {
      if (!enabled) return;

      // Use provided position or default to center
      const position = payload.position || DEFAULT_POSITION;

      // Create text entity with defaults merged with payload
      const entity = createText({
        x: position.x,
        y: position.y,
        width: 200,
        height: 50,
        content: payload.content || 'Click to edit',
        fontFamily: payload.fontFamily || textDefaults.fontFamily,
        fontSize: payload.fontSize || textDefaults.fontSize,
        fontWeight: payload.fontWeight || textDefaults.fontWeight,
        color: payload.color || textDefaults.color,
        textAlign: payload.textAlign || textDefaults.textAlign,
        letterSpacing: payload.letterSpacing,
        lineHeight: payload.lineHeight,
      });

      // Select the newly created entity
      deselectAll();
      selectEntity(entity.id);

      console.log('[CanvasEntityEvents] Created text:', entity.id);
    },
    [enabled, createText, selectEntity, deselectAll, textDefaults]
  );

  /** Handle canvas:add-image event */
  const handleAddImage = useCallback(
    (payload: ImageEventPayload) => {
      if (!enabled) return;

      // Use provided position or default to center
      const position = payload.position || DEFAULT_POSITION;

      // Calculate dimensions preserving aspect ratio
      const maxSize = 300;
      let width = payload.naturalWidth || 200;
      let height = payload.naturalHeight || 200;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create image entity with all properties from widgets
      const entity = createImage(payload.src, {
        x: position.x - width / 2,
        y: position.y - height / 2,
        width,
        height,
        naturalWidth: payload.naturalWidth || width,
        naturalHeight: payload.naturalHeight || height,
        objectFit: payload.objectFit || 'contain',
        opacity: payload.opacity !== undefined ? payload.opacity / 100 : 1,
        borderRadius: payload.borderRadius || 0,
        filters: payload.filters,
      });

      // Select the newly created entity
      deselectAll();
      selectEntity(entity.id);

      console.log('[CanvasEntityEvents] Created image:', entity.id);
    },
    [enabled, createImage, selectEntity, deselectAll]
  );

  /** Handle entity:update event */
  const handleEntityUpdate = useCallback(
    (payload: { entityId: string; updates: Record<string, unknown> }) => {
      if (!enabled) return;
      updateEntity(payload.entityId, payload.updates);
      console.log('[CanvasEntityEvents] Updated entity:', payload.entityId);
    },
    [enabled, updateEntity]
  );

  /** Handle entity:delete event */
  const handleEntityDelete = useCallback(
    (payload: { entityId: string }) => {
      if (!enabled) return;
      removeEntity(payload.entityId);
      console.log('[CanvasEntityEvents] Deleted entity:', payload.entityId);
    },
    [enabled, removeEntity]
  );

  /** Handle entity:select event */
  const handleEntitySelect = useCallback(
    (payload: { entityId: string; additive?: boolean }) => {
      if (!enabled) return;
      selectEntity(payload.entityId, payload.additive);
      console.log('[CanvasEntityEvents] Selected entity:', payload.entityId);
    },
    [enabled, selectEntity]
  );

  // ============================================================================
  // Event Subscription
  // ============================================================================

  useEffect(() => {
    if (!eventBus || !enabled) return;

    // Subscribe to canvas events using wildcard listener
    const unsubscribe = eventBus.on('*', (event) => {
      if (event.scope !== 'canvas') return;

      switch (event.type) {
        case 'canvas:add-shape':
          handleAddShape(event.payload as ShapeEventPayload);
          break;
        case 'canvas:add-text':
          handleAddText(event.payload as TextEventPayload);
          break;
        case 'canvas:add-image':
          handleAddImage(event.payload as ImageEventPayload);
          break;
        case 'entity:update':
          handleEntityUpdate(event.payload as { entityId: string; updates: Record<string, unknown> });
          break;
        case 'entity:delete':
          handleEntityDelete(event.payload as { entityId: string });
          break;
        case 'entity:select':
          handleEntitySelect(event.payload as { entityId: string; additive?: boolean });
          break;
      }
    });

    console.log('[CanvasEntityEvents] Subscribed to canvas events for:', canvasId);

    return () => {
      unsubscribe();
      console.log('[CanvasEntityEvents] Unsubscribed from canvas events');
    };
  }, [
    eventBus,
    enabled,
    canvasId,
    handleAddShape,
    handleAddText,
    handleAddImage,
    handleEntityUpdate,
    handleEntityDelete,
    handleEntitySelect,
  ]);

  // ============================================================================
  // Return Values
  // ============================================================================

  return {
    // Expose handlers for direct calls (useful for testing or bypassing events)
    addShape: handleAddShape,
    addText: handleAddText,
    addImage: handleAddImage,
    updateEntity: handleEntityUpdate,
    deleteEntity: handleEntityDelete,
    selectEntity: handleEntitySelect,
  };
}

export default useCanvasEntityEvents;
