/**
 * StickerNest v2 - Role Badge Component
 * Displays a styled badge for collaborator roles (owner/editor/viewer).
 */

import React from 'react';
import type { CollabRole } from '../../services/CanvasPermissionService';

interface RoleBadgeProps {
  role: CollabRole;
  isOwner?: boolean;
}

const roleColors: Record<CollabRole, { bg: string; text: string }> = {
  owner: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
  editor: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' },
  viewer: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8' },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, isOwner }) => {
  const { bg, text } = roleColors[role];

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

export default RoleBadge;
