/**
 * StickerNest v2 - Canvas Size Selector
 *
 * Allows users to select canvas size from popular presets.
 * Milanote-style dropdown with preview thumbnails.
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { haptic } from '../../utils/haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasSizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'screen' | 'custom';
  icon?: string;
}

interface CanvasSizeSelectorProps {
  currentSize: { width: number; height: number };
  onSizeChange: (width: number, height: number) => void;
  accentColor?: string;
  compact?: boolean;
}

// ============================================================================
// PRESETS
// ============================================================================

export const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  // Screen sizes
  { id: 'fullscreen', name: 'Fullscreen (Chrome)', width: 1920, height: 937, category: 'screen', icon: '🌐' },
  { id: 'hd', name: 'HD (720p)', width: 1280, height: 720, category: 'screen', icon: '🖥️' },
  { id: 'fhd', name: 'Full HD (1080p)', width: 1920, height: 1080, category: 'screen', icon: '🖥️' },
  { id: '2k', name: '2K (1440p)', width: 2560, height: 1440, category: 'screen', icon: '🖥️' },
  { id: '4k', name: '4K (2160p)', width: 3840, height: 2160, category: 'screen', icon: '🖥️' },

  // Social media
  { id: 'instagram-square', name: 'Instagram Square', width: 1080, height: 1080, category: 'social', icon: '📷' },
  { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920, category: 'social', icon: '📱' },
  { id: 'twitter', name: 'Twitter Post', width: 1200, height: 675, category: 'social', icon: '🐦' },
  { id: 'youtube-thumb', name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social', icon: '▶️' },
  { id: 'linkedin', name: 'LinkedIn Post', width: 1200, height: 627, category: 'social', icon: '💼' },

  // Print sizes
  { id: 'a4-landscape', name: 'A4 Landscape', width: 3508, height: 2480, category: 'print', icon: '📄' },
  { id: 'a4-portrait', name: 'A4 Portrait', width: 2480, height: 3508, category: 'print', icon: '📄' },
  { id: 'letter', name: 'US Letter', width: 2550, height: 3300, category: 'print', icon: '📄' },

  // Infinite/custom
  { id: 'large', name: 'Large Canvas', width: 4000, height: 3000, category: 'custom', icon: '🎨' },
  { id: 'wide', name: 'Ultra Wide', width: 5120, height: 1440, category: 'custom', icon: '🖼️' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const CanvasSizeSelector = memo(function CanvasSizeSelector({
  currentSize,
  onSizeChange,
  accentColor = '#8b5cf6',
  compact = false,
}: CanvasSizeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find current preset match
  const currentPreset = CANVAS_SIZE_PRESETS.find(
    p => p.width === currentSize.width && p.height === currentSize.height
  );

  // Close on outside click using shared hook
  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose, { enabled: isOpen });

  const handleToggle = useCallback(() => {
    haptic('light');
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((preset: CanvasSizePreset) => {
    haptic('medium');
    onSizeChange(preset.width, preset.height);
    setIsOpen(false);
  }, [onSizeChange]);

  const filteredPresets = selectedCategory === 'all'
    ? CANVAS_SIZE_PRESETS
    : CANVAS_SIZE_PRESETS.filter(p => p.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'screen', label: 'Screen' },
    { id: 'social', label: 'Social' },
    { id: 'print', label: 'Print' },
    { id: 'custom', label: 'Custom' },
  ];

  const buttonLabel = currentPreset?.name || `${currentSize.width} × ${currentSize.height}`;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: compact ? '8px 12px' : '10px 16px',
          minHeight: 44,
          background: 'rgba(15, 15, 25, 0.9)',
          border: `1px solid ${accentColor}33`,
          borderRadius: 8,
          color: '#e2e8f0',
          fontSize: compact ? 12 : 13,
          fontWeight: 500,
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span style={{ fontSize: compact ? 14 : 16 }}>📐</span>
        <span>{buttonLabel}</span>
        <span style={{
          marginLeft: 'auto',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          fontSize: 10,
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            width: 280,
            maxHeight: 400,
            background: 'rgba(15, 15, 25, 0.98)',
            border: `1px solid ${accentColor}33`,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
            zIndex: 1000,
          }}
          role="listbox"
        >
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              padding: 8,
              borderBottom: `1px solid ${accentColor}22`,
              overflowX: 'auto',
            }}
          >
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '6px 10px',
                  background: selectedCategory === cat.id ? accentColor : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: selectedCategory === cat.id ? '#fff' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Presets List */}
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
            {filteredPresets.map(preset => {
              const isSelected = currentPreset?.id === preset.id;
              const aspectRatio = preset.width / preset.height;
              const thumbWidth = 36;
              const thumbHeight = thumbWidth / aspectRatio;

              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelect(preset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 12px',
                    background: isSelected ? `${accentColor}22` : 'transparent',
                    border: isSelected ? `1px solid ${accentColor}44` : '1px solid transparent',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: 4,
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Aspect Ratio Preview */}
                  <div
                    style={{
                      width: thumbWidth,
                      height: Math.max(24, Math.min(36, thumbHeight)),
                      background: `${accentColor}33`,
                      border: `1px solid ${accentColor}55`,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {preset.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {preset.width} × {preset.height}
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <span style={{ color: accentColor, fontSize: 14 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default CanvasSizeSelector;
