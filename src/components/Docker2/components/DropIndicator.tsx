/**
 * Docker 2.0 Drop Indicator
 * Visual feedback for drag-and-drop zones
 */

import React, { useMemo } from 'react';
import type { DropIndicatorProps, DropZone } from '../Docker2.types';
import { getTheme, getDropZoneStyle } from '../Docker2Theme';

export const DropIndicator: React.FC<DropIndicatorProps> = ({
  zone,
  active,
  themeMode,
}) => {
  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  // Position based on zone
  const positionStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      transition: `all ${theme.transitions.fast}`,
    };

    switch (zone) {
      case 'top':
        return { ...base, top: 0, height: '25%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };
      case 'bottom':
        return { ...base, bottom: 0, height: '25%', borderTopLeftRadius: 0, borderTopRightRadius: 0 };
      case 'left':
        return { ...base, left: 0, top: 0, bottom: 0, width: '25%', right: 'auto', borderTopRightRadius: 0, borderBottomRightRadius: 0 };
      case 'right':
        return { ...base, right: 0, top: 0, bottom: 0, width: '25%', left: 'auto', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 };
      case 'center':
        return { ...base, top: '25%', bottom: '25%', left: '10%', right: '10%' };
      case 'between':
        return { ...base, height: 4, left: '5%', right: '5%' };
      default:
        return base;
    }
  }, [zone, theme.transitions.fast]);

  const dropZoneStyle = useMemo(() => getDropZoneStyle(theme, active), [theme, active]);

  return (
    <div
      style={{
        ...dropZoneStyle,
        ...positionStyle,
        opacity: active ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.accent,
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {zone === 'center' ? 'Drop here' : zone === 'between' ? '' : `Insert ${zone}`}
        </div>
      )}
    </div>
  );
};

// ==================
// Between Indicator (for reordering)
// ==================

interface BetweenIndicatorProps {
  index: number;
  active: boolean;
  themeMode: 'light' | 'dark';
  orientation: 'vertical' | 'horizontal';
}

export const BetweenIndicator: React.FC<BetweenIndicatorProps> = ({
  index,
  active,
  themeMode,
  orientation,
}) => {
  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  const style: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      position: 'absolute',
      background: active
        ? `linear-gradient(${orientation === 'vertical' ? '90deg' : '0deg'}, transparent, ${theme.colors.accent}, transparent)`
        : 'transparent',
      transition: `all ${theme.transitions.fast}`,
      zIndex: 5,
      pointerEvents: 'none',
    };

    if (orientation === 'vertical') {
      return {
        ...base,
        left: '10%',
        right: '10%',
        height: active ? 3 : 1,
      };
    } else {
      return {
        ...base,
        top: '10%',
        bottom: '10%',
        width: active ? 3 : 1,
      };
    }
  }, [active, orientation, theme]);

  return <div style={style} data-between-index={index} />;
};

export default DropIndicator;
