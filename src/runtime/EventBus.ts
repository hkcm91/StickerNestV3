/**
 * StickerNest v2 - EventBus Implementation
 * Event bus supporting emit, on, and unsubscribe
 * Supports wildcard (*) subscriptions for listening to all events
 *
 * v2.0: Integrated with IdentityManager for cross-context sync
 * - Events include metadata for identity tracking
 * - Loop guards prevent infinite loops in multi-tab scenarios
 * - Integrates with RuntimeMessageDispatcher for cross-context sync
 */

import type { Event, EventHandler, UnsubscribeFn, EventMetadata } from '../types/runtime';
import { getTabId, getDeviceId, getSessionId } from './IdentityManager';

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create event metadata for a new event
 */
function createEventMetadata(): EventMetadata {
  const tabId = getTabId();
  return {
    eventId: generateEventId(),
    originTabId: tabId,
    originDeviceId: getDeviceId(),
    originSessionId: getSessionId(),
    seenBy: [tabId],
    hopCount: 0,
    originTimestamp: Date.now()
  };
}

/**
 * Check if an event should be processed (loop guard)
 */
function shouldProcessEvent(event: Event): boolean {
  if (!event.metadata) {
    // Events without metadata are always processed (backwards compatibility)
    return true;
  }

  const currentTabId = getTabId();

  // Already seen by this tab - skip
  if (event.metadata.seenBy.includes(currentTabId)) {
    return false;
  }

  // Hop count exceeded - skip
  if (event.metadata.hopCount > 10) {
    console.warn('[EventBus] Event exceeded hop limit:', event.type);
    return false;
  }

  return true;
}

/**
 * Mark an event as seen by this tab (for forwarding)
 */
function markEventSeen(event: Event): Event {
  if (!event.metadata) return event;

  const currentTabId = getTabId();
  return {
    ...event,
    metadata: {
      ...event.metadata,
      seenBy: [...event.metadata.seenBy, currentTabId],
      hopCount: event.metadata.hopCount + 1
    }
  };
}

export class EventBus {
  private listeners: Map<string, Set<EventHandler>>;
  private eventLog: Event[] = [];
  private maxLogSize: number = 500;
  public readonly id: string;

  constructor() {
    this.listeners = new Map();
    this.id = `eventbus_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[EventBus] 🆕 Created EventBus instance: ${this.id}`);
  }

  /**
   * Emit an event
   * @param event The event to emit
   * @param skipLoopGuard Set to true to bypass loop guard (for internal use)
   */
  emit(event: Event, skipLoopGuard: boolean = false): void {
    // Check loop guard for events with metadata
    if (!skipLoopGuard && !shouldProcessEvent(event)) {
      return;
    }

    // DEBUG: Log interesting events
    const isInteresting = event.type === 'clicked' || event.type === 'clickData' ||
                         event.type.startsWith('farm:') || event.type === 'widget:output' ||
                         event.type.startsWith('canvas:');
    if (isInteresting) {
      const wildcardCount = this.listeners.get('*')?.size ?? 0;
      const specificCount = this.listeners.get(event.type)?.size ?? 0;
      console.log(`[EventBus:${this.id}] 📣 EMIT "${event.type}":`, {
        scope: event.scope,
        sourceWidgetId: event.sourceWidgetId,
        payload: event.payload,
        wildcardSubscribers: wildcardCount,
        specificSubscribers: specificCount,
        willBeReceived: specificCount > 0 || wildcardCount > 0,
      });
    }

    // Ensure event has metadata (for new events)
    const eventWithMetadata: Event = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      metadata: event.metadata || createEventMetadata()
    };

    // Log the event
    this.logEvent(eventWithMetadata);

    // Call specific type handlers
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(eventWithMetadata);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }

    // Call wildcard handlers (but not for internal events to avoid loops)
    if (!event.type.startsWith('bridge:')) {
      const wildcardHandlers = this.listeners.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => {
          try {
            handler(eventWithMetadata);
          } catch (error) {
            console.error(`Error in wildcard handler for ${event.type}:`, error);
          }
        });
      }
    }
  }

  /**
   * Emit an event received from another context (with loop guard check)
   */
  emitFromRemote(event: Event): void {
    if (!shouldProcessEvent(event)) {
      return;
    }

    // Mark as seen by this tab before processing
    const markedEvent = markEventSeen(event);
    this.emit(markedEvent, true); // Skip loop guard since we already checked
  }

  /**
   * Subscribe to events of a specific type
   */
  on(type: string, handler: EventHandler): UnsubscribeFn {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const handlers = this.listeners.get(type)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * Log an event for debugging
   */
  private logEvent(event: Event): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }

  /**
   * Get recent events (for debugging)
   */
  getEventLog(): Event[] {
    return [...this.eventLog];
  }

  /**
   * Get events from a specific tab (for debugging)
   */
  getEventsFromTab(tabId: string): Event[] {
    return this.eventLog.filter(e => e.metadata?.originTabId === tabId);
  }

  /**
   * Get event count by type (for debugging)
   */
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const event of this.eventLog) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }
    return stats;
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Check if an event originated from this tab
   */
  isLocalEvent(event: Event): boolean {
    return event.metadata?.originTabId === getTabId();
  }

  /**
   * Check if an event is from another tab on the same device
   */
  isRemoteTabEvent(event: Event): boolean {
    return (
      event.metadata?.originDeviceId === getDeviceId() &&
      event.metadata?.originTabId !== getTabId()
    );
  }
}
