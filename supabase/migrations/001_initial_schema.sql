-- ============================================================================
-- StickerNest v2 - Complete Database Schema
-- Generated: 2024-12-23
-- Description: Full schema for social layer, multi-user canvases, marketplace
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'creator', 'admin');

-- Canvas visibility
CREATE TYPE canvas_visibility AS ENUM ('private', 'unlisted', 'public');

-- Canvas scroll modes
CREATE TYPE scroll_mode AS ENUM ('fixed', 'scroll', 'pan', 'infinite');

-- Canvas interaction modes
CREATE TYPE interaction_mode AS ENUM ('view-only', 'interact', 'full');

-- Background types
CREATE TYPE background_type AS ENUM ('color', 'gradient', 'image', 'video', 'pattern', '3d', 'vector', 'visualizer', 'shader', 'widget', 'parallax');

-- Blend modes
CREATE TYPE blend_mode AS ENUM ('normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn');

-- Widget kinds
CREATE TYPE widget_kind AS ENUM ('2d', '3d', 'audio', 'video', 'hybrid', 'container', 'display', 'interactive');

-- Entity types
CREATE TYPE entity_type AS ENUM ('text', 'image', 'lottie', 'widget', 'timer', 'data', 'audio', 'video', 'vector', 'object3d');

-- Sticker media types
CREATE TYPE sticker_media_type AS ENUM ('image', 'lottie', 'gif', 'video', 'emoji', 'icon');

-- Sticker click behaviors
CREATE TYPE sticker_click_behavior AS ENUM ('toggle-widget', 'launch-widget', 'open-url', 'emit-event', 'run-pipeline', 'none');

-- Sticker animations
CREATE TYPE hover_animation AS ENUM ('scale', 'bounce', 'shake', 'glow', 'none');
CREATE TYPE click_animation AS ENUM ('pulse', 'ripple', 'shrink', 'none');

-- Dock zone types
CREATE TYPE dock_zone_type AS ENUM ('panel', 'toolbar', 'tray', 'deck', 'sidebar', 'slot');

-- Dock layouts
CREATE TYPE dock_layout AS ENUM ('horizontal', 'vertical', 'grid', 'tabs');

-- Notification types
CREATE TYPE notification_type AS ENUM ('follow', 'like', 'comment', 'fork', 'mention', 'system', 'order', 'submission');

-- Marketplace item types
CREATE TYPE marketplace_item_type AS ENUM ('canvas_widget', 'system_widget', 'sticker_pack', 'pipeline', 'theme', 'template');

-- Sticker formats
CREATE TYPE sticker_format AS ENUM ('png', 'jpeg', 'webp', 'gif', 'apng', 'svg', 'lottie');

-- Favorite types
CREATE TYPE favorite_type AS ENUM ('canvas', 'widget', 'sticker_pack', 'template', 'creator');

-- Product types
CREATE TYPE product_type AS ENUM ('one_time', 'subscription', 'digital_download');

-- Billing intervals
CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly');

-- Order status
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partial_refund');

-- Gate types
CREATE TYPE gate_type AS ENUM ('canvas', 'widget', 'section');

-- Submission status
CREATE TYPE submission_status AS ENUM ('new', 'contacted', 'converted', 'archived');

-- Digest frequency
CREATE TYPE digest_frequency AS ENUM ('instant', 'daily', 'weekly', 'none');

-- Chat types
CREATE TYPE chat_type AS ENUM ('direct', 'group');

-- Chat member roles
CREATE TYPE chat_member_role AS ENUM ('owner', 'admin', 'member');

-- Message content types
CREATE TYPE message_content_type AS ENUM ('text', 'image', 'file', 'canvas_link', 'widget_link');

-- Attachment types
CREATE TYPE attachment_type AS ENUM ('image', 'file');

-- Activity visibility
CREATE TYPE activity_visibility AS ENUM ('public', 'followers_only', 'private');

-- Collaboration roles
CREATE TYPE collab_role AS ENUM ('owner', 'editor', 'viewer');

-- Privacy modes
CREATE TYPE privacy_mode AS ENUM ('public', 'friends_only', 'private');

-- Auth providers
CREATE TYPE auth_provider AS ENUM ('magic_link', 'google', 'email_password');

