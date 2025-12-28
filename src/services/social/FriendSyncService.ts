/**
 * StickerNest v2 - Friend Sync Service
 * =====================================
 *
 * Service for synchronizing widget state between friends in real-time.
 * Enables multiplayer collaboration where friends can see and interact
 * with each other's widgets.
 *
 * ## Architecture Notes
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   FRIEND SYNC FLOW                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  Local Widget Change                                        │
 * │        │                                                    │
 * │        ▼                                                    │
 * │  FriendSyncService.syncWidgetState() ──► BroadcastService   │
 * │                                                │            │
 * │                                                ▼            │
 * │                                         Friend's Browser    │
 * │                                                │            │
 * │                                                ▼            │
 * │  FriendSyncService.onRemoteUpdate() ◄── BroadcastService    │
 * │        │                                                    │
 * │        ▼                                                    │
 * │  Apply to Local Canvas (with conflict resolution)           │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Sync Modes
 *
 * - **mirror**: Friend's widgets appear as read-only mirrors
 * - **collaborative**: Both can edit (requires conflict resolution)
 * - **spectate**: Just watch friend's canvas without syncing own
 *
 * ## Widget Ownership
 *
 * Widgets track their original creator. In collaborative mode,
 * the owner has priority for conflict resolution.
 *
 * @see BroadcastService - Handles the transport layer
 * @see useSocialStore - Provides friend list
 */

import {
  BroadcastService,
  type Broadcast,
  type WidgetStateBroadcast,
  type WidgetSpawnBroadcast,
  type WidgetDeleteBroadcast,
  type CursorPositionBroadcast,
} from './BroadcastService';

// ==================
// Types
// ==================

/**
 * Sync mode for friend synchronization
 */
export type SyncMode = 'mirror' | 'collaborative' | 'spectate';

/**
 * Synced widget info
 */
export interface SyncedWidget {
  id: string;
  widgetDefId: string;
  ownerId: string;
  ownerName?: string;
  canvasId: string;
  state: Record<string, unknown>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  lastUpdated: number;
  isRemote: boolean;
}

/**
 * Friend cursor info
 */
export interface FriendCursor {
  userId: string;
  userName?: string;
  canvasId: string;
  x: number;
  y: number;
  color: string;
  lastUpdated: number;
}

/**
 * Sync session with a friend
 */
export interface SyncSession {
  friendId: string;
  friendName?: string;
  mode: SyncMode;
  canvasId: string;
  startedAt: number;
  widgets: Map<string, SyncedWidget>;
  cursor?: FriendCursor;
}

/**
 * Callback for widget sync events
 */
export type WidgetSyncCallback = (
  widget: SyncedWidget,
  action: 'create' | 'update' | 'delete'
) => void;

/**
 * Callback for cursor updates
 */
export type CursorSyncCallback = (cursor: FriendCursor) => void;

/**
 * Sync options
 */
export interface SyncOptions {
  /** Default sync mode */
  defaultMode?: SyncMode;
  /** Auto-sync with all online friends */
  autoSync?: boolean;
  /** Conflict resolution strategy */
  conflictResolution?: 'owner-wins' | 'latest-wins' | 'merge';
  /** Sync debounce in ms */
  debounceMs?: number;
}

// ==================
// Service State
// ==================

/** Active sync sessions by friend ID */
const syncSessions: Map<string, SyncSession> = new Map();

/** Widget sync callbacks */
const widgetCallbacks: Set<WidgetSyncCallback> = new Set();

/** Cursor sync callbacks */
const cursorCallbacks: Set<CursorSyncCallback> = new Set();

/** Broadcast unsubscribers by friend ID */
const unsubscribers: Map<string, () => void> = new Map();

/** Current canvas ID being synced */
let currentCanvasId: string | null = null;

/** Current user ID */
let currentUserId: string | null = null;

/** Service options */
let serviceOptions: SyncOptions = {
  defaultMode: 'mirror',
  autoSync: false,
  conflictResolution: 'owner-wins',
  debounceMs: 50,
};

/** Cursor timeout timers (clear stale cursors) */
const cursorTimeouts: Map<string, NodeJS.Timeout> = new Map();
const CURSOR_TIMEOUT_MS = 3000; // Hide cursor after 3s of no updates

