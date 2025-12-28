# StickerNest Profile & Gallery - Database Schema Design

## Document Version: 1.0
## Status: Phase 1 - Planning
## Last Updated: 2025-12-16

---

## Overview

This document defines the database schema for the enhanced profile and gallery system. The schema is designed for Supabase (PostgreSQL) with Row-Level Security (RLS) policies.

---

## Table Definitions

### 1. users (Enhanced)

Extends the existing users table with profile customization fields.

```sql
-- Existing columns (keep as-is)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_settings JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_creator ON users(is_creator) WHERE is_creator = true;

-- Social links structure:
-- {
--   "twitter": "username",
--   "github": "username",
--   "instagram": "username",
--   "linkedin": "username",
--   "youtube": "channel"
-- }

-- Profile settings structure:
-- {
--   "themeColor": "#8b5cf6",
--   "layoutPreference": "grid" | "masonry" | "list",
--   "showStats": true,
--   "showFollowers": true,
--   "featuredCanvasIds": ["canvas-1", "canvas-2"]
-- }
```

### 2. canvases (Enhanced)

Extends the existing canvases table with visibility and sharing fields.

```sql
-- Add new columns to canvases table
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private'
  CHECK (visibility IN ('private', 'unlisted', 'public'));
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS slug VARCHAR(50) UNIQUE;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS allow_embed BOOLEAN DEFAULT TRUE;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS allow_fork BOOLEAN DEFAULT TRUE;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS preview_gif_url TEXT;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS fork_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}';
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES canvases(id);

-- Create indexes for gallery queries
CREATE INDEX IF NOT EXISTS idx_canvases_visibility ON canvases(visibility) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_canvases_slug ON canvases(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_category ON canvases(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_view_count ON canvases(view_count DESC) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_canvases_like_count ON canvases(like_count DESC) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_canvases_tags ON canvases USING GIN(tags);

-- Category enum values
-- 'portfolio', 'dashboard', 'presentation', 'game', 'art',
-- 'music', 'education', 'business', 'social', 'other'

-- SEO metadata structure:
-- {
--   "title": "Custom SEO Title",
--   "description": "Custom description for SEO",
--   "ogImage": "https://...",
--   "keywords": ["keyword1", "keyword2"],
--   "allowIndexing": true
-- }
```

### 3. canvas_slugs (New)

Track slug history for redirects and prevent slug squatting.

```sql
CREATE TABLE IF NOT EXISTS canvas_slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL,
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canvas_slugs_canvas_id ON canvas_slugs(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_slugs_user_id ON canvas_slugs(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_slugs_expires_at ON canvas_slugs(expires_at) WHERE expires_at IS NOT NULL;

-- Only one primary slug per canvas
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvas_slugs_primary
  ON canvas_slugs(canvas_id) WHERE is_primary = TRUE;
```

### 4. canvas_access_sessions (New)

Temporary access tokens for password-protected canvases.

```sql
CREATE TABLE IF NOT EXISTS canvas_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Cleanup old sessions automatically
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canvas_access_sessions_canvas_id ON canvas_access_sessions(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_access_sessions_token ON canvas_access_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_canvas_access_sessions_expires_at ON canvas_access_sessions(expires_at);

-- Auto-delete expired sessions (run via cron job)
-- DELETE FROM canvas_access_sessions WHERE expires_at < NOW();
```

### 5. canvas_views (New)

Track individual view events for analytics.

```sql
CREATE TABLE IF NOT EXISTS canvas_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_hash VARCHAR(64), -- Hashed for privacy
  user_agent TEXT,
  referrer TEXT,
  country_code VARCHAR(2),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER,
  is_embed BOOLEAN DEFAULT FALSE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_canvas_views_canvas_id ON canvas_views(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_views_viewed_at ON canvas_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_views_canvas_date ON canvas_views(canvas_id, viewed_at DESC);

-- Partial index for unique daily views (prevents spam)
CREATE INDEX IF NOT EXISTS idx_canvas_views_unique_daily
  ON canvas_views(canvas_id, ip_hash, DATE(viewed_at));
```

### 6. canvas_likes (New)

Track user likes on canvases.

