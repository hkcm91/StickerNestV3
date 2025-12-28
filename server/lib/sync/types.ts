/**
 * Sync/CRDT Types
 * Vector clocks and versioning for conflict resolution
 */

/**
 * Vector clock for tracking causality across distributed nodes
 * Key: node/server ID, Value: logical timestamp
 */
export type VectorClock = Record<string, number>;

/**
 * Versioned state wrapper
 */
export interface VersionedState<T> {
  data: T;
  version: number;
  vectorClock: VectorClock;
  lastModifiedBy: string;
  lastModifiedAt: number;
}

/**
 * Operation types for widgets
 */
export type OperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'resize'
  | 'state_change';

/**
 * A single operation in the operation log
 */
export interface Operation {
  id: string;
  type: OperationType;
  targetId: string; // widget ID
  targetType: 'widget' | 'canvas';
  data: unknown;
  version: number;
  vectorClock: VectorClock;
  userId: string;
  serverId: string;
  timestamp: number;
  // For undo/redo
  previousData?: unknown;
}

/**
 * Operation acknowledgment
 */
export interface OperationAck {
  operationId: string;
  accepted: boolean;
  serverVersion: number;
  serverVectorClock: VectorClock;
  conflict?: ConflictResolution;
}

/**
 * Conflict detection result
 */
export interface ConflictResolution {
  type: 'none' | 'auto_merge' | 'last_write_wins' | 'manual_required';
  mergedData?: unknown;
  conflictingOperations?: Operation[];
  resolution?: string;
}

/**
 * State snapshot for reconnection sync
 */
export interface StateSnapshot {
  canvasId: string;
  version: number;
  vectorClock: VectorClock;
  widgets: Record<string, VersionedState<WidgetState>>;
  timestamp: number;
}

/**
 * Delta for incremental sync
 */
export interface StateDelta {
  canvasId: string;
  fromVersion: number;
  toVersion: number;
  operations: Operation[];
  timestamp: number;
}

/**
 * Widget state (simplified for sync purposes)
 */
export interface WidgetState {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  state: Record<string, unknown>;
  isLocked: boolean;
}

/**
 * Sync session for a user on a canvas
 */
export interface SyncSession {
  userId: string;
  canvasId: string;
  lastSyncVersion: number;
  lastSyncVectorClock: VectorClock;
  pendingOperations: Operation[];
  connectionId: string;
}
