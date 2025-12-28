/**
 * Session Manager
 * Tracks user sessions for reconnection and delta sync
 */

import type { SyncSession, VectorClock, Operation, StateDelta, StateSnapshot } from './types.js';
import { cloneClock, createVectorClock } from './vector-clock.js';
import { OperationLog } from './operation-log.js';

interface SessionStore {
  sessions: Map<string, SyncSession>; // connectionId -> session
  userSessions: Map<string, Set<string>>; // userId -> connectionIds
  canvasSessions: Map<string, Set<string>>; // canvasId -> connectionIds
}

export class SyncSessionManager {
  private store: SessionStore = {
    sessions: new Map(),
    userSessions: new Map(),
    canvasSessions: new Map(),
  };

  private operationLogs: Map<string, OperationLog> = new Map(); // canvasId -> log
  private snapshots: Map<string, StateSnapshot> = new Map(); // canvasId -> latest snapshot
  private serverId: string;

  private cleanupInterval: NodeJS.Timeout | null = null;

  // sessionTimeoutMs is passed for future use when implementing session expiry
  constructor(serverId: string, _sessionTimeoutMs: number = 30 * 60 * 1000) {
    this.serverId = serverId;
    this.startCleanup();
  }

  /**
   * Create or restore a session for a user on a canvas
   */
  createSession(
    userId: string,
    canvasId: string,
    connectionId: string,
    lastKnownVersion?: number,
    lastKnownClock?: VectorClock
  ): { session: SyncSession; delta?: StateDelta } {
    // Check for existing session to restore
    const existingConnectionIds = this.store.userSessions.get(userId);
    let restoredSession: SyncSession | null = null;

    if (existingConnectionIds) {
      for (const connId of existingConnectionIds) {
        const session = this.store.sessions.get(connId);
        if (session && session.canvasId === canvasId) {
          restoredSession = session;
          // Remove old connection
          this.removeSession(connId);
          break;
        }
      }
    }

    // Create new session
    const session: SyncSession = {
      userId,
      canvasId,
      lastSyncVersion: lastKnownVersion ?? restoredSession?.lastSyncVersion ?? 0,
      lastSyncVectorClock: lastKnownClock ?? restoredSession?.lastSyncVectorClock ?? createVectorClock(),
      pendingOperations: restoredSession?.pendingOperations ?? [],
      connectionId,
    };

    // Store session
    this.store.sessions.set(connectionId, session);

    // Index by user
    const userConns = this.store.userSessions.get(userId) || new Set();
    userConns.add(connectionId);
    this.store.userSessions.set(userId, userConns);

    // Index by canvas
    const canvasConns = this.store.canvasSessions.get(canvasId) || new Set();
    canvasConns.add(connectionId);
    this.store.canvasSessions.set(canvasId, canvasConns);

    // Calculate delta if reconnecting
    let delta: StateDelta | undefined;
    if (session.lastSyncVersion > 0) {
      const log = this.getOrCreateOperationLog(canvasId);
      if (log.getVersion() > session.lastSyncVersion) {
        delta = log.getDelta(canvasId, session.lastSyncVersion);
      }
    }

    return { session, delta };
  }

  /**
   * Update session after successful sync
   */
  updateSession(connectionId: string, version: number, vectorClock: VectorClock): void {
    const session = this.store.sessions.get(connectionId);
    if (session) {
      session.lastSyncVersion = version;
      session.lastSyncVectorClock = cloneClock(vectorClock);
      session.pendingOperations = [];
    }
  }

  /**
   * Queue an operation for a session (for offline support)
   */
  queueOperation(connectionId: string, operation: Operation): void {
    const session = this.store.sessions.get(connectionId);
    if (session) {
      session.pendingOperations.push(operation);
    }
  }

  /**
   * Get pending operations for a session
   */
  getPendingOperations(connectionId: string): Operation[] {
    const session = this.store.sessions.get(connectionId);
    return session?.pendingOperations ?? [];
  }

  /**
   * Remove a session
   */
  removeSession(connectionId: string): void {
    const session = this.store.sessions.get(connectionId);
    if (!session) return;

    // Remove from user index
    const userConns = this.store.userSessions.get(session.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.store.userSessions.delete(session.userId);
      }
    }

    // Remove from canvas index
    const canvasConns = this.store.canvasSessions.get(session.canvasId);
    if (canvasConns) {
      canvasConns.delete(connectionId);
      if (canvasConns.size === 0) {
        this.store.canvasSessions.delete(session.canvasId);
      }
    }

    // Remove session
    this.store.sessions.delete(connectionId);
  }

  /**
   * Get all sessions for a canvas
   */
  getCanvasSessions(canvasId: string): SyncSession[] {
    const connectionIds = this.store.canvasSessions.get(canvasId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map(id => this.store.sessions.get(id))
      .filter((s): s is SyncSession => s !== undefined);
  }

  /**
   * Get or create operation log for a canvas
   */
  getOrCreateOperationLog(canvasId: string): OperationLog {
    let log = this.operationLogs.get(canvasId);
    if (!log) {
      log = new OperationLog(this.serverId);
      this.operationLogs.set(canvasId, log);
    }
    return log;
  }

  /**
   * Store a snapshot for a canvas (for full sync on reconnect)
   */
  storeSnapshot(snapshot: StateSnapshot): void {
    this.snapshots.set(snapshot.canvasId, snapshot);
  }

  /**
   * Get latest snapshot for a canvas
   */
  getSnapshot(canvasId: string): StateSnapshot | undefined {
    return this.snapshots.get(canvasId);
  }

  /**
   * Get session by connection ID
   */
  getSession(connectionId: string): SyncSession | undefined {
    return this.store.sessions.get(connectionId);
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup stale sessions and operation logs
   */
  private cleanup(): void {
    // Cleanup empty canvas logs
    for (const [canvasId, _log] of this.operationLogs) {
      const sessions = this.store.canvasSessions.get(canvasId);
      if (!sessions || sessions.size === 0) {
        // No active sessions, keep log for a while for reconnection
        // In production, this would be persisted to Redis/DB
        // TODO: Add timeout-based cleanup using this._sessionTimeout
      }
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    totalSessions: number;
    totalUsers: number;
    totalCanvases: number;
    operationLogCount: number;
  } {
    return {
      totalSessions: this.store.sessions.size,
      totalUsers: this.store.userSessions.size,
      totalCanvases: this.store.canvasSessions.size,
      operationLogCount: this.operationLogs.size,
    };
  }
}
