-- StickerNest V2 - Invite Codes Migration
-- Adds invite code system for controlled signups

-- ==================
-- Invite Codes Table
-- ==================
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;

-- ==================
-- Invite Code Redemptions Table
-- Track who used which code
-- ==================
CREATE TABLE IF NOT EXISTS invite_code_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(invite_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_code_redemptions_code ON invite_code_redemptions(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_code_redemptions_user ON invite_code_redemptions(user_id);

-- ==================
-- RLS Policies
-- ==================
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Anyone can validate invite codes (for signup flow)
CREATE POLICY "Anyone can read active invite codes"
    ON invite_codes FOR SELECT
    USING (is_active = true);

-- Only admins can manage invite codes (we'll use a service role for this)
CREATE POLICY "Admins can manage invite codes"
    ON invite_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Users can see their own redemptions
CREATE POLICY "Users can see own redemptions"
    ON invite_code_redemptions FOR SELECT
    USING (user_id = auth.uid());

-- ==================
-- Functions
-- ==================

-- Function to validate and use an invite code
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS TABLE(valid BOOLEAN, code_id UUID, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code invite_codes%ROWTYPE;
BEGIN
    -- Find the code
    SELECT * INTO v_code
    FROM invite_codes
    WHERE code = UPPER(TRIM(p_code))
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid invite code'::TEXT;
        RETURN;
    END IF;

    -- Check expiration
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invite code has expired'::TEXT;
        RETURN;
    END IF;

    -- Check max uses
    IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invite code has reached maximum uses'::TEXT;
        RETURN;
    END IF;

    -- Valid!
    RETURN QUERY SELECT true, v_code.id, NULL::TEXT;
END;
$$;

-- Function to redeem an invite code (call after successful signup)
CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_id UUID;
    v_valid BOOLEAN;
BEGIN
    -- Validate the code first
    SELECT valid, code_id INTO v_valid, v_code_id
    FROM validate_invite_code(p_code);

    IF NOT v_valid OR v_code_id IS NULL THEN
        RETURN false;
    END IF;

    -- Record the redemption
    INSERT INTO invite_code_redemptions (invite_code_id, user_id)
    VALUES (v_code_id, p_user_id)
    ON CONFLICT (invite_code_id, user_id) DO NOTHING;

    -- Increment uses count
    UPDATE invite_codes
    SET uses_count = uses_count + 1
    WHERE id = v_code_id;

    RETURN true;
END;
$$;

-- Function to generate an invite code (for admins)
CREATE OR REPLACE FUNCTION generate_invite_code(
    p_max_uses INTEGER DEFAULT 1,
    p_expires_in_days INTEGER DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Generate a random 8-character code
    v_code := UPPER(
        substr(md5(random()::text || clock_timestamp()::text), 1, 4) ||
        '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 5, 4)
    );

    -- Calculate expiration
    IF p_expires_in_days IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
    END IF;

    -- Insert the code
    INSERT INTO invite_codes (code, max_uses, expires_at, note, created_by)
    VALUES (v_code, p_max_uses, v_expires_at, p_note, auth.uid());

    RETURN v_code;
END;
$$;

-- ==================
-- Seed some initial invite codes for testing
-- ==================
INSERT INTO invite_codes (code, max_uses, note, is_active)
VALUES
    ('BETA-2024', 100, 'Beta testing code', true),
    ('EARLY-BIRD', 50, 'Early adopter code', true),
    ('FOUNDER-VIP', NULL, 'Unlimited founder code', true)
ON CONFLICT (code) DO NOTHING;
