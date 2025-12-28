/**
 * StickerNest v2 - Admin Dashboard
 *
 * Main admin dashboard for marketplace moderation.
 */

import React, { useState, useEffect } from 'react';

// ==================
// Types
// ==================

interface AdminStats {
  pendingReviews: number;
  approvedToday: number;
  rejectedToday: number;
  totalItems: number;
  totalCreators: number;
  totalRevenue: number;
}

interface ReviewItem {
  id: string;
  name: string;
  slug: string;
  itemType: string;
  description: string;
  thumbnailUrl: string | null;
  isFree: boolean;
  oneTimePrice: number | null;
  submittedAt: string;
  author: {
    id: string;
    displayName: string;
    email: string;
    isVerified: boolean;
  };
  stats: {
    previousItems: number;
    totalSales: number;
  };
}

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
  },
  statCard: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    padding: 20,
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--sn-text-primary)',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  statHighlight: {
    color: 'var(--sn-success)',
  },
  statWarning: {
    color: '#fbbf24',
  },
  section: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--sn-border-primary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: 0,
  },
  badge: {
    background: 'var(--sn-accent-primary)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: 'var(--sn-radius-full)',
    fontSize: 12,
    fontWeight: 600,
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
  },
  reviewItem: {
    display: 'flex',
    gap: 16,
    padding: 20,
    borderBottom: '1px solid var(--sn-border-primary)',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 'var(--sn-radius-md)',
    background: 'var(--sn-bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    flexShrink: 0,
    overflow: 'hidden',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    marginBottom: 8,
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--sn-text-secondary)',
  },
  verifiedBadge: {
    color: 'var(--sn-accent-primary)',
    fontSize: 14,
  },
  actions: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 'var(--sn-radius-md)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnApprove: {
    background: 'var(--sn-success)',
    color: 'white',
  },
  btnReject: {
    background: 'transparent',
    border: '1px solid var(--sn-error)',
    color: 'var(--sn-error)',
  },
  btnView: {
    background: 'var(--sn-bg-tertiary)',
    color: 'var(--sn-text-primary)',
  },
  emptyState: {
    padding: 40,
    textAlign: 'center' as const,
    color: 'var(--sn-text-muted)',
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    padding: 24,
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    marginBottom: 16,
  },
  textarea: {
    width: '100%',
    padding: 12,
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    resize: 'vertical' as const,
    minHeight: 100,
    fontFamily: 'inherit',
    marginBottom: 16,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getItemTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    canvas_widget: '🧩',
    system_widget: '⚙️',
    sticker_pack: '🎨',
    pipeline: '🔗',
    theme: '🎭',
    template: '📄',
  };
  return icons[type] || '📦';
}

// ==================
// Component
// ==================

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ itemId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/review/queue', { credentials: 'include' }),
      ]);

      if (!statsRes.ok || !queueRes.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const statsData = await statsRes.json();
      const queueData = await queueRes.json();

      setStats(statsData.stats);
      setReviewQueue(queueData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/review/${itemId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setReviewQueue((prev) => prev.filter((item) => item.id !== itemId));
        if (stats) {
          setStats({
            ...stats,
            pendingReviews: stats.pendingReviews - 1,
            approvedToday: stats.approvedToday + 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;

    try {
      const response = await fetch(`/api/admin/review/${rejectModal.itemId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        setReviewQueue((prev) => prev.filter((item) => item.id !== rejectModal.itemId));
        if (stats) {
          setStats({
            ...stats,
            pendingReviews: stats.pendingReviews - 1,
            rejectedToday: stats.rejectedToday + 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setRejectModal(null);
      setRejectReason('');
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.emptyState, color: 'var(--sn-error)' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, ...styles.statWarning }}>
              {stats.pendingReviews}
            </div>
            <div style={styles.statLabel}>Pending Review</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, ...styles.statHighlight }}>
              {stats.approvedToday}
            </div>
            <div style={styles.statLabel}>Approved Today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.rejectedToday}</div>
            <div style={styles.statLabel}>Rejected Today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.totalItems}</div>
            <div style={styles.statLabel}>Total Items</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.totalCreators}</div>
            <div style={styles.statLabel}>Creators</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, ...styles.statHighlight }}>
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div style={styles.statLabel}>Platform Revenue</div>
          </div>
        </div>
      )}

      {/* Review Queue */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Review Queue</h2>
          <span style={styles.badge}>{reviewQueue.length} pending</span>
        </div>

        <div style={styles.reviewList}>
          {reviewQueue.length === 0 ? (
            <div style={styles.emptyState}>
              No items pending review. Great job!
            </div>
          ) : (
            reviewQueue.map((item) => (
              <div key={item.id} style={styles.reviewItem}>
                <div style={styles.thumbnail}>
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getItemTypeIcon(item.itemType)
                  )}
                </div>

                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.itemMeta}>
                    {item.itemType.replace('_', ' ')} ·{' '}
                    {item.isFree ? 'Free' : formatCurrency(item.oneTimePrice || 0)} ·{' '}
                    Submitted {formatDate(item.submittedAt)}
                  </div>
                  <div style={styles.authorInfo}>
                    By {item.author.displayName}
                    {item.author.isVerified && <span style={styles.verifiedBadge}>✓</span>}
                    <span style={{ color: 'var(--sn-text-muted)' }}>
                      · {item.stats.previousItems} previous items · {item.stats.totalSales} sales
                    </span>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button
                    style={{ ...styles.btn, ...styles.btnApprove }}
                    onClick={() => handleApprove(item.id)}
                  >
                    Approve
                  </button>
                  <button
                    style={{ ...styles.btn, ...styles.btnReject }}
                    onClick={() => setRejectModal({ itemId: item.id, name: item.name })}
                  >
                    Reject
                  </button>
                  <a
                    href={`/marketplace/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.btn, ...styles.btnView, textDecoration: 'none' }}
                  >
                    View
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={styles.modal} onClick={() => setRejectModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Reject "{rejectModal.name}"</h3>
            <textarea
              style={styles.textarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
            />
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.btn, ...styles.btnView }}
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnReject }}
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
