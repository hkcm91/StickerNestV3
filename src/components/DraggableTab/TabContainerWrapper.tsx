/**
 * StickerNest v2 - Tab Container Wrapper
 * Wrapper component that properly manages docker state for each tab
 */

import React from 'react';
import { useDockerState } from '../widget-docker/hooks/useDockerState';
import { DraggableTabContainer } from './DraggableTabContainer';
import type { WidgetInstance } from '../../types/domain';
import type { TabConfig } from '../tabs/types';

interface TabContainerWrapperProps {
  /** Tab ID */
  tabId: string;
  /** Tab title */
  title: string;
  /** Whether panel is open */
  isOpen: boolean;
  /** Panel width */
  panelWidth: number;
  /** Button vertical position */
  buttonVerticalPosition: number;
  /** Button side */
  buttonSide: 'left' | 'right';
  /** Toggle panel open/closed */
  togglePanel: () => void;
  /** Close/delete tab */
  onClose: () => void;
  /** Set button vertical position */
  setButtonVerticalPosition: (position: number) => void;
  /** Set button side */
  setButtonSide: (side: 'left' | 'right') => void;
  /** Widgets for docker */
  widgets: WidgetInstance[];
  /** Is edit mode */
  isEditMode: boolean;
  /** Render widget function */
  renderWidget: (widget: WidgetInstance) => React.ReactNode;
  /** Available widgets for docker */
  availableWidgets?: Array<{ id: string; name: string; description?: string; icon?: string }>;
  /** Add widget callback */
  onAddWidget?: (defId: string) => void;
  /** Canvas ID */
  canvasId?: string;
  /** Tab configuration */
  tabConfig?: TabConfig;
  /** Tab icon */
  tabIcon?: string;
  /** Callback to update tab configuration */
  onConfigChange?: (tabId: string, config: Partial<TabConfig>) => void;
  /** Accent color */
  accentColor?: string;
  /** Currently selected widget IDs on canvas */
  selectedWidgetIds?: string[];
}

export const TabContainerWrapper: React.FC<TabContainerWrapperProps> = ({
  tabId,
  title,
  isOpen,
  panelWidth,
  buttonVerticalPosition,
  buttonSide,
  togglePanel,
  onClose,
  setButtonVerticalPosition,
  setButtonSide,
  widgets,
  isEditMode,
  renderWidget,
  availableWidgets = [],
  onAddWidget,
  canvasId,
  tabConfig,
  tabIcon,
  onConfigChange,
  accentColor,
  selectedWidgetIds = [],
}) => {
  // Create docker state for this tab (only used for widget-docker type)
  const tabDocker = useDockerState(`${tabId}-docker`);

  return (
    <DraggableTabContainer
      tabId={tabId}
      title={title}
      isOpen={isOpen}
      panelWidth={panelWidth}
      buttonVerticalPosition={buttonVerticalPosition}
      buttonSide={buttonSide}
      togglePanel={togglePanel}
      onClose={onClose}
      setButtonVerticalPosition={setButtonVerticalPosition}
      setButtonSide={setButtonSide}
      widgets={widgets}
      dockedIds={tabDocker.dockedIds}
      isEditMode={isEditMode}
      toggleDocker={() => tabDocker.toggle()}
      onDock={(widget) => tabDocker.dock(widget)}
      onUndock={(widgetId) => tabDocker.undock(widgetId)}
      renderWidget={renderWidget}
      availableWidgets={availableWidgets}
      onAddWidget={onAddWidget}
      canvasId={canvasId || tabId}
      tabConfig={tabConfig}
      tabIcon={tabIcon}
      onConfigChange={onConfigChange}
      accentColor={accentColor}
      selectedWidgetIds={selectedWidgetIds}
    />
  );
};


