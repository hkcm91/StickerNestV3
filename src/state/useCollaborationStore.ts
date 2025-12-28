/**
 * StickerNest v2 - Collaboration Store (Zustand)
 * Global state management for multi-user collaboration sessions
 * Handles rooms, participants, connection state, and view switching
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Collaboration connection status */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/** User role within a collaboration session */
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

/** Collaborator information */
export interface Collaborator {
  /** Unique user ID */
  id: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** User's assigned color for cursors/selections */
  color: string;
  /** Role in current session */
  role: CollaboratorRole;
  /** Is this the local user? */
  isLocal: boolean;
  /** Last activity timestamp */
  lastActivity: number;
  /** Is user currently active (not idle) */
  isActive: boolean;
  /** Current canvas they're viewing */
  currentCanvasId?: string;
  /** Device type */
  deviceType: 'desktop' | 'tablet' | 'mobile';
  /** Connection quality indicator */
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

/** Collaboration room/session */
export interface CollaborationRoom {
  /** Unique room ID */
  id: string;
  /** Room display name */
  name: string;
  /** Room owner user ID */
  ownerId: string;
  /** Canvas IDs in this room */
  canvasIds: string[];
  /** Active canvas ID for the room */
  activeCanvasId: string;
  /** Room creation time */
  createdAt: number;
  /** Last activity in room */
  lastActivity: number;
  /** Room settings */
  settings: RoomSettings;
  /** Invite code (if enabled) */
  inviteCode?: string;
  /** Invite code expiration */
  inviteExpires?: number;
}

/** Room settings */
export interface RoomSettings {
  /** Allow viewers to use reactions */
  viewerReactions: boolean;
  /** Allow viewers to chat */
  viewerChat: boolean;
  /** Allow editors to invite others */
  editorsCanInvite: boolean;
  /** Show cursor trails */
  showCursorTrails: boolean;
  /** Show selection highlights */
  showSelections: boolean;
  /** Max participants (0 = unlimited) */
  maxParticipants: number;
  /** Require password to join */
  requirePassword: boolean;
  /** Auto-kick idle users after X minutes (0 = disabled) */
  idleTimeout: number;
  /** Sync viewport/zoom across participants */
  syncViewport: boolean;
}

/** View state for canvas switching */
export interface ViewState {
  /** Canvas ID being viewed */
  canvasId: string;
  /** Viewport position */
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  /** Last update timestamp */
  updatedAt: number;
}

/** Pending operation for offline support */
export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  target: 'widget' | 'canvas' | 'room';
  targetId: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

// ==================
// Default Values
// ==================

const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  viewerReactions: true,
  viewerChat: true,
  editorsCanInvite: false,
  showCursorTrails: true,
  showSelections: true,
  maxParticipants: 0,
  requirePassword: false,
  idleTimeout: 30,
  syncViewport: false,
};

// Distinct colors for collaborators
const COLLABORATOR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky
  '#F8B500', // Amber
  '#00CED1', // Dark Cyan
];

// ==================
// Store State
// ==================

export interface CollaborationState {
  // Connection
  connectionStatus: ConnectionStatus;
  serverUrl: string | null;
  connectionError: string | null;
  lastConnected: number | null;
  reconnectAttempts: number;

  // Local user
  localUser: Collaborator | null;

  // Current room
  currentRoom: CollaborationRoom | null;
  collaborators: Map<string, Collaborator>;

  // View state
  viewStates: Map<string, ViewState>;
  followingUserId: string | null;

  // Offline support
  pendingOperations: PendingOperation[];
  isOfflineMode: boolean;

  // UI state
  isSidebarOpen: boolean;
  isInviteModalOpen: boolean;
  activeTab: 'participants' | 'chat' | 'history';
}

// ==================
// Store Actions
// ==================

export interface CollaborationActions {
  // Connection
  connect: (serverUrl: string) => void;
  disconnect: () => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;

