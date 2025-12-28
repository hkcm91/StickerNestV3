# StickerNest v2 - Widget Pipeline & Marketplace Architecture

## Overview

This document describes the architecture for the widget pipeline (submission, validation, approval) and marketplace (discovery, ratings, commerce).

## Widget Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WIDGET PIPELINE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  CREATE  │───▶│ VALIDATE │───▶│  REVIEW  │───▶│ PUBLISH  │      │
│  │          │    │          │    │          │    │          │      │
│  │ Widget   │    │ Manifest │    │ Manual   │    │ Version  │      │
│  │ Lab      │    │ Security │    │ Quality  │    │ Release  │      │
│  │ AI Gen   │    │ Protocol │    │ Check    │    │ CDN      │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │               │               │               │              │
│       ▼               ▼               ▼               ▼              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    WIDGET STORE                               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │  │
│  │  │ Draft   │  │ Pending │  │ Published│  │ Deprecated     │ │  │
│  │  │ Widgets │  │ Review  │  │ Widgets  │  │ (Old Versions) │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. Widget Lifecycle States

```typescript
// src/types/marketplace.ts

type WidgetStatus =
  | 'draft'        // Being developed, not submitted
  | 'validating'   // Automated validation in progress
  | 'pending'      // Awaiting manual review
  | 'approved'     // Ready for publishing
  | 'published'    // Live in marketplace
  | 'rejected'     // Failed review (can resubmit)
  | 'suspended'    // Temporarily removed
  | 'deprecated';  // Old version, still functional

interface WidgetSubmission {
  id: string;
  widgetId: string;
  version: string;
  userId: string;
  status: WidgetStatus;

  // Submission metadata
  changelog: string;
  submittedAt: number;
  validatedAt?: number;
  reviewedAt?: number;
  publishedAt?: number;

  // Validation results
  validationResult?: ValidationResult;
  reviewNotes?: ReviewNote[];

  // The actual widget bundle
  bundle: WidgetBundle;
}
```

## 2. Validation Pipeline

### 2.1 Automated Validation

```typescript
// src/services/widgetValidation.ts

interface ValidationResult {
  passed: boolean;
  score: number;           // 0-100
  checks: ValidationCheck[];
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

interface ValidationCheck {
  name: string;
  category: 'manifest' | 'security' | 'protocol' | 'performance' | 'accessibility';
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

class WidgetValidator {
  async validate(bundle: WidgetBundle): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    // 1. Manifest validation
    checks.push(...await this.validateManifest(bundle.manifest));

    // 2. Security checks
    checks.push(...await this.validateSecurity(bundle));

    // 3. Protocol compliance
    checks.push(...await this.validateProtocol(bundle));

    // 4. Performance analysis
    checks.push(...await this.validatePerformance(bundle));

    // 5. Accessibility checks
    checks.push(...await this.validateAccessibility(bundle));

    return this.compileResults(checks);
  }
}
```

### 2.2 Validation Checks

**Manifest Validation:**
- Required fields present
- Version format valid (semver)
- Inputs/outputs defined
- Capabilities declared
- Size constraints met

**Security Validation:**
- No eval() or Function() constructor
- No inline event handlers with external URLs
- No localStorage access outside sandbox
- No external resource loading without declaration
- CSP compliance

**Protocol Validation:**
- Uses WidgetAPI correctly
- Emits outputs in correct format
- Handles inputs properly
- Signals READY on init
- Error handling present

**Performance Validation:**
- Bundle size within limits
- No blocking operations
- Memory leak detection (static analysis)
- Reasonable DOM complexity

**Accessibility Validation:**
- ARIA labels present
- Keyboard navigation
- Color contrast (if visual)
- Focus management

## 3. Widget Marketplace

### 3.1 Data Models

