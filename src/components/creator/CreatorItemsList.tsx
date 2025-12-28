/**
 * StickerNest v2 - Creator Items List
 *
 * Displays creator's published marketplace items with management options.
 */

import React, { useState } from 'react';
import { useCreatorStore } from '../../state/useCreatorStore';
import { useNavigate } from 'react-router-dom';

// ==================
// Types
// ==================

type ItemStatus = 'draft' | 'pending' | 'published' | 'rejected';
type SortOption = 'newest' | 'sales' | 'rating' | 'revenue';

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: 0,
  },
  controls: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  select: {
    padding: '8px 12px',
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 13,
    cursor: 'pointer',
  },
  button: {
    padding: '8px 16px',
    background: 'var(--sn-accent-primary)',
    border: 'none',
    borderRadius: 'var(--sn-radius-md)',
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  itemCard: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  itemContent: {
    display: 'flex',
    gap: 16,
    padding: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 'var(--sn-radius-md)',
    background: 'var(--sn-bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: '0 0 4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    marginBottom: 8,
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: 'var(--sn-text-secondary)',
  },
  statIcon: {
    fontSize: 14,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 'var(--sn-radius-full)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  statusPublished: {
    background: 'var(--sn-success-bg)',
    color: 'var(--sn-success)',
  },
  statusPending: {
    background: 'var(--sn-warning-bg)',
    color: 'var(--sn-warning)',
  },
  statusDraft: {
    background: 'var(--sn-glass-bg-light)',
    color: 'var(--sn-text-muted)',
  },
  statusRejected: {
    background: 'var(--sn-error-bg)',
    color: 'var(--sn-error)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-secondary)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  priceTag: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-success)',
  },
  freeTag: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--sn-text-muted)',
    background: 'var(--sn-bg-tertiary)',
    padding: '4px 8px',
    borderRadius: 'var(--sn-radius-sm)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: 48,
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: '0 0 8px',
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--sn-text-muted)',
    margin: '0 0 24px',
  },
};

// ==================
// Helper Functions
// ==================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function getStatusStyle(status: ItemStatus): React.CSSProperties {
  switch (status) {
    case 'published':
      return styles.statusPublished;
    case 'pending':
      return styles.statusPending;
    case 'rejected':
      return styles.statusRejected;
    default:
      return styles.statusDraft;
  }
}

function getItemTypeIcon(type: string): string {
  switch (type) {
    case 'canvas_widget':
    case 'system_widget':
      return '🧩';
    case 'sticker_pack':
      return '🎨';
    case 'pipeline':
      return '🔗';
    case 'theme':
      return '🎭';
    case 'template':
      return '📄';
    default:
      return '📦';
  }
}

// ==================
// Component
// ==================

export const CreatorItemsList: React.FC = () => {
  const navigate = useNavigate();
  const { items, isLoadingItems, fetchItems } = useCreatorStore();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');

  // Sort and filter items
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Sort items
    switch (sortBy) {
      case 'sales':
        result.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'revenue':
        result.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
        break;
      case 'newest':
      default:
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return result;
  }, [items, sortBy, statusFilter]);

  const handleCreateNew = () => {
    // Navigate to publish page
    navigate('/marketplace/publish');
  };

  const handleEditItem = (itemId: string) => {
    navigate(`/marketplace/edit/${itemId}`);
  };

  const handleViewItem = (slug: string) => {
    navigate(`/marketplace/${slug}`);
  };

  if (isLoadingItems) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p style={{ color: 'var(--sn-text-muted)', margin: 0 }}>
            Loading your items...
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📦</div>
          <h3 style={styles.emptyTitle}>No Items Yet</h3>
          <p style={styles.emptyText}>
            Start selling by publishing your first widget, sticker pack, or template.
          </p>
          <button onClick={handleCreateNew} style={styles.button}>
            + Create New Item
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with controls */}
      <div style={styles.header}>
        <h3 style={styles.title}>My Items ({items.length})</h3>
        <div style={styles.controls}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ItemStatus | 'all')}
            style={styles.select}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={styles.select}
          >
            <option value="newest">Newest</option>
            <option value="sales">Most Sales</option>
            <option value="rating">Highest Rated</option>
            <option value="revenue">Most Revenue</option>
          </select>

          <button onClick={handleCreateNew} style={styles.button}>
            + New Item
          </button>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.map((item) => (
        <div key={item.id} style={styles.itemCard}>
          <div style={styles.itemContent}>
            {/* Thumbnail */}
            <div style={styles.thumbnail}>
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              ) : (
                getItemTypeIcon(item.itemType)
              )}
            </div>

            {/* Info */}
            <div style={styles.itemInfo}>
              <h4 style={styles.itemName}>{item.name}</h4>
              <div style={styles.itemMeta}>
                {item.itemType.replace('_', ' ')} · v{item.version || '1.0.0'}
              </div>
              <div style={styles.statsRow}>
                <span style={styles.stat}>
                  <span style={styles.statIcon}>📦</span>
                  {formatNumber(item.sales || 0)} sales
                </span>
                <span style={styles.stat}>
                  <span style={styles.statIcon}>⬇️</span>
                  {formatNumber(item.downloads || 0)} downloads
                </span>
                <span style={styles.stat}>
                  <span style={styles.statIcon}>⭐</span>
                  {item.rating?.toFixed(1) || 'N/A'}
                </span>
                <span style={styles.stat}>
                  <span style={styles.statIcon}>💵</span>
                  {formatCurrency(item.revenue || 0)}
                </span>
              </div>
            </div>

            {/* Status & Price */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <span style={{ ...styles.statusBadge, ...getStatusStyle(item.status as ItemStatus) }}>
                {item.status}
              </span>
              {item.isFree ? (
                <span style={styles.freeTag}>Free</span>
              ) : (
                <span style={styles.priceTag}>
                  {formatCurrency(item.oneTimePrice || 0)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button
                onClick={() => handleViewItem(item.slug)}
                style={styles.actionButton}
                title="View listing"
              >
                👁️
              </button>
              <button
                onClick={() => handleEditItem(item.id)}
                style={styles.actionButton}
                title="Edit item"
              >
                ✏️
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Empty filtered state */}
      {filteredItems.length === 0 && items.length > 0 && (
        <div style={styles.emptyState}>
          <p style={{ color: 'var(--sn-text-muted)', margin: 0 }}>
            No items match the current filter
          </p>
        </div>
      )}
    </div>
  );
};

export default CreatorItemsList;