-- Scale modes
CREATE TYPE scale_mode AS ENUM ('crop', 'scale', 'stretch', 'contain');

-- ============================================================================
-- SECTION 2: CORE USER TABLES
-- ============================================================================

-- Extended user profiles (supplements Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    email TEXT,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    location TEXT,
    website TEXT,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social links for users
CREATE TABLE social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    twitter TEXT,
    github TEXT,
    instagram TEXT,
    linkedin TEXT,
    youtube TEXT,
    discord TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User statistics
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    canvas_count INTEGER DEFAULT 0,
    widget_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    total_ai_generations INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 1073741824, -- 1GB default
    ai_generations_limit INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    follow_notifications BOOLEAN DEFAULT TRUE,
    like_notifications BOOLEAN DEFAULT TRUE,
    comment_notifications BOOLEAN DEFAULT TRUE,
    mention_notifications BOOLEAN DEFAULT TRUE,
    order_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    digest_frequency digest_frequency DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: CANVAS & WIDGET TABLES
-- ============================================================================

-- Canvases
CREATE TABLE canvases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Canvas',
    slug TEXT UNIQUE,
    description TEXT,
    visibility canvas_visibility DEFAULT 'private',
    width INTEGER DEFAULT 1920,
    height INTEGER DEFAULT 1080,
    has_password BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_template BOOLEAN DEFAULT FALSE,
    forked_from UUID REFERENCES canvases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Canvas settings
CREATE TABLE canvas_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL UNIQUE REFERENCES canvases(id) ON DELETE CASCADE,
    scroll_mode scroll_mode DEFAULT 'pan',
    interaction_mode interaction_mode DEFAULT 'interact',
    zoom_enabled BOOLEAN DEFAULT TRUE,
    zoom_min FLOAT DEFAULT 0.1,
    zoom_max FLOAT DEFAULT 5.0,
    zoom_step FLOAT DEFAULT 0.1,
    show_grid BOOLEAN DEFAULT FALSE,
    grid_size INTEGER DEFAULT 20,
    snap_to_grid BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    allow_likes BOOLEAN DEFAULT TRUE,
    allow_forks BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvas backgrounds
CREATE TABLE canvas_backgrounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL UNIQUE REFERENCES canvases(id) ON DELETE CASCADE,
    type background_type DEFAULT 'color',
    color TEXT DEFAULT '#1a1a2e',
    gradient TEXT,
    image_url TEXT,
    video_src TEXT,
    vector_content TEXT,
    shader_code TEXT,
    opacity FLOAT DEFAULT 1.0,
    blur INTEGER DEFAULT 0,
    blend_mode blend_mode DEFAULT 'normal',
    interactive BOOLEAN DEFAULT FALSE,
    parallax_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Widget instances on canvases
CREATE TABLE widget_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    widget_def_id TEXT NOT NULL,
    version TEXT DEFAULT '1.0.0',
    name TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 200,
    height INTEGER DEFAULT 150,
    rotation FLOAT DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    state JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    parent_id UUID REFERENCES widget_instances(id) ON DELETE SET NULL,
    is_container BOOLEAN DEFAULT FALSE,
    group_id UUID,
    layer_id UUID,
    locked BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    opacity FLOAT DEFAULT 1.0,
    scale_mode scale_mode DEFAULT 'contain',
    content_width INTEGER,
    content_height INTEGER,
    crop_top FLOAT DEFAULT 0,
    crop_right FLOAT DEFAULT 0,
    crop_bottom FLOAT DEFAULT 0,
    crop_left FLOAT DEFAULT 0,
    flip_x BOOLEAN DEFAULT FALSE,
    flip_y BOOLEAN DEFAULT FALSE,
    aspect_locked BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvas layers
CREATE TABLE canvas_layers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Layer',
    order_index INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT TRUE,
    locked BOOLEAN DEFAULT FALSE,
    opacity FLOAT DEFAULT 1.0,
    blend_mode blend_mode DEFAULT 'normal',
    color TEXT,
    collapsed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Widget groups
CREATE TABLE widget_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Group',
    widget_ids UUID[] DEFAULT '{}',
    locked BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    opacity FLOAT DEFAULT 1.0,
    z_index INTEGER DEFAULT 0,
    parent_group_id UUID REFERENCES widget_groups(id) ON DELETE SET NULL,
    bounds JSONB,
    collapsed BOOLEAN DEFAULT FALSE,
    color TEXT,
    blend_mode blend_mode DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvas versions (for undo/redo and version history)
CREATE TABLE canvas_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT,
    description TEXT,
    snapshot_data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(canvas_id, version_number)
);

