/**
 * StickerNest v2 - SNInput
 * Shared input component with theme support
 */

import React, { forwardRef } from 'react';

export type SNInputSize = 'sm' | 'md' | 'lg';
export type SNInputVariant = 'default' | 'filled' | 'ghost';

export interface SNInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: SNInputSize;
  /** Input variant */
  variant?: SNInputVariant;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message (shows error state) */
  error?: string;
  /** Left icon/element */
  leftElement?: React.ReactNode;
  /** Right icon/element */
  rightElement?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

const sizeStyles: Record<SNInputSize, React.CSSProperties> = {
  sm: {
    padding: 'var(--sn-space-1) var(--sn-space-2)',
    fontSize: 'var(--sn-text-xs)',
    height: '28px',
  },
  md: {
    padding: 'var(--sn-space-2) var(--sn-space-3)',
    fontSize: 'var(--sn-text-sm)',
    height: '36px',
  },
  lg: {
    padding: 'var(--sn-space-3) var(--sn-space-4)',
    fontSize: 'var(--sn-text-base)',
    height: '44px',
  },
};

const variantStyles: Record<SNInputVariant, React.CSSProperties> = {
  default: {
    background: 'var(--sn-bg-primary)',
    border: '1px solid var(--sn-border-primary)',
  },
  filled: {
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid transparent',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
  },
};

export const SNInput = forwardRef<HTMLInputElement, SNInputProps>(({
  size = 'md',
  variant = 'default',
  label,
  helperText,
  error,
  leftElement,
  rightElement,
  fullWidth = false,
  disabled,
  style,
  ...props
}, ref) => {
  const hasError = Boolean(error);

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: 'var(--sn-space-1)',
    width: fullWidth ? '100%' : 'auto',
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sn-space-2)',
    borderRadius: 'var(--sn-radius-md)',
    transition: 'all var(--sn-transition-fast)',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(hasError && {
      borderColor: 'var(--sn-error)',
    }),
    ...(disabled && {
      opacity: 0.5,
      cursor: 'not-allowed',
    }),
    // Filter undefined values from style prop to prevent React error #306
    ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    color: 'var(--sn-text-primary)',
    fontSize: 'inherit',
    outline: 'none',
    width: '100%',
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--sn-text-sm)',
    fontWeight: 'var(--sn-font-medium)' as unknown as number,
    color: 'var(--sn-text-secondary)',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: 'var(--sn-text-xs)',
    color: hasError ? 'var(--sn-error)' : 'var(--sn-text-tertiary)',
  };

  const elementStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--sn-text-tertiary)',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div
        style={inputWrapperStyle}
        onFocus={(e) => {
          const target = e.currentTarget;
          target.style.borderColor = hasError ? 'var(--sn-error)' : 'var(--sn-accent-primary)';
          target.style.boxShadow = hasError
            ? '0 0 0 2px rgba(239, 68, 68, 0.2)'
            : '0 0 0 2px var(--sn-focus-ring)';
        }}
        onBlur={(e) => {
          const target = e.currentTarget;
          const borderValue = variantStyles[variant]?.border?.toString() ?? '';
          target.style.borderColor = hasError ? 'var(--sn-error)' : borderValue.includes('transparent') ? 'transparent' : 'var(--sn-border-primary)';
          target.style.boxShadow = 'none';
        }}
      >
        {leftElement && <span style={elementStyle}>{leftElement}</span>}
        <input
          ref={ref}
          disabled={disabled}
          style={inputStyle}
          {...props}
        />
        {rightElement && <span style={elementStyle}>{rightElement}</span>}
      </div>
      {(helperText || error) && (
        <span style={helperStyle}>{error || helperText}</span>
      )}
    </div>
  );
});

SNInput.displayName = 'SNInput';

export default SNInput;
