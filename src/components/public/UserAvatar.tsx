/**
 * UserAvatar Component
 * Avatar with fallback initials and optional verified badge
 */

import React from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';

interface UserAvatarProps {
  /** User display name for initials fallback */
  displayName?: string;
  /** Username for initials fallback */
  username: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Show verified badge */
  isVerified?: boolean;
  /** Additional class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const sizeMap = {
  xs: { container: 24, text: 10, badge: 10, badgeIcon: 6 },
  sm: { container: 32, text: 12, badge: 12, badgeIcon: 8 },
  md: { container: 40, text: 14, badge: 14, badgeIcon: 8 },
  lg: { container: 56, text: 20, badge: 18, badgeIcon: 10 },
  xl: { container: 80, text: 28, badge: 22, badgeIcon: 12 },
  '2xl': { container: 120, text: 40, badge: 28, badgeIcon: 14 },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  displayName,
  username,
  avatarUrl,
  size = 'md',
  isVerified = false,
  className = '',
  onClick,
}) => {
  const dimensions = sizeMap[size];

  // Get initials from display name or username
  const getInitials = (): string => {
    const name = displayName || username;
    if (!name) return '?';

    const parts = name.split(/[\s_-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate a consistent color based on username
  const getBackgroundColor = (): string => {
    const colors = [
      'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', // Purple
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', // Cyan
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', // Amber
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)', // Emerald
      'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', // Pink
      'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', // Indigo
    ];

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: dimensions.container,
    height: dimensions.container,
    borderRadius: size === '2xl' ? 24 : size === 'xl' ? 16 : size === 'lg' ? 12 : 8,
    overflow: 'visible',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
  };

  const innerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: 'inherit',
    background: avatarUrl ? 'transparent' : getBackgroundColor(),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const initialsStyle: React.CSSProperties = {
    fontSize: dimensions.text,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '-0.02em',
    userSelect: 'none',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: dimensions.badge,
    height: dimensions.badge,
    background: '#22c55e',
    borderRadius: size === '2xl' || size === 'xl' ? 8 : 6,
    border: `2px solid #0a0a12`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={containerStyle} className={className} onClick={onClick}>
      <div style={innerStyle}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName || username}
            style={imageStyle}
            onError={(e) => {
              // Hide broken image and show initials
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span style={initialsStyle}>{getInitials()}</span>
        )}
      </div>
      {isVerified && (
        <div style={badgeStyle}>
          <SNIcon name="check" size={dimensions.badgeIcon as any} color="#fff" />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
