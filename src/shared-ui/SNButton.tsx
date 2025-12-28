/**
 * StickerNest v2 - SNButton
 * 2025 redesign with spring animations, focus states, and modern interactions
 */

import React, { forwardRef, useState, useCallback } from 'react';
import { SNIcon, IconName } from './SNIcon';
import { SNTooltip, TooltipPosition } from './SNTooltip';
import type { LucideIcon } from 'lucide-react';

// ============================================
// Types
// ============================================

export type SNButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'glass'
  | 'danger'
  | 'success'
  | 'gradient'
  | 'rainbow'
  | 'outline';

export type SNButtonSize = 'sm' | 'md' | 'lg';

export interface SNButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: SNButtonVariant;
  /** Button size */
  size?: SNButtonSize;
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Left icon name */
  leftIcon?: IconName;
  /** Left icon component (alternative to leftIcon) */
  leftIconComponent?: LucideIcon;
  /** Right icon name */
  rightIcon?: IconName;
  /** Right icon component (alternative to rightIcon) */
  rightIconComponent?: LucideIcon;
  /** Icon-only mode (no text, shows tooltip) */
  iconOnly?: boolean;
  /** Tooltip for icon-only buttons */
  tooltip?: string;
  /** Tooltip position */
  tooltipPosition?: TooltipPosition;
  /** Compact mode (reduced padding) */
  compact?: boolean;
  /** Rounded pill shape */
  pill?: boolean;
  /** Show rainbow border on hover */
  rainbowHover?: boolean;
  /** Keyboard shortcut hint (e.g., "⌘S") */
  shortcut?: string;
  /** Disable press animation */
  noPress?: boolean;
}

// ============================================
// Variant Styles
// ============================================

const variantStyles: Record<SNButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    background: 'var(--sn-bg-tertiary, #1a1a3a)',
    color: 'var(--sn-text-primary, #f0f4f8)',
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
    background: 'var(--sn-error, #ef4444)',
    color: '#ffffff',
    border: 'none',
  },
  success: {
    background: 'var(--sn-success, #22c55e)',
    color: '#ffffff',
    border: 'none',
  },
  gradient: {
    background: 'var(--sn-accent-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%))',
    color: '#ffffff',
    border: 'none',
  },
  rainbow: {
    background: 'var(--sn-bg-tertiary, #1a1a3a)',
    color: 'var(--sn-text-primary, #f0f4f8)',
    border: 'none',
    position: 'relative',
  },
  outline: {
    background: 'transparent',
    color: 'var(--sn-accent-primary, #8b5cf6)',
    border: '1px solid var(--sn-accent-primary, #8b5cf6)',
  },
};

const hoverStyles: Record<SNButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--sn-accent-hover, #7c3aed)',
  },
  secondary: {
    background: 'var(--sn-bg-elevated, #1e1e42)',
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
    background: '#dc2626',
  },
  success: {
    background: '#16a34a',
  },
  gradient: {
    filter: 'brightness(1.1)',
  },
  rainbow: {
    background: 'var(--sn-bg-elevated, #1e1e42)',
  },
  outline: {
    background: 'rgba(139, 92, 246, 0.1)',
  },
};

// ============================================
// Size Styles
// ============================================

const sizeStyles: Record<SNButtonSize, { height: number; padding: string; fontSize: string; iconSize: number; gap: number }> = {
  sm: {
    height: 32,
    padding: '0 12px',
    fontSize: '12px',
    iconSize: 14,
    gap: 6,
  },
  md: {
    height: 40,
    padding: '0 16px',
    fontSize: '14px',
    iconSize: 18,
    gap: 8,
  },
  lg: {
    height: 48,
    padding: '0 24px',
    fontSize: '15px',
    iconSize: 20,
    gap: 10,
  },
};

const iconOnlySizes: Record<SNButtonSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

// ============================================
// Component
// ============================================

