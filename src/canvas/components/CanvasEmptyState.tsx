/**
 * CanvasEmptyState
 * Empty state display when canvas has no widgets or stickers
 */

import React from 'react';
import type { CanvasMode } from '../MainCanvas';

export interface CanvasEmptyStateProps {
  mode: CanvasMode;
}

export const CanvasEmptyState: React.FC<CanvasEmptyStateProps> = ({ mode }) => {
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
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
          Empty Canvas
        </div>
        <div style={{ fontSize: 14 }}>
          {mode === 'edit'
            ? 'Add widgets or stickers from the library to get started'
            : 'Switch to Edit mode to add content'}
        </div>
      </div>
    </div>
  );
};
