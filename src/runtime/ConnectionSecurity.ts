/**
 * StickerNest v2 - Connection Security
 *
 * Security layer for widget connections:
 * - Permission validation for cross-user connections
 * - Rate limiting for messages
 * - Trust level management
 * - Abuse prevention
 */

import type { ChannelScope, TrustLevel, ChannelMessage } from '../types/channels';
import { EventBus } from './EventBus';

// --- Rate Limiting ---

interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
  cooldownMs: number;
}

interface RateLimitState {
  messages: number[];
  blocked: boolean;
  blockedUntil?: number;
}

const DEFAULT_RATE_LIMITS: Record<ChannelScope, RateLimitConfig> = {
  'local': {
    maxMessages: 100,
    windowMs: 1000,
    cooldownMs: 0, // No cooldown for local
  },
  'cross-canvas': {
    maxMessages: 30,
    windowMs: 1000,
    cooldownMs: 5000, // 5 second cooldown if exceeded
  },
  'multi-user': {
    maxMessages: 10,
    windowMs: 1000,
    cooldownMs: 10000, // 10 second cooldown if exceeded
  },
};

/**
 * Client-side rate limiter for connection messages
 */
export class ConnectionRateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private config: Record<ChannelScope, RateLimitConfig>;

  constructor(config?: Partial<Record<ChannelScope, RateLimitConfig>>) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }

  /**
   * Check if a message can be sent (and record it if allowed)
   */
  checkAndRecord(connectionId: string, scope: ChannelScope): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const config = this.config[scope];

    // Get or create state
    let state = this.limits.get(connectionId);
    if (!state) {
      state = { messages: [], blocked: false };
      this.limits.set(connectionId, state);
    }

    // Check if in cooldown
    if (state.blocked && state.blockedUntil) {
      if (now < state.blockedUntil) {
        return {
          allowed: false,
          retryAfter: state.blockedUntil - now,
        };
      }
      // Cooldown expired
      state.blocked = false;
      state.blockedUntil = undefined;
    }

    // Clean old messages outside window
    const windowStart = now - config.windowMs;
    state.messages = state.messages.filter(ts => ts > windowStart);

    // Check rate limit
    if (state.messages.length >= config.maxMessages) {
      state.blocked = true;
      state.blockedUntil = now + config.cooldownMs;
      return {
        allowed: false,
        retryAfter: config.cooldownMs,
      };
    }

    // Record message
    state.messages.push(now);
    return { allowed: true };
  }

  /**
   * Get current rate for a connection
   */
  getCurrentRate(connectionId: string): { messagesInWindow: number; isBlocked: boolean } {
    const state = this.limits.get(connectionId);
    if (!state) {
      return { messagesInWindow: 0, isBlocked: false };
    }

    const now = Date.now();
    const windowStart = now - 1000; // Last second
    const messagesInWindow = state.messages.filter(ts => ts > windowStart).length;

    return {
      messagesInWindow,
      isBlocked: state.blocked && state.blockedUntil ? now < state.blockedUntil : false,
    };
  }

  /**
   * Clear rate limit state for a connection
   */
  clear(connectionId: string): void {
    this.limits.delete(connectionId);
  }

  /**
   * Clear all rate limit state
   */
  clearAll(): void {
    this.limits.clear();
  }
}

// --- Permission Checking ---

interface ConnectionPermission {
  scope: ChannelScope;
  targetId: string;
  allowed: boolean;
  trustLevel: TrustLevel;
  grantedAt?: number;
  expiresAt?: number;
}

/**
 * Connection permission checker
 */
