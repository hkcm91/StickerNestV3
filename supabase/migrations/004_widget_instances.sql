-- StickerNest V2 - Widget Instances Migration
-- Adds database persistence for widget instance state, position, size, and configuration
-- This enables widget state to survive page refreshes and device switches

-- Create widget_instances table for persisting widget state
CREATE TABLE IF NOT EXISTS widget_instances (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    widget_def_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Position and size
    position_x NUMERIC NOT NULL DEFAULT 100,
    position_y NUMERIC NOT NULL DEFAULT 100,
    width NUMERIC NOT NULL DEFAULT 320,
    height NUMERIC NOT NULL DEFAULT 240,
    rotation NUMERIC NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 1,

    -- Display properties
    visible BOOLEAN DEFAULT true,
    locked BOOLEAN DEFAULT false,
    opacity NUMERIC DEFAULT 1,
    scale_mode TEXT DEFAULT 'contain',

    -- Widget internal state (arbitrary JSON)
    state JSONB DEFAULT '{}',

    -- Mobile-specific layout overrides
    mobile_layout JSONB DEFAULT NULL,

    -- Metadata and content (for AI-generated widgets)
    metadata JSONB DEFAULT NULL,

    -- Additional configuration
    size_preset TEXT DEFAULT 'md',
    version TEXT,
    name TEXT,
    group_id TEXT,
    parent_id TEXT,
    is_container BOOLEAN DEFAULT false,
    child_ids TEXT[],

    -- Content sizing
    content_width NUMERIC,
    content_height NUMERIC,

    -- Transform properties
    flip_x BOOLEAN DEFAULT false,
    flip_y BOOLEAN DEFAULT false,
    aspect_locked BOOLEAN DEFAULT false,

    -- Crop settings
    crop_top NUMERIC DEFAULT 0,
    crop_right NUMERIC DEFAULT 0,
    crop_bottom NUMERIC DEFAULT 0,
    crop_left NUMERIC DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_widget_instances_canvas_id ON widget_instances(canvas_id);
CREATE INDEX IF NOT EXISTS idx_widget_instances_user_id ON widget_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_instances_widget_def_id ON widget_instances(widget_def_id);
CREATE INDEX IF NOT EXISTS idx_widget_instances_canvas_user ON widget_instances(canvas_id, user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_widget_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_widget_instances_updated_at ON widget_instances;
CREATE TRIGGER trigger_widget_instances_updated_at
    BEFORE UPDATE ON widget_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_widget_instances_updated_at();

-- Enable Row Level Security
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view widget instances on their own canvases
CREATE POLICY "Users can view own widget instances"
    ON widget_instances FOR SELECT
    USING (user_id = auth.uid());

-- Users can view widget instances on public/unlisted canvases
CREATE POLICY "Users can view public canvas widget instances"
    ON widget_instances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = widget_instances.canvas_id
            AND canvases.visibility IN ('public', 'unlisted')
        )
    );

-- Users can insert widget instances on their own canvases
CREATE POLICY "Users can insert own widget instances"
    ON widget_instances FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own widget instances
CREATE POLICY "Users can update own widget instances"
    ON widget_instances FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own widget instances
CREATE POLICY "Users can delete own widget instances"
    ON widget_instances FOR DELETE
    USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE widget_instances IS 'Persisted widget instance state for canvas widgets';
COMMENT ON COLUMN widget_instances.state IS 'Widget internal state as JSON - arbitrary data managed by the widget';
COMMENT ON COLUMN widget_instances.mobile_layout IS 'Mobile viewport layout overrides (position, size, visibility)';
COMMENT ON COLUMN widget_instances.metadata IS 'Widget metadata including source, generated content for AI widgets';
COMMENT ON COLUMN widget_instances.scale_mode IS 'Content scaling: crop, scale, stretch, contain';
