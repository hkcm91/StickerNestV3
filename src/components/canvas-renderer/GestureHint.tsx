/**
 * GestureHint
 * Shows hint text when gesturing or space is held for panning
 */

import React from 'react';

interface GestureHintProps {
  isGesturing: boolean;
  isSpaceHeld: boolean;
  gestureType: string;
}

export const GestureHint: React.FC<GestureHintProps> = ({
  isGesturing,
  isSpaceHeld,
  gestureType,
}) => {
  if (!isGesturing && !isSpaceHeld) return null;

  const getMessage = () => {
    if (isSpaceHeld && !isGesturing) {
      return 'Space+Drag to pan';
    }
    if (gestureType === 'zoom') {
      return 'Pinch to zoom / Two-finger pan';
    }
    return 'Panning';
  };

  return (
    <div style={{
      position: 'absolute',
      top: 48,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '6px 12px',
      background: 'rgba(0, 0, 0, 0.75)',
      color: '#fff',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      zIndex: 1003,
      pointerEvents: 'none',
      opacity: 0.85,
      whiteSpace: 'nowrap',
    }}>
      {getMessage()}
    </div>
  );
};