-- Pipelines (widget connection flows)
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Pipeline',
    description TEXT,
    nodes JSONB DEFAULT '[]',
    connections JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stickers on canvases
CREATE TABLE canvas_stickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT,
    media_type sticker_media_type DEFAULT 'image',
    media_src TEXT NOT NULL,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 100,
    height INTEGER DEFAULT 100,
    rotation FLOAT DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    click_behavior sticker_click_behavior DEFAULT 'none',
    linked_widget_def_id TEXT,
    linked_widget_instance_id UUID REFERENCES widget_instances(id) ON DELETE SET NULL,
    linked_url TEXT,
    linked_event TEXT,
    linked_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    hover_animation hover_animation DEFAULT 'none',
    click_animation click_animation DEFAULT 'none',
    opacity FLOAT DEFAULT 1.0,
    locked BOOLEAN DEFAULT FALSE,
    layer_id UUID REFERENCES canvas_layers(id) ON DELETE SET NULL,
    group_id UUID REFERENCES widget_groups(id) ON DELETE SET NULL,
    tooltip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dock zones on canvases
CREATE TABLE dock_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    type dock_zone_type DEFAULT 'panel',
    name TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 300,
    height INTEGER DEFAULT 400,
    parent_widget_id UUID REFERENCES widget_instances(id) ON DELETE SET NULL,
    docked_widget_ids UUID[] DEFAULT '{}',
    max_widgets INTEGER DEFAULT 10,
    layout dock_layout DEFAULT 'vertical',
    grid_columns INTEGER DEFAULT 2,
    gap INTEGER DEFAULT 8,
    padding INTEGER DEFAULT 8,
    collapsed BOOLEAN DEFAULT FALSE,
    accepts_drops BOOLEAN DEFAULT TRUE,
    accepted_widget_types TEXT[],
    background TEXT,
    border TEXT,
    border_radius INTEGER DEFAULT 8,
    z_index INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: SOCIAL FEATURES
-- ============================================================================

-- User follows
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- User blocks
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

-- Canvas likes
CREATE TABLE canvas_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(canvas_id, user_id)
);

-- Canvas comments
CREATE TABLE canvas_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES canvas_comments(id) ON DELETE CASCADE,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES canvas_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id UUID,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity feed
CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id UUID,
    target_type TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    visibility activity_visibility DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: FAVORITES & COLLECTIONS
-- ============================================================================

-- Favorite collections
CREATE TABLE favorite_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    icon TEXT,
    color TEXT,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_type favorite_type NOT NULL,
    item_id UUID NOT NULL,
    collection_id UUID REFERENCES favorite_collections(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, favorite_type, item_id)
);

-- Canvas collections
CREATE TABLE canvas_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    canvas_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection items
CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES canvas_collections(id) ON DELETE CASCADE,
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, canvas_id)
);

-- ============================================================================
-- SECTION 6: MARKETPLACE
-- ============================================================================

-- Marketplace items
CREATE TABLE marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    item_type marketplace_item_type NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    downloads INTEGER DEFAULT 0,
    rating FLOAT DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    is_official BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    thumbnail_url TEXT,
    preview_urls TEXT[] DEFAULT '{}',
    preview_video TEXT,
    is_free BOOLEAN DEFAULT TRUE,
    one_time_price INTEGER, -- cents
    monthly_price INTEGER, -- cents
    yearly_price INTEGER, -- cents
    license TEXT DEFAULT 'MIT',
    metadata JSONB DEFAULT '{}',
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace versions
CREATE TABLE marketplace_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    changelog TEXT,
    bundle_url TEXT,
    bundle_size BIGINT DEFAULT 0,
    is_latest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(marketplace_item_id, version)
);

