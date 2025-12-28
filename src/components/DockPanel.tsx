/**
 * StickerNest v2 - Dock Panel
 * A dockable panel component for widget management.
 * This is a stub implementation - full functionality to be implemented later.
 */

import React from 'react';
import { WidgetInstance, DockZone } from '../types/domain';
import { CanvasRuntime } from '../runtime/CanvasRuntime';

interface DockPanelProps {
  zone: DockZone;
  widgets: WidgetInstance[];
  isEditMode: boolean;
  onWidgetSelect?: (widgetId: string) => void;
  onWidgetUndock?: (widgetId: string) => void;
  onZoneUpdate?: (zoneId: string, updates: Partial<DockZone>) => void;
  canvasBounds?: { width: number; height: number };
  canvasRuntime?: CanvasRuntime;
  onDockWidget?: (widgetId: string) => void;
  onDockDefinition?: (defId: string, source: string) => void;
}

/**
 * Dock Panel Component
 * Displays docked widgets in a sidebar or bottom panel.
 */
export const DockPanel: React.FC<DockPanelProps> = ({
  zone,
  widgets,
  isEditMode,
  onWidgetSelect,
  onWidgetUndock,
  onZoneUpdate,
  canvasBounds,
  canvasRuntime,
  onDockWidget,
  onDockDefinition,
}) => {
  // Get position styles based on zone position
  const getPositionStyles = (): React.CSSProperties => {
    switch (zone.position) {
      case 'left':
        return {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: zone.size.width,
        };
      case 'right':
        return {
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: zone.size.width,
        };
      case 'bottom':
        return {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: zone.size.height,
        };
      case 'top':
        return {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: zone.size.height,
        };
      default:
        return {
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: zone.size.width,
        };
    }
  };

  if (!zone.visible && widgets.length === 0) {
    return null;
  }

  return (
    <div
      className="sn-dock-panel"
      style={{
        ...getPositionStyles(),
        backgroundColor: 'var(--sn-bg-surface)',
        borderLeft: zone.position === 'right' ? '1px solid var(--sn-border-primary)' : undefined,
        borderRight: zone.position === 'left' ? '1px solid var(--sn-border-primary)' : undefined,
        borderTop: zone.position === 'bottom' ? '1px solid var(--sn-border-primary)' : undefined,
        borderBottom: zone.position === 'top' ? '1px solid var(--sn-border-primary)' : undefined,
        display: 'flex',
        flexDirection: zone.position === 'bottom' || zone.position === 'top' ? 'row' : 'column',
        gap: 8,
        padding: 8,
        overflow: 'auto',
        zIndex: 100,
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--sn-border-secondary)',
          marginBottom: 8,
        }}
      >
        <span style={{ color: 'var(--sn-text-secondary)', fontSize: 12, fontWeight: 500 }}>
          Docked Widgets ({widgets.length})
        </span>
        {isEditMode && onZoneUpdate && (
          <button
            onClick={() => onZoneUpdate(zone.id, { visible: false })}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--sn-text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: 4,
            }}
            title="Close dock panel"
          >
            ×
          </button>
        )}
      </div>

      {/* Docked Widgets */}
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="sn-docked-widget"
          style={{
            background: 'var(--sn-bg-elevated)',
            borderRadius: 8,
            padding: 8,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onClick={() => onWidgetSelect?.(widget.id)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: 'var(--sn-text-primary)', fontSize: 12 }}>
              {widget.widgetDefId.split('/').pop() || widget.id.slice(0, 8)}
            </span>
            {isEditMode && onWidgetUndock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWidgetUndock(widget.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--sn-text-muted)',
                  cursor: 'pointer',
                  fontSize: 10,
                  padding: '2px 4px',
                }}
                title="Undock widget"
              >
                Undock
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {widgets.length === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--sn-text-muted)',
            fontSize: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          Drag widgets here to dock them
        </div>
      )}
    </div>
  );
};

export default DockPanel;
