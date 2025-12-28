/**
 * Sync Module Tests
 * Tests for vector clock, operation log, and session manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVectorClock,
  incrementClock,
  mergeClock,
  compareClock,
  areConcurrent,
  happenedBefore,
  cloneClock,
} from '../../lib/sync/vector-clock.js';
import { OperationLog } from '../../lib/sync/operation-log.js';

describe('Vector Clock', () => {
  describe('createVectorClock', () => {
    it('should create empty vector clock', () => {
      const clock = createVectorClock();
      expect(clock).toEqual({});
    });
  });

  describe('incrementClock', () => {
    it('should increment clock for new node', () => {
      const clock = createVectorClock();
      const updated = incrementClock(clock, 'server-1');

      expect(updated['server-1']).toBe(1);
    });

    it('should increment existing node counter', () => {
      const clock = { 'server-1': 5 };
      const updated = incrementClock(clock, 'server-1');

      expect(updated['server-1']).toBe(6);
    });

    it('should not mutate original clock', () => {
      const clock = { 'server-1': 5 };
      incrementClock(clock, 'server-1');

      expect(clock['server-1']).toBe(5);
    });
  });

  describe('mergeClock', () => {
    it('should merge two clocks taking max values', () => {
      const clock1 = { 'server-1': 3, 'server-2': 5 };
      const clock2 = { 'server-1': 7, 'server-3': 2 };

      const merged = mergeClock(clock1, clock2);

      expect(merged).toEqual({
        'server-1': 7,
        'server-2': 5,
        'server-3': 2,
      });
    });

    it('should handle empty clocks', () => {
      const clock1 = {};
      const clock2 = { 'server-1': 3 };

      const merged = mergeClock(clock1, clock2);
      expect(merged).toEqual({ 'server-1': 3 });
    });
  });

  describe('compareClock', () => {
    it('should detect equal clocks', () => {
      const clock1 = { 'server-1': 3, 'server-2': 5 };
      const clock2 = { 'server-1': 3, 'server-2': 5 };

      expect(compareClock(clock1, clock2)).toBe('equal');
    });

    it('should detect clock1 before clock2', () => {
      const clock1 = { 'server-1': 3, 'server-2': 4 };
      const clock2 = { 'server-1': 3, 'server-2': 5 };

      expect(compareClock(clock1, clock2)).toBe('before');
    });

    it('should detect clock1 after clock2', () => {
      const clock1 = { 'server-1': 5, 'server-2': 5 };
      const clock2 = { 'server-1': 3, 'server-2': 5 };

      expect(compareClock(clock1, clock2)).toBe('after');
    });

    it('should detect concurrent clocks', () => {
      const clock1 = { 'server-1': 5, 'server-2': 3 };
      const clock2 = { 'server-1': 3, 'server-2': 5 };

      expect(compareClock(clock1, clock2)).toBe('concurrent');
    });
  });

  describe('areConcurrent', () => {
    it('should return true for concurrent events', () => {
      const clock1 = { 'server-1': 5, 'server-2': 3 };
      const clock2 = { 'server-1': 3, 'server-2': 5 };

      expect(areConcurrent(clock1, clock2)).toBe(true);
    });

    it('should return false for ordered events', () => {
      const clock1 = { 'server-1': 3 };
      const clock2 = { 'server-1': 5 };

      expect(areConcurrent(clock1, clock2)).toBe(false);
    });
  });

  describe('happenedBefore', () => {
    it('should return true when clock1 happened before clock2', () => {
      const clock1 = { 'server-1': 3 };
      const clock2 = { 'server-1': 5 };

      expect(happenedBefore(clock1, clock2)).toBe(true);
    });

    it('should return false for concurrent events', () => {
      const clock1 = { 'server-1': 5, 'server-2': 3 };
      const clock2 = { 'server-1': 3, 'server-2': 5 };

      expect(happenedBefore(clock1, clock2)).toBe(false);
    });
  });

  describe('cloneClock', () => {
    it('should create a shallow copy', () => {
      const clock = { 'server-1': 5 };
      const cloned = cloneClock(clock);

      expect(cloned).toEqual(clock);
      expect(cloned).not.toBe(clock);
    });
  });
});

describe('Operation Log', () => {
  let opLog: OperationLog;

  beforeEach(() => {
    opLog = new OperationLog('server-1');
  });

  describe('recordOperation', () => {
    it('should record an operation and increment version', () => {
      const op = opLog.recordOperation(
        'create',
        'widget-1',
        'widget',
        { type: 'note', content: 'Hello' },
        'user-1'
      );

      expect(op.id).toBeDefined();
      expect(op.type).toBe('create');
      expect(op.targetId).toBe('widget-1');
      expect(op.version).toBe(1);
      expect(opLog.getVersion()).toBe(1);
    });

    it('should increment version for each operation', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('update', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('move', 'widget-1', 'widget', {}, 'user-1');

      expect(opLog.getVersion()).toBe(3);
    });

    it('should track vector clock', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');
      const clock = opLog.getVectorClock();

      expect(clock['server-1']).toBe(1);
    });
  });

  describe('getOperationsSince', () => {
    it('should return operations after specified version', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('update', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('move', 'widget-1', 'widget', {}, 'user-1');

      const ops = opLog.getOperationsSince(1);

      expect(ops).toHaveLength(2);
      expect(ops[0].version).toBe(2);
      expect(ops[1].version).toBe(3);
    });

    it('should return empty array if no operations since version', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');

      const ops = opLog.getOperationsSince(1);
      expect(ops).toHaveLength(0);
    });
  });

  describe('getOperationsForTarget', () => {
    it('should return operations for specific target', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('create', 'widget-2', 'widget', {}, 'user-1');
      opLog.recordOperation('update', 'widget-1', 'widget', {}, 'user-1');

      const ops = opLog.getOperationsForTarget('widget-1');

      expect(ops).toHaveLength(2);
      expect(ops.every(op => op.targetId === 'widget-1')).toBe(true);
    });
  });

  describe('getDelta', () => {
    it('should return delta for sync', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('update', 'widget-1', 'widget', {}, 'user-1');

      const delta = opLog.getDelta('canvas-1', 0);

      expect(delta.canvasId).toBe('canvas-1');
      expect(delta.fromVersion).toBe(0);
      expect(delta.toVersion).toBe(2);
      expect(delta.operations).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all operations', () => {
      opLog.recordOperation('create', 'widget-1', 'widget', {}, 'user-1');
      opLog.recordOperation('update', 'widget-1', 'widget', {}, 'user-1');

      opLog.clear();

      expect(opLog.getVersion()).toBe(0);
      expect(opLog.getOperationsSince(0)).toHaveLength(0);
    });
  });
});
