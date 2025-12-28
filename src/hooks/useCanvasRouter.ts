/**
 * StickerNest v2 - useCanvasRouter Hook
 * React hook for managing cross-canvas communication
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { CanvasRouter, createCanvasRouter } from '../runtime/CanvasRouter';
import { EventBus } from '../runtime/EventBus';
import { useCanvasRouterStore } from '../state/useCanvasRouterStore';
import type { CanvasRoute, ActiveCanvas, CanvasRouterEvent } from '../types/crossCanvas';
import type { Event } from '../types/runtime';

interface UseCanvasRouterOptions {
  canvasId: string;
  userId: string;
  eventBus: EventBus;
  debugEnabled?: boolean;
  autoConnect?: boolean;
  autoDiscovery?: boolean;
}

interface UseCanvasRouterReturn {
  // Connection state
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;

  // Active canvases
  activeCanvases: ActiveCanvas[];

  // Routes
  routes: CanvasRoute[];
  addRoute: (route: Omit<CanvasRoute, 'id' | 'createdAt' | 'updatedAt'>) => CanvasRoute | null;
  updateRoute: (routeId: string, updates: Partial<CanvasRoute>) => void;
  removeRoute: (routeId: string) => void;
  toggleRouteEnabled: (routeId: string) => void;

  // Direct messaging
  sendToCanvas: (targetCanvasId: string, event: Event) => void;
  broadcastToAll: (event: Event) => void;

  // Subscriptions
  subscribeToCanvas: (canvasId: string, eventTypes?: string[]) => string | null;
  unsubscribeFromCanvas: (subscriptionId: string) => void;

  // Events
  onRouterEvent: (handler: (event: CanvasRouterEvent) => void) => () => void;
}

/**
 * Hook for managing cross-canvas communication
 */
