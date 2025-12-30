-- StickerNest V2 - Spatial Stickers Migration
-- Adds database persistence for spatial stickers in VR/AR modes
-- Includes 3D transforms, anchors, QR codes, and scene configurations

-- ============================================================================
-- Spatial Stickers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_stickers (
    -- Primary key
    id TEXT PRIMARY KEY,

    -- References
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic properties
    name TEXT NOT NULL DEFAULT 'Spatial Sticker',
    media_type TEXT NOT NULL DEFAULT 'image', -- image, 3d-model, 3d-primitive, etc.
    media_src TEXT,

    -- 2D Properties (for desktop mode)
    position_2d JSONB NOT NULL DEFAULT '{"x": 100, "y": 100}',
    size_2d JSONB NOT NULL DEFAULT '{"width": 100, "height": 100}',
    rotation_2d NUMERIC NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 1,

    -- 3D Transform (position, rotation, scale as JSONB)
    transform_3d JSONB NOT NULL DEFAULT '{"position": {"x": 0, "y": 1.5, "z": -1}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}',

    -- Anchor data (JSONB for flexibility with different anchor types)
    anchor JSONB DEFAULT '{"type": "none", "worldPosition": {"x": 0, "y": 1.5, "z": -1}, "worldRotation": {"x": 0, "y": 0, "z": 0}}',

    -- Billboard (always face camera)
    billboard_3d BOOLEAN DEFAULT false,

    -- 3D Model/Primitive configuration (JSONB for flexibility)
    model_3d_config JSONB DEFAULT NULL,
    primitive_3d_config JSONB DEFAULT NULL,

    -- Interaction
    click_behavior TEXT NOT NULL DEFAULT 'none',
    linked_widget_def_id TEXT,
    linked_widget_instance_id TEXT,
    linked_url TEXT,
    linked_event TEXT,
    linked_pipeline_id TEXT,

    -- Visual effects
    opacity NUMERIC NOT NULL DEFAULT 1,
    hover_animation TEXT DEFAULT 'scale',
    click_animation TEXT DEFAULT 'pulse',
    cast_shadow BOOLEAN DEFAULT true,
    receive_shadow BOOLEAN DEFAULT true,

    -- State
    locked BOOLEAN DEFAULT false,
    visible_in JSONB NOT NULL DEFAULT '{"desktop": true, "vr": true, "ar": true}',

    -- Layer/group
    layer_id TEXT,
    group_id TEXT,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Registered QR Codes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_qr_codes (
    -- Primary key
    id TEXT PRIMARY KEY,

    -- References
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- QR code content (unique per canvas)
    content TEXT NOT NULL,

    -- Human-readable label
    label TEXT NOT NULL DEFAULT 'QR Code',

    -- Physical size for accurate AR tracking (meters)
    size_meters NUMERIC DEFAULT 0.1,

    -- Attached sticker IDs (array of TEXT since sticker IDs are TEXT)
    attached_sticker_ids TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_scanned TIMESTAMPTZ,

    -- Unique constraint: one content per canvas
    UNIQUE (canvas_id, content)
);

-- ============================================================================
-- Spatial Anchors Table (persistent XR anchors)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_anchors (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- XR anchor handle (from WebXR)
    handle TEXT NOT NULL,

    -- Position
    position_x NUMERIC NOT NULL DEFAULT 0,
    position_y NUMERIC NOT NULL DEFAULT 0,
    position_z NUMERIC NOT NULL DEFAULT 0,

    -- Rotation (quaternion)
    rotation_x NUMERIC NOT NULL DEFAULT 0,
    rotation_y NUMERIC NOT NULL DEFAULT 0,
    rotation_z NUMERIC NOT NULL DEFAULT 0,
    rotation_w NUMERIC NOT NULL DEFAULT 1,

    -- Label for identification
    label TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one handle per canvas
    UNIQUE (canvas_id, handle)
);

-- ============================================================================
-- Scene Configuration Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_scene_configs (
    -- Primary key (one per canvas)
    canvas_id TEXT PRIMARY KEY REFERENCES canvases(id) ON DELETE CASCADE,

    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Room visualization
    show_room_visualization BOOLEAN DEFAULT false,

    -- Rendering settings
    enable_occlusion BOOLEAN DEFAULT true,
    enable_shadows BOOLEAN DEFAULT true,
    ambient_intensity NUMERIC DEFAULT 0.5,

    -- VR environment
    vr_environment TEXT DEFAULT 'sunset',
    custom_environment_url TEXT,

    -- Floor/surface settings
    show_floor_grid BOOLEAN DEFAULT false,
    snap_to_surfaces BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_spatial_stickers_canvas_id ON spatial_stickers(canvas_id);
CREATE INDEX IF NOT EXISTS idx_spatial_stickers_user_id ON spatial_stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_spatial_stickers_canvas_user ON spatial_stickers(canvas_id, user_id);
CREATE INDEX IF NOT EXISTS idx_spatial_stickers_layer ON spatial_stickers(canvas_id, layer_id);
CREATE INDEX IF NOT EXISTS idx_spatial_stickers_media_type ON spatial_stickers(media_type);

CREATE INDEX IF NOT EXISTS idx_spatial_qr_codes_canvas_id ON spatial_qr_codes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_spatial_qr_codes_content ON spatial_qr_codes(content);

CREATE INDEX IF NOT EXISTS idx_spatial_anchors_canvas_id ON spatial_anchors(canvas_id);
CREATE INDEX IF NOT EXISTS idx_spatial_anchors_handle ON spatial_anchors(handle);

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_spatial_stickers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_spatial_stickers_updated_at ON spatial_stickers;
CREATE TRIGGER trigger_spatial_stickers_updated_at
    BEFORE UPDATE ON spatial_stickers
    FOR EACH ROW
    EXECUTE FUNCTION update_spatial_stickers_updated_at();

DROP TRIGGER IF EXISTS trigger_spatial_qr_codes_updated_at ON spatial_qr_codes;
CREATE TRIGGER trigger_spatial_qr_codes_updated_at
    BEFORE UPDATE ON spatial_qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_spatial_stickers_updated_at();

DROP TRIGGER IF EXISTS trigger_spatial_scene_configs_updated_at ON spatial_scene_configs;
CREATE TRIGGER trigger_spatial_scene_configs_updated_at
    BEFORE UPDATE ON spatial_scene_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_spatial_stickers_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE spatial_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE spatial_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spatial_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE spatial_scene_configs ENABLE ROW LEVEL SECURITY;

-- Spatial Stickers RLS
CREATE POLICY "Users can view own spatial stickers"
    ON spatial_stickers FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view public canvas spatial stickers"
    ON spatial_stickers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = spatial_stickers.canvas_id
            AND canvases.visibility IN ('public', 'unlisted')
        )
    );

