/**
 * StickerNest - SpatialWidgetContainer
 *
 * Container component that renders multiple widgets in 3D space.
 * Manages widget selection, transforms, and visibility.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import type { WidgetInstance } from '../../../types/domain';
import { useActiveSpatialMode } from '../../../state/useSpatialModeStore';
import { toSpatialPosition, toSpatialSize, DEFAULT_WIDGET_Z } from '../../../utils/spatialCoordinates';
import { SpatialWidget } from './SpatialWidget';

// ============================================================================
// Types
// ============================================================================

export interface SpatialWidgetContainerProps {
  /** Widget instances to render */
  widgets: WidgetInstance[];
  /** Currently selected widget ID */
  selectedWidgetId?: string;
  /** Called when a widget is selected */
  onWidgetSelect?: (widgetId: string) => void;
  /** Called when widget transforms change */
  onWidgetTransformChange?: (
    widgetId: string,
    transform: {
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: number;
      size?: { width: number; height: number };
    }
  ) => void;
  /** Base Z position for all widgets */
  baseZ?: number;
  /** Enable interactions */
  interactive?: boolean;
  /** Show debug info */
  debug?: boolean;
  /** Force render even in desktop mode (for transitions) */
  forceRender?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function SpatialWidgetContainer({
  widgets,
  selectedWidgetId,
  onWidgetSelect,
  onWidgetTransformChange,
  baseZ = DEFAULT_WIDGET_Z,
  interactive = true,
  debug = false,
  forceRender = false,
}: SpatialWidgetContainerProps) {
  const spatialMode = useActiveSpatialMode();

  // Filter to visible widgets only
  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => w.visible !== false);
  }, [widgets]);

  // Handle widget click
  const handleWidgetClick = useCallback(
    (widget: WidgetInstance) => {
      onWidgetSelect?.(widget.id);
    },
    [onWidgetSelect]
  );

  // Handle position change
  const handlePositionChange = useCallback(
    (widgetId: string, position: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { position });
    },
    [onWidgetTransformChange]
  );

  // Handle rotation change
  const handleRotationChange = useCallback(
    (widgetId: string, rotation: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { rotation });
    },
    [onWidgetTransformChange]
  );

  // Handle size change
  const handleSizeChange = useCallback(
    (widgetId: string, width: number, height: number) => {
      onWidgetTransformChange?.(widgetId, { size: { width, height } });
    },
    [onWidgetTransformChange]
  );

  // Debug logging
  useEffect(() => {
    console.log('[SpatialWidgetContainer] Rendering state:', {
      spatialMode,
      forceRender,
      shouldRender: spatialMode !== 'desktop' || forceRender,
      totalWidgets: widgets.length,
      visibleWidgets: visibleWidgets.length,
    });

    if (debug) {
      visibleWidgets.forEach((w, i) => {
        const pos3D = toSpatialPosition(w.position, DEFAULT_WIDGET_Z);
        const size3D = toSpatialSize({ width: w.width, height: w.height });
        console.log(`[Widget ${i}] "${w.name || w.widgetDefId}":`, {
          '2D pos': w.position,
          '2D size': { width: w.width, height: w.height },
          '3D pos': pos3D,
          '3D size': size3D,
        });
      });
    }
  }, [spatialMode, forceRender, widgets.length, visibleWidgets, debug]);

  // Only render in VR/AR modes (or when forceRender is true)
  if (spatialMode === 'desktop' && !forceRender) {
    console.log('[SpatialWidgetContainer] Not rendering - desktop mode and forceRender=false');
    return null;
  }

  return (
    <group name="spatial-widget-container">
      {visibleWidgets.map((widget, index) => (
        <SpatialWidget
          key={widget.id}
          widget={widget}
          selected={widget.id === selectedWidgetId}
          onClick={handleWidgetClick}
          onPositionChange={handlePositionChange}
          onRotationChange={handleRotationChange}
          onSizeChange={handleSizeChange}
          zOffset={index * 0.05}
          interactive={interactive}
          debug={debug}
          accentColor="#8b5cf6"
        />
      ))}
    </group>
  );
}

export default SpatialWidgetContainer;
