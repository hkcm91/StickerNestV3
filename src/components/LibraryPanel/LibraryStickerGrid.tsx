/**
 * StickerNest v2 - Library Sticker Grid
 *
 * Displays stickers in the library panel with:
 * - Grid/list view modes
 * - Category filtering (emoji, controls, lottie, uploaded)
 * - Search functionality
 * - Drag-to-canvas support
 * - Upload capability
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Upload,
  Grid,
  List,
  Play,
  Star,
  Sparkles,
  Image as ImageIcon,
  Film,
  Smile,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
} from 'lucide-react';
import { useStickerStore } from '../../state/useStickerStore';
import { useLibraryStore } from '../../state/useLibraryStore';
import { LottiePlayer } from '../LottiePlayer';
import type { StickerMediaType, StickerLibraryItem, StickerInstance } from '../../types/domain';
import type { LibraryViewMode } from '../../types/library';

// ============================================
// Types
// ============================================

interface LibraryStickerGridProps {
  /** Canvas ID for creating stickers */
  canvasId?: string;
  /** Handler when sticker is added to canvas */
  onAddSticker?: (sticker: StickerInstance) => void;
}

interface StickerPack {
  id: string;
  name: string;
  stickers: StickerLibraryItem[];
}

// ============================================
// Default Sticker Packs
// ============================================

