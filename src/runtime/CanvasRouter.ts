/**
 * StickerNest v2 - Canvas Router
 * Routes events between canvases on the same device using BroadcastChannel.
 * Enables widgets to communicate across different canvas tabs/windows.
 *
 * Features:
 * - Auto-discovery of other canvases
 * - Route-based event forwarding
 * - Subscription-based event filtering
 * - Heartbeat for presence detection
 * - Loop prevention
 *
 * Version: 1.0.0
 */

import type { Event, UnsubscribeFn } from '../types/runtime';
import type {
  CanvasRoute,
  CrossCanvasMessage,
  CanvasSubscription,
  ActiveCanvas,
  CanvasRouterConfig,
  CanvasRouterEvent,
  CanvasRouterEventType
} from '../types/crossCanvas';
import { EventBus } from './EventBus';
import { getTabId, getDeviceId } from './IdentityManager';

/**
 * BroadcastChannel name for cross-canvas communication
 */
const CANVAS_CHANNEL_NAME = 'stickernest_canvas_router';

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `cmsg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique route ID
 */
function generateRouteId(): string {
  return `route_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * CanvasRouter - Routes events between canvases
 */
export class CanvasRouter {
  private config: Required<CanvasRouterConfig>;
  private channel: BroadcastChannel | null = null;
  private eventBus: EventBus;
  private connected: boolean = false;

  // Routes for forwarding events
  private routes: Map<string, CanvasRoute> = new Map();

  // Subscriptions from other canvases
  private incomingSubscriptions: Map<string, CanvasSubscription> = new Map();

  // Our subscriptions to other canvases
  private outgoingSubscriptions: Map<string, CanvasSubscription> = new Map();

  // Active canvases discovered via heartbeat
  private activeCanvases: Map<string, ActiveCanvas> = new Map();

  // Event handlers for router events
  private routerEventHandlers: Set<(event: CanvasRouterEvent) => void> = new Set();

  // EventBus subscription cleanup
  private eventBusUnsubscribe: UnsubscribeFn | null = null;

  // Heartbeat interval
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

  // Seen messages for deduplication
  private seenMessages: Set<string> = new Set();
  private seenMessageCleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(eventBus: EventBus, config: CanvasRouterConfig) {
    this.eventBus = eventBus;
    this.config = {
      canvasId: config.canvasId,
      userId: config.userId,
      debugEnabled: config.debugEnabled ?? false,
      autoDiscovery: config.autoDiscovery ?? true,
      heartbeatInterval: config.heartbeatInterval ?? 5000
    };
  }

  /**
   * Connect to the BroadcastChannel and start routing
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.log('warn', 'Already connected');
      return;
    }

    if (typeof BroadcastChannel === 'undefined') {
      this.log('error', 'BroadcastChannel not supported');
      throw new Error('BroadcastChannel not supported in this environment');
    }

    try {
      // Create the channel
      this.channel = new BroadcastChannel(CANVAS_CHANNEL_NAME);

      // Handle incoming messages
      this.channel.onmessage = (event: MessageEvent) => {
        this.handleIncomingMessage(event.data);
      };

      this.channel.onmessageerror = (event: MessageEvent) => {
        this.log('error', 'Message error', event);
      };

      // Subscribe to EventBus events with 'user' scope
      this.eventBusUnsubscribe = this.eventBus.on('*', (event: Event) => {
        this.handleLocalEvent(event);
      });

      // Start heartbeat for presence
      if (this.config.autoDiscovery) {
        this.startHeartbeat();
      }

      // Clean up seen messages periodically
      this.seenMessageCleanupInterval = setInterval(() => {
        this.seenMessages.clear();
      }, 10000);

      this.connected = true;

      // Announce ourselves
      this.sendPing();

      this.log('info', `Connected to canvas router for canvas ${this.config.canvasId}`);
      this.emitRouterEvent('router:connected', { canvasId: this.config.canvasId });

    } catch (error) {
      this.log('error', 'Failed to connect', error);
      throw error;
    }
  }

  /**
   * Disconnect from the router
   */
  disconnect(): void {
    if (!this.connected) return;

    // Stop heartbeat
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    // Stop message cleanup
    if (this.seenMessageCleanupInterval) {
      clearInterval(this.seenMessageCleanupInterval);
      this.seenMessageCleanupInterval = null;
    }

    // Unsubscribe from EventBus
    if (this.eventBusUnsubscribe) {
      this.eventBusUnsubscribe();
      this.eventBusUnsubscribe = null;
    }

    // Close channel
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    // Clear state
    this.routes.clear();
    this.incomingSubscriptions.clear();
    this.outgoingSubscriptions.clear();
    this.activeCanvases.clear();
    this.seenMessages.clear();

    this.connected = false;

    this.log('info', 'Disconnected from canvas router');
    this.emitRouterEvent('router:disconnected', { canvasId: this.config.canvasId });
  }

