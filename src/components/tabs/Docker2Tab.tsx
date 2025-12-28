/**
 * StickerNest v2 - Docker 2.0 Tab Content
 * Renders the enhanced Docker 2.0 widget stack inside a tab panel
 */

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { Docker2Container, useDocker2Store } from '../Docker2';
import { useCanvasStore } from '../../state/useCanvasStore';
import type { WidgetInstance } from '../../types/domain';
import type { Docker2TabConfig } from './types';

interface Docker2TabProps {
  /** Tab ID for unique docker state */
  tabId: string;
  /** Tab configuration */
  config: Docker2TabConfig;
  /** Widgets available for docking */
  widgets: WidgetInstance[];
  /** Whether edit mode is active */
  isEditMode: boolean;
  /** Render a widget */
  renderWidget: (widget: WidgetInstance, containerSize: { width: number; height: number }) => React.ReactNode;
  /** Available widget definitions for adding new widgets */
  availableWidgets?: Array<{ id: string; name: string; description?: string; icon?: string }>;
  /** Callback when adding a new widget */
  onAddWidget?: (defId: string) => void;
  /** Callback when widget is docked (to hide from canvas) */
  onDock?: (widgetId: string) => void;
  /** Callback when widget is undocked (to restore to canvas) */
  onUndock?: (widgetId: string, originalPosition: { x: number; y: number }, originalSize: { width: number; height: number }) => void;
  /** Canvas ID for context */
  canvasId?: string;
  /** Panel width from tab system */
  panelWidth?: number;
  /** Panel height (full height) */
  panelHeight?: number;
  /** Currently selected widget IDs on canvas */
  selectedWidgetIds?: string[];
}

export const Docker2Tab: React.FC<Docker2TabProps> = ({
  tabId,
  config,
  widgets,
  isEditMode,
  renderWidget,
  availableWidgets = [],
  onAddWidget,
  onDock,
  onUndock,
  canvasId,
  panelWidth = 400,
  panelHeight,
  selectedWidgetIds = [],
}) => {
  // Store actions
  const {
    dockers,
    createDocker,
    getDocker,
    updateDocker,
    dockWidget,
  } = useDocker2Store();

  // Track widget we're waiting to dock
  const pendingDockWidgetRef = useRef<{ defId: string; timestamp: number } | null>(null);

  // Docker ID from config or create one for this tab
  const dockerId = config.dockerId || `docker2-tab-${tabId}`;

  // Ensure docker exists for this tab
  useEffect(() => {
    const existingDocker = getDocker(dockerId);
    if (!existingDocker) {
      // Create a new docker for this tab
      const newId = createDocker(config.dockerName || 'Widget Stack');
      // Update to use our preferred ID
      if (newId !== dockerId) {
        // Docker was created with a different ID, we need to track it
        // For simplicity, we'll update the config or just use the new ID
      }
    }
  }, [dockerId, config.dockerName, createDocker, getDocker]);

  // Get the docker instance
  const docker = useMemo(() => {
    // Find docker by our ID or find the most recent one for this tab
    return getDocker(dockerId) || dockers.find(d => d.name.includes(tabId)) || dockers[0];
  }, [dockerId, tabId, dockers, getDocker]);

  // Update docker size to match panel
  useEffect(() => {
    if (docker && panelWidth) {
      const newSize = {
        width: panelWidth - 20, // Account for padding
        height: panelHeight || 600,
      };
      if (docker.size.width !== newSize.width || docker.size.height !== newSize.height) {
        updateDocker(docker.id, {
          size: newSize,
          position: { x: 10, y: 10 }, // Relative to panel
        });
      }
    }
  }, [docker, panelWidth, panelHeight, updateDocker]);

  // Get canvas store's updateWidget function
  const updateWidget = useCanvasStore((s) => s.updateWidget);

  // Dock handler - move widget off-canvas to hide it
  const handleDock = useCallback((widget: WidgetInstance) => {
    // Move widget off-canvas so it's hidden
    updateWidget(widget.id, { position: { x: -10000, y: -10000 } });
    onDock?.(widget.id);
  }, [onDock, updateWidget]);

  // Undock handler - restore widget to original position
  const handleUndock = useCallback((widgetId: string) => {
    if (!docker) return;

    const stackedWidget = docker.widgets.find(w => w.widgetId === widgetId);
    if (stackedWidget) {
      // Restore original position
      updateWidget(widgetId, {
        position: stackedWidget.originalPosition,
        width: stackedWidget.originalSize.width,
        height: stackedWidget.originalSize.height,
      });
      onUndock?.(
        widgetId,
        stackedWidget.originalPosition,
        stackedWidget.originalSize
      );
    }
  }, [docker, onUndock, updateWidget]);

  // Handle adding widget - triggers creation and marks pending dock
  const handleAddWidget = useCallback((defId: string) => {
    // Mark this widget def as pending dock
    pendingDockWidgetRef.current = { defId, timestamp: Date.now() };
    // Call parent to create the widget on canvas
    onAddWidget?.(defId);
  }, [onAddWidget]);

  // Watch for pending widgets to dock
  useEffect(() => {
    const pending = pendingDockWidgetRef.current;
    if (!pending || !docker) return;

    // Only look at widgets created in the last 2 seconds
    const timeSinceRequest = Date.now() - pending.timestamp;
    if (timeSinceRequest > 2000) {
      pendingDockWidgetRef.current = null;
      return;
    }

    // Find newly created widget matching our request (position at -1000 or less indicates it's for docking)
    const widgetToDock = widgets.find(w =>
      w.widgetDefId === pending.defId &&
      w.position.x <= -1000 &&
      !docker.widgets.some(dw => dw.widgetId === w.id)
    );

    if (widgetToDock) {
      // Move widget further off-canvas for consistency
      updateWidget(widgetToDock.id, { position: { x: -10000, y: -10000 } });
      // Dock to Docker 2.0
      dockWidget(docker.id, widgetToDock);
      onDock?.(widgetToDock.id);
      pendingDockWidgetRef.current = null;
    }
  }, [widgets, docker, dockWidget, onDock, updateWidget]);

  // Handle docking selected widgets from canvas
  const handleDockSelected = useCallback(() => {
    if (!docker || selectedWidgetIds.length === 0) return;

    // Dock each selected widget
    selectedWidgetIds.forEach(widgetId => {
      const widget = widgets.find(w => w.id === widgetId);
      if (widget && !docker.widgets.some(dw => dw.widgetId === widgetId)) {
        // Move widget off-canvas to hide it
        updateWidget(widgetId, { position: { x: -10000, y: -10000 } });
        dockWidget(docker.id, widget);
        onDock?.(widgetId);
      }
    });
  }, [docker, selectedWidgetIds, widgets, dockWidget, onDock, updateWidget]);

  if (!docker) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: 14,
        }}
      >
        Initializing Docker 2.0...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Docker2Container
        docker={docker}
        widgets={widgets}
        isEditMode={isEditMode}
        onDock={handleDock}
        onUndock={handleUndock}
        renderWidget={renderWidget}
        availableWidgets={availableWidgets}
        onAddWidget={handleAddWidget}
        canvasId={canvasId || tabId}
        fillContainer={true}
        selectedWidgetIds={selectedWidgetIds}
        onDockSelected={handleDockSelected}
      />
    </div>
  );
};

export default Docker2Tab;