-- Sticker packs
CREATE TABLE sticker_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_id UUID REFERENCES marketplace_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    author TEXT,
    license TEXT DEFAULT 'CC-BY-4.0',
    sticker_count INTEGER DEFAULT 0,
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stickers in packs
CREATE TABLE pack_stickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pack_id UUID NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    format sticker_format DEFAULT 'png',
    public_url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    is_animated BOOLEAN DEFAULT FALSE,
    duration INTEGER, -- ms
    frame_count INTEGER,
    file_size BIGINT,
    metadata JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace reviews
CREATE TABLE marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    helpful_count INTEGER DEFAULT 0,
    reply_content TEXT,
    reply_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(marketplace_item_id, user_id)
);

-- Widget registry (installed/available widgets)
CREATE TABLE widget_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    widget_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    author TEXT,
    tags TEXT[] DEFAULT '{}',
    kind widget_kind DEFAULT 'display',
    bundle_url TEXT,
    bundle_size BIGINT DEFAULT 0,
    manifest_url TEXT,
    icon_url TEXT,
    preview_url TEXT,
    is_official BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_builtin BOOLEAN DEFAULT FALSE,
    downloads INTEGER DEFAULT 0,
    rating FLOAT DEFAULT 0,
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: COMMERCE
-- ============================================================================

-- Canvas products
CREATE TABLE canvas_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    compare_at_price_cents INTEGER,
    currency TEXT DEFAULT 'USD',
    product_type product_type DEFAULT 'one_time',
    billing_interval billing_interval,
    download_url TEXT,
    download_limit INTEGER,
    track_inventory BOOLEAN DEFAULT FALSE,
    inventory_count INTEGER DEFAULT 0,
    in_stock BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvas customers
CREATE TABLE canvas_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    auth_provider auth_provider DEFAULT 'email_password',
    email_verified BOOLEAN DEFAULT FALSE,
    total_orders INTEGER DEFAULT 0,
    total_spent_cents INTEGER DEFAULT 0,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

