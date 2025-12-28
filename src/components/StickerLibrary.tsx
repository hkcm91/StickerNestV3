/**
 * StickerNest v2 - Sticker Library Component
 * Browse, upload, and add stickers to canvas
 */

import React, { useState, useCallback, useRef } from 'react';
import type { StickerMediaType, StickerLibraryItem, StickerInstance } from '../types/domain';
import { useStickerStore } from '../state/useStickerStore';

interface StickerLibraryProps {
  canvasId: string;
  onAddSticker: (sticker: StickerInstance) => void;
  onClose?: () => void;
}

// Default sticker packs
const DEFAULT_STICKERS: StickerLibraryItem[] = [
  // Emoji stickers
  { id: 'emoji-star', name: 'Star', mediaType: 'emoji', mediaSrc: '⭐', category: 'emoji', tags: ['star', 'favorite'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-heart', name: 'Heart', mediaType: 'emoji', mediaSrc: '❤️', category: 'emoji', tags: ['heart', 'love'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-rocket', name: 'Rocket', mediaType: 'emoji', mediaSrc: '🚀', category: 'emoji', tags: ['rocket', 'launch'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-fire', name: 'Fire', mediaType: 'emoji', mediaSrc: '🔥', category: 'emoji', tags: ['fire', 'hot'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-sparkle', name: 'Sparkle', mediaType: 'emoji', mediaSrc: '✨', category: 'emoji', tags: ['sparkle', 'magic'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-music', name: 'Music', mediaType: 'emoji', mediaSrc: '🎵', category: 'emoji', tags: ['music', 'audio'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-gear', name: 'Gear', mediaType: 'emoji', mediaSrc: '⚙️', category: 'emoji', tags: ['gear', 'settings'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-folder', name: 'Folder', mediaType: 'emoji', mediaSrc: '📁', category: 'emoji', tags: ['folder', 'files'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-calendar', name: 'Calendar', mediaType: 'emoji', mediaSrc: '📅', category: 'emoji', tags: ['calendar', 'date'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-clock', name: 'Clock', mediaType: 'emoji', mediaSrc: '⏰', category: 'emoji', tags: ['clock', 'time'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-chart', name: 'Chart', mediaType: 'emoji', mediaSrc: '📊', category: 'emoji', tags: ['chart', 'data'], defaultWidth: 64, defaultHeight: 64 },
  { id: 'emoji-globe', name: 'Globe', mediaType: 'emoji', mediaSrc: '🌐', category: 'emoji', tags: ['globe', 'web'], defaultWidth: 64, defaultHeight: 64 },
  // UI Icons
  { id: 'icon-play', name: 'Play', mediaType: 'emoji', mediaSrc: '▶️', category: 'controls', tags: ['play', 'start'], defaultWidth: 48, defaultHeight: 48 },
  { id: 'icon-pause', name: 'Pause', mediaType: 'emoji', mediaSrc: '⏸️', category: 'controls', tags: ['pause', 'stop'], defaultWidth: 48, defaultHeight: 48 },
  { id: 'icon-next', name: 'Next', mediaType: 'emoji', mediaSrc: '⏭️', category: 'controls', tags: ['next', 'forward'], defaultWidth: 48, defaultHeight: 48 },
  { id: 'icon-prev', name: 'Previous', mediaType: 'emoji', mediaSrc: '⏮️', category: 'controls', tags: ['prev', 'back'], defaultWidth: 48, defaultHeight: 48 },
];

const CATEGORIES = ['all', 'emoji', 'controls', 'uploaded'];

export const StickerLibrary: React.FC<StickerLibraryProps> = ({
  canvasId,
  onAddSticker,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [uploadedStickers, setUploadedStickers] = useState<StickerLibraryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stickerLibrary = useStickerStore(state => state.stickerLibrary);
  const addToLibrary = useStickerStore(state => state.addToLibrary);

  // Combine default and user stickers
  const allStickers = [...DEFAULT_STICKERS, ...stickerLibrary, ...uploadedStickers];

  // Filter stickers
  const filteredStickers = allStickers.filter((sticker) => {
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

  // Handle adding sticker to canvas
  const handleAddSticker = useCallback(
    (item: StickerLibraryItem) => {
      const sticker: StickerInstance = {
        id: crypto.randomUUID(),
        canvasId,
        name: item.name,
        mediaType: item.mediaType,
        mediaSrc: item.mediaSrc,
        position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
        width: item.defaultWidth,
        height: item.defaultHeight,
        rotation: 0,
        zIndex: 100,
        clickBehavior: item.defaultBehavior || 'none',
        hoverAnimation: 'scale',
        clickAnimation: 'pulse',
      };
      onAddSticker(sticker);
    },
    [canvasId, onAddSticker]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isLottie = file.name.endsWith('.json');

        if (!isImage && !isLottie) {
          alert('Please upload an image (PNG, JPG, GIF, SVG) or Lottie JSON file');
          continue;
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (event) => {
          const mediaSrc = event.target?.result as string;
          const mediaType: StickerMediaType = isLottie
            ? 'lottie'
            : file.type === 'image/gif'
            ? 'gif'
            : 'image';

          // Create library item
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

          // Add to local state and persist to store
          setUploadedStickers((prev) => [...prev, item]);
          addToLibrary(item);
        };

        reader.readAsDataURL(file);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addToLibrary]
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Sticker Library</h3>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search stickers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Categories */}
      <div style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              ...styles.categoryBtn,
              ...(activeCategory === cat ? styles.categoryBtnActive : {}),
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Upload button */}
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
          📤 Upload Image/Lottie
        </button>
      </div>

      {/* Sticker grid */}
      <div style={styles.grid}>
        {filteredStickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => handleAddSticker(sticker)}
            style={styles.stickerCard}
            title={sticker.name}
          >
            <div style={styles.stickerPreview}>
              {sticker.mediaType === 'emoji' || sticker.mediaType === 'icon' ? (
                <span style={styles.emojiPreview}>{sticker.mediaSrc}</span>
              ) : sticker.mediaType === 'lottie' ? (
                <div style={styles.lottiePreview}>Lottie</div>
              ) : (
                <img
                  src={sticker.mediaSrc}
                  alt={sticker.name}
                  style={styles.imagePreview}
                />
              )}
            </div>
            <span style={styles.stickerName}>{sticker.name}</span>
          </button>
        ))}

        {filteredStickers.length === 0 && (
          <div style={styles.emptyState}>
            {searchQuery ? 'No stickers found' : 'No stickers in this category'}
          </div>
        )}
      </div>

      {/* Tip */}
      <div style={styles.tip}>
        💡 Click a sticker to add it to your canvas. Configure it in edit mode to
        link widgets!
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1a1a2e',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
  },
  searchContainer: {
    padding: '12px 16px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  categories: {
    display: 'flex',
    gap: 8,
    padding: '0 16px 12px',
    overflowX: 'auto',
  },
  categoryBtn: {
    padding: '6px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  categoryBtnActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    color: '#e2e8f0',
  },
  uploadSection: {
    padding: '0 16px 12px',
  },
  uploadBtn: {
    width: '100%',
    padding: '10px 16px',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px dashed rgba(139, 92, 246, 0.4)',
    borderRadius: 8,
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: 12,
    padding: 16,
    overflowY: 'auto',
    alignContent: 'start',
  },
  stickerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  stickerPreview: {
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emojiPreview: {
    fontSize: 36,
    lineHeight: 1,
  },
  imagePreview: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  lottiePreview: {
    width: 48,
    height: 48,
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: '#8b5cf6',
  },
  stickerName: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    padding: 24,
  },
  tip: {
    padding: '12px 16px',
    fontSize: 11,
    color: '#64748b',
    background: 'rgba(0, 0, 0, 0.2)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
};

export default StickerLibrary;
