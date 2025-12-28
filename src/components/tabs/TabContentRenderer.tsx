/**
 * StickerNest v2 - Tab Content Renderer
 * Dispatches to the correct tab content component based on tab type
 */

import React from 'react';
import { WidgetDockerTab } from './WidgetDockerTab';
import { Docker2Tab } from './Docker2Tab';
import { UrlPreviewTab } from './UrlPreviewTab';
import { CanvasTab } from './CanvasTab';
import {
  isWidgetDockerConfig,
  isDocker2Config,
  isUrlPreviewConfig,
  isCanvasConfig,
} from './types';
import type { Tab } from '../../state/useTabsStore';
import type { TabConfig } from './types';
import type { WidgetInstance } from '../../types/domain';
import type { DockedWidget } from '../WidgetDocker';

interface TabContentRendererProps {
  /** The tab to render */
  tab: Tab;
  /** Panel width */
  panelWidth: number;
  /** Accent color */
  accentColor?: string;

  // Widget Docker Props (passed through for widget-docker type)
  /** Widgets available for docking */
  widgets?: WidgetInstance[];
  /** IDs of currently docked widgets */
  dockedIds?: string[];
  /** Whether edit mode is active */
  isEditMode?: boolean;
  /** Toggle docker visibility */
  onToggleDocker?: () => void;
  /** Dock a widget */
  onDock?: (widget: WidgetInstance) => DockedWidget;
  /** Undock a widget */
  onUndock?: (widgetId: string) => DockedWidget | undefined;
  /** Render a widget */
  renderWidget?: (widget: WidgetInstance, containerSize: { width: number; height: number }) => React.ReactNode;
  /** Available widget definitions */
  availableWidgets?: Array<{ id: string; name: string; description?: string; icon?: string }>;
  /** Callback when adding a new widget */
  onAddWidget?: (defId: string) => void;
  /** Canvas ID for context */
  canvasId?: string;
  /** Currently selected widget IDs on canvas */
  selectedWidgetIds?: string[];

  // Config change callback
  /** Callback to update tab configuration */
  onConfigChange?: (tabId: string, config: Partial<TabConfig>) => void;
}

export const TabContentRenderer: React.FC<TabContentRendererProps> = ({
  tab,
  panelWidth,
  accentColor = '#8b5cf6',
  widgets = [],
  dockedIds = [],
  isEditMode = false,
  onToggleDocker,
  onDock,
  onUndock,
  renderWidget,
  availableWidgets = [],
  onAddWidget,
  canvasId,
  selectedWidgetIds = [],
  onConfigChange,
}) => {
  // Default to widget-docker if no config
  const config = tab.config || { type: 'widget-docker' as const };

  // Handle config change
  const handleConfigChange = (updates: Partial<TabConfig>) => {
    onConfigChange?.(tab.id, updates);
  };

  // Default dock functions that return proper types
  const defaultDock = (widget: WidgetInstance): DockedWidget => ({
    widgetId: widget.id,
    originalPos: widget.position,
    originalSize: { width: widget.width, height: widget.height },
    originalZ: widget.zIndex,
    originalRot: widget.rotation,
  });

  const defaultUndock = (): DockedWidget | undefined => undefined;

  // Render based on tab type
  if (isWidgetDockerConfig(config)) {
    return (
      <WidgetDockerTab
        tabId={tab.id}
        config={config}
        widgets={widgets}
        dockedIds={dockedIds}
        isEditMode={isEditMode}
        onToggle={onToggleDocker || (() => {})}
        onDock={onDock || defaultDock}
        onUndock={onUndock || defaultUndock}
        renderWidget={renderWidget || (() => null)}
        availableWidgets={availableWidgets}
        onAddWidget={onAddWidget}
        canvasId={canvasId}
      />
    );
  }

  // Docker 2.0 - Enhanced widget stack
  if (isDocker2Config(config)) {
    // Adapt onDock callback: Docker2Tab expects (widgetId: string) => void
    const handleDocker2Dock = (widgetId: string) => {
      const widget = widgets.find(w => w.id === widgetId);
      if (widget && onDock) {
        onDock(widget);
      }
    };

    // Adapt onUndock callback: Docker2Tab provides original position/size
    const handleDocker2Undock = (
      widgetId: string,
      originalPosition: { x: number; y: number },
      originalSize: { width: number; height: number }
    ) => {
      onUndock?.(widgetId);
    };

    return (
      <Docker2Tab
        tabId={tab.id}
        config={config}
        widgets={widgets}
        isEditMode={isEditMode}
        renderWidget={renderWidget || (() => null)}
        availableWidgets={availableWidgets}
        onAddWidget={onAddWidget}
        onDock={handleDocker2Dock}
        onUndock={handleDocker2Undock}
        canvasId={canvasId}
        panelWidth={panelWidth}
        selectedWidgetIds={selectedWidgetIds}
      />
    );
  }

  if (isUrlPreviewConfig(config)) {
    return (
      <UrlPreviewTab
        tabId={tab.id}
        config={config}
        onConfigChange={handleConfigChange}
        accentColor={accentColor}
      />
    );
  }

  if (isCanvasConfig(config)) {
    return (
      <CanvasTab
        tabId={tab.id}
        config={config}
        onConfigChange={handleConfigChange}
        accentColor={accentColor}
        panelWidth={panelWidth}
      />
    );
  }

  // Fallback for unknown type
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: 13,
      }}
    >
      Unknown tab type
    </div>
  );
};

export default TabContentRenderer;