// ==================
// Helper Functions
// ==================

/**
 * Generate a unique color for a user based on their ID
 */
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Handle incoming broadcast from friend
 */
function handleBroadcast(friendId: string, broadcast: Broadcast): void {
  const session = syncSessions.get(friendId);
  if (!session) return;

  // Only process broadcasts for our current canvas
  if ('canvasId' in broadcast && broadcast.canvasId !== currentCanvasId) {
    return;
  }

  switch (broadcast.type) {
    case 'widget:state':
      handleWidgetState(session, broadcast as WidgetStateBroadcast);
      break;
    case 'widget:spawn':
      handleWidgetSpawn(session, broadcast as WidgetSpawnBroadcast);
      break;
    case 'widget:delete':
      handleWidgetDelete(session, broadcast as WidgetDeleteBroadcast);
      break;
    case 'cursor:position':
      handleCursorPosition(session, broadcast as CursorPositionBroadcast);
      break;
  }
}

/**
 * Handle widget state update from friend
 */
function handleWidgetState(
  session: SyncSession,
  broadcast: WidgetStateBroadcast
): void {
  const existingWidget = session.widgets.get(broadcast.widgetId);

  // Conflict resolution
  if (existingWidget && serviceOptions.conflictResolution === 'owner-wins') {
    // Owner's updates always win
    if (existingWidget.ownerId !== broadcast.senderId) {
      // This is a non-owner trying to update - in mirror mode, ignore
      if (session.mode === 'mirror') return;
    }
  }

  const syncedWidget: SyncedWidget = {
    id: broadcast.widgetId,
    widgetDefId: broadcast.widgetDefId,
    ownerId: existingWidget?.ownerId || broadcast.senderId,
    ownerName: session.friendName,
    canvasId: broadcast.canvasId,
    state: broadcast.state,
    position: broadcast.position || existingWidget?.position || { x: 0, y: 0 },
    size: broadcast.size || existingWidget?.size || { width: 100, height: 100 },
    lastUpdated: broadcast.timestamp,
    isRemote: true,
  };

  session.widgets.set(broadcast.widgetId, syncedWidget);

  // Notify callbacks
  widgetCallbacks.forEach((cb) =>
    cb(syncedWidget, existingWidget ? 'update' : 'create')
  );
}

/**
 * Handle widget spawn from friend
 */
function handleWidgetSpawn(
  session: SyncSession,
  broadcast: WidgetSpawnBroadcast
): void {
  const { widget } = broadcast;

  const syncedWidget: SyncedWidget = {
    id: widget.id,
    widgetDefId: widget.widgetDefId,
    ownerId: broadcast.senderId,
    ownerName: session.friendName,
    canvasId: broadcast.canvasId,
    state: widget.state,
    position: widget.position,
    size: { width: widget.width, height: widget.height },
    lastUpdated: broadcast.timestamp,
    isRemote: true,
  };

  session.widgets.set(widget.id, syncedWidget);

  // Notify callbacks
  widgetCallbacks.forEach((cb) => cb(syncedWidget, 'create'));
}

/**
 * Handle widget delete from friend
 */
function handleWidgetDelete(
  session: SyncSession,
  broadcast: WidgetDeleteBroadcast
): void {
  const widget = session.widgets.get(broadcast.widgetId);
  if (!widget) return;

  // In mirror mode, only owner can delete
  if (session.mode === 'mirror' && widget.ownerId !== broadcast.senderId) {
    return;
  }

  session.widgets.delete(broadcast.widgetId);

  // Notify callbacks
  widgetCallbacks.forEach((cb) => cb(widget, 'delete'));
}

/**
 * Handle cursor position from friend
 */
