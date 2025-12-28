/**
 * StickerNest v2 - Canvas Router Store
 * Zustand store for persisting cross-canvas routes and subscriptions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CanvasRoute, CanvasSubscription, ActiveCanvas } from '../types/crossCanvas';

interface CanvasRouterState {
  // Persisted routes (user-defined connections between canvases)
  routes: Record<string, CanvasRoute>;

  // Active subscriptions (what we're listening to)
  subscriptions: Record<string, CanvasSubscription>;

  // Active canvases (runtime only, not persisted)
  activeCanvases: Record<string, ActiveCanvas>;

  // UI state
  isConnected: boolean;
  currentCanvasId: string | null;
}

interface CanvasRouterActions {
  // Route management
  addRoute: (route: CanvasRoute) => void;
  updateRoute: (routeId: string, updates: Partial<CanvasRoute>) => void;
  removeRoute: (routeId: string) => void;
  toggleRouteEnabled: (routeId: string) => void;
  getRoutesForCanvas: (canvasId: string) => CanvasRoute[];
  getRoutesBySource: (sourceCanvasId: string) => CanvasRoute[];
  getRoutesByTarget: (targetCanvasId: string) => CanvasRoute[];

  // Subscription management
  addSubscription: (subscription: CanvasSubscription) => void;
  removeSubscription: (subscriptionId: string) => void;
  getSubscriptionsForCanvas: (publisherCanvasId: string) => CanvasSubscription[];

  // Active canvas management (runtime)
  setActiveCanvases: (canvases: ActiveCanvas[]) => void;
  addActiveCanvas: (canvas: ActiveCanvas) => void;
  removeActiveCanvas: (canvasId: string) => void;
  updateActiveCanvas: (canvasId: string, updates: Partial<ActiveCanvas>) => void;

  // Connection state
  setConnected: (connected: boolean) => void;
  setCurrentCanvasId: (canvasId: string | null) => void;

  // Bulk operations
  importRoutes: (routes: CanvasRoute[]) => void;
  exportRoutes: () => CanvasRoute[];
  clearAllRoutes: () => void;
}

export const useCanvasRouterStore = create<CanvasRouterState & CanvasRouterActions>()(
  persist(
    (set, get) => ({
      // Initial state
      routes: {},
      subscriptions: {},
      activeCanvases: {},
      isConnected: false,
      currentCanvasId: null,

      // Route management
      addRoute: (route) => {
        set((state) => ({
          routes: {
            ...state.routes,
            [route.id]: route
          }
        }));
      },

      updateRoute: (routeId, updates) => {
        set((state) => {
          const route = state.routes[routeId];
          if (!route) return state;

          return {
            routes: {
              ...state.routes,
              [routeId]: {
                ...route,
                ...updates,
                updatedAt: Date.now()
              }
            }
          };
        });
      },

      removeRoute: (routeId) => {
        set((state) => {
          const { [routeId]: removed, ...remaining } = state.routes;
          return { routes: remaining };
        });
      },

      toggleRouteEnabled: (routeId) => {
        set((state) => {
          const route = state.routes[routeId];
          if (!route) return state;

          return {
            routes: {
              ...state.routes,
              [routeId]: {
                ...route,
                enabled: !route.enabled,
                updatedAt: Date.now()
              }
            }
          };
        });
      },

      getRoutesForCanvas: (canvasId) => {
        const { routes } = get();
        return Object.values(routes).filter(
          r => r.sourceCanvasId === canvasId || r.targetCanvasId === canvasId
        );
      },

      getRoutesBySource: (sourceCanvasId) => {
        const { routes } = get();
        return Object.values(routes).filter(r => r.sourceCanvasId === sourceCanvasId);
      },

      getRoutesByTarget: (targetCanvasId) => {
        const { routes } = get();
        return Object.values(routes).filter(r => r.targetCanvasId === targetCanvasId);
      },

      // Subscription management
      addSubscription: (subscription) => {
        set((state) => ({
          subscriptions: {
            ...state.subscriptions,
            [subscription.id]: subscription
          }
        }));
      },

      removeSubscription: (subscriptionId) => {
        set((state) => {
          const { [subscriptionId]: removed, ...remaining } = state.subscriptions;
          return { subscriptions: remaining };
        });
      },

      getSubscriptionsForCanvas: (publisherCanvasId) => {
        const { subscriptions } = get();
        return Object.values(subscriptions).filter(
          s => s.publisherCanvasId === publisherCanvasId
        );
      },

      // Active canvas management
      setActiveCanvases: (canvases) => {
        const activeCanvases: Record<string, ActiveCanvas> = {};
        canvases.forEach(c => {
          activeCanvases[c.canvasId] = c;
        });
        set({ activeCanvases });
      },

      addActiveCanvas: (canvas) => {
        set((state) => ({
          activeCanvases: {
            ...state.activeCanvases,
            [canvas.canvasId]: canvas
          }
        }));
      },

      removeActiveCanvas: (canvasId) => {
        set((state) => {
          const { [canvasId]: removed, ...remaining } = state.activeCanvases;
          return { activeCanvases: remaining };
        });
      },

      updateActiveCanvas: (canvasId, updates) => {
        set((state) => {
          const canvas = state.activeCanvases[canvasId];
          if (!canvas) return state;

          return {
            activeCanvases: {
              ...state.activeCanvases,
              [canvasId]: {
                ...canvas,
                ...updates
              }
            }
          };
        });
      },

      // Connection state
      setConnected: (connected) => {
        set({ isConnected: connected });
      },

      setCurrentCanvasId: (canvasId) => {
        set({ currentCanvasId: canvasId });
      },

      // Bulk operations
      importRoutes: (routes) => {
        const routeMap: Record<string, CanvasRoute> = {};
        routes.forEach(r => {
          routeMap[r.id] = r;
        });
        set((state) => ({
          routes: {
            ...state.routes,
            ...routeMap
          }
        }));
      },

      exportRoutes: () => {
        const { routes } = get();
        return Object.values(routes);
      },

      clearAllRoutes: () => {
        set({ routes: {} });
      }
    }),
    {
      name: 'stickernest-canvas-router',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist routes and subscriptions, not runtime state
        routes: state.routes,
        subscriptions: state.subscriptions
      })
    }
  )
);

/**
 * Selector hooks for common queries
 */
export const useRoutes = () => useCanvasRouterStore(state => Object.values(state.routes));
export const useActiveCanvases = () => useCanvasRouterStore(state => Object.values(state.activeCanvases));
export const useIsConnected = () => useCanvasRouterStore(state => state.isConnected);
export const useCurrentCanvasId = () => useCanvasRouterStore(state => state.currentCanvasId);
