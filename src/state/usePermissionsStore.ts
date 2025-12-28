/**
 * StickerNest v2 - Permissions Store (Zustand)
 * Role-based access control for collaborative editing
 * Manages what actions users can perform based on their role
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CollaboratorRole } from './useCollaborationStore';

// ==================
// Types
// ==================

/** Permission action types */
export type PermissionAction =
  // Widget actions
  | 'widget:create'
  | 'widget:delete'
  | 'widget:move'
  | 'widget:resize'
  | 'widget:edit'
  | 'widget:configure'
  | 'widget:lock'
  | 'widget:unlock'
  | 'widget:duplicate'
  // Canvas actions
  | 'canvas:create'
  | 'canvas:delete'
  | 'canvas:rename'
  | 'canvas:export'
  | 'canvas:share'
  | 'canvas:configure'
  // Room actions
  | 'room:invite'
  | 'room:kick'
  | 'room:configure'
  | 'room:delete'
  | 'room:transfer'
  // Presence actions
  | 'presence:cursor'
  | 'presence:selection'
  | 'presence:reaction'
  | 'presence:chat'
  // View actions
  | 'view:switch'
  | 'view:follow'
  | 'view:pan'
  | 'view:zoom';

/** Permission result with optional reason */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/** Widget-specific lock */
export interface WidgetLock {
  widgetId: string;
  lockedBy: string;
  lockedAt: number;
  reason?: string;
}

/** Canvas-specific access override */
export interface CanvasAccess {
  canvasId: string;
  userId: string;
  role: CollaboratorRole;
  grantedBy: string;
  grantedAt: number;
}

// ==================
// Permission Matrix
// ==================

/** Default permissions by role */
const ROLE_PERMISSIONS: Record<CollaboratorRole, Set<PermissionAction>> = {
  owner: new Set([
    // Widget actions
    'widget:create',
    'widget:delete',
    'widget:move',
    'widget:resize',
    'widget:edit',
    'widget:configure',
    'widget:lock',
    'widget:unlock',
    'widget:duplicate',
    // Canvas actions
    'canvas:create',
    'canvas:delete',
    'canvas:rename',
    'canvas:export',
    'canvas:share',
    'canvas:configure',
    // Room actions
    'room:invite',
    'room:kick',
    'room:configure',
    'room:delete',
    'room:transfer',
    // Presence actions
    'presence:cursor',
    'presence:selection',
    'presence:reaction',
    'presence:chat',
    // View actions
    'view:switch',
    'view:follow',
    'view:pan',
    'view:zoom',
  ]),

  editor: new Set([
    // Widget actions
    'widget:create',
    'widget:delete',
    'widget:move',
    'widget:resize',
    'widget:edit',
    'widget:configure',
    'widget:duplicate',
    // Canvas actions
    'canvas:create',
    'canvas:rename',
    'canvas:export',
    // Presence actions
    'presence:cursor',
    'presence:selection',
    'presence:reaction',
    'presence:chat',
    // View actions
    'view:switch',
    'view:follow',
    'view:pan',
    'view:zoom',
  ]),

  viewer: new Set([
    // Presence actions
    'presence:cursor',
    'presence:reaction',
    'presence:chat',
    // View actions
    'view:switch',
    'view:follow',
    'view:pan',
    'view:zoom',
  ]),
};

// ==================
// Store State
// ==================

export interface PermissionsState {
  // Current user's role
  currentRole: CollaboratorRole;
  currentUserId: string | null;

  // Widget locks
  widgetLocks: Map<string, WidgetLock>;

  // Canvas-specific access overrides
  canvasAccess: Map<string, CanvasAccess[]>;

  // Temporarily elevated permissions
  temporaryElevations: Map<string, { action: PermissionAction; expiresAt: number }>;

  // Permission cache for performance
  permissionCache: Map<string, PermissionResult>;
  cacheTimestamp: number;
}

// ==================
// Store Actions
// ==================

export interface PermissionsActions {
  // Role management
  setCurrentRole: (role: CollaboratorRole) => void;
  setCurrentUser: (userId: string, role: CollaboratorRole) => void;

  // Permission checking
  can: (action: PermissionAction, targetId?: string) => boolean;
  canWithReason: (action: PermissionAction, targetId?: string) => PermissionResult;
  hasAnyPermission: (actions: PermissionAction[]) => boolean;
  hasAllPermissions: (actions: PermissionAction[]) => boolean;

