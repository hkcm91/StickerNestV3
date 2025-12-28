/**
 * StickerNest v2 - Invite Dialog
 *
 * UI component for creating and managing canvas invitations.
 * Supports email invites, shareable links, role selection, and expiration settings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CanvasPermissionService,
  type CanvasInvitation,
  type CollabRole,
} from '../../services/CanvasPermissionService';

// ==================
// Types
// ==================

interface InviteDialogProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  canInvite: boolean;
}

type InviteMode = 'link' | 'email';

// ==================
// Role Selector
// ==================

const RoleSelector: React.FC<{
  value: CollabRole;
  onChange: (role: CollabRole) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const roles: { value: CollabRole; label: string; description: string }[] = [
    { value: 'editor', label: 'Editor', description: 'Can edit widgets' },
    { value: 'viewer', label: 'Viewer', description: 'View only' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {roles.map((role) => (
        <button
          key={role.value}
          onClick={() => onChange(role.value)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '12px 16px',
            background:
              value === role.value
                ? 'var(--sn-accent-primary, #8b5cf6)'
                : 'var(--sn-bg-tertiary, #252538)',
            border:
              value === role.value
                ? '2px solid var(--sn-accent-primary, #8b5cf6)'
                : '2px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
            borderRadius: 8,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color:
                value === role.value
                  ? 'white'
                  : 'var(--sn-text-primary, #e2e8f0)',
              marginBottom: 4,
            }}
          >
            {role.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color:
                value === role.value
                  ? 'rgba(255,255,255,0.8)'
                  : 'var(--sn-text-secondary, #94a3b8)',
            }}
          >
            {role.description}
          </div>
        </button>
      ))}
    </div>
  );
};

// ==================
// Invite Link Creator
// ==================

const InviteLinkCreator: React.FC<{
  canvasId: string;
  onCreated: (invitation: CanvasInvitation) => void;
}> = ({ canvasId, onCreated }) => {
  const [role, setRole] = useState<CollabRole>('viewer');
  const [expiresIn, setExpiresIn] = useState<string>('7d');
  const [maxUses, setMaxUses] = useState<string>('');
  const [canInviteOthers, setCanInviteOthers] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getExpirationDate = (): Date | undefined => {
    if (expiresIn === 'never') return undefined;
    const now = new Date();
    switch (expiresIn) {
      case '1h':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    const result = await CanvasPermissionService.createInvitation(canvasId, {
      role,
      canInvite: canInviteOthers,
      expiresAt: getExpirationDate(),
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
    });

    if (result.success && result.data) {
      const link = CanvasPermissionService.generateInviteLink(result.data.token);
      setCreatedLink(link);
      onCreated(result.data);
    } else {
      setError(result.error || 'Failed to create invitation');
    }

    setIsCreating(false);
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = createdLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setCreatedLink(null);
    setCopied(false);
  };

  if (createdLink) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            padding: 16,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              color: 'var(--sn-success, #22c55e)',
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Invite link created!
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              value={createdLink}
              readOnly
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--sn-bg-tertiary, #252538)',
                border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
                borderRadius: 6,
                color: 'var(--sn-text-primary, #e2e8f0)',
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                background: copied
                  ? 'var(--sn-success, #22c55e)'
                  : 'var(--sn-accent-primary, #8b5cf6)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          onClick={handleReset}
          style={{
            padding: '10px 16px',
            background: 'var(--sn-bg-tertiary, #252538)',
            border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
            borderRadius: 6,
            color: 'var(--sn-text-primary, #e2e8f0)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Create another link
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Role */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Role
        </label>
        <RoleSelector value={role} onChange={setRole} disabled={isCreating} />
      </div>

      {/* Options Row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Expiration */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--sn-text-primary, #e2e8f0)',
            }}
          >
            Expires
          </label>
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--sn-bg-tertiary, #252538)',
              border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
              borderRadius: 6,
              color: 'var(--sn-text-primary, #e2e8f0)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="never">Never</option>
          </select>
        </div>

        {/* Max Uses */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--sn-text-primary, #e2e8f0)',
            }}
          >
            Max uses
          </label>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited"
            disabled={isCreating}
            min="1"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--sn-bg-tertiary, #252538)',
              border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
              borderRadius: 6,
              color: 'var(--sn-text-primary, #e2e8f0)',
              fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* Can invite others */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: isCreating ? 'not-allowed' : 'pointer',
          opacity: isCreating ? 0.5 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={canInviteOthers}
          onChange={(e) => setCanInviteOthers(e.target.checked)}
          disabled={isCreating}
          style={{ width: 16, height: 16, cursor: 'inherit' }}
        />
        <span
          style={{
            fontSize: 13,
            color: 'var(--sn-text-secondary, #94a3b8)',
          }}
        >
          Allow them to invite others
        </span>
      </label>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: 'var(--sn-error, #ef4444)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={isCreating}
        style={{
          padding: '12px 20px',
          background: 'var(--sn-accent-primary, #8b5cf6)',
          border: 'none',
          borderRadius: 6,
          color: 'white',
          cursor: isCreating ? 'wait' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
          opacity: isCreating ? 0.7 : 1,
        }}
      >
        {isCreating ? 'Creating...' : 'Create Invite Link'}
      </button>
    </div>
  );
};

