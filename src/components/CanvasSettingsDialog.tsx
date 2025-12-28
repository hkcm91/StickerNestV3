/**
 * StickerNest v2 - Canvas Settings Dialog
 * Configure canvas behavior: scrolling, zoom, touch, widget defaults
 *
 * Updated with new design system: SNIcon, SNIconButton, glass effects
 */

import React, { useState, useEffect } from 'react';
import type { CanvasSettings, CanvasScrollMode, CanvasInteractionMode } from '../types/domain';
import { DEFAULT_CANVAS_SETTINGS } from '../types/domain';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { SNButton } from '../shared-ui/SNButton';

interface CanvasSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CanvasSettings;
  onSave: (settings: CanvasSettings) => void;
}

export const CanvasSettingsDialog: React.FC<CanvasSettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<CanvasSettings>(settings);
  const [activeTab, setActiveTab] = useState<'scroll' | 'zoom' | 'touch' | 'widgets'>('scroll');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const updateSettings = <K extends keyof CanvasSettings>(
    key: K,
    value: CanvasSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSettings = <K extends keyof CanvasSettings>(
    key: K,
    nested: Partial<CanvasSettings[K]>
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: { ...(prev[key] as object), ...nested },
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_CANVAS_SETTINGS);
  };

  const tabStyle = (tab: string) => ({
    padding: '10px 16px',
    background: activeTab === tab ? 'var(--sn-accent-primary, #8b5cf6)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--sn-text-secondary, #94a3b8)',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: activeTab === tab ? 600 : 400,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--sn-bg-overlay, rgba(0, 0, 0, 0.7))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
          borderRadius: 'var(--sn-radius-xl, 16px)',
          width: '90%',
          maxWidth: 600,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(139, 92, 246, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SNIcon name="settings" size="lg" />
            <h2 style={{ margin: 0, fontSize: 'var(--sn-text-xl, 18px)', color: 'var(--sn-text-primary, #f0f4f8)' }}>
              Canvas Settings
            </h2>
          </div>
          <SNIconButton
            icon="close"
            variant="ghost"
            size="sm"
            tooltip="Close"
            onClick={onClose}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '12px 20px 0', gap: 4, background: 'rgba(0,0,0,0.2)' }}>
          <button style={tabStyle('scroll')} onClick={() => setActiveTab('scroll')}>
            Scroll & Pan
          </button>
          <button style={tabStyle('zoom')} onClick={() => setActiveTab('zoom')}>
            Zoom
          </button>
          <button style={tabStyle('touch')} onClick={() => setActiveTab('touch')}>
            Touch & Mobile
          </button>
          <button style={tabStyle('widgets')} onClick={() => setActiveTab('widgets')}>
            Widget Defaults
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {/* Scroll & Pan Tab */}
          {activeTab === 'scroll' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingGroup label="Scroll Mode">
                <SettingDescription>
                  How the canvas behaves when it's larger than the viewport
                </SettingDescription>
                <RadioGroup
                  options={[
                    { value: 'fixed', label: 'Fixed', description: 'Canvas fits viewport, no scrolling' },
                    { value: 'scroll', label: 'Scroll', description: 'Standard scrollbars when canvas > viewport' },
                    { value: 'pan', label: 'Pan', description: 'Click and drag to pan (no scrollbars)' },
                    { value: 'infinite', label: 'Infinite', description: 'Canvas auto-expands as needed' },
                  ]}
                  value={localSettings.scrollMode}
                  onChange={(v) => updateSettings('scrollMode', v as CanvasScrollMode)}
                />
              </SettingGroup>

              <SettingGroup label="Viewer Interaction">
                <SettingDescription>
                  What viewers (non-editors) can do on this canvas
                </SettingDescription>
                <RadioGroup
                  options={[
                    { value: 'view-only', label: 'View Only', description: 'Viewers can only look, no interaction' },
                    { value: 'interact', label: 'Interact', description: 'Can interact with widgets but not move them' },
                    { value: 'full', label: 'Full Access', description: 'Viewers have full edit access' },
                  ]}
                  value={localSettings.interactionMode}
                  onChange={(v) => updateSettings('interactionMode', v as CanvasInteractionMode)}
                />
              </SettingGroup>

              <SettingGroup label="Display Options">
                <Toggle
                  label="Show size indicator"
                  description="Display canvas dimensions in corner"
                  checked={localSettings.showSizeIndicator}
                  onChange={(v) => updateSettings('showSizeIndicator', v)}
                />
                <Toggle
                  label="Show minimap"
                  description="Display navigation minimap for large canvases"
                  checked={localSettings.showMinimap}
                  onChange={(v) => updateSettings('showMinimap', v)}
                />
                <Toggle
                  label="Center when smaller"
                  description="Center canvas when smaller than viewport"
                  checked={localSettings.centerWhenSmaller}
                  onChange={(v) => updateSettings('centerWhenSmaller', v)}
                />
                <Toggle
                  label="Auto-fit on load"
                  description="Automatically zoom to fit canvas on load"
                  checked={localSettings.autoFitOnLoad}
                  onChange={(v) => updateSettings('autoFitOnLoad', v)}
                />
              </SettingGroup>
            </div>
          )}

          {/* Zoom Tab */}
          {activeTab === 'zoom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingGroup label="Zoom Controls">
                <Toggle
                  label="Enable zoom"
                  description="Allow zooming the canvas"
                  checked={localSettings.zoom.enabled}
                  onChange={(v) => updateNestedSettings('zoom', { enabled: v })}
                />
                <Toggle
                  label="Scroll wheel zoom"
                  description="Use scroll wheel to zoom (with modifier key)"
                  checked={localSettings.zoom.wheelZoom}
                  onChange={(v) => updateNestedSettings('zoom', { wheelZoom: v })}
                />
                {localSettings.zoom.wheelZoom && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>
                      Modifier key for wheel zoom:
                    </label>
                    <select
                      value={localSettings.zoom.wheelModifier || 'none'}
                      onChange={(e) =>
                        updateNestedSettings('zoom', {
                          wheelModifier: e.target.value === 'none' ? null : (e.target.value as 'ctrl' | 'meta' | 'shift'),
                        })
                      }
                      style={{
                        marginLeft: 10,
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: 4,
                        color: 'var(--sn-text-primary)',
                        fontSize: 12,
                      }}
                    >
                      <option value="none">None (always zoom)</option>
                      <option value="ctrl">Ctrl key</option>
                      <option value="meta">Cmd/Meta key</option>
                      <option value="shift">Shift key</option>
                    </select>
                  </div>
                )}
              </SettingGroup>

              <SettingGroup label="Zoom Limits">
                <Slider
                  label="Minimum zoom"
                  value={localSettings.zoom.min * 100}
                  min={10}
                  max={100}
                  step={10}
                  unit="%"
                  onChange={(v) => updateNestedSettings('zoom', { min: v / 100 })}
                />
                <Slider
                  label="Maximum zoom"
                  value={localSettings.zoom.max * 100}
                  min={100}
                  max={500}
                  step={50}
                  unit="%"
                  onChange={(v) => updateNestedSettings('zoom', { max: v / 100 })}
                />
                <Slider
                  label="Zoom step"
                  value={localSettings.zoom.step * 100}
                  min={5}
                  max={25}
                  step={5}
                  unit="%"
                  onChange={(v) => updateNestedSettings('zoom', { step: v / 100 })}
                />
              </SettingGroup>
            </div>
          )}

          {/* Touch & Mobile Tab */}
          {activeTab === 'touch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingGroup label="Touch Gestures">
                <Toggle
                  label="Pinch to zoom"
                  description="Two-finger pinch gesture for zooming"
                  checked={localSettings.zoom.pinchZoom}
                  onChange={(v) => updateNestedSettings('zoom', { pinchZoom: v })}
                />
                <Toggle
                  label="Two-finger pan"
                  description="Two-finger drag to pan the canvas"
                  checked={localSettings.touch.panEnabled}
                  onChange={(v) => updateNestedSettings('touch', { panEnabled: v })}
                />
                <Toggle
                  label="Single-finger pan (view mode)"
                  description="Pan with one finger when not editing"
                  checked={localSettings.touch.singleFingerPan}
                  onChange={(v) => updateNestedSettings('touch', { singleFingerPan: v })}
                />
              </SettingGroup>

              <SettingGroup label="Selection">
                <Toggle
                  label="Long-press to select"
                  description="Hold to select widgets on touch devices"
                  checked={localSettings.touch.longPressSelect}
                  onChange={(v) => updateNestedSettings('touch', { longPressSelect: v })}
                />
                {localSettings.touch.longPressSelect && (
                  <Slider
                    label="Long press duration"
                    value={localSettings.touch.longPressDuration}
                    min={200}
                    max={1000}
                    step={100}
                    unit="ms"
                    onChange={(v) => updateNestedSettings('touch', { longPressDuration: v })}
                  />
                )}
              </SettingGroup>

              <SettingGroup label="Other">
                <Toggle
                  label="Swipe gestures"
                  description="Enable swipe navigation between canvases"
                  checked={localSettings.touch.swipeGestures}
                  onChange={(v) => updateNestedSettings('touch', { swipeGestures: v })}
                />
                <Toggle
                  label="Keyboard shortcuts"
                  description="Enable keyboard shortcuts (delete, arrow keys, etc.)"
                  checked={localSettings.keyboardShortcuts}
                  onChange={(v) => updateSettings('keyboardShortcuts', v)}
                />
              </SettingGroup>
            </div>
          )}

          {/* Widget Defaults Tab */}
          {activeTab === 'widgets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingGroup label="Default Widget Size">
                <SettingDescription>
                  Size for widgets that don't specify their own dimensions
                </SettingDescription>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Slider
                    label="Default width"
                    value={localSettings.widgetDefaults.defaultWidth}
                    min={100}
                    max={800}
                    step={20}
                    unit="px"
                    onChange={(v) => updateNestedSettings('widgetDefaults', { defaultWidth: v })}
                  />
                  <Slider
                    label="Default height"
                    value={localSettings.widgetDefaults.defaultHeight}
                    min={100}
                    max={800}
                    step={20}
                    unit="px"
                    onChange={(v) => updateNestedSettings('widgetDefaults', { defaultHeight: v })}
                  />
                </div>
              </SettingGroup>

              <SettingGroup label="Scale Mode">
                <SettingDescription>
                  How widget content behaves when the widget is resized
                </SettingDescription>
                <RadioGroup
                  options={[
                    { value: 'contain', label: 'Contain', description: 'Scale to fit, maintain aspect ratio' },
                    { value: 'scale', label: 'Scale', description: 'Scale content proportionally' },
                    { value: 'crop', label: 'Crop', description: 'Clip content, no scaling' },
                    { value: 'stretch', label: 'Stretch', description: 'Fill frame (may distort)' },
                  ]}
                  value={localSettings.widgetDefaults.scaleMode}
                  onChange={(v) =>
                    updateNestedSettings('widgetDefaults', {
                      scaleMode: v as 'crop' | 'scale' | 'stretch' | 'contain',
                    })
                  }
                />
              </SettingGroup>

              <SettingGroup label="Placement">
                <Toggle
                  label="Snap to grid"
                  description="Snap new widgets to grid when placed"
                  checked={localSettings.widgetDefaults.snapToGrid}
                  onChange={(v) => updateNestedSettings('widgetDefaults', { snapToGrid: v })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Slider
                    label="Stack offset X"
                    value={localSettings.widgetDefaults.stackOffset.x}
                    min={0}
                    max={100}
                    step={10}
                    unit="px"
                    onChange={(v) =>
                      updateNestedSettings('widgetDefaults', {
                        stackOffset: { ...localSettings.widgetDefaults.stackOffset, x: v },
                      })
                    }
                  />
                  <Slider
                    label="Stack offset Y"
                    value={localSettings.widgetDefaults.stackOffset.y}
                    min={0}
                    max={100}
                    step={10}
                    unit="px"
                    onChange={(v) =>
                      updateNestedSettings('widgetDefaults', {
                        stackOffset: { ...localSettings.widgetDefaults.stackOffset, y: v },
                      })
                    }
                  />
                </div>
              </SettingGroup>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
            display: 'flex',
            justifyContent: 'space-between',
            background: 'var(--sn-glass-bg, rgba(0,0,0,0.2))',
          }}
        >
          <SNButton
            variant="outline"
            leftIcon="refresh"
            onClick={handleReset}
          >
            Reset to Defaults
          </SNButton>
          <div style={{ display: 'flex', gap: 10 }}>
            <SNButton variant="ghost" onClick={onClose}>
              Cancel
            </SNButton>
            <SNButton variant="gradient" leftIcon="save" onClick={handleSave}>
              Save Settings
            </SNButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components

const SettingGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--sn-text-primary, #e2e8f0)' }}>{label}</h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
);

const SettingDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--sn-text-secondary, #94a3b8)' }}>{children}</p>
);

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      cursor: 'pointer',
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 6,
    }}
  >
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        background: checked ? 'var(--sn-accent-primary, #8b5cf6)' : 'rgba(255,255,255,0.2)',
        borderRadius: 11,
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          transition: 'left 0.2s',
        }}
      />
    </div>
    <div>
      <div style={{ fontSize: 13, color: 'var(--sn-text-primary, #e2e8f0)' }}>{label}</div>
      {description && (
        <div style={{ fontSize: 11, color: 'var(--sn-text-secondary, #94a3b8)', marginTop: 2 }}>{description}</div>
      )}
    </div>
  </label>
);

const RadioGroup: React.FC<{
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {options.map((opt) => (
      <label
        key={opt.value}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          cursor: 'pointer',
          padding: '10px 12px',
          background: value === opt.value ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0,0,0,0.2)',
          borderRadius: 6,
          border: value === opt.value ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
        }}
      >
        <input
          type="radio"
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          style={{ marginTop: 2 }}
        />
        <div>
          <div style={{ fontSize: 13, color: 'var(--sn-text-primary, #e2e8f0)' }}>{opt.label}</div>
          {opt.description && (
            <div style={{ fontSize: 11, color: 'var(--sn-text-secondary, #94a3b8)', marginTop: 2 }}>
              {opt.description}
            </div>
          )}
        </div>
      </label>
    ))}
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--sn-text-secondary, #94a3b8)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--sn-text-primary, #e2e8f0)', fontFamily: 'monospace' }}>
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%',
        height: 6,
        borderRadius: 3,
        appearance: 'none',
        background: 'rgba(255,255,255,0.2)',
        cursor: 'pointer',
      }}
    />
  </div>
);

export default CanvasSettingsDialog;
