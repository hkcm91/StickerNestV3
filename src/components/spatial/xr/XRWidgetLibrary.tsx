/**
 * StickerNest - XR Widget Library
 *
 * A floating 3D widget library panel for VR/AR modes.
 * Allows users to browse and add widgets to their canvas in immersive mode.
 *
 * Features:
 * - Category tabs (All, Core, Social, Design, etc.)
 * - Scrollable widget grid
 * - Search functionality
 * - Click-to-add widgets
 * - Grabbable panel
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { getAllBuiltinManifests } from '../../../widgets/builtin';
import { useCanvasStore } from '../../../state/useCanvasStore';
import type { WidgetManifest } from '../../../types/manifest';
import type { WidgetInstance } from '../../../types/widget';

// ============================================================================
// Types
// ============================================================================

export interface XRWidgetLibraryProps {
  /** Whether the library is visible */
  visible?: boolean;
  /** Called when panel is closed */
  onClose?: () => void;
  /** Initial position */
  position?: [number, number, number];
  /** Accent color */
  accentColor?: string;
}

type WidgetCategory = 'all' | 'core' | 'social' | 'commerce' | 'design' | 'media' | 'spatial';

// ============================================================================
// Helper Functions
// ============================================================================

function getWidgetCategory(manifest: WidgetManifest): WidgetCategory {
  const id = manifest.id.toLowerCase();
  const tags = manifest.tags?.map(t => t.toLowerCase()) || [];

  if (tags.includes('social') || id.includes('social') || id.includes('chat') ||
      id.includes('feed') || id.includes('presence') || id.includes('notification')) {
    return 'social';
  }
  if (tags.includes('commerce') || id.includes('commerce') || id.includes('product') ||
      id.includes('checkout') || id.includes('storefront') || id.includes('customer')) {
    return 'commerce';
  }
  if (tags.includes('design') || id.includes('design') || id.includes('color') ||
      id.includes('shape') || id.includes('text-tool') || id.includes('typography')) {
    return 'design';
  }
  if (tags.includes('media') || id.includes('media') || id.includes('video') ||
      id.includes('webcam') || id.includes('stream') || id.includes('obs')) {
    return 'media';
  }
  if (tags.includes('spatial') || tags.includes('vr') || tags.includes('ar') ||
      id.includes('spatial') || id.includes('panoramic') || id.includes('green-screen')) {
    return 'spatial';
  }
  return 'core';
}

function getWidgetEmoji(manifest: WidgetManifest): string {
  const id = manifest.id.toLowerCase();

  // Social
  if (id.includes('chat')) return '💬';
  if (id.includes('feed')) return '📰';
  if (id.includes('notification')) return '🔔';
  if (id.includes('presence')) return '🟢';
  if (id.includes('user') || id.includes('profile')) return '👤';

  // Commerce
  if (id.includes('product')) return '🛍️';
  if (id.includes('checkout')) return '💳';
  if (id.includes('storefront')) return '🏪';
  if (id.includes('customer')) return '👥';

  // Design
  if (id.includes('color')) return '🎨';
  if (id.includes('text')) return '📝';
  if (id.includes('shape')) return '⬜';
  if (id.includes('image')) return '🖼️';

  // Media
  if (id.includes('webcam') || id.includes('camera')) return '📷';
  if (id.includes('video')) return '🎬';
  if (id.includes('stream') || id.includes('obs')) return '📺';

  // Spatial
  if (id.includes('panoramic')) return '🌐';
  if (id.includes('green-screen')) return '🟩';

  // Core
  if (id.includes('note')) return '📋';
  if (id.includes('todo') || id.includes('list')) return '✅';
  if (id.includes('timer')) return '⏱️';
  if (id.includes('clock')) return '🕐';
  if (id.includes('weather')) return '🌤️';
  if (id.includes('counter')) return '🔢';
  if (id.includes('quote')) return '💭';
  if (id.includes('bookmark')) return '🔖';
  if (id.includes('container')) return '📦';
  if (id.includes('lottie')) return '✨';

  return '📦';
}

// ============================================================================
// Category Tab Component
// ============================================================================

