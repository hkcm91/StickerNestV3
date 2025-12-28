/**
 * StickerNest v2 - Invite Dialog
 * Main dialog component for creating and managing canvas invitations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CanvasPermissionService,
  type CanvasInvitation,
} from '../../services/CanvasPermissionService';
import { InviteLinkCreator } from './InviteLinkCreator';
import { EmailInviteForm } from './EmailInviteForm';
import { UsernameInviteForm } from './UsernameInviteForm';
import { PendingInvitations } from './PendingInvitations';

// ==================
// Types
// ==================

interface InviteDialogProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  canInvite: boolean;
}

type InviteMode = 'link' | 'email' | 'username';

// ==================
// No Permission View
// ==================

const NoPermissionView: React.FC<{ onClose: () => void }> = ({ onClose }) => (
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
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
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

// ==================
// Mode Tab Button
// ==================

const ModeTab: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: '10px 16px',
      background: isActive ? 'var(--sn-bg-tertiary, #252538)' : 'transparent',
      border: 'none',
      borderRadius: '8px 8px 0 0',
      color: isActive
        ? 'var(--sn-text-primary, #e2e8f0)'
        : 'var(--sn-text-secondary, #94a3b8)',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: isActive ? 500 : 400,
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

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
    return <NoPermissionView onClose={onClose} />;
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
            borderBottom: '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
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
        <div style={{ display: 'flex', padding: '12px 20px 0', gap: 4 }}>
          <ModeTab
            label="Share Link"
            isActive={mode === 'link'}
            onClick={() => setMode('link')}
          />
          <ModeTab
            label="Invite User"
            isActive={mode === 'username'}
            onClick={() => setMode('username')}
          />
          <ModeTab
            label="Email Invite"
            isActive={mode === 'email'}
            onClick={() => setMode('email')}
          />
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
          {mode === 'link' && (
            <InviteLinkCreator
              canvasId={canvasId}
              onCreated={handleInvitationCreated}
            />
          )}
          {mode === 'username' && (
            <UsernameInviteForm
              canvasId={canvasId}
              onCreated={handleInvitationCreated}
            />
          )}
          {mode === 'email' && (
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
            borderTop: '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
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
