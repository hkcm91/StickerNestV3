# StickerNest Master Specification

> The complete technical specification and requirements document for StickerNest v2

---

## Platform Overview

StickerNest is a modular drag-and-drop canvas platform where users build dashboards, mini-apps, link-in-bios, storefronts, and white-label SaaS products using widgets, pipelines, and stickers.

### Tech Stack
- **Frontend:** React + TypeScript
- **Build:** Vite
- **State:** Zustand
- **Communication:** Unified Event Bus
- **Modules:** ES Modules only
- **Storage:** IndexedDB/localForage + Supabase
- **Payments:** Stripe + Stripe Connect

---

## 🟢 I. CORE MVP — THE BASICS WE MUST COMPLETE FIRST

### 1. Canvas System

Build a draggable, zoomable, pannable canvas with:

- [ ] Drag + drop repositioning (release-based, not hold)
- [ ] Resize handles
- [ ] Grid snapping (toggle on/off)
- [ ] Z-index control
- [ ] Background system (color, image upload)
- [ ] Local persistence (IndexedDB or localForage)
- [ ] Fast rehydration and versioning

### 2. Sticker System (PNGs, WebP, SVG, Lottie)

- [ ] Upload, add, delete stickers
- [ ] Drag, resize, rotate, scale
- [ ] Assign events to stickers:
  - [ ] onClick → open widget
  - [ ] onHover → play Lottie
  - [ ] onMount → idle animation
- [ ] Sticker state stored in Zustand
- [ ] Stickers can trigger pipelines

### 3. Widget System

Widgets must be:
- [ ] Modular
- [ ] State-isolated
- [ ] Manifest-driven
- [ ] Renderable inside containers or floating windows
- [ ] Able to communicate with the Event Bus

Must support:
- [ ] Widget manifest validation
- [ ] Widget lifecycle: onMount, onOpen, onClose, onUpdate
- [ ] Per-widget persistent data
- [ ] Multiple instances of the same widget
- [ ] A base Pomodoro widget as the test widget

### 4. Event Bus

Central hub for:
- [ ] Sticker → widget events
- [ ] Widget → canvas events
- [ ] Pipelines
- [ ] UI triggers

Design it for extensibility and async-safe operation.

### 5. Widget Uploader (StickerLab v1)

Support uploading ZIPs containing:
- [ ] manifest.json
- [ ] widget.js or widget.jsx
- [ ] icon
- [ ] style file (optional)

The uploader must:
- [ ] Validate manifest
- [ ] Validate assets
- [ ] Validate entry file
- [ ] Show errors clearly
- [ ] Add the widget to the user's library

### 6. Local Persistence

Everything must save locally:
- [ ] Canvas state
- [ ] Widget states
- [ ] Sticker states
- [ ] Installed widgets
- [ ] Pipeline definitions

Use workers where needed.

### 7. Canvas Export/Import

- [ ] Export full canvas to JSON
- [ ] Import JSON to recreate layout
- [ ] Required for templates & sharing

---

## 🟡 II. MVP+ — MAKES IT "USEFUL" FOR REAL USERS

### 8. Widget Library UI

- [ ] Grid of installed widgets
- [ ] Categories
- [ ] Search
- [ ] Favorites

### 9. Sticker Library

- [ ] Upload images/Lotties
- [ ] Organize into folders
- [ ] Replace sticker image
- [ ] Adjust default sizes

### 10. Built-In Default Widgets

Implement these as widgets, not hard-coded:
- [ ] Background widget
- [ ] Text widget
- [ ] Button widget
- [ ] Image widget
- [ ] Link widget
- [ ] Video/Embed widget

They appear by default on new canvases.

### 11. Link-in-Bio Toolkit (must be early)

Widgets:
- [ ] Social links
- [ ] Profile header
- [ ] Avatar widget
- [ ] Link list
- [ ] Analytics widget
- [ ] Contact form widget
- [ ] Simple storefront widget
- [ ] Lottie CTA buttons

### 12. Script Runner

- [ ] Sandbox JS execution
- [ ] API fetch support
- [ ] Read/write state via Event Bus
- [ ] Trigger sticker animations
- [ ] Interact with widgets

---

