/**
 * StickerNest v2 - Collaborator Manager
 *
 * UI component for managing canvas collaborators - view, add, remove, and
 * change roles of users who have access to a canvas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CanvasPermissionService,
  type Collaborator,
  type CollabRole,
} from '../../services/CanvasPermissionService';

// ==================
// Types
// ==================

interface CollaboratorManagerProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: CollabRole | null;
  canManage: boolean;
  onLeave?: () => void;
}

// ==================
// Role Badge
// ==================

const RoleBadge: React.FC<{ role: CollabRole; isOwner?: boolean }> = ({
  role,
  isOwner,
}) => {
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
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: bg,
        color: text,
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      {isOwner && <span>Crown</span>}
      {role}
    </span>
  );
};

// ==================
// Collaborator Row
// ==================

interface CollaboratorRowProps {
  collaborator: Collaborator;
  canManage: boolean;
  onRoleChange: (userId: string, role: CollabRole) => void;
  onRemove: (userId: string) => void;
}

const CollaboratorRow: React.FC<CollaboratorRowProps> = ({
  collaborator,
  canManage,
  onRoleChange,
  onRemove,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const initials = collaborator.displayName
    ? collaborator.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : collaborator.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {collaborator.avatarUrl ? (
          <img
            src={collaborator.avatarUrl}
            alt={collaborator.displayName || collaborator.username || 'User'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--sn-accent-primary, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Name & Username */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {collaborator.displayName || collaborator.username || 'Unknown User'}
        </div>
        {collaborator.username && collaborator.displayName && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--sn-text-secondary, #94a3b8)',
            }}
          >
            @{collaborator.username}
          </div>
        )}
      </div>

      {/* Role & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RoleBadge role={collaborator.role} isOwner={collaborator.isOwner} />

        {canManage && !collaborator.isOwner && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sn-text-secondary, #94a3b8)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
              }}
            >
              ...
            </button>

            {showMenu && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999,
                  }}
                  onClick={() => setShowMenu(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    background: 'var(--sn-bg-elevated, #2a2a42)',
                    borderRadius: 8,
                    boxShadow: 'var(--sn-elevation-panel, 0 4px 16px rgba(0,0,0,0.5))',
                    padding: 4,
                    minWidth: 140,
                    zIndex: 1000,
                  }}
                >
                  {/* Role options */}
                  {(['editor', 'viewer'] as CollabRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        onRoleChange(collaborator.userId, role);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: collaborator.role === role
                          ? 'var(--sn-accent-primary, #8b5cf6)'
                          : 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        color: 'var(--sn-text-primary, #e2e8f0)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Make {role}
                    </button>
                  ))}

                  <div
                    style={{
                      height: 1,
                      background: 'var(--sn-border-secondary, rgba(255,255,255,0.1))',
                      margin: '4px 0',
                    }}
                  />

                  {/* Remove */}
                  <button
                    onClick={() => {
                      onRemove(collaborator.userId);
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: 'var(--sn-error, #ef4444)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Remove access
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================
// Main Component
// ==================

export const CollaboratorManager: React.FC<CollaboratorManagerProps> = ({
  canvasId,
  isOpen,
  onClose,
  currentUserRole,
  canManage,
  onLeave,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Check if current user is owner
  const isOwner = currentUserRole === 'owner';

  // Load collaborators
  const loadCollaborators = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await CanvasPermissionService.getCollaborators(canvasId);

    if (result.success && result.data) {
      setCollaborators(result.data);
    } else {
      setError(result.error || 'Failed to load collaborators');
    }

    setIsLoading(false);
  }, [canvasId]);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, loadCollaborators]);

  // Handle role change
  const handleRoleChange = useCallback(async (userId: string, role: CollabRole) => {
    const result = await CanvasPermissionService.updateCollaborator(canvasId, userId, { role });

    if (result.success) {
      setCollaborators(prev =>
        prev.map(c => c.userId === userId ? { ...c, role } : c)
      );
    } else {
      setError(result.error || 'Failed to update role');
    }
  }, [canvasId]);

  // Handle remove
  const handleRemove = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    const result = await CanvasPermissionService.removeCollaborator(canvasId, userId);

    if (result.success) {
      setCollaborators(prev => prev.filter(c => c.userId !== userId));
    } else {
      setError(result.error || 'Failed to remove collaborator');
    }
  }, [canvasId]);

  // Handle leave canvas
  const handleLeave = useCallback(async () => {
    if (!confirm('Are you sure you want to leave this canvas? You will lose access.')) {
      return;
    }

    setIsLeaving(true);
    const result = await CanvasPermissionService.leaveCanvas(canvasId);

    if (result.success) {
      onLeave?.();
      onClose();
    } else {
      setError(result.error || 'Failed to leave canvas');
      setIsLeaving(false);
    }
  }, [canvasId, onLeave, onClose]);

  if (!isOpen) return null;

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
        onClick={e => e.stopPropagation()}
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
            Manage Access
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

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 20px 20px',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--sn-text-secondary, #94a3b8)',
              }}
            >
              Loading collaborators...
            </div>
          ) : error ? (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--sn-error, #ef4444)',
              }}
            >
              {error}
            </div>
          ) : collaborators.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--sn-text-secondary, #94a3b8)',
              }}
            >
              No collaborators yet
            </div>
          ) : (
            <div>
              {/* Summary */}
              <div
                style={{
                  padding: '12px 0',
                  color: 'var(--sn-text-secondary, #94a3b8)',
                  fontSize: 13,
                }}
              >
                {collaborators.length} {collaborators.length === 1 ? 'person has' : 'people have'} access
              </div>

              {/* List */}
              {collaborators.map(collaborator => (
                <CollaboratorRow
                  key={collaborator.userId}
                  collaborator={collaborator}
                  canManage={canManage}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--sn-border-secondary, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Leave button - only for non-owners */}
          {!isOwner && currentUserRole ? (
            <button
              onClick={handleLeave}
              disabled={isLeaving}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 6,
                color: 'var(--sn-error, #ef4444)',
                cursor: isLeaving ? 'wait' : 'pointer',
                fontSize: 14,
                opacity: isLeaving ? 0.7 : 1,
              }}
            >
              {isLeaving ? 'Leaving...' : 'Leave Canvas'}
            </button>
          ) : (
            <div />
          )}
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

export default CollaboratorManager;
