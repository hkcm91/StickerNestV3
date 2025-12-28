/**
 * StickerNest v2 - Component Highlighter
 * Shows component boundaries and names on hover when enabled
 */

import React, { useState, useEffect, useCallback } from 'react';

interface HighlightInfo {
  element: HTMLElement;
  name: string;
  rect: DOMRect;
  depth: number;
}

interface ComponentHighlighterProps {
  enabled: boolean;
  onDisable: () => void;
}

// Extract component name from React fiber
const getComponentName = (element: HTMLElement): string | null => {
  // Try to get from data attribute first
  const dataName = element.getAttribute('data-component');
  if (dataName) return dataName;

  // Try React fiber (internal)
  const fiberKey = Object.keys(element).find((key) => key.startsWith('__reactFiber$'));
  if (fiberKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fiber = (element as any)[fiberKey];
    if (fiber?.type?.name) return fiber.type.name;
    if (fiber?.type?.displayName) return fiber.type.displayName;
    if (typeof fiber?.type === 'string') return fiber.type;
  }

  // Fallback to tag name for semantic elements
  const tagName = element.tagName.toLowerCase();
  if (['header', 'footer', 'nav', 'main', 'aside', 'section', 'article'].includes(tagName)) {
    return tagName;
  }

  // Check for common class patterns
  const className = element.className;
  if (typeof className === 'string') {
    const match = className.match(/(?:^|\s)([A-Z][a-zA-Z]+)(?:__|_|$)/);
    if (match) return match[1];
  }

  return null;
};

// Get element depth in DOM
const getDepth = (element: HTMLElement): number => {
  let depth = 0;
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
};

// Color based on depth
const getDepthColor = (depth: number): string => {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  return colors[depth % colors.length];
};

export const ComponentHighlighter: React.FC<ComponentHighlighterProps> = ({
  enabled,
  onDisable,
}) => {
  const [highlight, setHighlight] = useState<HighlightInfo | null>(null);
  const [locked, setLocked] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled || locked) return;

      // Get element under cursor
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!element) {
        setHighlight(null);
        return;
      }

      // Skip our own overlay
      if (element.closest('[data-highlighter]')) {
        return;
      }

      // Find nearest component
      let current: HTMLElement | null = element;
      let componentName: string | null = null;

      while (current && current !== document.body) {
        componentName = getComponentName(current);
        if (componentName) break;
        current = current.parentElement;
      }

      if (current && componentName) {
        const rect = current.getBoundingClientRect();
        setHighlight({
          element: current,
          name: componentName,
          rect,
          depth: getDepth(current),
        });
      } else {
        setHighlight(null);
      }
    },
    [enabled, locked]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;

      // If clicking on our overlay, toggle lock
      const target = e.target as HTMLElement;
      if (target.closest('[data-highlighter]')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setLocked((prev) => !prev);
    },
    [enabled]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (locked) {
          setLocked(false);
        } else {
          onDisable();
        }
      }
    },
    [locked, onDisable]
  );

  useEffect(() => {
    if (!enabled) {
      setHighlight(null);
      setLocked(false);
      return;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleMouseMove, handleClick, handleKeyDown]);

  if (!import.meta.env.DEV || !enabled) return null;

  return (
    <>
      {/* Highlight overlay */}
      {highlight && (
        <div
          data-highlighter="true"
          style={{
            position: 'fixed',
            top: highlight.rect.top,
            left: highlight.rect.left,
            width: highlight.rect.width,
            height: highlight.rect.height,
            border: `2px solid ${getDepthColor(highlight.depth)}`,
            background: `${getDepthColor(highlight.depth)}20`,
            pointerEvents: 'none',
            zIndex: 99990,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Label */}
      {highlight && (
        <div
          data-highlighter="true"
          style={{
            position: 'fixed',
            top: Math.max(0, highlight.rect.top - 24),
            left: highlight.rect.left,
            background: getDepthColor(highlight.depth),
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 99991,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {highlight.name}
          <span style={{ opacity: 0.7, marginLeft: 6 }}>
            {highlight.rect.width.toFixed(0)}×{highlight.rect.height.toFixed(0)}
          </span>
        </div>
      )}

      {/* Status bar */}
      <div
        data-highlighter="true"
        style={{
          position: 'fixed',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 15, 25, 0.95)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 8,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
          zIndex: 99992,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Component Highlighter</span>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(139, 92, 246, 0.2)' }} />

        <span style={{ color: locked ? '#22c55e' : '#94a3b8' }}>
          {locked ? '🔒 Locked' : '🔓 Click to lock'}
        </span>

        <div style={{ width: 1, height: 16, background: 'rgba(139, 92, 246, 0.2)' }} />

        <span style={{ color: '#64748b' }}>Press ESC to {locked ? 'unlock' : 'exit'}</span>

        <button
          onClick={onDisable}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 4,
            padding: '4px 8px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ✕ Disable
        </button>
      </div>
    </>
  );
};

export default ComponentHighlighter;