```typescript
// src/types/marketplace.ts

interface MarketplaceWidget {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  version: string;
  author: WidgetAuthor;
  category: WidgetCategory;
  tags: string[];

  // Media
  icon: string;
  screenshots: string[];
  previewVideo?: string;

  // Capabilities summary
  kind: WidgetKind;
  inputs: PortSummary[];
  outputs: PortSummary[];
  capabilities: WidgetCapabilities;

  // Stats
  stats: WidgetStats;

  // Pricing (future)
  pricing: WidgetPricing;

  // Metadata
  createdAt: number;
  updatedAt: number;
  publishedAt: number;
}

interface WidgetAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  widgetCount: number;
  totalDownloads: number;
}

interface WidgetStats {
  downloads: number;
  weeklyDownloads: number;
  installs: number;       // Active installations
  rating: number;         // 1-5
  ratingCount: number;
  favoriteCount: number;
}

interface WidgetPricing {
  type: 'free' | 'paid' | 'subscription' | 'donation';
  price?: number;
  currency?: string;
  trialDays?: number;
}

type WidgetCategory =
  | 'display'        // Text, images, video players
  | 'input'          // Buttons, forms, controls
  | 'data'           // Charts, tables, visualizations
  | 'media'          // Audio, video, animation
  | 'utility'        // Timers, calculators, converters
  | 'game'           // Games and interactive
  | 'social'         // Chat, feeds, embeds
  | 'ai'             // AI-powered widgets
  | 'integration'    // External service integrations
  | 'other';
```

### 3.2 Marketplace Service

```typescript
// src/services/marketplaceClient.ts

interface SearchFilters {
  query?: string;
  category?: WidgetCategory;
  kind?: WidgetKind;
  tags?: string[];
  author?: string;
  pricing?: 'free' | 'paid' | 'all';
  minRating?: number;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'newest' | 'updated';
  page?: number;
  limit?: number;
}

interface SearchResult {
  widgets: MarketplaceWidget[];
  total: number;
  page: number;
  hasMore: boolean;
  facets: {
    categories: { [key: string]: number };
    tags: { [key: string]: number };
  };
}

class MarketplaceClient {
  // Discovery
  async search(filters: SearchFilters): Promise<SearchResult>;
  async getFeatured(): Promise<MarketplaceWidget[]>;
  async getPopular(category?: WidgetCategory): Promise<MarketplaceWidget[]>;
  async getNewReleases(): Promise<MarketplaceWidget[]>;
  async getByAuthor(authorId: string): Promise<MarketplaceWidget[]>;
  async getRelated(widgetId: string): Promise<MarketplaceWidget[]>;

  // Widget details
  async getWidget(widgetId: string): Promise<MarketplaceWidget>;
  async getVersionHistory(widgetId: string): Promise<WidgetVersion[]>;
  async getReviews(widgetId: string, page?: number): Promise<WidgetReview[]>;

  // User actions
  async install(widgetId: string): Promise<void>;
  async uninstall(widgetId: string): Promise<void>;
  async favorite(widgetId: string): Promise<void>;
  async unfavorite(widgetId: string): Promise<void>;
  async report(widgetId: string, reason: string): Promise<void>;

  // Reviews
  async addReview(widgetId: string, review: NewReview): Promise<WidgetReview>;
  async updateReview(reviewId: string, review: NewReview): Promise<WidgetReview>;
  async deleteReview(reviewId: string): Promise<void>;

  // Creator actions
  async submitWidget(submission: NewWidgetSubmission): Promise<WidgetSubmission>;
  async updateWidget(widgetId: string, submission: NewWidgetSubmission): Promise<WidgetSubmission>;
  async deprecateVersion(widgetId: string, version: string): Promise<void>;
  async getMyWidgets(): Promise<MarketplaceWidget[]>;
  async getSubmissionStatus(submissionId: string): Promise<WidgetSubmission>;
}
```

### 3.3 Review System

