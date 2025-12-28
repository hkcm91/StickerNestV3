/**
 * MarqueeSelection
 * Visual box for marquee selection
 */

import React from 'react';

export interface MarqueeSelectionProps {
  rect: { x: number; y: number; width: number; height: number };
  accentColor: string;
}

export const MarqueeSelection: React.FC<MarqueeSelectionProps> = ({
  rect,
  accentColor,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: `2px dashed ${accentColor}`,
        background: `${accentColor}15`,
        borderRadius: 4,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  );
};
