/**
 * StickerNest v2 - Invite Link Creator
 * Component for creating shareable invitation links.
 */

import React, { useState } from 'react';
import {
  CanvasPermissionService,
  type CanvasInvitation,
  type CollabRole,
} from '../../services/CanvasPermissionService';
import { RoleSelector } from './RoleSelector';

interface InviteLinkCreatorProps {
  canvasId: string;
  onCreated: (invitation: CanvasInvitation) => void;
}

const getExpirationDate = (expiresIn: string): Date | undefined => {
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

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return true;
  }
};

export const InviteLinkCreator: React.FC<InviteLinkCreatorProps> = ({
  canvasId,
  onCreated,
}) => {
  const [role, setRole] = useState<CollabRole>('viewer');
  const [expiresIn, setExpiresIn] = useState<string>('7d');
  const [maxUses, setMaxUses] = useState<string>('');
  const [canInviteOthers, setCanInviteOthers] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    const result = await CanvasPermissionService.createInvitation(canvasId, {
      role,
      canInvite: canInviteOthers,
      expiresAt: getExpirationDate(expiresIn),
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
    await copyToClipboard(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div style={{ display: 'flex', gap: 8 }}>
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

export default InviteLinkCreator;