interface CategoryTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
  accentColor: string;
}

function CategoryTab({ label, active, onClick, accentColor }: CategoryTabProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? accentColor : 'rgba(255,255,255,0.1)',
        border: 'none',
        borderRadius: 6,
        color: active ? '#fff' : 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Widget Card Component
// ============================================================================

interface WidgetCardProps {
  manifest: WidgetManifest;
  onAdd: () => void;
  accentColor: string;
}

function WidgetCard({ manifest, onAdd, accentColor }: WidgetCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onAdd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        border: `1px solid ${hovered ? accentColor : 'transparent'}`,
      }}
    >
      <span style={{ fontSize: 24 }}>{getWidgetEmoji(manifest)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {manifest.name}
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {manifest.description || 'Widget'}
        </div>
      </div>
      <div
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered ? accentColor : 'rgba(255,255,255,0.1)',
          borderRadius: 6,
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        +
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function XRWidgetLibrary({
  visible = true,
  onClose,
  position = [0.8, 1.5, -1],
  accentColor = '#8b5cf6',
}: XRWidgetLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const addWidget = useCanvasStore((s) => s.addWidget);

  // Get all widget manifests
  const allManifests = useMemo(() => {
    return getAllBuiltinManifests().filter(m => m.id !== 'stickernest.container');
  }, []);

  // Filter manifests based on category and search
  const filteredManifests = useMemo(() => {
    return allManifests.filter(manifest => {
      // Category filter
      if (selectedCategory !== 'all') {
        const category = getWidgetCategory(manifest);
        if (category !== selectedCategory) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = manifest.name.toLowerCase().includes(query);
        const matchesDesc = manifest.description?.toLowerCase().includes(query);
        const matchesTags = manifest.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [allManifests, selectedCategory, searchQuery]);

  // Handle adding a widget
  const handleAddWidget = useCallback((manifest: WidgetManifest) => {
    const widgetInstance: WidgetInstance = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      canvasId: 'default',
      widgetDefId: manifest.id,
      version: manifest.version || '1.0.0',
      name: manifest.name,
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      },
      width: manifest.size?.width || 320,
      height: manifest.size?.height || 240,
      rotation: 0,
      zIndex: Date.now(),
      visible: true,
      locked: false,
      state: {},
      metadata: {
        source: 'builtin',
      },
    };

    addWidget(widgetInstance);
    console.log('[XRWidgetLibrary] Added widget:', manifest.name);
  }, [addWidget]);

  const categories: { key: WidgetCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'core', label: 'Core' },
    { key: 'social', label: 'Social' },
    { key: 'commerce', label: 'Commerce' },
    { key: 'design', label: 'Design' },
    { key: 'media', label: 'Media' },
    { key: 'spatial', label: 'Spatial' },
  ];

  if (!visible) return null;

  return (
    <FloatingPanel
      position={position}
      width={0.45}
      height={0.55}
      backgroundColor="rgba(15, 15, 25, 0.95)"
      accentColor={accentColor}
      billboard={false}
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <span
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Widget Library
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px' }}>
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        {/* Category Tabs */}
        <div
          style={{
            padding: '0 14px 10px',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {categories.map(({ key, label }) => (
            <CategoryTab
              key={key}
              label={label}
              active={selectedCategory === key}
              onClick={() => setSelectedCategory(key)}
              accentColor={accentColor}
            />
          ))}
        </div>

        {/* Widget List */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '0 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {filteredManifests.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
              }}
            >
              No widgets found
            </div>
          ) : (
            filteredManifests.slice(0, 20).map((manifest) => (
              <WidgetCard
                key={manifest.id}
                manifest={manifest}
                onAdd={() => handleAddWidget(manifest)}
                accentColor={accentColor}
              />
            ))
          )}
          {filteredManifests.length > 20 && (
            <div
              style={{
                padding: 10,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
              }}
            >
              +{filteredManifests.length - 20} more widgets
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
            {filteredManifests.length} widgets
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
            Tap to add
          </span>
        </div>
      </div>
    </FloatingPanel>
  );
}

export default XRWidgetLibrary;
