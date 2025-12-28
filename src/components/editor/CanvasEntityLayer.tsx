/**
 * StickerNest v2 - Canvas Entity Layer
 *
 * Renders all canvas entities (shapes, text, images) with selection and manipulation.
 * This component is meant to be rendered inside the Canvas transform container.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  useCanvasEntityStore,
  useCanvasEntitiesMap,
  useSelectedEntityIds,
} from '../../state/useCanvasEntityStore';
import { useToolStore } from '../../state/useToolStore';
import type { CanvasEntity } from '../../types/canvasEntity';
import {
  isCanvasVectorEntity,
  isCanvasTextEntity,
  isCanvasImageEntity,
} from '../../types/canvasEntity';
import {
  CanvasEntityWrapper,
  VectorShapeRenderer,
  TextEntityRenderer,
  ImageEntityRenderer,
  type ResizeHandle,
} from './entities';

// ============================================================================
// Types
// ============================================================================

interface CanvasEntityLayerProps {
  /** Whether we're in edit mode */
  isEditing: boolean;
  /** Viewport zoom level */
  zoom: number;
  /** Grid snap enabled */
  snapToGrid: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Callback when entity drag starts */
  onEntityDragStart?: (entityId: string) => void;
  /** Callback when entity drag ends */
  onEntityDragEnd?: () => void;
}

interface DragState {
  entityId: string;
  startX: number;
  startY: number;
  startEntityX: number;
  startEntityY: number;
  initialPositions: Record<string, { x: number; y: number }>;
}

