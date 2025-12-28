/**
 * StickerNest v2 - EventBus Tests
 * Tests for the event bus system including emit, subscribe, and loop prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from './EventBus';
import type { Event, EventHandler } from '../types/runtime';

// Mock IdentityManager
vi.mock('./IdentityManager', () => ({
  getTabId: () => 'test-tab-1',
  getDeviceId: () => 'test-device-1',
  getSessionId: () => 'test-session-1',
}));

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('emit and on', () => {
    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      const event: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: { value: 'test' },
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test:event',
          payload: { value: 'test' },
        })
      );
    });

    it('should support multiple subscribers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);

      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers for unrelated events', () => {
      const handler = vi.fn();
      eventBus.on('type:A', handler);

      eventBus.emit({ type: 'type:B', scope: 'widget', payload: {} });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should add timestamp and metadata to events', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
          metadata: expect.objectContaining({
            eventId: expect.any(String),
            originTabId: 'test-tab-1',
            originDeviceId: 'test-device-1',
            originSessionId: 'test-session-1',
            hopCount: 0,
          }),
        })
      );
    });
  });

  describe('wildcard subscription', () => {
    it('should support wildcard (*) subscriptions', () => {
      const wildcardHandler = vi.fn();
      eventBus.on('*', wildcardHandler);

      eventBus.emit({ type: 'event:A', scope: 'widget', payload: {} });
      eventBus.emit({ type: 'event:B', scope: 'canvas', payload: {} });

      expect(wildcardHandler).toHaveBeenCalledTimes(2);
    });

    it('should not call wildcard for bridge: events', () => {
      const wildcardHandler = vi.fn();
      eventBus.on('*', wildcardHandler);

      eventBus.emit({ type: 'bridge:internal', scope: 'global', payload: {} });

      expect(wildcardHandler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test:event', handler);

      // First emit - should be received
      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Second emit - should not be received
      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not affect other subscribers when unsubscribing', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsub1 = eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);

      unsub1();

      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should continue processing other handlers on error', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();

      // Spy on console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('test:event', errorHandler);
      eventBus.on('test:event', successHandler);

      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('loop prevention', () => {
    it('should skip events already seen by this tab', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      const event: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: {},
        metadata: {
          eventId: 'evt-1',
          originTabId: 'other-tab',
          originDeviceId: 'test-device-1',
          originSessionId: 'test-session-1',
          seenBy: ['test-tab-1'], // Already seen by current tab
          hopCount: 1,
          originTimestamp: Date.now(),
        },
      };

      eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should skip events exceeding hop limit', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: {},
        metadata: {
          eventId: 'evt-1',
          originTabId: 'other-tab',
          originDeviceId: 'test-device-1',
          originSessionId: 'test-session-1',
          seenBy: [],
          hopCount: 11, // Exceeds limit of 10
          originTimestamp: Date.now(),
        },
      };

      eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should process events without metadata (backwards compatibility)', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      const event: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: {},
        // No metadata
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('emitFromRemote', () => {
    it('should mark event as seen before processing', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      const event: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: {},
        metadata: {
          eventId: 'evt-1',
          originTabId: 'other-tab',
          originDeviceId: 'test-device-1',
          originSessionId: 'test-session-1',
          seenBy: ['other-tab'], // Not seen by current tab yet
          hopCount: 1,
          originTimestamp: Date.now(),
        },
      };

      eventBus.emitFromRemote(event);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            seenBy: expect.arrayContaining(['test-tab-1']),
            hopCount: 2,
          }),
        })
      );
    });

    it('should skip already-seen remote events', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      const event: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: {},
        metadata: {
          eventId: 'evt-1',
          originTabId: 'other-tab',
          originDeviceId: 'test-device-1',
          originSessionId: 'test-session-1',
          seenBy: ['test-tab-1'], // Already seen
          hopCount: 1,
          originTimestamp: Date.now(),
        },
      };

      eventBus.emitFromRemote(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('event logging', () => {
    it('should log emitted events', () => {
      eventBus.emit({ type: 'event:A', scope: 'widget', payload: { a: 1 } });
      eventBus.emit({ type: 'event:B', scope: 'canvas', payload: { b: 2 } });

      const log = eventBus.getEventLog();
      expect(log).toHaveLength(2);
      expect(log[0].type).toBe('event:A');
      expect(log[1].type).toBe('event:B');
    });

    it('should maintain max log size', () => {
      // Emit more events than max log size (500)
      for (let i = 0; i < 510; i++) {
        eventBus.emit({ type: `event:${i}`, scope: 'widget', payload: {} });
      }

      const log = eventBus.getEventLog();
      expect(log.length).toBeLessThanOrEqual(500);
    });

    it('should get events by tab', () => {
      eventBus.emit({ type: 'local:event', scope: 'widget', payload: {} });

      const localEvents = eventBus.getEventsFromTab('test-tab-1');
      expect(localEvents).toHaveLength(1);

      const otherEvents = eventBus.getEventsFromTab('other-tab');
      expect(otherEvents).toHaveLength(0);
    });

    it('should get event stats', () => {
      eventBus.emit({ type: 'event:A', scope: 'widget', payload: {} });
      eventBus.emit({ type: 'event:A', scope: 'widget', payload: {} });
      eventBus.emit({ type: 'event:B', scope: 'canvas', payload: {} });

      const stats = eventBus.getEventStats();
      expect(stats['event:A']).toBe(2);
      expect(stats['event:B']).toBe(1);
    });

    it('should clear event log', () => {
      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });
      expect(eventBus.getEventLog()).toHaveLength(1);

      eventBus.clearEventLog();
      expect(eventBus.getEventLog()).toHaveLength(0);
    });
  });

  describe('event origin checking', () => {
    it('should identify local events', () => {
      eventBus.on('test:event', (event) => {
        expect(eventBus.isLocalEvent(event)).toBe(true);
      });

      eventBus.emit({ type: 'test:event', scope: 'widget', payload: {} });
    });

    it('should identify remote tab events', () => {
      const remoteEvent: Event = {
        type: 'test:event',
        scope: 'widget',
        payload: {},
        metadata: {
          eventId: 'evt-1',
          originTabId: 'other-tab', // Different tab
          originDeviceId: 'test-device-1', // Same device
          originSessionId: 'test-session-1',
          seenBy: [],
          hopCount: 1,
          originTimestamp: Date.now(),
        },
      };

      expect(eventBus.isRemoteTabEvent(remoteEvent)).toBe(true);
    });
  });

  describe('event scopes', () => {
    it('should support widget scope events', () => {
      const handler = vi.fn();
      eventBus.on('widget:emit', handler);

      eventBus.emit({
        type: 'widget:emit',
        scope: 'widget',
        payload: { output: 'clicked', data: {} },
        sourceWidgetId: 'widget-1',
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'widget',
          sourceWidgetId: 'widget-1',
        })
      );
    });

    it('should support canvas scope events', () => {
      const handler = vi.fn();
      eventBus.on('canvas:modeChanged', handler);

      eventBus.emit({
        type: 'canvas:modeChanged',
        scope: 'canvas',
        payload: { mode: 'edit' },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'canvas',
        })
      );
    });

    it('should support global scope events', () => {
      const handler = vi.fn();
      eventBus.on('dashboard:saved', handler);

      eventBus.emit({
        type: 'dashboard:saved',
        scope: 'global',
        payload: { dashboardId: 'dash-1' },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'global',
        })
      );
    });
  });
});
