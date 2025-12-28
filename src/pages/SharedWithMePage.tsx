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
import { styles } from './SharedWithMePage.styles';

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

export default SharedWithMePage;