  // Widget locks
  lockWidget: (widgetId: string, reason?: string) => boolean;
  unlockWidget: (widgetId: string) => boolean;
  isWidgetLocked: (widgetId: string) => boolean;
  getWidgetLock: (widgetId: string) => WidgetLock | null;
  getMyLockedWidgets: () => string[];
  clearExpiredLocks: () => void;

  // Canvas access
  setCanvasAccess: (canvasId: string, userId: string, role: CollaboratorRole) => void;
  removeCanvasAccess: (canvasId: string, userId: string) => void;
  getCanvasRole: (canvasId: string, userId?: string) => CollaboratorRole;

  // Temporary elevations
  grantTemporaryPermission: (userId: string, action: PermissionAction, durationMs: number) => void;
  revokeTemporaryPermission: (userId: string, action: PermissionAction) => void;
  cleanupExpiredElevations: () => void;

  // Cache management
  invalidateCache: () => void;

  // Bulk checks (for UI state)
  getWidgetPermissions: (widgetId: string) => {
    canMove: boolean;
    canResize: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canConfigure: boolean;
    canLock: boolean;
    canUnlock: boolean;
  };

  getCanvasPermissions: (canvasId: string) => {
    canCreate: boolean;
    canDelete: boolean;
    canRename: boolean;
    canExport: boolean;
    canShare: boolean;
    canConfigure: boolean;
  };

  getRoomPermissions: () => {
    canInvite: boolean;
    canKick: boolean;
    canConfigure: boolean;
    canDelete: boolean;
    canTransfer: boolean;
  };

  // Reset
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: PermissionsState = {
  currentRole: 'viewer',
  currentUserId: null,
  widgetLocks: new Map(),
  canvasAccess: new Map(),
  temporaryElevations: new Map(),
  permissionCache: new Map(),
  cacheTimestamp: 0,
};

// ==================
// Store Implementation
// ==================

export const usePermissionsStore = create<PermissionsState & PermissionsActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Role Management
      // ==================

      setCurrentRole: (role: CollaboratorRole) => {
        set({ currentRole: role, cacheTimestamp: 0 });
        get().invalidateCache();
      },

      setCurrentUser: (userId: string, role: CollaboratorRole) => {
        set({
          currentUserId: userId,
          currentRole: role,
          cacheTimestamp: 0,
        });
        get().invalidateCache();
      },

      // ==================
      // Permission Checking
      // ==================

      can: (action: PermissionAction, targetId?: string): boolean => {
        return get().canWithReason(action, targetId).allowed;
      },

      canWithReason: (action: PermissionAction, targetId?: string): PermissionResult => {
        const { currentRole, currentUserId, widgetLocks, temporaryElevations, permissionCache } = get();

        // Check cache first
        const cacheKey = `${action}:${targetId || 'global'}`;
        const cached = permissionCache.get(cacheKey);
        if (cached && Date.now() - get().cacheTimestamp < 1000) {
          return cached;
        }

        // Check temporary elevations
        if (currentUserId) {
          const elevationKey = `${currentUserId}:${action}`;
          const elevation = temporaryElevations.get(elevationKey);
          if (elevation && Date.now() < elevation.expiresAt) {
            const result = { allowed: true, reason: 'Temporary permission granted' };
            get().updateCache(cacheKey, result);
            return result;
          }
        }

        // Check base role permissions
        const rolePermissions = ROLE_PERMISSIONS[currentRole];
        if (!rolePermissions.has(action)) {
          const result = {
            allowed: false,
            reason: `Role '${currentRole}' does not have permission for '${action}'`,
          };
          get().updateCache(cacheKey, result);
          return result;
        }

        // Check widget-specific locks for widget actions
        if (targetId && action.startsWith('widget:')) {
          const lock = widgetLocks.get(targetId);
          if (lock && lock.lockedBy !== currentUserId) {
            // Only owner can unlock others' locks
            if (action !== 'widget:unlock' || currentRole !== 'owner') {
              const result = {
                allowed: false,
                reason: `Widget is locked by another user${lock.reason ? `: ${lock.reason}` : ''}`,
              };
              get().updateCache(cacheKey, result);
              return result;
            }
          }
        }

        const result = { allowed: true };
        get().updateCache(cacheKey, result);
        return result;
      },

