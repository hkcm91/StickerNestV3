-- ============================================================================
-- StickerNest v2 - Canvas Permissions & Invitations
-- Migration: 006_canvas_permissions.sql
-- Description: Persistent per-user canvas access control and invitation system
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADDITIONAL ENUMS
-- ============================================================================

-- Invitation status
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'revoked');

-- Permission change types (for audit log)
CREATE TYPE permission_action AS ENUM (
  'invited',
  'accepted',
  'declined',
  'role_changed',
  'removed',
  'left',
  'revoked'
);

-- ============================================================================
-- SECTION 2: CANVAS COLLABORATORS TABLE
-- ============================================================================

-- Persistent per-user canvas permissions
-- This grants specific users access to private/unlisted canvases
CREATE TABLE canvas_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role collab_role NOT NULL DEFAULT 'viewer',

    -- Who granted this permission
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Can this user invite others?
    can_invite BOOLEAN DEFAULT FALSE,

    -- Can this user manage (change roles, remove) other collaborators?
    can_manage BOOLEAN DEFAULT FALSE,

    -- Notification preferences for this canvas
    notify_on_changes BOOLEAN DEFAULT TRUE,
    notify_on_comments BOOLEAN DEFAULT TRUE,

    -- Last activity tracking
    last_accessed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only have one permission entry per canvas
    UNIQUE(canvas_id, user_id)
);

-- ============================================================================
-- SECTION 3: CANVAS INVITATIONS TABLE
-- ============================================================================

-- Invitations to collaborate on a canvas
-- Supports both email invites and link-based invites
CREATE TABLE canvas_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,

    -- Invitation method: email OR token-based link
    -- If email is set, it's a direct invite to that email
    -- If email is NULL, it's a shareable link
    email TEXT,

    -- The role they'll receive upon accepting
    role collab_role NOT NULL DEFAULT 'viewer',

    -- Can they invite others once they join?
    can_invite BOOLEAN DEFAULT FALSE,

    -- Unique token for link-based invites
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

    -- Status tracking
    status invitation_status DEFAULT 'pending',

    -- Who created the invite
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- If accepted, who accepted it
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,

    -- Expiration (NULL = never expires)
    expires_at TIMESTAMPTZ,

    -- Max uses for link-based invites (NULL = unlimited)
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,

    -- Personal message to include in invite email
    message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: PERMISSION AUDIT LOG
-- ============================================================================

-- Track all permission changes for audit purposes
CREATE TABLE canvas_permission_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,

    -- Who was affected
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_email TEXT,

    -- What happened
    action permission_action NOT NULL,

    -- Role before/after (for role changes)
    old_role collab_role,
    new_role collab_role,

    -- Who performed the action
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Additional context
    metadata JSONB DEFAULT '{}',

    -- When it happened
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: INDEXES
-- ============================================================================

-- Canvas collaborators indexes
CREATE INDEX idx_canvas_collaborators_canvas_id ON canvas_collaborators(canvas_id);
CREATE INDEX idx_canvas_collaborators_user_id ON canvas_collaborators(user_id);
CREATE INDEX idx_canvas_collaborators_role ON canvas_collaborators(role);
CREATE INDEX idx_canvas_collaborators_canvas_user ON canvas_collaborators(canvas_id, user_id);

-- Canvas invitations indexes
CREATE INDEX idx_canvas_invitations_canvas_id ON canvas_invitations(canvas_id);
CREATE INDEX idx_canvas_invitations_email ON canvas_invitations(email);
CREATE INDEX idx_canvas_invitations_token ON canvas_invitations(token);
CREATE INDEX idx_canvas_invitations_status ON canvas_invitations(status);
CREATE INDEX idx_canvas_invitations_invited_by ON canvas_invitations(invited_by);
CREATE INDEX idx_canvas_invitations_pending ON canvas_invitations(canvas_id, status) WHERE status = 'pending';

-- Permission log indexes
CREATE INDEX idx_canvas_permission_log_canvas_id ON canvas_permission_log(canvas_id);
CREATE INDEX idx_canvas_permission_log_target_user ON canvas_permission_log(target_user_id);
CREATE INDEX idx_canvas_permission_log_created_at ON canvas_permission_log(created_at DESC);

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

-- Update updated_at on canvas_collaborators
CREATE TRIGGER update_canvas_collaborators_updated_at
    BEFORE UPDATE ON canvas_collaborators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on canvas_invitations
CREATE TRIGGER update_canvas_invitations_updated_at
    BEFORE UPDATE ON canvas_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user has access to a canvas
CREATE OR REPLACE FUNCTION user_has_canvas_access(
    p_user_id UUID,
    p_canvas_id UUID,
    p_min_role collab_role DEFAULT 'viewer'
) RETURNS BOOLEAN AS $$
DECLARE
    v_canvas_owner UUID;
    v_canvas_visibility canvas_visibility;
    v_user_role collab_role;
    v_role_order INTEGER;
    v_min_role_order INTEGER;