```sql
CREATE TABLE IF NOT EXISTS canvas_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(canvas_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canvas_likes_canvas_id ON canvas_likes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_likes_user_id ON canvas_likes(user_id);
```

### 7. follows (Enhanced if exists, or New)

Track user follow relationships.

```sql
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
```

### 8. user_stats (Materialized View)

Cached user statistics for fast profile loading.

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT c.id) FILTER (WHERE c.visibility = 'public') as public_canvases,
  COUNT(DISTINCT f1.follower_id) as followers,
  COUNT(DISTINCT f2.following_id) as following,
  COALESCE(SUM(c.view_count) FILTER (WHERE c.visibility = 'public'), 0) as total_views,
  COALESCE(SUM(c.like_count) FILTER (WHERE c.visibility = 'public'), 0) as total_likes
FROM users u
LEFT JOIN canvases c ON c.user_id = u.id
LEFT JOIN follows f1 ON f1.following_id = u.id
LEFT JOIN follows f2 ON f2.follower_id = u.id
GROUP BY u.id;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Refresh periodically (every 5 minutes via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

### 9. canvas_comments (New)

Comments on public canvases.

```sql
CREATE TABLE IF NOT EXISTS canvas_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES canvas_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT content_length CHECK (char_length(content) <= 2000)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canvas_comments_canvas_id ON canvas_comments(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_user_id ON canvas_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_parent_id ON canvas_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_created_at ON canvas_comments(created_at DESC);
```

### 10. favorites (New or Enhanced)

User's favorited/bookmarked canvases.

```sql
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, canvas_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_canvas_id ON favorites(canvas_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(user_id, created_at DESC);
```

---

## Row-Level Security (RLS) Policies

### Users Table

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Public profile fields are readable by everyone
CREATE POLICY "Public profiles are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### Canvases Table

```sql
-- Enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Public and unlisted canvases are viewable by everyone
CREATE POLICY "Public canvases are viewable"
  ON canvases FOR SELECT
  USING (
    visibility IN ('public', 'unlisted')
    OR user_id = auth.uid()
  );

-- Users can only manage their own canvases
CREATE POLICY "Users can insert own canvases"
  ON canvases FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own canvases"
  ON canvases FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own canvases"
  ON canvases FOR DELETE
  USING (user_id = auth.uid());
```

### Canvas Likes Table

```sql
-- Enable RLS
ALTER TABLE canvas_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can see likes on public canvases
CREATE POLICY "Likes are viewable on public canvases"
  ON canvas_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_id
      AND c.visibility = 'public'
    )
  );

-- Authenticated users can like
CREATE POLICY "Authenticated users can like"
  ON canvas_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike
CREATE POLICY "Users can remove own likes"
  ON canvas_likes FOR DELETE
  USING (auth.uid() = user_id);
```

### Follows Table

```sql
-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see follow relationships
CREATE POLICY "Follow relationships are public"
  ON follows FOR SELECT
  USING (true);

-- Authenticated users can follow
CREATE POLICY "Authenticated users can follow"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);
```

### Canvas Comments Table

```sql
-- Enable RLS
ALTER TABLE canvas_comments ENABLE ROW LEVEL SECURITY;

-- Comments on public canvases are viewable
CREATE POLICY "Comments viewable on public canvases"
  ON canvas_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_id
      AND c.visibility = 'public'
    )
  );

-- Authenticated users can comment on public canvases
CREATE POLICY "Authenticated users can comment"
  ON canvas_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_id
      AND c.visibility = 'public'
    )
  );

-- Users can edit own comments
CREATE POLICY "Users can edit own comments"
  ON canvas_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own comments"
  ON canvas_comments FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Database Functions

### 1. Increment View Count

```sql
CREATE OR REPLACE FUNCTION increment_canvas_view(
  p_canvas_id UUID,
  p_session_id VARCHAR(255),
  p_ip_hash VARCHAR(64),
  p_is_embed BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
  v_existing_view UUID;
BEGIN
  -- Check for existing view in last 24 hours from same IP
  SELECT id INTO v_existing_view
  FROM canvas_views
  WHERE canvas_id = p_canvas_id
    AND ip_hash = p_ip_hash
    AND viewed_at > NOW() - INTERVAL '24 hours'
  LIMIT 1;

  -- Only count if no recent view from same IP
  IF v_existing_view IS NULL THEN
    -- Insert view record
    INSERT INTO canvas_views (canvas_id, session_id, ip_hash, is_embed)
    VALUES (p_canvas_id, p_session_id, p_ip_hash, p_is_embed);

    -- Increment counter
    UPDATE canvases
    SET view_count = view_count + 1
    WHERE id = p_canvas_id
    RETURNING view_count INTO v_new_count;
  ELSE
    SELECT view_count INTO v_new_count
    FROM canvases
    WHERE id = p_canvas_id;
  END IF;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. Toggle Like

```sql
CREATE OR REPLACE FUNCTION toggle_canvas_like(
  p_canvas_id UUID,
  p_user_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, like_count INTEGER) AS $$
DECLARE
  v_existing_like UUID;
  v_is_liked BOOLEAN;
  v_like_count INTEGER;
BEGIN
  -- Check for existing like
  SELECT id INTO v_existing_like
  FROM canvas_likes
  WHERE canvas_id = p_canvas_id AND user_id = p_user_id;

  IF v_existing_like IS NOT NULL THEN
    -- Unlike
    DELETE FROM canvas_likes WHERE id = v_existing_like;
    UPDATE canvases SET like_count = like_count - 1 WHERE id = p_canvas_id;
    v_is_liked := FALSE;
  ELSE
    -- Like
    INSERT INTO canvas_likes (canvas_id, user_id) VALUES (p_canvas_id, p_user_id);
    UPDATE canvases SET like_count = like_count + 1 WHERE id = p_canvas_id;
    v_is_liked := TRUE;
  END IF;

  SELECT c.like_count INTO v_like_count FROM canvases c WHERE c.id = p_canvas_id;

  RETURN QUERY SELECT v_is_liked, v_like_count;
END;
$$ LANGUAGE plpgsql;
```

### 3. Check Slug Availability

```sql
CREATE OR REPLACE FUNCTION check_slug_availability(p_slug VARCHAR(50))
RETURNS TABLE(available BOOLEAN, suggestions VARCHAR(50)[]) AS $$
DECLARE
  v_available BOOLEAN;
  v_suggestions VARCHAR(50)[];
  i INTEGER;
BEGIN
  -- Check if slug exists
  SELECT NOT EXISTS(
    SELECT 1 FROM canvas_slugs WHERE slug = p_slug
  ) INTO v_available;

  -- If not available, generate suggestions
  IF NOT v_available THEN
    v_suggestions := ARRAY[]::VARCHAR(50)[];
    FOR i IN 1..5 LOOP
      v_suggestions := array_append(
        v_suggestions,
        p_slug || '-' || floor(random() * 1000)::TEXT
      );
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_available, v_suggestions;
END;
$$ LANGUAGE plpgsql;
```

### 4. Generate Access Token

```sql
CREATE OR REPLACE FUNCTION generate_canvas_access_token(
  p_canvas_id UUID,
  p_password VARCHAR(255)
)
RETURNS TABLE(success BOOLEAN, token VARCHAR(255), expires_at TIMESTAMPTZ) AS $$
DECLARE
  v_password_hash VARCHAR(255);
  v_token VARCHAR(255);
  v_expires TIMESTAMPTZ;
BEGIN
  -- Get password hash
  SELECT password_hash INTO v_password_hash
  FROM canvases
  WHERE id = p_canvas_id;

  -- Verify password (using pgcrypto)
  IF crypt(p_password, v_password_hash) = v_password_hash THEN
    -- Generate token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires := NOW() + INTERVAL '24 hours';

    -- Store session
    INSERT INTO canvas_access_sessions (canvas_id, session_token, expires_at)
    VALUES (p_canvas_id, v_token, v_expires);

    RETURN QUERY SELECT TRUE, v_token, v_expires;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(255), NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 5. Verify Access Token

```sql
CREATE OR REPLACE FUNCTION verify_canvas_access_token(
  p_canvas_id UUID,
  p_token VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM canvas_access_sessions
    WHERE canvas_id = p_canvas_id
      AND session_token = p_token
      AND expires_at > NOW()
  ) INTO v_valid;

  RETURN v_valid;
END;
$$ LANGUAGE plpgsql;
```

---

## Scheduled Jobs (Cron)

```sql
-- Clean up expired access sessions (every hour)
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *',
  $$DELETE FROM canvas_access_sessions WHERE expires_at < NOW()$$
);

-- Clean up expired slugs (daily at 3am)
SELECT cron.schedule(
  'cleanup-expired-slugs',
  '0 3 * * *',
  $$DELETE FROM canvas_slugs WHERE expires_at IS NOT NULL AND expires_at < NOW()$$
);

-- Refresh user stats materialized view (every 5 minutes)
SELECT cron.schedule(
  'refresh-user-stats',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats$$
);

-- Clean up old view records (weekly, keep 90 days)
SELECT cron.schedule(
  'cleanup-old-views',
  '0 4 * * 0',
  $$DELETE FROM canvas_views WHERE viewed_at < NOW() - INTERVAL '90 days'$$
);
```

---

## Migration Script

```sql
-- Migration: Add profile and gallery features
-- Version: 001_profile_gallery
-- Created: 2025-12-16

BEGIN;

-- 1. Enhance users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_settings JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT FALSE;

-- 2. Enhance canvases table
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS slug VARCHAR(50);
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS allow_embed BOOLEAN DEFAULT TRUE;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS allow_fork BOOLEAN DEFAULT TRUE;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS fork_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}';
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 3. Create new tables
CREATE TABLE IF NOT EXISTS canvas_slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS canvas_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS canvas_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_hash VARCHAR(64),
  referrer TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  is_embed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS canvas_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(canvas_id, user_id)
);