      hasAnyPermission: (actions: PermissionAction[]): boolean => {
        return actions.some((action) => get().can(action));
      },

      hasAllPermissions: (actions: PermissionAction[]): boolean => {
        return actions.every((action) => get().can(action));
      },

      // Helper to update cache
      updateCache: (key: string, result: PermissionResult) => {
        const { permissionCache } = get();
        const newCache = new Map(permissionCache);
        newCache.set(key, result);
        set({ permissionCache: newCache, cacheTimestamp: Date.now() });
      },

      // ==================
      // Widget Locks
      // ==================

      lockWidget: (widgetId: string, reason?: string): boolean => {
        const { currentUserId, widgetLocks } = get();
        if (!currentUserId) return false;

        // Check if can lock
        if (!get().can('widget:lock', widgetId)) return false;

        // Check if already locked by someone else
        const existingLock = widgetLocks.get(widgetId);
        if (existingLock && existingLock.lockedBy !== currentUserId) {
          return false;
        }

        const newLocks = new Map(widgetLocks);
        newLocks.set(widgetId, {
          widgetId,
          lockedBy: currentUserId,
          lockedAt: Date.now(),
          reason,
        });

        set({ widgetLocks: newLocks });
        get().invalidateCache();
        return true;
      },

      unlockWidget: (widgetId: string): boolean => {
        const { currentUserId, currentRole, widgetLocks } = get();
        if (!currentUserId) return false;

        const lock = widgetLocks.get(widgetId);
        if (!lock) return true; // Already unlocked

        // Only locker or owner can unlock
        if (lock.lockedBy !== currentUserId && currentRole !== 'owner') {
          return false;
        }

        const newLocks = new Map(widgetLocks);
        newLocks.delete(widgetId);

        set({ widgetLocks: newLocks });
        get().invalidateCache();
        return true;
      },

      isWidgetLocked: (widgetId: string): boolean => {
        return get().widgetLocks.has(widgetId);
      },

      getWidgetLock: (widgetId: string): WidgetLock | null => {
        return get().widgetLocks.get(widgetId) || null;
      },

      getMyLockedWidgets: (): string[] => {
        const { currentUserId, widgetLocks } = get();
        if (!currentUserId) return [];

        return Array.from(widgetLocks.entries())
          .filter(([_, lock]) => lock.lockedBy === currentUserId)
          .map(([widgetId]) => widgetId);
      },

      clearExpiredLocks: () => {
        // Locks don't expire by default, but this can be extended
        // to support timed locks
      },

      // ==================
      // Canvas Access
      // ==================

      setCanvasAccess: (canvasId: string, userId: string, role: CollaboratorRole) => {
        const { canvasAccess, currentUserId } = get();
        if (!currentUserId) return;

        const newAccess = new Map(canvasAccess);
        const canvasRoles = newAccess.get(canvasId) || [];

        // Remove existing access for user
        const filtered = canvasRoles.filter((a) => a.userId !== userId);

        // Add new access
        filtered.push({
          canvasId,
          userId,
          role,
          grantedBy: currentUserId,
          grantedAt: Date.now(),
        });

        newAccess.set(canvasId, filtered);
        set({ canvasAccess: newAccess });
        get().invalidateCache();
      },

      removeCanvasAccess: (canvasId: string, userId: string) => {
        const { canvasAccess } = get();
        const newAccess = new Map(canvasAccess);
        const canvasRoles = newAccess.get(canvasId) || [];

        const filtered = canvasRoles.filter((a) => a.userId !== userId);

        if (filtered.length === 0) {
          newAccess.delete(canvasId);
        } else {
          newAccess.set(canvasId, filtered);
        }

        set({ canvasAccess: newAccess });
        get().invalidateCache();
      },

      getCanvasRole: (canvasId: string, userId?: string): CollaboratorRole => {
        const { canvasAccess, currentUserId, currentRole } = get();
        const targetUserId = userId || currentUserId;
        if (!targetUserId) return 'viewer';

        const canvasRoles = canvasAccess.get(canvasId) || [];
        const access = canvasRoles.find((a) => a.userId === targetUserId);

        return access?.role || currentRole;
      },

      // ==================
      // Temporary Elevations
      // ==================

