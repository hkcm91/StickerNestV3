/**
 * CanvasCard Component
 * Preview card for canvas in galleries
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { SNButton } from '../../shared-ui/SNButton';
import type { CanvasPreview } from '../../types/profile';
import { UserAvatar } from './UserAvatar';

interface CanvasCardProps {
  canvas: CanvasPreview;
  /** Card variant */
  variant?: 'grid' | 'list';
  /** Show author info */
  showAuthor?: boolean;
  /** Show stats */
  showStats?: boolean;
  /** Show actions on hover */
  showActions?: boolean;
  /** Enable open in new tab */
  enableNewTab?: boolean;
  /** Like handler */
  onLike?: (canvasId: string) => void;
  /** Share handler */
  onShare?: (canvas: CanvasPreview) => void;
  /** Is liked by current user */
  isLiked?: boolean;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({
  canvas,
  variant = 'grid',
  showAuthor = false,
  showStats = true,
  showActions = true,
  enableNewTab = true,
  onLike,
  onShare,
  isLiked = false,
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleClick = (e: React.MouseEvent) => {
    // Check for modifier keys for new tab
    if (enableNewTab && (e.ctrlKey || e.metaKey)) {
      window.open(`/c/${canvas.slug || canvas.id}`, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(`/c/${canvas.slug || canvas.id}`);
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/c/${canvas.slug || canvas.id}`, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'list') {
    return (
      <div
        style={styles.listCard}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={styles.listThumbnail}>
          {canvas.thumbnailUrl ? (
            <img src={canvas.thumbnailUrl} alt={canvas.name} style={styles.listThumbImg} />
          ) : (
            <div style={styles.listThumbPlaceholder}>
              <SNIcon name="layout" size={24} color="rgba(139, 92, 246, 0.4)" />
            </div>
          )}
        </div>

        <div style={styles.listInfo}>
          <h3 style={styles.listTitle}>{canvas.name}</h3>
          {showAuthor && canvas.owner && (
            <p style={styles.listAuthor}>by @{canvas.owner.username}</p>
          )}
          {showStats && (
            <div style={styles.listMeta}>
              <span style={styles.metaItem}>
                <SNIcon name="eye" size={12} />
                {formatNumber(canvas.viewCount)}
              </span>
              <span style={styles.metaItem}>
                <SNIcon name="heart" size={12} />
                {formatNumber(canvas.likeCount)}
              </span>
              <span style={styles.metaItem}>{formatDate(canvas.updatedAt)}</span>
            </div>
          )}
        </div>

        {showActions && isHovered && (
          <div style={styles.listActions}>
            {onLike && (
              <SNIconButton
                icon={isLiked ? 'heartFilled' : 'heart'}
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(canvas.id);
                }}
              />
            )}
            {onShare && (
              <SNIconButton
                icon="share"
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(canvas);
                }}
              />
            )}
            {enableNewTab && (
              <SNIconButton
                icon="externalLink"
                size="sm"
                variant="ghost"
                onClick={handleOpenNewTab}
                tooltip="Open in new tab"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid variant
  return (
    <div
      style={{
        ...styles.gridCard,
        transform: isHovered ? 'translateY(-4px)' : 'none',
        borderColor: isHovered ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.thumbnail}>
        {canvas.thumbnailUrl ? (
          <img src={canvas.thumbnailUrl} alt={canvas.name} style={styles.thumbImg} />
        ) : (
          <div style={styles.thumbPlaceholder}>
            <SNIcon name="layout" size={32} color="rgba(139, 92, 246, 0.3)" />
          </div>
        )}

        {/* Hover overlay */}
        <div
          style={{
            ...styles.overlay,
            opacity: isHovered ? 1 : 0,
          }}
        >
          <SNButton variant="primary" size="sm">
            View Canvas
          </SNButton>
        </div>

        {/* Top actions */}
        {showActions && (
          <div
            style={{
              ...styles.topActions,
              opacity: isHovered ? 1 : 0,
            }}
          >
            {onLike && (
              <button
                style={{
                  ...styles.actionButton,
                  color: isLiked ? '#ef4444' : '#fff',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(canvas.id);
                }}
              >
                <SNIcon name={isLiked ? 'heartFilled' : 'heart'} size={14} />
              </button>
            )}
            {enableNewTab && (
              <button
                style={styles.actionButton}
                onClick={handleOpenNewTab}
                title="Open in new tab"
              >
                <SNIcon name="externalLink" size={14} />
              </button>
            )}
          </div>
        )}

        {/* Visibility badge */}
        {canvas.visibility !== 'public' && (
          <div style={styles.visibilityBadge}>
            <SNIcon
              name={canvas.visibility === 'private' ? 'lock' : 'link'}
              size={10}
            />
          </div>
        )}
      </div>

      <div style={styles.cardInfo}>
        <h3 style={styles.cardTitle}>{canvas.name}</h3>

        {showAuthor && canvas.owner && (
          <div style={styles.authorRow}>
            <UserAvatar
              username={canvas.owner.username}
              displayName={canvas.owner.displayName}
              avatarUrl={canvas.owner.avatarUrl}
              size="xs"
            />
            <span style={styles.authorName}>@{canvas.owner.username}</span>
          </div>
        )}

        {showStats && (
          <div style={styles.cardMeta}>
            <span style={styles.metaItem}>
              <SNIcon name="eye" size={12} />
              {formatNumber(canvas.viewCount)}
            </span>
            <span style={styles.metaItem}>
              <SNIcon name="heart" size={12} />
              {formatNumber(canvas.likeCount)}
            </span>
            <span style={styles.metaDot} />
            <span style={styles.metaDate}>{formatDate(canvas.updatedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  // Grid card styles
  gridCard: {
    position: 'relative',
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
  },
  thumbnail: {
    position: 'relative',
    aspectRatio: '16 / 10',
    background: 'rgba(15, 15, 25, 0.8)',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
  },
  topActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    display: 'flex',
    gap: 4,
    transition: 'opacity 0.2s',
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    border: 'none',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  visibilityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  cardInfo: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorName: {
    fontSize: 13,
    color: '#8b5cf6',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#64748b',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: '50%',
    background: '#64748b',
  },
  metaDate: {
    fontSize: 12,
    color: '#64748b',
  },

  // List card styles
  listCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  listThumbnail: {
    width: 80,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  listThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  listThumbPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(139, 92, 246, 0.1)',
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listAuthor: {
    fontSize: 12,
    color: '#8b5cf6',
    margin: '2px 0 0',
  },
  listMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  listActions: {
    display: 'flex',
    gap: 4,
  },
};

export default CanvasCard;