const DEFAULT_STICKERS: StickerLibraryItem[] = [
  // Emoji - Essentials
  { id: 'emoji-star', name: 'Star', mediaType: 'emoji', mediaSrc: '⭐', category: 'emoji', tags: ['star', 'favorite', 'rating'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-heart', name: 'Heart', mediaType: 'emoji', mediaSrc: '❤️', category: 'emoji', tags: ['heart', 'love', 'like'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-rocket', name: 'Rocket', mediaType: 'emoji', mediaSrc: '🚀', category: 'emoji', tags: ['rocket', 'launch', 'fast'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-fire', name: 'Fire', mediaType: 'emoji', mediaSrc: '🔥', category: 'emoji', tags: ['fire', 'hot', 'trending'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-sparkle', name: 'Sparkle', mediaType: 'emoji', mediaSrc: '✨', category: 'emoji', tags: ['sparkle', 'magic', 'new'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-lightning', name: 'Lightning', mediaType: 'emoji', mediaSrc: '⚡', category: 'emoji', tags: ['lightning', 'fast', 'power'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },

  // Emoji - Media & Tools
  { id: 'emoji-music', name: 'Music', mediaType: 'emoji', mediaSrc: '🎵', category: 'emoji', tags: ['music', 'audio', 'sound'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-video', name: 'Video', mediaType: 'emoji', mediaSrc: '🎬', category: 'emoji', tags: ['video', 'film', 'movie'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-camera', name: 'Camera', mediaType: 'emoji', mediaSrc: '📷', category: 'emoji', tags: ['camera', 'photo', 'image'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-palette', name: 'Palette', mediaType: 'emoji', mediaSrc: '🎨', category: 'emoji', tags: ['palette', 'art', 'design', 'color'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-gear', name: 'Gear', mediaType: 'emoji', mediaSrc: '⚙️', category: 'emoji', tags: ['gear', 'settings', 'config'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-wrench', name: 'Wrench', mediaType: 'emoji', mediaSrc: '🔧', category: 'emoji', tags: ['wrench', 'tool', 'fix'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },

  // Emoji - Data & Organization
  { id: 'emoji-folder', name: 'Folder', mediaType: 'emoji', mediaSrc: '📁', category: 'emoji', tags: ['folder', 'files', 'organize'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-calendar', name: 'Calendar', mediaType: 'emoji', mediaSrc: '📅', category: 'emoji', tags: ['calendar', 'date', 'schedule'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-clock', name: 'Clock', mediaType: 'emoji', mediaSrc: '⏰', category: 'emoji', tags: ['clock', 'time', 'timer'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-chart', name: 'Chart', mediaType: 'emoji', mediaSrc: '📊', category: 'emoji', tags: ['chart', 'data', 'analytics'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-globe', name: 'Globe', mediaType: 'emoji', mediaSrc: '🌐', category: 'emoji', tags: ['globe', 'web', 'world'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-link', name: 'Link', mediaType: 'emoji', mediaSrc: '🔗', category: 'emoji', tags: ['link', 'url', 'connect'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'open-url' },

  // Emoji - Communication
  { id: 'emoji-chat', name: 'Chat', mediaType: 'emoji', mediaSrc: '💬', category: 'emoji', tags: ['chat', 'message', 'talk'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-bell', name: 'Bell', mediaType: 'emoji', mediaSrc: '🔔', category: 'emoji', tags: ['bell', 'notification', 'alert'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-mail', name: 'Mail', mediaType: 'emoji', mediaSrc: '📧', category: 'emoji', tags: ['mail', 'email', 'message'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },

  // Emoji - AI & Tech
  { id: 'emoji-robot', name: 'Robot', mediaType: 'emoji', mediaSrc: '🤖', category: 'emoji', tags: ['robot', 'ai', 'bot', 'automation'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-brain', name: 'Brain', mediaType: 'emoji', mediaSrc: '🧠', category: 'emoji', tags: ['brain', 'ai', 'smart', 'think'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-crystal', name: 'Crystal Ball', mediaType: 'emoji', mediaSrc: '🔮', category: 'emoji', tags: ['crystal', 'predict', 'ai', 'magic'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },

  // UI Controls
  { id: 'icon-play', name: 'Play', mediaType: 'icon', mediaSrc: '▶️', category: 'controls', tags: ['play', 'start', 'media'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-pause', name: 'Pause', mediaType: 'icon', mediaSrc: '⏸️', category: 'controls', tags: ['pause', 'stop', 'media'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-stop', name: 'Stop', mediaType: 'icon', mediaSrc: '⏹️', category: 'controls', tags: ['stop', 'end', 'media'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-next', name: 'Next', mediaType: 'icon', mediaSrc: '⏭️', category: 'controls', tags: ['next', 'forward', 'skip'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-prev', name: 'Previous', mediaType: 'icon', mediaSrc: '⏮️', category: 'controls', tags: ['prev', 'back', 'rewind'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-record', name: 'Record', mediaType: 'icon', mediaSrc: '⏺️', category: 'controls', tags: ['record', 'capture'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-shuffle', name: 'Shuffle', mediaType: 'icon', mediaSrc: '🔀', category: 'controls', tags: ['shuffle', 'random'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-repeat', name: 'Repeat', mediaType: 'icon', mediaSrc: '🔁', category: 'controls', tags: ['repeat', 'loop'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },

  // Action Buttons
  { id: 'icon-plus', name: 'Add', mediaType: 'icon', mediaSrc: '➕', category: 'controls', tags: ['add', 'plus', 'new', 'create'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'launch-widget' },
  { id: 'icon-minus', name: 'Remove', mediaType: 'icon', mediaSrc: '➖', category: 'controls', tags: ['remove', 'minus', 'delete'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-check', name: 'Check', mediaType: 'icon', mediaSrc: '✅', category: 'controls', tags: ['check', 'done', 'complete', 'yes'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },
  { id: 'icon-cross', name: 'Cross', mediaType: 'icon', mediaSrc: '❌', category: 'controls', tags: ['cross', 'cancel', 'no', 'close'], defaultWidth: 48, defaultHeight: 48, defaultBehavior: 'emit-event' },

  // Gaming
  { id: 'emoji-gamepad', name: 'Gamepad', mediaType: 'emoji', mediaSrc: '🎮', category: 'gaming', tags: ['game', 'play', 'controller'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-dice', name: 'Dice', mediaType: 'emoji', mediaSrc: '🎲', category: 'gaming', tags: ['dice', 'random', 'game'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'emit-event' },
  { id: 'emoji-trophy', name: 'Trophy', mediaType: 'emoji', mediaSrc: '🏆', category: 'gaming', tags: ['trophy', 'win', 'achievement'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },
  { id: 'emoji-target', name: 'Target', mediaType: 'emoji', mediaSrc: '🎯', category: 'gaming', tags: ['target', 'goal', 'aim'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'toggle-widget' },

  // Nature & Weather
  { id: 'emoji-sun', name: 'Sun', mediaType: 'emoji', mediaSrc: '☀️', category: 'decorative', tags: ['sun', 'weather', 'day', 'light'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'none' },
  { id: 'emoji-moon', name: 'Moon', mediaType: 'emoji', mediaSrc: '🌙', category: 'decorative', tags: ['moon', 'night', 'dark'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'none' },
  { id: 'emoji-cloud', name: 'Cloud', mediaType: 'emoji', mediaSrc: '☁️', category: 'decorative', tags: ['cloud', 'weather', 'sky'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'none' },
  { id: 'emoji-rainbow', name: 'Rainbow', mediaType: 'emoji', mediaSrc: '🌈', category: 'decorative', tags: ['rainbow', 'color', 'weather'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'none' },
  { id: 'emoji-plant', name: 'Plant', mediaType: 'emoji', mediaSrc: '🌱', category: 'decorative', tags: ['plant', 'grow', 'nature'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'none' },
  { id: 'emoji-tree', name: 'Tree', mediaType: 'emoji', mediaSrc: '🌳', category: 'decorative', tags: ['tree', 'nature', 'forest'], defaultWidth: 64, defaultHeight: 64, defaultBehavior: 'none' },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Grid },
  { id: 'emoji', name: 'Emoji', icon: Smile },
  { id: 'controls', name: 'Controls', icon: Play },
  { id: 'gaming', name: 'Gaming', icon: Sparkles },
  { id: 'decorative', name: 'Decorative', icon: Star },
  { id: 'uploaded', name: 'Uploaded', icon: Upload },
];

// Widget associations - stickers that come pre-linked to widgets
const WIDGET_ASSOCIATIONS: Record<string, { widgetId: string; spawnPosition?: string }> = {
  'emoji-music': { widgetId: 'spotify-playlist-widget', spawnPosition: 'right' },
  'emoji-video': { widgetId: 'youtube-playlist-widget', spawnPosition: 'right' },
  'emoji-camera': { widgetId: 'photobooth-widget', spawnPosition: 'right' },
  'emoji-palette': { widgetId: 'gradient-maker', spawnPosition: 'right' },
  'emoji-chart': { widgetId: 'dashboard-analytics', spawnPosition: 'right' },
  'emoji-calendar': { widgetId: 'time-tracker', spawnPosition: 'right' },
  'emoji-clock': { widgetId: 'time-tracker', spawnPosition: 'right' },
  'emoji-folder': { widgetId: 'folder-widget', spawnPosition: 'right' },
  'emoji-chat': { widgetId: 'chat-room', spawnPosition: 'right' },
  'emoji-bell': { widgetId: 'notification-center', spawnPosition: 'right' },
  'emoji-gamepad': { widgetId: 'game-character', spawnPosition: 'right' },
  'emoji-robot': { widgetId: 'ai-widget-generator', spawnPosition: 'right' },
  'emoji-brain': { widgetId: 'prompt-options-widget', spawnPosition: 'right' },
  'emoji-globe': { widgetId: 'chat-room', spawnPosition: 'right' },
  'emoji-gear': { widgetId: 'api-settings-widget', spawnPosition: 'right' },
  'emoji-trophy': { widgetId: 'farm-stats', spawnPosition: 'right' },
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },

  searchContainer: {
    flex: 1,
    position: 'relative',
  },

  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 36px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    transition: 'all 150ms ease',
  },

  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
  },

  categories: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    overflowX: 'auto',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },

  categoryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms ease',
  },

  categoryBtnActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    color: '#e2e8f0',
  },

  uploadSection: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },

  uploadBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px dashed rgba(139, 92, 246, 0.4)',
    borderRadius: 8,
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: 12,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
    gap: 8,
  },

  stickerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    position: 'relative',
  },

  stickerCardHover: {
    background: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    transform: 'scale(1.05)',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
  },

  addOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(139, 92, 246, 0.85)',
    borderRadius: 12,
    opacity: 0,
    transition: 'opacity 150ms ease',
  },

  addOverlayVisible: {
    opacity: 1,
  },

  addIcon: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },

  stickerPreview: {
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    fontSize: 36,
    lineHeight: 1,
  },

  stickerName: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },

  typeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: '2px 4px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  imagePreview: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },

  lottiePreview: {
    width: 48,
    height: 48,
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: '#a78bfa',
    fontWeight: 500,
  },

  emptyState: {
    padding: 32,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
  },

  emptyIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 4,
  },

  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  tip: {
    padding: '10px 12px',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    background: 'rgba(0, 0, 0, 0.2)',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};

// ============================================
// Component
// ============================================

export const LibraryStickerGrid: React.FC<LibraryStickerGridProps> = ({
  canvasId = 'sandbox',
  onAddSticker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store hooks
  const stickerLibrary = useStickerStore((s) => s.stickerLibrary);
  const addToLibrary = useStickerStore((s) => s.addToLibrary);
  const trackItemAccess = useLibraryStore((s) => s.trackItemAccess);
  const pinItem = useLibraryStore((s) => s.pinItem);
  const pinnedItems = useLibraryStore((s) => s.pinnedItems);

  // Combine default and user stickers
  const allStickers = useMemo(() => {
    return [...DEFAULT_STICKERS, ...stickerLibrary];
  }, [stickerLibrary]);

  // Filter stickers
  const filteredStickers = useMemo(() => {
    return allStickers.filter((sticker) => {
      const matchesCategory =
        activeCategory === 'all' ||
        sticker.category === activeCategory ||
        (activeCategory === 'uploaded' && sticker.isUserUploaded);

      const matchesSearch =
        !searchQuery ||
        sticker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sticker.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [allStickers, activeCategory, searchQuery]);

  // Check if sticker is favorited
  const isStickerFavorite = useCallback(
    (stickerId: string) => pinnedItems.some((item) => item.id === stickerId && item.type === 'sticker'),
    [pinnedItems]
  );

  // Handle adding sticker to canvas - centers sticker in canvas
  const handleAddSticker = useCallback(
    (item: StickerLibraryItem) => {
      // Check for pre-configured widget association
      const association = WIDGET_ASSOCIATIONS[item.id];

      // Center the sticker on the canvas (assuming 1920x1080 default canvas)
      // Offset from exact center so multiple additions don't overlap
      const centerX = 960 - item.defaultWidth / 2;
      const centerY = 540 - item.defaultHeight / 2;
      // Add small random offset to prevent perfect overlap when adding multiple stickers
      const offsetX = (Math.random() - 0.5) * 100;
      const offsetY = (Math.random() - 0.5) * 100;

      const sticker: StickerInstance = {
        id: crypto.randomUUID(),
        canvasId,
        name: item.name,
        mediaType: item.mediaType,
        mediaSrc: item.mediaSrc,
        position: { x: centerX + offsetX, y: centerY + offsetY },
        width: item.defaultWidth,
        height: item.defaultHeight,
        rotation: 0,
        zIndex: 100,
        clickBehavior: item.defaultBehavior || 'toggle-widget',
        hoverAnimation: 'scale',
        clickAnimation: 'pulse',
        // Apply widget association if available
        ...(association && {
          linkedWidgetDefId: association.widgetId,
          widgetSpawnPosition: (association.spawnPosition as 'right' | 'left' | 'above' | 'below' | 'overlay' | 'center') || 'right',
        }),
      };

      // Track access for recents
      trackItemAccess(item.id, 'sticker');

      onAddSticker?.(sticker);
    },
    [canvasId, onAddSticker, trackItemAccess]
  );

  // Handle drag start for sticker items
  const handleDragStart = useCallback(
    (e: React.DragEvent, item: StickerLibraryItem) => {
      // Check for pre-configured widget association
      const association = WIDGET_ASSOCIATIONS[item.id];

      // Set data transfer for canvas drop handling
      e.dataTransfer.setData('text/sticker-library-id', item.id);
      e.dataTransfer.setData('text/sticker-name', item.name);
      e.dataTransfer.setData('text/sticker-media-type', item.mediaType);
      e.dataTransfer.setData('text/sticker-media-src', item.mediaSrc);
      e.dataTransfer.setData('text/sticker-width', String(item.defaultWidth));
      e.dataTransfer.setData('text/sticker-height', String(item.defaultHeight));
      e.dataTransfer.setData('text/sticker-behavior', item.defaultBehavior || 'toggle-widget');

      // Include widget association if available
      if (association) {
        e.dataTransfer.setData('text/sticker-linked-widget', association.widgetId);
        e.dataTransfer.setData('text/sticker-spawn-position', association.spawnPosition || 'right');
      }

      e.dataTransfer.effectAllowed = 'copy';

      // Create a drag image (optional - uses emoji as visual)
      if (item.mediaType === 'emoji' || item.mediaType === 'icon') {
        const dragEl = document.createElement('div');
        dragEl.textContent = item.mediaSrc;
        dragEl.style.cssText = 'position: absolute; top: -1000px; font-size: 48px;';
        document.body.appendChild(dragEl);
        e.dataTransfer.setDragImage(dragEl, 24, 24);
        setTimeout(() => document.body.removeChild(dragEl), 0);
      }
    },
    []
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isLottie = file.name.endsWith('.json');

        if (!isImage && !isLottie) {
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const mediaSrc = event.target?.result as string;
          const mediaType: StickerMediaType = isLottie
            ? 'lottie'
            : file.type === 'image/gif'
            ? 'gif'
            : 'image';

          const item: StickerLibraryItem = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            mediaType,
            mediaSrc,
            category: 'uploaded',
            tags: ['uploaded', 'custom'],
            defaultWidth: 100,
            defaultHeight: 100,
            isUserUploaded: true,
            createdAt: new Date().toISOString(),
          };

          addToLibrary(item);
        };

        reader.readAsDataURL(file);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addToLibrary]
  );

  // Render sticker preview based on type
  const renderStickerPreview = (sticker: StickerLibraryItem, isHovered: boolean) => {
    switch (sticker.mediaType) {
      case 'emoji':
      case 'icon':
        return <span>{sticker.mediaSrc}</span>;
      case 'lottie':
        return (
          <div style={{ width: 48, height: 48, position: 'relative' }}>
            <LottiePlayer
              src={sticker.mediaSrc}
              loop={true}
              autoplay={false}
              playOnHover={true}
              style={{ width: '100%', height: '100%' }}
            />
            <span style={styles.typeBadge as React.CSSProperties}>
              <Sparkles size={8} />
            </span>
          </div>
        );
      case 'gif':
        return (
          <>
            <img src={sticker.mediaSrc} alt={sticker.name} style={styles.imagePreview as React.CSSProperties} />
            <span style={styles.typeBadge as React.CSSProperties}>GIF</span>
          </>
        );
      case 'image':
        return <img src={sticker.mediaSrc} alt={sticker.name} style={styles.imagePreview as React.CSSProperties} />;
      default:
        return <ImageIcon size={24} />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Search */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer as React.CSSProperties}>
          <Search size={14} style={styles.searchIcon as React.CSSProperties} />
          <input
            type="text"
            placeholder="Search stickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Categories */}
      <div style={styles.categories}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                ...styles.categoryBtn,
                ...(activeCategory === cat.id ? styles.categoryBtnActive : {}),
              }}
            >
              <Icon size={12} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Upload */}
      <div style={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.json"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.uploadBtn}
        >
          <Upload size={14} />
          Upload Image or Lottie
        </button>
      </div>

      {/* Sticker Grid */}
      <div style={styles.content}>
        {filteredStickers.length === 0 ? (
          <div style={styles.emptyState as React.CSSProperties}>
            <Search size={32} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>No stickers found</div>
            <div style={styles.emptyText}>
              {searchQuery ? 'Try a different search term' : 'Upload some stickers to get started'}
            </div>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => handleAddSticker(sticker)}
                onMouseEnter={() => setHoveredId(sticker.id)}
                onMouseLeave={() => setHoveredId(null)}
                draggable
                onDragStart={(e) => handleDragStart(e, sticker)}
                style={{
                  ...styles.stickerCard,
                  ...(hoveredId === sticker.id ? styles.stickerCardHover : {}),
                }}
                title={`${sticker.name}\nClick to add or drag to canvas`}
              >
                <div style={styles.stickerPreview as React.CSSProperties}>
                  {renderStickerPreview(sticker, hoveredId === sticker.id)}
                </div>
                <span style={styles.stickerName as React.CSSProperties}>{sticker.name}</span>
                {isStickerFavorite(sticker.id) && (
                  <Star
                    size={10}
                    fill="#fbbf24"
                    color="#fbbf24"
                    style={{ position: 'absolute', top: 4, left: 4 }}
                  />
                )}
                {/* Add overlay on hover */}
                <div
                  style={{
                    ...styles.addOverlay as React.CSSProperties,
                    ...(hoveredId === sticker.id ? styles.addOverlayVisible : {}),
                  }}
                >
                  <div style={styles.addIcon as React.CSSProperties}>
                    <Plus size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      <div style={styles.tip}>
        <Sparkles size={12} />
        Click sticker to add to canvas center, or drag to place anywhere!
      </div>
    </div>
  );
};

export default LibraryStickerGrid;