BEGIN
    -- Get canvas info
    SELECT user_id, visibility INTO v_canvas_owner, v_canvas_visibility
    FROM canvases WHERE id = p_canvas_id;

    -- Canvas doesn't exist
    IF v_canvas_owner IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Owner always has access
    IF v_canvas_owner = p_user_id THEN
        RETURN TRUE;
    END IF;

    -- Public canvases - everyone has viewer access
    IF v_canvas_visibility = 'public' AND p_min_role = 'viewer' THEN
        RETURN TRUE;
    END IF;

    -- Check explicit permissions
    SELECT role INTO v_user_role
    FROM canvas_collaborators
    WHERE canvas_id = p_canvas_id AND user_id = p_user_id;

    -- No explicit permission
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Role hierarchy: owner > editor > viewer
    -- Convert roles to numbers for comparison
    v_role_order := CASE v_user_role
        WHEN 'owner' THEN 3
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 1
    END;

    v_min_role_order := CASE p_min_role
        WHEN 'owner' THEN 3
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 1
    END;

    RETURN v_role_order >= v_min_role_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can edit a canvas
CREATE OR REPLACE FUNCTION user_can_edit_canvas(p_user_id UUID, p_canvas_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_has_canvas_access(p_user_id, p_canvas_id, 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a user's role on a canvas
CREATE OR REPLACE FUNCTION get_user_canvas_role(p_user_id UUID, p_canvas_id UUID)
RETURNS collab_role AS $$
DECLARE
    v_canvas_owner UUID;
    v_user_role collab_role;
BEGIN
    -- Check if user is owner
    SELECT user_id INTO v_canvas_owner FROM canvases WHERE id = p_canvas_id;
    IF v_canvas_owner = p_user_id THEN
        RETURN 'owner';
    END IF;

    -- Check explicit permissions
    SELECT role INTO v_user_role
    FROM canvas_collaborators
    WHERE canvas_id = p_canvas_id AND user_id = p_user_id;

    RETURN v_user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation
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

    -- Update invitation
    UPDATE canvas_invitations SET
        status = CASE
            WHEN email IS NOT NULL THEN 'accepted'
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

-- Function to get all collaborators for a canvas
CREATE OR REPLACE FUNCTION get_canvas_collaborators(p_canvas_id UUID)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role collab_role,
    can_invite BOOLEAN,
    can_manage BOOLEAN,
    granted_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    is_owner BOOLEAN
) AS $$
BEGIN
    -- Return owner first
    RETURN QUERY
    SELECT
        c.user_id,
        up.username,
        up.display_name,
        up.avatar_url,
        'owner'::collab_role AS role,
        TRUE AS can_invite,
        TRUE AS can_manage,
        c.created_at AS granted_at,
        c.updated_at AS last_accessed_at,
        TRUE AS is_owner
    FROM canvases c
    JOIN user_profiles up ON up.user_id = c.user_id
    WHERE c.id = p_canvas_id;

    -- Then return collaborators
    RETURN QUERY
    SELECT
        cc.user_id,
        up.username,
        up.display_name,
        up.avatar_url,
        cc.role,
        cc.can_invite,
        cc.can_manage,
        cc.granted_at,
        cc.last_accessed_at,
        FALSE AS is_owner
    FROM canvas_collaborators cc
    JOIN user_profiles up ON up.user_id = cc.user_id
    WHERE cc.canvas_id = p_canvas_id
    ORDER BY cc.role DESC, cc.granted_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE canvas_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_permission_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CANVAS COLLABORATORS POLICIES
-- ============================================================================

-- Users can view collaborators of canvases they have access to
CREATE POLICY "View collaborators on accessible canvases"
    ON canvas_collaborators FOR SELECT
    USING (
        -- User is the collaborator
        auth.uid() = user_id
        OR
        -- User is the canvas owner
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_collaborators.canvas_id
            AND canvases.user_id = auth.uid()
        )
        OR
        -- User is a collaborator on this canvas
        EXISTS (
            SELECT 1 FROM canvas_collaborators cc2
            WHERE cc2.canvas_id = canvas_collaborators.canvas_id
            AND cc2.user_id = auth.uid()
        )
    );

-- Canvas owners can add collaborators
CREATE POLICY "Owners can add collaborators"
    ON canvas_collaborators FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_collaborators.canvas_id
            AND canvases.user_id = auth.uid()
        )
        OR
        -- Collaborators with can_invite permission
        EXISTS (
            SELECT 1 FROM canvas_collaborators cc2
            WHERE cc2.canvas_id = canvas_collaborators.canvas_id
            AND cc2.user_id = auth.uid()
            AND cc2.can_invite = TRUE
        )
    );