```typescript
interface WidgetReview {
  id: string;
  widgetId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;        // 1-5
  title: string;
  body: string;
  version: string;       // Version reviewed
  helpful: number;       // Helpful votes
  reported: boolean;
  authorResponse?: {
    body: string;
    createdAt: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface NewReview {
  rating: number;
  title: string;
  body: string;
}
```

## 4. Sticker Marketplace

### 4.1 Sticker Types

```typescript
interface MarketplaceSticker {
  id: string;
  name: string;
  description: string;
  author: StickerAuthor;
  category: StickerCategory;
  tags: string[];

  // Media
  preview: string;        // Static preview
  animatedPreview?: string; // Animated preview (for Lottie/GIF)
  mediaType: StickerMediaType;

  // Pack info (stickers often come in packs)
  packId?: string;
  packName?: string;

  // Stats
  downloads: number;
  favorites: number;

  // Pricing
  pricing: StickerPricing;

  createdAt: number;
}

interface StickerPack {
  id: string;
  name: string;
  description: string;
  author: StickerAuthor;
  stickers: MarketplaceSticker[];
  preview: string;
  pricing: StickerPricing;
  stats: {
    downloads: number;
    favorites: number;
    stickerCount: number;
  };
}

type StickerCategory =
  | 'emoji'
  | 'characters'
  | 'animals'
  | 'food'
  | 'nature'
  | 'objects'
  | 'symbols'
  | 'abstract'
  | 'memes'
  | 'seasonal'
  | 'custom';

type StickerMediaType = 'image' | 'gif' | 'lottie' | 'video';
```

## 5. Database Schema

```sql
-- Widget marketplace tables
CREATE TABLE marketplace_widgets (
  id UUID PRIMARY KEY,
  manifest_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  version VARCHAR(50) NOT NULL,
  author_id UUID REFERENCES users(id),
  category VARCHAR(50),
  tags TEXT[],
  kind VARCHAR(20),
  icon_url TEXT,
  screenshots TEXT[],
  preview_video TEXT,
  bundle_url TEXT NOT NULL,
  bundle_hash VARCHAR(64),
  status VARCHAR(20) DEFAULT 'draft',
  pricing_type VARCHAR(20) DEFAULT 'free',
  price DECIMAL(10,2),
  downloads INTEGER DEFAULT 0,
  weekly_downloads INTEGER DEFAULT 0,
  installs INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Widget versions
CREATE TABLE widget_versions (
  id UUID PRIMARY KEY,
  widget_id UUID REFERENCES marketplace_widgets(id),
  version VARCHAR(50) NOT NULL,
  changelog TEXT,
  bundle_url TEXT NOT NULL,
  bundle_hash VARCHAR(64),
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  UNIQUE(widget_id, version)
);

-- Widget submissions
CREATE TABLE widget_submissions (
  id UUID PRIMARY KEY,
  widget_id UUID REFERENCES marketplace_widgets(id),
  version VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'validating',
  changelog TEXT,
  validation_result JSONB,
  review_notes JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ
);

-- Widget reviews
CREATE TABLE widget_reviews (
  id UUID PRIMARY KEY,
  widget_id UUID REFERENCES marketplace_widgets(id),
  user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,
  version VARCHAR(50),
  helpful_count INTEGER DEFAULT 0,
  reported BOOLEAN DEFAULT false,
  author_response TEXT,
  author_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(widget_id, user_id)
);

-- User widget library (installed widgets)
CREATE TABLE user_widget_library (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  widget_id UUID REFERENCES marketplace_widgets(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  favorited BOOLEAN DEFAULT false,
  favorited_at TIMESTAMPTZ,
  UNIQUE(user_id, widget_id)
);

-- Sticker marketplace tables
CREATE TABLE marketplace_stickers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  author_id UUID REFERENCES users(id),
  pack_id UUID,
  category VARCHAR(50),
  tags TEXT[],
  media_type VARCHAR(20),
  media_url TEXT NOT NULL,
  preview_url TEXT,
  animated_preview_url TEXT,
  pricing_type VARCHAR(20) DEFAULT 'free',
  price DECIMAL(10,2),
  downloads INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sticker_packs (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  author_id UUID REFERENCES users(id),
  preview_url TEXT,
  pricing_type VARCHAR(20) DEFAULT 'free',
  price DECIMAL(10,2),
  downloads INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  sticker_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. API Endpoints

```typescript
// Widget Marketplace
GET    /api/marketplace/widgets              // Search/list widgets
GET    /api/marketplace/widgets/featured     // Featured widgets
GET    /api/marketplace/widgets/popular      // Popular widgets
GET    /api/marketplace/widgets/:id          // Widget details
GET    /api/marketplace/widgets/:id/versions // Version history
GET    /api/marketplace/widgets/:id/reviews  // Reviews
POST   /api/marketplace/widgets/:id/install  // Install widget
DELETE /api/marketplace/widgets/:id/install  // Uninstall widget
POST   /api/marketplace/widgets/:id/favorite // Favorite
DELETE /api/marketplace/widgets/:id/favorite // Unfavorite
POST   /api/marketplace/widgets/:id/reviews  // Add review
POST   /api/marketplace/widgets/:id/report   // Report widget

