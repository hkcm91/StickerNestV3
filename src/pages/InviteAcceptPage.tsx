/**
 * StickerNest v2 - Invite Accept Page
 *
 * Handles accepting canvas invitations via shareable links.
 * Shows invitation details and allows user to accept/decline.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  CanvasPermissionService,
  type CanvasInvitation,
  type CollabRole,
} from '../services/CanvasPermissionService';

// ==================
// Types
// ==================

interface InviteData {
  invitation: CanvasInvitation;
  canvas: {
    id: string;
    name: string;
    thumbnailUrl: string | null;
  };
  inviter: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

type PageState = 'loading' | 'loaded' | 'accepting' | 'accepted' | 'error' | 'expired' | 'login-required';

// ==================
// Component
// ==================

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  const [state, setState] = useState<PageState>('loading');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load invitation details
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setState('error');
        setError('Invalid invitation link');
        return;
      }

      const result = await CanvasPermissionService.getInvitationByToken(token);

      if (!result.success || !result.data) {
        setState('error');
        setError(result.error || 'Invitation not found');
        return;
      }

      const { invitation, canvas, inviter } = result.data;

      // Check if expired
      if (invitation.status === 'expired' ||
          (invitation.expiresAt && new Date(invitation.expiresAt) < new Date())) {
        setState('expired');
        return;
      }

      // Check if already used up
      if (invitation.maxUses && invitation.useCount >= invitation.maxUses) {
        setState('error');
        setError('This invitation has reached its maximum uses');
        return;
      }

      // Check if already accepted/revoked
      if (invitation.status !== 'pending') {
        setState('error');
        setError(`This invitation has been ${invitation.status}`);
        return;
      }

      setInviteData({ invitation, canvas, inviter });

      // Check if user needs to log in
      if (!isAuthenticated) {
        setState('login-required');
      } else {
        setState('loaded');
      }
    };

    loadInvitation();
  }, [token, isAuthenticated]);

  // Handle accept
  const handleAccept = async () => {
    if (!token) return;

    setState('accepting');

    const result = await CanvasPermissionService.acceptInvitation(token);

    if (result.success && result.data) {
      setState('accepted');
      // Redirect to canvas after short delay
      setTimeout(() => {
        navigate(`/canvas/${result.data!.canvasId}`);
      }, 1500);
    } else {
      setState('error');
      setError(result.error || 'Failed to accept invitation');
    }
  };

  // Handle decline (just navigate away)
  const handleDecline = () => {
    navigate('/');
  };

  // Render role badge
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
          display: 'inline-flex',
          padding: '4px 12px',
          background: bg,
          color: text,
          borderRadius: 16,
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {role}
      </span>
    );
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconError}>!</div>
          <h1 style={styles.title}>Invalid Invitation</h1>
          <p style={styles.description}>{error || 'This invitation link is not valid.'}</p>
          <Link to="/" style={styles.primaryButton}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Expired state
  if (state === 'expired') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconExpired}>...</div>
          <h1 style={styles.title}>Invitation Expired</h1>
          <p style={styles.description}>
            This invitation link has expired. Please ask the canvas owner to send you a new invitation.
          </p>
          <Link to="/" style={styles.primaryButton}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Login required state
  if (state === 'login-required' && inviteData) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          {/* Canvas Preview */}
          <div style={styles.canvasPreview}>
            {inviteData.canvas.thumbnailUrl ? (
              <img
                src={inviteData.canvas.thumbnailUrl}
                alt={inviteData.canvas.name}
                style={styles.thumbnail}
              />
            ) : (
              <div style={styles.thumbnailPlaceholder}>
                <span style={{ fontSize: 32 }}>🎨</span>
              </div>
            )}
          </div>

          <h1 style={styles.title}>You're Invited!</h1>

          {/* Inviter Info */}
          <div style={styles.inviterInfo}>
            <div style={styles.avatar}>
              {inviteData.inviter.avatarUrl ? (
                <img
                  src={inviteData.inviter.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>
                  {(inviteData.inviter.displayName || inviteData.inviter.username || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <strong>{inviteData.inviter.displayName || inviteData.inviter.username || 'Someone'}</strong>
              <span style={{ color: 'var(--sn-text-secondary)' }}> invited you to</span>
            </div>
          </div>

          {/* Canvas Name */}
          <h2 style={styles.canvasName}>{inviteData.canvas.name}</h2>

          {/* Role */}
          <div style={{ marginBottom: 24 }}>
            <span style={{ color: 'var(--sn-text-secondary)', marginRight: 8 }}>As:</span>
            <RoleBadge role={inviteData.invitation.role} />
          </div>

          {/* Message */}
          {inviteData.invitation.message && (
            <div style={styles.message}>
              "{inviteData.invitation.message}"
            </div>
          )}

          {/* Login prompt */}
          <p style={styles.description}>
            Sign in or create an account to accept this invitation.
          </p>

          <div style={styles.buttonGroup}>
            <Link
              to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
              style={styles.primaryButton}
            >
              Sign In
            </Link>
            <Link
              to={`/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`}
              style={styles.secondaryButton}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Accepted state
  if (state === 'accepted') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconSuccess}>✓</div>
          <h1 style={styles.title}>Invitation Accepted!</h1>
          <p style={styles.description}>
            Redirecting you to the canvas...
          </p>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  // Accepting state
  if (state === 'accepting') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Accepting invitation...</p>
        </div>
      </div>
    );
  }

  // Main loaded state
  if (!inviteData) return null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Canvas Preview */}
        <div style={styles.canvasPreview}>
          {inviteData.canvas.thumbnailUrl ? (
            <img
              src={inviteData.canvas.thumbnailUrl}
              alt={inviteData.canvas.name}
              style={styles.thumbnail}
            />
          ) : (
            <div style={styles.thumbnailPlaceholder}>
              <span style={{ fontSize: 32 }}>🎨</span>
            </div>
          )}
        </div>

        <h1 style={styles.title}>You're Invited!</h1>

        {/* Inviter Info */}
        <div style={styles.inviterInfo}>
          <div style={styles.avatar}>
            {inviteData.inviter.avatarUrl ? (
              <img
                src={inviteData.inviter.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>
                {(inviteData.inviter.displayName || inviteData.inviter.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <strong>{inviteData.inviter.displayName || inviteData.inviter.username || 'Someone'}</strong>
            <span style={{ color: 'var(--sn-text-secondary)' }}> invited you to</span>
          </div>
        </div>

        {/* Canvas Name */}
        <h2 style={styles.canvasName}>{inviteData.canvas.name}</h2>

        {/* Role */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ color: 'var(--sn-text-secondary)', marginRight: 8 }}>As:</span>
          <RoleBadge role={inviteData.invitation.role} />
        </div>

        {/* Permissions info */}
        <div style={styles.permissionsInfo}>
          {inviteData.invitation.role === 'editor' ? (
            <p>You'll be able to add, edit, and remove widgets on this canvas.</p>
          ) : (
            <p>You'll be able to view this canvas and its widgets.</p>
          )}
          {inviteData.invitation.canInvite && (
            <p style={{ marginTop: 8 }}>You'll also be able to invite others.</p>
          )}
        </div>

        {/* Message */}
        {inviteData.invitation.message && (
          <div style={styles.message}>
            "{inviteData.invitation.message}"
          </div>
        )}

        {/* Current user info */}
        <div style={styles.userInfo}>
          Accepting as <strong>{profile?.display_name || profile?.username || profile?.email}</strong>
        </div>

        {/* Actions */}
        <div style={styles.buttonGroup}>
          <button onClick={handleAccept} style={styles.primaryButton}>
            Accept Invitation
          </button>
          <button onClick={handleDecline} style={styles.secondaryButton}>
            Decline
          </button>
        </div>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-primary, #0f0f19)',
    padding: 20,
  },
  card: {
    background: 'var(--sn-bg-secondary, #1a1a2e)',
    borderRadius: 16,
    padding: 32,
    width: 420,
    maxWidth: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
  },
  canvasPreview: {
    width: 120,
    height: 80,
    margin: '0 auto 24px',
    borderRadius: 8,
    overflow: 'hidden',
    background: 'var(--sn-bg-tertiary, #252538)',
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
    background: 'linear-gradient(135deg, var(--sn-accent-primary) 0%, #6366f1 100%)',
  },
  title: {
    margin: '0 0 16px',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--sn-text-primary, #e2e8f0)',
  },
  inviterInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    color: 'var(--sn-text-primary, #e2e8f0)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'var(--sn-accent-primary, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: 16,
  },
  canvasName: {
    margin: '0 0 16px',
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--sn-accent-primary, #8b5cf6)',
  },
  description: {
    color: 'var(--sn-text-secondary, #94a3b8)',
    fontSize: 14,
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  permissionsInfo: {
    background: 'var(--sn-bg-tertiary, #252538)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    fontSize: 13,
    color: 'var(--sn-text-secondary, #94a3b8)',
    textAlign: 'left' as const,
  },
  message: {
    background: 'var(--sn-bg-tertiary, #252538)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    fontSize: 14,
    color: 'var(--sn-text-primary, #e2e8f0)',
    fontStyle: 'italic',
    borderLeft: '3px solid var(--sn-accent-primary, #8b5cf6)',
    textAlign: 'left' as const,
  },
  userInfo: {
    fontSize: 13,
    color: 'var(--sn-text-secondary, #94a3b8)',
    marginBottom: 24,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    padding: '12px 24px',
    background: 'var(--sn-accent-primary, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    padding: '12px 24px',
    background: 'var(--sn-bg-tertiary, #252538)',
    color: 'var(--sn-text-primary, #e2e8f0)',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    borderTopColor: 'var(--sn-accent-primary, #8b5cf6)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  loadingText: {
    color: 'var(--sn-text-secondary, #94a3b8)',
    fontSize: 14,
    marginTop: 16,
  },
  iconSuccess: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(34, 197, 94, 0.2)',
    color: 'var(--sn-success, #22c55e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 700,
    margin: '0 auto 24px',
  },
  iconError: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.2)',
    color: 'var(--sn-error, #ef4444)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 700,
    margin: '0 auto 24px',
  },
  iconExpired: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(148, 163, 184, 0.2)',
    color: 'var(--sn-text-secondary, #94a3b8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 700,
    margin: '0 auto 24px',
  },
};

export default InviteAcceptPage;