  /**
   * Add a route for forwarding events to another canvas
   */
  addRoute(route: Omit<CanvasRoute, 'id' | 'createdAt' | 'updatedAt'>): CanvasRoute {
    const fullRoute: CanvasRoute = {
      ...route,
      id: generateRouteId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.routes.set(fullRoute.id, fullRoute);

    this.log('info', `Added route: ${fullRoute.name}`, fullRoute);
    this.emitRouterEvent('router:routeAdded', { route: fullRoute });

    return fullRoute;
  }

  /**
   * Remove a route
   */
  removeRoute(routeId: string): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    this.routes.delete(routeId);

    this.log('info', `Removed route: ${route.name}`);
    this.emitRouterEvent('router:routeRemoved', { routeId, routeName: route.name });

    return true;
  }

  /**
   * Update a route
   */
  updateRoute(routeId: string, updates: Partial<CanvasRoute>): CanvasRoute | null {
    const route = this.routes.get(routeId);
    if (!route) return null;

    const updatedRoute: CanvasRoute = {
      ...route,
      ...updates,
      id: route.id,
      createdAt: route.createdAt,
      updatedAt: Date.now()
    };

    this.routes.set(routeId, updatedRoute);
    return updatedRoute;
  }

  /**
   * Get all routes
   */
  getRoutes(): CanvasRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get routes for a specific target canvas
   */
  getRoutesForCanvas(targetCanvasId: string): CanvasRoute[] {
    return this.getRoutes().filter(r => r.targetCanvasId === targetCanvasId);
  }

  /**
   * Subscribe to events from another canvas
   */
  subscribeToCanvas(
    publisherCanvasId: string,
    eventTypes: string[] = ['*'],
    widgetIds?: string[]
  ): CanvasSubscription {
    const subscription: CanvasSubscription = {
      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
      subscriberCanvasId: this.config.canvasId,
      publisherCanvasId,
      eventTypes,
      widgetIds,
      createdAt: Date.now()
    };

    this.outgoingSubscriptions.set(subscription.id, subscription);

    // Notify the target canvas
    this.sendMessage({
      type: 'canvas:subscribe',
      sourceCanvasId: this.config.canvasId,
      targetCanvasId: publisherCanvasId,
      subscriptions: eventTypes,
      timestamp: Date.now(),
      messageId: generateMessageId()
    });

    this.log('info', `Subscribed to canvas ${publisherCanvasId}`, { eventTypes, widgetIds });

    return subscription;
  }

  /**
   * Unsubscribe from a canvas
   */
  unsubscribeFromCanvas(subscriptionId: string): boolean {
    const subscription = this.outgoingSubscriptions.get(subscriptionId);
    if (!subscription) return false;

    this.outgoingSubscriptions.delete(subscriptionId);

    // Notify the target canvas
    this.sendMessage({
      type: 'canvas:unsubscribe',
      sourceCanvasId: this.config.canvasId,
      targetCanvasId: subscription.publisherCanvasId,
      subscriptions: subscription.eventTypes,
      timestamp: Date.now(),
      messageId: generateMessageId()
    });

    return true;
  }

  /**
   * Get active canvases discovered via heartbeat
   */
  getActiveCanvases(): ActiveCanvas[] {
    return Array.from(this.activeCanvases.values());
  }