export function useCanvasRouter(options: UseCanvasRouterOptions): UseCanvasRouterReturn {
  const {
    canvasId,
    userId,
    eventBus,
    debugEnabled = false,
    autoConnect = true,
    autoDiscovery = true
  } = options;

  const routerRef = useRef<CanvasRouter | null>(null);

  // Store state
  const {
    routes,
    activeCanvases,
    isConnected,
    addRoute: storeAddRoute,
    updateRoute: storeUpdateRoute,
    removeRoute: storeRemoveRoute,
    toggleRouteEnabled: storeToggleRoute,
    setActiveCanvases,
    addActiveCanvas,
    removeActiveCanvas,
    setConnected,
    setCurrentCanvasId
  } = useCanvasRouterStore();

  // Initialize router
  useEffect(() => {
    if (!autoConnect) return;

    let mounted = true;

    const initRouter = async () => {
      try {
        const router = await createCanvasRouter(eventBus, {
          canvasId,
          userId,
          debugEnabled,
          autoDiscovery
        });

        if (!mounted) {
          router.disconnect();
          return;
        }

        routerRef.current = router;
        setConnected(true);
        setCurrentCanvasId(canvasId);

        // Load persisted routes into router
        Object.values(routes).forEach(route => {
          if (route.sourceCanvasId === canvasId || route.targetCanvasId === canvasId) {
            router.addRoute(route);
          }
        });

        // Listen for router events
        router.onRouterEvent((event) => {
          switch (event.type) {
            case 'router:canvasDiscovered':
              addActiveCanvas({
                canvasId: event.payload.canvasId,
                tabId: event.payload.canvasId,
                lastSeen: Date.now(),
                widgetCount: 0,
                isCurrentTab: false
              });
              break;

            case 'router:canvasLost':
              removeActiveCanvas(event.payload.canvasId);
              break;

            case 'router:disconnected':
              setConnected(false);
              break;
          }
        });

        // Update active canvases
        setActiveCanvases(router.getActiveCanvases());

      } catch (error) {
        console.error('[useCanvasRouter] Failed to initialize:', error);
      }
    };

    initRouter();

    return () => {
      mounted = false;
      if (routerRef.current) {
        routerRef.current.disconnect();
        routerRef.current = null;
      }
      setConnected(false);
    };
  }, [canvasId, userId, autoConnect, autoDiscovery, debugEnabled]);

  // Manual connect
  const connect = useCallback(async () => {
    if (routerRef.current?.isConnected()) return;

    try {
      const router = await createCanvasRouter(eventBus, {
        canvasId,
        userId,
        debugEnabled,
        autoDiscovery
      });

      routerRef.current = router;
      setConnected(true);
      setCurrentCanvasId(canvasId);

      // Load persisted routes
      Object.values(routes).forEach(route => {
        if (route.sourceCanvasId === canvasId || route.targetCanvasId === canvasId) {
          router.addRoute(route);
        }
      });

    } catch (error) {
      console.error('[useCanvasRouter] Failed to connect:', error);
      throw error;
    }
  }, [canvasId, userId, debugEnabled, autoDiscovery, eventBus, routes]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (routerRef.current) {
      routerRef.current.disconnect();
      routerRef.current = null;
    }
    setConnected(false);
  }, []);

  // Add route
  const addRoute = useCallback((
    route: Omit<CanvasRoute, 'id' | 'createdAt' | 'updatedAt'>
  ): CanvasRoute | null => {
    if (!routerRef.current) return null;

    const newRoute = routerRef.current.addRoute(route);
    storeAddRoute(newRoute);
    return newRoute;
  }, [storeAddRoute]);

  // Update route
  const updateRoute = useCallback((routeId: string, updates: Partial<CanvasRoute>) => {
    if (routerRef.current) {
      routerRef.current.updateRoute(routeId, updates);
    }
    storeUpdateRoute(routeId, updates);
  }, [storeUpdateRoute]);

  // Remove route
  const removeRoute = useCallback((routeId: string) => {
    if (routerRef.current) {
      routerRef.current.removeRoute(routeId);
    }
    storeRemoveRoute(routeId);
  }, [storeRemoveRoute]);

  // Toggle route enabled
  const toggleRouteEnabled = useCallback((routeId: string) => {
    const route = routes[routeId];
    if (route && routerRef.current) {
      routerRef.current.updateRoute(routeId, { enabled: !route.enabled });
    }
    storeToggleRoute(routeId);
  }, [routes, storeToggleRoute]);

  // Send to specific canvas
  const sendToCanvas = useCallback((targetCanvasId: string, event: Event) => {
    if (!routerRef.current) {
      console.warn('[useCanvasRouter] Not connected');
      return;
    }
    routerRef.current.sendToCanvas(targetCanvasId, event);
  }, []);

  // Broadcast to all canvases
  const broadcastToAll = useCallback((event: Event) => {
    if (!routerRef.current) {
      console.warn('[useCanvasRouter] Not connected');
      return;
    }
    routerRef.current.broadcastToAll(event);
  }, []);

  // Subscribe to another canvas
  const subscribeToCanvas = useCallback((
    targetCanvasId: string,
    eventTypes: string[] = ['*']
  ): string | null => {
    if (!routerRef.current) return null;

    const subscription = routerRef.current.subscribeToCanvas(targetCanvasId, eventTypes);
    return subscription.id;
  }, []);

  // Unsubscribe
  const unsubscribeFromCanvas = useCallback((subscriptionId: string) => {
    if (routerRef.current) {
      routerRef.current.unsubscribeFromCanvas(subscriptionId);
    }
  }, []);

  // Router events
  const onRouterEvent = useCallback((handler: (event: CanvasRouterEvent) => void) => {
    if (!routerRef.current) {
      return () => {};
    }
    return routerRef.current.onRouterEvent(handler);
  }, []);

  // Memoized return values
  const routesList = useMemo(() => Object.values(routes), [routes]);
  const activeCanvasesList = useMemo(() => Object.values(activeCanvases), [activeCanvases]);

  return {
    isConnected,
    connect,
    disconnect,
    activeCanvases: activeCanvasesList,
    routes: routesList,
    addRoute,
    updateRoute,
    removeRoute,
    toggleRouteEnabled,
    sendToCanvas,
    broadcastToAll,
    subscribeToCanvas,
    unsubscribeFromCanvas,
    onRouterEvent
  };
}

/**
 * Simple hook for just sending/receiving cross-canvas events
 * (when you don't need full route management)
 */
export function useCrossCanvasEvents(
  eventBus: EventBus | null,
  canvasId: string,
  userId: string
) {
  const routerRef = useRef<CanvasRouter | null>(null);

  useEffect(() => {
    // Skip if no eventBus provided
    if (!eventBus) return;

    let mounted = true;

    createCanvasRouter(eventBus, { canvasId, userId })
      .then(router => {
        if (mounted) {
          routerRef.current = router;
          console.log(`[useCrossCanvasEvents] Router connected for canvas ${canvasId}`);
        } else {
          router.disconnect();
        }
      })
      .catch(console.error);

    return () => {
      mounted = false;
      routerRef.current?.disconnect();
      routerRef.current = null;
    };
  }, [canvasId, userId, eventBus]);

  const send = useCallback((targetCanvasId: string, event: Event) => {
    routerRef.current?.sendToCanvas(targetCanvasId, event);
  }, []);

  const broadcast = useCallback((event: Event) => {
    routerRef.current?.broadcastToAll(event);
  }, []);

  return { send, broadcast };
}
