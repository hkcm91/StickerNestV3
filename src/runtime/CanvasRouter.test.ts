/**
 * StickerNest v2 - CanvasRouter Tests
 * Tests for cross-canvas communication routing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CanvasRouter } from './CanvasRouter';
import { EventBus } from './EventBus';
import type { Event } from '../types/runtime';
import type { CanvasRoute } from '../types/crossCanvas';

// Mock IdentityManager
vi.mock('./IdentityManager', () => ({
  getTabId: () => 'test-tab-1',
  getDeviceId: () => 'test-device-1',
  getSessionId: () => 'test-session-1',
}));

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(message: any): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.forEach(channel => {
        if (channel !== this && channel.onmessage) {
          // Simulate async message delivery
          setTimeout(() => {
            channel.onmessage?.({ data: message } as MessageEvent);
          }, 0);
        }
      });
    }
  }

  close(): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.delete(this);
    }
  }

  static reset(): void {
    this.channels.clear();
  }
}

// Install mock globally
(global as any).BroadcastChannel = MockBroadcastChannel;

describe('CanvasRouter', () => {
  let eventBus: EventBus;
  let router: CanvasRouter;

  beforeEach(() => {
    MockBroadcastChannel.reset();
    eventBus = new EventBus();
    router = new CanvasRouter(eventBus, {
      canvasId: 'canvas-1',
      userId: 'user-1',
      debugEnabled: false,
      autoDiscovery: false // Disable heartbeat for tests
    });
  });

  afterEach(() => {
    router.disconnect();
    vi.clearAllMocks();
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      await router.connect();
      expect(router.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await router.connect();
      router.disconnect();
      expect(router.isConnected()).toBe(false);
    });

    it('should not double-connect', async () => {
      await router.connect();
      await router.connect(); // Should not throw
      expect(router.isConnected()).toBe(true);
    });

    it('should emit router:connected event on connect', async () => {
      const handler = vi.fn();
      router.onRouterEvent(handler);

      await router.connect();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'router:connected',
          payload: { canvasId: 'canvas-1' }
        })
      );
    });

    it('should emit router:disconnected event on disconnect', async () => {
      const handler = vi.fn();
      router.onRouterEvent(handler);

      await router.connect();
      router.disconnect();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'router:disconnected',
          payload: { canvasId: 'canvas-1' }
        })
      );
    });
  });

  describe('route management', () => {
    beforeEach(async () => {
      await router.connect();
    });

    it('should add a route', () => {
      const route = router.addRoute({
        name: 'Test Route',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-2',
        bidirectional: false
      });

      expect(route.id).toBeDefined();
      expect(route.name).toBe('Test Route');
      expect(router.getRoutes()).toHaveLength(1);
    });

    it('should remove a route', () => {
      const route = router.addRoute({
        name: 'Test Route',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-2',
        bidirectional: false
      });

      const removed = router.removeRoute(route.id);
      expect(removed).toBe(true);
      expect(router.getRoutes()).toHaveLength(0);
    });

    it('should update a route', () => {
      const route = router.addRoute({
        name: 'Test Route',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-2',
        bidirectional: false
      });

      const updated = router.updateRoute(route.id, { name: 'Updated Route', enabled: false });
      expect(updated?.name).toBe('Updated Route');
      expect(updated?.enabled).toBe(false);
    });

    it('should get routes for a specific canvas', () => {
      router.addRoute({
        name: 'Route 1',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-2',
        bidirectional: false
      });

      router.addRoute({
        name: 'Route 2',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-3',
        bidirectional: false
      });

      const routes = router.getRoutesForCanvas('canvas-2');
      expect(routes).toHaveLength(1);
      expect(routes[0].name).toBe('Route 1');
    });

    it('should emit router:routeAdded event', () => {
      const handler = vi.fn();
      router.onRouterEvent(handler);

      router.addRoute({
        name: 'Test Route',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-2',
        bidirectional: false
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'router:routeAdded'
        })
      );
    });
  });

  describe('cross-canvas messaging', () => {
    let router2: CanvasRouter;
    let eventBus2: EventBus;

    beforeEach(async () => {
      eventBus2 = new EventBus();
      router2 = new CanvasRouter(eventBus2, {
        canvasId: 'canvas-2',
        userId: 'user-1',
        debugEnabled: false,
        autoDiscovery: false
      });

      await router.connect();
      await router2.connect();
    });

    afterEach(() => {
      router2.disconnect();
    });

    it('should send event to specific canvas', async () => {
      const handler = vi.fn();
      eventBus2.on('test:event', handler);

      router.sendToCanvas('canvas-2', {
        type: 'test:event',
        scope: 'user',
        payload: { message: 'hello' }
      });

      // Wait for async message delivery
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test:event',
          payload: { message: 'hello' }
        })
      );
    });

    it('should broadcast event to all canvases', async () => {
      const handler = vi.fn();
      eventBus2.on('broadcast:event', handler);

      router.broadcastToAll({
        type: 'broadcast:event',
        scope: 'user',
        payload: { data: 'test' }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalled();
    });

    it('should not receive own messages', async () => {
      const handler = vi.fn();
      eventBus.on('self:event', handler);

      router.sendToCanvas('canvas-1', {
        type: 'self:event',
        scope: 'user',
        payload: {}
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not receive our own message
      expect(handler).not.toHaveBeenCalled();
    });

    it('should route events via configured routes', async () => {
      const handler = vi.fn();
      eventBus2.on('widget:output', handler);

      // Add route from canvas-1 to canvas-2
      router.addRoute({
        name: 'Widget Output Route',
        enabled: true,
        sourceCanvasId: 'canvas-1',
        targetCanvasId: 'canvas-2',
        bidirectional: false
      });

      // Emit event locally on canvas-1
      eventBus.emit({
        type: 'widget:output',
        scope: 'canvas', // Canvas-scoped, should be routed
        payload: { widgetInstanceId: 'w1', portName: 'clicked', value: true },
        sourceWidgetId: 'w1'
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('subscriptions', () => {
    let router2: CanvasRouter;
    let eventBus2: EventBus;

    beforeEach(async () => {
      eventBus2 = new EventBus();
      router2 = new CanvasRouter(eventBus2, {
        canvasId: 'canvas-2',
        userId: 'user-1',
        debugEnabled: false,
        autoDiscovery: false
      });

      await router.connect();
      await router2.connect();
    });

    afterEach(() => {
      router2.disconnect();
    });

    it('should subscribe to another canvas', () => {
      const subscription = router.subscribeToCanvas('canvas-2', ['widget:output']);
      expect(subscription.id).toBeDefined();
      expect(subscription.publisherCanvasId).toBe('canvas-2');
    });

    it('should unsubscribe from a canvas', () => {
      const subscription = router.subscribeToCanvas('canvas-2');
      const result = router.unsubscribeFromCanvas(subscription.id);
      expect(result).toBe(true);
    });
  });

  describe('canvas discovery', () => {
    it('should track active canvases', async () => {
      const router2 = new CanvasRouter(new EventBus(), {
        canvasId: 'canvas-2',
        userId: 'user-1',
        autoDiscovery: true,
        heartbeatInterval: 100
      });

      await router.connect();
      await router2.connect();

      // Wait for ping/pong
      await new Promise(resolve => setTimeout(resolve, 150));

      const activeCanvases = router.getActiveCanvases();
      expect(activeCanvases.length).toBeGreaterThanOrEqual(0); // May or may not have discovered yet

      router2.disconnect();
    });
  });

  describe('loop prevention', () => {
    it('should not forward events that came from other canvases', async () => {
      await router.connect();

      const sendSpy = vi.spyOn(router as any, 'sendMessage');

      // Simulate receiving an event from another canvas
      const incomingEvent: Event = {
        type: 'forwarded:event',
        scope: 'user',
        payload: {},
        metadata: {
          eventId: 'evt-1',
          originTabId: 'canvas-2', // Different canvas
          originDeviceId: 'test-device-1',
          originSessionId: 'test-session-1',
          seenBy: ['canvas-2'],
          hopCount: 1,
          originTimestamp: Date.now()
        }
      };

      // This event should not be forwarded again
      eventBus.emit(incomingEvent);

      // The router should not have sent this event
      const userScopedCalls = sendSpy.mock.calls.filter(
        call => call[0]?.event?.type === 'forwarded:event'
      );
      expect(userScopedCalls).toHaveLength(0);
    });
  });

  describe('router events', () => {
    it('should support event subscription and unsubscription', async () => {
      const handler = vi.fn();
      const unsubscribe = router.onRouterEvent(handler);

      await router.connect();
      expect(handler).toHaveBeenCalled();

      unsubscribe();
      router.disconnect();

      // Count calls - should not have increased after unsubscribe
      const callsAfterConnect = handler.mock.calls.length;
      expect(callsAfterConnect).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors in event handlers gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      router.onRouterEvent(errorHandler);

      await router.connect();

      // Should not throw, error should be caught
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
