/**
 * StickerNest v2 - Presence Manager
 *
 * Manages user presence across all contexts:
 * - Local tab presence (this tab)
 * - Device tabs presence (SharedWorker)
 * - Remote user presence (WebSocket)
 *
 * Features:
 * - User cursor position sync
 * - Selection state sync
 * - Activity status (active, idle, away)
 * - Heartbeat-based liveness detection
 * - Lag compensation for smooth cursor rendering
 *
 * Version: 1.0.0
 */

import { EventBus } from './EventBus';
import { TransportManager } from './TransportManager';
import { IdentityManager, getIdentity, getTabId } from './IdentityManager';
import type { TabInfo, RemoteUserPresence } from './transports';

/**
 * Activity status
 */
export type ActivityStatus = 'active' | 'idle' | 'away';

/**
 * Cursor position with interpolation data
 */
export interface CursorPosition {
    x: number;
    y: number;
    timestamp: number;
    /** Previous position for interpolation */
    prevX?: number;
    prevY?: number;
    prevTimestamp?: number;
}

/**
 * Selection info
 */
export interface SelectionInfo {
    selectedWidgetIds: string[];
    selectionBounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * Local presence state
 */
export interface LocalPresence {
    cursor: CursorPosition | null;
    selection: SelectionInfo;
    status: ActivityStatus;
    lastActivity: number;
    canvasId?: string;
}

/**
 * Remote presence (from another tab or user)
 */
export interface PresenceEntry {
    /** Unique identifier (tabId for local device, tabId for remote) */
    id: string;
    /** User ID if authenticated */
    userId?: string;
    /** Device ID */
    deviceId: string;
    /** Tab ID */
    tabId: string;
    /** Display name */
    displayName: string;
    /** Color for cursor/selection highlighting */
    color: string;
    /** Cursor position */
    cursor: CursorPosition | null;
    /** Selected widgets */
    selection: SelectionInfo;
    /** Activity status */
    status: ActivityStatus;
    /** Last seen timestamp */
    lastSeen: number;
    /** Is this from the same device? */
    isSameDevice: boolean;
    /** Connection latency estimate (ms) */
    latency?: number;
}

/**
 * Presence configuration
 */
export interface PresenceConfig {
    /** Cursor update throttle in ms */
    cursorThrottleMs?: number;
    /** Idle timeout in ms */
    idleTimeoutMs?: number;
    /** Away timeout in ms */
    awayTimeoutMs?: number;
    /** Heartbeat interval in ms */
    heartbeatIntervalMs?: number;
    /** Enable cursor interpolation */
    interpolateCursors?: boolean;
    /** Presence cleanup interval in ms */
    cleanupIntervalMs?: number;
    /** Stale presence timeout in ms */
    staleTimeoutMs?: number;
}

/**
 * Generate a color based on a string (for consistent user colors)
 */
function generateColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with good saturation and lightness
    const h = hash % 360;
    const s = 65 + (hash % 20); // 65-85%
    const l = 50 + (hash % 15); // 50-65%

    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Presence Manager class
 */
class PresenceManagerClass {
    private eventBus: EventBus | null = null;
    private config: Required<PresenceConfig> = {
        cursorThrottleMs: 50,
        idleTimeoutMs: 60000, // 1 minute
        awayTimeoutMs: 300000, // 5 minutes
        heartbeatIntervalMs: 5000,
        interpolateCursors: true,
        cleanupIntervalMs: 10000,
        staleTimeoutMs: 30000
    };
    private initialized = false;

    // Local state
    private localPresence: LocalPresence = {
        cursor: null,
        selection: { selectedWidgetIds: [] },
        status: 'active',
        lastActivity: Date.now()
    };

    // Remote presence from all sources
    private presenceMap: Map<string, PresenceEntry> = new Map();

    // Throttling
    private lastCursorUpdate: number = 0;
    private pendingCursorUpdate: CursorPosition | null = null;
    private cursorThrottleTimeout: ReturnType<typeof setTimeout> | null = null;

    // Intervals
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;
    private activityCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Event handlers
    private presenceChangeHandlers: Set<(presences: PresenceEntry[]) => void> = new Set();
    private cursorMoveHandlers: Set<(id: string, cursor: CursorPosition) => void> = new Set();

    // Unsubscribers
    private unsubscribers: Array<() => void> = [];

