/**
 * StickerNest v2 - Canvas Bridge
 *
 * Enables communication between multiple canvases by bridging their EventBuses.
 * When an event is emitted on one canvas, it can be forwarded to other connected canvases,
 * allowing widgets on different canvases to "talk" to each other.
 *
 * Usage:
 *   const bridge = new CanvasBridge();
 *   bridge.addCanvas('canvas-1', eventBus1);
 *   bridge.addCanvas('canvas-2', eventBus2);
 *   // Now events emitted on either canvas can be received by the other
 */

import type { Event, UnsubscribeFn } from '../types/runtime';
import type { EventBus } from './EventBus';

export interface BridgeOptions {
  /** Event types to forward (default: all except internal events) */
  allowedEventTypes?: string[];
  /** Event types to block from forwarding */
  blockedEventTypes?: string[];
  /** Whether to forward widget:output events (default: true) */
  forwardWidgetOutputs?: boolean;
  /** Whether to forward widget:input events (default: true) */
  forwardWidgetInputs?: boolean;
  /** Custom event filter function */
  eventFilter?: (event: Event, sourceCanvasId: string, targetCanvasId: string) => boolean;
}

interface ConnectedCanvas {
  id: string;
  eventBus: EventBus;
  unsubscribe: UnsubscribeFn;
}

const DEFAULT_BLOCKED_EVENTS = [
  'bridge:', // Internal bridge events
  'canvas:viewport', // Viewport changes are canvas-specific
  'canvas:selection', // Selection is canvas-specific
  'internal:', // Internal events
];

export class CanvasBridge {
  private canvases: Map<string, ConnectedCanvas> = new Map();
  private options: BridgeOptions;
  private isForwarding: boolean = false; // Prevent infinite loops

  constructor(options: BridgeOptions = {}) {
    this.options = {
      forwardWidgetOutputs: true,
      forwardWidgetInputs: true,
      ...options,
    };
  }

  /**
   * Add a canvas to the bridge
   */
  addCanvas(canvasId: string, eventBus: EventBus): void {
    if (this.canvases.has(canvasId)) {
      console.warn(`[CanvasBridge] Canvas "${canvasId}" already connected`);
      return;
    }

    // Subscribe to all events on this canvas
    const unsubscribe = eventBus.on('*', (event: Event) => {
      this.handleEvent(event, canvasId);
    });

    this.canvases.set(canvasId, {
      id: canvasId,
      eventBus,
      unsubscribe,
    });

    console.log(`[CanvasBridge] Canvas "${canvasId}" connected. Total canvases: ${this.canvases.size}`);
  }

  /**
   * Remove a canvas from the bridge
   */
  removeCanvas(canvasId: string): void {
    const canvas = this.canvases.get(canvasId);
    if (canvas) {
      canvas.unsubscribe();
      this.canvases.delete(canvasId);
      console.log(`[CanvasBridge] Canvas "${canvasId}" disconnected. Total canvases: ${this.canvases.size}`);
    }
  }

  /**
   * Handle an event from a canvas and forward to others
   */
  private handleEvent(event: Event, sourceCanvasId: string): void {
    // Prevent infinite loops
    if (this.isForwarding) return;

    // Check if this event should be forwarded
    if (!this.shouldForward(event, sourceCanvasId)) return;

    this.isForwarding = true;

    try {
      // Forward to all other canvases
      this.canvases.forEach((canvas, canvasId) => {
        if (canvasId === sourceCanvasId) return;

        // Apply custom filter if provided
        if (this.options.eventFilter && !this.options.eventFilter(event, sourceCanvasId, canvasId)) {
          return;
        }

        // Create a bridged event with source canvas info
        const bridgedEvent: Event = {
          ...event,
          metadata: {
            ...event.metadata,
            bridgedFrom: sourceCanvasId,
            bridgedTo: canvasId,
            hopCount: (event.metadata?.hopCount || 0) + 1,
          } as any,
        };

        // Emit to target canvas
        canvas.eventBus.emit(bridgedEvent, true); // Skip loop guard since we handle it here
      });
    } finally {
      this.isForwarding = false;
    }
  }

  /**
   * Check if an event should be forwarded
   */
  private shouldForward(event: Event, _sourceCanvasId: string): boolean {
    const eventType = event.type;

    // Check blocked event types
    const blockedTypes = [
      ...(this.options.blockedEventTypes || []),
      ...DEFAULT_BLOCKED_EVENTS,
    ];

    for (const blocked of blockedTypes) {
      if (eventType.startsWith(blocked)) {
        return false;
      }
    }

    // Check allowed event types (if specified)
    if (this.options.allowedEventTypes && this.options.allowedEventTypes.length > 0) {
      return this.options.allowedEventTypes.some(allowed => eventType.startsWith(allowed));
    }

    // Check widget output/input forwarding
    if (eventType === 'widget:output' && !this.options.forwardWidgetOutputs) {
      return false;
    }
    if (eventType === 'widget:input' && !this.options.forwardWidgetInputs) {
      return false;
    }

    // Already bridged - don't forward again
    if ((event.metadata as any)?.bridgedFrom) {
      return false;
    }

    return true;
  }

  /**
   * Get all connected canvas IDs
   */
  getConnectedCanvases(): string[] {
    return Array.from(this.canvases.keys());
  }

  /**
   * Check if a canvas is connected
   */
  isConnected(canvasId: string): boolean {
    return this.canvases.has(canvasId);
  }

  /**
   * Emit an event to a specific canvas
   */
  emitTo(canvasId: string, event: Event): void {
    const canvas = this.canvases.get(canvasId);
    if (canvas) {
      canvas.eventBus.emit(event);
    }
  }

  /**
   * Emit an event to all connected canvases
   */
  broadcast(event: Event): void {
    this.canvases.forEach((canvas) => {
      canvas.eventBus.emit(event);
    });
  }

  /**
   * Destroy the bridge and cleanup all subscriptions
   */
  destroy(): void {
    this.canvases.forEach((canvas) => {
      canvas.unsubscribe();
    });
    this.canvases.clear();
    console.log('[CanvasBridge] Destroyed');
  }
}

/**
 * Create a shared EventBus for multiple canvases
 * Alternative to CanvasBridge - uses a single EventBus for all canvases
 */
export function createSharedEventBus(): EventBus {
  // Import dynamically to avoid circular dependencies
  const { EventBus } = require('./EventBus');
  return new EventBus();
}