// ==================
// Email Invite Form
// ==================

const EmailInviteForm: React.FC<{
  canvasId: string;
  onCreated: (invitation: CanvasInvitation) => void;
}> = ({ canvasId, onCreated }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollabRole>('viewer');
  const [message, setMessage] = useState('');
  const [canInviteOthers, setCanInviteOthers] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleCreate = async () => {
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await CanvasPermissionService.createInvitation(canvasId, {
      email,
      role,
      canInvite: canInviteOthers,
      message: message || undefined,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    if (result.success && result.data) {
      onCreated(result.data);
      setSuccess(true);
      setEmail('');
      setMessage('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to send invitation');
    }

    setIsCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Email */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          disabled={isCreating}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--sn-bg-tertiary, #252538)',
            border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
            borderRadius: 6,
            color: 'var(--sn-text-primary, #e2e8f0)',
            fontSize: 14,
          }}
        />
      </div>

      {/* Role */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Role
        </label>
        <RoleSelector value={role} onChange={setRole} disabled={isCreating} />
      </div>

      {/* Message */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Personal message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hey! I'd like to share this canvas with you..."
          disabled={isCreating}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--sn-bg-tertiary, #252538)',
            border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
            borderRadius: 6,
            color: 'var(--sn-text-primary, #e2e8f0)',
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Can invite others */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: isCreating ? 'not-allowed' : 'pointer',
          opacity: isCreating ? 0.5 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={canInviteOthers}
          onChange={(e) => setCanInviteOthers(e.target.checked)}
          disabled={isCreating}
          style={{ width: 16, height: 16, cursor: 'inherit' }}
        />
        <span
          style={{
            fontSize: 13,
            color: 'var(--sn-text-secondary, #94a3b8)',
          }}
        >
          Allow them to invite others
        </span>
      </label>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: 'var(--sn-error, #ef4444)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          style={{
            padding: 12,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 6,
            color: 'var(--sn-success, #22c55e)',
            fontSize: 13,
          }}
        >
          Invitation sent successfully!
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleCreate}
        disabled={isCreating || !email}
        style={{
          padding: '12px 20px',
          background: 'var(--sn-accent-primary, #8b5cf6)',
          border: 'none',
          borderRadius: 6,
          color: 'white',
          cursor: isCreating || !email ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
          opacity: isCreating || !email ? 0.5 : 1,
        }}
      >
        {isCreating ? 'Sending...' : 'Send Invitation'}
      </button>
    </div>
  );
};

// ==================
// Pending Invitations
// ==================

