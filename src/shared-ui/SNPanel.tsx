/**
 * StickerNest v2 - SNPanel
 * Redesigned panel/card component with glass & gradient variants
 */

import React, { useState } from 'react';
import { SNIcon } from './SNIcon';

// ============================================
// Types
// ============================================

export type SNPanelVariant =
  | 'default'
  | 'elevated'
  | 'bordered'
  | 'ghost'
  | 'glass'
  | 'gradient'
  | 'rainbow';

export interface SNPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Panel variant */
  variant?: SNPanelVariant;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Panel header */
  header?: React.ReactNode;
  /** Panel footer */
  footer?: React.ReactNode;
  /** Collapsible panel */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Header action buttons */
  headerActions?: React.ReactNode;
  /** Show shadow */
  shadow?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  /** Glow effect */
  glow?: boolean;
  /** Rainbow border effect */
  rainbowBorder?: boolean;
  /** Animate border on hover */
  hoverEffect?: boolean;
}

// ============================================
// Variant Styles
// ============================================

const variantStyles: Record<SNPanelVariant, React.CSSProperties> = {
  default: {
    background: 'var(--sn-bg-secondary, #12122a)',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
  },
  elevated: {
    background: 'var(--sn-bg-elevated, #1e1e42)',
    border: 'none',
    boxShadow: 'var(--sn-shadow-lg)',
  },
  bordered: {
    background: 'transparent',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
  },
  ghost: {
    background: 'transparent',
    border: 'none',
  },
  glass: {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.8))',
    border: '1px solid var(--sn-glass-border, rgba(255, 255, 255, 0.1))',
    backdropFilter: 'blur(var(--sn-glass-blur, 12px))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur, 12px))',
  },
  gradient: {
    background: 'var(--sn-bg-gradient, linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%))',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
  },
  rainbow: {
    background: 'var(--sn-bg-secondary, #12122a)',
    border: 'none',
    position: 'relative',
  },
};

const paddingStyles: Record<string, number> = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const radiusStyles: Record<string, number> = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
};

const shadowStyles: Record<string, string> = {
  sm: 'var(--sn-shadow-sm)',
  md: 'var(--sn-shadow-md)',
  lg: 'var(--sn-shadow-lg)',
  xl: 'var(--sn-shadow-xl)',
};

// ============================================
// Component
// ============================================

export const SNPanel: React.FC<SNPanelProps> = ({
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  header,
  footer,
  collapsible = false,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  headerActions,
  shadow = false,
  glow = false,
  rainbowBorder = false,
  hoverEffect = false,
  children,
  className = '',
  style,
  ...props
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [isHovered, setIsHovered] = useState(false);

  // Support controlled and uncontrolled modes
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(newState);
    }
    onCollapsedChange?.(newState);
  };

  // Calculate shadow - ensure we never have undefined values
  let boxShadow: string = variantStyles[variant].boxShadow || 'none';
  if (shadow) {
    const shadowValue = typeof shadow === 'string'
      ? (shadowStyles[shadow] ?? shadowStyles.lg)
      : shadowStyles.lg;
    boxShadow = shadowValue ?? 'none';
  }
  if (glow) {
    boxShadow = `${boxShadow && boxShadow !== 'none' ? boxShadow + ', ' : ''}var(--sn-shadow-glow)`;
  }

  // Build base style
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radiusStyles[rounded],
    transition: 'all var(--sn-transition-normal, 200ms ease-out)',
    ...variantStyles[variant],
    boxShadow,
    ...(hoverEffect && isHovered ? {
      borderColor: 'var(--sn-accent-primary, #8b5cf6)',
      boxShadow: boxShadow && boxShadow !== 'none'
        ? `${boxShadow}, 0 0 0 1px var(--sn-accent-primary, #8b5cf6)`
        : '0 0 0 1px var(--sn-accent-primary, #8b5cf6)',
    } : {}),
    // Filter undefined values from style prop to prevent React error #306
    ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
  };

  // Content padding style
  const contentStyle: React.CSSProperties = {
    padding: paddingStyles[padding],
    display: isCollapsed ? 'none' : 'block',
  };

  // Header style
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: `${paddingStyles.sm}px ${paddingStyles[padding] || paddingStyles.md}px`,
    borderBottom: isCollapsed ? 'none' : '1px solid var(--sn-border-secondary, rgba(255, 255, 255, 0.04))',
    cursor: collapsible ? 'pointer' : 'default',
    userSelect: 'none',
    transition: 'background var(--sn-transition-fast)',
  };

  // Footer style
  const footerStyle: React.CSSProperties = {
    padding: `${paddingStyles.sm}px ${paddingStyles[padding] || paddingStyles.md}px`,
    borderTop: '1px solid var(--sn-border-secondary, rgba(255, 255, 255, 0.04))',
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.02))',
  };

  return (
    <div
      className={`sn-panel sn-panel-${variant} ${className}`}
      style={baseStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Rainbow border overlay */}
      {(variant === 'rainbow' || rainbowBorder) && (
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
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      {header && (
        <div
          onClick={collapsible ? toggleCollapse : undefined}
          style={headerStyle}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 'var(--sn-text-sm, 12px)',
              fontWeight: 600,
              color: 'var(--sn-text-primary, #f0f4f8)',
              flex: 1,
              minWidth: 0,
            }}
          >
            {header}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {headerActions}
            {collapsible && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  color: 'var(--sn-text-tertiary, #718096)',
                  transition: 'transform var(--sn-transition-fast)',
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                }}
              >
                <SNIcon name="chevronDown" size="sm" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={contentStyle}>
        {children}
      </div>

      {/* Footer */}
      {footer && !isCollapsed && (
        <div style={footerStyle}>
          {footer}
        </div>
      )}
    </div>
  );
};

SNPanel.displayName = 'SNPanel';

export default SNPanel;
