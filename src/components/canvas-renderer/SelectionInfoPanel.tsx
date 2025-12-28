/**
 * SelectionInfoPanel
 * Displays information about selected widgets (single or multi-select)
 */

import React from 'react';
import type { WidgetInstance } from '../../types/domain';

interface SelectionInfoPanelProps {
  selectedIds: Set<string>;
  widgets: WidgetInstance[];
  visible: boolean;
}

export const SelectionInfoPanel: React.FC<SelectionInfoPanelProps> = ({
  selectedIds,
  widgets,
  visible,
}) => {
  if (!visible || selectedIds.size === 0) return null;

  const selectedCount = selectedIds.size;

  if (selectedCount > 1) {
    // Multi-select info
    const selectedWidgets = widgets.filter(w => selectedIds.has(w.id));
    const bounds = selectedWidgets.reduce(
      (acc, w) => ({
        minX: Math.min(acc.minX, w.position.x),
        maxX: Math.max(acc.maxX, w.position.x + w.width),
        minY: Math.min(acc.minY, w.position.y),
        maxY: Math.max(acc.maxY, w.position.y + w.height),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    return (
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        padding: 8,
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        borderRadius: 4,
        fontSize: 10,
        fontFamily: 'monospace',
        zIndex: 1000
      }}>
        <div style={{ color: '#4a9eff', fontWeight: 'bold' }}>
          {selectedCount} widgets selected
        </div>
        <div>Bounds: ({Math.round(bounds.minX)}, {Math.round(bounds.minY)})</div>
        <div>Size: {Math.round(bounds.maxX - bounds.minX)} x {Math.round(bounds.maxY - bounds.minY)}</div>
        <div style={{ marginTop: 4, color: '#888', fontSize: 9 }}>
          Shift+Click to add/remove
        </div>
      </div>
    );
  }

  // Single selection info
  const widget = widgets.find(w => selectedIds.has(w.id));
  if (!widget) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 8,
      left: 8,
      padding: 8,
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      borderRadius: 4,
      fontSize: 10,
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <div>ID: {widget.id.slice(0, 12)}...</div>
      <div>Pos: ({widget.position.x}, {widget.position.y})</div>
      <div>Size: {widget.width} x {widget.height}</div>
      <div>Rotation: {widget.rotation.toFixed(1)}°</div>
      <div>Z-Index: {widget.zIndex}</div>
    </div>
  );
};
