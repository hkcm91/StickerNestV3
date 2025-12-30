/**
 * StickerNest v2 - Widget Toolbar Component
 * Floating toolbar for widget manipulation (rotate, crop, lock, delete)
 * Enhanced for VR controller input with larger buttons
 */

import React, { memo } from 'react';
import { RotateIcon, CropIcon, LockIcon, UnlockIcon, DeleteIcon } from './WidgetIcons';

export interface WidgetToolbarProps {
  isLocked: boolean;
  isCropMode: boolean;
  hasCrop: boolean;
  hasVRController: boolean;
  accentColor: string;
  onRotate: (e: React.MouseEvent) => void;
  onToggleCrop: (e: React.MouseEvent) => void;
  onResetCrop: (e: React.MouseEvent) => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const WidgetToolbar = memo(function WidgetToolbar({
  isLocked,
  isCropMode,
  hasCrop,
  hasVRController,
  accentColor,
  onRotate,
  onToggleCrop,
  onResetCrop,
  onToggleLock,
  onDelete,
}: WidgetToolbarProps) {
  // Button styles - larger for VR controllers (44px vs 28px)
  const buttonSize = hasVRController ? 44 : 28;
  const iconSize = hasVRController ? 20 : 14;

  const buttonBase: React.CSSProperties = {
    width: buttonSize,
    height: buttonSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(30, 30, 40, 0.9)',
    border: hasVRController ? '2px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.15)',
    borderRadius: hasVRController ? 10 : 6,
    color: '#fff',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    fontSize: hasVRController ? 18 : 14,
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

  return (
    <div
      style={{
        position: 'absolute',
        top: hasVRController ? -56 : -40,
        right: 0,
        display: 'flex',
        gap: hasVRController ? 8 : 4,
        padding: hasVRController ? 6 : 4,
        background: 'rgba(20, 20, 30, 0.85)',
        borderRadius: hasVRController ? 12 : 8,
        backdropFilter: 'blur(12px)',
        border: hasVRController ? '2px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.1)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      {/* Buttons only available when not locked */}
      {!isLocked && (
        <>
          {/* Rotate button */}
          <button
            onClick={onRotate}
            onPointerDown={stopPropagation}
            onMouseDown={stopPropagation}
            title="Rotate 90°"
            style={buttonBase}
          >
            <RotateIcon size={iconSize} />
          </button>

          {/* Crop button */}
          <button
            onClick={onToggleCrop}
            onPointerDown={stopPropagation}
            onMouseDown={stopPropagation}
            title={isCropMode ? 'Exit crop mode' : 'Crop'}
            style={{
              ...buttonBase,
              background: isCropMode ? accentColor : buttonBase.background,
              border: isCropMode ? `${hasVRController ? 2 : 1}px solid ${accentColor}` : buttonBase.border,
            }}
          >
            <CropIcon size={iconSize} />
          </button>

          {/* Reset crop - only show when cropped */}
          {hasCrop && (
            <button
              onClick={onResetCrop}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
              title="Reset crop"
              style={{
                ...buttonBase,
                fontSize: hasVRController ? 14 : 11,
                fontWeight: 600,
              }}
            >
              Reset
            </button>
          )}
        </>
      )}

      {/* Lock button - always visible */}
      <button
        onClick={onToggleLock}
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        title={isLocked ? 'Unlock widget' : 'Lock widget'}
        style={{
          ...buttonBase,
          background: isLocked ? '#f59e0b' : buttonBase.background,
          border: isLocked ? `${hasVRController ? 2 : 1}px solid #f59e0b` : buttonBase.border,
        }}
      >
        {isLocked ? <LockIcon size={iconSize} /> : <UnlockIcon size={iconSize} />}
      </button>

      {/* Delete button - only when not locked */}
      {!isLocked && (
        <button
          onClick={onDelete}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
          title="Delete"
          style={{
            ...buttonBase,
            background: '#dc2626',
            borderColor: '#dc2626',
          }}
        >
          <DeleteIcon size={iconSize} />
        </button>
      )}
    </div>
  );
});

export default WidgetToolbar;
