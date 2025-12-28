-- StickerNest V2 Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable RLS (Row Level Security)
-- Note: You'll need to enable RLS manually in Supabase dashboard

-- ==================
-- Canvases Table
-- ==================
CREATE TABLE IF NOT EXISTS canvases (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Dashboard',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
    slug TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_visibility ON canvases(visibility);

-- RLS Policies for canvases
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own canvases"
    ON canvases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public canvases"
    ON canvases FOR SELECT
    USING (visibility = 'public');

CREATE POLICY "Users can insert their own canvases"
    ON canvases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvases"
    ON canvases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvases"
    ON canvases FOR DELETE
    USING (auth.uid() = user_id);

-- ==================
-- Widget Instances Table
-- ==================
CREATE TABLE IF NOT EXISTS widget_instances (
    id TEXT PRIMARY KEY,
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    widget_def_id TEXT NOT NULL,
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    width REAL NOT NULL DEFAULT 200,
    height REAL NOT NULL DEFAULT 150,
    rotation REAL NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 0,
    state JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for canvas queries
CREATE INDEX IF NOT EXISTS idx_widget_instances_canvas_id ON widget_instances(canvas_id);

-- RLS Policies for widget_instances (inherit from canvas permissions)
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view widgets in their canvases"
    ON widget_instances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = widget_instances.canvas_id
            AND (canvases.user_id = auth.uid() OR canvases.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert widgets in their canvases"
    ON widget_instances FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = widget_instances.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update widgets in their canvases"
    ON widget_instances FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = widget_instances.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete widgets in their canvases"
    ON widget_instances FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = widget_instances.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

-- ==================
-- Pipelines Table
-- ==================
CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Pipeline',
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT true,
    widget_edits JSONB DEFAULT '[]',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for canvas queries
CREATE INDEX IF NOT EXISTS idx_pipelines_canvas_id ON pipelines(canvas_id);

-- RLS Policies for pipelines (inherit from canvas permissions)
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipelines in their canvases"
    ON pipelines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = pipelines.canvas_id
            AND (canvases.user_id = auth.uid() OR canvases.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert pipelines in their canvases"
    ON pipelines FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = pipelines.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update pipelines in their canvases"
    ON pipelines FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = pipelines.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete pipelines in their canvases"
    ON pipelines FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = pipelines.canvas_id
            AND canvases.user_id = auth.uid()
        )
    );

-- ==================
-- Storage Buckets (run in Supabase dashboard)
-- ==================
-- Create these buckets manually in Supabase Storage:
-- 1. UserWidgets - for user-uploaded widget bundles
-- 2. SystemWidgets - for official widget bundles

-- ==================
-- Updated_at Trigger
-- ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_canvases_updated_at
    BEFORE UPDATE ON canvases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_instances_updated_at
    BEFORE UPDATE ON widget_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
