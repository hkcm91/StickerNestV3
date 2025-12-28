-- Migration: 005_social_messaging.sql
-- Author: AI Assistant
-- Date: 2025-12-26
-- Description: Add missing social tables for chat, blocks, comments, and DMs
--              Designed for scale (10K+ concurrent users) with enterprise-grade security
--
-- ROLLBACK INSTRUCTIONS:
-- To undo this migration, run the commands in the ROLLBACK section at bottom

-- =============================================
-- FORWARD MIGRATION
-- =============================================

BEGIN;

-- =============================================
-- 1. HELPER FUNCTIONS
-- =============================================

-- Check if two users have blocked each other
CREATE OR REPLACE FUNCTION public.is_blocked(user1 UUID, user2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = user1 AND blocked_id = user2)
           OR (blocker_id = user2 AND blocked_id = user1)
    )
$$;

-- =============================================
-- 2. BLOCKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT CHECK (reason IS NULL OR reason IN ('spam', 'harassment', 'inappropriate', 'other')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)  -- Cannot block yourself
);

-- Indexes for efficient lookups
CREATE INDEX idx_blocks_blocked_id ON public.blocks(blocked_id);
CREATE INDEX idx_blocks_blocker_id ON public.blocks(blocker_id);

-- Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only blocker can see/manage their blocks
CREATE POLICY "blocks_select_own"
ON public.blocks FOR SELECT
TO authenticated
USING (blocker_id = (SELECT auth.uid()));

CREATE POLICY "blocks_insert_own"
ON public.blocks FOR INSERT
TO authenticated
WITH CHECK (blocker_id = (SELECT auth.uid()));

CREATE POLICY "blocks_delete_own"
ON public.blocks FOR DELETE
TO authenticated
USING (blocker_id = (SELECT auth.uid()));

-- =============================================
-- 3. CHAT MESSAGES TABLE (Canvas-based chat)
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    canvas_id TEXT NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
    reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ  -- Soft delete for moderation
);

-- Performance indexes
CREATE INDEX idx_chat_messages_canvas_id
ON public.chat_messages(canvas_id, created_at DESC);

CREATE INDEX idx_chat_messages_user_id
ON public.chat_messages(user_id);

CREATE INDEX idx_chat_messages_reply_to
ON public.chat_messages(reply_to)
WHERE reply_to IS NOT NULL;

-- Partial index for active messages only
CREATE INDEX idx_chat_messages_active
ON public.chat_messages(canvas_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "chat_select_canvas_access"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND canvas_id IN (
        SELECT id FROM public.canvases
        WHERE user_id = (SELECT auth.uid())
           OR visibility IN ('public', 'unlisted')
    )
    AND NOT public.is_blocked((SELECT auth.uid()), user_id)
);

CREATE POLICY "chat_insert_authenticated"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND canvas_id IN (
        SELECT id FROM public.canvases
        WHERE user_id = (SELECT auth.uid())
           OR visibility IN ('public', 'unlisted')
    )
);

CREATE POLICY "chat_update_own"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "chat_delete_own"
ON public.chat_messages FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Auto-update timestamp trigger
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. COMMENTS TABLE (Polymorphic - any target)
-- =============================================

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('canvas', 'widget', 'activity', 'profile')),
    target_id TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
    upvotes INTEGER DEFAULT 0 CHECK (upvotes >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX idx_comments_target
ON public.comments(target_type, target_id, created_at DESC);

CREATE INDEX idx_comments_user_id
ON public.comments(user_id);

CREATE INDEX idx_comments_parent_id
ON public.comments(parent_id)
WHERE parent_id IS NOT NULL;

-- Partial index for active comments
CREATE INDEX idx_comments_active
ON public.comments(target_type, target_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "comments_select_public"
ON public.comments FOR SELECT
USING (
    deleted_at IS NULL
    AND NOT public.is_blocked((SELECT auth.uid()), user_id)
);

CREATE POLICY "comments_insert_authenticated"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "comments_update_own"
ON public.comments FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "comments_delete_own"
ON public.comments FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Auto-update timestamp trigger
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. DM CONVERSATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.dm_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    last_message_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user1_id, user2_id),
    CHECK (user1_id < user2_id)  -- Canonical ordering prevents duplicates
);

-- Index for user's conversations
CREATE INDEX idx_dm_conversations_user1
ON public.dm_conversations(user1_id, last_message_at DESC);

CREATE INDEX idx_dm_conversations_user2
ON public.dm_conversations(user2_id, last_message_at DESC);

-- Enable RLS
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only participants can see/manage
CREATE POLICY "dm_conversations_select_participant"
ON public.dm_conversations FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) IN (user1_id, user2_id)
);

CREATE POLICY "dm_conversations_insert_participant"
ON public.dm_conversations FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IN (user1_id, user2_id)
    AND NOT public.is_blocked(user1_id, user2_id)
);

CREATE POLICY "dm_conversations_update_participant"
ON public.dm_conversations FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) IN (user1_id, user2_id)
);

-- =============================================
-- 6. DM MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.dm_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX idx_dm_messages_conversation
ON public.dm_messages(conversation_id, created_at DESC);

CREATE INDEX idx_dm_messages_sender
ON public.dm_messages(sender_id);

