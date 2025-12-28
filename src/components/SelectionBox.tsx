/**
 * StickerNest v2 - SelectionBox
 * Visual overlay for drag selection on the canvas
 */

import React from 'react';

interface SelectionBoxProps {
  box: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ box }) => {
  const left = Math.min(box.startX, box.endX);
  const top = Math.min(box.startY, box.endY);
  const width = Math.abs(box.endX - box.startX);
  const height = Math.abs(box.endY - box.startY);

  // Don't render if too small
  if (width < 5 && height < 5) return null;

  return (
    <div
      className="selection-box"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        backgroundColor: 'rgba(74, 158, 255, 0.1)',
        border: '1px dashed #4a9eff',
        borderRadius: 2,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

export default SelectionBox;