  // Local user
  setLocalUser: (user: Collaborator) => void;
  updateLocalUser: (updates: Partial<Collaborator>) => void;

  // Room management
  createRoom: (name: string, canvasIds: string[]) => CollaborationRoom;
  joinRoom: (roomId: string, inviteCode?: string) => void;
  leaveRoom: () => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  generateInviteCode: (expiresInMinutes?: number) => string;
  revokeInviteCode: () => void;

  // Collaborators
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaborator: (userId: string, updates: Partial<Collaborator>) => void;
  setCollaboratorRole: (userId: string, role: CollaboratorRole) => void;
  kickCollaborator: (userId: string) => void;
  getCollaboratorColor: (index: number) => string;

  // View switching
  switchCanvas: (canvasId: string) => void;
  updateViewState: (canvasId: string, viewport: ViewState['viewport']) => void;
  followUser: (userId: string | null) => void;
  getCollaboratorsOnCanvas: (canvasId: string) => Collaborator[];

  // Offline support
  addPendingOperation: (op: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>) => void;
  removePendingOperation: (opId: string) => void;
  syncPendingOperations: () => Promise<void>;
  setOfflineMode: (offline: boolean) => void;

  // UI
  toggleSidebar: () => void;
  setInviteModalOpen: (open: boolean) => void;
  setActiveTab: (tab: CollaborationState['activeTab']) => void;

  // Reset
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: CollaborationState = {
  connectionStatus: 'disconnected',
  serverUrl: null,
  connectionError: null,
  lastConnected: null,
  reconnectAttempts: 0,
  localUser: null,
  currentRoom: null,
  collaborators: new Map(),
  viewStates: new Map(),
  followingUserId: null,
  pendingOperations: [],
  isOfflineMode: false,
  isSidebarOpen: false,
  isInviteModalOpen: false,
  activeTab: 'participants',
};

// ==================
// Store Implementation
// ==================

export const useCollaborationStore = create<CollaborationState & CollaborationActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Connection Actions
        // ==================

        connect: (serverUrl: string) => {
          set({
            serverUrl,
            connectionStatus: 'connecting',
            connectionError: null,
            reconnectAttempts: 0,
          });
          // Actual WebSocket connection handled by CollaborationService
        },

        disconnect: () => {
          set({
            connectionStatus: 'disconnected',
            currentRoom: null,
            collaborators: new Map(),
            followingUserId: null,
          });
        },

        setConnectionStatus: (status: ConnectionStatus, error?: string) => {
          const updates: Partial<CollaborationState> = {
            connectionStatus: status,
          };

          if (error) {
            updates.connectionError = error;
          }

          if (status === 'connected') {
            updates.lastConnected = Date.now();
            updates.connectionError = null;
            updates.reconnectAttempts = 0;
            updates.isOfflineMode = false;
          }

          if (status === 'reconnecting') {
            updates.reconnectAttempts = get().reconnectAttempts + 1;
          }

          set(updates);
        },

        // ==================
        // Local User Actions
        // ==================

        setLocalUser: (user: Collaborator) => {
          set({ localUser: { ...user, isLocal: true } });
        },

        updateLocalUser: (updates: Partial<Collaborator>) => {
          const { localUser } = get();
          if (localUser) {
            set({ localUser: { ...localUser, ...updates } });
          }
        },

        // ==================
        // Room Management
        // ==================

        createRoom: (name: string, canvasIds: string[]) => {
          const { localUser } = get();
          if (!localUser) {
            throw new Error('Must be logged in to create a room');
          }

          const room: CollaborationRoom = {
            id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name,
            ownerId: localUser.id,
            canvasIds,
            activeCanvasId: canvasIds[0] || '',
            createdAt: Date.now(),
            lastActivity: Date.now(),
            settings: { ...DEFAULT_ROOM_SETTINGS },
          };

          const collaborators = new Map<string, Collaborator>();
          collaborators.set(localUser.id, { ...localUser, role: 'owner' });

          set({
            currentRoom: room,
            collaborators,
          });

          return room;
        },

