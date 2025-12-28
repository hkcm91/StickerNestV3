/**
 * StickerNest v2 - Collaboration Message Handlers
 * Handlers for incoming WebSocket messages.
 */

import { useCollaborationStore, type CollaboratorRole } from '../../state/useCollaborationStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import { EventBus } from '../../runtime/EventBus';
import type { WSMessage, RemoteUser, CollaborationConfig, CollaborationEventType } from './types';

type EventEmitter = (event: { type: CollaborationEventType; data?: unknown }) => void;

export interface MessageHandlerContext {
  config: CollaborationConfig | null;
  remoteUsers: Map<string, RemoteUser>;
  currentCanvasId: string | null;
  eventBus: EventBus | null;
  emitEvent: EventEmitter;
  pendingAcks: Map<string, { resolve: () => void; reject: (err: Error) => void }>;
  startHeartbeat: () => void;
  flushMessageQueue: () => void;
}

/**
 * Handle ACK messages
 */
export function handleAck(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const originalId = message.originalMessageId as string;
  const success = message.success as boolean;

  // Handle auth acknowledgment
  if (originalId === 'auth' || message.id === 'auth') {
    const pending = context.pendingAcks.get('auth');
    if (pending) {
      const authStore = useCollaborationStore.getState();
      if (success !== false) {
        authStore.setConnectionStatus('connected');
        authStore.updateLocalUser({ connectionQuality: 'excellent' });
        context.startHeartbeat();
        context.flushMessageQueue();
        context.emitEvent({ type: 'connected' });
        pending.resolve();
      } else {
        authStore.setConnectionStatus('error', 'Authentication failed');
        pending.reject(new Error('Authentication failed'));
      }
      context.pendingAcks.delete('auth');
    }
  }

  // Handle other acks
  const pending = context.pendingAcks.get(originalId);
  if (pending) {
    pending.resolve();
    context.pendingAcks.delete(originalId);
  }
}

/**
 * Handle error messages
 */
export function handleError(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  console.error('[CollaborationService] Server error:', message.code, message.message);
  context.emitEvent({ type: 'error', data: { code: message.code, message: message.message } });
}

/**
 * Handle presence join
 */
export function handlePresenceJoin(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const user = message.user as { id: string; username: string; color: string };
  if (!user || user.id === context.config?.user.id) return;

  const remoteUser: RemoteUser = {
    id: user.id,
    username: user.username,
    color: user.color,
  };

  context.remoteUsers.set(user.id, remoteUser);

  const store = useCollaborationStore.getState();
  store.addCollaborator({
    id: user.id,
    displayName: user.username,
    color: user.color,
    role: 'viewer' as CollaboratorRole,
    isLocal: false,
    lastActivity: Date.now(),
    isActive: true,
    currentCanvasId: context.currentCanvasId || undefined,
    deviceType: 'desktop',
    connectionQuality: 'good',
  });

  context.emitEvent({ type: 'user:joined', data: remoteUser });
  console.log('[CollaborationService] User joined:', user.username);
}

/**
 * Handle presence leave
 */
export function handlePresenceLeave(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const userId = message.userId as string;
  if (!userId) return;

  const user = context.remoteUsers.get(userId);
  context.remoteUsers.delete(userId);

  const store = useCollaborationStore.getState();
  store.removeCollaborator(userId);

  context.emitEvent({ type: 'user:left', data: { userId, username: user?.username } });
  console.log('[CollaborationService] User left:', userId);
}

/**
 * Handle presence update
 */
export function handlePresenceUpdate(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const userId = message.userId as string;
  if (!userId || userId === context.config?.user.id) return;

  const user = context.remoteUsers.get(userId);
  if (!user) return;

  // Update cursor
  if (message.cursor) {
    user.cursor = message.cursor as { x: number; y: number };
    context.emitEvent({ type: 'cursor:moved', data: { userId, cursor: user.cursor } });
  }

  // Update selection
  if (message.selectedIds) {
    user.selectedIds = message.selectedIds as string[];
    context.emitEvent({ type: 'selection:changed', data: { userId, selectedIds: user.selectedIds } });
  }

  // Update collaboration store
  const store = useCollaborationStore.getState();
  store.updateCollaborator(userId, { lastActivity: Date.now(), isActive: true });
}

/**
 * Handle remote widget create
 */
export function handleRemoteWidgetCreate(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const widget = message.widget as {
    id: string;
    widgetDefId: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    zIndex: number;
    state?: Record<string, unknown>;
  };

  if (!widget) return;

  context.emitEvent({ type: 'widget:created', data: widget });

  context.eventBus?.emit({
    type: 'collaboration:widget:created',
    scope: 'canvas',
    payload: widget,
  });
}

/**
 * Handle remote widget update
 */
export function handleRemoteWidgetUpdate(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const widgetId = message.widgetId as string;
  const changes = message.changes as Record<string, unknown>;

  if (!widgetId || !changes) return;

  context.emitEvent({ type: 'widget:updated', data: { widgetId, changes } });

  context.eventBus?.emit({
    type: 'collaboration:widget:updated',
    scope: 'canvas',
    payload: { widgetId, changes },
  });
}

/**
 * Handle remote widget delete
 */
export function handleRemoteWidgetDelete(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const widgetId = message.widgetId as string;
  if (!widgetId) return;

  context.emitEvent({ type: 'widget:deleted', data: { widgetId } });

  context.eventBus?.emit({
    type: 'collaboration:widget:deleted',
    scope: 'canvas',
    payload: { widgetId },
  });
}

/**
 * Handle remote widget move
 */
export function handleRemoteWidgetMove(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const widgetId = message.widgetId as string;
  const position = message.position as { x: number; y: number };

  if (!widgetId || !position) return;

  context.emitEvent({ type: 'widget:moved', data: { widgetId, position } });

  // Update canvas store directly for smooth movement
  const canvasStore = useCanvasStore.getState();
  canvasStore.updateWidget(widgetId, { position });
}

/**
 * Handle remote widget resize
 */
export function handleRemoteWidgetResize(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const widgetId = message.widgetId as string;
  const dimensions = message.dimensions as { width: number; height: number };

  if (!widgetId || !dimensions) return;

  context.emitEvent({ type: 'widget:resized', data: { widgetId, dimensions } });

  // Update canvas store directly
  const canvasStore = useCanvasStore.getState();
  canvasStore.updateWidget(widgetId, dimensions);
}

/**
 * Handle remote widget state
 */
export function handleRemoteWidgetState(
  message: WSMessage & Record<string, unknown>,
  context: MessageHandlerContext
): void {
  const widgetId = message.widgetId as string;
  const state = message.state as Record<string, unknown>;
  const partial = message.partial as boolean;

  if (!widgetId || !state) return;

  context.eventBus?.emit({
    type: 'collaboration:widget:state',
    scope: 'canvas',
    payload: { widgetId, state, partial },
  });
}
