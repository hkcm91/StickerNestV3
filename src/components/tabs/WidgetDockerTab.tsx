/**
 * StickerNest v2 - Widget Docker Tab Content
 * Renders a widget docker inside a tab panel
 */

import React from 'react';
import { WidgetDocker, type DockedWidget } from '../WidgetDocker';
import type { WidgetInstance } from '../../types/domain';
import type { WidgetDockerTabConfig } from './types';

interface WidgetDockerTabProps {
  /** Tab ID for unique docker state */
  tabId: string;
  /** Tab configuration */
  config: WidgetDockerTabConfig;
  /** Widgets available for docking */
  widgets: WidgetInstance[];
  /** IDs of currently docked widgets */
  dockedIds: string[];
  /** Whether edit mode is active */
  isEditMode: boolean;
  /** Toggle docker visibility */
  onToggle: () => void;
  /** Dock a widget */
  onDock: (widget: WidgetInstance) => DockedWidget;
  /** Undock a widget */
  onUndock: (widgetId: string) => DockedWidget | undefined;
  /** Render a widget */
  renderWidget: (widget: WidgetInstance, containerSize: { width: number; height: number }) => React.ReactNode;
  /** Available widget definitions for adding new widgets */
  availableWidgets?: Array<{ id: string; name: string; description?: string; icon?: string }>;
  /** Callback when adding a new widget */
  onAddWidget?: (defId: string) => void;
  /** Canvas ID for context */
  canvasId?: string;
}

export const WidgetDockerTab: React.FC<WidgetDockerTabProps> = ({
  tabId,
  config,
  widgets,
  dockedIds,
  isEditMode,
  onToggle,
  onDock,
  onUndock,
  renderWidget,
  availableWidgets = [],
  onAddWidget,
  canvasId,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <WidgetDocker
        widgets={widgets}
        dockedIds={dockedIds}
        visible={true}
        isEditMode={isEditMode}
        onToggle={onToggle}
        onDock={onDock}
        onUndock={onUndock}
        renderWidget={renderWidget}
        availableWidgets={availableWidgets}
        onAddWidget={onAddWidget}
        canvasId={config.dockerId || canvasId || tabId}
      />
    </div>
  );
};

export default WidgetDockerTab;
