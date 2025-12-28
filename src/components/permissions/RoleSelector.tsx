/**
 * StickerNest v2 - Role Selector
 * Reusable component for selecting collaborator roles.
 */

import React from 'react';
import type { CollabRole } from '../../services/CanvasPermissionService';

interface RoleSelectorProps {
  value: CollabRole;
  onChange: (role: CollabRole) => void;
  disabled?: boolean;
}

const roles: { value: CollabRole; label: string; description: string }[] = [
  { value: 'editor', label: 'Editor', description: 'Can edit widgets' },
  { value: 'viewer', label: 'Viewer', description: 'View only' },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
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

export default RoleSelector;