      grantTemporaryPermission: (userId: string, action: PermissionAction, durationMs: number) => {
        const { temporaryElevations, currentRole } = get();

        // Only owner can grant temporary permissions
        if (currentRole !== 'owner') return;

        const newElevations = new Map(temporaryElevations);
        const key = `${userId}:${action}`;

        newElevations.set(key, {
          action,
          expiresAt: Date.now() + durationMs,
        });

        set({ temporaryElevations: newElevations });
        get().invalidateCache();
      },

      revokeTemporaryPermission: (userId: string, action: PermissionAction) => {
        const { temporaryElevations } = get();
        const newElevations = new Map(temporaryElevations);
        const key = `${userId}:${action}`;

        newElevations.delete(key);
        set({ temporaryElevations: newElevations });
        get().invalidateCache();
      },

      cleanupExpiredElevations: () => {
        const { temporaryElevations } = get();
        const now = Date.now();
        const newElevations = new Map(temporaryElevations);
        let changed = false;

        for (const [key, elevation] of newElevations) {
          if (now >= elevation.expiresAt) {
            newElevations.delete(key);
            changed = true;
          }
        }

        if (changed) {
          set({ temporaryElevations: newElevations });
          get().invalidateCache();
        }
      },

      // ==================
      // Cache Management
      // ==================

      invalidateCache: () => {
        set({ permissionCache: new Map(), cacheTimestamp: 0 });
      },

      // ==================
      // Bulk Permission Checks
      // ==================

      getWidgetPermissions: (widgetId: string) => {
        const can = get().can;
        return {
          canMove: can('widget:move', widgetId),
          canResize: can('widget:resize', widgetId),
          canEdit: can('widget:edit', widgetId),
          canDelete: can('widget:delete', widgetId),
          canConfigure: can('widget:configure', widgetId),
          canLock: can('widget:lock', widgetId),
          canUnlock: can('widget:unlock', widgetId),
        };
      },

      getCanvasPermissions: (canvasId: string) => {
        const can = get().can;
        return {
          canCreate: can('canvas:create', canvasId),
          canDelete: can('canvas:delete', canvasId),
          canRename: can('canvas:rename', canvasId),
          canExport: can('canvas:export', canvasId),
          canShare: can('canvas:share', canvasId),
          canConfigure: can('canvas:configure', canvasId),
        };
      },

      getRoomPermissions: () => {
        const can = get().can;
        return {
          canInvite: can('room:invite'),
          canKick: can('room:kick'),
          canConfigure: can('room:configure'),
          canDelete: can('room:delete'),
          canTransfer: can('room:transfer'),
        };
      },

      // ==================
      // Reset
      // ==================

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'PermissionsStore' }
  )
);

// ==================
// Selectors
// ==================

/** Get current role */
export const selectCurrentRole = (state: PermissionsState) => state.currentRole;

/** Check if user is owner */
export const selectIsOwner = (state: PermissionsState) => state.currentRole === 'owner';

/** Check if user is editor or owner */
export const selectCanEdit = (state: PermissionsState) =>
  state.currentRole === 'owner' || state.currentRole === 'editor';

/** Check if user is viewer */
export const selectIsViewer = (state: PermissionsState) => state.currentRole === 'viewer';

/** Get all widget locks */
export const selectWidgetLocks = (state: PermissionsState) =>
  Array.from(state.widgetLocks.values());

/** Get lock count */
export const selectLockCount = (state: PermissionsState) => state.widgetLocks.size;

// ==================
// Utility Hooks
// ==================

/**
 * Hook to check permission for a specific action
 */
export function usePermission(action: PermissionAction, targetId?: string): boolean {
  return usePermissionsStore((state) => {
    const { currentRole, widgetLocks, temporaryElevations, currentUserId } = state;

    // Check temporary elevations
    if (currentUserId) {
      const elevationKey = `${currentUserId}:${action}`;
      const elevation = temporaryElevations.get(elevationKey);
      if (elevation && Date.now() < elevation.expiresAt) {
        return true;
      }
    }

    // Check base role permissions
    if (!ROLE_PERMISSIONS[currentRole].has(action)) {
      return false;
    }

    // Check widget locks
    if (targetId && action.startsWith('widget:')) {
      const lock = widgetLocks.get(targetId);
      if (lock && lock.lockedBy !== currentUserId) {
        return action === 'widget:unlock' && currentRole === 'owner';
      }
    }

    return true;
  });
}

export default usePermissionsStore;