## 🔵 III. PIPELINE / APP BUILDER (NO-CODE SYSTEM)

### 13. Node-Based Pipeline Builder

Nodes:
- [ ] Sticker click / widget event triggers
- [ ] Conditionals
- [ ] Fetch API
- [ ] Transform
- [ ] Set sticker state
- [ ] Set widget state
- [ ] Run script
- [ ] AI block (GPT/Claude call)
- [ ] Storage read/write

### 14. Pipeline Templates

Prebuilt flows:
- [ ] Form submission → email
- [ ] CRM contact tracker
- [ ] "Add to cart" logic
- [ ] Appointment scheduling
- [ ] Mood → background theme
- [ ] Task complete → streak counter
- [ ] Toolbar button → open specific widget

### 15. Pipeline Analytics

Track:
- [ ] Which widgets are used
- [ ] Which pipelines trigger most
- [ ] Success/failure counts
- [ ] Errors
- [ ] Dependencies

This is essential for white-label SaaS & revenue.

---

## 💰 IV. COMMERCE SYSTEMS — BOTH FOR US & USERS

### 16. Stripe Integration (StickerNest's Own Commerce)

For the StickerNest platform:
- [ ] Subscription plans (Free, Pro, Creator, Business)
- [ ] Usage quotas (pipelines, canvases, storage)
- [ ] Marketplace purchases
- [ ] Licensing for widgets/stickers/templates
- [ ] Automatic regional tax handling

### 17. Marketplace Tracking

Track:
- [ ] Widget purchases
- [ ] Template installs
- [ ] Sticker pack downloads
- [ ] Pipeline template usage
- [ ] Version usage

### 18. Creator Revenue Split

- [ ] Using Stripe Connect
- [ ] Automatic splits (70/30 default)
- [ ] Transaction history
- [ ] Refund handling
- [ ] Per-widget/per-template analytics

### 19. User-Side Commerce (White-Label SaaS)

Users must be able to add:
- [ ] One-time purchases
- [ ] Subscription plans
- [ ] Usage-based pricing
- [ ] Customer portal
- [ ] User dashboards
- [ ] Automatic invoicing

Integrate Shopify for:
- [ ] Product listing widgets
- [ ] Buy buttons
- [ ] Inventory syncing
- [ ] Webhook triggers → pipelines

This turns StickerNest into a software factory.

---

## 🧩 V. UI CONSTRUCTION SYSTEMS (WHITE-LABEL APP BUILDER)

### 20. Toolbar Widget

- [ ] Customizable toolbar
- [ ] Add/remove widgets as buttons
- [ ] Tabs
- [ ] Docking
- [ ] Auto-hide
- [ ] Pipeline triggers

### 21. Widget Containers

- [ ] Scrollable
- [ ] Tabbed
- [ ] Drag widgets into/out of container
- [ ] Lock/unlock
- [ ] Resize
- [ ] Save container layouts

### 22. Button Widget (Essential)

- [ ] Pipeline trigger
- [ ] Multi-state
- [ ] Theming
- [ ] Icon support

### 23. Layout Widgets

- [ ] Columns
- [ ] Grids
- [ ] Carousels
- [ ] Cards

---

## 🌐 VI. HOSTING & SHARING

### 24. Hosted Canvases

- [ ] Public URL
- [ ] Read-only or interactive
- [ ] Password + private mode
- [ ] Duplicate canvas
- [ ] Embedded mode (iframe)

### 25. White-Label Export

Users should be able to:
- [ ] Export as standalone web app
- [ ] Export as widget pack
- [ ] Export pipeline bundle
- [ ] Host on StickerNest with custom domain (premium)

---

## 🧠 VII. BUILDER ECOSYSTEM (StickerLab + Widget Dev Tools)

### 26. StickerLab Pro

- [ ] Lottie preview & controls
- [ ] Event triggers
- [ ] Auto-generate manifests
- [ ] Widget-skin pairing
- [ ] Export as widget or sticker pack

### 27. Widget AI Dev Panel

- [ ] Generate widget skeletons
- [ ] Fix code
- [ ] Add missing lifecycle hooks
- [ ] Auto-generate icons
- [ ] Auto-format manifests
- [ ] Code explanation panel

---