    /**
     * Initialize the presence manager
     */
    async initialize(eventBus: EventBus, config?: Partial<PresenceConfig>): Promise<void> {
        if (this.initialized) {
            console.warn('[PresenceManager] Already initialized');
            return;
        }

        this.eventBus = eventBus;
        this.config = { ...this.config, ...config };

        // Set up local activity tracking
        this.setupActivityTracking();

        // Subscribe to transport events
        this.subscribeToTransports();

        // Subscribe to EventBus for cursor/selection events
        this.subscribeToEvents();

        // Start heartbeat
        this.startHeartbeat();

        // Start cleanup interval
        this.startCleanup();

        this.initialized = true;
        console.log('[PresenceManager] Initialized');
    }

    /**
     * Set up activity tracking (mouse, keyboard, etc.)
     */
    private setupActivityTracking(): void {
        if (typeof window === 'undefined') return;

        const updateActivity = () => {
            this.localPresence.lastActivity = Date.now();
            if (this.localPresence.status !== 'active') {
                this.localPresence.status = 'active';
                this.broadcastPresenceUpdate();
            }
        };

        // Track user activity
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);

        // Track visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.localPresence.status = 'away';
                this.broadcastPresenceUpdate();
            } else {
                this.localPresence.status = 'active';
                this.localPresence.lastActivity = Date.now();
                this.broadcastPresenceUpdate();
            }
        });

        // Check for idle periodically
        this.activityCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = now - this.localPresence.lastActivity;

            let newStatus: ActivityStatus = 'active';
            if (timeSinceActivity > this.config.awayTimeoutMs) {
                newStatus = 'away';
            } else if (timeSinceActivity > this.config.idleTimeoutMs) {
                newStatus = 'idle';
            }

            if (newStatus !== this.localPresence.status) {
                this.localPresence.status = newStatus;
                this.broadcastPresenceUpdate();
            }
        }, 10000);
    }

    /**
     * Subscribe to transport events
     */
    private subscribeToTransports(): void {
        // Tab join/leave from SharedWorker
        const unsubTabJoin = TransportManager.onTabJoin((tabInfo) => {
            this.handleTabJoin(tabInfo);
        });
        this.unsubscribers.push(unsubTabJoin);

        const unsubTabLeave = TransportManager.onTabLeave((tabId) => {
            this.handleTabLeave(tabId);
        });
        this.unsubscribers.push(unsubTabLeave);

        // Presence updates from WebSocket
        const unsubPresence = TransportManager.onPresenceUpdate((users) => {
            this.handleRemotePresenceUpdate(users);
        });
        this.unsubscribers.push(unsubPresence);
    }

    /**
     * Subscribe to EventBus events
     */
    private subscribeToEvents(): void {
        if (!this.eventBus) return;

        // Listen for cursor updates from remote sources
        const unsubCursor = this.eventBus.on('presence:cursor-move', (event) => {
            const { tabId, cursor } = event.payload as { tabId: string; cursor: CursorPosition };
            if (tabId !== getTabId()) {
                this.handleRemoteCursorMove(tabId, cursor);
            }
        });
        this.unsubscribers.push(unsubCursor);

        // Listen for selection updates
        const unsubSelection = this.eventBus.on('presence:selection-change', (event) => {
            const { tabId, selection } = event.payload as { tabId: string; selection: SelectionInfo };
            if (tabId !== getTabId()) {
                this.handleRemoteSelectionChange(tabId, selection);
            }
        });
        this.unsubscribers.push(unsubSelection);

        // Listen for status updates
        const unsubStatus = this.eventBus.on('presence:status-change', (event) => {
            const { tabId, status } = event.payload as { tabId: string; status: ActivityStatus };
            if (tabId !== getTabId()) {
                this.handleRemoteStatusChange(tabId, status);
            }
        });
        this.unsubscribers.push(unsubStatus);
    }

    /**
     * Handle tab join event
     */
    private handleTabJoin(tabInfo: TabInfo): void {
        const identity = getIdentity();
        const entry: PresenceEntry = {
            id: tabInfo.tabId,
            userId: tabInfo.userId,
            deviceId: identity.deviceId,
            tabId: tabInfo.tabId,
            displayName: `Tab ${tabInfo.tabId.slice(-4)}`,
            color: generateColor(tabInfo.tabId),
            cursor: null,
            selection: { selectedWidgetIds: [] },
            status: 'active',
            lastSeen: tabInfo.lastSeen,
            isSameDevice: true
        };

        this.presenceMap.set(tabInfo.tabId, entry);
        this.notifyPresenceChange();
    }

    /**
     * Handle tab leave event
     */
    private handleTabLeave(tabId: string): void {
        this.presenceMap.delete(tabId);
        this.notifyPresenceChange();
    }

    /**
     * Handle remote presence update from WebSocket
     */
    private handleRemotePresenceUpdate(users: RemoteUserPresence[]): void {
        // Clear remote users (keep same-device tabs)
        for (const [id, entry] of this.presenceMap) {
            if (!entry.isSameDevice) {
                this.presenceMap.delete(id);
            }
        }

        // Add remote users
        users.forEach(user => {
            const entry: PresenceEntry = {
                id: `${user.userId}-${user.tabId}`,
                userId: user.userId,
                deviceId: user.deviceId,
                tabId: user.tabId,
                displayName: user.displayName || `User ${user.userId.slice(-4)}`,
                color: generateColor(user.userId),
                cursor: user.cursor ? { ...user.cursor, timestamp: Date.now() } : null,
                selection: { selectedWidgetIds: [] },
                status: 'active',
                lastSeen: user.lastSeen,
                isSameDevice: user.deviceId === getIdentity().deviceId,
                latency: user.connectionLatency
            };

            this.presenceMap.set(entry.id, entry);
        });

        this.notifyPresenceChange();
    }

    /**
     * Handle remote cursor move
     */
    private handleRemoteCursorMove(tabId: string, cursor: CursorPosition): void {
        const entry = this.presenceMap.get(tabId);
        if (entry) {
            // Store previous position for interpolation
            if (entry.cursor && this.config.interpolateCursors) {
                cursor.prevX = entry.cursor.x;
                cursor.prevY = entry.cursor.y;
                cursor.prevTimestamp = entry.cursor.timestamp;
            }

            entry.cursor = cursor;
            entry.lastSeen = Date.now();

            // Notify cursor handlers
            this.cursorMoveHandlers.forEach(h => h(tabId, cursor));
        }
    }

    /**
     * Handle remote selection change
     */
    private handleRemoteSelectionChange(tabId: string, selection: SelectionInfo): void {
        const entry = this.presenceMap.get(tabId);
        if (entry) {
            entry.selection = selection;
            entry.lastSeen = Date.now();
            this.notifyPresenceChange();
        }
    }

    /**
     * Handle remote status change
     */
    private handleRemoteStatusChange(tabId: string, status: ActivityStatus): void {
        const entry = this.presenceMap.get(tabId);
        if (entry) {
            entry.status = status;
            entry.lastSeen = Date.now();
            this.notifyPresenceChange();
        }
    }

    /**
     * Update local cursor position
     */
    updateCursor(x: number, y: number): void {
        const now = Date.now();
        const cursor: CursorPosition = {
            x,
            y,
            timestamp: now
        };

        this.localPresence.cursor = cursor;
        this.localPresence.lastActivity = now;

        // Throttle cursor broadcasts
        if (now - this.lastCursorUpdate >= this.config.cursorThrottleMs) {
            this.broadcastCursorMove(cursor);
            this.lastCursorUpdate = now;
            this.pendingCursorUpdate = null;
        } else {
            this.pendingCursorUpdate = cursor;

            if (!this.cursorThrottleTimeout) {
                this.cursorThrottleTimeout = setTimeout(() => {
                    if (this.pendingCursorUpdate) {
                        this.broadcastCursorMove(this.pendingCursorUpdate);
                        this.lastCursorUpdate = Date.now();
                        this.pendingCursorUpdate = null;
                    }
                    this.cursorThrottleTimeout = null;
                }, this.config.cursorThrottleMs);
            }
        }
    }

    /**
     * Hide local cursor
     */
    hideCursor(): void {
        this.localPresence.cursor = null;
        this.broadcastCursorHide();
    }

    /**
     * Update local selection
     */
    updateSelection(selectedWidgetIds: string[], bounds?: { x: number; y: number; width: number; height: number }): void {
        this.localPresence.selection = {
            selectedWidgetIds,
            selectionBounds: bounds
        };
        this.broadcastSelectionChange();
    }

    /**
     * Set canvas context
     */
    setCanvasId(canvasId: string | undefined): void {
        this.localPresence.canvasId = canvasId;
        IdentityManager.setCanvasId(canvasId);
    }

    /**
     * Broadcast cursor move event
     */
    private broadcastCursorMove(cursor: CursorPosition): void {
        this.eventBus?.emit({
            type: 'presence:cursor-move',
            scope: 'canvas',
            payload: {
                tabId: getTabId(),
                cursor
            }
        });

        // Also update via WebSocket for remote users
        TransportManager.updatePresence({ x: cursor.x, y: cursor.y });
    }

    /**
     * Broadcast cursor hide event
     */
    private broadcastCursorHide(): void {
        this.eventBus?.emit({
            type: 'presence:cursor-hide',
            scope: 'canvas',
            payload: {
                tabId: getTabId()
            }
        });

        TransportManager.updatePresence(undefined);
    }

    /**
     * Broadcast selection change event
     */
    private broadcastSelectionChange(): void {
        this.eventBus?.emit({
            type: 'presence:selection-change',
            scope: 'canvas',
            payload: {
                tabId: getTabId(),
                selection: this.localPresence.selection
            }
        });
    }

    /**
     * Broadcast presence update (status, etc.)
     */
    private broadcastPresenceUpdate(): void {
        this.eventBus?.emit({
            type: 'presence:status-change',
            scope: 'canvas',
            payload: {
                tabId: getTabId(),
                status: this.localPresence.status
            }
        });
    }

    /**
     * Start heartbeat interval
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            // Heartbeat is handled by TransportManager
            // We just keep our presence fresh
            this.localPresence.lastActivity = Date.now();
        }, this.config.heartbeatIntervalMs);
    }

    /**
     * Start cleanup interval
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let changed = false;

            for (const [id, entry] of this.presenceMap) {
                if (now - entry.lastSeen > this.config.staleTimeoutMs) {
                    this.presenceMap.delete(id);
                    changed = true;
                }
            }

            if (changed) {
                this.notifyPresenceChange();
            }
        }, this.config.cleanupIntervalMs);
    }

    /**
     * Notify presence change handlers
     */
    private notifyPresenceChange(): void {
        const presences = this.getAllPresences();
        this.presenceChangeHandlers.forEach(h => h(presences));
    }

    /**
     * Get all presences (excluding self)
     */
    getAllPresences(): PresenceEntry[] {
        const currentTabId = getTabId();
        return Array.from(this.presenceMap.values()).filter(p => p.tabId !== currentTabId);
    }

    /**
     * Get local presence
     */
    getLocalPresence(): LocalPresence {
        return { ...this.localPresence };
    }

    /**
     * Register handler for presence changes
     */
    onPresenceChange(handler: (presences: PresenceEntry[]) => void): () => void {
        this.presenceChangeHandlers.add(handler);
        // Immediately call with current state
        handler(this.getAllPresences());
        return () => this.presenceChangeHandlers.delete(handler);
    }

    /**
     * Register handler for cursor moves (high frequency)
     */
    onCursorMove(handler: (id: string, cursor: CursorPosition) => void): () => void {
        this.cursorMoveHandlers.add(handler);
        return () => this.cursorMoveHandlers.delete(handler);
    }

    /**
     * Interpolate cursor position for smooth rendering
     */
    interpolateCursor(entry: PresenceEntry, renderTime: number): CursorPosition | null {
        if (!entry.cursor) return null;
        if (!this.config.interpolateCursors) return entry.cursor;

        const cursor = entry.cursor;
        if (!cursor.prevX || !cursor.prevY || !cursor.prevTimestamp) {
            return cursor;
        }

        // Calculate interpolation factor based on timestamps
        const dt = cursor.timestamp - cursor.prevTimestamp;
        if (dt <= 0) return cursor;

        const elapsed = renderTime - cursor.timestamp;
        const t = Math.min(1, Math.max(0, elapsed / dt));

        return {
            x: cursor.prevX + (cursor.x - cursor.prevX) * (1 + t * 0.5), // Slight prediction
            y: cursor.prevY + (cursor.y - cursor.prevY) * (1 + t * 0.5),
            timestamp: renderTime
        };
    }

    /**
     * Get debug information
     */
    getDebugInfo(): object {
        return {
            initialized: this.initialized,
            config: this.config,
            localPresence: this.localPresence,
            remotePresences: this.getAllPresences(),
            presenceCount: this.presenceMap.size
        };
    }

    /**
     * Shutdown presence manager
     */
    shutdown(): void {
        // Clear intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
            this.activityCheckInterval = null;
        }

        if (this.cursorThrottleTimeout) {
            clearTimeout(this.cursorThrottleTimeout);
            this.cursorThrottleTimeout = null;
        }

        // Unsubscribe handlers
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        // Clear state
        this.presenceMap.clear();
        this.presenceChangeHandlers.clear();
        this.cursorMoveHandlers.clear();
        this.eventBus = null;
        this.initialized = false;

        console.log('[PresenceManager] Shutdown complete');
    }
}

/**
 * Singleton instance
 */
export const PresenceManager = new PresenceManagerClass();

/**
 * Convenience function to initialize presence manager
 */
export async function initializePresence(
    eventBus: EventBus,
    config?: Partial<PresenceConfig>
): Promise<void> {
    await PresenceManager.initialize(eventBus, config);
}

/**
 * Convenience function to shutdown presence manager
 */
export function shutdownPresence(): void {
    PresenceManager.shutdown();
}
