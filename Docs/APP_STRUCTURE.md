# StickerNest v2 — Application Structure & Page Architecture

Version: 1.0
Status: Authoritative Reference
Last Updated: 2025-12-11

> **IMPORTANT FOR AI ASSISTANTS**: This document defines the ONLY approved pages and routes for StickerNest v2. Do NOT create new pages without explicit user permission and updating this document first.

---

## 1. Tech Stack Overview

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.x | UI framework |
| TypeScript | 5.2.x | Type safety |
| Vite | 5.4.x | Build tool & dev server |
| React Router | 6.30.x | Client-side routing |
| Zustand | 5.x | State management |
| Zod | 4.x | Runtime validation |
| Lucide React | 0.555.x | Icons |
| DOMPurify | 3.x | XSS protection |

### Backend / Infrastructure
| Technology | Purpose |
|------------|---------|
| Supabase | Auth, Database, Storage, Edge Functions |
| Supabase RLS | Row-level security for multi-tenant data |

### AI Integration
| Provider | Use Case |
|----------|----------|
| Replicate | Widget generation (Llama models) |
| OpenAI | Widget generation (GPT models) |
| Anthropic | Architecture guidance (Claude) |

### Testing
| Tool | Purpose |
|------|---------|
| Playwright | E2E testing |
| Vitest | Unit testing |

---

## 2. Approved Pages & Routes

### CRITICAL: Only these pages should exist in production

| Page Name | Route | File | Purpose |
|-----------|-------|------|---------|
| **Landing Page** | `/` | `LandingPage.tsx` | Public marketing/home page |
| **Login** | `/login` | `LoginPage.tsx` | User authentication |
| **Signup** | `/signup` | `SignupPage.tsx` | User registration |
| **Auth Callback** | `/auth/callback` | `AuthCallbackPage.tsx` | OAuth redirect handler |
| **User Gallery** | `/gallery` | `GalleryPage.tsx` | User's canvas collection (was "Dashboard") |
| **Canvas Editor** | `/editor/:canvasId` | `EditorPage.tsx` | Edit a specific canvas |
| **Canvas View** | `/c/:slug` | `SharedCanvasPage.tsx` | Public/shared canvas view |
| **Canvas Embed** | `/embed/:slug` | `EmbedCanvasPage.tsx` | Iframe embeddable view |
| **User Profile** | `/@:username` | `ProfilePage.tsx` | Public user profile |
| **User Settings** | `/settings` | `SettingsPage.tsx` | Account settings |
| **Marketplace** | `/marketplace` | `MarketplacePage.tsx` | Widget marketplace |
| **Widget Detail** | `/marketplace/:id` | `WidgetDetailPage.tsx` | Single widget page |
| **Widget Lab** | `/app` | `MainApp.tsx` | Widget creation & testing |

### Utility Pages (Internal)
| Page Name | Route | File | Purpose |
|-----------|-------|------|---------|
| **Error Page** | (any invalid) | `RouteErrorPage.tsx` | 404/error handling |

### DEPRECATED / TO BE REMOVED
| Page Name | Route | Reason |
|-----------|-------|--------|
| ~~Gallery Demo~~ | ~~/gallery~~ | Was dual-canvas debug (moving to Widget Lab) |
| ~~Business Card Demo~~ | ~~/demo/business-card~~ | Development testing only |
| ~~Messaging Demo~~ | ~~/demo/messaging~~ | Development testing only |

---

## 3. Page Naming Conventions

### Terminology (Use Consistently)
| Term | Meaning | DO NOT Use |
|------|---------|------------|
| **Gallery** | User's canvas collection | Dashboard, Home, My Canvases |
| **Canvas** | A single workspace with widgets | Board, Page, Sheet |
| **Widget** | An interactive component on canvas | Sticker, Element, Block |
| **Widget Lab** | Development/testing environment | Sandbox, Playground, Studio |
| **Marketplace** | Widget store/discovery | Store, Shop, Gallery |

### File Naming
- Page components: `{PageName}Page.tsx` (e.g., `GalleryPage.tsx`)
- Route must match purpose (e.g., `/gallery` not `/dashboard`)
- Use kebab-case for routes: `/user-settings` not `/userSettings`

---

## 4. Directory Structure

