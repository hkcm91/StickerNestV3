/**
 * StickerNest v2 - Sticker Properties Panel
 * Configure sticker behavior, appearance, and widget links
 */

import React, { useState, useEffect } from 'react';
import type { StickerInstance, StickerClickBehavior } from '../types/domain';
import { useStickerStore } from '../state/useStickerStore';

interface StickerPropertiesPanelProps {
  sticker: StickerInstance;
  availableWidgets: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDelete?: (stickerId: string) => void;
}

export const StickerPropertiesPanel: React.FC<StickerPropertiesPanelProps> = ({
  sticker,
  availableWidgets,
  onClose,
  onDelete,
}) => {
  const updateSticker = useStickerStore(state => state.updateSticker);
  const removeSticker = useStickerStore(state => state.removeSticker);

  const [name, setName] = useState(sticker.name);
  const [clickBehavior, setClickBehavior] = useState<StickerClickBehavior>(sticker.clickBehavior);
  const [linkedWidgetDefId, setLinkedWidgetDefId] = useState(sticker.linkedWidgetDefId || '');
  const [linkedUrl, setLinkedUrl] = useState(sticker.linkedUrl || '');
  const [linkedEvent, setLinkedEvent] = useState(sticker.linkedEvent || '');
  const [hoverAnimation, setHoverAnimation] = useState(sticker.hoverAnimation || 'none');
  const [clickAnimation, setClickAnimation] = useState(sticker.clickAnimation || 'none');
  const [widgetSpawnPosition, setWidgetSpawnPosition] = useState(sticker.widgetSpawnPosition || 'right');
  const [opacity, setOpacity] = useState(sticker.opacity ?? 1);
  const [tooltip, setTooltip] = useState(sticker.tooltip || '');
  const [showBadge, setShowBadge] = useState(sticker.showBadge || false);
  const [locked, setLocked] = useState(sticker.locked || false);

  // Z-index controls
  const handleBringToFront = () => {
    updateSticker(sticker.id, { zIndex: 9999 });
  };

  const handleSendToBack = () => {
    updateSticker(sticker.id, { zIndex: 1 });
  };

  const handleToggleLock = () => {
    const newLocked = !locked;
    setLocked(newLocked);
    updateSticker(sticker.id, { locked: newLocked });
  };

  // Apply changes
  const handleApply = () => {
    updateSticker(sticker.id, {
      name,
      clickBehavior,
      linkedWidgetDefId: clickBehavior === 'toggle-widget' || clickBehavior === 'launch-widget' ? linkedWidgetDefId : undefined,
      linkedUrl: clickBehavior === 'open-url' ? linkedUrl : undefined,
      linkedEvent: clickBehavior === 'emit-event' ? linkedEvent : undefined,
      hoverAnimation,
      clickAnimation,
      widgetSpawnPosition,
      opacity,
      tooltip,
      showBadge,
      locked,
    });
    onClose();
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Sticker Properties</h3>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      <div style={styles.content}>
        {/* Preview */}
        <div style={styles.preview}>
          {sticker.mediaType === 'emoji' ? (
            <span style={{ fontSize: 48 }}>{sticker.mediaSrc}</span>
          ) : (
            <img src={sticker.mediaSrc} alt={sticker.name} style={styles.previewImage} />
          )}
        </div>

        {/* Name */}
        <div style={styles.field}>
          <label style={styles.label}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Click Behavior */}
        <div style={styles.field}>
          <label style={styles.label}>Click Behavior</label>
          <select
            value={clickBehavior}
            onChange={(e) => setClickBehavior(e.target.value as StickerClickBehavior)}
            style={styles.select}
          >
            <option value="none">None (decorative)</option>
            <option value="toggle-widget">Toggle Widget</option>
            <option value="launch-widget">Launch Widget</option>
            <option value="open-url">Open URL</option>
            <option value="emit-event">Emit Event</option>
          </select>
        </div>

        {/* Widget Link */}
        {(clickBehavior === 'toggle-widget' || clickBehavior === 'launch-widget') && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Linked Widget</label>
              <select
                value={linkedWidgetDefId}
                onChange={(e) => setLinkedWidgetDefId(e.target.value)}
                style={styles.select}
              >
                <option value="">Select a widget...</option>
                {availableWidgets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Widget Spawn Position</label>
              <select
                value={widgetSpawnPosition}
                onChange={(e) => setWidgetSpawnPosition(e.target.value as any)}
                style={styles.select}
              >
                <option value="right">Right of sticker</option>
                <option value="left">Left of sticker</option>
                <option value="above">Above sticker</option>
                <option value="below">Below sticker</option>
                <option value="overlay">Overlay (on top)</option>
                <option value="center">Center of canvas</option>
              </select>
            </div>
          </>
        )}

        {/* URL Link */}
        {clickBehavior === 'open-url' && (
          <div style={styles.field}>
            <label style={styles.label}>URL</label>
            <input
              type="url"
              value={linkedUrl}
              onChange={(e) => setLinkedUrl(e.target.value)}
              placeholder="https://..."
              style={styles.input}
            />
          </div>
        )}

        {/* Event */}
        {clickBehavior === 'emit-event' && (
          <div style={styles.field}>
            <label style={styles.label}>Event Name</label>
            <input
              type="text"
              value={linkedEvent}
              onChange={(e) => setLinkedEvent(e.target.value)}
              placeholder="custom:event-name"
              style={styles.input}
            />
          </div>
        )}

        <div style={styles.divider} />

        {/* Animations */}
        <h4 style={styles.sectionTitle}>Animations</h4>

        <div style={styles.fieldRow}>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>On Hover</label>
            <select
              value={hoverAnimation}
              onChange={(e) => setHoverAnimation(e.target.value as any)}
              style={styles.select}
            >
              <option value="none">None</option>
              <option value="scale">Scale up</option>
              <option value="bounce">Bounce</option>
              <option value="shake">Shake</option>
              <option value="glow">Glow</option>
            </select>
          </div>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>On Click</label>
            <select
              value={clickAnimation}
              onChange={(e) => setClickAnimation(e.target.value as any)}
              style={styles.select}
            >
              <option value="none">None</option>
              <option value="pulse">Pulse</option>
              <option value="ripple">Ripple</option>
              <option value="shrink">Shrink</option>
            </select>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Appearance */}
        <h4 style={styles.sectionTitle}>Appearance</h4>

        <div style={styles.field}>
          <label style={styles.label}>Opacity: {Math.round(opacity * 100)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Tooltip</label>
          <input
            type="text"
            value={tooltip}
            onChange={(e) => setTooltip(e.target.value)}
            placeholder="Hover text..."
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
              style={styles.checkbox}
            />
            Show notification badge
          </label>
        </div>

        <div style={styles.divider} />

        {/* Layer Controls */}
        <h4 style={styles.sectionTitle}>Layer Controls</h4>

        <div style={styles.fieldRow}>
          <button onClick={handleBringToFront} style={styles.layerBtn}>
            Bring to Front
          </button>
          <button onClick={handleSendToBack} style={styles.layerBtn}>
            Send to Back
          </button>
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={locked}
              onChange={handleToggleLock}
              style={styles.checkbox}
            />
            Lock sticker position
          </label>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button
          onClick={() => {
            if (confirm('Delete this sticker?')) {
              removeSticker(sticker.id);
              onDelete?.(sticker.id);
              onClose();
            }
          }}
          style={styles.deleteBtn}
        >
          Delete
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
        <button onClick={handleApply} style={styles.applyBtn}>Apply</button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 380,
    maxHeight: '80vh',
    background: '#1a1a2e',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10000,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
  },
  preview: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewImage: {
    maxWidth: 80,
    maxHeight: 80,
    objectFit: 'contain',
  },
  field: {
    marginBottom: 16,
  },
  fieldRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  slider: {
    width: '100%',
    accentColor: '#8b5cf6',
  },
  checkbox: {
    width: 16,
    height: 16,
    marginRight: 8,
    accentColor: '#8b5cf6',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '20px 0',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  applyBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '10px 16px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  layerBtn: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default StickerPropertiesPanel;
