/**
 * StickerNest v2 - Zoom Controls
 *
 * Floating zoom control panel with zoom in/out buttons,
 * zoom level indicator, preset zoom levels, and fit/reset options.
 */

import React, { useState } from 'react';
import styles from './ZoomControls.module.css';

// =============================================================================
// Types
// =============================================================================

interface ZoomControlsProps {
  currentZoom: number;
  zoomLevels?: number[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (level: number) => void;
  onFitToViewport: () => void;
  onResetViewport: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

// =============================================================================
// Component
// =============================================================================

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  currentZoom,
  zoomLevels = DEFAULT_ZOOM_LEVELS,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  onFitToViewport,
  onResetViewport,
}) => {
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const zoomPercentage = Math.round(currentZoom * 100);

  return (
    <div className={styles.container}>
      {/* Zoom out */}
      <button
        className={styles.button}
        onClick={onZoomOut}
        title="Zoom out (Ctrl + -)"
        aria-label="Zoom out"
      >
        −
      </button>

      {/* Current zoom level button */}
      <button
        className={styles.zoomLevel}
        onClick={() => setShowZoomMenu(!showZoomMenu)}
        title="Click for zoom presets"
        aria-label={`Current zoom: ${zoomPercentage}%`}
      >
        {zoomPercentage}%
      </button>

      {/* Zoom in */}
      <button
        className={styles.button}
        onClick={onZoomIn}
        title="Zoom in (Ctrl + +)"
        aria-label="Zoom in"
      >
        +
      </button>

      {/* Fit to viewport */}
      <button
        className={styles.iconButton}
        onClick={onFitToViewport}
        title="Fit canvas to viewport"
        aria-label="Fit to viewport"
      >
        ⤢
      </button>

      {/* Reset zoom */}
      <button
        className={styles.iconButton}
        onClick={onResetViewport}
        title="Reset to 100% (Ctrl + 0)"
        aria-label="Reset zoom"
      >
        ↺
      </button>

      {/* Zoom level menu */}
      {showZoomMenu && (
        <div className={styles.menu}>
          {zoomLevels.map(level => (
            <button
              key={level}
              className={`${styles.menuItem} ${currentZoom === level ? styles.active : ''}`}
              onClick={() => {
                onZoomTo(level);
                setShowZoomMenu(false);
              }}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
          <div className={styles.menuDivider} />
          <button
            className={styles.menuItem}
            onClick={() => {
              onFitToViewport();
              setShowZoomMenu(false);
            }}
          >
            Fit to Viewport
          </button>
        </div>
      )}
    </div>
  );
};

export default ZoomControls;
