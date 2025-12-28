-- StickerNest V2 - Canvas Features Migration
-- Adds canvas size, password protection, and sharing enhancements

-- Add canvas dimensions and enhanced sharing fields to canvases table
ALTER TABLE canvases
ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 1920,
ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 1080,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS background_config JSONB DEFAULT '{"type": "color", "color": "#0f0f19"}';

-- Create unique index on slug for URL sharing
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvases_slug ON canvases(slug) WHERE slug IS NOT NULL;

-- Add RLS policy for unlisted canvases (accessed via slug)
DROP POLICY IF EXISTS "Users can view unlisted canvases via slug" ON canvases;
CREATE POLICY "Users can view unlisted canvases via slug"
    ON canvases FOR SELECT
    USING (visibility = 'unlisted' AND slug IS NOT NULL);

-- Function to generate a random slug
CREATE OR REPLACE FUNCTION generate_canvas_slug()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create canvas_access table for password-protected canvas sessions
CREATE TABLE IF NOT EXISTS canvas_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_canvas_access_canvas_id ON canvas_access(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_access_session_token ON canvas_access(session_token);

-- Cleanup expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_canvas_access()
RETURNS void AS $$
BEGIN
    DELETE FROM canvas_access WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS for canvas_access
ALTER TABLE canvas_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create access sessions"
    ON canvas_access FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can view their own sessions"
    ON canvas_access FOR SELECT
    USING (true);

-- Canvas size presets reference table (optional, for UI reference)
CREATE TABLE IF NOT EXISTS canvas_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    display_order INTEGER DEFAULT 0
);

-- Insert default presets
INSERT INTO canvas_presets (id, name, width, height, category, display_order) VALUES
    ('hd', 'HD (1920x1080)', 1920, 1080, 'screen', 1),
    ('qhd', 'QHD (2560x1440)', 2560, 1440, 'screen', 2),
    ('4k', '4K UHD (3840x2160)', 3840, 2160, 'screen', 3),
    ('portrait-hd', 'Portrait HD (1080x1920)', 1080, 1920, 'screen', 4),
    ('square', 'Square (1080x1080)', 1080, 1080, 'social', 10),
    ('instagram-post', 'Instagram Post (1080x1350)', 1080, 1350, 'social', 11),
    ('instagram-story', 'Instagram Story (1080x1920)', 1080, 1920, 'social', 12),
    ('facebook-cover', 'Facebook Cover (820x312)', 820, 312, 'social', 13),
    ('twitter-header', 'Twitter Header (1500x500)', 1500, 500, 'social', 14),
    ('youtube-thumbnail', 'YouTube Thumbnail (1280x720)', 1280, 720, 'social', 15),
    ('og-image', 'OG Image (1200x630)', 1200, 630, 'social', 16),
    ('a4-portrait', 'A4 Portrait (2480x3508)', 2480, 3508, 'print', 20),
    ('a4-landscape', 'A4 Landscape (3508x2480)', 3508, 2480, 'print', 21),
    ('letter-portrait', 'Letter Portrait (2550x3300)', 2550, 3300, 'print', 22),
    ('poster-24x36', 'Poster 24x36 (7200x10800)', 7200, 10800, 'print', 23),
    ('business-card', 'Business Card (1050x600)', 1050, 600, 'print', 24)
ON CONFLICT (id) DO NOTHING;

-- Add comment explaining the schema
COMMENT ON TABLE canvases IS 'User canvases with support for custom sizes, password protection, and URL sharing';
COMMENT ON COLUMN canvases.password_hash IS 'Bcrypt hash of password for password-protected canvases. NULL means no password.';
COMMENT ON COLUMN canvases.slug IS 'URL-friendly identifier for sharing. Can be custom or auto-generated.';
COMMENT ON COLUMN canvases.visibility IS 'private=owner only, unlisted=anyone with link, public=discoverable';