  /**
   * Send an event directly to another canvas (bypasses routes)
   */
  sendToCanvas(targetCanvasId: string, event: Event): void {
    if (!this.connected || !this.channel) {
      this.log('warn', 'Cannot send - not connected');
      return;
    }

    const message: CrossCanvasMessage = {
      type: 'canvas:event',
      sourceCanvasId: this.config.canvasId,
      targetCanvasId,
      event: {
        ...event,
        scope: 'user' // Mark as cross-canvas event
      },
      timestamp: Date.now(),
      messageId: generateMessageId()
    };

    this.channel.postMessage(message);
    this.log('debug', `Sent event to canvas ${targetCanvasId}`, event.type);
  }

  /**
   * Broadcast an event to all canvases
   */
  broadcastToAll(event: Event): void {
    if (!this.connected || !this.channel) {
      this.log('warn', 'Cannot broadcast - not connected');
      return;
    }

    const message: CrossCanvasMessage = {
      type: 'canvas:event',
      sourceCanvasId: this.config.canvasId,
      event: {
        ...event,
        scope: 'user'
      },
      timestamp: Date.now(),
      messageId: generateMessageId()
    };

    this.channel.postMessage(message);
    this.log('debug', `Broadcast event to all canvases`, event.type);
  }

  /**
   * Subscribe to router events
   */
  onRouterEvent(handler: (event: CanvasRouterEvent) => void): UnsubscribeFn {
    this.routerEventHandlers.add(handler);
    return () => {
      this.routerEventHandlers.delete(handler);
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current canvas ID
   */
  getCanvasId(): string {
    return this.config.canvasId;
  }

  // Private methods

  /**
   * Handle local events from EventBus
   */
  private handleLocalEvent(event: Event): void {
    // Skip events that came from other canvases (already routed)
    if (event.metadata?.originTabId && event.metadata.originTabId !== getTabId()) {
      return;
    }

    // Only forward events with 'user' scope or matching routes
    if (event.scope === 'user') {
      this.broadcastToAll(event);
      return;
    }

    // Forward widget:output events with 'cross.' prefix port names
    // This enables cross-canvas widgets to communicate without explicit 'user' scope
    if (event.type === 'widget:output') {
      const portName = event.payload?.portName;
      if (typeof portName === 'string' && portName.startsWith('cross.')) {
        console.log(`[CanvasRouter:${this.config.canvasId.slice(0,12)}] 📤 BROADCASTING cross-canvas output: ${portName}`, event.payload);
        this.log('debug', `Broadcasting cross-canvas output: ${portName}`, event.payload);
        this.broadcastToAll(event);
        return;
      }
    }

    // Check routes for this event
    for (const route of this.routes.values()) {
      if (!route.enabled) continue;
      if (route.sourceCanvasId !== this.config.canvasId) continue;

      // Check if event matches route criteria
      if (this.eventMatchesRoute(event, route)) {
        this.forwardEventViaRoute(event, route);
      }
    }

    // Check subscriptions (other canvases subscribed to us)
    for (const subscription of this.incomingSubscriptions.values()) {
      if (this.eventMatchesSubscription(event, subscription)) {
        this.sendToCanvas(subscription.subscriberCanvasId, event);
      }
    }
  }

  /**
   * Check if an event matches a route's criteria
   */
  private eventMatchesRoute(event: Event, route: CanvasRoute): boolean {
    // Check widget filter
    if (route.sourceWidgetId && event.sourceWidgetId !== route.sourceWidgetId) {
      return false;
    }

    // Check port filter (for widget:output events)
    if (route.sourcePort && event.type === 'widget:output') {
      const portName = event.payload?.portName;
      if (portName !== route.sourcePort) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if an event matches a subscription
   */
  private eventMatchesSubscription(event: Event, subscription: CanvasSubscription): boolean {
    // Check event type
    if (!subscription.eventTypes.includes('*') && !subscription.eventTypes.includes(event.type)) {
      return false;
    }

    // Check widget filter
    if (subscription.widgetIds && subscription.widgetIds.length > 0) {
      if (!event.sourceWidgetId || !subscription.widgetIds.includes(event.sourceWidgetId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Forward an event via a route
   */
  private forwardEventViaRoute(event: Event, route: CanvasRoute): void {
    const forwardedEvent = { ...event };

    // SECURITY: transformPayload feature is disabled due to code injection risk.
    // The previous implementation used new Function() which is equivalent to eval()
    // and could allow arbitrary code execution if route data is tampered with.
    // If payload transformation is needed, implement safe alternatives like:
    // - JSON path extraction (lodash.get)
    // - Whitelist of allowed transformations
    // - Structured mapping objects instead of JS expressions
    if (route.transformPayload) {
      this.log('warn', `transformPayload is disabled for security reasons (route: ${route.name})`);
    }

    // Set target widget if specified
    if (route.targetWidgetId) {
      forwardedEvent.targetWidgetId = route.targetWidgetId;
    }

    const message: CrossCanvasMessage = {
      type: 'canvas:event',
      sourceCanvasId: this.config.canvasId,
      targetCanvasId: route.targetCanvasId,
      event: forwardedEvent,
      routeId: route.id,
      timestamp: Date.now(),
      messageId: generateMessageId()
    };

    if (this.channel) {
      this.channel.postMessage(message);
      this.log('debug', `Routed event via ${route.name}`, event.type);
      this.emitRouterEvent('router:eventRouted', {
        routeId: route.id,
        routeName: route.name,
        eventType: event.type
      });
    }
  }

  /**
   * Handle incoming message from BroadcastChannel
   */
  private handleIncomingMessage(data: unknown): void {
    if (!data || typeof data !== 'object') return;

    const message = data as CrossCanvasMessage;

    // Validate message structure
    if (!message.type || !message.sourceCanvasId || !message.messageId) {
      return;
    }

    // Skip our own messages
    if (message.sourceCanvasId === this.config.canvasId) {
      return;
    }

    // Deduplicate messages
    if (this.seenMessages.has(message.messageId)) {
      return;
    }
    this.seenMessages.add(message.messageId);

    // Check if message is for us (or broadcast)
    if (message.targetCanvasId && message.targetCanvasId !== this.config.canvasId) {
      return;
    }

    switch (message.type) {
      case 'canvas:event':
        this.handleIncomingEvent(message);
        break;

      case 'canvas:subscribe':
        this.handleSubscriptionRequest(message);
        break;

      case 'canvas:unsubscribe':
        this.handleUnsubscriptionRequest(message);
        break;

      case 'canvas:ping':
        this.handlePing(message);
        break;

      case 'canvas:pong':
        this.handlePong(message);
        break;
    }
  }

  /**
   * Handle incoming event from another canvas
   */
  private handleIncomingEvent(message: CrossCanvasMessage): void {
    if (!message.event) return;

    const event: Event = {
      ...message.event,
      metadata: {
        ...message.event.metadata,
        eventId: message.messageId,
        originTabId: message.sourceCanvasId,
        seenBy: [...(message.event.metadata?.seenBy || []), this.config.canvasId],
        hopCount: (message.event.metadata?.hopCount || 0) + 1,
        originTimestamp: message.event.metadata?.originTimestamp || message.timestamp
      }
    };

    // DEBUG: Log cross-canvas events
    console.log(`[CanvasRouter:${this.config.canvasId.slice(0,12)}] 📥 RECEIVED from ${message.sourceCanvasId}:`, {
      type: event.type,
      portName: event.payload?.portName,
      value: event.payload?.value,
      scope: event.scope
    });

    this.log('debug', `Received event from canvas ${message.sourceCanvasId}`, event.type);

    // Emit to local EventBus
    this.eventBus.emit(event, true); // Skip loop guard since we already filtered
    
    console.log(`[CanvasRouter:${this.config.canvasId.slice(0,12)}] ✅ Re-emitted to local EventBus`);

    // Check if we need to forward via bidirectional routes
    if (message.routeId) {
      const route = this.routes.get(message.routeId);
      if (route?.bidirectional && route.targetCanvasId === this.config.canvasId) {
        // This is the return path of a bidirectional route - already handled by EventBus
      }
    }
  }

  /**
   * Handle subscription request from another canvas
   */
  private handleSubscriptionRequest(message: CrossCanvasMessage): void {
    const subscription: CanvasSubscription = {
      id: `sub_${message.sourceCanvasId}_${Date.now()}`,
      subscriberCanvasId: message.sourceCanvasId,
      publisherCanvasId: this.config.canvasId,
      eventTypes: message.subscriptions || ['*'],
      createdAt: Date.now()
    };

    this.incomingSubscriptions.set(subscription.id, subscription);
    this.log('info', `Canvas ${message.sourceCanvasId} subscribed to us`, subscription.eventTypes);
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscriptionRequest(message: CrossCanvasMessage): void {
    // Find and remove matching subscription
    for (const [id, sub] of this.incomingSubscriptions) {
      if (sub.subscriberCanvasId === message.sourceCanvasId) {
        this.incomingSubscriptions.delete(id);
        this.log('info', `Canvas ${message.sourceCanvasId} unsubscribed`);
        break;
      }
    }
  }

  /**
   * Handle ping from another canvas
   */
  private handlePing(message: CrossCanvasMessage): void {
    // Update active canvases
    this.updateActiveCanvas(message.sourceCanvasId);

    // Respond with pong
    this.sendPong(message.sourceCanvasId);
  }

  /**
   * Handle pong from another canvas
   */
  private handlePong(message: CrossCanvasMessage): void {
    const isNew = !this.activeCanvases.has(message.sourceCanvasId);

    this.updateActiveCanvas(message.sourceCanvasId);

    if (isNew) {
      this.log('info', `Discovered canvas: ${message.sourceCanvasId}`);
      this.emitRouterEvent('router:canvasDiscovered', {
        canvasId: message.sourceCanvasId
      });
    }
  }

  /**
   * Update active canvas record
   */
  private updateActiveCanvas(canvasId: string): void {
    this.activeCanvases.set(canvasId, {
      canvasId,
      tabId: canvasId, // Assuming canvasId maps to tabId for now
      lastSeen: Date.now(),
      widgetCount: 0, // Could be included in ping/pong
      isCurrentTab: false
    });
  }

  /**
   * Send a message via BroadcastChannel
   */
  private sendMessage(message: CrossCanvasMessage): void {
    if (this.channel && this.connected) {
      this.channel.postMessage(message);
    }
  }

  /**
   * Send ping to discover other canvases
   */
  private sendPing(): void {
    this.sendMessage({
      type: 'canvas:ping',
      sourceCanvasId: this.config.canvasId,
      timestamp: Date.now(),
      messageId: generateMessageId()
    });
  }

  /**
   * Send pong response
   */
  private sendPong(targetCanvasId: string): void {
    this.sendMessage({
      type: 'canvas:pong',
      sourceCanvasId: this.config.canvasId,
      targetCanvasId,
      timestamp: Date.now(),
      messageId: generateMessageId()
    });
  }

  /**
   * Start heartbeat for presence detection
   */
  private startHeartbeat(): void {
    // Initial ping
    this.sendPing();

    // Periodic heartbeat
    this.heartbeatIntervalId = setInterval(() => {
      this.sendPing();

      // Clean up stale canvases (not seen in 3 heartbeats)
      const staleThreshold = Date.now() - (this.config.heartbeatInterval * 3);
      for (const [canvasId, canvas] of this.activeCanvases) {
        if (canvas.lastSeen < staleThreshold) {
          this.activeCanvases.delete(canvasId);
          this.log('info', `Canvas lost: ${canvasId}`);
          this.emitRouterEvent('router:canvasLost', { canvasId });
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Emit a router event
   */
  private emitRouterEvent(type: CanvasRouterEventType, payload: any): void {
    const event: CanvasRouterEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

    this.routerEventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error('[CanvasRouter] Event handler error:', e);
      }
    });
  }

  /**
   * Debug logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugEnabled && level === 'debug') return;

    const prefix = `[CanvasRouter:${this.config.canvasId.slice(0, 8)}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
      default:
        console.log(prefix, message, data ?? '');
    }
  }
}

/**
 * Create and connect a CanvasRouter
 */
export async function createCanvasRouter(
  eventBus: EventBus,
  config: CanvasRouterConfig
): Promise<CanvasRouter> {
  const router = new CanvasRouter(eventBus, config);
  await router.connect();
  return router;
}