-- Partial index for unread messages
CREATE INDEX idx_dm_messages_unread
ON public.dm_messages(conversation_id, created_at DESC)
WHERE read_at IS NULL AND deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only conversation participants can see/manage
CREATE POLICY "dm_messages_select_participant"
ON public.dm_messages FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND conversation_id IN (
        SELECT id FROM public.dm_conversations
        WHERE (SELECT auth.uid()) IN (user1_id, user2_id)
    )
);

CREATE POLICY "dm_messages_insert_sender"
ON public.dm_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND conversation_id IN (
        SELECT id FROM public.dm_conversations
        WHERE (SELECT auth.uid()) IN (user1_id, user2_id)
    )
);

CREATE POLICY "dm_messages_update_sender"
ON public.dm_messages FOR UPDATE
TO authenticated
USING (sender_id = (SELECT auth.uid()));

CREATE POLICY "dm_messages_delete_sender"
ON public.dm_messages FOR DELETE
TO authenticated
USING (sender_id = (SELECT auth.uid()));

-- =============================================
-- 7. HELPER FUNCTIONS FOR DMs
-- =============================================

-- Get or create a DM conversation with another user
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(other_user UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    my_id UUID := auth.uid();
    conv_id UUID;
    u1 UUID;
    u2 UUID;
BEGIN
    -- Validate input
    IF my_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF my_id = other_user THEN
        RAISE EXCEPTION 'Cannot start conversation with yourself';
    END IF;

    -- Check if blocked
    IF public.is_blocked(my_id, other_user) THEN
        RAISE EXCEPTION 'Cannot message this user';
    END IF;

    -- Canonical ordering (user1_id < user2_id)
    IF my_id < other_user THEN
        u1 := my_id; u2 := other_user;
    ELSE
        u1 := other_user; u2 := my_id;
    END IF;

    -- Get existing or create new
    SELECT id INTO conv_id
    FROM public.dm_conversations
    WHERE user1_id = u1 AND user2_id = u2;

    IF conv_id IS NULL THEN
        INSERT INTO public.dm_conversations (user1_id, user2_id)
        VALUES (u1, u2)
        RETURNING id INTO conv_id;
    END IF;

    RETURN conv_id;
END;
$$;

-- Update conversation preview when new message is sent
CREATE OR REPLACE FUNCTION public.update_dm_conversation_preview()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.dm_conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100)
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dm_message_update_preview
    AFTER INSERT ON public.dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_dm_conversation_preview();

-- =============================================
-- 8. NOTIFICATION TRIGGERS
-- =============================================

-- Create notification when someone sends a DM
CREATE OR REPLACE FUNCTION public.create_dm_notification()
RETURNS TRIGGER AS $$
DECLARE
    recipient UUID;
    conv RECORD;
BEGIN
    -- Get conversation details
    SELECT * INTO conv FROM public.dm_conversations WHERE id = NEW.conversation_id;

    -- Determine recipient (the other user)
    IF conv.user1_id = NEW.sender_id THEN
        recipient := conv.user2_id;
    ELSE
        recipient := conv.user1_id;
    END IF;

    -- Create notification
    INSERT INTO public.notifications (recipient_id, actor_id, type, metadata)
    VALUES (
        recipient,
        NEW.sender_id,
        'dm',
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'preview', LEFT(NEW.content, 50)
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dm_create_notification
    AFTER INSERT ON public.dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.create_dm_notification();

-- Create notification when someone comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_owner UUID;
BEGIN
    -- Get target owner based on target_type
    IF NEW.target_type = 'canvas' THEN
        SELECT user_id INTO target_owner FROM public.canvases WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'activity' THEN
        SELECT actor_id INTO target_owner FROM public.activities WHERE id::text = NEW.target_id;
    END IF;

    -- Don't notify yourself
    IF target_owner IS NOT NULL AND target_owner != NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, metadata)
        VALUES (
            target_owner,
            NEW.user_id,
            'comment',
            jsonb_build_object(
                'target_type', NEW.target_type,
                'target_id', NEW.target_id,
                'comment_id', NEW.id,
                'preview', LEFT(NEW.content, 50)
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_create_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_comment_notification();

-- =============================================
-- 9. REALTIME CONFIGURATION
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
-- Note: blocks and dm_conversations should NOT be realtime

-- =============================================
-- 10. GRANT PERMISSIONS
-- =============================================

-- Ensure authenticated users can call helper functions
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(UUID) TO authenticated;

COMMIT;

-- =============================================
-- ROLLBACK (run manually if needed)
-- =============================================
/*
BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS on_dm_message_update_preview ON public.dm_messages;
DROP TRIGGER IF EXISTS on_dm_create_notification ON public.dm_messages;
DROP TRIGGER IF EXISTS on_comment_create_notification ON public.comments;
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

-- Drop functions
DROP FUNCTION IF EXISTS public.create_dm_notification() CASCADE;
DROP FUNCTION IF EXISTS public.create_comment_notification() CASCADE;
DROP FUNCTION IF EXISTS public.update_dm_conversation_preview() CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_dm_conversation(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_blocked(UUID, UUID) CASCADE;

-- Drop tables (CASCADE drops policies and indexes)
DROP TABLE IF EXISTS public.dm_messages CASCADE;
DROP TABLE IF EXISTS public.dm_conversations CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;

COMMIT;
*/
