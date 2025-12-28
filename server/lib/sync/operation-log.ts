/**
 * Operation Log
 * Tracks all operations for conflict resolution and replay
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Operation,
  OperationType,
  VectorClock,
  ConflictResolution,
  StateDelta,
} from './types.js';
import {
  createVectorClock,
  incrementClock,
  mergeClock,
  areConcurrent,
  cloneClock,
} from './vector-clock.js';

export class OperationLog {
  private operations: Map<string, Operation> = new Map();
  private operationsByTarget: Map<string, string[]> = new Map();
  private currentClock: VectorClock;
  private serverId: string;
  private version: number = 0;

  // Configurable retention
  private maxOperations: number;
  private maxAgeMs: number;

  constructor(
    serverId: string,
    options: {
      maxOperations?: number;
      maxAgeMs?: number;
    } = {}
  ) {
    this.serverId = serverId;
    this.currentClock = createVectorClock();
    this.maxOperations = options.maxOperations || 10000;
    this.maxAgeMs = options.maxAgeMs || 24 * 60 * 60 * 1000; // 24 hours default
  }

  /**
   * Record a new operation
   */
  recordOperation(
    type: OperationType,
    targetId: string,
    targetType: 'widget' | 'canvas',
    data: unknown,
    userId: string,
    previousData?: unknown
  ): Operation {
    // Increment our clock
    this.currentClock = incrementClock(this.currentClock, this.serverId);
    this.version++;

    const operation: Operation = {
      id: uuidv4(),
      type,
      targetId,
      targetType,
      data,
      version: this.version,
      vectorClock: cloneClock(this.currentClock),
      userId,
      serverId: this.serverId,
      timestamp: Date.now(),
      previousData,
    };

    this.operations.set(operation.id, operation);

    // Index by target
    const targetOps = this.operationsByTarget.get(targetId) || [];
    targetOps.push(operation.id);
    this.operationsByTarget.set(targetId, targetOps);

    // Cleanup old operations
    this.cleanup();

    return operation;
  }

  /**
   * Apply a remote operation (from another server)
   */
  applyRemoteOperation(operation: Operation): ConflictResolution {
    // Merge clocks
    this.currentClock = mergeClock(this.currentClock, operation.vectorClock);
    this.currentClock = incrementClock(this.currentClock, this.serverId);

    // Check for conflicts
    const targetOps = this.operationsByTarget.get(operation.targetId) || [];
    const lastLocalOp = targetOps.length > 0
      ? this.operations.get(targetOps[targetOps.length - 1])
      : null;

    let conflict: ConflictResolution = { type: 'none' };

    if (lastLocalOp && areConcurrent(lastLocalOp.vectorClock, operation.vectorClock)) {
      // Concurrent operations detected - resolve conflict
      conflict = this.resolveConflict(lastLocalOp, operation);
    }

    // Store the operation
    if (conflict.type !== 'manual_required') {
      this.operations.set(operation.id, operation);
      targetOps.push(operation.id);
      this.operationsByTarget.set(operation.targetId, targetOps);
      this.version = Math.max(this.version, operation.version);
    }

    return conflict;
  }

  /**
   * Resolve conflict between two concurrent operations
   */
  private resolveConflict(localOp: Operation, remoteOp: Operation): ConflictResolution {
    // Strategy 1: Auto-merge for non-conflicting properties
    if (this.canAutoMerge(localOp, remoteOp)) {
      const mergedData = this.autoMerge(localOp, remoteOp);
      return {
        type: 'auto_merge',
        mergedData,
        conflictingOperations: [localOp, remoteOp],
        resolution: 'Properties merged automatically',
      };
    }

    // Strategy 2: Last-write-wins for same property changes
    // Use timestamp as tiebreaker, with server ID as secondary tiebreaker
    const localWins = this.determineWinner(localOp, remoteOp) === 'local';

    return {
      type: 'last_write_wins',
      mergedData: localWins ? localOp.data : remoteOp.data,
      conflictingOperations: [localOp, remoteOp],
      resolution: `${localWins ? 'Local' : 'Remote'} operation wins (timestamp tiebreaker)`,
    };
  }

  /**
   * Check if two operations can be auto-merged
   */
  private canAutoMerge(op1: Operation, op2: Operation): boolean {
    // Can auto-merge if operations affect different properties
    if (op1.type !== op2.type) {
      return true; // Different operation types can usually be merged
    }

    if (op1.type === 'move' && op2.type === 'resize') {
      return true; // Moving and resizing are independent
    }

    // Check if data affects different properties
    const data1 = op1.data as Record<string, unknown> | null;
    const data2 = op2.data as Record<string, unknown> | null;

    if (data1 && data2 && typeof data1 === 'object' && typeof data2 === 'object') {
      const keys1 = new Set(Object.keys(data1));
      const keys2 = new Set(Object.keys(data2));
      const intersection = [...keys1].filter(k => keys2.has(k));
      return intersection.length === 0;
    }

    return false;
  }

  /**
   * Auto-merge two operations
   */
  private autoMerge(op1: Operation, op2: Operation): unknown {
    const data1 = op1.data as Record<string, unknown> | null;
    const data2 = op2.data as Record<string, unknown> | null;

    if (data1 && data2 && typeof data1 === 'object' && typeof data2 === 'object') {
      return { ...data1, ...data2 };
    }

    // Fallback to last-write-wins
    return op1.timestamp > op2.timestamp ? op1.data : op2.data;
  }

  /**
   * Determine winner for last-write-wins
   */
  private determineWinner(op1: Operation, op2: Operation): 'local' | 'remote' {
    // Primary: timestamp
    if (op1.timestamp !== op2.timestamp) {
      return op1.timestamp > op2.timestamp ? 'local' : 'remote';
    }

    // Secondary: server ID (lexicographic for determinism)
    return op1.serverId > op2.serverId ? 'local' : 'remote';
  }

  /**
   * Get operations since a specific version
   */
  getOperationsSince(fromVersion: number): Operation[] {
    return Array.from(this.operations.values())
      .filter(op => op.version > fromVersion)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Get delta for reconnection sync
   */
  getDelta(canvasId: string, fromVersion: number): StateDelta {
    const operations = this.getOperationsSince(fromVersion);

    return {
      canvasId,
      fromVersion,
      toVersion: this.version,
      operations,
      timestamp: Date.now(),
    };
  }

  /**
   * Get operations for a specific target
   */
  getOperationsForTarget(targetId: string): Operation[] {
    const opIds = this.operationsByTarget.get(targetId) || [];
    return opIds
      .map(id => this.operations.get(id))
      .filter((op): op is Operation => op !== undefined);
  }

  /**
   * Get current version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get current vector clock
   */
  getVectorClock(): VectorClock {
    return cloneClock(this.currentClock);
  }

  /**
   * Cleanup old operations
   */
  private cleanup(): void {
    if (this.operations.size <= this.maxOperations) {
      return;
    }

    const now = Date.now();
    const toDelete: string[] = [];

    // Find operations to delete (oldest first, respecting maxAge)
    const sortedOps = Array.from(this.operations.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const op of sortedOps) {
      if (this.operations.size - toDelete.length <= this.maxOperations) {
        break;
      }

      if (now - op.timestamp > this.maxAgeMs) {
        toDelete.push(op.id);
      }
    }

    // Delete old operations
    for (const id of toDelete) {
      const op = this.operations.get(id);
      if (op) {
        this.operations.delete(id);

        // Remove from target index
        const targetOps = this.operationsByTarget.get(op.targetId);
        if (targetOps) {
          const idx = targetOps.indexOf(id);
          if (idx !== -1) {
            targetOps.splice(idx, 1);
          }
        }
      }
    }
  }

  /**
   * Clear all operations (useful for testing)
   */
  clear(): void {
    this.operations.clear();
    this.operationsByTarget.clear();
    this.currentClock = createVectorClock();
    this.version = 0;
  }
}