        joinRoom: (roomId: string, _inviteCode?: string) => {
          set({ connectionStatus: 'connecting' });
          // Actual join logic handled by CollaborationService
          // This will be called back with room data
          console.log(`Joining room: ${roomId}`);
        },

        leaveRoom: () => {
          set({
            currentRoom: null,
            collaborators: new Map(),
            viewStates: new Map(),
            followingUserId: null,
          });
        },

        updateRoomSettings: (settings: Partial<RoomSettings>) => {
          const { currentRoom } = get();
          if (currentRoom) {
            set({
              currentRoom: {
                ...currentRoom,
                settings: { ...currentRoom.settings, ...settings },
                lastActivity: Date.now(),
              },
            });
          }
        },

        generateInviteCode: (expiresInMinutes = 60) => {
          const { currentRoom } = get();
          if (!currentRoom) return '';

          const code = Math.random().toString(36).slice(2, 8).toUpperCase();
          const expires = Date.now() + expiresInMinutes * 60 * 1000;

          set({
            currentRoom: {
              ...currentRoom,
              inviteCode: code,
              inviteExpires: expires,
            },
          });

          return code;
        },

        revokeInviteCode: () => {
          const { currentRoom } = get();
          if (currentRoom) {
            set({
              currentRoom: {
                ...currentRoom,
                inviteCode: undefined,
                inviteExpires: undefined,
              },
            });
          }
        },

        // ==================
        // Collaborator Management
        // ==================

        addCollaborator: (collaborator: Collaborator) => {
          const { collaborators, currentRoom } = get();
          const newCollaborators = new Map(collaborators);

          // Assign color if not set
          if (!collaborator.color) {
            collaborator.color = get().getCollaboratorColor(newCollaborators.size);
          }

          newCollaborators.set(collaborator.id, collaborator);

          set({
            collaborators: newCollaborators,
            currentRoom: currentRoom
              ? { ...currentRoom, lastActivity: Date.now() }
              : null,
          });
        },

        removeCollaborator: (userId: string) => {
          const { collaborators, followingUserId } = get();
          const newCollaborators = new Map(collaborators);
          newCollaborators.delete(userId);

          const updates: Partial<CollaborationState> = {
            collaborators: newCollaborators,
          };

          // Stop following if removed user was being followed
          if (followingUserId === userId) {
            updates.followingUserId = null;
          }

          set(updates);
        },

        updateCollaborator: (userId: string, updates: Partial<Collaborator>) => {
          const { collaborators } = get();
          const collaborator = collaborators.get(userId);
          if (collaborator) {
            const newCollaborators = new Map(collaborators);
            newCollaborators.set(userId, { ...collaborator, ...updates });
            set({ collaborators: newCollaborators });
          }
        },

        setCollaboratorRole: (userId: string, role: CollaboratorRole) => {
          get().updateCollaborator(userId, { role });
        },

        kickCollaborator: (userId: string) => {
          const { localUser, currentRoom, collaborators } = get();

          // Only owner can kick
          if (!localUser || !currentRoom || currentRoom.ownerId !== localUser.id) {
            console.warn('Only room owner can kick collaborators');
            return;
          }

          // Can't kick owner
          if (userId === currentRoom.ownerId) {
            console.warn('Cannot kick room owner');
            return;
          }

          const collaborator = collaborators.get(userId);
          if (collaborator) {
            // Remove from local state
            get().removeCollaborator(userId);
            // CollaborationService will send kick message to server
          }
        },

        getCollaboratorColor: (index: number) => {
          return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
        },

        // ==================
        // View Switching
        // ==================

        switchCanvas: (canvasId: string) => {
          const { localUser, currentRoom } = get();

          if (localUser) {
            get().updateLocalUser({ currentCanvasId: canvasId });
          }

          if (currentRoom) {
            set({
              currentRoom: {
                ...currentRoom,
                activeCanvasId: canvasId,
                lastActivity: Date.now(),
              },
            });
          }
        },

