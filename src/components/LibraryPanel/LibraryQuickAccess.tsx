/**
 * StickerNest v2 - Library Quick Access
 *
 * Quick access section showing favorites and recently used widgets.
 * Features:
 * - Horizontal scrollable rows
 * - Favorites (pinned items)
 * - Recently used (auto-tracked)
 * - Collapsible sections
 * - Edit mode for favorites
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Star,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useLibraryStore } from '../../state/useLibraryStore';
import type { QuickAccessItem } from '../../types/library';

// ============================================
// Types
// ============================================

interface LibraryQuickAccessProps {
  /** Widget manifests for displaying names/icons */
  widgetManifests?: Map<string, { name: string; iconEmoji?: string }>;
  /** Sticker info for displaying names/emojis */
  stickerInfo?: Map<string, { name: string; emoji: string }>;
  /** Handler for clicking an item */
  onItemClick?: (id: string, type: 'widget' | 'sticker' | 'kit') => void;
  /** Handler for adding an item to canvas */
  onItemAdd?: (id: string, type: 'widget' | 'sticker' | 'kit') => void;
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px 0',
    borderBottom: '1px solid var(--sn-border-secondary)',
  },

  section: {
    marginBottom: 8,
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    userSelect: 'none',
  },

  sectionIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    color: 'var(--sn-text-secondary)',
  },

  sectionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--sn-text-secondary)',
  },

  sectionAction: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 4,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    color: 'var(--sn-text-muted)',
    transition: 'var(--sn-transition-fast)',
  },

  chevron: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--sn-text-muted)',
  },

  scrollContainer: {
    position: 'relative',
    overflow: 'hidden',
  },

  scrollContent: {
    display: 'flex',
    gap: 8,
    padding: '4px 12px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  scrollButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-primary)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'var(--sn-text-secondary)',
    zIndex: 10,
    transition: 'var(--sn-transition-fast)',
  },

  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    minWidth: 64,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
    position: 'relative',
  },

  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    background: 'var(--sn-accent-bg, rgba(139, 92, 246, 0.15))',
    transition: 'var(--sn-transition-fast)',
  },

  itemName: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 60,
  },

  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-error)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#fff',
    opacity: 0,
    transform: 'scale(0.8)',
    transition: 'var(--sn-transition-fast)',
  },

  emptyState: {
    padding: '12px',
    textAlign: 'center',
    color: 'var(--sn-text-muted)',
    fontSize: 11,
  },
};

// ============================================
// Quick Access Item Component
// ============================================

interface QuickAccessItemCardProps {
  item: QuickAccessItem;
  name: string;
  emoji: string;
  isEditMode: boolean;
  onClick: () => void;
  onRemove: () => void;
}

