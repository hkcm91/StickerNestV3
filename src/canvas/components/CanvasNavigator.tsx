/**
 * StickerNest v2 - Canvas Navigator
 *
 * Quick navigation controls for canvas: fit-to-view, zoom presets, etc.
 */

import React, { memo, useCallback, useState } from 'react';
import { haptic } from '../../utils/haptics';
import { ZOOM_PRESETS } from '../utils/navigationHelpers';

interface CanvasNavigatorProps {
  zoom: number;
  onFitToView: () => void;
  onFitToContent: () => void;
  onZoomTo: (zoom: number) => void;
  onCenterCanvas: () => void;
  hasContent: boolean;
  accentColor: string;
}

export const CanvasNavigator = memo(function CanvasNavigator({
  zoom,
  onFitToView,
  onFitToContent,
  onZoomTo,
  onCenterCanvas,
  hasContent,
  accentColor,
}: CanvasNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    haptic('light');
    setIsExpanded((prev) => !prev);
  }, []);

  const handleAction = useCallback(
    (action: () => void) => {
      haptic('light');
      action();
    },
    []
  );

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    minWidth: 44,
    minHeight: 44,
    background: `${accentColor}22`,
    border: 'none',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background 0.15s',
  };

  const presetButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    minWidth: 36,
    padding: '6px 8px',
    fontSize: 11,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        background: 'rgba(15, 15, 25, 0.95)',
        borderRadius: 10,
        border: `1px solid ${accentColor}33`,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        style={{
          ...buttonStyle,
          background: isExpanded ? accentColor : `${accentColor}22`,
        }}
        aria-label="Toggle navigation options"
        aria-expanded={isExpanded}
      >
        <span style={{ fontSize: 16 }}>⊞</span>
        <span>Nav</span>
      </button>

      {/* Expanded Options */}
      {isExpanded && (
        <>
          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => handleAction(onFitToView)}
              style={buttonStyle}
              title="Fit entire canvas in view"
            >
              <span style={{ fontSize: 14 }}>◻</span>
              <span>Fit Canvas</span>
            </button>

            <button
              onClick={() => handleAction(onFitToContent)}
              disabled={!hasContent}
              style={{
                ...buttonStyle,
                opacity: hasContent ? 1 : 0.4,
                cursor: hasContent ? 'pointer' : 'not-allowed',
              }}
              title="Zoom to fit all widgets"
            >
              <span style={{ fontSize: 14 }}>⊡</span>
              <span>Fit Content</span>
            </button>

            <button
              onClick={() => handleAction(onCenterCanvas)}
              style={buttonStyle}
              title="Center canvas in view"
            >
              <span style={{ fontSize: 14 }}>⊙</span>
              <span>Center</span>
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: `${accentColor}33`,
              margin: '4px 0',
            }}
          />

          {/* Zoom Presets */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 4,
            }}
          >
            {ZOOM_PRESETS.slice(0, 6).map((preset) => (
              <button
                key={preset}
                onClick={() => handleAction(() => onZoomTo(preset))}
                style={{
                  ...presetButtonStyle,
                  background:
                    Math.abs(zoom - preset) < 0.01
                      ? accentColor
                      : `${accentColor}22`,
                  color:
                    Math.abs(zoom - preset) < 0.01 ? '#fff' : '#94a3b8',
                }}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

export default CanvasNavigator;
