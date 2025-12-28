/**
 * StickerNest v2 - Canvas Controls
 * Mode toggle, zoom controls, and status indicators
 */

import React, { memo, useCallback } from 'react';
import { useViewport as useResponsiveViewport, useSafeArea } from '../../hooks/useResponsive';
import { haptic } from '../../utils/haptics';
import type { CanvasMode } from '../MainCanvas';

// ============================================================================
// MODE TOGGLE
// ============================================================================

interface ModeToggleProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  accentColor: string;
}

export const ModeToggle = memo(function ModeToggle({
  mode,
  onModeChange,
  accentColor,
}: ModeToggleProps) {
  const handleClick = useCallback((newMode: CanvasMode) => {
    haptic('light');
    onModeChange(newMode);
  }, [onModeChange]);

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'rgba(15, 15, 25, 0.9)',
        borderRadius: 8,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}
    >
      {(['view', 'edit'] as CanvasMode[]).map((m) => (
        <button
          key={m}
          onClick={() => handleClick(m)}
          style={{
            padding: '8px 16px',
            minWidth: 44,
            minHeight: 44,
            background: mode === m ? accentColor : 'transparent',
            color: mode === m ? '#fff' : '#94a3b8',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            textTransform: 'capitalize',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
});

// ============================================================================
// ZOOM CONTROLS
// ============================================================================

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minZoom?: number;
  maxZoom?: number;
  accentColor: string;
}

export const ZoomControls = memo(function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom = 0.1,
  maxZoom = 5,
  accentColor,
}: ZoomControlsProps) {
  const handleZoomIn = useCallback(() => {
    haptic('light');
    onZoomIn();
  }, [onZoomIn]);

  const handleZoomOut = useCallback(() => {
    haptic('light');
    onZoomOut();
  }, [onZoomOut]);

  const handleReset = useCallback(() => {
    haptic('light');
    onReset();
  }, [onReset]);

  const buttonStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    background: `${accentColor}33`,
    border: 'none',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(15, 15, 25, 0.9)',
        borderRadius: 8,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}
    >
      <button
        onClick={handleZoomOut}
        disabled={zoom <= minZoom}
        style={{
          ...buttonStyle,
          opacity: zoom <= minZoom ? 0.4 : 1,
          cursor: zoom <= minZoom ? 'not-allowed' : 'pointer',
        }}
        aria-label="Zoom out"
      >
        −
      </button>

      <span
        style={{
          fontSize: 12,
          color: '#94a3b8',
          minWidth: 50,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={handleZoomIn}
        disabled={zoom >= maxZoom}
        style={{
          ...buttonStyle,
          opacity: zoom >= maxZoom ? 0.4 : 1,
          cursor: zoom >= maxZoom ? 'not-allowed' : 'pointer',
        }}
        aria-label="Zoom in"
      >
        +
      </button>

      <button
        onClick={handleReset}
        style={{
          ...buttonStyle,
          width: 'auto',
          padding: '0 12px',
          fontSize: 11,
          color: '#94a3b8',
        }}
        aria-label="Reset zoom"
      >
        Reset
      </button>
    </div>
  );
});

// ============================================================================
// SAVE INDICATOR
// ============================================================================

interface SaveIndicatorProps {
  hasUnsavedChanges: boolean;
  hideOnMobile?: boolean;
}

export const SaveIndicator = memo(function SaveIndicator({
  hasUnsavedChanges,
  hideOnMobile = true,
}: SaveIndicatorProps) {
  const { isMobile } = useResponsiveViewport();

  // Hide on mobile to reduce anxiety before user understands app
  if (!hasUnsavedChanges || (hideOnMobile && isMobile)) return null;

  return (
    <div
      style={{
        padding: '6px 12px',
        background: 'rgba(251, 191, 36, 0.2)',
        color: '#fbbf24',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      Unsaved changes
    </div>
  );
});

// ============================================================================
// MODE HINT
// ============================================================================

interface ModeHintProps {
  mode: CanvasMode;
}

export const ModeHint = memo(function ModeHint({ mode }: ModeHintProps) {
  const { isMobile } = useResponsiveViewport();

  const hints: Record<CanvasMode, string> = {
    view: isMobile
      ? 'Pinch to zoom • Tap widgets to interact'
      : 'Click widgets to interact • Switch to Edit mode to customize',
    edit: isMobile
      ? 'Drag to move • Long-press handles to resize'
      : 'Drag to move • Corners to resize • Del to delete',
    preview: 'Preview mode • Interactions disabled',
  };

  return (
    <div
      style={{
        padding: '6px 12px',
        background: 'rgba(15, 15, 25, 0.9)',
        borderRadius: 6,
        fontSize: 11,
        color: '#64748b',
      }}
    >
      {hints[mode]}
    </div>
  );
});

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  mode: CanvasMode;
}

export const EmptyState = memo(function EmptyState({ mode }: EmptyStateProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#94a3b8',
            marginBottom: 8,
          }}
        >
          Empty Canvas
        </div>
        <div style={{ fontSize: 14 }}>
          {mode === 'edit'
            ? 'Add widgets from the library to get started'
            : 'Switch to Edit mode to add widgets'}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// CANVAS CONTROLS LAYOUT
// ============================================================================

interface CanvasControlsLayoutProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  hasUnsavedChanges: boolean;
  showModeToggle?: boolean;
  showZoomControls?: boolean;
  showModeHint?: boolean;
  accentColor: string;
}

export const CanvasControlsLayout = memo(function CanvasControlsLayout({
  mode,
  onModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  hasUnsavedChanges,
  showModeToggle = true,
  showZoomControls = true,
  showModeHint = true,
  accentColor,
}: CanvasControlsLayoutProps) {
  const { isMobile } = useResponsiveViewport();
  const safeArea = useSafeArea();

  return (
    <>
      {/* Top-left: Mode toggle - hidden on mobile */}
      {showModeToggle && !isMobile && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 100,
          }}
        >
          <ModeToggle
            mode={mode}
            onModeChange={onModeChange}
            accentColor={accentColor}
          />
        </div>
      )}


      {/* Bottom-right: Zoom controls - hidden on mobile */}
      {!isMobile && showZoomControls && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 100,
          }}
        >
          <ZoomControls
            zoom={zoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onZoomReset}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Bottom-left: Mode hint - hidden on mobile or when showModeHint is false */}
      {!isMobile && showModeHint && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 100,
          }}
        >
          <ModeHint mode={mode} />
        </div>
      )}
    </>
  );
});

export default CanvasControlsLayout;
