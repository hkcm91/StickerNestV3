/**
 * StickerNest v2 - Presence Badge
 *
 * Small badge showing collaboration status (connected users count, connection state).
 * Can be placed in toolbars or status bars.
 */

import React from 'react';
import { useCollaborationStore, selectRemoteCollaborators, selectConnectionStatus } from '../../state/useCollaborationStore';

// ==================
// Types
// ==================

interface PresenceBadgeProps {
  /** Show user count */
  showCount?: boolean;
  /** Show connection status text */
  showStatus?: boolean;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Callback when clicked */
  onClick?: () => void;
}

// ==================
// Icons
// ==================

const UsersIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const WifiIcon: React.FC<{ size?: number; connected: boolean }> = ({ size = 14, connected }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: connected ? 1 : 0.5 }}
  >
    {connected ? (
      <>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </>
    ) : (
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </>
    )}
  </svg>
);

// ==================
// Main Component
// ==================

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  showCount = true,
  showStatus = true,
  compact = false,
  onClick,
}) => {
  const collaborators = useCollaborationStore(selectRemoteCollaborators);
  const connectionStatus = useCollaborationStore(selectConnectionStatus);

  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const userCount = collaborators.length;

  // Status colors
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return userCount > 0 ? 'var(--sn-success)' : 'var(--sn-accent-primary)';
      case 'connecting':
      case 'reconnecting':
        return 'var(--sn-warning)';
      case 'error':
        return 'var(--sn-error)';
      default:
        return 'var(--sn-text-muted)';
    }
  };

  // Status text
  const getStatusText = () => {
    if (userCount > 0) {
      return `${userCount} user${userCount !== 1 ? 's' : ''} online`;
    }
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection error';
      default:
        return 'Offline';
    }
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        title={getStatusText()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 'var(--sn-radius-md)',
          background: 'var(--sn-bg-tertiary)',
          color: getStatusColor(),
          cursor: onClick ? 'pointer' : 'default',
          transition: 'var(--sn-transition-fast)',
          position: 'relative',
        }}
      >
        <UsersIcon size={14} />
        {userCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'var(--sn-success)',
              color: 'white',
              fontSize: 9,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {userCount > 9 ? '9+' : userCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 'var(--sn-radius-lg)',
        background: 'var(--sn-bg-tertiary)',
        border: `1px solid ${isConnected ? 'var(--sn-border-primary)' : 'var(--sn-border-secondary)'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--sn-transition-fast)',
        userSelect: 'none',
      }}
    >
      {/* Connection indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: getStatusColor(),
        }}
      >
        <WifiIcon size={14} connected={isConnected} />
        {(isReconnecting) && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--sn-warning)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* User count */}
      {showCount && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--sn-text-primary)',
          }}
        >
          <UsersIcon size={14} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {userCount}
          </span>
        </div>
      )}

      {/* Status text */}
      {showStatus && !compact && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--sn-text-secondary)',
          }}
        >
          {getStatusText()}
        </span>
      )}

      {/* Pulse animation style */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default PresenceBadge;