-- Canvas owners and managers can update collaborators
CREATE POLICY "Owners and managers can update collaborators"
    ON canvas_collaborators FOR UPDATE
    USING (
        -- Canvas owner
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_collaborators.canvas_id
            AND canvases.user_id = auth.uid()
        )
        OR
        -- Collaborators with can_manage permission
        EXISTS (
            SELECT 1 FROM canvas_collaborators cc2
            WHERE cc2.canvas_id = canvas_collaborators.canvas_id
            AND cc2.user_id = auth.uid()
            AND cc2.can_manage = TRUE
        )
    );

-- Canvas owners and managers can remove collaborators, users can remove themselves
CREATE POLICY "Owners can remove collaborators, users can leave"
    ON canvas_collaborators FOR DELETE
    USING (
        -- Self-removal (leaving)
        auth.uid() = user_id
        OR
        -- Canvas owner
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_collaborators.canvas_id
            AND canvases.user_id = auth.uid()
        )
        OR
        -- Collaborators with can_manage permission
        EXISTS (
            SELECT 1 FROM canvas_collaborators cc2
            WHERE cc2.canvas_id = canvas_collaborators.canvas_id
            AND cc2.user_id = auth.uid()
            AND cc2.can_manage = TRUE
        )
    );

-- ============================================================================
-- CANVAS INVITATIONS POLICIES
-- ============================================================================

-- Anyone can view an invitation by token (for accepting)
CREATE POLICY "View invitation by token"
    ON canvas_invitations FOR SELECT
    USING (
        -- Anyone can check an invitation by token (needed for accept flow)
        TRUE
    );

-- Canvas owners and inviters can create invitations
CREATE POLICY "Owners and inviters can create invitations"
    ON canvas_invitations FOR INSERT
    WITH CHECK (
        auth.uid() = invited_by
        AND (
            -- Canvas owner
            EXISTS (
                SELECT 1 FROM canvases
                WHERE canvases.id = canvas_invitations.canvas_id
                AND canvases.user_id = auth.uid()
            )
            OR
            -- Collaborator with can_invite permission
            EXISTS (
                SELECT 1 FROM canvas_collaborators
                WHERE canvas_collaborators.canvas_id = canvas_invitations.canvas_id
                AND canvas_collaborators.user_id = auth.uid()
                AND canvas_collaborators.can_invite = TRUE
            )
        )
    );

-- Canvas owners can update/revoke invitations
CREATE POLICY "Owners can update invitations"
    ON canvas_invitations FOR UPDATE
    USING (
        -- Original inviter
        auth.uid() = invited_by
        OR
        -- Canvas owner
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_invitations.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

-- Canvas owners can delete invitations
CREATE POLICY "Owners can delete invitations"
    ON canvas_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_invitations.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

-- ============================================================================
-- PERMISSION LOG POLICIES
-- ============================================================================

-- Canvas owners and collaborators can view permission logs
CREATE POLICY "View permission logs for accessible canvases"
    ON canvas_permission_log FOR SELECT
    USING (
        -- Canvas owner
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_permission_log.canvas_id
            AND canvases.user_id = auth.uid()
        )
        OR
        -- Collaborator on this canvas
        EXISTS (
            SELECT 1 FROM canvas_collaborators
            WHERE canvas_collaborators.canvas_id = canvas_permission_log.canvas_id
            AND canvas_collaborators.user_id = auth.uid()
        )
    );

-- Only system functions can insert logs (via SECURITY DEFINER functions)
-- No direct insert policy needed as the accept_canvas_invitation function handles it

-- ============================================================================
-- SECTION 9: UPDATE EXISTING CANVAS POLICIES
-- ============================================================================

-- Drop and recreate canvas policies to include collaborator access

-- Drop existing policies that need modification
DROP POLICY IF EXISTS "Public canvases are viewable by everyone" ON canvases;
DROP POLICY IF EXISTS "Users can update own canvases" ON canvases;

-- Recreate with collaborator support
CREATE POLICY "Canvases viewable by owner, collaborators, or if public/unlisted"
    ON canvases FOR SELECT
    USING (
        visibility = 'public'
        OR visibility = 'unlisted'
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM canvas_collaborators
            WHERE canvas_collaborators.canvas_id = canvases.id
            AND canvas_collaborators.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and editors can update canvases"
    ON canvases FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM canvas_collaborators
            WHERE canvas_collaborators.canvas_id = canvases.id
            AND canvas_collaborators.user_id = auth.uid()
            AND canvas_collaborators.role IN ('editor', 'owner')
        )
    );

-- Update widget policies to include collaborator access
DROP POLICY IF EXISTS "Canvas owners can manage widgets" ON widget_instances;

CREATE POLICY "Owners and editors can manage widgets"
    ON widget_instances FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = widget_instances.canvas_id
            AND (
                canvases.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM canvas_collaborators
                    WHERE canvas_collaborators.canvas_id = canvases.id
                    AND canvas_collaborators.user_id = auth.uid()
                    AND canvas_collaborators.role IN ('editor', 'owner')
                )
            )
        )
    );

-- ============================================================================
-- DONE!
-- ============================================================================
