/**
 * StickerNest v2 - Sticker List Item
 * Individual sticker card in the library
 */

import React, { useCallback, useState } from 'react';
import type { StickerLibraryItem } from '../../state/useLibraryStore';
import { useLibraryStore } from '../../state/useLibraryStore';
import { Plus, Star, Play, Pause, Info } from 'lucide-react';

interface Props {
  sticker: StickerLibraryItem;
  onAdd: (sticker: StickerLibraryItem) => void;
  onOpenDetails: (sticker: StickerLibraryItem) => void;
  isCompact?: boolean;
}

export const StickerListItem: React.FC<Props> = ({
  sticker,
  onAdd,
  onOpenDetails,
  isCompact = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const toggleStickerFavorite = useLibraryStore((s) => s.toggleStickerFavorite);

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAdd(sticker);
    },
    [sticker, onAdd]
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleStickerFavorite(sticker.id);
    },
    [sticker.id, toggleStickerFavorite]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/sticker-id', sticker.id);
      e.dataTransfer.setData('text/sticker-url', sticker.url);
      e.dataTransfer.setData('text/sticker-type', sticker.type);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [sticker]
  );

  const getTypeIcon = () => {
    switch (sticker.type) {
      case 'lottie':
        return '✨';
      case 'gif':
        return '🎭';
      case 'svg':
        return '🔷';
      default:
        return '🖼️';
    }
  };

  return (
    <>
      <style>{`
        .sticker-list-item {
          position: relative;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .sticker-list-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .sticker-list-item-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .sticker-list-item-preview img {
          max-width: 80%;
          max-height: 80%;
          object-fit: contain;
        }

        .sticker-list-item-type {
          position: absolute;
          top: 6px;
          left: 6px;
          padding: 2px 6px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          font-size: 10px;
        }

        .sticker-list-item-favorite {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .sticker-list-item:hover .sticker-list-item-favorite {
          opacity: 1;
        }

        .sticker-list-item-favorite.active {
          opacity: 1;
          color: #fbbf24;
        }

        .sticker-list-item-favorite:hover {
          background: rgba(0, 0, 0, 0.8);
          color: #fbbf24;
        }

        .sticker-list-item-play {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(102, 126, 234, 0.8);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .sticker-list-item:hover .sticker-list-item-play {
          opacity: 1;
        }

        .sticker-list-item-play:hover {
          background: #667eea;
          transform: scale(1.1);
        }

        .sticker-list-item-info {
          padding: 8px 10px;
        }

        .sticker-list-item-name {
          font-size: 12px;
          font-weight: 500;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .sticker-list-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }

        .sticker-list-item-pack {
          padding: 2px 5px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 3px;
          color: #c4b5fd;
        }

        .sticker-list-item-actions {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          gap: 4px;
          padding: 8px;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .sticker-list-item:hover .sticker-list-item-actions {
          opacity: 1;
        }

        .sticker-list-item-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sticker-list-item-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .sticker-list-item-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .sticker-list-item-btn.primary:hover {
          transform: scale(1.02);
        }

        /* Compact mode */
        .sticker-list-item.compact .sticker-list-item-info {
          padding: 6px 8px;
        }

        .sticker-list-item.compact .sticker-list-item-name {
          font-size: 11px;
        }
      `}</style>

      <div
        className={`sticker-list-item ${isCompact ? 'compact' : ''}`}
        onClick={() => onOpenDetails(sticker)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPlaying(false);
        }}
        draggable
        onDragStart={handleDragStart}
      >
        <div className="sticker-list-item-preview">
          <img
            src={sticker.thumbnailUrl || sticker.url}
            alt={sticker.name}
            loading="lazy"
          />
          <span className="sticker-list-item-type">{getTypeIcon()}</span>

          <button
            className={`sticker-list-item-favorite ${sticker.isFavorite ? 'active' : ''}`}
            onClick={handleToggleFavorite}
          >
            <Star size={12} fill={sticker.isFavorite ? 'currentColor' : 'none'} />
          </button>

          {sticker.isAnimated && (
            <button
              className="sticker-list-item-play"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          )}
        </div>

        <div className="sticker-list-item-info">
          <div className="sticker-list-item-name">{sticker.name}</div>
          <div className="sticker-list-item-meta">
            {sticker.pack && (
              <span className="sticker-list-item-pack">{sticker.pack}</span>
            )}
            {sticker.isAnimated && <span>Animated</span>}
          </div>
        </div>

        <div className="sticker-list-item-actions">
          <button
            className="sticker-list-item-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(sticker);
            }}
          >
            <Info size={12} />
          </button>
          <button className="sticker-list-item-btn primary" onClick={handleAdd}>
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>
    </>
  );
};

export default StickerListItem;
