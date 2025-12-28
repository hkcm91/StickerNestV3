/**
 * StickerNest v2 - Widget Channel Types
 *
 * Defines channel types for widget-to-widget connections:
 * - Local: Same canvas connections
 * - Cross-Canvas: Connections to user's other canvases
 * - Multi-User: Connections to other users' widgets (social layer)
 */

/**
 * Channel scope determines where the connection can reach
 */
export type ChannelScope = 'local' | 'cross-canvas' | 'multi-user';

/**
 * Channel status for UI indicators
 */
export type ChannelStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * Trust level for multi-user connections
 */
export type TrustLevel = 'trusted' | 'verified' | 'unknown' | 'blocked';

/**
 * A channel represents a connection target
 */
export interface Channel {
  id: string;
  scope: ChannelScope;
  name: string;
  description?: string;
  status: ChannelStatus;

  // Target identification
  targetWidgetId?: string;
  targetCanvasId?: string;
  targetUserId?: string;

  // For cross-canvas
  canvasName?: string;

  // For multi-user
  userName?: string;
  userAvatar?: string;
  trustLevel?: TrustLevel;

  // Connection metadata
  lastConnected?: number;
  latency?: number;
  messageCount?: number;
}

/**
 * Channel group for UI organization
 */
export interface ChannelGroup {
  scope: ChannelScope;
  label: string;
  icon: string;
  channels: Channel[];
}

/**
 * Channel discovery result from scanning available connections
 */
export interface DiscoveredChannel {
  id: string;
  scope: ChannelScope;
  name: string;
  description?: string;

  // Compatibility info
  compatiblePorts: string[];
  confidence: number; // 0-1 score for auto-connect suggestion

  // Target info
  targetWidgetId?: string;
  targetCanvasId?: string;
  targetUserId?: string;
}

/**
 * Channel configuration stored in widget state
 */
export interface ChannelConfig {
  activeChannelId: string | null;
  favorites: string[];
  blocked: string[];
  autoConnect: boolean;
  allowCrossCanvas: boolean;
  allowMultiUser: boolean;
}

/**
 * Event emitted when channel changes
 */
export interface ChannelChangeEvent {
  previousChannel: Channel | null;
  newChannel: Channel | null;
  timestamp: number;
}

/**
 * Channel message envelope for cross-scope communication
 */
export interface ChannelMessage {
  id: string;
  channelId: string;
  scope: ChannelScope;
  type: string;
  payload: unknown;

  // Source info
  sourceWidgetId: string;
  sourceCanvasId: string;
  sourceUserId?: string;

  // Metadata
  timestamp: number;
  ttl?: number; // Time to live in ms
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Default channel configuration
 */
export const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  activeChannelId: null,
  favorites: [],
  blocked: [],
  autoConnect: true,
  allowCrossCanvas: true,
  allowMultiUser: false, // Requires explicit opt-in
};

/**
 * Channel scope metadata for UI
 */
export const CHANNEL_SCOPE_INFO: Record<ChannelScope, { label: string; icon: string; color: string }> = {
  local: {
    label: 'Local',
    icon: '🏠',
    color: '#22c55e',
  },
  'cross-canvas': {
    label: 'Cross-Canvas',
    icon: '🔗',
    color: '#3b82f6',
  },
  'multi-user': {
    label: 'Multi-User',
    icon: '👥',
    color: '#8b5cf6',
  },
};

/**
 * Trust level metadata for UI
 */
export const TRUST_LEVEL_INFO: Record<TrustLevel, { label: string; icon: string; color: string }> = {
  trusted: {
    label: 'Trusted',
    icon: '✓',
    color: '#22c55e',
  },
  verified: {
    label: 'Verified',
    icon: '✓',
    color: '#3b82f6',
  },
  unknown: {
    label: 'Unknown',
    icon: '?',
    color: '#f59e0b',
  },
  blocked: {
    label: 'Blocked',
    icon: '✕',
    color: '#ef4444',
  },
};
