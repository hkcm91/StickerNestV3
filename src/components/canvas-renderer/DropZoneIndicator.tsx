/**
 * DropZoneIndicator
 * Visual feedback when dragging widgets/stickers over canvas
 */

import React from 'react';

interface DropZoneIndicatorProps {
  visible: boolean;
}

export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(139, 92, 246, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(139, 92, 246, 0.9)',
          borderRadius: 12,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
        }}
      >
        Drop here
      </div>
    </div>
  );
};
