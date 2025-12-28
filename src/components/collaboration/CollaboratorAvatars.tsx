/**
 * StickerNest v2 - Collaborator Avatars
 *
 * Displays a stack of avatar icons for users currently on the canvas.
 * Shows connection status and allows clicking to see user details.
 */

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCollaborationStore } from '../../state/useCollaborationStore';

// ==================
// Types
// ==================

interface CollaboratorAvatarsProps {
  /** Maximum avatars to show before +N indicator */
  maxVisible?: number;
  /** Size of each avatar in pixels */
  size?: number;
  /** Show connection status indicator */
  showStatus?: boolean;
  /** Callback when avatar is clicked */
  onAvatarClick?: (userId: string) => void;
}

// ==================
// Avatar Component
// ==================

interface AvatarProps {
  displayName: string;
  avatarUrl?: string;
  color: string;
  size: number;
  isActive: boolean;
  showStatus: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const Avatar: React.FC<AvatarProps> = React.memo(({
  displayName,
  avatarUrl,
  color,
  size,
  isActive,
  showStatus,
  onClick,
  style,
}) => {
  // Get initials from display name
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  return (
    <div
      onClick={onClick}
      title={displayName}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid var(--sn-bg-primary)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        flexShrink: 0,
        transition: 'transform 150ms ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: color,
            color: 'white',
            fontSize: size * 0.4,
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          {initials}
        </div>
      )}

      {/* Status indicator */}
      {showStatus && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: '50%',
            background: isActive ? 'var(--sn-success)' : 'var(--sn-text-muted)',
            border: '2px solid var(--sn-bg-primary)',
          }}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

// ==================
// Overflow Indicator
// ==================

interface OverflowIndicatorProps {
  count: number;
  size: number;
}

const OverflowIndicator: React.FC<OverflowIndicatorProps> = ({ count, size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: '2px solid var(--sn-bg-primary)',
      background: 'var(--sn-bg-tertiary)',
      color: 'var(--sn-text-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.35,
      fontWeight: 600,
      flexShrink: 0,
    }}
  >
    +{count}
  </div>
);

// ==================
// Main Component
// ==================

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  maxVisible = 4,
  size = 32,
  showStatus = true,
  onAvatarClick,
}) => {
  // Get remote collaborators from store with shallow comparison to prevent infinite loops
  const { collaboratorsMap, connectionStatus } = useCollaborationStore(
    useShallow((s) => ({
      collaboratorsMap: s.collaborators,
      connectionStatus: s.connectionStatus,
    }))
  );

  // Memoize the filtered array to prevent new references on each render
  const collaborators = useMemo(
    () => Array.from(collaboratorsMap.values()).filter((c) => !c.isLocal),
    [collaboratorsMap]
  );

  // Split into visible and overflow
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const overflowCount = Math.max(0, collaborators.length - maxVisible);

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* Avatar stack */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {visibleCollaborators.map((collaborator, index) => (
          <Avatar
            key={collaborator.id}
            displayName={collaborator.displayName}
            avatarUrl={collaborator.avatarUrl}
            color={collaborator.color}
            size={size}
            isActive={collaborator.isActive}
            showStatus={showStatus}
            onClick={onAvatarClick ? () => onAvatarClick(collaborator.id) : undefined}
            style={{
              marginLeft: index > 0 ? -size * 0.25 : 0,
              zIndex: visibleCollaborators.length - index,
            }}
          />
        ))}

        {overflowCount > 0 && (
          <OverflowIndicator
            count={overflowCount}
            size={size}
          />
        )}
      </div>

      {/* Connection indicator */}
      {connectionStatus === 'connected' && (
        <div
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: 12,
            fontSize: 11,
            color: 'var(--sn-success)',
            fontWeight: 500,
          }}
        >
          Live
        </div>
      )}

      {connectionStatus === 'reconnecting' && (
        <div
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            background: 'rgba(245, 158, 11, 0.15)',
            borderRadius: 12,
            fontSize: 11,
            color: 'var(--sn-warning)',
            fontWeight: 500,
          }}
        >
          Reconnecting...
        </div>
      )}
    </div>
  );
};

export default CollaboratorAvatars;
