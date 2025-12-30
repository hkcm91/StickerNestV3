/**
 * StickerNest v2 - Crop Overlay Component
 * Visual overlay and handles for cropping widgets
 */

import React, { memo } from 'react';

export interface CropValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CropOverlayProps {
  crop: CropValues;
  accentColor: string;
  onCropStart: (edge: 'top' | 'right' | 'bottom' | 'left', e: React.PointerEvent) => void;
}

// Crop handle style - sleek thin lines with drag affordance
function getCropHandleStyle(
  edge: 'top' | 'right' | 'bottom' | 'left',
  cropPercent: number
): React.CSSProperties {
  const isVertical = edge === 'top' || edge === 'bottom';

  const base: React.CSSProperties = {
    position: 'absolute',
    background: 'transparent',
    cursor: isVertical ? 'ns-resize' : 'ew-resize',
    touchAction: 'none',
    zIndex: 100,
  };

  if (isVertical) {
    return {
      ...base,
      left: 0,
      right: 0,
      height: 20,
      ...(edge === 'top' && { top: `${cropPercent}%`, transform: 'translateY(-50%)' }),
      ...(edge === 'bottom' && { bottom: `${cropPercent}%`, transform: 'translateY(50%)' }),
    };
  } else {
    return {
      ...base,
      top: 0,
      bottom: 0,
      width: 20,
      ...(edge === 'left' && { left: `${cropPercent}%`, transform: 'translateX(-50%)' }),
      ...(edge === 'right' && { right: `${cropPercent}%`, transform: 'translateX(50%)' }),
    };
  }
}

// Inner line style for crop handles
function getCropLineStyle(edge: 'top' | 'right' | 'bottom' | 'left', accentColor: string): React.CSSProperties {
  const isVertical = edge === 'top' || edge === 'bottom';
  return {
    position: 'absolute',
    background: accentColor,
    borderRadius: 1,
    boxShadow: `0 0 4px ${accentColor}`,
    ...(isVertical ? {
      left: 8,
      right: 8,
      top: '50%',
      height: 3,
      transform: 'translateY(-50%)',
    } : {
      top: 8,
      bottom: 8,
      left: '50%',
      width: 3,
      transform: 'translateX(-50%)',
    }),
  };
}

// Center grip indicator
function getCropGripStyle(edge: 'top' | 'right' | 'bottom' | 'left', accentColor: string): React.CSSProperties {
  const isVertical = edge === 'top' || edge === 'bottom';
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: isVertical ? 32 : 6,
    height: isVertical ? 6 : 32,
    background: '#fff',
    borderRadius: 3,
    boxShadow: `0 1px 4px rgba(0,0,0,0.3), 0 0 0 1px ${accentColor}`,
  };
}

// Edge overlay showing cropped area
interface CropEdgeOverlayProps {
  edge: 'top' | 'right' | 'bottom' | 'left';
  crop: CropValues;
  accentColor: string;
}

function CropEdgeOverlay({ edge, crop, accentColor }: CropEdgeOverlayProps) {
  const value = crop[edge];
  if (value <= 0) return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    background: `${accentColor}30`,
  };

  switch (edge) {
    case 'top':
      return (
        <div style={{
          ...baseStyle,
          top: 0, left: 0, right: 0,
          height: `${value}%`,
          borderBottom: `2px dashed ${accentColor}`,
        }} />
      );
    case 'bottom':
      return (
        <div style={{
          ...baseStyle,
          bottom: 0, left: 0, right: 0,
          height: `${value}%`,
          borderTop: `2px dashed ${accentColor}`,
        }} />
      );
    case 'left':
      return (
        <div style={{
          ...baseStyle,
          top: `${crop.top}%`, left: 0,
          bottom: `${crop.bottom}%`,
          width: `${value}%`,
          borderRight: `2px dashed ${accentColor}`,
        }} />
      );
    case 'right':
      return (
        <div style={{
          ...baseStyle,
          top: `${crop.top}%`, right: 0,
          bottom: `${crop.bottom}%`,
          width: `${value}%`,
          borderLeft: `2px dashed ${accentColor}`,
        }} />
      );
  }
}

export const CropOverlay = memo(function CropOverlay({
  crop,
  accentColor,
  onCropStart,
}: CropOverlayProps) {
  const hasCrop = crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;
  const edges = ['top', 'right', 'bottom', 'left'] as const;

  return (
    <>
      {/* Crop overlay showing cropped areas */}
      {hasCrop && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 40,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {edges.map((edge) => (
            <CropEdgeOverlay key={edge} edge={edge} crop={crop} accentColor={accentColor} />
          ))}
        </div>
      )}

      {/* Crop handles - sleek lines with center grip */}
      {edges.map((edge) => (
        <div
          key={edge}
          data-crop-handle={edge}
          style={{
            ...getCropHandleStyle(edge, crop[edge]),
            pointerEvents: 'auto',
          }}
          onPointerDown={(e) => onCropStart(edge, e)}
        >
          {/* Thin colored line */}
          <div style={getCropLineStyle(edge, accentColor)} />
          {/* Center grip affordance */}
          <div style={getCropGripStyle(edge, accentColor)} />
        </div>
      ))}
    </>
  );
});

export default CropOverlay;
