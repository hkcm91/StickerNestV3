/**
 * CanvasToolbarButtons
 * Top-right toolbar buttons for layer panel and keyboard shortcuts
 */

import React from 'react';

interface CanvasToolbarButtonsProps {
  showLayerPanel: boolean;
  onToggleLayerPanel: () => void;
  onShowShortcutsHelp: () => void;
}

export const CanvasToolbarButtons: React.FC<CanvasToolbarButtonsProps> = ({
  showLayerPanel,
  onToggleLayerPanel,
  onShowShortcutsHelp,
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 1002,
      display: 'flex',
      gap: 6,
    }}>
      {/* Layer panel toggle */}
      <button
        onClick={onToggleLayerPanel}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: showLayerPanel ? 'rgba(74, 158, 255, 0.3)' : 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          borderRadius: 6,
          color: showLayerPanel ? '#4a9eff' : '#999',
          fontSize: 14,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Layer panel (L)"
        aria-label="Toggle layer panel"
      >
        ☰
      </button>

      {/* Keyboard shortcuts help */}
      <button
        onClick={onShowShortcutsHelp}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          borderRadius: 6,
          color: '#999',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        ?
      </button>
    </div>
  );
};
