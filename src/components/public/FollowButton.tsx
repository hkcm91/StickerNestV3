/**
 * FollowButton Component
 * Follow/unfollow button with loading state
 */

import React from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';

interface FollowButtonProps {
  /** Whether currently following */
  isFollowing: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Click handler */
  onClick: () => void;
  /** Show icon */
  showIcon?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  isFollowing,
  isLoading = false,
  disabled = false,
  size = 'md',
  onClick,
  showIcon = false,
  fullWidth = false,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: 12, gap: 4 },
    md: { padding: '8px 16px', fontSize: 13, gap: 6 },
    lg: { padding: '10px 20px', fontSize: 14, gap: 8 },
  };

  const currentSize = sizeStyles[size];

  // Show "Unfollow" on hover when following
  const buttonText = isLoading
    ? '...'
    : isFollowing
    ? isHovered
      ? 'Unfollow'
      : 'Following'
    : 'Follow';

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: currentSize.gap,
    padding: currentSize.padding,
    fontSize: currentSize.fontSize,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    width: fullWidth ? '100%' : 'auto',
    minWidth: 80,
    opacity: disabled ? 0.5 : 1,
  };

  const followingStyle: React.CSSProperties = {
    ...baseStyle,
    background: isHovered
      ? 'rgba(239, 68, 68, 0.1)'
      : 'rgba(139, 92, 246, 0.1)',
    color: isHovered ? '#ef4444' : '#8b5cf6',
    border: `1px solid ${isHovered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
  };

  const notFollowingStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: isHovered ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none',
    transform: isHovered ? 'translateY(-1px)' : 'none',
  };

  const iconName = isFollowing
    ? isHovered
      ? 'userMinus'
      : 'userCheck'
    : 'userPlus';

  return (
    <button
      style={isFollowing ? followingStyle : notFollowingStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled || isLoading}
    >
      {showIcon && !isLoading && (
        <SNIcon name={iconName} size={size === 'sm' ? 12 : 14} />
      )}
      {isLoading && (
        <div
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      <span>{buttonText}</span>
    </button>
  );
};

export default FollowButton;
