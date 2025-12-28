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
import { CollaboratorRow } from './CollaboratorRow';

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
