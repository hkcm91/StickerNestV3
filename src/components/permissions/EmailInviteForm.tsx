/**
 * StickerNest v2 - Email Invite Form
 * Component for sending email invitations.
 */

import React, { useState } from 'react';
import {
  CanvasPermissionService,
  type CanvasInvitation,
  type CollabRole,
} from '../../services/CanvasPermissionService';
import { RoleSelector } from './RoleSelector';

interface EmailInviteFormProps {
  canvasId: string;
  onCreated: (invitation: CanvasInvitation) => void;
}

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const EmailInviteForm: React.FC<EmailInviteFormProps> = ({
  canvasId,
  onCreated,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollabRole>('viewer');
  const [message, setMessage] = useState('');
  const [canInviteOthers, setCanInviteOthers] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

export default EmailInviteForm;