const PendingInvitations: React.FC<{
  invitations: CanvasInvitation[];
  onRevoke: (id: string) => void;
}> = ({ invitations, onRevoke }) => {
  const pendingInvites = invitations.filter((i) => i.status === 'pending');

  if (pendingInvites.length === 0) {
    return null;
  }

  const copyLink = async (token: string) => {
    const link = CanvasPermissionService.generateInviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return 'Expired';
    if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)}h`;
    return `${Math.round(diff / 86400000)}d`;
  };

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--sn-text-secondary, #94a3b8)',
          marginBottom: 12,
        }}
      >
        Pending invitations ({pendingInvites.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pendingInvites.map((invite) => (
          <div
            key={invite.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: 'var(--sn-bg-tertiary, #252538)',
              borderRadius: 6,
            }}
          >
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--sn-text-primary, #e2e8f0)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {invite.email || 'Link invite'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--sn-text-secondary, #94a3b8)',
                  marginTop: 2,
                }}
              >
                {invite.role} · expires {formatDate(invite.expiresAt)}
                {invite.maxUses && ` · ${invite.useCount}/${invite.maxUses} uses`}
              </div>
            </div>

            {/* Actions */}
            {!invite.email && (
              <button
                onClick={() => copyLink(invite.token)}
                style={{
                  padding: '6px 10px',
                  background: 'transparent',
                  border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
                  borderRadius: 4,
                  color: 'var(--sn-text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Copy
              </button>
            )}
            <button
              onClick={() => onRevoke(invite.id)}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 4,
                color: 'var(--sn-error, #ef4444)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================
// Main Component
// ==================

export const InviteDialog: React.FC<InviteDialogProps> = ({
  canvasId,
  isOpen,
  onClose,
  canInvite,
}) => {
  const [mode, setMode] = useState<InviteMode>('link');
  const [invitations, setInvitations] = useState<CanvasInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load invitations
  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    const result = await CanvasPermissionService.getInvitations(canvasId);
    if (result.success && result.data) {
      setInvitations(result.data);
    }
    setIsLoading(false);
  }, [canvasId]);

  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen, loadInvitations]);

  // Handle new invitation
  const handleInvitationCreated = (invitation: CanvasInvitation) => {
    setInvitations((prev) => [invitation, ...prev]);
  };

  // Handle revoke
  const handleRevoke = async (invitationId: string) => {
    const result = await CanvasPermissionService.revokeInvitation(invitationId);
    if (result.success) {
      setInvitations((prev) =>
        prev.map((i) =>
          i.id === invitationId ? { ...i, status: 'revoked' as const } : i
        )
      );
    }
  };

  if (!isOpen) return null;

  if (!canInvite) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--sn-bg-secondary, #1a1a2e)',
            borderRadius: 12,
            width: 400,
            maxWidth: '90vw',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
            }}
          >
            🔒
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--sn-text-primary, #e2e8f0)',
              marginBottom: 8,
            }}
          >
            No Invite Permission
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--sn-text-secondary, #94a3b8)',
              marginBottom: 20,
            }}
          >
            You don't have permission to invite others to this canvas.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--sn-bg-tertiary, #252538)',
              border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
              borderRadius: 6,
              color: 'var(--sn-text-primary, #e2e8f0)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--sn-bg-secondary, #1a1a2e)',
          borderRadius: 12,
          width: 480,
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom:
              '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--sn-text-primary, #e2e8f0)',
            }}
          >
            Invite to Canvas
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sn-text-secondary, #94a3b8)',
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }}
          >
            x
          </button>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '12px 20px 0',
            gap: 4,
          }}
        >
          <button
            onClick={() => setMode('link')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background:
                mode === 'link'
                  ? 'var(--sn-bg-tertiary, #252538)'
                  : 'transparent',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              color:
                mode === 'link'
                  ? 'var(--sn-text-primary, #e2e8f0)'
                  : 'var(--sn-text-secondary, #94a3b8)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: mode === 'link' ? 500 : 400,
              transition: 'all 0.2s',
            }}
          >
            Share Link
          </button>
          <button
            onClick={() => setMode('email')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background:
                mode === 'email'
                  ? 'var(--sn-bg-tertiary, #252538)'
                  : 'transparent',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              color:
                mode === 'email'
                  ? 'var(--sn-text-primary, #e2e8f0)'
                  : 'var(--sn-text-secondary, #94a3b8)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: mode === 'email' ? 500 : 400,
              transition: 'all 0.2s',
            }}
          >
            Email Invite
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 20,
            background: 'var(--sn-bg-tertiary, #252538)',
          }}
        >
          {mode === 'link' ? (
            <InviteLinkCreator
              canvasId={canvasId}
              onCreated={handleInvitationCreated}
            />
          ) : (
            <EmailInviteForm
              canvasId={canvasId}
              onCreated={handleInvitationCreated}
            />
          )}

          {/* Pending Invitations */}
          {!isLoading && (
            <PendingInvitations
              invitations={invitations}
              onRevoke={handleRevoke}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop:
              '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'var(--sn-bg-tertiary, #252538)',
              border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
              borderRadius: 6,
              color: 'var(--sn-text-primary, #e2e8f0)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteDialog;
