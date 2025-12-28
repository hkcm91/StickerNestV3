/**
 * StickerNest v2 - Device Viewport Selector
 *
 * Compact toolbar for controlling device preview dimensions.
 * Includes device preset picker, dimension inputs, orientation toggle, and frame toggle.
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useDevicePreviewStore } from '../../state/useDevicePreviewStore';
import { DEVICE_PRESETS, type DevicePreset } from '../../types/devicePreview';
import { haptic } from '../../utils/haptics';
import { useClickOutside } from '../../hooks/useClickOutside';
import { RotateCcw, Smartphone, Monitor, Maximize2, ChevronDown, Tablet, Laptop } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DeviceViewportSelectorProps {
  accentColor?: string;
  compact?: boolean;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    width: 60,
    padding: '6px 8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center' as const,
    outline: 'none',
  },
  label: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 500,
  },
  separator: {
    width: 1,
    height: 24,
    background: 'rgba(255, 255, 255, 0.15)',
    margin: '0 4px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 10px',
    minHeight: 32,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    color: '#e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropdownContainer: {
    position: 'relative' as const,
  },
  dropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    minWidth: 160,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 220,
    maxHeight: 400,
    overflowY: 'auto' as const,
    background: 'rgba(15, 15, 25, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  categoryHeader: {
    padding: '10px 12px 6px',
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  deviceOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontSize: 13,
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  deviceIcon: {
    width: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontWeight: 500,
  },
  deviceDims: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  customOption: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: 4,
    paddingTop: 4,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

const getCategoryIcon = (category: DevicePreset['category']) => {
  switch (category) {
    case 'phone': return <Smartphone size={14} />;
    case 'tablet': return <Tablet size={14} />;
    case 'desktop': return <Laptop size={14} />;
    default: return <Monitor size={14} />;
  }
};

const groupPresetsByCategory = (presets: DevicePreset[]) => {
  const groups: Record<string, DevicePreset[]> = {
    phone: [],
    tablet: [],
    desktop: [],
  };
  presets.forEach(preset => {
    if (groups[preset.category]) {
      groups[preset.category].push(preset);
    }
  });
  return groups;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const DeviceViewportSelector = memo(function DeviceViewportSelector({
  accentColor = '#8b5cf6',
  compact = false,
}: DeviceViewportSelectorProps) {
  const {
    enabled,
    showFrame,
    orientation,
    preset,
    customDimensions,
    toggleEnabled,
    toggleShowFrame,
    toggleOrientation,
    setPreset,
    setCustomDimensions,
  } = useDevicePreviewStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local state for input fields
  const [localWidth, setLocalWidth] = useState(customDimensions.width.toString());
  const [localHeight, setLocalHeight] = useState(customDimensions.height.toString());

  // Close dropdown on outside click
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false), { enabled: isDropdownOpen });

  // Sync local state when store changes
  useEffect(() => {
    const w = preset?.width ?? customDimensions.width;
    const h = preset?.height ?? customDimensions.height;
    setLocalWidth(w.toString());
    setLocalHeight(h.toString());
  }, [preset, customDimensions]);

  const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWidth(e.target.value);
  }, []);

  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalHeight(e.target.value);
  }, []);

  const applyDimensions = useCallback(() => {
    const width = Math.max(100, Math.min(4000, parseInt(localWidth) || 390));
    const height = Math.max(100, Math.min(4000, parseInt(localHeight) || 844));
    setCustomDimensions(width, height);
    setLocalWidth(width.toString());
    setLocalHeight(height.toString());
  }, [localWidth, localHeight, setCustomDimensions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyDimensions();
      (e.target as HTMLInputElement).blur();
    }
  }, [applyDimensions]);

  const handleToggleEnabled = useCallback(() => {
    haptic('light');
    toggleEnabled();
  }, [toggleEnabled]);

  const handleToggleFrame = useCallback(() => {
    haptic('light');
    toggleShowFrame();
  }, [toggleShowFrame]);

  const handleSwapDimensions = useCallback(() => {
    haptic('light');
    toggleOrientation();
  }, [toggleOrientation]);

  const handleSelectPreset = useCallback((selectedPreset: DevicePreset | null) => {
    haptic('medium');
    setPreset(selectedPreset);
    setIsDropdownOpen(false);
  }, [setPreset]);

  const handleToggleDropdown = useCallback(() => {
    haptic('light');
    setIsDropdownOpen(prev => !prev);
  }, []);

  const groupedPresets = groupPresetsByCategory(DEVICE_PRESETS);
  const currentLabel = preset?.name ?? 'Custom';
  const currentWidth = preset?.width ?? customDimensions.width;
  const currentHeight = preset?.height ?? customDimensions.height;

  const activeButtonStyle = {
    ...styles.button,
    background: `${accentColor}33`,
    borderColor: `${accentColor}66`,
  };

  return (
    <div style={styles.container}>
      {/* Device Mode Toggle */}
      <button
        onClick={handleToggleEnabled}
        style={enabled ? activeButtonStyle : styles.button}
        title={enabled ? 'Exit device preview' : 'Enter device preview'}
      >
        {enabled ? <Monitor size={14} /> : <Smartphone size={14} />}
        {!compact && <span>Device</span>}
      </button>

      {enabled && (
        <>
          <div style={styles.separator} />

          {/* Device Preset Dropdown */}
          <div style={styles.dropdownContainer} ref={dropdownRef}>
            <button
              onClick={handleToggleDropdown}
              style={styles.dropdownButton}
              title="Select device"
            >
              {preset ? getCategoryIcon(preset.category) : <Monitor size={14} />}
              <span style={{ flex: 1 }}>{currentLabel}</span>
              <ChevronDown size={14} style={{ opacity: 0.5 }} />
            </button>

            {isDropdownOpen && (
              <div style={styles.dropdown}>
                {/* Phones */}
                <div style={styles.categoryHeader}>Phones</div>
                {groupedPresets.phone.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      ...styles.deviceOption,
                      background: preset?.id === p.id ? `${accentColor}22` : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (preset?.id !== p.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = preset?.id === p.id ? `${accentColor}22` : 'transparent';
                    }}
                  >
                    <span style={styles.deviceIcon}><Smartphone size={14} /></span>
                    <div style={styles.deviceInfo}>
                      <div style={styles.deviceName}>{p.name}</div>
                      <div style={styles.deviceDims}>{p.width} × {p.height}</div>
                    </div>
                    {preset?.id === p.id && <span style={{ color: accentColor }}>✓</span>}
                  </button>
                ))}

                {/* Tablets */}
                <div style={styles.categoryHeader}>Tablets</div>
                {groupedPresets.tablet.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      ...styles.deviceOption,
                      background: preset?.id === p.id ? `${accentColor}22` : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (preset?.id !== p.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = preset?.id === p.id ? `${accentColor}22` : 'transparent';
                    }}
                  >
                    <span style={styles.deviceIcon}><Tablet size={14} /></span>
                    <div style={styles.deviceInfo}>
                      <div style={styles.deviceName}>{p.name}</div>
                      <div style={styles.deviceDims}>{p.width} × {p.height}</div>
                    </div>
                    {preset?.id === p.id && <span style={{ color: accentColor }}>✓</span>}
                  </button>
                ))}

                {/* Desktop */}
                <div style={styles.categoryHeader}>Desktop</div>
                {groupedPresets.desktop.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      ...styles.deviceOption,
                      background: preset?.id === p.id ? `${accentColor}22` : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (preset?.id !== p.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = preset?.id === p.id ? `${accentColor}22` : 'transparent';
                    }}
                  >
                    <span style={styles.deviceIcon}><Laptop size={14} /></span>
                    <div style={styles.deviceInfo}>
                      <div style={styles.deviceName}>{p.name}</div>
                      <div style={styles.deviceDims}>{p.width} × {p.height}</div>
                    </div>
                    {preset?.id === p.id && <span style={{ color: accentColor }}>✓</span>}
                  </button>
                ))}

                {/* Custom Option */}
                <div style={styles.customOption}>
                  <button
                    onClick={() => handleSelectPreset(null)}
                    style={{
                      ...styles.deviceOption,
                      background: !preset ? `${accentColor}22` : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (preset) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !preset ? `${accentColor}22` : 'transparent';
                    }}
                  >
                    <span style={styles.deviceIcon}><Monitor size={14} /></span>
                    <div style={styles.deviceInfo}>
                      <div style={styles.deviceName}>Custom</div>
                      <div style={styles.deviceDims}>Enter your own dimensions</div>
                    </div>
                    {!preset && <span style={{ color: accentColor }}>✓</span>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={styles.separator} />

          {/* Width Input */}
          <div style={styles.inputGroup}>
            <span style={styles.label}>W</span>
            <input
              type="text"
              value={localWidth}
              onChange={handleWidthChange}
              onBlur={applyDimensions}
              onKeyDown={handleKeyDown}
              style={styles.input}
              title="Width in pixels"
            />
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapDimensions}
            style={styles.iconButton}
            title="Swap width/height (rotate)"
          >
            <RotateCcw size={14} />
          </button>

          {/* Height Input */}
          <div style={styles.inputGroup}>
            <span style={styles.label}>H</span>
            <input
              type="text"
              value={localHeight}
              onChange={handleHeightChange}
              onBlur={applyDimensions}
              onKeyDown={handleKeyDown}
              style={styles.input}
              title="Height in pixels"
            />
          </div>

          <div style={styles.separator} />

          {/* Frame Toggle */}
          <button
            onClick={handleToggleFrame}
            style={showFrame ? activeButtonStyle : styles.button}
            title={showFrame ? 'Hide device frame' : 'Show device frame'}
          >
            <Maximize2 size={14} />
            {!compact && <span>Frame</span>}
          </button>
        </>
      )}
    </div>
  );
});

export default DeviceViewportSelector;