export class ConnectionPermissionChecker {
  private permissions: Map<string, ConnectionPermission> = new Map();
  private trustedUsers: Set<string> = new Set();
  private blockedUsers: Set<string> = new Set();
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
    this.loadPersistedPermissions();
  }

  /**
   * Check if a connection is allowed
   */
  checkPermission(
    scope: ChannelScope,
    targetId: string,
    targetUserId?: string
  ): { allowed: boolean; reason?: string; trustLevel: TrustLevel } {
    // Local connections always allowed
    if (scope === 'local') {
      return { allowed: true, trustLevel: 'trusted' };
    }

    // Cross-canvas (same user) always allowed
    if (scope === 'cross-canvas') {
      return { allowed: true, trustLevel: 'trusted' };
    }

    // Multi-user requires permission check
    if (scope === 'multi-user' && targetUserId) {
      // Check blocked
      if (this.blockedUsers.has(targetUserId)) {
        return { allowed: false, reason: 'User is blocked', trustLevel: 'blocked' };
      }

      // Check trusted
      if (this.trustedUsers.has(targetUserId)) {
        return { allowed: true, trustLevel: 'trusted' };
      }

      // Check explicit permission
      const permKey = this.getPermissionKey(scope, targetId);
      const permission = this.permissions.get(permKey);

      if (permission) {
        // Check expiration
        if (permission.expiresAt && Date.now() > permission.expiresAt) {
          this.permissions.delete(permKey);
          return { allowed: false, reason: 'Permission expired', trustLevel: 'unknown' };
        }

        return {
          allowed: permission.allowed,
          trustLevel: permission.trustLevel,
          reason: permission.allowed ? undefined : 'Permission denied',
        };
      }

      // No permission - needs request
      return { allowed: false, reason: 'Permission required', trustLevel: 'unknown' };
    }

    return { allowed: false, reason: 'Unknown scope', trustLevel: 'unknown' };
  }

  /**
   * Grant permission for a connection
   */
  grantPermission(
    scope: ChannelScope,
    targetId: string,
    options: { trustLevel?: TrustLevel; duration?: number } = {}
  ): void {
    const permKey = this.getPermissionKey(scope, targetId);
    const now = Date.now();

    this.permissions.set(permKey, {
      scope,
      targetId,
      allowed: true,
      trustLevel: options.trustLevel ?? 'verified',
      grantedAt: now,
      expiresAt: options.duration ? now + options.duration : undefined,
    });

    this.persistPermissions();

    this.eventBus?.emit('connection:permissionGranted', {
      scope,
      targetId,
      trustLevel: options.trustLevel ?? 'verified',
    });
  }

  /**
   * Revoke permission for a connection
   */
  revokePermission(scope: ChannelScope, targetId: string): void {
    const permKey = this.getPermissionKey(scope, targetId);
    this.permissions.delete(permKey);
    this.persistPermissions();

    this.eventBus?.emit('connection:permissionRevoked', {
      scope,
      targetId,
    });
  }

  /**
   * Trust a user (auto-approve future requests)
   */
  trustUser(userId: string): void {
    this.trustedUsers.add(userId);
    this.blockedUsers.delete(userId);
    this.persistPermissions();

    this.eventBus?.emit('connection:userTrusted', { userId });
  }

  /**
   * Block a user (auto-reject future requests)
   */
  blockUser(userId: string): void {
    this.blockedUsers.add(userId);
    this.trustedUsers.delete(userId);
    this.persistPermissions();

    this.eventBus?.emit('connection:userBlocked', { userId });
  }

  /**
   * Unblock a user
   */
  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
    this.persistPermissions();

    this.eventBus?.emit('connection:userUnblocked', { userId });
  }

  /**
   * Get trust level for a user
   */
  getUserTrustLevel(userId: string): TrustLevel {
    if (this.blockedUsers.has(userId)) return 'blocked';
    if (this.trustedUsers.has(userId)) return 'trusted';
    return 'unknown';
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): ConnectionPermission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get trusted users
   */
  getTrustedUsers(): string[] {
    return Array.from(this.trustedUsers);
  }

  /**
   * Get blocked users
   */
  getBlockedUsers(): string[] {
    return Array.from(this.blockedUsers);
  }

  // --- Private Methods ---

  private getPermissionKey(scope: ChannelScope, targetId: string): string {
    return `${scope}:${targetId}`;
  }

  private loadPersistedPermissions(): void {
    try {
      const stored = localStorage.getItem('stickernest-connection-permissions');
      if (stored) {
        const data = JSON.parse(stored);
        this.trustedUsers = new Set(data.trustedUsers || []);
        this.blockedUsers = new Set(data.blockedUsers || []);

        for (const perm of data.permissions || []) {
          this.permissions.set(this.getPermissionKey(perm.scope, perm.targetId), perm);
        }
      }
    } catch {
      // Ignore load errors
    }
  }

  private persistPermissions(): void {
    try {
      const data = {
        trustedUsers: Array.from(this.trustedUsers),
        blockedUsers: Array.from(this.blockedUsers),
        permissions: Array.from(this.permissions.values()),
      };
      localStorage.setItem('stickernest-connection-permissions', JSON.stringify(data));
    } catch {
      // Ignore save errors
    }
  }
}

