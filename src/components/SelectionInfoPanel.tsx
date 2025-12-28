/**
 * StickerNest v2 - Selection Info Panel
 *
 * Displays information about the currently selected widget(s)
 * in edit mode. Shows position, size, rotation, and z-index.
 */

import React from 'react';
import { WidgetInstance } from '../types/domain';
import styles from './SelectionInfoPanel.module.css';

// =============================================================================
// Types
// =============================================================================

interface SelectionInfoPanelProps {
  widgets: WidgetInstance[];
  selectedIds: Set<string>;
  isEditMode: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const SelectionInfoPanel: React.FC<SelectionInfoPanelProps> = ({
  widgets,
  selectedIds,
  isEditMode,
}) => {
  if (!isEditMode || selectedIds.size === 0) return null;

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
      <div className={styles.panel}>
        <div className={styles.multiSelectTitle}>
          {selectedCount} widgets selected
        </div>
        <div className={styles.info}>
          Bounds: ({Math.round(bounds.minX)}, {Math.round(bounds.minY)})
        </div>
        <div className={styles.info}>
          Size: {Math.round(bounds.maxX - bounds.minX)} x {Math.round(bounds.maxY - bounds.minY)}
        </div>
        <div className={styles.hint}>
          Shift+Click to add/remove
        </div>
      </div>
    );
  }

  // Single selection info
  const widget = widgets.find(w => selectedIds.has(w.id));
  if (!widget) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.info}>ID: {widget.id.slice(0, 12)}...</div>
      <div className={styles.info}>Pos: ({widget.position.x}, {widget.position.y})</div>
      <div className={styles.info}>Size: {widget.width} x {widget.height}</div>
      <div className={styles.info}>Rotation: {widget.rotation.toFixed(1)}°</div>
      <div className={styles.info}>Z-Index: {widget.zIndex}</div>
    </div>
  );
};

export default SelectionInfoPanel;
