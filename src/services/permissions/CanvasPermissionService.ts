/**
 * StickerNest v2 - Canvas Permission Service
 * Manages canvas access control, collaborators, and invitations.
 */

import { supabaseClient, isLocalDevMode } from '../supabaseClient';
import type {
  CollabRole,
  Collaborator,
  CanvasInvitation,
  InviteOptions,
  PermissionCheckResult,
  ServiceResult,
  SharedCanvas,
  PendingInvitationWithDetails,
  InvitationDetails,
  AcceptInvitationResult,
} from './types';
import { NO_ACCESS, FULL_ACCESS } from './types';

class CanvasPermissionServiceClass {
  private get supabase() {
    if (isLocalDevMode || !supabaseClient) return null;
    return supabaseClient;
  }

  // ==================
  // Access Control
  // ==================

  async checkAccess(canvasId: string): Promise<PermissionCheckResult> {
    if (!this.supabase) return FULL_ACCESS;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return NO_ACCESS;

      const { data: canvas } = await this.supabase
        .from('canvases')
        .select('user_id, visibility')
        .eq('id', canvasId)
        .single();

      // If canvas not in DB, user is creating a new canvas - grant full access
      // (they're the de-facto owner until it's saved)
      if (!canvas) {
        return FULL_ACCESS;
      }

      // Owner has full access
      if (canvas.user_id === user.id) return FULL_ACCESS;

      // Check collaborator permissions
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

      // Public/unlisted canvases have viewer access
      if (canvas.visibility === 'public' || canvas.visibility === 'unlisted') {
        return { hasAccess: true, role: 'viewer', canEdit: false, canInvite: false, canManage: false, isOwner: false };
      }

      return NO_ACCESS;
    } catch (error) {
      console.error('[CanvasPermissionService] Error checking access:', error);
      return NO_ACCESS;
    }
  }

  // ==================
  // Collaborator Methods
  // ==================

  async getCollaborators(canvasId: string): Promise<ServiceResult<Collaborator[]>> {
    if (!this.supabase) return { success: true, data: [] };

    try {
      const { data, error } = await this.supabase.rpc('get_canvas_collaborators', { p_canvas_id: canvasId });
      if (error) return { success: false, error: error.message };

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
        grantedBy: null,
        lastAccessedAt: row.last_accessed_at,
        isOwner: row.is_owner,
      }));

      return { success: true, data: collaborators };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async addCollaborator(
    canvasId: string,
    userId: string,
    role: CollabRole = 'viewer',
    options: { canInvite?: boolean; canManage?: boolean } = {}
  ): Promise<ServiceResult<void>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await this.supabase.from('canvas_collaborators').insert({
        canvas_id: canvasId,
        user_id: userId,
        role,
        granted_by: user.id,
        can_invite: options.canInvite ?? false,
        can_manage: options.canManage ?? false,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateCollaborator(
    canvasId: string,
    userId: string,
    updates: { role?: CollabRole; canInvite?: boolean; canManage?: boolean }
  ): Promise<ServiceResult<void>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

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

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removeCollaborator(canvasId: string, userId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { error } = await this.supabase
        .from('canvas_collaborators')
        .delete()
        .eq('canvas_id', canvasId)
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async leaveCanvas(canvasId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };
      return this.removeCollaborator(canvasId, user.id);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ==================
  // Invitation Methods
  // ==================

  async createInvitation(canvasId: string, options: InviteOptions): Promise<ServiceResult<CanvasInvitation>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await this.supabase.from('canvas_invitations').insert({
        canvas_id: canvasId,
        email: options.email || null,
        target_user_id: options.targetUserId || null,
        role: options.role,
        can_invite: options.canInvite ?? false,
        invited_by: user.id,
        expires_at: options.expiresAt?.toISOString() || null,
        max_uses: options.maxUses || null,
        message: options.message || null,
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapInvitation(data) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getInvitations(canvasId: string): Promise<ServiceResult<CanvasInvitation[]>> {
    if (!this.supabase) return { success: true, data: [] };

    try {
      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .select(`*, inviter:invited_by(username, display_name), target_user:target_user_id(username, display_name)`)
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };

      const invitations = data.map((row: any) => ({
        ...this.mapInvitation(row),
        inviterName: row.inviter?.display_name || row.inviter?.username || 'Unknown',
      }));

      return { success: true, data: invitations };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getInvitationByToken(token: string): Promise<ServiceResult<InvitationDetails>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .select(`*, canvas:canvas_id(id, name, thumbnail_url), inviter:invited_by(username, display_name, avatar_url)`)
        .eq('token', token)
        .single();

      if (error || !data) return { success: false, error: error?.message || 'Invitation not found' };

      return {
        success: true,
        data: {
          invitation: this.mapInvitation(data),
          canvas: { id: data.canvas?.id, name: data.canvas?.name || 'Unknown Canvas', thumbnailUrl: data.canvas?.thumbnail_url },
          inviter: { username: data.inviter?.username, displayName: data.inviter?.display_name, avatarUrl: data.inviter?.avatar_url },
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async acceptInvitation(token: string): Promise<ServiceResult<AcceptInvitationResult>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await this.supabase.rpc('accept_canvas_invitation', { p_token: token, p_user_id: user.id });
      if (error) return { success: false, error: error.message };

      const result = data[0];
      if (!result.success) return { success: false, error: result.error_message };

      return { success: true, data: { canvasId: result.canvas_id, role: result.role } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async revokeInvitation(invitationId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { error } = await this.supabase.from('canvas_invitations').update({ status: 'revoked' }).eq('id', invitationId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteInvitation(invitationId: string): Promise<ServiceResult<void>> {
    if (!this.supabase) return { success: false, error: 'Not available in local dev mode' };

    try {
      const { error } = await this.supabase.from('canvas_invitations').delete().eq('id', invitationId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  generateInviteLink(token: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://stickernest.com';
    return `${baseUrl}/invite/${token}`;
  }

  // ==================
  // Shared Canvas Methods
  // ==================

  async getSharedCanvases(): Promise<ServiceResult<SharedCanvas[]>> {
    if (!this.supabase) return { success: true, data: [] };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await this.supabase
        .from('canvas_collaborators')
        .select(`role, granted_at, canvas:canvas_id(id, name, thumbnail_url, owner:user_id(username, display_name))`)
        .eq('user_id', user.id)
        .order('granted_at', { ascending: false });

      if (error) return { success: false, error: error.message };

      const sharedCanvases: SharedCanvas[] = data.map((row: any) => ({
        canvasId: row.canvas.id,
        canvasName: row.canvas.name,
        role: row.role,
        ownerName: row.canvas.owner?.display_name || row.canvas.owner?.username || 'Unknown',
        thumbnailUrl: row.canvas.thumbnail_url,
        grantedAt: row.granted_at,
      }));

      return { success: true, data: sharedCanvases };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getMyPendingInvitations(): Promise<ServiceResult<PendingInvitationWithDetails[]>> {
    if (!this.supabase) return { success: true, data: [] };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Query for invitations by email OR by target_user_id
      const { data, error } = await this.supabase
        .from('canvas_invitations')
        .select(`*, canvas:canvas_id(name), inviter:invited_by(username, display_name)`)
        .or(`email.eq.${user.email},target_user_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };

      const invitations: PendingInvitationWithDetails[] = data.map((row: any) => ({
        invitation: this.mapInvitation(row),
        canvasName: row.canvas?.name || 'Unknown Canvas',
        inviterName: row.inviter?.display_name || row.inviter?.username || 'Unknown',
      }));

      return { success: true, data: invitations };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
      targetUserId: row.target_user_id,
      targetUsername: row.target_user?.username || null,
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

export const CanvasPermissionService = new CanvasPermissionServiceClass();
export default CanvasPermissionService;
