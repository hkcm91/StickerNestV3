/**
 * StickerNest v2 - SNIconButton Component
 * Icon-only button with tooltip support
 */

import React, { forwardRef, useState } from 'react';
import { SNIcon, IconName, IconSize } from './SNIcon';
import { SNTooltip, TooltipPosition } from './SNTooltip';
import type { LucideIcon } from 'lucide-react';

// ============================================
// Types
// ============================================

export type IconButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'glass'
  | 'danger'
  | 'success'
  | 'rainbow';

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SNIconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Icon name from the icon map */
  icon?: IconName;
  /** Direct Lucide icon component */
  iconComponent?: LucideIcon;
  /** Button variant */
  variant?: IconButtonVariant;
  /** Button size */
  size?: IconButtonSize;
  /** Tooltip text */
  tooltip?: string;
  /** Tooltip position */
  tooltipPosition?: TooltipPosition;
  /** Whether button is in active/selected state */
  active?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Whether to show rainbow border on hover */
  rainbowHover?: boolean;
  /** Custom icon size override */
  iconSize?: IconSize | number;
  /** Badge content (small indicator) */
  badge?: React.ReactNode;
  /** Badge color */
  badgeColor?: string;
}

// ============================================
// Size Configurations
// ============================================

const sizeConfig: Record<IconButtonSize, { button: number; icon: IconSize; padding: number }> = {
  xs: { button: 20, icon: 'xs', padding: 4 },
  sm: { button: 28, icon: 'sm', padding: 6 },
  md: { button: 36, icon: 'md', padding: 8 },
  lg: { button: 44, icon: 'lg', padding: 10 },
};

// ============================================
// Variant Styles
// ============================================

const variantStyles: Record<IconButtonVariant, React.CSSProperties> = {
  default: {
    background: 'var(--sn-bg-tertiary, #1a1a3a)',
    color: 'var(--sn-text-primary, #f0f4f8)',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
  },
  primary: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    background: 'var(--sn-bg-secondary, #12122a)',
    color: 'var(--sn-text-secondary, #a0aec0)',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--sn-text-secondary, #a0aec0)',
    border: 'none',
  },
  glass: {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.8))',
    color: 'var(--sn-text-primary, #f0f4f8)',
    border: '1px solid var(--sn-glass-border, rgba(255, 255, 255, 0.1))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  danger: {
    background: 'var(--sn-error-bg, rgba(239, 68, 68, 0.15))',
    color: 'var(--sn-error, #ef4444)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  success: {
    background: 'var(--sn-success-bg, rgba(34, 197, 94, 0.15))',
    color: 'var(--sn-success, #22c55e)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  rainbow: {
    background: 'var(--sn-bg-tertiary, #1a1a3a)',
    color: 'var(--sn-text-primary, #f0f4f8)',
    border: 'none',
    position: 'relative',
  },
};

const hoverStyles: Record<IconButtonVariant, React.CSSProperties> = {
  default: {
    background: 'var(--sn-bg-elevated, #1e1e42)',
    color: 'var(--sn-text-primary, #f0f4f8)',
  },
  primary: {
    background: 'var(--sn-accent-hover, #7c3aed)',
  },
  secondary: {
    background: 'var(--sn-bg-tertiary, #1a1a3a)',
    color: 'var(--sn-text-primary, #f0f4f8)',
  },
  ghost: {
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.08))',
    color: 'var(--sn-text-primary, #f0f4f8)',
  },
  glass: {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.9))',
    borderColor: 'var(--sn-accent-primary, #8b5cf6)',
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.25)',
  },
  success: {
    background: 'rgba(34, 197, 94, 0.25)',
  },
  rainbow: {
    background: 'var(--sn-bg-elevated, #1e1e42)',
  },
};

const activeStyles: Record<IconButtonVariant, React.CSSProperties> = {
  default: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#ffffff',
    borderColor: 'var(--sn-accent-primary, #8b5cf6)',
  },
  primary: {
    background: 'var(--sn-accent-active, #6d28d9)',
  },
  secondary: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#ffffff',
  },
  ghost: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#ffffff',
  },
  glass: {
    background: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'var(--sn-accent-primary, #8b5cf6)',
  },
  danger: {
    background: 'var(--sn-error, #ef4444)',
    color: '#ffffff',
  },
  success: {
    background: 'var(--sn-success, #22c55e)',
    color: '#ffffff',
  },
  rainbow: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#ffffff',
  },
};

// ============================================
// Component
// ============================================

export const SNIconButton = forwardRef<HTMLButtonElement, SNIconButtonProps>(
  (
    {
      icon,
      iconComponent,
      variant = 'default',
      size = 'md',
      tooltip,
      tooltipPosition = 'top',
      active = false,
      loading = false,
      rainbowHover = false,
      iconSize,
      badge,
      badgeColor,
      disabled,
      className = '',
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);

    const config = sizeConfig[size];
    const finalIconSize = iconSize || config.icon;

    // Build button style
    const buttonStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: config.button,
      height: config.button,
      minWidth: config.button,
      padding: config.padding,
      borderRadius: 'var(--sn-radius-md, 8px)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all var(--sn-transition-fast, 100ms ease-out)',
      outline: 'none',
      ...variantStyles[variant],
      ...(isHovered && !disabled && !loading ? hoverStyles[variant] : {}),
      ...(active ? activeStyles[variant] : {}),
      // Filter undefined values from style prop to prevent React error #306
      ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
    };

    // Badge style
    const badgeStyle: React.CSSProperties = {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      fontSize: 10,
      fontWeight: 600,
      lineHeight: '16px',
      textAlign: 'center',
      color: '#ffffff',
      background: badgeColor || 'var(--sn-error, #ef4444)',
      borderRadius: 'var(--sn-radius-full, 9999px)',
    };

    // Rainbow border pseudo-element (via wrapper)
    const rainbowBorderStyle: React.CSSProperties = rainbowHover && isHovered ? {
      position: 'absolute',
      inset: -1,
      borderRadius: 'inherit',
      background: 'var(--sn-rainbow-gradient)',
      zIndex: -1,
      opacity: 0.8,
    } : {};

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(true);
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      onMouseLeave?.(e);
    };

    const button = (
      <button
        ref={ref}
        type="button"
        className={`sn-icon-button ${className}`}
        style={buttonStyle}
        disabled={disabled || loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {rainbowHover && isHovered && (
          <span style={rainbowBorderStyle} aria-hidden="true" />
        )}

        {loading ? (
          <SNIcon name="loading" size={finalIconSize} spin />
        ) : (
          <SNIcon
            name={icon}
            icon={iconComponent}
            size={finalIconSize}
            rainbow={variant === 'rainbow' && !active}
          />
        )}

        {badge && <span style={badgeStyle}>{badge}</span>}

        {variant === 'rainbow' && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              padding: 1,
              background: 'var(--sn-rainbow-gradient)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
        )}
      </button>
    );

    // Wrap with tooltip if provided
    if (tooltip) {
      return (
        <SNTooltip content={tooltip} position={tooltipPosition} disabled={disabled}>
          {button}
        </SNTooltip>
      );
    }

    return button;
  }
);

SNIconButton.displayName = 'SNIconButton';

export default SNIconButton;