export const SNButton = forwardRef<HTMLButtonElement, SNButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      leftIconComponent,
      rightIcon,
      rightIconComponent,
      iconOnly = false,
      tooltip,
      tooltipPosition = 'top',
      compact = false,
      pill = false,
      rainbowHover = false,
      shortcut,
      noPress = false,
      disabled,
      children,
      className = '',
      style,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const config = sizeStyles[size];
    const hasLeftIcon = leftIcon || leftIconComponent;
    const hasRightIcon = rightIcon || rightIconComponent;

    // Calculate dimensions
    const buttonWidth = iconOnly ? iconOnlySizes[size] : fullWidth ? '100%' : 'auto';
    const buttonPadding = iconOnly
      ? 0
      : compact
        ? `0 ${Math.floor(parseInt(config.padding.split(' ')[1]) * 0.75)}px`
        : config.padding;

    // 2025: Spring-based transition for smooth interactions
    const springTransition = 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms cubic-bezier(0.19, 1, 0.22, 1), background 100ms ease-out, border-color 100ms ease-out';

    // 2025: Press transform (scale down slightly)
    const pressTransform = !noPress && isPressed && !disabled && !loading
      ? 'scale(0.97)'
      : isHovered && !disabled && !loading
        ? 'translateY(-1px)'
        : 'none';

    // 2025: Focus ring shadow
    const focusShadow = isFocused && !disabled
      ? '0 0 0 2px var(--sn-bg-primary, #0a0a1a), 0 0 0 4px var(--sn-accent-primary, #8b5cf6)'
      : null;

    // 2025: Hover elevation for solid variants
    const hoverElevation = isHovered && !disabled && !loading && ['primary', 'secondary', 'glass', 'gradient'].includes(variant)
      ? '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)'
      : null;

    // Build base style with 2025 enhancements
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      gap: config.gap,
      height: config.height,
      minWidth: iconOnly ? iconOnlySizes[size] : 'auto',
      width: buttonWidth,
      padding: buttonPadding,
      fontSize: config.fontSize,
      fontWeight: 500,
      fontFamily: 'var(--sn-font-sans)',
      lineHeight: 1,
      borderRadius: pill ? 'var(--sn-radius-full, 9999px)' : 'var(--sn-radius-md, 8px)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: springTransition,
      transform: pressTransform,
      whiteSpace: 'nowrap',
      outline: 'none',
      textDecoration: 'none',
      userSelect: 'none',
      boxShadow: focusShadow ?? hoverElevation ?? 'none',
      ...variantStyles[variant],
      ...(isHovered && !disabled && !loading ? hoverStyles[variant] : {}),
      // Filter undefined values from style prop to prevent React error #306
      ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
    };

    // Render icon helper
    const renderIcon = (name?: IconName, component?: LucideIcon) => {
      if (!name && !component) return null;
      return <SNIcon name={name} icon={component} size={config.iconSize} />;
    };

    // Event handlers with 2025 interaction states
    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(true);
      onMouseEnter?.(e);
    }, [onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      setIsPressed(false);
      onMouseLeave?.(e);
    }, [onMouseLeave]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(true);
      onMouseDown?.(e);
    }, [onMouseDown]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(false);
      onMouseUp?.(e);
    }, [onMouseUp]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(false);
      setIsPressed(false);
      onBlur?.(e);
    }, [onBlur]);

    // Button content
    const buttonContent = (
      <>
        {/* Rainbow border for rainbow variant */}
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

        {/* Rainbow hover effect */}
        {rainbowHover && isHovered && (
          <span
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 'inherit',
              background: 'var(--sn-rainbow-gradient)',
              opacity: 0.3,
              zIndex: -1,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
        )}

        {/* Loading spinner */}
        {loading && (
          <SNIcon name="loading" size={config.iconSize} spin />
        )}

        {/* Left icon */}
        {!loading && hasLeftIcon && renderIcon(leftIcon, leftIconComponent)}

        {/* Text content (hidden in icon-only mode) */}
        {!iconOnly && children && (
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {children}
          </span>
        )}

        {/* Right icon */}
        {!loading && hasRightIcon && renderIcon(rightIcon, rightIconComponent)}
      </>
    );

    // Build tooltip content with optional shortcut
    const tooltipContent = tooltip
      ? shortcut
        ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{tooltip}</span>
            <kbd style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.15)',
              fontSize: '0.85em',
              fontFamily: 'var(--sn-font-mono, monospace)',
            }}>
              {shortcut}
            </kbd>
          </span>
        )
        : tooltip
      : shortcut
        ? shortcut
        : undefined;

    const button = (
      <button
        ref={ref}
        type="button"
        className={`sn-button sn-button-${variant} sn-focus-ring ${className}`}
        style={baseStyle}
        disabled={disabled || loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {buttonContent}
      </button>
    );

    // Wrap with tooltip if tooltip content exists or icon-only mode
    if (tooltipContent || iconOnly) {
      return (
        <SNTooltip
          content={tooltipContent || children?.toString() || ''}
          position={tooltipPosition}
          disabled={disabled}
        >
          {button}
        </SNTooltip>
      );
    }

    return button;
  }
);

SNButton.displayName = 'SNButton';

export default SNButton;
