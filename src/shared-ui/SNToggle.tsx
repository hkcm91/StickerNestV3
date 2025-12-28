/**
 * StickerNest v2 - SNToggle
 * Shared toggle/switch component with theme support
 */

import React, { useState } from 'react';

export type SNToggleSize = 'sm' | 'md' | 'lg';

export interface SNToggleProps {
  /** Checked state */
  checked?: boolean;
  /** Default checked state */
  defaultChecked?: boolean;
  /** Label text */
  label?: string;
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: SNToggleSize;
  /** On/Off labels */
  onLabel?: string;
  offLabel?: string;
  /** On change handler */
  onChange?: (checked: boolean) => void;
}

const sizeMap = {
  sm: { width: 32, height: 18, knob: 14 },
  md: { width: 44, height: 24, knob: 20 },
  lg: { width: 56, height: 30, knob: 26 },
};

export const SNToggle: React.FC<SNToggleProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  label,
  labelPosition = 'right',
  helperText,
  disabled = false,
  size = 'md',
  onLabel,
  offLabel,
  onChange,
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const { width, height, knob } = sizeMap[size];
  const padding = (height - knob) / 2;

  const handleToggle = () => {
    if (disabled) return;

    const newValue = !checked;
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  };

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: 'var(--sn-space-1)',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sn-space-2)',
    flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    width,
    height,
    borderRadius: height / 2,
    background: checked ? 'var(--sn-accent-primary)' : 'var(--sn-bg-tertiary)',
    border: `1px solid ${checked ? 'var(--sn-accent-primary)' : 'var(--sn-border-primary)'}`,
    transition: 'all var(--sn-transition-fast)',
    flexShrink: 0,
  };

  const knobStyle: React.CSSProperties = {
    position: 'absolute',
    top: padding,
    left: checked ? width - knob - padding - 2 : padding,
    width: knob,
    height: knob,
    borderRadius: '50%',
    background: 'white',
    boxShadow: 'var(--sn-shadow-sm)',
    transition: 'left var(--sn-transition-fast)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: size === 'sm' ? 'var(--sn-text-xs)' : 'var(--sn-text-sm)',
    color: 'var(--sn-text-primary)',
    userSelect: 'none',
  };

  const statusLabelStyle: React.CSSProperties = {
    fontSize: 'var(--sn-text-xs)',
    color: 'var(--sn-text-tertiary)',
    marginLeft: labelPosition === 'right' ? 'var(--sn-space-1)' : 0,
    marginRight: labelPosition === 'left' ? 'var(--sn-space-1)' : 0,
  };

  const helperStyle: React.CSSProperties = {
    fontSize: 'var(--sn-text-xs)',
    color: 'var(--sn-text-tertiary)',
    marginLeft: labelPosition === 'right' ? width + 8 : 0,
  };

  return (
    <div style={containerStyle}>
      <div style={rowStyle} onClick={handleToggle}>
        <div style={trackStyle}>
          <div style={knobStyle} />
        </div>
        {label && (
          <span style={labelStyle}>
            {label}
            {(onLabel || offLabel) && (
              <span style={statusLabelStyle}>
                ({checked ? onLabel || 'On' : offLabel || 'Off'})
              </span>
            )}
          </span>
        )}
      </div>
      {helperText && <span style={helperStyle}>{helperText}</span>}
    </div>
  );
};

export default SNToggle;
