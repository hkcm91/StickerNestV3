/**
 * StickerNest v2 - Permission Types
 * Type definitions for canvas permissions and collaborators.
 */

// ==================
// Role & Status Types
// ==================

export type CollabRole = 'owner' | 'editor' | 'viewer';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

// ==================
// Collaborator Types
// ==================

export interface Collaborator {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: CollabRole;
  canInvite: boolean;
  canManage: boolean;
  grantedAt: string;
  grantedBy: string | null;
  lastAccessedAt: string | null;
  isOwner: boolean;
}

// ==================
// Invitation Types
// ==================

export interface CanvasInvitation {
  id: string;
  canvasId: string;
  email: string | null;
  targetUserId: string | null;
  targetUsername?: string | null;
  role: CollabRole;
  canInvite: boolean;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  inviterName?: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  message: string | null;
  createdAt: string;
}

export interface InviteOptions {
  /** Email address for direct invite (optional) */
  email?: string;
  /** Target user ID for username-based invite (optional) */
  targetUserId?: string;
  /** Role to assign */
  role: CollabRole;
  /** Can they invite others? */
  canInvite?: boolean;
  /** Expiration date (optional) */
  expiresAt?: Date;
  /** Max uses for link-based invites (optional) */
  maxUses?: number;
  /** Personal message (optional) */
  message?: string;
}

// ==================
// Permission Check Types
// ==================

export interface PermissionCheckResult {
  hasAccess: boolean;
  role: CollabRole | null;
  canEdit: boolean;
  canInvite: boolean;
  canManage: boolean;
  isOwner: boolean;
}

// ==================
// Service Result Types
// ==================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================
// Shared Canvas Types
// ==================

export interface SharedCanvas {
  canvasId: string;
  canvasName: string;
  role: CollabRole;
  ownerName: string;
  thumbnailUrl: string | null;
  grantedAt: string;
}

export interface PendingInvitationWithDetails {
  invitation: CanvasInvitation;
  canvasName: string;
  inviterName: string;
}

export interface InvitationDetails {
  invitation: CanvasInvitation;
  canvas: { id: string; name: string; thumbnailUrl: string | null };
  inviter: { username: string | null; displayName: string | null; avatarUrl: string | null };
}

export interface AcceptInvitationResult {
  canvasId: string;
  role: CollabRole;
}

// ==================
// No Access Result
// ==================

export const NO_ACCESS: PermissionCheckResult = {
  hasAccess: false,
  role: null,
  canEdit: false,
  canInvite: false,
  canManage: false,
  isOwner: false,
};

export const FULL_ACCESS: PermissionCheckResult = {
  hasAccess: true,
  role: 'owner',
  canEdit: true,
  canInvite: true,
  canManage: true,
  isOwner: true,
};