const QuickAccessItemCard: React.FC<QuickAccessItemCardProps> = ({
  item,
  name,
  emoji,
  isEditMode,
  onClick,
  onRemove,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.item,
        background: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      }}
      onClick={isEditMode ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={name}
    >
      <div
        style={{
          ...styles.itemIcon,
          transform: isHovered && !isEditMode ? 'scale(1.05)' : 'none',
        }}
      >
        {emoji}
      </div>
      <span style={styles.itemName}>{name}</span>

      {isEditMode && (
        <button
          style={{
            ...styles.removeButton,
            opacity: 1,
            transform: 'scale(1)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// ============================================
// Section Component
// ============================================

interface QuickAccessSectionProps {
  title: string;
  icon: React.ReactNode;
  items: QuickAccessItem[];
  widgetManifests?: Map<string, { name: string; iconEmoji?: string }>;
  stickerInfo?: Map<string, { name: string; emoji: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick: (id: string, type: 'widget' | 'sticker' | 'kit') => void;
  onItemRemove?: (id: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  showEditMode?: boolean;
}

const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({
  title,
  icon,
  items,
  widgetManifests = new Map(),
  stickerInfo = new Map(),
  isExpanded,
  onToggle,
  onItemClick,
  onItemRemove,
  actionLabel,
  onAction,
  showEditMode = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -120, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll, items.length]);

  const getItemInfo = (item: QuickAccessItem) => {
    if (item.type === 'widget') {
      const manifest = widgetManifests.get(item.id);
      return {
        name: manifest?.name || 'Widget',
        emoji: manifest?.iconEmoji || '🧩',
      };
    }
    if (item.type === 'sticker') {
      const sticker = stickerInfo.get(item.id);
      return {
        name: sticker?.name || 'Sticker',
        emoji: sticker?.emoji || '🏷️',
      };
    }
    if (item.type === 'kit') {
      return {
        name: 'Kit',
        emoji: '📦',
      };
    }
    return { name: 'Item', emoji: '📦' };
  };

  return (
    <div style={styles.section}>
      {/* Header */}
      <div style={styles.sectionHeader} onClick={onToggle}>
        <span style={styles.sectionIcon}>{icon}</span>
        <span style={styles.sectionTitle}>{title}</span>

        {showEditMode && items.length > 0 && (
          <button
            style={{
              ...styles.sectionAction,
              background: isEditMode ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: isEditMode ? '#a78bfa' : 'rgba(255, 255, 255, 0.4)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
            }}
          >
            <Edit2 size={12} />
          </button>
        )}

        {actionLabel && onAction && (
          <button
            style={styles.sectionAction}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {actionLabel}
          </button>
        )}

        <span style={styles.chevron}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={styles.scrollContainer}>
          {showLeftScroll && (
            <button
              style={{ ...styles.scrollButton, left: 4 }}
              onClick={scrollLeft}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div
            ref={scrollRef}
            style={{
              ...styles.scrollContent,
              // Hide scrollbar
              scrollbarWidth: 'none',
            }}
          >
            {items.length === 0 ? (
              <div style={styles.emptyState}>
                No items yet
              </div>
            ) : (
              items.map((item) => {
                const { name, emoji } = getItemInfo(item);
                return (
                  <QuickAccessItemCard
                    key={item.id}
                    item={item}
                    name={name}
                    emoji={emoji}
                    isEditMode={isEditMode}
                    onClick={() => onItemClick(item.id, item.type)}
                    onRemove={() => onItemRemove?.(item.id)}
                  />
                );
              })
            )}
          </div>

          {showRightScroll && (
            <button
              style={{ ...styles.scrollButton, right: 4 }}
              onClick={scrollRight}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const LibraryQuickAccess: React.FC<LibraryQuickAccessProps> = ({
  widgetManifests = new Map(),
  stickerInfo = new Map(),
  onItemClick,
  onItemAdd,
}) => {
  const isQuickAccessExpanded = useLibraryStore((s) => s.isQuickAccessExpanded);
  const pinnedItems = useLibraryStore((s) => s.pinnedItems);
  const recentItems = useLibraryStore((s) => s.recentItems);
  const unpinItem = useLibraryStore((s) => s.unpinItem);
  const clearRecentItems = useLibraryStore((s) => s.clearRecentItems);
  const toggleQuickAccess = useLibraryStore((s) => s.toggleQuickAccess);

  const [showFavorites, setShowFavorites] = useState(true);
  const [showRecents, setShowRecents] = useState(true);

  const handleItemClick = useCallback(
    (id: string, type: 'widget' | 'sticker' | 'kit') => {
      onItemClick?.(id, type);
      onItemAdd?.(id, type);
    },
    [onItemClick, onItemAdd]
  );

  // Check if there are any items to show
  const hasItems = pinnedItems.length > 0 || recentItems.length > 0;

  // Hide entirely when there are no items and it's collapsed
  if (!hasItems && !isQuickAccessExpanded) {
    return null;
  }

  // Don't show if quick access is collapsed at top level
  if (!isQuickAccessExpanded) {
    return (
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--sn-border-secondary)',
          cursor: 'pointer',
        }}
        onClick={toggleQuickAccess}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={14} style={{ color: 'var(--sn-text-muted)' }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--sn-text-muted)',
            }}
          >
            Quick Access
          </span>
          {hasItems && (
            <span style={{ fontSize: 10, color: 'var(--sn-text-muted)' }}>
              ({pinnedItems.length + recentItems.length})
            </span>
          )}
          <ChevronRight
            size={14}
            style={{ marginLeft: 'auto', color: 'var(--sn-text-muted)' }}
          />
        </div>
      </div>
    );
  }

  // Show expanded but hide if empty
  if (!hasItems) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Favorites - only show if there are favorites */}
      {pinnedItems.length > 0 && (
        <QuickAccessSection
          title="Favorites"
          icon={<Star size={14} />}
          items={pinnedItems}
          widgetManifests={widgetManifests}
          stickerInfo={stickerInfo}
          isExpanded={showFavorites}
          onToggle={() => setShowFavorites(!showFavorites)}
          onItemClick={handleItemClick}
          onItemRemove={unpinItem}
          showEditMode
        />
      )}

      {/* Recently Used - only show if there are recents */}
      {recentItems.length > 0 && (
        <QuickAccessSection
          title="Recently Used"
          icon={<Clock size={14} />}
          items={recentItems.slice(0, 10)}
          widgetManifests={widgetManifests}
          stickerInfo={stickerInfo}
          isExpanded={showRecents}
          onToggle={() => setShowRecents(!showRecents)}
          onItemClick={handleItemClick}
          actionLabel="Clear"
          onAction={clearRecentItems}
        />
      )}
    </div>
  );
};

export default LibraryQuickAccess;
