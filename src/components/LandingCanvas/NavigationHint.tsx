/**
 * StickerNest v2 - Navigation Hint
 *
 * Visual overlay showing navigation hints for the canvas.
 * Displays keyboard shortcuts and mouse/touch gestures.
 */

import React, { memo, useState, useEffect } from 'react';
import type { CanvasMode } from '../../canvas/MainCanvas';

// ============================================================================
// TYPES
// ============================================================================

interface NavigationHintProps {
  mode: CanvasMode;
  accentColor?: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

interface HintItem {
  icon: string;
  action: string;
  shortcut?: string;
}

// ============================================================================
// HINTS DATA
// ============================================================================

const VIEW_HINTS: HintItem[] = [
  { icon: '🖱️', action: 'Scroll to zoom', shortcut: 'Ctrl + Scroll' },
  { icon: '✋', action: 'Drag to pan', shortcut: 'Space + Drag' },
  { icon: '🔍', action: 'Double-click to zoom', shortcut: 'Double-click' },
  { icon: '🎯', action: 'Click widget to interact' },
];

const EDIT_HINTS: HintItem[] = [
  { icon: '📦', action: 'Drag widgets to move' },
  { icon: '↔️', action: 'Drag corners to resize' },
  { icon: '🗑️', action: 'Delete selected', shortcut: 'Del / Backspace' },
  { icon: '💾', action: 'Save canvas', shortcut: 'Ctrl + S' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const NavigationHint = memo(function NavigationHint({
  mode,
  accentColor = '#8b5cf6',
  onDismiss,
  autoHide = true,
  autoHideDelay = 6000,
}: NavigationHintProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-hide after delay
  useEffect(() => {
    if (!autoHide) return;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 300);
    }, autoHideDelay);
    return () => clearTimeout(timer);
  }, [autoHide, autoHideDelay, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  const hints = mode === 'edit' ? EDIT_HINTS : VIEW_HINTS;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: `translateX(-50%) ${isExiting ? 'translateY(20px)' : 'translateY(0)'}`,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 16,
          background: 'rgba(15, 15, 25, 0.95)',
          borderRadius: 12,
          border: `1px solid ${accentColor}33`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          maxWidth: 320,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {mode === 'edit' ? 'Edit Mode' : 'Navigation'}
          </span>
          <button
            onClick={handleDismiss}
            style={{
              width: 24,
              height: 24,
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            aria-label="Dismiss hints"
          >
            ✕
          </button>
        </div>

        {/* Hints List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hints.map((hint, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 14, width: 24, textAlign: 'center' }}>
                {hint.icon}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>
                {hint.action}
              </span>
              {hint.shortcut && (
                <kbd
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    fontSize: 10,
                    color: '#94a3b8',
                    fontFamily: 'monospace',
                  }}
                >
                  {hint.shortcut}
                </kbd>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${accentColor}22`,
            fontSize: 11,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          Click anywhere to dismiss
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// CURSOR INDICATOR
// ============================================================================

interface CursorIndicatorProps {
  isPanning: boolean;
  isZooming: boolean;
  accentColor?: string;
}

export const CursorIndicator = memo(function CursorIndicator({
  isPanning,
  isZooming,
  accentColor = '#8b5cf6',
}: CursorIndicatorProps) {
  if (!isPanning && !isZooming) return null;

  const label = isPanning ? 'Panning' : 'Zooming';
  const icon = isPanning ? '✋' : '🔍';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        padding: '8px 12px',
        background: accentColor,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>
        {label}
      </span>
    </div>
  );
});

export default NavigationHint;
