/**
 * StickerNest - XR Toolbar Component
 *
 * Floating toolbar for VR/AR mode, similar to Meta Quest's menu system.
 * Spawns from the left palm when hand is held up, or can be pinned in space.
 *
 * Features:
 * - Spawns from palm (like Quest menu)
 * - Grabbable and repositionable
 * - Tool selection (select, move, resize, etc.)
 * - Quick actions (undo, redo, add widget)
 */

import React, { useState, useCallback } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { useMenuGesture } from './useHandGestures';

// ============================================================================
// Types
// ============================================================================

export type XRToolType = 'select' | 'move' | 'resize' | 'rotate' | 'draw';

export interface XRToolbarProps {
  /** Currently selected tool */
  activeTool?: XRToolType;
  /** Called when tool is selected */
  onToolChange?: (tool: XRToolType) => void;
  /** Called when undo is pressed */
  onUndo?: () => void;
  /** Called when redo is pressed */
  onRedo?: () => void;
  /** Called when add widget is pressed */
  onAddWidget?: () => void;
  /** Called when settings is pressed */
  onSettings?: () => void;
  /** Accent color for highlights */
  accentColor?: string;
}

// ============================================================================
// Tool Button Component
// ============================================================================

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  accentColor: string;
}

function ToolButton({ icon, label, active, onClick, accentColor }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 56,
        height: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: active ? accentColor : 'rgba(40, 40, 50, 0.8)',
        border: `2px solid ${active ? accentColor : 'rgba(255,255,255,0.2)'}`,
        borderRadius: 12,
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        padding: 4,
      }}
      title={label}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 9, opacity: 0.8 }}>{label}</span>
    </button>
  );
}

// ============================================================================
// Icons (simple SVG)
// ============================================================================

const SelectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3zm8.35 10.24l-.78 2.33-3.59-8.62 8.62 3.59-2.33.78-1.92 1.92z"/>
  </svg>
);

const MoveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
  </svg>
);

const ResizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
  </svg>
);

const RotateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45z"/>
  </svg>
);

const DrawIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
  </svg>
);

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
  </svg>
);

const AddIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

export function XRToolbar({
  activeTool = 'select',
  onToolChange,
  onUndo,
  onRedo,
  onAddWidget,
  onSettings,
  accentColor = '#8b5cf6',
}: XRToolbarProps) {
  const [isPinned, setIsPinned] = useState(false);
  const menuGesture = useMenuGesture('left');

  // Tools configuration
  const tools: { type: XRToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'select', icon: <SelectIcon />, label: 'Select' },
    { type: 'move', icon: <MoveIcon />, label: 'Move' },
    { type: 'resize', icon: <ResizeIcon />, label: 'Resize' },
    { type: 'rotate', icon: <RotateIcon />, label: 'Rotate' },
    { type: 'draw', icon: <DrawIcon />, label: 'Draw' },
  ];

  const handleToolSelect = useCallback((tool: XRToolType) => {
    onToolChange?.(tool);
  }, [onToolChange]);

  const handleGrab = useCallback(() => {
    // Panel is being grabbed, will be repositioned
  }, []);

  const handleRelease = useCallback(() => {
    // Panel was released - it's now pinned in space
    setIsPinned(true);
  }, []);

  // Only show when menu gesture is active OR when pinned
  const shouldShow = isPinned || menuGesture.isMenuGesture;

  if (!shouldShow) {
    return null;
  }

  return (
    <FloatingPanel
      position={isPinned ? undefined : [
        menuGesture.palmPosition.x,
        menuGesture.palmPosition.y + 0.12,
        menuGesture.palmPosition.z
      ]}
      width={0.35}
      height={0.22}
      backgroundColor="rgba(15, 15, 25, 0.95)"
      accentColor={accentColor}
      attachToHand={isPinned ? undefined : 'left'}
      billboard={!isPinned}
      onGrab={handleGrab}
      onRelease={handleRelease}
    >
      <div
        style={{
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            StickerNest Tools
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setIsPinned(!isPinned)}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isPinned ? accentColor : 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
              title={isPinned ? 'Unpin' : 'Pin in space'}
            >
              📌
            </button>
          </div>
        </div>

        {/* Tools Row */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          {tools.map(({ type, icon, label }) => (
            <ToolButton
              key={type}
              icon={icon}
              label={label}
              active={activeTool === type}
              onClick={() => handleToolSelect(type)}
              accentColor={accentColor}
            />
          ))}
        </div>

        {/* Quick Actions Row */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
            paddingTop: 4,
          }}
        >
          <button
            onClick={onUndo}
            style={{
              width: 44,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(40, 40, 50, 0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Undo"
          >
            <UndoIcon />
          </button>
          <button
            onClick={onRedo}
            style={{
              width: 44,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(40, 40, 50, 0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Redo"
          >
            <RedoIcon />
          </button>
          <button
            onClick={onAddWidget}
            style={{
              width: 44,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: accentColor,
              border: `1px solid ${accentColor}`,
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Add Widget"
          >
            <AddIcon />
          </button>
          <button
            onClick={onSettings}
            style={{
              width: 44,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(40, 40, 50, 0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}

export default XRToolbar;
