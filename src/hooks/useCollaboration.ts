/**
 * StickerNest v2 - useCollaboration Hook
 *
 * Provides a unified API for collaboration features including:
 * - Connection status
 * - Remote users and their cursors/selections
 * - Broadcasting local changes
 * - Presence updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CollaborationService, type RemoteUser, type CollaborationEventType } from '../services/CollaborationService';
import { useCollaborationStore, type Collaborator, type ConnectionStatus } from '../state/useCollaborationStore';

// ==================
// Types
// ==================

export interface UseCollaborationOptions {
  /** Auto-broadcast cursor movements */
  trackCursor?: boolean;
  /** Throttle cursor broadcasts (ms) */
  cursorThrottleMs?: number;
  /** Auto-broadcast selection changes */
  trackSelection?: boolean;
}

export interface UseCollaborationReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;

  // Users
  remoteUsers: RemoteUser[];
  collaborators: Collaborator[];
  collaboratorCount: number;

  // Room management
  joinCanvas: (canvasId: string) => Promise<void>;
  leaveCanvas: () => Promise<void>;
  currentCanvasId: string | null;

  // Cursor/Selection
  broadcastCursor: (x: number, y: number) => void;
  broadcastSelection: (widgetIds: string[]) => void;

  // Widget sync
  broadcastWidgetCreate: (widget: {
    id: string;
    widgetDefId: string;
    version: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    zIndex: number;
    state?: Record<string, unknown>;
  }) => void;
  broadcastWidgetUpdate: (widgetId: string, changes: Record<string, unknown>) => void;
  broadcastWidgetDelete: (widgetId: string) => void;
  broadcastWidgetMove: (widgetId: string, position: { x: number; y: number }) => void;
  broadcastWidgetResize: (widgetId: string, dimensions: { width: number; height: number }) => void;
  broadcastWidgetState: (widgetId: string, state: Record<string, unknown>, partial?: boolean) => void;

  // Events
  onCollaborationEvent: (handler: (event: { type: CollaborationEventType; data?: unknown }) => void) => () => void;
}

// ==================
// Hook Implementation
// ==================

export function useCollaboration(options: UseCollaborationOptions = {}): UseCollaborationReturn {
  const {
    trackCursor = false,
    cursorThrottleMs = 50,
    trackSelection = false,
  } = options;

  // State from collaboration store
  const connectionStatus = useCollaborationStore((s) => s.connectionStatus);
  const collaborators = useCollaborationStore((s) => Array.from(s.collaborators.values()));
  const localUser = useCollaborationStore((s) => s.localUser);

  // Local state for remote users
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);

  // Derived state
  const isConnected = connectionStatus === 'connected';
  const currentCanvasId = CollaborationService.getCurrentCanvasId();

  // Filter out local user from collaborators count
  const remoteCollaborators = useMemo(() =>
    collaborators.filter(c => !c.isLocal),
    [collaborators]
  );

  // Sync remote users from service
  useEffect(() => {
    const syncRemoteUsers = () => {
      setRemoteUsers(CollaborationService.getRemoteUsers());
    };

    // Initial sync
    syncRemoteUsers();

    // Subscribe to updates
    const unsubscribe = CollaborationService.onEvent((event) => {
      if (event.type === 'user:joined' || event.type === 'user:left' || event.type === 'cursor:moved') {
        syncRemoteUsers();
      }
    });

    return () => unsubscribe();
  }, []);

  // Cursor tracking
  useEffect(() => {
    if (!trackCursor || !isConnected) return;

    let lastX = 0;
    let lastY = 0;
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      // Only update if position changed significantly
      if (Math.abs(x - lastX) < 2 && Math.abs(y - lastY) < 2) {
        return;
      }

      lastX = x;
      lastY = y;

      if (!throttleTimeout) {
        CollaborationService.broadcastCursor(x, y);
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, cursorThrottleMs);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [trackCursor, isConnected, cursorThrottleMs]);

  // Room management
  const joinCanvas = useCallback(async (canvasId: string) => {
    if (!isConnected) {
      console.warn('[useCollaboration] Cannot join canvas - not connected');
      return;
    }
    await CollaborationService.joinCanvas(canvasId);
  }, [isConnected]);

  const leaveCanvas = useCallback(async () => {
    await CollaborationService.leaveCanvas();
  }, []);

  // Broadcasting functions
  const broadcastCursor = useCallback((x: number, y: number) => {
    CollaborationService.broadcastCursor(x, y);
  }, []);

  const broadcastSelection = useCallback((widgetIds: string[]) => {
    CollaborationService.broadcastSelection(widgetIds);
  }, []);

  const broadcastWidgetCreate = useCallback((widget: {
    id: string;
    widgetDefId: string;
    version: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    zIndex: number;
    state?: Record<string, unknown>;
  }) => {
    CollaborationService.broadcastWidgetCreate(widget);
  }, []);

  const broadcastWidgetUpdate = useCallback((widgetId: string, changes: Record<string, unknown>) => {
    CollaborationService.broadcastWidgetUpdate(widgetId, changes);
  }, []);

  const broadcastWidgetDelete = useCallback((widgetId: string) => {
    CollaborationService.broadcastWidgetDelete(widgetId);
  }, []);

  const broadcastWidgetMove = useCallback((widgetId: string, position: { x: number; y: number }) => {
    CollaborationService.broadcastWidgetMove(widgetId, position);
  }, []);

  const broadcastWidgetResize = useCallback((widgetId: string, dimensions: { width: number; height: number }) => {
    CollaborationService.broadcastWidgetResize(widgetId, dimensions);
  }, []);

  const broadcastWidgetState = useCallback((widgetId: string, state: Record<string, unknown>, partial = true) => {
    CollaborationService.broadcastWidgetState(widgetId, state, partial);
  }, []);

  // Event subscription
  const onCollaborationEvent = useCallback((
    handler: (event: { type: CollaborationEventType; data?: unknown }) => void
  ) => {
    return CollaborationService.onEvent(handler);
  }, []);

  return {
    // Connection
    isConnected,
    connectionStatus,

    // Users
    remoteUsers,
    collaborators: remoteCollaborators,
    collaboratorCount: remoteCollaborators.length,

    // Room
    joinCanvas,
    leaveCanvas,
    currentCanvasId,

    // Presence
    broadcastCursor,
    broadcastSelection,

    // Widget sync
    broadcastWidgetCreate,
    broadcastWidgetUpdate,
    broadcastWidgetDelete,
    broadcastWidgetMove,
    broadcastWidgetResize,
    broadcastWidgetState,

    // Events
    onCollaborationEvent,
  };
}

export default useCollaboration;