-- Canvas orders
CREATE TABLE canvas_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES canvas_products(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES canvas_customers(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status order_status DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    fulfilled_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content gates
CREATE TABLE content_gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    gate_type gate_type NOT NULL,
    target_id TEXT,
    requires_auth BOOLEAN DEFAULT FALSE,
    requires_subscription BOOLEAN DEFAULT FALSE,
    subscription_product_id UUID REFERENCES canvas_products(id) ON DELETE SET NULL,
    requires_purchase BOOLEAN DEFAULT FALSE,
    purchase_product_id UUID REFERENCES canvas_products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES widget_instances(id) ON DELETE SET NULL,
    form_data JSONB NOT NULL DEFAULT '{}',
    form_type TEXT,
    submitter_email TEXT,
    submitter_name TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    status submission_status DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator notification settings
CREATE TABLE creator_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_on_form_submission BOOLEAN DEFAULT TRUE,
    email_on_order BOOLEAN DEFAULT TRUE,
    email_digest_frequency digest_frequency DEFAULT 'instant',
    notification_email TEXT,
    webhook_url TEXT,
    webhook_enabled BOOLEAN DEFAULT FALSE,
    webhook_events TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: CHAT & COLLABORATION
-- ============================================================================

-- Chat rooms
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type chat_type DEFAULT 'direct',
    name TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat room members
CREATE TABLE chat_room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role chat_member_role DEFAULT 'member',
    is_online BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    content_type message_content_type DEFAULT 'text',
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat attachments
CREATE TABLE chat_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    type attachment_type NOT NULL,
    url TEXT NOT NULL,
    name TEXT,
    size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration rooms (for real-time canvas editing)
CREATE TABLE collaboration_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    allow_anonymous BOOLEAN DEFAULT FALSE,
    max_participants INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration members
CREATE TABLE collaboration_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    color TEXT,
    role collab_role DEFAULT 'viewer',
    cursor_x INTEGER,
    cursor_y INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ============================================================================
-- SECTION 9: TEMPLATES
-- ============================================================================

-- Canvas templates
CREATE TABLE canvas_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    is_official BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    template_data JSONB NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 10: INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Canvas indexes
CREATE INDEX idx_canvases_user_id ON canvases(user_id);
CREATE INDEX idx_canvases_visibility ON canvases(visibility);
CREATE INDEX idx_canvases_slug ON canvases(slug);
CREATE INDEX idx_canvases_user_visibility ON canvases(user_id, visibility);
CREATE INDEX idx_canvases_created_at ON canvases(created_at DESC);
CREATE INDEX idx_canvases_updated_at ON canvases(updated_at DESC);
CREATE INDEX idx_canvases_view_count ON canvases(view_count DESC);

-- Widget indexes
CREATE INDEX idx_widget_instances_canvas_id ON widget_instances(canvas_id);
CREATE INDEX idx_widget_instances_widget_def_id ON widget_instances(widget_def_id);
CREATE INDEX idx_canvas_layers_canvas_id ON canvas_layers(canvas_id);
CREATE INDEX idx_pipelines_canvas_id ON pipelines(canvas_id);

-- Social indexes
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX idx_canvas_likes_canvas_id ON canvas_likes(canvas_id);
CREATE INDEX idx_canvas_likes_user_id ON canvas_likes(user_id);
CREATE INDEX idx_canvas_comments_canvas_id ON canvas_comments(canvas_id);
CREATE INDEX idx_canvas_comments_user_id ON canvas_comments(user_id);
CREATE INDEX idx_canvas_comments_parent_id ON canvas_comments(parent_id);
CREATE INDEX idx_canvas_comments_created_at ON canvas_comments(created_at DESC);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_activity_feed_actor_id ON activity_feed(actor_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);

-- Favorites indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_item ON favorites(favorite_type, item_id);
CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);

-- Marketplace indexes
CREATE INDEX idx_marketplace_items_creator_id ON marketplace_items(creator_id);
CREATE INDEX idx_marketplace_items_type ON marketplace_items(item_type);
CREATE INDEX idx_marketplace_items_slug ON marketplace_items(slug);
CREATE INDEX idx_marketplace_items_published ON marketplace_items(is_published);
CREATE INDEX idx_marketplace_reviews_item_id ON marketplace_reviews(marketplace_item_id);

-- Commerce indexes
CREATE INDEX idx_canvas_products_canvas_id ON canvas_products(canvas_id);
CREATE INDEX idx_canvas_products_creator_id ON canvas_products(creator_id);
CREATE INDEX idx_canvas_orders_canvas_id ON canvas_orders(canvas_id);
CREATE INDEX idx_canvas_orders_creator_id ON canvas_orders(creator_id);
CREATE INDEX idx_canvas_orders_customer_id ON canvas_orders(customer_id);
CREATE INDEX idx_form_submissions_canvas_id ON form_submissions(canvas_id);
CREATE INDEX idx_form_submissions_creator_id ON form_submissions(creator_id);

-- Chat indexes
CREATE INDEX idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX idx_chat_room_members_user_id ON chat_room_members(user_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Collaboration indexes
CREATE INDEX idx_collaboration_rooms_canvas_id ON collaboration_rooms(canvas_id);
CREATE INDEX idx_collaboration_members_room_id ON collaboration_members(room_id);

-- ============================================================================
-- SECTION 11: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_links_updated_at
    BEFORE UPDATE ON social_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvases_updated_at
    BEFORE UPDATE ON canvases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_settings_updated_at
    BEFORE UPDATE ON canvas_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_backgrounds_updated_at
    BEFORE UPDATE ON canvas_backgrounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_instances_updated_at
    BEFORE UPDATE ON widget_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_layers_updated_at
    BEFORE UPDATE ON canvas_layers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_groups_updated_at
    BEFORE UPDATE ON widget_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_stickers_updated_at
    BEFORE UPDATE ON canvas_stickers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dock_zones_updated_at
    BEFORE UPDATE ON dock_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_comments_updated_at
    BEFORE UPDATE ON canvas_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_favorite_collections_updated_at
    BEFORE UPDATE ON favorite_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_collections_updated_at
    BEFORE UPDATE ON canvas_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_items_updated_at
    BEFORE UPDATE ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sticker_packs_updated_at
    BEFORE UPDATE ON sticker_packs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_reviews_updated_at
    BEFORE UPDATE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_products_updated_at
    BEFORE UPDATE ON canvas_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_orders_updated_at
    BEFORE UPDATE ON canvas_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
    BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_notification_settings_updated_at
    BEFORE UPDATE ON creator_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_rooms_updated_at
    BEFORE UPDATE ON collaboration_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_templates_updated_at
    BEFORE UPDATE ON canvas_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO user_profiles (user_id, email, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Create user stats
    INSERT INTO user_stats (user_id) VALUES (NEW.id);

    -- Create notification preferences
    INSERT INTO notification_preferences (user_id) VALUES (NEW.id);

    -- Create default favorite collection
    INSERT INTO favorite_collections (user_id, name, is_default)
    VALUES (NEW.id, 'Favorites', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 0;
    slug_exists BOOLEAN;
BEGIN
    -- Create base slug from name
    slug := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
    slug := TRIM(BOTH '-' FROM slug);

    -- Check if slug exists
    SELECT EXISTS(SELECT 1 FROM canvases WHERE canvases.slug = slug) INTO slug_exists;

    -- If exists, add random suffix
    WHILE slug_exists LOOP
        counter := counter + 1;
        slug := slug || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
        SELECT EXISTS(SELECT 1 FROM canvases WHERE canvases.slug = slug) INTO slug_exists;
    END LOOP;

    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_canvas_view(canvas_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE canvases SET view_count = view_count + 1 WHERE id = canvas_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following count for follower
        UPDATE user_stats SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
        -- Increment followers count for followed user
        UPDATE user_stats SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following count for follower
        UPDATE user_stats SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
        -- Decrement followers count for followed user
        UPDATE user_stats SET followers_count = GREATEST(0, followers_count - 1) WHERE user_id = OLD.following_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE canvases SET like_count = like_count + 1 WHERE id = NEW.canvas_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE canvases SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.canvas_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_counts_trigger
    AFTER INSERT OR DELETE ON canvas_likes
    FOR EACH ROW EXECUTE FUNCTION update_like_counts();

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE canvases SET comment_count = comment_count + 1 WHERE id = NEW.canvas_id;
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE canvas_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE canvases SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.canvas_id;
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE canvas_comments SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_counts_trigger
    AFTER INSERT OR DELETE ON canvas_comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- ============================================================================
-- SECTION 12: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dock_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
    ON user_profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can insert their own profile (handled by trigger, but just in case)
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SOCIAL LINKS POLICIES
-- ============================================================================

CREATE POLICY "Social links are viewable by everyone"
    ON social_links FOR SELECT
    USING (true);

CREATE POLICY "Users can manage own social links"
    ON social_links FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- USER STATS POLICIES
-- ============================================================================

CREATE POLICY "Stats are viewable by everyone"
    ON user_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can view own stats"
    ON user_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CANVASES POLICIES
-- ============================================================================

-- Public canvases are viewable by everyone
CREATE POLICY "Public canvases are viewable by everyone"
    ON canvases FOR SELECT
    USING (visibility = 'public' OR visibility = 'unlisted' OR auth.uid() = user_id);

-- Users can create canvases
CREATE POLICY "Authenticated users can create canvases"
    ON canvases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own canvases
CREATE POLICY "Users can update own canvases"
    ON canvases FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own canvases
CREATE POLICY "Users can delete own canvases"
    ON canvases FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CANVAS SETTINGS/BACKGROUNDS POLICIES
-- ============================================================================

CREATE POLICY "Canvas settings viewable with canvas"
    ON canvas_settings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = canvas_settings.canvas_id
        AND (canvases.visibility IN ('public', 'unlisted') OR canvases.user_id = auth.uid())
    ));

CREATE POLICY "Canvas owners can manage settings"
    ON canvas_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = canvas_settings.canvas_id
        AND canvases.user_id = auth.uid()
    ));

CREATE POLICY "Canvas backgrounds viewable with canvas"
    ON canvas_backgrounds FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = canvas_backgrounds.canvas_id
        AND (canvases.visibility IN ('public', 'unlisted') OR canvases.user_id = auth.uid())
    ));

