/**
 * StickerNest v2 - Shared With Me Page
 *
 * Displays canvases that have been shared with the current user,
 * as well as pending invitations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  CanvasPermissionService,
  type CollabRole,
  type CanvasInvitation,
} from '../services/CanvasPermissionService';

// ==================
// Types
// ==================

interface SharedCanvas {
  canvasId: string;
  canvasName: string;
  role: CollabRole;
  ownerName: string;
  thumbnailUrl: string | null;
  grantedAt: string;
}

interface PendingInvite {
  invitation: CanvasInvitation;
  canvasName: string;
  inviterName: string;
}

// ==================
// Component
// ==================

export const SharedWithMePage: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  const [sharedCanvases, setSharedCanvases] = useState<SharedCanvas[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shared' | 'pending'>('shared');

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Load shared canvases
    const sharedResult = await CanvasPermissionService.getSharedCanvases();
    if (sharedResult.success && sharedResult.data) {
      setSharedCanvases(sharedResult.data);
    }

    // Load pending invitations
    const pendingResult = await CanvasPermissionService.getMyPendingInvitations();
    if (pendingResult.success && pendingResult.data) {
      setPendingInvites(pendingResult.data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Handle leave canvas
  const handleLeave = async (canvasId: string, canvasName: string) => {
    if (!confirm(`Are you sure you want to leave "${canvasName}"? You will lose access to this canvas.`)) {
      return;
    }

    const result = await CanvasPermissionService.leaveCanvas(canvasId);
    if (result.success) {
      setSharedCanvases((prev) => prev.filter((c) => c.canvasId !== canvasId));
    } else {
      alert(result.error || 'Failed to leave canvas');
    }
  };

  // Handle accept invitation
  const handleAcceptInvite = async (token: string) => {
    const result = await CanvasPermissionService.acceptInvitation(token);
    if (result.success && result.data) {
      // Reload to update both lists
      await loadData();
      // Navigate to canvas
      navigate(`/canvas/${result.data.canvasId}`);
    } else {
      alert(result.error || 'Failed to accept invitation');
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Role badge component
  const RoleBadge: React.FC<{ role: CollabRole }> = ({ role }) => {
    const colors: Record<CollabRole, { bg: string; text: string }> = {
      owner: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
      editor: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' },
      viewer: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8' },
    };
    const { bg, text } = colors[role];

    return (
      <span
        style={{
          padding: '2px 8px',
          background: bg,
          color: text,
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {role}
      </span>
    );
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>🔒</span>
          <h2 style={styles.emptyTitle}>Sign in Required</h2>
          <p style={styles.emptyDescription}>
            Please sign in to view canvases shared with you.
          </p>
          <Link to="/login" style={styles.primaryButton}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Shared With Me</h1>
        <p style={styles.subtitle}>
          Canvases that others have shared with you
        </p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('shared')}
          style={{
            ...styles.tab,
            ...(activeTab === 'shared' ? styles.tabActive : {}),
          }}
        >
          Shared Canvases
          {sharedCanvases.length > 0 && (
            <span style={styles.badge}>{sharedCanvases.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            ...styles.tab,
            ...(activeTab === 'pending' ? styles.tabActive : {}),
          }}
        >
          Pending Invitations
          {pendingInvites.length > 0 && (
            <span style={{ ...styles.badge, background: 'var(--sn-accent-primary)' }}>
              {pendingInvites.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {isLoading ? (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <p>Loading...</p>
          </div>
        ) : activeTab === 'shared' ? (
          /* Shared Canvases Tab */
          sharedCanvases.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 48, marginBottom: 16 }}>📭</span>
              <h3 style={styles.emptyTitle}>No Shared Canvases</h3>
              <p style={styles.emptyDescription}>
                When someone shares a canvas with you, it will appear here.
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {sharedCanvases.map((canvas) => (
                <div key={canvas.canvasId} style={styles.card}>
                  {/* Thumbnail */}
                  <Link
                    to={`/canvas/${canvas.canvasId}`}
                    style={styles.thumbnailLink}
                  >
                    {canvas.thumbnailUrl ? (
                      <img
                        src={canvas.thumbnailUrl}
                        alt={canvas.canvasName}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <div style={styles.thumbnailPlaceholder}>
                        <span style={{ fontSize: 32 }}>🎨</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div style={styles.cardContent}>
                    <Link
                      to={`/canvas/${canvas.canvasId}`}
                      style={styles.canvasName}
                    >
                      {canvas.canvasName}
                    </Link>

                    <div style={styles.cardMeta}>
                      <span>by {canvas.ownerName}</span>
                      <span>·</span>
                      <RoleBadge role={canvas.role} />
                    </div>

                    <div style={styles.cardFooter}>
                      <span style={styles.date}>
                        Shared {formatDate(canvas.grantedAt)}
                      </span>
                      <button
                        onClick={() => handleLeave(canvas.canvasId, canvas.canvasName)}
                        style={styles.leaveButton}
                        title="Leave this canvas"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Pending Invitations Tab */
          pendingInvites.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 48, marginBottom: 16 }}>✉️</span>
              <h3 style={styles.emptyTitle}>No Pending Invitations</h3>
              <p style={styles.emptyDescription}>
                When someone invites you to a canvas, it will appear here.
              </p>
            </div>
          ) : (
            <div style={styles.inviteList}>
              {pendingInvites.map((invite) => (
                <div key={invite.invitation.id} style={styles.inviteCard}>
                  <div style={styles.inviteInfo}>
                    <div style={styles.inviteTitle}>
                      <strong>{invite.inviterName}</strong> invited you to{' '}
                      <strong>{invite.canvasName}</strong>
                    </div>
                    <div style={styles.inviteMeta}>
                      <RoleBadge role={invite.invitation.role} />
                      <span>·</span>
                      <span>{formatDate(invite.invitation.createdAt)}</span>
                      {invite.invitation.message && (
                        <>
                          <span>·</span>
                          <span style={{ fontStyle: 'italic' }}>
                            "{invite.invitation.message}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={styles.inviteActions}>
                    <button
                      onClick={() => handleAcceptInvite(invite.invitation.token)}
                      style={styles.acceptButton}
                    >
                      Accept
                    </button>
                    <Link
                      to={`/invite/${invite.invitation.token}`}
                      style={styles.viewButton}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--sn-bg-primary, #0f0f19)',
    padding: '32px 24px',
  },
  header: {
    maxWidth: 1200,
    margin: '0 auto 32px',
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--sn-text-primary, #e2e8f0)',
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 14,
    color: 'var(--sn-text-secondary, #94a3b8)',
  },
  tabs: {
    maxWidth: 1200,
    margin: '0 auto 24px',
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
  },
  tab: {
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--sn-text-secondary, #94a3b8)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: -1,
  },
  tabActive: {
    color: 'var(--sn-text-primary, #e2e8f0)',
    borderBottomColor: 'var(--sn-accent-primary, #8b5cf6)',
  },
  badge: {
    padding: '2px 8px',
    background: 'var(--sn-bg-tertiary, #252538)',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  content: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    color: 'var(--sn-text-secondary, #94a3b8)',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    borderTopColor: 'var(--sn-accent-primary, #8b5cf6)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 16,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    textAlign: 'center' as const,
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary, #e2e8f0)',
  },
  emptyDescription: {
    margin: '0 0 24px',
    fontSize: 14,
    color: 'var(--sn-text-secondary, #94a3b8)',
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24,
  },
  card: {
    background: 'var(--sn-bg-secondary, #1a1a2e)',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  thumbnailLink: {
    display: 'block',
    aspectRatio: '16 / 9',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--sn-bg-tertiary) 0%, var(--sn-bg-secondary) 100%)',
  },
  cardContent: {
    padding: 16,
  },
  canvasName: {
    display: 'block',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--sn-text-primary, #e2e8f0)',
    textDecoration: 'none',
    marginBottom: 8,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--sn-text-secondary, #94a3b8)',
    marginBottom: 12,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 11,
    color: 'var(--sn-text-muted, #64748b)',
  },
  leaveButton: {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 4,
    color: 'var(--sn-error, #ef4444)',
    fontSize: 11,
    cursor: 'pointer',
  },
  inviteList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  inviteCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    background: 'var(--sn-bg-secondary, #1a1a2e)',
    borderRadius: 8,
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    gap: 16,
  },
  inviteInfo: {
    flex: 1,
    minWidth: 0,
  },
  inviteTitle: {
    fontSize: 14,
    color: 'var(--sn-text-primary, #e2e8f0)',
    marginBottom: 8,
  },
  inviteMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--sn-text-secondary, #94a3b8)',
    flexWrap: 'wrap' as const,
  },
  inviteActions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  acceptButton: {
    padding: '8px 16px',
    background: 'var(--sn-accent-primary, #8b5cf6)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  viewButton: {
    padding: '8px 16px',
    background: 'var(--sn-bg-tertiary, #252538)',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    borderRadius: 6,
    color: 'var(--sn-text-primary, #e2e8f0)',
    fontSize: 13,
    textDecoration: 'none',
  },
};

export default SharedWithMePage;