        updateViewState: (canvasId: string, viewport: ViewState['viewport']) => {
          const { viewStates } = get();
          const newViewStates = new Map(viewStates);
          newViewStates.set(canvasId, {
            canvasId,
            viewport,
            updatedAt: Date.now(),
          });
          set({ viewStates: newViewStates });
        },

        followUser: (userId: string | null) => {
          set({ followingUserId: userId });
        },

        getCollaboratorsOnCanvas: (canvasId: string) => {
          const { collaborators } = get();
          return Array.from(collaborators.values()).filter(
            (c) => c.currentCanvasId === canvasId && !c.isLocal
          );
        },

        // ==================
        // Offline Support
        // ==================

        addPendingOperation: (op) => {
          const { pendingOperations } = get();
          const newOp: PendingOperation = {
            ...op,
            id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            timestamp: Date.now(),
            retries: 0,
          };
          set({ pendingOperations: [...pendingOperations, newOp] });
        },

        removePendingOperation: (opId: string) => {
          const { pendingOperations } = get();
          set({
            pendingOperations: pendingOperations.filter((op) => op.id !== opId),
          });
        },

        syncPendingOperations: async () => {
          const { pendingOperations, connectionStatus } = get();

          if (connectionStatus !== 'connected' || pendingOperations.length === 0) {
            return;
          }

          // Operations will be synced by CollaborationService
          console.log(`Syncing ${pendingOperations.length} pending operations`);
        },

        setOfflineMode: (offline: boolean) => {
          set({ isOfflineMode: offline });
        },

        // ==================
        // UI Actions
        // ==================

        toggleSidebar: () => {
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
        },

        setInviteModalOpen: (open: boolean) => {
          set({ isInviteModalOpen: open });
        },

        setActiveTab: (tab: CollaborationState['activeTab']) => {
          set({ activeTab: tab });
        },

        // ==================
        // Reset
        // ==================

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'stickernest-collaboration',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist essential data
          serverUrl: state.serverUrl,
          localUser: state.localUser
            ? {
                id: state.localUser.id,
                displayName: state.localUser.displayName,
                avatarUrl: state.localUser.avatarUrl,
                color: state.localUser.color,
              }
            : null,
          pendingOperations: state.pendingOperations,
        }),
      }
    ),
    { name: 'CollaborationStore' }
  )
);

// ==================
// Selectors
// ==================

/** Get connection status */
export const selectConnectionStatus = (state: CollaborationState) => state.connectionStatus;

/** Get local user */
export const selectLocalUser = (state: CollaborationState) => state.localUser;

/** Get current room */
export const selectCurrentRoom = (state: CollaborationState) => state.currentRoom;

/** Get all collaborators as array */
export const selectCollaborators = (state: CollaborationState) =>
  Array.from(state.collaborators.values());

/** Get remote collaborators (excluding local user) */
export const selectRemoteCollaborators = (state: CollaborationState) =>
  Array.from(state.collaborators.values()).filter((c) => !c.isLocal);

/** Get collaborator count */
export const selectCollaboratorCount = (state: CollaborationState) =>
  state.collaborators.size;

/** Get user being followed */
export const selectFollowingUser = (state: CollaborationState) => {
  if (!state.followingUserId) return null;
  return state.collaborators.get(state.followingUserId) || null;
};

/** Check if local user is room owner */
export const selectIsRoomOwner = (state: CollaborationState) =>
  state.localUser && state.currentRoom
    ? state.currentRoom.ownerId === state.localUser.id
    : false;

/** Check if local user can edit */
export const selectCanEdit = (state: CollaborationState) =>
  state.localUser?.role === 'owner' || state.localUser?.role === 'editor';

/** Get pending operation count */
export const selectPendingOperationCount = (state: CollaborationState) =>
  state.pendingOperations.length;

export default useCollaborationStore;