CREATE POLICY "Canvas owners can manage backgrounds"
    ON canvas_backgrounds FOR ALL
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = canvas_backgrounds.canvas_id
        AND canvases.user_id = auth.uid()
    ));

-- ============================================================================
-- WIDGET INSTANCES POLICIES
-- ============================================================================

CREATE POLICY "Widgets viewable with canvas"
    ON widget_instances FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = widget_instances.canvas_id
        AND (canvases.visibility IN ('public', 'unlisted') OR canvases.user_id = auth.uid())
    ));

CREATE POLICY "Canvas owners can manage widgets"
    ON widget_instances FOR ALL
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = widget_instances.canvas_id
        AND canvases.user_id = auth.uid()
    ));

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================

CREATE POLICY "Follows are viewable by everyone"
    ON follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE
    USING (auth.uid() = follower_id);

-- ============================================================================
-- CANVAS LIKES POLICIES
-- ============================================================================

CREATE POLICY "Likes are viewable by everyone"
    ON canvas_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like canvases"
    ON canvas_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike canvases"
    ON canvas_likes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CANVAS COMMENTS POLICIES
-- ============================================================================

CREATE POLICY "Comments on public canvases are viewable"
    ON canvas_comments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM canvases
        WHERE canvases.id = canvas_comments.canvas_id
        AND (canvases.visibility = 'public' OR canvases.user_id = auth.uid())
    ));

