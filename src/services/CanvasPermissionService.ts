/**
 * StickerNest v2 - Canvas Permission Service
 * ==========================================
 *
 * Manages canvas access control, collaborators, and invitations.
 * Provides a client-side interface to the canvas_collaborators and
 * canvas_invitations database tables.
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';

// ==================
// Types
// ==================

export type CollabRole = 'owner' | 'editor' | 'viewer';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

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

export interface CanvasInvitation {
  id: string;
  canvasId: string;
  email: string | null;
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

export interface PermissionCheckResult {
  hasAccess: boolean;
  role: CollabRole | null;
  canEdit: boolean;
  canInvite: boolean;
  canManage: boolean;
  isOwner: boolean;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================
// Service Class
// ==================

class CanvasPermissionServiceClass {
  /**
   * Check if Supabase is available
   */
  private get supabase() {
    if (isLocalDevMode || !supabaseClient) {
      return null;
    }
    return supabaseClient;
  }

  /**
   * Check if the current user has access to a canvas
   */
  async checkAccess(canvasId: string): Promise<PermissionCheckResult> {
    // In local dev mode, grant full access
    if (!this.supabase) {
      return {
        hasAccess: true,
        role: 'owner',
        canEdit: true,
        canInvite: true,
        canManage: true,
        isOwner: true,
      };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return {
          hasAccess: false,
          role: null,
          canEdit: false,
          canInvite: false,
          canManage: false,
          isOwner: false,
        };
      }

      // Check if user is owner
      const { data: canvas } = await this.supabase
        .from('canvases')
        .select('user_id, visibility')
        .eq('id', canvasId)
        .single();

      if (!canvas) {
        return {
          hasAccess: false,
          role: null,
          canEdit: false,
          canInvite: false,
          canManage: false,
          isOwner: false,
        };
      }

      // Owner has full access
      if (canvas.user_id === user.id) {
        return {
          hasAccess: true,
          role: 'owner',
          canEdit: true,
          canInvite: true,
          canManage: true,
          isOwner: true,
        };
      }

      // Public canvases have viewer access for everyone
      if (canvas.visibility === 'public') {
        // Check if user has elevated permissions via collaboration
        const { data: collab } = await this.supabase
          .from('canvas_collaborators')
          .select('role, can_invite, can_manage')
          .eq('canvas_id', canvasId)
          .eq('user_id', user.id)
          .single();

        if (collab) {
          return {
            hasAccess: true,
            role: collab.role,
            canEdit: collab.role === 'editor' || collab.role === 'owner',
            canInvite: collab.can_invite,
            canManage: collab.can_manage,
            isOwner: false,
          };
        }

        return {
          hasAccess: true,
          role: 'viewer',
          canEdit: false,
          canInvite: false,
          canManage: false,
          isOwner: false,
        };
      }

      // Check collaborator permissions for private/unlisted canvases
      const { data: collab } = await this.supabase
        .from('canvas_collaborators')
        .select('role, can_invite, can_manage')
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .single();

      if (collab) {
        return {
          hasAccess: true,
          role: collab.role,
          canEdit: collab.role === 'editor' || collab.role === 'owner',
          canInvite: collab.can_invite,
          canManage: collab.can_manage,
          isOwner: false,
        };
      }

      // Unlisted canvases with password are handled separately
      if (canvas.visibility === 'unlisted') {
        return {
          hasAccess: true,
          role: 'viewer',
          canEdit: false,
          canInvite: false,
          canManage: false,
          isOwner: false,
        };
      }

      // No access
      return {
        hasAccess: false,
        role: null,
        canEdit: false,
        canInvite: false,
        canManage: false,
        isOwner: false,
      };
    } catch (error) {
      console.error('[CanvasPermissionService] Error checking access:', error);
      return {
        hasAccess: false,
        role: null,
        canEdit: false,
        canInvite: false,
        canManage: false,
        isOwner: false,
      };
    }
  }

  /**
   * Get all collaborators for a canvas
   */
  async getCollaborators(canvasId: string): Promise<ServiceResult<Collaborator[]>> {
    // In local dev mode, return empty list
    if (!this.supabase) {
      return { success: true, data: [] };
    }

    try {
      const { data, error } = await this.supabase
        .rpc('get_canvas_collaborators', { p_canvas_id: canvasId });

      if (error) {
        return { success: false, error: error.message };
      }

      const collaborators: Collaborator[] = data.map((row: any) => ({
        id: row.user_id,
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        role: row.role,
        canInvite: row.can_invite,
        canManage: row.can_manage,
        grantedAt: row.granted_at,
        grantedBy: null, // Not returned by function
        lastAccessedAt: row.last_accessed_at,
        isOwner: row.is_owner,
      }));

      return { success: true, data: collaborators };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Add a collaborator directly (when user ID is known)
   */
  async addCollaborator(
    canvasId: string,
    userId: string,
    role: CollabRole = 'viewer',
    options: { canInvite?: boolean; canManage?: boolean } = {}
  ): Promise<ServiceResult<void>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await this.supabase
        .from('canvas_collaborators')
        .insert({
          canvas_id: canvasId,
          user_id: userId,
          role,
          granted_by: user.id,
          can_invite: options.canInvite ?? false,
          can_manage: options.canManage ?? false,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Update a collaborator's role or permissions
   */
  async updateCollaborator(
    canvasId: string,
    userId: string,
    updates: {
      role?: CollabRole;
      canInvite?: boolean;
      canManage?: boolean;
    }
  ): Promise<ServiceResult<void>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.canInvite !== undefined) updateData.can_invite = updates.canInvite;
      if (updates.canManage !== undefined) updateData.can_manage = updates.canManage;

      const { error } = await this.supabase
        .from('canvas_collaborators')
        .update(updateData)
        .eq('canvas_id', canvasId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Remove a collaborator from a canvas
   */
  async removeCollaborator(canvasId: string, userId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { error } = await this.supabase
        .from('canvas_collaborators')
        .delete()
        .eq('canvas_id', canvasId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Leave a canvas (remove self as collaborator)
   */
  async leaveCanvas(canvasId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      return this.removeCollaborator(canvasId, user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // ==================
  // Invitation Methods
  // ==================

  /**
   * Create an invitation to a canvas
   */
  async createInvitation(
    canvasId: string,
    options: InviteOptions
  ): Promise<ServiceResult<CanvasInvitation>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .insert({
          canvas_id: canvasId,
          email: options.email || null,
          role: options.role,
          can_invite: options.canInvite ?? false,
          invited_by: user.id,
          expires_at: options.expiresAt?.toISOString() || null,
          max_uses: options.maxUses || null,
          message: options.message || null,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapInvitation(data),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get all pending invitations for a canvas
   */
  async getInvitations(canvasId: string): Promise<ServiceResult<CanvasInvitation[]>> {
    if (!this.supabase) {
      return { success: true, data: [] };
    }

    try {
      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .select(`
          *,
          inviter:invited_by(username, display_name)
        `)
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const invitations = data.map((row: any) => ({
        ...this.mapInvitation(row),
        inviterName: row.inviter?.display_name || row.inviter?.username || 'Unknown',
      }));

      return { success: true, data: invitations };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get an invitation by token (for accepting)
   */
  async getInvitationByToken(token: string): Promise<ServiceResult<{
    invitation: CanvasInvitation;
    canvas: { id: string; name: string; thumbnailUrl: string | null };
    inviter: { username: string | null; displayName: string | null; avatarUrl: string | null };
  }>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .select(`
          *,
          canvas:canvas_id(id, name, thumbnail_url),
          inviter:invited_by(username, display_name, avatar_url)
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Invitation not found' };
      }

      return {
        success: true,
        data: {
          invitation: this.mapInvitation(data),
          canvas: {
            id: data.canvas?.id,
            name: data.canvas?.name || 'Unknown Canvas',
            thumbnailUrl: data.canvas?.thumbnail_url,
          },
          inviter: {
            username: data.inviter?.username,
            displayName: data.inviter?.display_name,
            avatarUrl: data.inviter?.avatar_url,
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string): Promise<ServiceResult<{
    canvasId: string;
    role: CollabRole;
  }>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await this.supabase
        .rpc('accept_canvas_invitation', {
          p_token: token,
          p_user_id: user.id,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data[0];
      if (!result.success) {
        return { success: false, error: result.error_message };
      }

      return {
        success: true,
        data: {
          canvasId: result.canvas_id,
          role: result.role,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { error } = await this.supabase
        .from('canvas_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Delete an invitation
   */
  async deleteInvitation(invitationId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) {
      return { success: false, error: 'Not available in local dev mode' };
    }

    try {
      const { error } = await this.supabase
        .from('canvas_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Generate an invite link from a token
   */
  generateInviteLink(token: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://stickernest.com';
    return `${baseUrl}/invite/${token}`;
  }

  // ==================
  // Permission Helpers
  // ==================

  /**
   * Get canvases shared with the current user
   */
  async getSharedCanvases(): Promise<ServiceResult<Array<{
    canvasId: string;
    canvasName: string;
    role: CollabRole;
    ownerName: string;
    thumbnailUrl: string | null;
    grantedAt: string;
  }>>> {
    if (!this.supabase) {
      return { success: true, data: [] };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await this.supabase
        .from('canvas_collaborators')
        .select(`
          role,
          granted_at,
          canvas:canvas_id(
            id,
            name,
            thumbnail_url,
            owner:user_id(username, display_name)
          )
        `)
        .eq('user_id', user.id)
        .order('granted_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const sharedCanvases = data.map((row: any) => ({
        canvasId: row.canvas.id,
        canvasName: row.canvas.name,
        role: row.role,
        ownerName: row.canvas.owner?.display_name || row.canvas.owner?.username || 'Unknown',
        thumbnailUrl: row.canvas.thumbnail_url,
        grantedAt: row.granted_at,
      }));

      return { success: true, data: sharedCanvases };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get pending invitations for the current user (by email)
   */
  async getMyPendingInvitations(): Promise<ServiceResult<Array<{
    invitation: CanvasInvitation;
    canvasName: string;
    inviterName: string;
  }>>> {
    if (!this.supabase) {
      return { success: true, data: [] };
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user?.email) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .select(`
          *,
          canvas:canvas_id(name),
          inviter:invited_by(username, display_name)
        `)
        .eq('email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const invitations = data.map((row: any) => ({
        invitation: this.mapInvitation(row),
        canvasName: row.canvas?.name || 'Unknown Canvas',
        inviterName: row.inviter?.display_name || row.inviter?.username || 'Unknown',
      }));

      return { success: true, data: invitations };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // ==================
  // Private Helpers
  // ==================

  private mapInvitation(row: any): CanvasInvitation {
    return {
      id: row.id,
      canvasId: row.canvas_id,
      email: row.email,
      role: row.role,
      canInvite: row.can_invite,
      token: row.token,
      status: row.status,
      invitedBy: row.invited_by,
      acceptedBy: row.accepted_by,
      acceptedAt: row.accepted_at,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      message: row.message,
      createdAt: row.created_at,
    };
  }
}

// ==================
// Singleton Export
// ==================

export const CanvasPermissionService = new CanvasPermissionServiceClass();

export default CanvasPermissionService;
