/**
 * StickerNest v2 - Pending Invitations List
 * Displays and manages pending canvas invitations.
 */

import React from 'react';
import {
  CanvasPermissionService,
  type CanvasInvitation,
} from '../../services/CanvasPermissionService';

interface PendingInvitationsProps {
  invitations: CanvasInvitation[];
  onRevoke: (id: string) => void;
}

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return 'Expired';
  if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)}m`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)}h`;
  return `${Math.round(diff / 86400000)}d`;
};

export const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  invitations,
  onRevoke,
}) => {
  const pendingInvites = invitations.filter((i) => i.status === 'pending');

  if (pendingInvites.length === 0) {
    return null;
  }

  const copyLink = (token: string) => {
    const link = CanvasPermissionService.generateInviteLink(token);
    copyToClipboard(link);
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
                {invite.email
                  ? invite.email
                  : invite.targetUserId
                  ? `@${invite.targetUsername || 'user'}`
                  : 'Link invite'}
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

            {/* Actions - Copy button only for link invites */}
            {!invite.email && !invite.targetUserId && (
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

export default PendingInvitations;
