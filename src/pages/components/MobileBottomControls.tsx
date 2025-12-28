/**
 * MobileBottomControls
 * Mobile-specific bottom control bar for canvas editor
 */

import React from 'react';
import type { CanvasMode } from '../../canvas/MainCanvas';
import { haptic } from '../../utils/haptics';

export interface MobileBottomControlsProps {
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
  canvasRef: React.RefObject<{ setMode: (mode: CanvasMode) => void } | null>;
  accentColor: string;
  safeAreaBottom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const MobileBottomControls: React.FC<MobileBottomControlsProps> = ({
  mode,
  setMode,
  canvasRef,
  accentColor,
  safeAreaBottom,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  const handleModeClick = (newMode: CanvasMode) => {
    haptic('light');
    canvasRef.current?.setMode(newMode);
    setMode(newMode);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: `8px 12px ${safeAreaBottom + 8}px`,
        background: 'rgba(15, 15, 25, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${accentColor}22`,
      }}
    >
      {/* Mode Toggle */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 8,
          padding: 2,
          gap: 2,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <button
          onClick={() => handleModeClick('view')}
          style={{
            padding: '6px 14px',
            minHeight: 32,
            fontSize: 13,
            fontWeight: 500,
            background: mode === 'view' ? accentColor : 'transparent',
            border: 'none',
            borderRadius: 6,
            color: mode === 'view' ? '#fff' : '#94a3b8',
            cursor: 'pointer',
          }}
        >
          View
        </button>
        <button
          onClick={() => handleModeClick('edit')}
          style={{
            padding: '6px 14px',
            minHeight: 32,
            fontSize: 13,
            fontWeight: 500,
            background: mode === 'edit' ? accentColor : 'transparent',
            border: 'none',
            borderRadius: 6,
            color: mode === 'edit' ? '#fff' : '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
      </div>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={onZoomOut}
          style={{
            width: 38,
            height: 38,
            background: `${accentColor}25`,
            border: 'none',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          -
        </button>
        <button
          onClick={onResetView}
          style={{
            padding: '6px 12px',
            minHeight: 38,
            background: 'transparent',
            border: `1px solid ${accentColor}33`,
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Fit
        </button>
        <button
          onClick={onZoomIn}
          style={{
            width: 38,
            height: 38,
            background: `${accentColor}25`,
            border: 'none',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};
