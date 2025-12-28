/**
 * StickerNest v2 - SNSlider
 * Shared slider/range component with theme support
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface SNSliderProps {
  /** Current value */
  value?: number;
  /** Default value */
  defaultValue?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Label text */
  label?: string;
  /** Show value label */
  showValue?: boolean;
  /** Value formatter */
  formatValue?: (value: number) => string;
  /** Disabled state */
  disabled?: boolean;
  /** On value change */
  onChange?: (value: number) => void;
  /** On change end (mouse up) */
  onChangeEnd?: (value: number) => void;
  /** Custom track color */
  trackColor?: string;
  /** Custom fill color */
  fillColor?: string;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { track: 4, thumb: 12 },
  md: { track: 6, thumb: 16 },
  lg: { track: 8, thumb: 20 },
};

export const SNSlider: React.FC<SNSliderProps> = ({
  value: controlledValue,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  formatValue = (v) => String(v),
  disabled = false,
  onChange,
  onChangeEnd,
  trackColor,
  fillColor,
  size = 'md',
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const { track: trackHeight, thumb: thumbSize } = sizeMap[size];

  // Calculate percentage
  const percentage = ((value - min) / (max - min)) * 100;

  // Update value based on position
  const updateValue = useCallback((clientX: number) => {
    if (!trackRef.current || disabled) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));

    if (!isControlled) {
      setInternalValue(clampedValue);
    }
    onChange?.(clampedValue);
  }, [disabled, min, max, step, isControlled, onChange]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    updateValue(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onChangeEnd?.(value);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, value, updateValue, onChangeEnd]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--sn-space-2)',
    width: '100%',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 'var(--sn-text-sm)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--sn-text-secondary)',
    fontWeight: 'var(--sn-font-medium)' as unknown as number,
  };

  const valueStyle: React.CSSProperties = {
    color: 'var(--sn-text-primary)',
    fontFamily: 'var(--sn-font-mono)',
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    height: thumbSize + 8,
    display: 'flex',
    alignItems: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const trackBarStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: trackHeight,
    borderRadius: trackHeight / 2,
    background: trackColor || 'var(--sn-bg-tertiary)',
  };

  const fillBarStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: `${percentage}%`,
    height: trackHeight,
    borderRadius: trackHeight / 2,
    background: fillColor || 'var(--sn-accent-primary)',
    transition: isDragging ? 'none' : 'width var(--sn-transition-fast)',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    left: `calc(${percentage}% - ${thumbSize / 2}px)`,
    width: thumbSize,
    height: thumbSize,
    borderRadius: '50%',
    background: 'var(--sn-bg-elevated)',
    border: '2px solid var(--sn-accent-primary)',
    boxShadow: 'var(--sn-shadow-md)',
    transition: isDragging ? 'none' : 'left var(--sn-transition-fast)',
    transform: isDragging ? 'scale(1.1)' : 'scale(1)',
  };

  return (
    <div style={containerStyle}>
      {(label || showValue) && (
        <div style={headerStyle}>
          {label && <span style={labelStyle}>{label}</span>}
          {showValue && <span style={valueStyle}>{formatValue(value)}</span>}
        </div>
      )}
      <div
        ref={trackRef}
        style={trackStyle}
        onMouseDown={handleMouseDown}
      >
        <div style={trackBarStyle} />
        <div style={fillBarStyle} />
        <div style={thumbStyle} />
      </div>
    </div>
  );
};

export default SNSlider;
