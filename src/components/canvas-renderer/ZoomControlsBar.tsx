/**
 * ZoomControlsBar
 * Mobile-friendly zoom controls with level snapping
 */

import React from 'react';
import type { CanvasSettings } from '../../types/domain';

interface ZoomControlsBarProps {
  viewport: {
    zoom: number;
  };
  settings: CanvasSettings;
  zoomLevels: number[];
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (level: number) => void;
  fitToViewport: () => void;
}

export const ZoomControlsBar: React.FC<ZoomControlsBarProps> = ({
  viewport,
  settings,
  zoomLevels,
  zoomIn,
  zoomOut,
  zoomTo,
  fitToViewport,
}) => {
  if (!settings.zoom.enabled) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px',
      background: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 8,
      pointerEvents: 'auto',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Zoom out button */}
      <button
        onClick={zoomOut}
        disabled={viewport.zoom <= settings.zoom.min}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: viewport.zoom <= settings.zoom.min ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 6,
          color: viewport.zoom <= settings.zoom.min ? '#666' : '#fff',
          fontSize: 20,
          cursor: viewport.zoom <= settings.zoom.min ? 'not-allowed' : 'pointer',
          touchAction: 'manipulation',
          transition: 'all 0.15s ease',
        }}
        aria-label="Zoom out"
        title="Zoom out (Ctrl + scroll down)"
      >
        −
      </button>

      {/* Zoom level dropdown */}
      <select
        value={Math.round(viewport.zoom * 100)}
        onChange={(e) => zoomTo(parseInt(e.target.value) / 100)}
        style={{
          minWidth: 70,
          height: 36,
          padding: '0 8px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontSize: 12,
          fontFamily: 'monospace',
          fontWeight: 600,
          cursor: 'pointer',
          touchAction: 'manipulation',
          outline: 'none',
          textAlign: 'center',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M3 5l3 3 3-3z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
          paddingRight: 20,
        }}
        aria-label="Select zoom level"
      >
        {zoomLevels.filter(level => level >= settings.zoom.min && level <= settings.zoom.max).map(level => (
          <option key={level} value={Math.round(level * 100)} style={{ background: '#1a1a2e', color: '#fff' }}>
            {Math.round(level * 100)}%
          </option>
        ))}
        {/* Add current zoom if it's not in the list */}
        {!zoomLevels.some(l => Math.round(l * 100) === Math.round(viewport.zoom * 100)) && (
          <option value={Math.round(viewport.zoom * 100)} style={{ background: '#1a1a2e', color: '#fff' }}>
            {Math.round(viewport.zoom * 100)}%
          </option>
        )}
      </select>

      {/* Zoom in button */}
      <button
        onClick={zoomIn}
        disabled={viewport.zoom >= settings.zoom.max}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: viewport.zoom >= settings.zoom.max ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 6,
          color: viewport.zoom >= settings.zoom.max ? '#666' : '#fff',
          fontSize: 20,
          cursor: viewport.zoom >= settings.zoom.max ? 'not-allowed' : 'pointer',
          touchAction: 'manipulation',
          transition: 'all 0.15s ease',
        }}
        aria-label="Zoom in"
        title="Zoom in (Ctrl + scroll up)"
      >
        +
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

      {/* Reset zoom to 100% */}
      <button
        onClick={() => zoomTo(1)}
        style={{
          height: 36,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: Math.abs(viewport.zoom - 1) < 0.01 ? 'rgba(74, 158, 255, 0.3)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          touchAction: 'manipulation',
          transition: 'all 0.15s ease',
        }}
        title="Reset to 100% (Ctrl + 0)"
        aria-label="Reset zoom to 100%"
      >
        1:1
      </button>

      {/* Fit to screen button */}
      <button
        onClick={fitToViewport}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontSize: 16,
          cursor: 'pointer',
          touchAction: 'manipulation',
          transition: 'all 0.15s ease',
        }}
        title="Fit to screen"
        aria-label="Fit canvas to screen"
      >
        ⊡
      </button>
    </div>
  );
};