```
src/
├── pages/                    # Page-level components (one per route)
│   ├── GalleryPage.tsx       # User's canvas gallery
│   ├── EditorPage.tsx        # Canvas editor
│   ├── SharedCanvasPage.tsx  # Public canvas view
│   ├── LandingPage.tsx       # Marketing home
│   ├── LoginPage.tsx         # Auth
│   ├── SignupPage.tsx        # Auth
│   ├── SettingsPage.tsx      # User settings
│   ├── ProfilePage.tsx       # Public profile
│   ├── MarketplacePage.tsx   # Widget store
│   └── RouteErrorPage.tsx    # Error handling
│
├── router/                   # Routing configuration
│   └── AppRouter.tsx         # Central route definitions
│
├── components/               # Reusable UI components
│   ├── editor/               # Canvas editor components
│   ├── panels/               # Side panels
│   └── ...
│
├── widget-lab/               # Widget Lab module
│   ├── WidgetLab.tsx         # Main Widget Lab component
│   ├── components/           # Widget Lab sub-components
│   │   ├── DualCanvasDebug.tsx  # Canvas bridge testing (moved from old GalleryPage)
│   │   └── ...
│   └── ...
│
├── runtime/                  # Widget runtime engine
├── services/                 # API clients & services
├── state/                    # Zustand stores
├── types/                    # TypeScript types
├── contexts/                 # React contexts
├── hooks/                    # Custom hooks
├── shared-ui/                # Design system components
└── styles/                   # Global styles
```

---

## 5. Widget Lab Tabs

The Widget Lab (`/app`) contains these tabs:

| Tab | Purpose |
|-----|---------|
| **Generate** | AI widget generation |
| **Upload** | Manual widget upload |
| **Drafts** | Saved widget drafts |
| **Bridge** | Dual-canvas debug/testing (CanvasBridge) |

---

## 6. Canvas Visibility & Status

### Visibility Levels
| Level | Slug Required | Discoverable | Access |
|-------|---------------|--------------|--------|
| `private` | No | No | Owner only |
| `unlisted` | Yes | No | Anyone with link |
| `public` | Yes | Yes | Everyone |

### Canvas Status (NEW)
| Status | Meaning |
|--------|---------|
| `draft` | Work in progress, not visible to visitors |
| `published` | Live and visible according to visibility rules |

### Gallery View Logic
```
If viewer is owner:
  - Show ALL canvases (private, draft, published)
  - Enable "Edit Gallery" mode

If viewer is visitor:
  - Show only: visibility=public AND status=published
  - View-only mode
```

---

## 7. Rules for Adding New Pages

### Before Creating a New Page:
1. **Ask permission** — Do not create pages without explicit user approval
2. **Update this document** — Add the new page to Section 2
3. **Follow naming conventions** — Use established terminology
4. **Add to router** — Update `AppRouter.tsx`
5. **Consider alternatives** — Can this be a tab/panel in an existing page?

### Page Creation Checklist:
- [ ] User approved the new page
- [ ] Added to APP_STRUCTURE.md Section 2
- [ ] Created `{Name}Page.tsx` in `src/pages/`
- [ ] Added route to `AppRouter.tsx`
- [ ] Added navigation link (if applicable)
- [ ] Follows existing design patterns

### When NOT to Create a New Page:
- **Debug/test features** → Add to Widget Lab as a tab
- **Modal workflows** → Use modal/dialog in existing page
- **Settings subsections** → Add tab to Settings page
- **User data views** → Add to Gallery or Profile

---

## 8. Route Protection

| Route Pattern | Auth Required | Notes |
|---------------|---------------|-------|
| `/`, `/login`, `/signup` | No | Public pages |
| `/c/:slug`, `/embed/:slug` | No | Public canvas access |
| `/@:username` | No | Public profiles |
| `/marketplace`, `/marketplace/:id` | No | Public marketplace |
| `/gallery` | Yes | User's own gallery |
| `/editor/:canvasId` | Yes | Must own canvas |
| `/settings` | Yes | User settings |
| `/app` (Widget Lab) | Yes | Authenticated users |

---

## 9. Navigation Structure

### Primary Navigation (Header)
- Logo → `/` (Landing) or `/gallery` (if logged in)
- Gallery → `/gallery`
- Widget Lab → `/app`
- Marketplace → `/marketplace`
- Profile → `/@{username}`
- Settings → `/settings`

### User Menu (When Logged In)
- My Gallery
- Settings
- Logout

---

## 10. API Naming Conventions

| Entity | API Endpoint Pattern |
|--------|---------------------|
| Canvas CRUD | `/api/canvas`, `/api/canvas/:id` |
| Canvas by slug | `/api/canvas/s/:slug` |
| User stats | `/api/user/stats` |
| Widgets | `/api/widgets`, `/api/widgets/:id` |
| Marketplace | `/api/marketplace` |

---

## 11. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-11 | Initial document creation | Claude |
| 2025-12-11 | Defined approved pages, deprecated dual-canvas demo | Claude |

---

> **This document is authoritative.** All page/route decisions should reference this file. Update it when making structural changes.