// Widget submissions (creator)
POST   /api/marketplace/submissions          // Submit new widget
GET    /api/marketplace/submissions          // My submissions
GET    /api/marketplace/submissions/:id      // Submission status
PUT    /api/marketplace/submissions/:id      // Update submission

// My widgets (creator)
GET    /api/marketplace/my-widgets           // My published widgets
GET    /api/marketplace/my-widgets/:id/stats // Widget stats

// Sticker Marketplace
GET    /api/marketplace/stickers             // Search stickers
GET    /api/marketplace/stickers/packs       // Sticker packs
GET    /api/marketplace/stickers/:id         // Sticker details
POST   /api/marketplace/stickers/:id/download // Download sticker
```

## 7. UI Components

### 7.1 Marketplace Pages

1. **MarketplacePage** - Main marketplace with search and browse
2. **WidgetDetailPage** - Individual widget details, reviews, install
3. **StickerMarketplacePage** - Sticker browsing and packs
4. **MyLibraryPage** - User's installed widgets and favorites
5. **CreatorDashboard** - Widget submission and management

### 7.2 Components

1. **WidgetCard** - Widget preview card for listings
2. **WidgetDetailView** - Full widget info and actions
3. **ReviewList** - Widget reviews with ratings
4. **ReviewForm** - Add/edit review
5. **SubmissionForm** - Multi-step widget submission
6. **ValidationResults** - Show validation checks
7. **VersionSelector** - Version dropdown
8. **StickerGrid** - Grid of stickers
9. **StickerPackCard** - Sticker pack preview
10. **CategoryFilter** - Filter by category
11. **SearchBar** - Search with suggestions

## 8. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Database schema creation
- [ ] MarketplaceClient implementation
- [ ] WidgetValidator implementation
- [ ] Basic API endpoints

### Phase 2: Submission Flow
- [ ] SubmissionForm component
- [ ] Automated validation
- [ ] Creator dashboard
- [ ] Version management

### Phase 3: Discovery & Install
- [ ] MarketplacePage
- [ ] WidgetDetailPage
- [ ] Search and filters
- [ ] Install/uninstall flow
- [ ] User library

### Phase 4: Community Features
- [ ] Review system
- [ ] Ratings aggregation
- [ ] Favorites
- [ ] Report system

### Phase 5: Sticker Marketplace
- [ ] Sticker upload flow
- [ ] Sticker packs
- [ ] StickerMarketplacePage
- [ ] Integration with sticker library

### Phase 6: Commerce (Future)
- [ ] Payment integration (Stripe)
- [ ] Creator payouts
- [ ] Subscription support
- [ ] Analytics dashboard