CREATE TABLE IF NOT EXISTS canvas_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES canvas_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_canvases_visibility ON canvases(visibility);
CREATE INDEX IF NOT EXISTS idx_canvases_slug ON canvases(slug);
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_views_canvas_id ON canvas_views(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_likes_canvas_id ON canvas_likes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_canvas_id ON canvas_comments(canvas_id);

-- 5. Set default visibility for existing canvases
UPDATE canvases SET visibility = 'private' WHERE visibility IS NULL;

COMMIT;
```

---

## TypeScript Types (for reference)

```typescript
// types/database.ts

export interface DatabaseCanvas {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'unlisted' | 'public';
  slug?: string;
  password_hash?: string;
  allow_embed: boolean;
  allow_fork: boolean;
  thumbnail_url?: string;
  preview_gif_url?: string;
  tags: string[];
  category?: CanvasCategory;
  view_count: number;
  like_count: number;
  fork_count: number;
  comment_count: number;
  seo_metadata: SEOMetadata;
  created_at: string;
  updated_at: string;
  published_at?: string;
  forked_from_id?: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  social_links: SocialLinks;
  profile_settings: ProfileSettings;
  is_verified: boolean;
  is_creator: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCanvasSlug {
  id: string;
  slug: string;
  canvas_id: string;
  user_id: string;
  is_primary: boolean;
  created_at: string;
  expires_at?: string;
}

export interface DatabaseAccessSession {
  id: string;
  canvas_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
}

export interface DatabaseCanvasView {
  id: string;
  canvas_id: string;
  viewer_id?: string;
  session_id?: string;
  ip_hash?: string;
  referrer?: string;
  viewed_at: string;
  is_embed: boolean;
}

export interface DatabaseCanvasLike {
  id: string;
  canvas_id: string;
  user_id: string;
  created_at: string;
}

export interface DatabaseCanvasComment {
  id: string;
  canvas_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export type CanvasCategory =
  | 'portfolio'
  | 'dashboard'
  | 'presentation'
  | 'game'
  | 'art'
  | 'music'
  | 'education'
  | 'business'
  | 'social'
  | 'other';

export interface SocialLinks {
  twitter?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
}

export interface ProfileSettings {
  themeColor?: string;
  layoutPreference?: 'grid' | 'masonry' | 'list';
  showStats?: boolean;
  showFollowers?: boolean;
  featuredCanvasIds?: string[];
}

export interface SEOMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  keywords?: string[];
  allowIndexing?: boolean;
}
```

---

*Document maintained by: Development Team*
*Last review: 2025-12-16*
