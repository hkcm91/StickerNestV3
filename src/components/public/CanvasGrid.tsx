/**
 * CanvasGrid Component
 * Grid/masonry layout for canvas cards
 */

import React, { useState } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import type { CanvasPreview } from '../../types/profile';
import { CanvasCard } from './CanvasCard';
import { ShareModal } from './ShareModal';

interface CanvasGridProps {
  canvases: CanvasPreview[];
  /** View mode */
  viewMode?: 'grid' | 'list' | 'masonry';
  /** Show author info on cards */
  showAuthor?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Has more to load */
  hasMore?: boolean;
  /** Load more handler */
  onLoadMore?: () => void;
  /** Like handler */
  onLike?: (canvasId: string) => void;
  /** Liked canvas IDs */
  likedIds?: Set<string>;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: string;
  /** Columns for grid */
  columns?: number;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({
  canvases,
  viewMode = 'grid',
  showAuthor = false,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onLike,
  likedIds = new Set(),
  emptyMessage = 'No canvases yet',
  emptyIcon = 'layout',
  columns = 3,
}) => {
  const [shareCanvas, setShareCanvas] = useState<CanvasPreview | null>(null);

  const handleShare = (canvas: CanvasPreview) => {
    setShareCanvas(canvas);
  };

  // Empty state
  if (!isLoading && canvases.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>
          <SNIcon name={emptyIcon as any} size={48} color="rgba(139, 92, 246, 0.3)" />
        </div>
        <p style={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: viewMode === 'list'
      ? '1fr'
      : `repeat(${columns}, 1fr)`,
    gap: viewMode === 'list' ? 12 : 24,
  };

  return (
    <>
      <div style={gridStyle}>
        {canvases.map((canvas) => (
          <CanvasCard
            key={canvas.id}
            canvas={canvas}
            variant={viewMode === 'list' ? 'list' : 'grid'}
            showAuthor={showAuthor}
            showStats
            showActions
            onLike={onLike}
            onShare={handleShare}
            isLiked={likedIds.has(canvas.id)}
          />
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div style={gridStyle}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={styles.skeleton}>
              <div style={styles.skeletonThumb} />
              <div style={styles.skeletonInfo}>
                <div style={styles.skeletonTitle} />
                <div style={styles.skeletonMeta} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <div style={styles.loadMoreContainer}>
          <SNButton
            variant="secondary"
            onClick={onLoadMore}
          >
            Load More
          </SNButton>
        </div>
      )}

      {/* Share Modal */}
      {shareCanvas && (
        <ShareModal
          isOpen={!!shareCanvas}
          onClose={() => setShareCanvas(null)}
          type="canvas"
          data={{
            url: `${window.location.origin}/c/${shareCanvas.slug || shareCanvas.id}`,
            title: `${shareCanvas.name} | StickerNest`,
            description: shareCanvas.description,
            image: shareCanvas.thumbnailUrl,
          }}
          embedCode={`<iframe src="${window.location.origin}/embed/${shareCanvas.slug || shareCanvas.id}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`}
        />
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    background: 'rgba(139, 92, 246, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    margin: 0,
  },

  skeleton: {
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 16,
    overflow: 'hidden',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonThumb: {
    aspectRatio: '16 / 10',
    background: 'rgba(139, 92, 246, 0.05)',
  },
  skeletonInfo: {
    padding: 16,
  },
  skeletonTitle: {
    height: 18,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonMeta: {
    height: 14,
    width: '60%',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 4,
  },

  loadMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 40,
  },
};

export default CanvasGrid;
