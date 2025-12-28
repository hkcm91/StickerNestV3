-- =====================================================
-- StickerNest v2 - Username-Based Invitations
-- Migration: 007_username_invitations.sql
--
-- Adds support for inviting users by username/user_id
-- =====================================================

-- Add target_user_id column for direct user invitations
ALTER TABLE canvas_invitations
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id);

-- Add index for efficient user-specific invitation lookups
CREATE INDEX IF NOT EXISTS idx_canvas_invitations_target_user
  ON canvas_invitations(target_user_id)
  WHERE target_user_id IS NOT NULL;

-- Update the accept_canvas_invitation function to handle username invites
CREATE OR REPLACE FUNCTION accept_canvas_invitation(
    p_token TEXT,
    p_user_id UUID
) RETURNS TABLE(
    success BOOLEAN,
    canvas_id UUID,
    role collab_role,
    error_message TEXT
) AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Find the invitation
    SELECT * INTO v_invitation
    FROM canvas_invitations
    WHERE token = p_token;

    -- Check if invitation exists
    IF v_invitation.id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::collab_role, 'Invitation not found'::TEXT;
        RETURN;
    END IF;

    -- Check if already used/expired/revoked
    IF v_invitation.status != 'pending' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::collab_role,
            ('Invitation has been ' || v_invitation.status::TEXT)::TEXT;
        RETURN;
    END IF;

    -- Check expiration
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
        UPDATE canvas_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::collab_role, 'Invitation has expired'::TEXT;
        RETURN;
    END IF;

    -- Check max uses
    IF v_invitation.max_uses IS NOT NULL AND v_invitation.use_count >= v_invitation.max_uses THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::collab_role, 'Invitation has reached maximum uses'::TEXT;
        RETURN;
    END IF;

    -- Check if email-specific and matches
    IF v_invitation.email IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = p_user_id AND email = v_invitation.email
        ) THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, NULL::collab_role, 'This invitation is for a different email address'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Check if user-specific (username invite) and matches
    IF v_invitation.target_user_id IS NOT NULL THEN
        IF v_invitation.target_user_id != p_user_id THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, NULL::collab_role, 'This invitation is for a different user'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Check if user already has access
    IF EXISTS (
        SELECT 1 FROM canvas_collaborators
        WHERE canvas_id = v_invitation.canvas_id AND user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT FALSE, v_invitation.canvas_id, NULL::collab_role, 'You already have access to this canvas'::TEXT;
        RETURN;
    END IF;

    -- Check if user is the owner
    IF EXISTS (
        SELECT 1 FROM canvases
        WHERE id = v_invitation.canvas_id AND user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT FALSE, v_invitation.canvas_id, 'owner'::collab_role, 'You are the owner of this canvas'::TEXT;
        RETURN;
    END IF;

    -- Add as collaborator
    INSERT INTO canvas_collaborators (
        canvas_id, user_id, role, granted_by, can_invite
    ) VALUES (
        v_invitation.canvas_id,
        p_user_id,
        v_invitation.role,
        v_invitation.invited_by,
        v_invitation.can_invite
    );

    -- Update invitation (user-specific invites become 'accepted' like email invites)
    UPDATE canvas_invitations SET
        status = CASE
            WHEN email IS NOT NULL OR target_user_id IS NOT NULL THEN 'accepted'
            ELSE status -- Link-based invites stay pending for reuse
        END,
        use_count = use_count + 1,
        accepted_by = p_user_id,
        accepted_at = NOW()
    WHERE id = v_invitation.id;

    -- Log the action
    INSERT INTO canvas_permission_log (
        canvas_id, target_user_id, action, new_role, actor_id,
        metadata
    ) VALUES (
        v_invitation.canvas_id,
        p_user_id,
        'accepted',
        v_invitation.role,
        p_user_id,
        jsonb_build_object('invitation_id', v_invitation.id)
    );

    RETURN QUERY SELECT TRUE, v_invitation.canvas_id, v_invitation.role, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for users to see invitations targeted at them
CREATE POLICY IF NOT EXISTS "Users can view invitations for them"
    ON canvas_invitations FOR SELECT
    USING (target_user_id = auth.uid());
