/**
 * StickerNest v2 - Cursor Overlay
 *
 * Renders remote user cursors on the canvas for real-time collaboration.
 * Features smooth animations, lag compensation, and auto-hide for stale cursors.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CollaborationService, type RemoteUser } from '../../services/CollaborationService';
import { useCollaborationStore } from '../../state/useCollaborationStore';

// ==================
// Types
// ==================

interface CursorData {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  lastUpdated: number;
  visible: boolean;
}

interface CursorOverlayProps {
  /** Canvas zoom level for proper cursor scaling */
  zoom?: number;
  /** Canvas pan offset */
  panOffset?: { x: number; y: number };
  /** Time in ms before hiding stale cursors */
  staleTimeout?: number;
  /** Enable cursor interpolation for smoother movement */
  interpolate?: boolean;
  /** Show cursor labels with usernames */
  showLabels?: boolean;
  /** Container element for cursor positioning */
  containerRef?: React.RefObject<HTMLElement>;
}

// ==================
// Cursor Component
// ==================

interface RemoteCursorProps {
  cursor: CursorData;
  zoom: number;
  showLabel: boolean;
}

const RemoteCursor: React.FC<RemoteCursorProps> = React.memo(({
  cursor,
  zoom,
  showLabel,
}) => {
  const cursorSize = 20 / zoom; // Scale cursor with zoom
  const labelOffset = 24 / zoom;

  if (!cursor.visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate(${cursor.x}px, ${cursor.y}px)`,
        transition: 'transform 50ms ease-out',
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform',
      }}
    >
      {/* Cursor Arrow SVG */}
      <svg
        width={cursorSize}
        height={cursorSize}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        {/* Cursor shape */}
        <path
          d="M5.65 2.92L21.07 12.36C21.83 12.81 21.67 13.96 20.81 14.19L13.13 16.07L9.6 23.08C9.21 23.88 8.04 23.77 7.81 22.91L3.05 4.24C2.82 3.38 3.71 2.64 4.52 3.01L5.65 2.92Z"
          fill={cursor.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Username Label */}
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            left: labelOffset,
            top: labelOffset,
            background: cursor.color,
            color: 'white',
            padding: `${2 / zoom}px ${6 / zoom}px`,
            borderRadius: `${4 / zoom}px`,
            fontSize: `${11 / zoom}px`,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            userSelect: 'none',
            maxWidth: `${120 / zoom}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {cursor.username}
        </div>
      )}
    </div>
  );
});

RemoteCursor.displayName = 'RemoteCursor';

// ==================
// Main Component
// ==================

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  staleTimeout = 3000,
  interpolate = true,
  showLabels = true,
  containerRef,
}) => {
  // Track remote cursors
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());

  // Animation frame ref for interpolation
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(Date.now());

  // Get collaborators from store for color/name info
  const collaborators = useCollaborationStore((s) => Array.from(s.collaborators.values()));

  // Get collaborator info by ID
  const getCollaboratorInfo = useCallback((userId: string) => {
    const collaborator = collaborators.find(c => c.id === userId);
    return {
      username: collaborator?.displayName || `User ${userId.slice(-4)}`,
      color: collaborator?.color || '#6366f1',
    };
  }, [collaborators]);

  // Handle cursor updates from CollaborationService
  useEffect(() => {
    const handleEvent = (event: { type: string; data?: unknown }) => {
      if (event.type === 'cursor:moved') {
        const { userId, cursor: cursorPos } = event.data as {
          userId: string;
          cursor: { x: number; y: number };
        };

        setCursors(prev => {
          const newCursors = new Map(prev);
          const existing = newCursors.get(userId);
          const { username, color } = getCollaboratorInfo(userId);

          newCursors.set(userId, {
            userId,
            username,
            color,
            x: cursorPos.x,
            y: cursorPos.y,
            prevX: existing?.x,
            prevY: existing?.y,
            lastUpdated: Date.now(),
            visible: true,
          });

          return newCursors;
        });
      }

      if (event.type === 'user:left') {
        const { userId } = event.data as { userId: string };
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(userId);
          return newCursors;
        });
      }
    };

    const unsubscribe = CollaborationService.onEvent(handleEvent);
    return () => unsubscribe();
  }, [getCollaboratorInfo]);

  // Also sync with remote users from service
  useEffect(() => {
    const remoteUsers = CollaborationService.getRemoteUsers();
    if (remoteUsers.length > 0) {
      setCursors(prev => {
        const newCursors = new Map(prev);
        remoteUsers.forEach(user => {
          if (user.cursor && !newCursors.has(user.id)) {
            const { username, color } = getCollaboratorInfo(user.id);
            newCursors.set(user.id, {
              userId: user.id,
              username: user.username || username,
              color: user.color || color,
              x: user.cursor.x,
              y: user.cursor.y,
              lastUpdated: Date.now(),
              visible: true,
            });
          }
        });
        return newCursors;
      });
    }
  }, [getCollaboratorInfo]);

  // Stale cursor cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        let hasChanges = false;
        const newCursors = new Map(prev);

        newCursors.forEach((cursor, id) => {
          if (now - cursor.lastUpdated > staleTimeout) {
            if (cursor.visible) {
              newCursors.set(id, { ...cursor, visible: false });
              hasChanges = true;
            }
          }
        });

        // Remove cursors that have been invisible for too long
        newCursors.forEach((cursor, id) => {
          if (!cursor.visible && now - cursor.lastUpdated > staleTimeout * 2) {
            newCursors.delete(id);
            hasChanges = true;
          }
        });

        return hasChanges ? newCursors : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [staleTimeout]);

  // Cursor interpolation animation loop (for smoother movement)
  useEffect(() => {
    if (!interpolate) return;

    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastRenderTimeRef.current;
      lastRenderTimeRef.current = now;

      // Interpolation is handled by CSS transition, so we just need
      // to keep the animation loop for potential future enhancements
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [interpolate]);

  // Convert cursors map to array for rendering
  const cursorArray = useMemo(() => {
    return Array.from(cursors.values()).filter(c => c.visible);
  }, [cursors]);

  if (cursorArray.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 9998,
      }}
    >
      {cursorArray.map(cursor => (
        <RemoteCursor
          key={cursor.userId}
          cursor={cursor}
          zoom={zoom}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
};

export default CursorOverlay;
