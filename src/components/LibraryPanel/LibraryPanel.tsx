/**
 * StickerNest v2 - Library Panel
 *
 * Main library panel composition that brings together all library components.
 * Features:
 * - Slide-out container with animations
 * - Tab navigation (Widgets, Stickers, Upload)
 * - Quick access section (favorites & recents)
 * - Widget grid with search and filters
 * - Sticker browser (placeholder for future)
 * - Upload area (placeholder for future)
 */

import React, { useCallback, useMemo } from 'react';
import { LibrarySlideoutContainer } from './LibrarySlideoutContainer';
import { LibraryTabBar } from './LibraryTabBar';
import { LibraryQuickAccess } from './LibraryQuickAccess';
import { LibraryWidgetGrid } from './LibraryWidgetGrid';
import { LibraryStickerGrid } from './LibraryStickerGrid';
import { LibraryPipelinesTab } from './LibraryPipelinesTab';
import { useLibraryStore } from '../../state/useLibraryStore';
import type { WidgetManifest } from '../../types/manifest';
import type { StickerInstance } from '../../types/domain';
import { Upload } from 'lucide-react';

// ============================================
// Types
// ============================================

interface LibraryPanelProps {
  /** Widget manifests map */
  widgetManifests: Map<string, WidgetManifest>;
  /** Handler when widget is added to canvas */
  onAddWidget?: (widgetId: string) => void;
  /** Handler when multiple widgets are added at once (for pipelines) */
  onAddMultipleWidgets?: (widgetIds: string[]) => void;
  /** Handler when widget details are requested */
  onShowWidgetDetails?: (widgetId: string) => void;
  /** Handler when sticker is added to canvas */
  onAddSticker?: (sticker: StickerInstance) => void;
  /** Current canvas ID */
  canvasId?: string;
  /** Panel position */
  position?: 'left' | 'right';
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },

  tabContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
  },

  placeholderIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },

  placeholderTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },

  placeholderText: {
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 280,
  },
};

// ============================================
// Placeholder Components
// ============================================

const UploadPlaceholder: React.FC = () => (
  <div style={styles.placeholder}>
    <Upload size={48} style={styles.placeholderIcon} />
    <div style={styles.placeholderTitle}>Upload Assets</div>
    <div style={styles.placeholderText}>
      Drag and drop images, widgets, or sticker packs here to add them to your library.
    </div>
  </div>
);

// ============================================
// Component
// ============================================

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  widgetManifests,
  onAddWidget,
  onAddMultipleWidgets,
  onShowWidgetDetails,
  onAddSticker,
  canvasId = 'sandbox',
  position = 'left',
}) => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const trackItemAccess = useLibraryStore((s) => s.trackItemAccess);

  // Create widget manifests map for quick access
  const widgetManifestsForQuickAccess = useMemo(() => {
    const map = new Map<string, { name: string; iconEmoji?: string }>();
    widgetManifests.forEach((manifest, id) => {
      // Try to determine emoji from tags or use default
      const emoji = manifest.tags?.includes('ai') ? '🤖' :
                    manifest.tags?.includes('media') ? '🎬' :
                    manifest.tags?.includes('game') ? '🎮' :
                    manifest.tags?.includes('canvas') ? '🎨' :
                    '🧩';
      map.set(id, {
        name: manifest.name,
        iconEmoji: emoji,
      });
    });
    return map;
  }, [widgetManifests]);

  // Create sticker info map for quick access (basic emoji stickers)
  const stickerInfoForQuickAccess = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string }>();
    // Common emoji stickers that users might favorite
    const defaultStickers = [
      { id: 'emoji-star', name: 'Star', emoji: '⭐' },
      { id: 'emoji-heart', name: 'Heart', emoji: '❤️' },
      { id: 'emoji-rocket', name: 'Rocket', emoji: '🚀' },
      { id: 'emoji-fire', name: 'Fire', emoji: '🔥' },
      { id: 'emoji-sparkle', name: 'Sparkle', emoji: '✨' },
      { id: 'emoji-lightning', name: 'Lightning', emoji: '⚡' },
      { id: 'emoji-music', name: 'Music', emoji: '🎵' },
      { id: 'emoji-video', name: 'Video', emoji: '🎬' },
      { id: 'emoji-camera', name: 'Camera', emoji: '📷' },
      { id: 'emoji-palette', name: 'Palette', emoji: '🎨' },
      { id: 'emoji-gear', name: 'Gear', emoji: '⚙️' },
      { id: 'emoji-folder', name: 'Folder', emoji: '📁' },
      { id: 'emoji-calendar', name: 'Calendar', emoji: '📅' },
      { id: 'emoji-clock', name: 'Clock', emoji: '⏰' },
      { id: 'emoji-chart', name: 'Chart', emoji: '📊' },
      { id: 'emoji-globe', name: 'Globe', emoji: '🌐' },
      { id: 'emoji-robot', name: 'Robot', emoji: '🤖' },
      { id: 'emoji-brain', name: 'Brain', emoji: '🧠' },
      { id: 'icon-play', name: 'Play', emoji: '▶️' },
      { id: 'icon-pause', name: 'Pause', emoji: '⏸️' },
      { id: 'emoji-gamepad', name: 'Gamepad', emoji: '🎮' },
      { id: 'emoji-trophy', name: 'Trophy', emoji: '🏆' },
    ];
    defaultStickers.forEach(s => map.set(s.id, { name: s.name, emoji: s.emoji }));
    return map;
  }, []);

  // Handle quick access item click
  const handleQuickAccessClick = useCallback(
    (id: string, type: 'widget' | 'sticker' | 'kit') => {
      if (type === 'widget') {
        onAddWidget?.(id);
      }
    },
    [onAddWidget]
  );

  // Handle quick access item add
  const handleQuickAccessAdd = useCallback(
    (id: string, type: 'widget' | 'sticker' | 'kit') => {
      trackItemAccess(id, type);
      if (type === 'widget') {
        onAddWidget?.(id);
      }
    },
    [trackItemAccess, onAddWidget]
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'widgets':
        return (
          <LibraryWidgetGrid
            widgets={widgetManifests}
            onAddWidget={onAddWidget}
            onShowDetails={onShowWidgetDetails}
          />
        );

      case 'stickers':
        return (
          <LibraryStickerGrid
            canvasId={canvasId}
            onAddSticker={onAddSticker}
          />
        );

      case 'pipelines':
        return (
          <LibraryPipelinesTab
            widgetManifests={widgetManifests}
            onAddWidget={onAddWidget}
            onAddMultipleWidgets={onAddMultipleWidgets}
          />
        );

      case 'upload':
        return <UploadPlaceholder />;

      default:
        return null;
    }
  };

  return (
    <LibrarySlideoutContainer position={position}>
      <div style={styles.container}>
        {/* Tab Bar */}
        <LibraryTabBar />

        {/* Quick Access - show on widgets, stickers, and pipelines tabs */}
        {(activeTab === 'widgets' || activeTab === 'stickers' || activeTab === 'pipelines') && (
          <LibraryQuickAccess
            widgetManifests={widgetManifestsForQuickAccess}
            stickerInfo={stickerInfoForQuickAccess}
            onItemClick={handleQuickAccessClick}
            onItemAdd={handleQuickAccessAdd}
          />
        )}

        {/* Tab Content */}
        <div style={styles.tabContent}>{renderTabContent()}</div>
      </div>
    </LibrarySlideoutContainer>
  );
};

export default LibraryPanel;
