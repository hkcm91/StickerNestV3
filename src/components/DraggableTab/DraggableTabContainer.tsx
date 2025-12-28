/**
 * StickerNest v2 - Draggable Tab Container
 *
 * A modular slideout tab container with draggable button and multiple content types.
 * Supports widget docker, URL preview, and canvas tabs.
 * Uses the draggable button hook for positioning.
 */

import React from 'react';
import { X, Settings } from 'lucide-react';
import { useDraggableButton } from '../../hooks/useDraggableButton';
import { TabContentRenderer } from '../tabs';
import type { Tab } from '../../state/useTabsStore';
import type { TabConfig } from '../tabs/types';
import type { WidgetInstance } from '../../types/domain';
import type { DockedWidget } from '../WidgetDocker';
import type { WidgetManifest } from '../../types/manifest';

interface DraggableTabContainerProps {
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
  /** Docked widget IDs */
  dockedIds: string[];
  /** Is edit mode */
  isEditMode: boolean;
  /** Toggle docker visibility */
  toggleDocker: () => void;
  /** Dock a widget */
  onDock: (widget: WidgetInstance) => DockedWidget;
  /** Undock a widget */
  onUndock: (widgetId: string) => DockedWidget | undefined;
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

export const DraggableTabContainer: React.FC<DraggableTabContainerProps> = ({
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
  dockedIds,
  isEditMode,
  toggleDocker,
  onDock,
  onUndock,
  renderWidget,
  availableWidgets = [],
  onAddWidget,
  canvasId,
  tabConfig,
  tabIcon,
  onConfigChange,
  accentColor = '#8b5cf6',
  selectedWidgetIds = [],
}) => {
  // Use draggable button hook
  const {
    buttonRef,
    isDragging,
    isTransitioning,
    handleMouseDown,
    handleTouchStart,
    handleClick,
  } = useDraggableButton({
    verticalPosition: buttonVerticalPosition,
    side: buttonSide,
    onVerticalPositionChange: setButtonVerticalPosition,
    onSideChange: setButtonSide,
  });

  const effectiveSide = buttonSide;

  // Render widget for docker
  const renderDockerWidget = React.useCallback(
    (widget: WidgetInstance, containerSize: { width: number; height: number }) => {
      return renderWidget(widget);
    },
    [renderWidget]
  );

  // Get tab type icon
  const displayIcon = tabIcon || (tabConfig?.type === 'url-preview' ? 'U' : tabConfig?.type === 'canvas' ? 'C' : 'W');

  // Create a Tab object for the renderer
  const tab: Tab = {
    id: tabId,
    title,
    buttonVerticalPosition,
    buttonSide,
    isOpen,
    panelWidth,
    createdAt: 0,
    config: tabConfig,
    icon: displayIcon,
  };

  return (
    <>
      {/* Panel Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [effectiveSide]: 0,
          width: isOpen ? panelWidth : 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--sn-glass-bg-heavy, rgba(15, 15, 25, 0.98))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRight: effectiveSide === 'left' ? '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))' : undefined,
          borderLeft: effectiveSide === 'right' ? '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))' : undefined,
          boxShadow: isOpen ? '4px 0 24px rgba(0, 0, 0, 0.4)' : 'none',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {/* Panel Header */}
        {isOpen && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--sn-text-primary)',
                margin: 0,
              }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sn-text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="Close tab"
              title="Close tab"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Content */}
        {isOpen && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TabContentRenderer
              tab={tab}
              panelWidth={panelWidth}
              accentColor={accentColor}
              widgets={widgets}
              dockedIds={dockedIds}
              isEditMode={isEditMode}
              onToggleDocker={toggleDocker}
              onDock={onDock}
              onUndock={onUndock}
              renderWidget={renderDockerWidget}
              availableWidgets={availableWidgets}
              onAddWidget={onAddWidget}
              canvasId={canvasId || tabId}
              onConfigChange={onConfigChange}
              selectedWidgetIds={selectedWidgetIds}
            />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={(e) => handleClick(e, togglePanel)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          top: `${buttonVerticalPosition}%`,
          [effectiveSide]: isOpen ? panelWidth - 1 : 0,
          transform: `translateY(-50%)${isDragging ? ' scale(1.1)' : ''}`,
          width: 24,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: effectiveSide === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          transition: isTransitioning && !isDragging
            ? 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease'
            : 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
          zIndex: 101,
          opacity: isDragging ? 0.9 : 0.75,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.opacity = '0.75';
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }
        }}
        aria-label={isOpen ? `Close ${title}` : `Open ${title}`}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>{displayIcon}</div>
      </button>
    </>
  );
};

export default DraggableTabContainer;


