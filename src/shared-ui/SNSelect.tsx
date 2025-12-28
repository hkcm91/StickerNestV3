/**
 * StickerNest v2 - SNSelect
 * Shared select/dropdown component with theme support
 */

import React, { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export interface SNSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SNSelectProps {
  /** Options to display */
  options: SNSelectOption[];
  /** Selected value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** On value change */
  onChange?: (value: string) => void;
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: {
    padding: 'var(--sn-space-1) var(--sn-space-2)',
    fontSize: 'var(--sn-text-xs)',
    minHeight: '28px',
  },
  md: {
    padding: 'var(--sn-space-2) var(--sn-space-3)',
    fontSize: 'var(--sn-text-sm)',
    minHeight: '36px',
  },
  lg: {
    padding: 'var(--sn-space-3) var(--sn-space-4)',
    fontSize: 'var(--sn-text-base)',
    minHeight: '44px',
  },
};

export const SNSelect: React.FC<SNSelectProps> = ({
  options,
  value: controlledValue,
  defaultValue,
  placeholder = 'Select...',
  label,
  helperText,
  error,
  disabled = false,
  fullWidth = false,
  size = 'md',
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const selectedOption = options.find(o => o.value === value);
  const hasError = Boolean(error);

  // Close dropdown on outside click using shared hook
  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(containerRef, handleClose, { enabled: isOpen });

  const handleSelect = (option: SNSelectOption) => {
    if (option.disabled) return;

    if (!isControlled) {
      setInternalValue(option.value);
    }
    onChange?.(option.value);
    setIsOpen(false);
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    gap: 'var(--sn-space-1)',
    width: fullWidth ? '100%' : 'auto',
    minWidth: 120,
  };

  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--sn-space-2)',
    background: 'var(--sn-bg-primary)',
    border: `1px solid ${hasError ? 'var(--sn-error)' : isOpen ? 'var(--sn-accent-primary)' : 'var(--sn-border-primary)'}`,
    borderRadius: 'var(--sn-radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all var(--sn-transition-fast)',
    boxShadow: isOpen ? '0 0 0 2px var(--sn-focus-ring)' : 'none',
    ...sizeStyles[size],
  };

  const valueStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sn-space-2)',
    color: selectedOption ? 'var(--sn-text-primary)' : 'var(--sn-text-tertiary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const chevronStyle: React.CSSProperties = {
    color: 'var(--sn-text-tertiary)',
    fontSize: 'var(--sn-text-xs)',
    transition: 'transform var(--sn-transition-fast)',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
    flexShrink: 0,
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 'var(--sn-space-1)',
    background: 'var(--sn-bg-elevated)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    boxShadow: 'var(--sn-shadow-lg)',
    zIndex: 100,
    maxHeight: 200,
    overflowY: 'auto',
    display: isOpen ? 'block' : 'none',
  };

  const optionStyle = (option: SNSelectOption, isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sn-space-2)',
    padding: 'var(--sn-space-2) var(--sn-space-3)',
    cursor: option.disabled ? 'not-allowed' : 'pointer',
    opacity: option.disabled ? 0.5 : 1,
    background: isSelected ? 'var(--sn-accent-primary)' : 'transparent',
    color: isSelected ? 'white' : 'var(--sn-text-primary)',
    fontSize: sizeStyles[size].fontSize,
    transition: 'background var(--sn-transition-fast)',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--sn-text-sm)',
    fontWeight: 'var(--sn-font-medium)' as unknown as number,
    color: 'var(--sn-text-secondary)',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: 'var(--sn-text-xs)',
    color: hasError ? 'var(--sn-error)' : 'var(--sn-text-tertiary)',
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div
        style={triggerStyle}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--sn-border-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = hasError ? 'var(--sn-error)' : 'var(--sn-border-primary)';
          }
        }}
      >
        <span style={valueStyle}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <span style={chevronStyle}>▼</span>
      </div>

      <div style={dropdownStyle}>
        {options.map((option) => (
          <div
            key={option.value}
            style={optionStyle(option, option.value === value)}
            onClick={() => handleSelect(option)}
            onMouseEnter={(e) => {
              if (!option.disabled && option.value !== value) {
                e.currentTarget.style.background = 'var(--sn-bg-tertiary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!option.disabled && option.value !== value) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {option.icon}
            {option.label}
          </div>
        ))}
      </div>

      {(helperText || error) && (
        <span style={helperStyle}>{error || helperText}</span>
      )}
    </div>
  );
};

export default SNSelect;