interface ResizeState {
  entityId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startEntityX: number;
  startEntityY: number;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ENTITY_SIZE = 10;

// ============================================================================
// Component
// ============================================================================

export function CanvasEntityLayer({
  isEditing,
  zoom,
  snapToGrid,
  gridSize,
  onEntityDragStart,
  onEntityDragEnd,
}: CanvasEntityLayerProps) {
  const entitiesMap = useCanvasEntitiesMap();
  const selectedIds = useSelectedEntityIds();

  // Derive sorted entities array with stable reference
  const entities = useMemo(
    () => Array.from(entitiesMap.values()).sort((a, b) => a.zIndex - b.zIndex),
    [entitiesMap]
  );
  const hoveredId = useCanvasEntityStore((s) => s.selection.hoveredId);

  const selectEntity = useCanvasEntityStore((s) => s.selectEntity);
  const deselectAll = useCanvasEntityStore((s) => s.deselectAll);
  const updateEntity = useCanvasEntityStore((s) => s.updateEntity);
  const updateEntities = useCanvasEntityStore((s) => s.updateEntities);
  const setHoveredEntity = useCanvasEntityStore((s) => s.setHoveredEntity);

  const activeTool = useToolStore((s) => s.activeTool);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Snap value to grid
  const snap = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  // Get selected entities
  const selectedEntities = useMemo(
    () => entities.filter((e) => selectedIds.has(e.id)),
    [entities, selectedIds]
  );

  // ============================================================================
  // Entity Mouse Down Handler
  // ============================================================================

  const handleEntityMouseDown = useCallback(
    (e: React.MouseEvent, entity: CanvasEntity) => {
      if (!isEditing || activeTool.category !== 'select') return;

      e.stopPropagation();

      // Handle selection
      selectEntity(entity.id, e.shiftKey);

      // Start drag
      const startX = e.clientX / zoom;
      const startY = e.clientY / zoom;

      // Build initial positions for all selected entities
      const targetIds = new Set(selectedIds);
      targetIds.add(entity.id);

      const initialPositions: Record<string, { x: number; y: number }> = {};
      entities.forEach((ent) => {
        if (targetIds.has(ent.id)) {
          initialPositions[ent.id] = { x: ent.x, y: ent.y };
        }
      });

      setDragState({
        entityId: entity.id,
        startX,
        startY,
        startEntityX: entity.x,
        startEntityY: entity.y,
        initialPositions,
      });

      onEntityDragStart?.(entity.id);
    },
    [isEditing, activeTool, selectEntity, selectedIds, entities, zoom, onEntityDragStart]
  );

  // ============================================================================
  // Resize Mouse Down Handler
  // ============================================================================

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, entity: CanvasEntity, handle: ResizeHandle) => {
      if (!isEditing) return;

      e.stopPropagation();

      const startX = e.clientX / zoom;
      const startY = e.clientY / zoom;

      setResizeState({
        entityId: entity.id,
        handle,
        startX,
        startY,
        startWidth: entity.width,
        startHeight: entity.height,
        startEntityX: entity.x,
        startEntityY: entity.y,
      });
    },
    [isEditing, zoom]
  );

  // ============================================================================
  // Double Click Handler (for text editing)
  // ============================================================================

  const handleEntityDoubleClick = useCallback(
    (e: React.MouseEvent, entity: CanvasEntity) => {
      if (!isEditing) return;
      if (isCanvasTextEntity(entity)) {
        setEditingTextId(entity.id);
      }
    },
    [isEditing]
  );

  // ============================================================================
  // Mouse Move Handler
  // ============================================================================

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX / zoom;
      const currentY = e.clientY / zoom;

      // Handle dragging
      if (dragState) {
        const dx = currentX - dragState.startX;
        const dy = currentY - dragState.startY;

        // Update all selected entities
        const updates = selectedEntities.map((entity) => {
          const initialPos = dragState.initialPositions[entity.id];
          if (!initialPos) return { id: entity.id, updates: {} };

          return {
            id: entity.id,
            updates: {
              x: snap(initialPos.x + dx),
              y: snap(initialPos.y + dy),
            },
          };
        });

        updateEntities(updates);
        return;
      }

      // Handle resizing
      if (resizeState) {
        const dx = currentX - resizeState.startX;
        const dy = currentY - resizeState.startY;

        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;
        let newX = resizeState.startEntityX;
        let newY = resizeState.startEntityY;

        const handle = resizeState.handle;

        // Apply resize based on handle
        if (handle.includes('e')) {
          newWidth = Math.max(MIN_ENTITY_SIZE, resizeState.startWidth + dx);
        }
        if (handle.includes('w')) {
          const widthChange = Math.min(dx, resizeState.startWidth - MIN_ENTITY_SIZE);
          newWidth = resizeState.startWidth - widthChange;
          newX = resizeState.startEntityX + widthChange;
        }
        if (handle.includes('s')) {
          newHeight = Math.max(MIN_ENTITY_SIZE, resizeState.startHeight + dy);
        }
        if (handle.includes('n')) {
          const heightChange = Math.min(dy, resizeState.startHeight - MIN_ENTITY_SIZE);
          newHeight = resizeState.startHeight - heightChange;
          newY = resizeState.startEntityY + heightChange;
        }

        // Snap to grid
        newWidth = snap(newWidth);
        newHeight = snap(newHeight);
        newX = snap(newX);
        newY = snap(newY);

        updateEntity(resizeState.entityId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      if (dragState) {
        onEntityDragEnd?.();
      }
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState,
    resizeState,
    selectedEntities,
    zoom,
    snap,
    updateEntity,
    updateEntities,
    onEntityDragEnd,
  ]);

  // ============================================================================
  // Render Entity Content
  // ============================================================================

  const renderEntityContent = useCallback(
    (entity: CanvasEntity) => {
      if (isCanvasVectorEntity(entity)) {
        return <VectorShapeRenderer entity={entity} />;
      }

      if (isCanvasTextEntity(entity)) {
        return (
          <TextEntityRenderer
            entity={entity}
            isEditing={editingTextId === entity.id}
            onStartEditing={() => setEditingTextId(entity.id)}
            onStopEditing={() => setEditingTextId(null)}
          />
        );
      }

      if (isCanvasImageEntity(entity)) {
        return <ImageEntityRenderer entity={entity} />;
      }

      // Fallback for unknown types
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--sn-bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--sn-text-muted)',
            fontSize: 12,
          }}
        >
          {entity.type}
        </div>
      );
    },
    [editingTextId]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className="canvas-entity-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {entities.map((entity) => (
        <CanvasEntityWrapper
          key={entity.id}
          entity={entity}
          isSelected={selectedIds.has(entity.id)}
          isHovered={hoveredId === entity.id}
          isEditing={isEditing}
          onMouseDown={handleEntityMouseDown}
          onResizeMouseDown={handleResizeMouseDown}
          onDoubleClick={handleEntityDoubleClick}
        >
          {renderEntityContent(entity)}
        </CanvasEntityWrapper>
      ))}
    </div>
  );
}

export default CanvasEntityLayer;