CREATE POLICY "Authenticated users can comment"
    ON canvas_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own comments"
    ON canvas_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON canvas_comments FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FAVORITES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
    ON favorites FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own collections"
    ON favorite_collections FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage own collections"
    ON favorite_collections FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- MARKETPLACE POLICIES
-- ============================================================================

CREATE POLICY "Published items are viewable by everyone"
    ON marketplace_items FOR SELECT
    USING (is_published = true OR auth.uid() = creator_id);

CREATE POLICY "Users can create marketplace items"
    ON marketplace_items FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own items"
    ON marketplace_items FOR UPDATE
    USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own items"
    ON marketplace_items FOR DELETE
    USING (auth.uid() = creator_id);

-- Widget registry is public
CREATE POLICY "Widget registry is viewable by everyone"
    ON widget_registry FOR SELECT
    USING (true);

-- ============================================================================
-- CHAT POLICIES
-- ============================================================================

CREATE POLICY "Users can view rooms they are members of"
    ON chat_rooms FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM chat_room_members
        WHERE chat_room_members.room_id = chat_rooms.id
        AND chat_room_members.user_id = auth.uid()
    ));

CREATE POLICY "Users can view messages in their rooms"
    ON chat_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM chat_room_members
        WHERE chat_room_members.room_id = chat_messages.room_id
        AND chat_room_members.user_id = auth.uid()
    ));

CREATE POLICY "Users can send messages to their rooms"
    ON chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chat_room_members
            WHERE chat_room_members.room_id = chat_messages.room_id
            AND chat_room_members.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COMMERCE POLICIES
-- ============================================================================

CREATE POLICY "Products on public canvases are viewable"
    ON canvas_products FOR SELECT
    USING (
        active = true AND
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = canvas_products.canvas_id
            AND canvases.visibility = 'public'
        )
    );

CREATE POLICY "Creators can manage own products"
    ON canvas_products FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Creators can view own orders"
    ON canvas_orders FOR SELECT
    USING (auth.uid() = creator_id);

CREATE POLICY "Creators can view own form submissions"
    ON form_submissions FOR SELECT
    USING (auth.uid() = creator_id);

-- ============================================================================
-- COLLABORATION POLICIES
-- ============================================================================

CREATE POLICY "Collaboration rooms viewable by members"
    ON collaboration_rooms FOR SELECT
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM collaboration_members
            WHERE collaboration_members.room_id = collaboration_rooms.id
            AND collaboration_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Canvas owners can create collab rooms"
    ON collaboration_rooms FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- TEMPLATES POLICIES
-- ============================================================================

CREATE POLICY "Templates are viewable by everyone"
    ON canvas_templates FOR SELECT
    USING (true);

CREATE POLICY "Users can create templates"
    ON canvas_templates FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

-- ============================================================================
-- DONE!
-- ============================================================================
