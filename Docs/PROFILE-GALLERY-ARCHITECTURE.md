# StickerNest Profile & Gallery System Architecture

## Document Version: 1.0
## Status: Phase 1 - Planning
## Last Updated: 2025-12-16

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Data Models & Schema](#4-data-models--schema)
5. [URL Structure & Routing](#5-url-structure--routing)
6. [Component Architecture](#6-component-architecture)
7. [State Management](#7-state-management)
8. [API Design](#8-api-design)
9. [Security & Access Control](#9-security--access-control)
10. [SEO & Social Sharing](#10-seo--social-sharing)
11. [Implementation Phases](#11-implementation-phases)
12. [Technical Decisions](#12-technical-decisions)

---

## 1. Executive Summary

### Project Goal
Create a comprehensive public-facing profile and gallery system for StickerNest that allows users to:
- Publish canvases with varying visibility levels (public, private, password-protected)
- Share canvases via custom slugs (stickernest.vercel.app/c/my-canvas)
- Showcase their work on public profile pages (@username)
- Discover and explore other creators' public canvases
- Open canvases in new tabs for multi-canvas workflows

### Key Features
1. **Public User Profiles** - Front-facing profile pages with canvas galleries
2. **Canvas Visibility System** - Public, private, unlisted, and password-protected canvases
3. **Custom Slug URLs** - User-friendly shareable links
4. **Public Gallery Discovery** - Browse and search public canvases from all users
5. **New Tab Canvas Opening** - Open canvases in separate browser tabs

### Base URL
- Production: `stickernest.vercel.app`
- Development: `localhost:5173`

---

## 2. Current State Analysis

### Existing Infrastructure

#### Routes (AppRouter.tsx)
```
/                     - Landing page
/app                  - Main canvas workspace
/login, /signup       - Authentication
/auth/callback        - OAuth callback
/profile              - User's own profile
/profile/:username    - Specific user's profile
/@:username           - Short profile URL (Twitter-style)
/marketplace          - Widget marketplace
/settings             - User settings
/canvas/:canvasId     - Canvas by ID (authenticated)
/editor/:canvasId     - Canvas editor
/c/:slug              - Shared canvas by slug (public)
/embed/:slug          - Embeddable canvas
```

#### Existing Types (domain.ts)
```typescript
type CanvasVisibility = "private" | "unlisted" | "public";

interface Canvas {
  id: string;
  userId: string;
  name: string;
  visibility: CanvasVisibility;
  slug?: string;
  hasPassword?: boolean;
  description?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  // ...
}

interface CanvasShareSettings {
  visibility: CanvasVisibility;
  slug?: string;
  password?: string;
  allowEmbed?: boolean;
  expiresAt?: string;
}
```

#### Existing Stores
- `usePublishStore` - Canvas publishing workflow (multi-step)
- `useCanvasStore` - Core canvas state
- `useSocialStore` - Social features (follows, etc.)
- `useFeedStore` - User feed data

#### Existing Pages
- `ProfilePage.tsx` - Basic profile with tabs (public/private/favorites)
- `GalleryPage.tsx` - User's canvas management (authenticated)
- `SharedCanvasPage.tsx` - Public canvas viewing

### Gaps to Address
1. No password protection UI implementation
2. No public discovery gallery (all users' public canvases)
3. Profile page needs enhancement (banner, customization)
4. Slug editing needs better UX with availability checking
5. No "open in new tab" functionality
6. Limited SEO meta tag implementation

---

## 3. System Architecture Overview

### High-Level Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Landing Page   |     |  Public Gallery  |     |  User Profile    |
|   (/)            |     |  (/explore)      |     |  (/@username)    |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+------------------------------------------------------------------------+
|                                                                        |
|                         ROUTING LAYER (React Router)                   |
|   /c/:slug (public) | /@:username (profile) | /explore (gallery)      |
|                                                                        |
+--------+------------------------+------------------------+-------------+
         |                        |                        |
         v                        v                        v
+--------+---------+     +--------+---------+     +--------+---------+
|                  |     |                  |     |                  |
| PublicCanvasView |     | PublicProfile    |     | PublicGallery    |
| Component        |     | Component        |     | Component        |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+------------------------------------------------------------------------+
|                                                                        |
|                         STATE MANAGEMENT (Zustand)                     |
|   usePublicCanvasStore | usePublicProfileStore | usePublicGalleryStore |
|                                                                        |
+--------+------------------------+------------------------+-------------+
         |                        |                        |
         v                        v                        v
+------------------------------------------------------------------------+
|                                                                        |
|                         API LAYER (apiClient)                          |
|   canvasApi | userApi | galleryApi | socialApi | searchApi            |
|                                                                        |
+--------+------------------------+------------------------+-------------+
         |                        |                        |
         v                        v                        v
+------------------------------------------------------------------------+
|                                                                        |
|                         BACKEND / SUPABASE                             |
|   Canvas Table | Users Table | Follows | Analytics | Storage          |
|                                                                        |
+------------------------------------------------------------------------+
```

### Component Hierarchy

```
App
├── PublicLayout (no auth required)
│   ├── PublicHeader
│   ├── Routes
│   │   ├── /explore → PublicGalleryPage
│   │   │   ├── GalleryHeader
│   │   │   ├── GalleryFilters
│   │   │   ├── CanvasGrid
│   │   │   │   └── CanvasCard[]
│   │   │   └── InfiniteScrollLoader
│   │   │
│   │   ├── /@:username → PublicProfilePage
│   │   │   ├── ProfileHeader
│   │   │   │   ├── ProfileBanner
│   │   │   │   ├── UserAvatar
│   │   │   │   ├── ProfileStats
│   │   │   │   └── FollowButton
│   │   │   ├── ProfileTabs
│   │   │   │   ├── CanvasesTab
│   │   │   │   ├── CollectionsTab
│   │   │   │   └── AboutTab
│   │   │   └── CanvasGrid
│   │   │
│   │   └── /c/:slug → PublicCanvasPage
│   │       ├── PasswordPrompt (if protected)
│   │       ├── CanvasHeader
│   │       ├── ReadOnlyCanvas
│   │       ├── CanvasActions (like, share, fork)
│   │       ├── AuthorCard
│   │       └── RelatedCanvases
│   │
│   └── PublicFooter
│
└── AuthenticatedLayout
    └── (existing app routes)
```

---

## 4. Data Models & Schema

### Enhanced User Profile

```typescript
interface UserProfile {
  // Core fields
  id: string;
  username: string;
  email: string;

  // Display fields
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  website?: string;
  location?: string;

  // Social links
  socialLinks?: {
    twitter?: string;
    github?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  // Profile customization
  profileSettings?: {
    themeColor?: string;
    layoutPreference?: 'grid' | 'masonry' | 'list';
    showStats?: boolean;
    showFollowers?: boolean;
    featuredCanvasIds?: string[];
  };

  // Status
  isVerified: boolean;
  isCreator: boolean;
  role: 'user' | 'creator' | 'admin';

  // Stats (computed)
  stats: {
    publicCanvases: number;
    followers: number;
    following: number;
    totalViews: number;
    totalLikes: number;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Enhanced Canvas Model

```typescript
interface Canvas {
  // Core fields
  id: string;
  userId: string;
  name: string;
  description?: string;

  // Dimensions
  width: number;
  height: number;

  // Visibility & Access
  visibility: 'private' | 'unlisted' | 'public';
  slug?: string;
  hasPassword: boolean;
  passwordHash?: string; // Server-side only
  allowEmbed: boolean;
  allowFork: boolean;

  // Media
  thumbnailUrl?: string;
  previewGif?: string;

  // Organization
  tags?: string[];
  category?: CanvasCategory;

  // Stats
  viewCount: number;
  likeCount: number;
  forkCount: number;
  commentCount: number;

  // SEO
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
    keywords?: string[];
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  // Relations (populated)
  owner?: UserProfile;
  widgets?: WidgetInstance[];
}

type CanvasCategory =
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
```

### Canvas Access Session (for password-protected canvases)

```typescript
interface CanvasAccessSession {
  canvasId: string;
  sessionToken: string;
  expiresAt: string;  // 24 hours from creation
  createdAt: string;
}
```

### Slug Model

```typescript
interface CanvasSlug {
  slug: string;
  canvasId: string;
  userId: string;
  isPrimary: boolean;  // Current active slug
  createdAt: string;
  expiresAt?: string;  // For temporary/expiring slugs
}
```

---

## 5. URL Structure & Routing

### Public Routes (No Auth Required)

| Route | Description | Component |
|-------|-------------|-----------|
| `/` | Landing page | LandingPage |
| `/explore` | Public canvas gallery | PublicGalleryPage |
| `/explore/:category` | Filtered gallery | PublicGalleryPage |
| `/@:username` | User profile | PublicProfilePage |
| `/@:username/:slug` | User's canvas (vanity URL) | PublicCanvasPage |
| `/c/:slug` | Canvas by slug | PublicCanvasPage |
| `/embed/:slug` | Embeddable canvas | EmbedCanvasPage |

### Authenticated Routes

| Route | Description | Component |
|-------|-------------|-----------|
| `/app` | Canvas workspace | MainApp |
| `/gallery` | User's canvas management | GalleryPage |
| `/editor/:canvasId` | Canvas editor | EditorPage |
| `/settings` | User settings | SettingsPage |
| `/profile` | Own profile (redirect to /@username) | ProfilePage |

### URL Priority & Resolution

```
1. Exact match routes first (/explore, /settings, /login)
2. Username routes (/@:username)
3. Canvas slug routes (/c/:slug)
4. Fallback to 404
```

### Redirect Rules

```
/gallery → /app (legacy redirect)
/dashboard → /app (legacy redirect)
/profile → /@{current_user.username}
/u/:username → /@:username (legacy redirect)
```

---

## 6. Component Architecture

### Shared UI Components (New)

```typescript
// src/shared-ui/public/

// CanvasCard - Preview card for canvas in galleries
interface CanvasCardProps {
  canvas: Canvas;
  variant?: 'compact' | 'detailed';
  showAuthor?: boolean;
  showStats?: boolean;
  onOpenInNewTab?: () => void;
  onLike?: () => void;
  onShare?: () => void;
}

// UserAvatar - Avatar with fallback
interface UserAvatarProps {
  user: Pick<UserProfile, 'avatarUrl' | 'displayName' | 'username'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  isVerified?: boolean;
}

// ProfileHeader - Full profile header
interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onFollow?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
}

// VisibilityBadge - Shows canvas visibility
interface VisibilityBadgeProps {
  visibility: CanvasVisibility;
  hasPassword?: boolean;
  size?: 'sm' | 'md';
}

// ShareModal - Share canvas/profile
interface ShareModalProps {
  type: 'canvas' | 'profile';
  url: string;
  title: string;
  embedCode?: string;
  onClose: () => void;
}

// PasswordPrompt - For protected canvases
interface PasswordPromptProps {
  canvasId: string;
  onSuccess: (sessionToken: string) => void;
  onCancel: () => void;
}

// FollowButton - Follow/unfollow user
interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  followerCount: number;
  onToggle: () => void;
  disabled?: boolean;
}

// InfiniteScrollContainer - Handles infinite scroll
interface InfiniteScrollContainerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}
```

### Page Components Structure

```
src/pages/public/
├── PublicGalleryPage.tsx    # /explore
├── PublicProfilePage.tsx    # /@username
├── PublicCanvasPage.tsx     # /c/:slug
└── components/
    ├── GalleryHeader.tsx
    ├── GalleryFilters.tsx
    ├── GallerySidebar.tsx
    ├── ProfileBanner.tsx
    ├── ProfileStats.tsx
    ├── ProfileTabs.tsx
    ├── CanvasGrid.tsx
    ├── CanvasHeader.tsx
    ├── ReadOnlyCanvasRenderer.tsx
    ├── AuthorCard.tsx
    ├── RelatedCanvases.tsx
    └── CanvasComments.tsx
```

---

## 7. State Management

### New Zustand Stores

#### usePublicGalleryStore

```typescript
interface PublicGalleryState {
  // Data
  canvases: Canvas[];
  featuredCanvases: Canvas[];
  totalCount: number;

  // Filters
  filters: {
    category?: CanvasCategory;
    sortBy: 'trending' | 'recent' | 'popular' | 'views';
    timeRange?: 'day' | 'week' | 'month' | 'all';
    search?: string;
  };

  // Pagination
  page: number;
  pageSize: number;
  hasMore: boolean;

  // UI State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  viewMode: 'grid' | 'masonry' | 'list';

  // Actions
  fetchCanvases: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (key: string, value: any) => void;
  resetFilters: () => void;
  setViewMode: (mode: 'grid' | 'masonry' | 'list') => void;
  refresh: () => Promise<void>;
}
```

#### usePublicProfileStore

```typescript
interface PublicProfileState {
  // Data
  profile: UserProfile | null;
  canvases: Canvas[];
  collections: Collection[];

  // Current view
  activeTab: 'canvases' | 'collections' | 'about';

  // Social
  isFollowing: boolean;
  followLoading: boolean;

  // Pagination
  canvasPage: number;
  hasMoreCanvases: boolean;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProfile: (username: string) => Promise<void>;
  fetchCanvases: (username: string) => Promise<void>;
  loadMoreCanvases: () => Promise<void>;
  toggleFollow: () => Promise<void>;
  setActiveTab: (tab: string) => void;
}
```

#### usePublicCanvasStore

```typescript
interface PublicCanvasState {
  // Data
  canvas: Canvas | null;
  widgets: WidgetInstance[];
  author: UserProfile | null;
  relatedCanvases: Canvas[];

  // Access
  isPasswordProtected: boolean;
  isUnlocked: boolean;
  accessToken: string | null;

  // Interaction
  isLiked: boolean;
  likeCount: number;
  viewCount: number;

  // UI State
  isLoading: boolean;
  error: string | null;
  showPasswordPrompt: boolean;

  // Actions
  fetchCanvas: (slug: string) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  toggleLike: () => Promise<void>;
  incrementView: () => void;
  fetchRelated: () => Promise<void>;
}
```

### Store Interactions

```
User visits /@username
        │
        v
usePublicProfileStore.fetchProfile(username)
        │
        ├─> API: GET /api/users/{username}/profile
        │
        v
Store updates with profile data
        │
        v
usePublicProfileStore.fetchCanvases(username)
        │
        ├─> API: GET /api/users/{username}/canvases?visibility=public
        │
        v
Store updates with canvases
        │
        v
Components re-render with new data
```

---

## 8. API Design

### Public API Endpoints

#### Gallery Endpoints

```
GET /api/gallery/canvases
  Query params:
    - category?: string
    - sortBy: 'trending' | 'recent' | 'popular'
    - timeRange?: 'day' | 'week' | 'month' | 'all'
    - search?: string
    - page: number
    - limit: number
  Response: { canvases: Canvas[], total: number, hasMore: boolean }

GET /api/gallery/featured
  Response: { canvases: Canvas[] }

GET /api/gallery/categories
  Response: { categories: CanvasCategory[] }
```

#### Profile Endpoints

```
GET /api/users/:username/profile
  Response: { profile: UserProfile }

GET /api/users/:username/canvases
  Query params:
    - visibility?: 'public' | 'all' (all only for own profile)
    - page: number
    - limit: number
  Response: { canvases: Canvas[], total: number, hasMore: boolean }

GET /api/users/:username/stats
  Response: { stats: UserStats }
```

#### Canvas Endpoints (Public)

```
GET /api/canvas/slug/:slug
  Headers: X-Access-Token (optional, for password-protected)
  Response: { canvas: Canvas, widgets: WidgetInstance[] }
  Errors: 404 (not found), 401 (password required), 403 (forbidden)

POST /api/canvas/:canvasId/verify-password
  Body: { password: string }
  Response: { success: boolean, accessToken?: string, expiresAt?: string }

POST /api/canvas/:canvasId/view
  Response: { viewCount: number }

POST /api/canvas/:canvasId/like
  Response: { isLiked: boolean, likeCount: number }

GET /api/canvas/:canvasId/related
  Response: { canvases: Canvas[] }
```

#### Slug Endpoints

```
GET /api/slugs/check/:slug
  Response: { available: boolean, suggestions?: string[] }

POST /api/slugs/reserve
  Body: { canvasId: string, slug: string }
  Response: { success: boolean, slug: string }

PUT /api/canvas/:canvasId/slug
  Body: { slug: string }
  Response: { success: boolean, oldSlug?: string, newSlug: string }
```

### API Client Extensions

```typescript
// src/services/api/gallery.ts
export const galleryApi = {
  list: (params: GalleryListParams) =>
    api.get<GalleryResponse>('/gallery/canvases', { params }),

  featured: () =>
    api.get<{ canvases: Canvas[] }>('/gallery/featured'),

  search: (query: string, params?: SearchParams) =>
    api.get<SearchResponse>('/gallery/search', { params: { q: query, ...params } }),
};

// src/services/api/public.ts
export const publicApi = {
  getProfile: (username: string) =>
    api.get<{ profile: UserProfile }>(`/users/${username}/profile`),

  getCanvases: (username: string, params?: PaginationParams) =>
    api.get<CanvasListResponse>(`/users/${username}/canvases`, { params }),

  getCanvasBySlug: (slug: string, accessToken?: string) =>
    api.get<CanvasResponse>(`/canvas/slug/${slug}`, {
      headers: accessToken ? { 'X-Access-Token': accessToken } : {},
    }),

  verifyPassword: (canvasId: string, password: string) =>
    api.post<PasswordVerifyResponse>(`/canvas/${canvasId}/verify-password`, { password }),
};
```

---

## 9. Security & Access Control

### Canvas Visibility Rules

| Visibility | Who Can View | Discoverable | Indexed |
|------------|--------------|--------------|---------|
| private | Owner only | No | No |
| unlisted | Anyone with link | No | No |
| public | Anyone | Yes (in gallery) | Yes |
| password | Anyone with password | Optional | No |

### Password Protection Implementation

```typescript
// Client-side flow
1. User visits /c/:slug
2. API returns { requiresPassword: true, canvasId: string }
3. PasswordPrompt component shown
4. User enters password
5. POST /api/canvas/:canvasId/verify-password
6. Server validates password hash
7. If valid: returns { accessToken, expiresAt }
8. Client stores token in sessionStorage
9. Subsequent requests include X-Access-Token header
10. Token expires after 24 hours

// Server-side
- Passwords hashed with bcrypt (cost factor 12)
- Access tokens are JWT with canvasId claim
- Tokens validated on each request
- Rate limiting: 5 attempts per minute per IP
```

### Access Token Storage

```typescript
// sessionStorage key pattern
const ACCESS_TOKEN_KEY = `sn-canvas-access-${canvasId}`;

// Token structure
interface AccessToken {
  token: string;
  canvasId: string;
  expiresAt: string;
}
```

### API Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| GET /gallery/* | 100/min | Per IP |
| POST /verify-password | 5/min | Per IP |
| POST /view | 10/min | Per session |
| POST /like | 30/min | Per user |
| GET /canvas/slug/* | 60/min | Per IP |

---

## 10. SEO & Social Sharing

### Meta Tag Strategy

```typescript
interface PageMetaTags {
  title: string;
  description: string;
  canonical: string;
  robots: string;

  // Open Graph
  'og:type': string;
  'og:title': string;
  'og:description': string;
  'og:image': string;
  'og:url': string;
  'og:site_name': string;

  // Twitter
  'twitter:card': string;
  'twitter:title': string;
  'twitter:description': string;
  'twitter:image': string;
  'twitter:creator'?: string;

  // Structured data
  'application/ld+json': string;
}
```

### Page-Specific SEO

#### Public Canvas Page (/c/:slug)
```html
<title>{canvas.seo.title || canvas.name} | StickerNest</title>
<meta name="description" content="{canvas.seo.description || canvas.description}" />
<meta property="og:type" content="article" />
<meta property="og:image" content="{canvas.thumbnailUrl || defaultOgImage}" />
<link rel="canonical" href="https://stickernest.vercel.app/c/{slug}" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{canvas.name}",
  "description": "{canvas.description}",
  "author": {
    "@type": "Person",
    "name": "{canvas.owner.displayName}",
    "url": "https://stickernest.vercel.app/@{canvas.owner.username}"
  },
  "datePublished": "{canvas.publishedAt}",
  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": "https://schema.org/ViewAction",
    "userInteractionCount": "{canvas.viewCount}"
  }
}
</script>
```

#### Profile Page (/@:username)
```html
<title>{profile.displayName} (@{profile.username}) | StickerNest</title>
<meta name="description" content="{profile.bio || defaultBio}" />
<meta property="og:type" content="profile" />
<meta property="og:image" content="{profile.avatarUrl || defaultAvatar}" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": {
    "@type": "Person",
    "name": "{profile.displayName}",
    "alternateName": "{profile.username}",
    "url": "https://stickernest.vercel.app/@{profile.username}",
    "image": "{profile.avatarUrl}"
  }
}
</script>
```

### Dynamic OG Image Generation

```typescript
// API endpoint: GET /api/og/canvas/:canvasId
// Returns: PNG image (1200x630)

// Template includes:
// - Canvas thumbnail or first frame
// - Canvas name
// - Author avatar and name
// - StickerNest branding
// - View count badge
```

---

## 11. Implementation Phases

### Phase 1: Planning & Design (Current)
- [x] System architecture document
- [ ] Database schema design
- [ ] URL structure finalization
- [ ] Component wireframes
- [ ] API endpoint design

### Phase 2: Core Infrastructure
- [ ] Enhanced Canvas type
- [ ] Slug management system
- [ ] Password protection backend
- [ ] Public API endpoints
- [ ] Zustand stores setup

### Phase 3: Public Gallery
- [ ] PublicGalleryPage component
- [ ] Canvas card component
- [ ] Filtering and sorting
- [ ] Infinite scroll
- [ ] Search functionality

### Phase 4: Profile Pages
- [ ] Enhanced ProfilePage
- [ ] Profile header with banner
- [ ] Profile customization
- [ ] Canvas grid views
- [ ] Follow system integration

### Phase 5: Public Canvas View
- [ ] Read-only canvas renderer
- [ ] Password protection UI
- [ ] Like/share functionality
- [ ] Comments section
- [ ] Related canvases

### Phase 6: Publish Flow
- [ ] Enhanced publish modal
- [ ] Slug editor with checking
- [ ] SEO settings panel
- [ ] Thumbnail generator
- [ ] Share preview

### Phase 7: Polish & SEO
- [ ] Meta tag implementation
- [ ] Structured data
- [ ] OG image generation
- [ ] Performance optimization
- [ ] Mobile responsiveness

### Phase 8: Testing & Launch
- [ ] Unit tests
- [ ] E2E tests
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Documentation

---

## 12. Technical Decisions

### Why Zustand for State Management?
- Already used throughout the codebase
- Simple API, minimal boilerplate
- Good TypeScript support
- Easy persistence with middleware
- DevTools integration

### Why Not Redux?
- Overkill for this application size
- More boilerplate required
- Team already familiar with Zustand

### Slug Uniqueness Strategy
- **Global uniqueness** for /c/:slug routes
- User-scoped uniqueness for /@:username/:slug vanity URLs
- Reserved slugs list (api, admin, app, etc.)
- Soft-delete old slugs with 30-day grace period

### Thumbnail Generation Approach
- Client-side canvas capture using html2canvas
- Upload to Supabase Storage
- Lazy generation on first publish
- Regeneration on canvas update (debounced)

### Password Hashing
- bcrypt with cost factor 12
- Server-side only (never send hash to client)
- 24-hour access tokens
- No password recovery (regenerate new password)

### New Tab Implementation
- `window.open()` with proper noopener
- Keyboard shortcut: Cmd/Ctrl + Click
- User preference for default behavior
- State isolation via separate browser contexts

---

## Appendix A: File Structure

```
src/
├── pages/
│   ├── public/
│   │   ├── PublicGalleryPage.tsx
│   │   ├── PublicProfilePage.tsx
│   │   ├── PublicCanvasPage.tsx
│   │   └── components/
│   │       ├── GalleryHeader.tsx
│   │       ├── GalleryFilters.tsx
│   │       ├── ProfileBanner.tsx
│   │       ├── ProfileStats.tsx
│   │       ├── ReadOnlyCanvasRenderer.tsx
│   │       └── ...
│   └── ...existing pages
│
├── components/
│   └── public/
│       ├── CanvasCard.tsx
│       ├── UserAvatar.tsx
│       ├── ProfileHeader.tsx
│       ├── VisibilityBadge.tsx
│       ├── ShareModal.tsx
│       ├── PasswordPrompt.tsx
│       ├── FollowButton.tsx
│       └── InfiniteScrollContainer.tsx
│
├── state/
│   ├── usePublicGalleryStore.ts
│   ├── usePublicProfileStore.ts
│   ├── usePublicCanvasStore.ts
│   └── ...existing stores
│
├── services/
│   └── api/
│       ├── gallery.ts
│       ├── public.ts
│       └── ...existing api modules
│
├── types/
│   ├── profile.ts
│   ├── gallery.ts
│   └── ...existing types
│
└── utils/
    ├── slug.ts
    ├── seo.ts
    └── ...existing utils
```

---

## Appendix B: Migration Notes

### Existing Code to Update

1. **AppRouter.tsx** - Add new public routes
2. **ProfilePage.tsx** - Enhance or replace with PublicProfilePage
3. **GalleryPage.tsx** - Keep for authenticated, add PublicGalleryPage
4. **SharedCanvasPage.tsx** - Enhance with new features

### Data Migration

1. Existing canvases default to `visibility: 'private'`
2. Slugs generated from canvas name on first publish
3. View counts initialized to 0
4. Password hash field added (nullable)

---

*Document maintained by: Development Team*
*Last review: 2025-12-16*
