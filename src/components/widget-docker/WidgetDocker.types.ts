/**
 * Widget Docker Types
 * Type definitions for the docker system
 */

import type { WidgetInstance } from '../../types/domain';

/** State of a docked widget */
export interface DockedWidget {
  widgetId: string;
  originalPos: { x: number; y: number };
  originalSize: { width: number; height: number };
  originalZ: number;
  originalRot: number;
}

/** Docker instance configuration */
export interface DockerInstance {
  id: string;
  name: string;
  dockedIds: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
  activeTab: number;
}

/** Docker preset for saving/loading configurations */
export interface DockerPreset {
  id: string;
  name: string;
  savedAt: number;
  dockers: DockerInstance[];
}

/** Props for the main WidgetDocker component */
export interface WidgetDockerProps {
  widgets: WidgetInstance[];
  dockedIds: string[];
  visible: boolean;
  isEditMode: boolean;
  onToggle: () => void;
  onDock: (widget: WidgetInstance) => DockedWidget;
  onUndock: (widgetId: string) => DockedWidget | undefined;
  renderWidget: (widget: WidgetInstance, containerSize: { width: number; height: number }) => React.ReactNode;
  availableWidgets?: Array<{ id: string; name: string; description?: string; icon?: string }>;
  onAddWidget?: (defId: string) => void;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  canvasId?: string;
}