// --- Message Validation ---

/**
 * Validate a channel message for security
 */
export function validateChannelMessage(message: ChannelMessage): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!message.id) errors.push('Missing message ID');
  if (!message.channelId) errors.push('Missing channel ID');
  if (!message.scope) errors.push('Missing scope');
  if (!message.type) errors.push('Missing type');
  if (!message.sourceWidgetId) errors.push('Missing source widget ID');
  if (!message.sourceCanvasId) errors.push('Missing source canvas ID');
  if (!message.timestamp) errors.push('Missing timestamp');

  // Valid scope
  if (message.scope && !['local', 'cross-canvas', 'multi-user'].includes(message.scope)) {
    errors.push('Invalid scope');
  }

  // Timestamp sanity check (not too old, not in future)
  if (message.timestamp) {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const maxFuture = 30 * 1000; // 30 seconds (clock skew)

    if (now - message.timestamp > maxAge) {
      errors.push('Message too old');
    }
    if (message.timestamp - now > maxFuture) {
      errors.push('Message timestamp in future');
    }
  }

  // Payload size check
  if (message.payload !== undefined) {
    const payloadSize = JSON.stringify(message.payload).length;
    const maxSize = 64 * 1024; // 64KB max payload

    if (payloadSize > maxSize) {
      errors.push('Payload too large');
    }
  }

  // TTL check
  if (message.ttl !== undefined && message.ttl < 0) {
    errors.push('Invalid TTL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --- Security Badge Info ---

export interface SecurityBadgeInfo {
  icon: string;
  label: string;
  color: string;
  description: string;
}

/**
 * Get security badge info for a connection
 */
export function getSecurityBadgeInfo(
  scope: ChannelScope,
  trustLevel: TrustLevel,
  isRateLimited: boolean = false
): SecurityBadgeInfo {
  if (isRateLimited) {
    return {
      icon: '⏳',
      label: 'Rate Limited',
      color: '#f59e0b',
      description: 'Message rate exceeded, please wait',
    };
  }

  if (trustLevel === 'blocked') {
    return {
      icon: '🚫',
      label: 'Blocked',
      color: '#ef4444',
      description: 'This user is blocked',
    };
  }

  switch (scope) {
    case 'local':
      return {
        icon: '🔒',
        label: 'Local',
        color: '#22c55e',
        description: 'Secure local connection',
      };

    case 'cross-canvas':
      return {
        icon: '🔗',
        label: 'Cross-Canvas',
        color: '#3b82f6',
        description: 'Connected to your other canvas',
      };

    case 'multi-user':
      switch (trustLevel) {
        case 'trusted':
          return {
            icon: '✓',
            label: 'Trusted',
            color: '#22c55e',
            description: 'Trusted user connection',
          };
        case 'verified':
          return {
            icon: '✓',
            label: 'Verified',
            color: '#3b82f6',
            description: 'Verified user connection',
          };
        default:
          return {
            icon: '?',
            label: 'Unknown',
            color: '#f59e0b',
            description: 'Connection from unknown user',
          };
      }
  }
}

// --- Export singleton instances ---

export const connectionRateLimiter = new ConnectionRateLimiter();
export const connectionPermissionChecker = new ConnectionPermissionChecker();

export default {
  ConnectionRateLimiter,
  ConnectionPermissionChecker,
  validateChannelMessage,
  getSecurityBadgeInfo,
  connectionRateLimiter,
  connectionPermissionChecker,
};
