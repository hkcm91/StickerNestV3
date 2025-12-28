/**
 * ProfileStats Component
 * Display user statistics in a row
 */

import React from 'react';
import type { ProfileStats as ProfileStatsType } from '../../types/profile';

interface ProfileStatsProps {
  stats: ProfileStatsType;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Show all stats or compact */
  compact?: boolean;
  /** Click handlers for interactive stats */
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  stats,
  size = 'md',
  direction = 'row',
  compact = false,
  onFollowersClick,
  onFollowingClick,
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  const sizeStyles = {
    sm: { value: 16, label: 11, gap: 2 },
    md: { value: 20, label: 13, gap: 4 },
    lg: { value: 28, label: 14, gap: 6 },
  };

  const currentSize = sizeStyles[size];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: direction === 'row' ? 32 : 16,
    flexWrap: 'wrap',
  };

  const statStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: direction === 'row' ? 'flex-start' : 'center',
    gap: currentSize.gap,
  };

  const clickableStyle: React.CSSProperties = {
    ...statStyle,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: currentSize.value,
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.02em',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: currentSize.label,
    color: '#64748b',
    fontWeight: 500,
  };

  const statItems = compact
    ? [
        { value: stats.publicCanvases, label: 'Canvases' },
        { value: stats.followers, label: 'Followers', onClick: onFollowersClick },
        { value: stats.totalViews, label: 'Views' },
      ]
    : [
        { value: stats.publicCanvases, label: 'Canvases' },
        { value: stats.followers, label: 'Followers', onClick: onFollowersClick },
        { value: stats.following, label: 'Following', onClick: onFollowingClick },
        { value: stats.totalViews, label: 'Views' },
      ];

  return (
    <div style={containerStyle}>
      {statItems.map((item, index) => (
        <div
          key={index}
          style={item.onClick ? clickableStyle : statStyle}
          onClick={item.onClick}
          onMouseEnter={(e) => {
            if (item.onClick) {
              (e.currentTarget as HTMLDivElement).style.opacity = '0.8';
            }
          }}
          onMouseLeave={(e) => {
            if (item.onClick) {
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }
          }}
        >
          <span style={valueStyle}>{formatNumber(item.value)}</span>
          <span style={labelStyle}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
