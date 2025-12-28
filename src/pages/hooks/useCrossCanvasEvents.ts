/**
 * useCrossCanvasEvents
 * Handles cross-canvas event forwarding and social bridge setup
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { EventBus } from '../../runtime/EventBus';
import { SocialEventBridge } from '../../runtime/SocialEventBridge';
import type { Event } from '../../types/runtime';
import type { DemoCanvas, DemoUser, BroadcastStatus } from './landing.types';

const CROSS_CANVAS_PORT = 'landing.cross-bus';

export interface UseCrossCanvasEventsOptions {
  demoCanvases: readonly DemoCanvas[];
  demoUsers: Record<string, DemoUser>;
  currentTheme?: { colors?: { accent?: { primary?: string } } } | null;
}

export function useCrossCanvasEvents(options: UseCrossCanvasEventsOptions) {
  const { demoCanvases, demoUsers, currentTheme } = options;
  const canvasIds = demoCanvases.map(c => c.id);

  // EventBus and SocialBridge refs
  const eventBusMapRef = useRef<Record<string, EventBus>>({});
  const socialBridgeMapRef = useRef<Record<string, SocialEventBridge>>({});
  const [broadcastStates, setBroadcastStates] = useState<Record<string, BroadcastStatus>>({});

  // Get EventBus for canvas
  const getEventBus = useCallback((canvasId: string) => {
    if (!eventBusMapRef.current[canvasId]) {
      eventBusMapRef.current[canvasId] = new EventBus();
    }
    return eventBusMapRef.current[canvasId];
  }, []);

  // Get SocialEventBridge for canvas
  const getSocialBridge = useCallback((canvasId: string) => {
    if (!socialBridgeMapRef.current[canvasId]) {
      const eventBus = getEventBus(canvasId);
      const bridge = new SocialEventBridge(eventBus);
      socialBridgeMapRef.current[canvasId] = bridge;
    }
    return socialBridgeMapRef.current[canvasId];
  }, [getEventBus]);

  // Get userId for canvas
  const getUserIdForCanvas = useCallback((canvasId: string): string => {
    const canvas = demoCanvases.find(c => c.id === canvasId);
    return canvas?.userId || 'unknown';
  }, [demoCanvases]);

  // Check if event is social event
  const isSocialEvent = useCallback((eventType: string): boolean => {
    return eventType.startsWith('social:');
  }, []);

  // Check if port is cross-canvas
  const isCrossCanvasPort = useCallback((portName: string): boolean => {
    if (!portName) return false;
    return portName === CROSS_CANVAS_PORT ||
           portName.startsWith('cross.') ||
           portName.startsWith('sync.') ||
           portName.startsWith('user.');
  }, []);

  // Initialize SocialEventBridges
  useEffect(() => {
    console.log('[useCrossCanvasEvents] Initializing SocialEventBridges...');
    canvasIds.forEach(canvasId => {
      const bridge = getSocialBridge(canvasId);
      if (!bridge.isActive()) {
        bridge.initialize();
        console.log(`[useCrossCanvasEvents] Bridge initialized for ${canvasId}`);
      }
    });

    return () => {
      Object.values(socialBridgeMapRef.current).forEach(bridge => {
        if (bridge.isActive()) {
          bridge.destroy();
        }
      });
    };
  }, [canvasIds, getSocialBridge]);

  // Emit user context for a canvas
  const emitUserContext = useCallback((canvasId: string) => {
    const canvas = demoCanvases.find(c => c.id === canvasId);
    if (!canvas) return;

    const bus = getEventBus(canvasId);
    const currentUser = demoUsers[canvas.userId];

    if (currentUser) {
      bus.emit({
        type: 'social:current-user',
        scope: 'canvas',
        payload: {
          userId: currentUser.userId,
          userName: currentUser.username,
          userAvatar: currentUser.avatarUrl,
          canvasId: canvas.id,
        },
        timestamp: Date.now(),
      });

      bus.emit({
        type: 'social:friends-loaded',
        scope: 'canvas',
        payload: {
          friendIds: Object.keys(demoUsers),
        },
        timestamp: Date.now(),
      });
    }
  }, [demoCanvases, demoUsers, getEventBus]);

  // Set up user contexts and periodic re-emit
  useEffect(() => {
    canvasIds.forEach(canvasId => emitUserContext(canvasId));

    const interval = setInterval(() => {
      canvasIds.forEach(canvasId => emitUserContext(canvasId));
    }, 2000);

    return () => clearInterval(interval);
  }, [canvasIds, emitUserContext]);

  // Cross-canvas social event forwarding
  useEffect(() => {
    const unsubscribers = canvasIds.map(canvasId => {
      const bus = getEventBus(canvasId);
      const sourceUserId = getUserIdForCanvas(canvasId);
      const sourceUser = demoUsers[sourceUserId];

      return bus.on('*', (event) => {
        if (!isSocialEvent(event.type)) return;
        if (event.payload?.forwarded) return;
        if (event.type === 'social:current-user' || event.type === 'social:friends-loaded') return;

        canvasIds.forEach(targetCanvasId => {
          if (targetCanvasId === canvasId) return;

          const targetBus = getEventBus(targetCanvasId);
          const targetUserId = getUserIdForCanvas(targetCanvasId);
          const isCrossUser = sourceUserId !== targetUserId;

          if (event.type === 'social:chat-message' && isCrossUser && sourceUser) {
            targetBus.emit({
              type: 'presence:user-joined',
              scope: 'canvas',
              payload: {
                canvasId: targetCanvasId,
                userId: sourceUser.userId,
                username: sourceUser.username,
                avatarUrl: sourceUser.avatarUrl,
                status: 'online',
                isOwner: false,
              },
              timestamp: Date.now(),
            });
          }

          targetBus.emit({
            ...event,
            payload: {
              ...event.payload,
              forwarded: true,
              sourceCanvasId: canvasId,
              targetCanvasId,
              sourceUserId,
              targetUserId,
              isCrossUser,
            },
            timestamp: Date.now(),
          });
        });
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }, [canvasIds, getEventBus, getUserIdForCanvas, isSocialEvent, demoUsers]);

  // Handle cross-canvas widget output events
  const handleCrossCanvasEvent = useCallback((sourceCanvasId: string, event: Event) => {
    const { portName, value, widgetInstanceId } = event.payload || {};
    if (!isCrossCanvasPort(portName) || !value) return;

    const sourceUserId = getUserIdForCanvas(sourceCanvasId);
    const isUserScopedPort = portName.startsWith('user.');

    let targets: string[];
    if (value.targetCanvasId && canvasIds.includes(value.targetCanvasId)) {
      targets = [value.targetCanvasId];
    } else if (isUserScopedPort) {
      targets = canvasIds.filter(id =>
        id !== sourceCanvasId && getUserIdForCanvas(id) === sourceUserId
      );
    } else {
      targets = canvasIds.filter(id => id !== sourceCanvasId);
    }

    if (!targets.length) return;

    const accentColor = value.accent || value.color || currentTheme?.colors?.accent?.primary || '#8b5cf6';
    const messageContent = value.content || value.message || value.color || 'Cross-canvas signal';

    targets.forEach((targetCanvasId) => {
      const targetBus = getEventBus(targetCanvasId);
      const targetUserId = getUserIdForCanvas(targetCanvasId);
      const isCrossUserMessage = sourceUserId !== targetUserId;

      targetBus.emit({
        type: 'widget:output',
        scope: 'canvas',
        payload: {
          widgetInstanceId: widgetInstanceId || event.sourceWidgetId,
          portName,
          value: {
            ...value,
            sourceCanvasId,
            targetCanvasId,
            sourceUserId,
            targetUserId,
            isCrossUser: isCrossUserMessage
          }
        },
        sourceWidgetId: event.sourceWidgetId,
        timestamp: Date.now()
      });

      targetBus.emit({
        type: portName,
        scope: 'canvas',
        payload: {
          ...value,
          sourceCanvasId,
          targetCanvasId,
          sourceUserId,
          targetUserId,
          isCrossUser: isCrossUserMessage
        },
        sourceWidgetId: event.sourceWidgetId,
        timestamp: Date.now()
      });

      setBroadcastStates(prev => ({
        ...prev,
        [targetCanvasId]: {
          message: isCrossUserMessage ? `[Cross-User] ${messageContent}` : messageContent,
          from: `${sourceCanvasId} (${sourceUserId})`,
          accent: accentColor,
          timestamp: Date.now()
        }
      }));
    });

    setBroadcastStates(prev => ({
      ...prev,
      [sourceCanvasId]: {
        message: `Sent: ${messageContent}`,
        from: sourceCanvasId,
        accent: accentColor,
        timestamp: Date.now()
      }
    }));
  }, [canvasIds, currentTheme?.colors?.accent?.primary, getEventBus, getUserIdForCanvas, isCrossCanvasPort]);

  // Listen for widget:output events on all canvases
  useEffect(() => {
    const unsubscribers = canvasIds.map(canvasId => {
      const bus = getEventBus(canvasId);
      return bus.on('widget:output', (event) => handleCrossCanvasEvent(canvasId, event));
    });

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }, [canvasIds, getEventBus, handleCrossCanvasEvent]);

  return {
    getEventBus,
    getSocialBridge,
    getUserIdForCanvas,
    broadcastStates,
    setBroadcastStates,
    eventBusMapRef,
    socialBridgeMapRef,
  };
}