CREATE POLICY "Users can insert own spatial stickers"
    ON spatial_stickers FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own spatial stickers"
    ON spatial_stickers FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own spatial stickers"
    ON spatial_stickers FOR DELETE
    USING (user_id = auth.uid());

-- QR Codes RLS
CREATE POLICY "Users can view own qr codes"
    ON spatial_qr_codes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own qr codes"
    ON spatial_qr_codes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own qr codes"
    ON spatial_qr_codes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own qr codes"
    ON spatial_qr_codes FOR DELETE
    USING (user_id = auth.uid());

-- Anchors RLS
CREATE POLICY "Users can view own anchors"
    ON spatial_anchors FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own anchors"
    ON spatial_anchors FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own anchors"
    ON spatial_anchors FOR DELETE
    USING (user_id = auth.uid());

-- Scene Config RLS
CREATE POLICY "Users can view own scene config"
    ON spatial_scene_configs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view public canvas scene config"
    ON spatial_scene_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = spatial_scene_configs.canvas_id
            AND canvases.visibility IN ('public', 'unlisted')
        )
    );

CREATE POLICY "Users can upsert own scene config"
    ON spatial_scene_configs FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own scene config"
    ON spatial_scene_configs FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE spatial_stickers IS 'Spatial stickers for VR/AR modes with 3D transforms and anchoring';
COMMENT ON TABLE spatial_qr_codes IS 'Registered QR codes for spatial anchoring in AR';
COMMENT ON TABLE spatial_anchors IS 'Persistent WebXR anchors for spatial positioning';
COMMENT ON TABLE spatial_scene_configs IS 'Per-canvas spatial scene configuration';

COMMENT ON COLUMN spatial_stickers.anchor IS 'Anchor configuration: {type, qrContent, surfaceType, xrAnchorHandle, etc.}';
COMMENT ON COLUMN spatial_stickers.click_behavior IS 'Click action: {type, widgetDefId, widgetInstanceId, url, event, pipelineId}';
COMMENT ON COLUMN spatial_stickers.model_3d_config IS '3D model config: {modelUrl, format, animations, scale}';
COMMENT ON COLUMN spatial_stickers.primitive_3d_config IS '3D primitive config: {primitiveType, dimensions, material}';
