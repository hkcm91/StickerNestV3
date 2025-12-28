/**
 * EmptyCanvasState
 * Displayed when canvas has no widgets or stickers
 */

import React from 'react';
import type { CanvasMode } from '../../types/runtime';

interface EmptyCanvasStateProps {
  mode: CanvasMode;
}

export const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = ({ mode }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: '#64748b',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          margin: '0 auto 16px',
          borderRadius: 16,
          background: 'rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}
      >
        🎨
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#94a3b8' }}>
        Empty Canvas
      </h3>
      <p style={{ margin: 0, fontSize: 14, maxWidth: 320, lineHeight: 1.5, color: '#64748b' }}>
        {mode === 'edit'
          ? 'Add widgets from the library or drop stickers to get started'
          : 'Switch to Edit mode to add widgets and stickers'}
      </p>
    </div>
  );
};
