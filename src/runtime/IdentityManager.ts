/**
 * StickerNest v2 - Identity Manager
 *
 * Manages identity at three levels:
 * 1. Device Identity - persistent via localStorage (survives browser restarts)
 * 2. Tab Identity - persistent for tab lifetime (survives refreshes via sessionStorage)
 * 3. Session Identity - per runtime load (changes on every page load)
 *
 * These identities are REQUIRED for:
 * - Deduping events across contexts
 * - Preventing infinite loops
 * - Merging state from multiple sources
 * - Cursor presence in collaboration
 * - SharedWorker tab management
 *
 * Version: 1.0.0
 */

import { RuntimeMessageIdentity, RuntimeMessageIdentitySchema } from '../protocol/runtimeMessage';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
    DEVICE_ID: 'stickernest_device_id',
    TAB_ID: 'stickernest_tab_id',
    USER_ID: 'stickernest_user_id'
} as const;

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    const extra = Math.random().toString(36).substring(2, 6);
    return `${prefix}_${timestamp}_${random}${extra}`;
}

/**
 * Device Identity
 * - Persists in localStorage
 * - Survives browser restarts
 * - Unique per browser profile
 */
function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined' || !window.localStorage) {
        return generateId('dev');
    }

    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
        deviceId = generateId('dev');
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
}

/**
 * Tab Identity
 * - Persists in sessionStorage
 * - Survives page refreshes within same tab
 * - Unique per browser tab
 */
function getOrCreateTabId(): string {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return generateId('tab');
    }

    let tabId = sessionStorage.getItem(STORAGE_KEYS.TAB_ID);
    if (!tabId) {
        tabId = generateId('tab');
        sessionStorage.setItem(STORAGE_KEYS.TAB_ID, tabId);
    }
    return tabId;
}

/**
 * Session Identity
 * - Generated fresh on every runtime load
 * - Changes on page refresh
 * - Useful for tracking specific runtime instances
 */
function createSessionId(): string {
    return generateId('ses');
}

/**
 * IdentityManager class
 *
 * Singleton that manages all identity layers.
 * Must be initialized before any inter-context communication.
 */
class IdentityManagerClass {
    private _deviceId: string;
    private _tabId: string;
    private _sessionId: string;
    private _userId: string | undefined;
    private _canvasId: string | undefined;
    private _initialized: boolean = false;

    constructor() {
        // Initialize with placeholder values
        this._deviceId = '';
        this._tabId = '';
        this._sessionId = '';
    }

    /**
     * Initialize the identity manager
     * Must be called once at application startup
     */
    initialize(): void {
        if (this._initialized) {
            console.warn('[IdentityManager] Already initialized');
            return;
        }

        this._deviceId = getOrCreateDeviceId();
        this._tabId = getOrCreateTabId();
        this._sessionId = createSessionId();

        // Try to restore userId from storage
        if (typeof window !== 'undefined' && window.localStorage) {
            this._userId = localStorage.getItem(STORAGE_KEYS.USER_ID) || undefined;
        }

        this._initialized = true;

        console.log('[IdentityManager] Initialized:', {
            deviceId: this._deviceId,
            tabId: this._tabId,
            sessionId: this._sessionId,
            userId: this._userId
        });
    }

    /**
     * Ensure manager is initialized
     */
    private ensureInitialized(): void {
        if (!this._initialized) {
            this.initialize();
        }
    }

    /**
     * Get device ID (persistent across sessions)
     */
    get deviceId(): string {
        this.ensureInitialized();
        return this._deviceId;
    }

    /**
     * Get tab ID (persistent within tab)
     */
    get tabId(): string {
        this.ensureInitialized();
        return this._tabId;
    }

    /**
     * Get session ID (per runtime load)
     */
    get sessionId(): string {
        this.ensureInitialized();
        return this._sessionId;
    }

    /**
     * Get user ID (if authenticated)
     */
    get userId(): string | undefined {
        return this._userId;
    }

    /**
     * Set user ID (call after authentication)
     */
    setUserId(userId: string | undefined): void {
        this._userId = userId;
        if (typeof window !== 'undefined' && window.localStorage) {
            if (userId) {
                localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
            } else {
                localStorage.removeItem(STORAGE_KEYS.USER_ID);
            }
        }
    }

    /**
     * Get current canvas ID
     */
    get canvasId(): string | undefined {
        return this._canvasId;
    }

    /**
     * Set current canvas ID (call when canvas context changes)
     */
    setCanvasId(canvasId: string | undefined): void {
        this._canvasId = canvasId;
    }

    /**
     * Get the full identity object for RuntimeMessage
     */
    getIdentity(): RuntimeMessageIdentity {
        this.ensureInitialized();
        return {
            deviceId: this._deviceId,
            tabId: this._tabId,
            sessionId: this._sessionId,
            userId: this._userId,
            canvasId: this._canvasId
        };
    }

    /**
     * Validate an identity object
     */
    validateIdentity(identity: unknown): boolean {
        const result = RuntimeMessageIdentitySchema.safeParse(identity);
        return result.success;
    }

    /**
     * Check if an identity belongs to this tab
     */
    isCurrentTab(identity: RuntimeMessageIdentity): boolean {
        return identity.tabId === this._tabId;
    }

    /**
     * Check if an identity belongs to this device
     */
    isCurrentDevice(identity: RuntimeMessageIdentity): boolean {
        return identity.deviceId === this._deviceId;
    }

    /**
     * Check if an identity belongs to this session
     */
    isCurrentSession(identity: RuntimeMessageIdentity): boolean {
        return identity.sessionId === this._sessionId;
    }

    /**
     * Check if an identity is from another tab on the same device
     */
    isSameDeviceDifferentTab(identity: RuntimeMessageIdentity): boolean {
        return identity.deviceId === this._deviceId && identity.tabId !== this._tabId;
    }

    /**
     * Reset session (useful for testing)
     */
    resetSession(): void {
        this._sessionId = createSessionId();
        console.log('[IdentityManager] Session reset:', this._sessionId);
    }

    /**
     * Clear all identity (for logout/reset)
     */
    clearAll(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
            localStorage.removeItem(STORAGE_KEYS.USER_ID);
            sessionStorage.removeItem(STORAGE_KEYS.TAB_ID);
        }
        this._initialized = false;
        this.initialize();
    }

    /**
     * Get a short display name for this tab (useful for debugging)
     */
    getShortTabName(): string {
        this.ensureInitialized();
        return this._tabId.substring(this._tabId.length - 6);
    }

    /**
     * Export identity for debugging
     */
    toDebugString(): string {
        this.ensureInitialized();
        return JSON.stringify({
            deviceId: this._deviceId,
            tabId: this._tabId,
            sessionId: this._sessionId,
            userId: this._userId,
            canvasId: this._canvasId,
            shortName: this.getShortTabName()
        }, null, 2);
    }
}

/**
 * Singleton instance
 */
export const IdentityManager = new IdentityManagerClass();

/**
 * Convenience exports
 */
export const getDeviceId = () => IdentityManager.deviceId;
export const getTabId = () => IdentityManager.tabId;
export const getSessionId = () => IdentityManager.sessionId;
export const getIdentity = () => IdentityManager.getIdentity();

/**
 * Initialize on module load (auto-initialize)
 */
if (typeof window !== 'undefined') {
    IdentityManager.initialize();
}