function handleCursorPosition(
  session: SyncSession,
  broadcast: CursorPositionBroadcast
): void {
  const cursor: FriendCursor = {
    userId: broadcast.senderId,
    userName: session.friendName,
    canvasId: broadcast.canvasId,
    x: broadcast.x,
    y: broadcast.y,
    color: broadcast.color || getUserColor(broadcast.senderId),
    lastUpdated: broadcast.timestamp,
  };

  session.cursor = cursor;

  // Clear existing timeout
  const existingTimeout = cursorTimeouts.get(broadcast.senderId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout to hide stale cursor
  const timeout = setTimeout(() => {
    const sess = syncSessions.get(session.friendId);
    if (sess) {
      sess.cursor = undefined;
      cursorCallbacks.forEach((cb) =>
        cb({ ...cursor, x: -1000, y: -1000 }) // Move offscreen
      );
    }
    cursorTimeouts.delete(broadcast.senderId);
  }, CURSOR_TIMEOUT_MS);

  cursorTimeouts.set(broadcast.senderId, timeout);

  // Notify callbacks
  cursorCallbacks.forEach((cb) => cb(cursor));
}

// ==================
// Service Methods
// ==================

export const FriendSyncService = {
  /**
   * Initialize the sync service
   *
   * @param userId - Current user's ID
   * @param canvasId - Current canvas ID
   * @param options - Sync options
   */
  initialize(
    userId: string,
    canvasId: string,
    options: SyncOptions = {}
  ): void {
    currentUserId = userId;
    currentCanvasId = canvasId;
    serviceOptions = { ...serviceOptions, ...options };

    // Initialize broadcast service
    BroadcastService.initialize(userId);

    console.log('[FriendSyncService] Initialized for canvas:', canvasId);
  },

  /**
   * Start syncing with a friend
   *
   * @param friendId - Friend's user ID
   * @param friendName - Friend's display name
   * @param mode - Sync mode
   * @returns The sync session
   */
  startSync(
    friendId: string,
    friendName?: string,
    mode: SyncMode = serviceOptions.defaultMode || 'mirror'
  ): SyncSession {
    // Don't sync with self
    if (friendId === currentUserId) {
      throw new Error('Cannot sync with yourself');
    }

    // Check if already syncing
    if (syncSessions.has(friendId)) {
      console.log('[FriendSyncService] Already syncing with:', friendId);
      return syncSessions.get(friendId)!;
    }

    // Create session
    const session: SyncSession = {
      friendId,
      friendName,
      mode,
      canvasId: currentCanvasId!,
      startedAt: Date.now(),
      widgets: new Map(),
    };

    syncSessions.set(friendId, session);

    // Subscribe to friend's broadcasts
    const unsubscribe = BroadcastService.subscribeToUser(
      friendId,
      (broadcast) => handleBroadcast(friendId, broadcast)
    );
    unsubscribers.set(friendId, unsubscribe);

    console.log('[FriendSyncService] Started sync with:', friendId, 'mode:', mode);

    return session;
  },

  /**
   * Stop syncing with a friend
   *
   * @param friendId - Friend's user ID
   */
  stopSync(friendId: string): void {
    const session = syncSessions.get(friendId);
    if (!session) return;

    // Unsubscribe from broadcasts
    const unsub = unsubscribers.get(friendId);
    unsub?.();
    unsubscribers.delete(friendId);

    // Clear cursor timeout
    const timeout = cursorTimeouts.get(friendId);
    if (timeout) {
      clearTimeout(timeout);
      cursorTimeouts.delete(friendId);
    }

    // Notify callbacks about removed widgets
    session.widgets.forEach((widget) => {
      widgetCallbacks.forEach((cb) => cb(widget, 'delete'));
    });

    syncSessions.delete(friendId);

    console.log('[FriendSyncService] Stopped sync with:', friendId);
  },

  /**
   * Sync local widget state to friends
   *
   * @param widgetId - Widget ID
   * @param widgetDefId - Widget definition ID
   * @param state - Widget state
   * @param position - Widget position
   * @param size - Widget size
   */
  syncWidgetState(
    widgetId: string,
    widgetDefId: string,
    state: Record<string, unknown>,
    position?: { x: number; y: number },
    size?: { width: number; height: number }
  ): void {
    if (!currentCanvasId) return;

    BroadcastService.broadcastWidgetState(
      currentCanvasId,
      widgetId,
      widgetDefId,
      state,
      position,
      size
    );
  },

  /**
   * Sync local widget spawn to friends
   *
   * @param widget - Widget data
   */
  syncWidgetSpawn(widget: WidgetSpawnBroadcast['widget']): void {
    if (!currentCanvasId) return;

    BroadcastService.broadcastWidgetSpawn(currentCanvasId, widget);
  },

  /**
   * Sync local widget delete to friends
   *
   * @param widgetId - Widget ID that was deleted
   */
  syncWidgetDelete(widgetId: string): void {
    if (!currentCanvasId) return;

    BroadcastService.broadcastWidgetDelete(currentCanvasId, widgetId);
  },

  /**
   * Sync local cursor position to friends
   *
   * @param x - X position
   * @param y - Y position
   */
  syncCursorPosition(x: number, y: number): void {
    if (!currentCanvasId || !currentUserId) return;

    BroadcastService.broadcastCursorPosition(
      currentCanvasId,
      x,
      y,
      getUserColor(currentUserId)
    );
  },

  /**
   * Register callback for widget sync events
   *
   * @param callback - Function called when widgets are synced
   * @returns Unsubscribe function
   */
  onWidgetSync(callback: WidgetSyncCallback): () => void {
    widgetCallbacks.add(callback);
    return () => widgetCallbacks.delete(callback);
  },

  /**
   * Register callback for cursor updates
   *
   * @param callback - Function called when friend cursors move
   * @returns Unsubscribe function
   */
  onCursorSync(callback: CursorSyncCallback): () => void {
    cursorCallbacks.add(callback);
    return () => cursorCallbacks.delete(callback);
  },

  /**
   * Get active sync session with a friend
   */
  getSession(friendId: string): SyncSession | undefined {
    return syncSessions.get(friendId);
  },

  /**
   * Get all active sync sessions
   */
  getAllSessions(): SyncSession[] {
    return Array.from(syncSessions.values());
  },

  /**
   * Get all synced widgets from all friends
   */
  getAllSyncedWidgets(): SyncedWidget[] {
    const widgets: SyncedWidget[] = [];
    syncSessions.forEach((session) => {
      session.widgets.forEach((widget) => {
        widgets.push(widget);
      });
    });
    return widgets;
  },

  /**
   * Get all friend cursors
   */
  getAllCursors(): FriendCursor[] {
    const cursors: FriendCursor[] = [];
    syncSessions.forEach((session) => {
      if (session.cursor) {
        cursors.push(session.cursor);
      }
    });
    return cursors;
  },

  /**
   * Change sync mode for a friend
   */
  setSyncMode(friendId: string, mode: SyncMode): void {
    const session = syncSessions.get(friendId);
    if (session) {
      session.mode = mode;
      console.log('[FriendSyncService] Set sync mode for', friendId, 'to', mode);
    }
  },

  /**
   * Check if syncing with a friend
   */
  isSyncingWith(friendId: string): boolean {
    return syncSessions.has(friendId);
  },

  /**
   * Get count of active sync sessions
   */
  getActiveSyncCount(): number {
    return syncSessions.size;
  },

  /**
   * Change the current canvas (updates all sessions)
   */
  setCurrentCanvas(canvasId: string): void {
    const oldCanvasId = currentCanvasId;
    currentCanvasId = canvasId;

    // Clear widgets from old canvas
    syncSessions.forEach((session) => {
      session.widgets.clear();
      session.cursor = undefined;
      session.canvasId = canvasId;
    });

    console.log(
      '[FriendSyncService] Canvas changed from',
      oldCanvasId,
      'to',
      canvasId
    );
  },

  /**
   * Update service options
   */
  setOptions(options: Partial<SyncOptions>): void {
    serviceOptions = { ...serviceOptions, ...options };
  },

  /**
   * Get current options
   */
  getOptions(): SyncOptions {
    return { ...serviceOptions };
  },

  /**
   * Cleanup all sync sessions
   */
  cleanup(): void {
    // Stop all sync sessions
    syncSessions.forEach((_, friendId) => {
      this.stopSync(friendId);
    });

    // Clear callbacks
    widgetCallbacks.clear();
    cursorCallbacks.clear();

    // Clear cursor timeouts
    cursorTimeouts.forEach((timeout) => clearTimeout(timeout));
    cursorTimeouts.clear();

    // Cleanup broadcast service
    BroadcastService.cleanup();

    currentCanvasId = null;
    currentUserId = null;

    console.log('[FriendSyncService] Cleanup complete');
  },
};

export default FriendSyncService;