## 🔒 VIII. PLATFORM INFRASTRUCTURE

### 28. Cloud Sync (Supabase)

Sync:
- [ ] Canvases
- [ ] Widget installs
- [ ] Pipelines
- [ ] Sticker libraries
- [ ] User settings

### 29. Permission System

Each widget/pipeline must declare:
- [ ] network
- [ ] files
- [ ] storage
- [ ] events
- [ ] AI usage

### 30. Versioning & Stability

- [ ] Snapshot history
- [ ] Safe rollback
- [ ] Worker threads for heavy logic
- [ ] Error boundaries around all widgets

---

## 🟣 IX. FUTURE FEATURES (STRUCTURE WITH STUBS)

### 31. Multi-Canvas Worlds

- [ ] Portals
- [ ] Scene transitions
- [ ] Inter-canvas pipelines

### 32. Social Layer

- [ ] Profiles
- [ ] Following
- [ ] Public rooms

### 33. Mini-Games & Gamification

- [ ] XP systems
- [ ] Collectibles
- [ ] Seasonal drops

(Create scaffolds for these.)

---

## 🛠️ X. ARCHITECTURE REQUIREMENTS

### File Structure

```
src/
├── core/           # Event bus, runtime, utilities
├── canvas/         # Canvas system, viewport, grid
├── widgets/        # Widget system, loader, sandbox
├── stickers/       # Sticker system, animations
├── pipelines/      # Pipeline builder, nodes, runtime
├── commerce/       # Stripe, marketplace, payouts
├── hosting/        # Publishing, domains, embeds
├── ui/             # App shell, navigation, panels
├── state/          # Zustand stores
├── types/          # TypeScript definitions
├── services/       # API clients, external integrations
└── utils/          # Shared utilities
```

### Requirements

- [ ] Use a clean modular file structure
- [ ] ES modules only
- [ ] Zustand for all state
- [ ] Unified Event Bus
- [ ] Separate concerns by domain
- [ ] Reusable utilities
- [ ] Fit for AI-assisted coding

---

## 🧾 XI. DEVELOPMENT PRINCIPLES

1. **Map architecture** before building
2. **Build the MVP first** — don't gold-plate
3. **Implement in stable phases**
4. **Ensure everything is extensible**
5. **Generate code files and folder structure**
6. **Fill in TODO comments where needed**
7. **Produce working modules incrementally**
8. **Fix errors automatically**
9. **Follow modern best practices**
10. **Refactor aggressively**
11. **Provide working code, not pseudo-code**

---

## Current Implementation Status

### ✅ Completed (Core Engine)

- [x] Canvas rendering system
- [x] Widget sandbox host
- [x] Widget I/O bridge
- [x] Pipeline runtime
- [x] Event bus
- [x] Zustand state management
- [x] Multi-AI provider integration
- [x] Widget manifest system
- [x] Basic authentication (Supabase)
- [x] Local persistence

### 🔧 In Progress

- [ ] AI widget → pipeline registration (bug)
- [ ] AI model quality (switch from Llama)
- [ ] Visual pipeline connection rendering
- [ ] Canvas UI polish
- [ ] App shell / navigation

### ⬜ Not Started

- [ ] Sticker system
- [ ] Publishing system
- [ ] Marketplace
- [ ] Commerce / Stripe
- [ ] White-label export
- [ ] Social features

---

## Phase Priority

| Phase | Focus | Timeline |
|-------|-------|----------|
| 1 | Fix core bugs (AI widgets, pipelines) | Week 1-2 |
| 2 | Canvas polish + Sticker MVP | Week 3-4 |
| 3 | Publishing system | Week 5-6 |
| 4 | Link-in-bio widgets | Week 7-8 |
| 5 | Marketplace MVP | Month 3 |
| 6 | Commerce / Stripe | Month 4-5 |
| 7 | White-label / B2B | Month 5-6 |
| 8 | Social layer | Month 9+ |

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Working AI pipelines | 100% | Week 2 |
| Alpha testers | 5-10 | Week 4 |
| Published canvases | 10+ | Week 6 |
| First paying user | 1 | Month 4 |
| Monthly revenue | $2,000 | Month 8 |
| Active users | 100 | Month 8 |
