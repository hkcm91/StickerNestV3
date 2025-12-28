/**
 * Vector Clock Utilities
 * For tracking causality and detecting conflicts in distributed systems
 */

import type { VectorClock } from './types.js';

/**
 * Create a new empty vector clock
 */
export function createVectorClock(): VectorClock {
  return {};
}

/**
 * Increment the clock for a specific node
 */
export function incrementClock(clock: VectorClock, nodeId: string): VectorClock {
  return {
    ...clock,
    [nodeId]: (clock[nodeId] || 0) + 1,
  };
}

/**
 * Merge two vector clocks (take max of each component)
 */
export function mergeClock(clock1: VectorClock, clock2: VectorClock): VectorClock {
  const merged: VectorClock = { ...clock1 };

  for (const [nodeId, timestamp] of Object.entries(clock2)) {
    merged[nodeId] = Math.max(merged[nodeId] || 0, timestamp);
  }

  return merged;
}

/**
 * Compare two vector clocks
 * Returns:
 *  - 'before': clock1 happened before clock2
 *  - 'after': clock1 happened after clock2
 *  - 'concurrent': clocks are concurrent (conflict!)
 *  - 'equal': clocks are identical
 */
export function compareClock(
  clock1: VectorClock,
  clock2: VectorClock
): 'before' | 'after' | 'concurrent' | 'equal' {
  let clock1LessOrEqual = true;
  let clock2LessOrEqual = true;

  // Get all unique node IDs
  const allNodes = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

  for (const nodeId of allNodes) {
    const t1 = clock1[nodeId] || 0;
    const t2 = clock2[nodeId] || 0;

    if (t1 > t2) {
      // clock1 has a component > clock2, so clock1 is NOT <= clock2
      clock1LessOrEqual = false;
    }
    if (t2 > t1) {
      // clock2 has a component > clock1, so clock2 is NOT <= clock1
      clock2LessOrEqual = false;
    }
  }

  if (clock1LessOrEqual && clock2LessOrEqual) {
    return 'equal';
  }
  if (clock1LessOrEqual) {
    return 'before';
  }
  if (clock2LessOrEqual) {
    return 'after';
  }
  return 'concurrent';
}

/**
 * Check if clock1 happened before clock2
 */
export function happenedBefore(clock1: VectorClock, clock2: VectorClock): boolean {
  return compareClock(clock1, clock2) === 'before';
}

/**
 * Check if two clocks are concurrent (potential conflict)
 */
export function areConcurrent(clock1: VectorClock, clock2: VectorClock): boolean {
  return compareClock(clock1, clock2) === 'concurrent';
}

/**
 * Get the total sum of all clock components (useful for simple versioning)
 */
export function getClockSum(clock: VectorClock): number {
  return Object.values(clock).reduce((sum, val) => sum + val, 0);
}

/**
 * Serialize vector clock for storage/transmission
 */
export function serializeClock(clock: VectorClock): string {
  return JSON.stringify(clock);
}

/**
 * Deserialize vector clock from storage/transmission
 */
export function deserializeClock(serialized: string): VectorClock {
  try {
    return JSON.parse(serialized);
  } catch {
    return createVectorClock();
  }
}

/**
 * Check if a clock dominates another (useful for pruning old operations)
 */
export function dominates(clock1: VectorClock, clock2: VectorClock): boolean {
  const comparison = compareClock(clock1, clock2);
  return comparison === 'after' || comparison === 'equal';
}

/**
 * Clone a vector clock
 */
export function cloneClock(clock: VectorClock): VectorClock {
  return { ...clock };
}
