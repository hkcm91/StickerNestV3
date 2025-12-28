/**
 * StickerNest v2 - Collaborator Row Component
 * Displays a single collaborator with avatar, name, role, and action menu.
 */

import React, { useState } from 'react';
import type { Collaborator, CollabRole } from '../../services/CanvasPermissionService';
import { RoleBadge } from './RoleBadge';

interface CollaboratorRowProps {
  collaborator: Collaborator;
  canManage: boolean;
  onRoleChange: (userId: string, role: CollabRole) => void;
  onRemove: (userId: string) => void;
}

export const CollaboratorRow: React.FC<CollaboratorRowProps> = ({
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

export default CollaboratorRow;
