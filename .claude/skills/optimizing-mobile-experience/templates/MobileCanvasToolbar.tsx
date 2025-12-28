/**
 * Mobile Canvas Toolbar Component
 *
 * A touch-optimized toolbar for canvas editing on mobile devices.
 * Features:
 * - Bottom positioning for thumb-friendly access
 * - Safe area padding for notched devices
 * - Large touch targets (48px minimum)
 * - Horizontal scrollable for many tools
 * - Haptic feedback on interactions
 *
 * Usage:
 * <MobileCanvasToolbar
 *   mode={canvasMode}
 *   onModeChange={setCanvasMode}
 *   selectedWidgetId={selectedWidget?.id}
 * />
 */

import React, { useState, useCallback } from 'react';
import { useSafeArea } from '@/hooks/useResponsive';
import { haptic } from '@/utils/haptics';
import { useCanvasStore } from '@/state/useCanvasStore';
import { useSelectionStore } from '@/state/useSelectionStore';

type CanvasMode = 'view' | 'edit' | 'select' | 'pan';

interface ToolbarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}

interface MobileCanvasToolbarProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  selectedWidgetId?: string | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  className?: string;
}

// Icon components (replace with your icon library)
const Icons = {
  Pan: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z" />
    </svg>
  ),
  Select: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
    </svg>
  ),
  Delete: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  ),
  Duplicate: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  ),
  ZoomIn: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z" />
    </svg>
  ),
  ZoomOut: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z" />
    </svg>
  ),
  FitView: () => (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z" />
    </svg>
  ),
};

export function MobileCanvasToolbar({
  mode,
  onModeChange,
  selectedWidgetId,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  className = ''
}: MobileCanvasToolbarProps) {
  const safeArea = useSafeArea();
  const { zoom, resetViewport } = useCanvasStore();
  const { deleteWidget, duplicateWidget } = useSelectionStore();

  const handlePress = useCallback((action: () => void) => {
    haptic.light();
    action();
  }, []);

  // Mode toggle actions
  const modeActions: ToolbarAction[] = [
    {
      id: 'pan',
      icon: <Icons.Pan />,
      label: 'Pan',
      onPress: () => handlePress(() => onModeChange('pan')),
      active: mode === 'pan'
    },
    {
      id: 'select',
      icon: <Icons.Select />,
      label: 'Select',
      onPress: () => handlePress(() => onModeChange('select')),
      active: mode === 'select'
    },
    {
      id: 'edit',
      icon: <Icons.Edit />,
      label: 'Edit',
      onPress: () => handlePress(() => onModeChange('edit')),
      active: mode === 'edit'
    }
  ];

  // Widget actions (only when widget selected)
  const widgetActions: ToolbarAction[] = selectedWidgetId ? [
    {
      id: 'duplicate',
      icon: <Icons.Duplicate />,
      label: 'Duplicate',
      onPress: () => handlePress(() => duplicateWidget(selectedWidgetId))
    },
    {
      id: 'delete',
      icon: <Icons.Delete />,
      label: 'Delete',
      onPress: () => handlePress(() => deleteWidget(selectedWidgetId))
    }
  ] : [];

  // History actions
  const historyActions: ToolbarAction[] = [
    {
      id: 'undo',
      icon: <Icons.Undo />,
      label: 'Undo',
      onPress: () => handlePress(() => onUndo?.()),
      disabled: !canUndo
    },
    {
      id: 'redo',
      icon: <Icons.Redo />,
      label: 'Redo',
      onPress: () => handlePress(() => onRedo?.()),
      disabled: !canRedo
    }
  ];

  // Zoom actions
  const zoomActions: ToolbarAction[] = [
    {
      id: 'zoomOut',
      icon: <Icons.ZoomOut />,
      label: 'Zoom Out',
      onPress: () => handlePress(() => zoom(0.8, window.innerWidth / 2, window.innerHeight / 2)),
      disabled: zoom <= 0.1
    },
    {
      id: 'fitView',
      icon: <Icons.FitView />,
      label: 'Fit View',
      onPress: () => handlePress(resetViewport)
    },
    {
      id: 'zoomIn',
      icon: <Icons.ZoomIn />,
      label: 'Zoom In',
      onPress: () => handlePress(() => zoom(1.25, window.innerWidth / 2, window.innerHeight / 2)),
      disabled: zoom >= 5
    }
  ];

  return (
    <div
      className={`mobile-canvas-toolbar ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: safeArea.bottom,
        paddingLeft: safeArea.left,
        paddingRight: safeArea.right,
        zIndex: 1000
      }}
    >
      {/* Main toolbar content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* Mode group */}
        <ToolbarGroup actions={modeActions} />

        {/* Divider */}
        <div style={{
          width: 1,
          height: 32,
          backgroundColor: 'var(--color-border)',
          flexShrink: 0
        }} />

        {/* Widget actions (conditional) */}
        {selectedWidgetId && (
          <>
            <ToolbarGroup actions={widgetActions} />
            <div style={{
              width: 1,
              height: 32,
              backgroundColor: 'var(--color-border)',
              flexShrink: 0
            }} />
          </>
        )}

        {/* History group */}
        <ToolbarGroup actions={historyActions} />

        {/* Divider */}
        <div style={{
          width: 1,
          height: 32,
          backgroundColor: 'var(--color-border)',
          flexShrink: 0
        }} />

        {/* Zoom group */}
        <ToolbarGroup actions={zoomActions} />
      </div>
    </div>
  );
}

// Individual toolbar button
function ToolbarButton({ action }: { action: ToolbarAction }) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={action.onPress}
      disabled={action.disabled}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      aria-label={action.label}
      aria-pressed={action.active}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        minWidth: 48,
        borderRadius: 8,
        border: 'none',
        backgroundColor: action.active
          ? 'var(--color-primary-100)'
          : isPressed
            ? 'var(--color-surface-hover)'
            : 'transparent',
        color: action.disabled
          ? 'var(--color-text-disabled)'
          : action.active
            ? 'var(--color-primary-600)'
            : 'var(--color-text)',
        cursor: action.disabled ? 'not-allowed' : 'pointer',
        opacity: action.disabled ? 0.5 : 1,
        transition: 'background-color 0.15s ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none'
      }}
    >
      {action.icon}
    </button>
  );
}

// Button group
function ToolbarGroup({ actions }: { actions: ToolbarAction[] }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      {actions.map((action) => (
        <ToolbarButton key={action.id} action={action} />
      ))}
    </div>
  );
}

export default MobileCanvasToolbar;
