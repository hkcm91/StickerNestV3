# StickerNest Development Phases

> Focused execution plan for reaching alpha-ready state

---

## Phase 1: AI Pipeline Integration
**Goal:** AI-generated widgets connect and communicate through pipelines
**Duration:** 1 week
**Status:** 🔧 Current

### Why This First
This is the core value proposition. Without it, StickerNest is just another canvas tool. With it, it's a visual programming platform.

### Tasks

#### 1.1 Fix AI Widget Registration
- [ ] Diagnose where AI widgets fail to register with PipelineRuntime
- [ ] Ensure `pipelineRuntime.registerWidget()` is called when AI widgets mount
- [ ] Verify AI widget manifests have correct I/O port structure
- [ ] Add logging to trace registration flow

#### 1.2 Switch AI Model
- [ ] Create new endpoint using Claude or GPT-4 (not Llama)
- [ ] Update widget generation prompt for better code quality
- [ ] Ensure generated widgets include proper READY signal
- [ ] Ensure generated widgets use correct event protocol
- [ ] Test output quality across different widget types

#### 1.3 Fix Visual Connections
- [ ] Debug why connect mode shows blank nodes
- [ ] Ensure existing connections render visually
- [ ] Add connection lines between linked widgets

#### 1.4 End-to-End Validation
- [ ] Generate AI Widget A (emits data)
- [ ] Generate AI Widget B (receives data)
- [ ] Create pipeline connecting A → B
- [ ] Verify data flows through pipeline
- [ ] Document the working flow

### Success Criteria
- [ ] Can generate an AI widget that emits events
- [ ] Can generate an AI widget that receives events
- [ ] Pipeline routes data between them
- [ ] Visual connection shows in connect mode

---

## Phase 2: Canvas Foundation
**Goal:** Canvas feels solid and usable
**Duration:** 1-2 weeks
**Status:** ⬜ Pending

### Why This Second
The canvas is where users spend all their time. It needs to feel good before alpha testers use it.

### Tasks

#### 2.1 Canvas Interactions
- [ ] Polish drag and drop (release-based positioning)
- [ ] Improve resize handles (all corners + edges)
- [ ] Add rotation support for widgets
- [ ] Grid snapping toggle (with visual grid)
- [ ] Zoom controls (scroll + buttons)
- [ ] Pan controls (drag canvas background)

#### 2.2 Selection & Multi-Select
- [ ] Click to select widget
- [ ] Shift+click for multi-select
- [ ] Drag box selection
- [ ] Move multiple selected widgets
- [ ] Delete multiple selected widgets
- [ ] Copy/paste selected widgets

#### 2.3 Z-Index & Layers
- [ ] Bring to front / send to back
- [ ] Layer panel showing widget stack
- [ ] Drag to reorder in layer panel
- [ ] Lock/unlock widgets

#### 2.4 Canvas Background
- [ ] Solid color picker
- [ ] Gradient support
- [ ] Image upload background
- [ ] Background fit/fill/tile options
- [ ] Pattern backgrounds (dots, grid, etc.)

#### 2.5 Undo/Redo
- [ ] Track canvas state changes
- [ ] Undo last action (Ctrl+Z)
- [ ] Redo (Ctrl+Shift+Z)
- [ ] History panel (optional)

#### 2.6 Canvas Settings
- [ ] Canvas size (fixed vs infinite)
- [ ] Canvas name/title
- [ ] Canvas description
- [ ] Canvas thumbnail generation

### Success Criteria
- [ ] Can arrange widgets precisely
- [ ] Multi-select works smoothly
- [ ] Canvas feels responsive and polished
- [ ] Undo/redo works reliably

---

## Phase 3: Sticker System
**Goal:** Animated stickers that trigger widgets
**Duration:** 1-2 weeks
**Status:** ⬜ Pending

### Why This Third
Stickers are core to the StickerNest identity. They make canvases feel alive and interactive.

### Tasks

#### 3.1 Sticker Entity
- [ ] Create Sticker type in entity system
- [ ] Sticker properties: position, size, rotation, opacity
- [ ] Sticker state in Zustand store
- [ ] Sticker persistence (save/load)

#### 3.2 Sticker Upload
- [ ] Upload PNG/WebP/SVG images
- [ ] Upload Lottie JSON files
- [ ] Preview before adding to canvas
- [ ] Sticker library panel

#### 3.3 Sticker Placement
- [ ] Drag sticker from library to canvas
- [ ] Position, resize, rotate stickers
- [ ] Sticker z-index control
- [ ] Sticker snapping to grid

#### 3.4 Sticker Animations
- [ ] Lottie playback controls
- [ ] Idle animation (loop)
- [ ] Hover animation
- [ ] Click animation
- [ ] Animation speed control

#### 3.5 Sticker Events
- [ ] onClick → trigger action
- [ ] onHover → trigger action
- [ ] onMount → trigger action
- [ ] Action types:
  - [ ] Open widget
  - [ ] Close widget
  - [ ] Toggle widget
  - [ ] Emit pipeline event
  - [ ] Play sound (future)

#### 3.6 Sticker ↔ Widget Binding
- [ ] UI to bind sticker to widget
- [ ] Visual indicator of bound stickers
- [ ] Click sticker → widget opens/focuses
- [ ] Widget close → sticker returns to idle

### Success Criteria
- [ ] Can upload and place stickers
- [ ] Lottie animations play correctly
- [ ] Clicking sticker opens linked widget
- [ ] Stickers can trigger pipeline events

---

## Phase 4: Publishing System
**Goal:** Share canvases via public URLs
**Duration:** 1 week
**Status:** ⬜ Pending

### Why This Fourth
Alpha testers need a way to see each other's creations. Publishing enables sharing and feedback.

### Tasks

#### 4.1 Publish Flow
- [ ] "Publish" button in canvas toolbar
- [ ] Generate unique public URL (`/c/{id}` or `/p/{slug}`)
- [ ] Publish confirmation dialog
- [ ] Copy link to clipboard

#### 4.2 Public Viewer
- [ ] Read-only canvas renderer
- [ ] Widgets still interactive (not editable)
- [ ] Pipelines still function
- [ ] Sticker interactions work
- [ ] Clean UI (no edit controls)

#### 4.3 Canvas Metadata
- [ ] Title displayed on public page
- [ ] Description/bio
- [ ] Author attribution
- [ ] Created/updated dates

#### 4.4 Sharing Features
- [ ] Social share buttons (Twitter, etc.)
- [ ] OG meta tags for link previews
- [ ] Canvas thumbnail for previews
- [ ] QR code generation (optional)

#### 4.5 Access Control
- [ ] Public (anyone can view)
- [ ] Unlisted (only with link)
- [ ] Private (only owner)
- [ ] Password protected (future)

#### 4.6 Embed Support
- [ ] Generate iframe embed code
- [ ] Responsive embed option
- [ ] Embed width/height controls

### Success Criteria
- [ ] Can publish canvas with one click
- [ ] Public URL loads canvas correctly
- [ ] Widgets and pipelines work on public page
- [ ] Link previews show canvas info

---

## Phase 5: Link-in-Bio Toolkit
**Goal:** First complete use case for StickerNest
**Duration:** 1-2 weeks
**Status:** ⬜ Pending

### Why This Fifth
Link-in-bio is the easiest way to explain StickerNest to new users. "It's like Linktree but interactive."

### Tasks

#### 5.1 Profile Widgets
- [ ] Avatar widget (image upload, circular crop)
- [ ] Name/title widget
- [ ] Bio/description widget
- [ ] Location widget
- [ ] Status widget (custom text)

#### 5.2 Social Link Widgets
- [ ] Social icons widget (grid of icons)
- [ ] Individual platform widgets:
  - [ ] Twitter/X
  - [ ] Instagram
  - [ ] TikTok
  - [ ] YouTube
  - [ ] LinkedIn
  - [ ] GitHub
  - [ ] Discord
  - [ ] Twitch
- [ ] Custom link widget

#### 5.3 Content Widgets
- [ ] Link list widget (multiple links)
- [ ] Featured link widget (large, styled)
- [ ] Image gallery widget
- [ ] Video embed widget (YouTube, Vimeo)
- [ ] Spotify embed widget
- [ ] Music player widget

#### 5.4 Interactive Widgets
- [ ] Contact form widget
- [ ] Email signup widget
- [ ] Poll widget
- [ ] FAQ accordion widget
- [ ] Countdown timer widget

#### 5.5 Link-in-Bio Templates
- [ ] Creator template
- [ ] Business template
- [ ] Artist/portfolio template
- [ ] Musician template
- [ ] Minimal template

#### 5.6 Analytics Widget
- [ ] View count display
- [ ] Click tracking per link
- [ ] Basic analytics dashboard widget
- [ ] Visitor counter (optional)

### Success Criteria
- [ ] Can build complete link-in-bio in 5 minutes
- [ ] Looks professional on mobile
- [ ] Templates provide starting point
- [ ] Analytics track basic metrics

---

## Phase 6: Marketplace Foundation
**Goal:** Community can share widgets, stickers, templates
**Duration:** 2-3 weeks
**Status:** ⬜ Pending

### Why This Sixth
Marketplace creates the ecosystem. Users become creators. Platform grows itself.

### Tasks

#### 6.1 Submission System
- [ ] Submit widget form
- [ ] Submit sticker pack form
- [ ] Submit template form
- [ ] Manifest validation on submit
- [ ] Asset validation
- [ ] Preview before publish

#### 6.2 Review System
- [ ] Submission queue (admin view)
- [ ] Approve/reject workflow
- [ ] Feedback to creators
- [ ] Auto-approve for trusted creators (future)

#### 6.3 Public Gallery
- [ ] Widget gallery page
- [ ] Sticker gallery page
- [ ] Template gallery page
- [ ] Category filtering
- [ ] Search functionality
- [ ] Sort by: new, popular, trending

#### 6.4 Item Pages
- [ ] Widget detail page
- [ ] Screenshots/preview
- [ ] Description
- [ ] Version history
- [ ] Creator attribution
- [ ] Install button

#### 6.5 Installation Flow
- [ ] One-click install to library
- [ ] Dependency handling
- [ ] Version management
- [ ] Update notifications

#### 6.6 Creator Profiles
- [ ] Public creator profile page
- [ ] List of published items
- [ ] Creator stats
- [ ] Follow creator (future)

### Success Criteria
- [ ] Can submit widget to marketplace
- [ ] Can browse and search marketplace
- [ ] Can install widget with one click
- [ ] Creators can build reputation

---

## Phase Summary

| Phase | Focus | Duration | Dependencies |
|-------|-------|----------|--------------|
| **1** | AI Pipeline Integration | 1 week | None |
| **2** | Canvas Foundation | 1-2 weeks | Phase 1 |
| **3** | Sticker System | 1-2 weeks | Phase 2 |
| **4** | Publishing System | 1 week | Phase 2 |
| **5** | Link-in-Bio Toolkit | 1-2 weeks | Phase 3, 4 |
| **6** | Marketplace Foundation | 2-3 weeks | Phase 4, 5 |

---

## Timeline (Optimistic)

```
Week 1-2:   Phase 1 - AI Pipelines Working
Week 2-4:   Phase 2 - Canvas Polish
Week 4-6:   Phase 3 - Stickers
Week 6-7:   Phase 4 - Publishing
Week 7-9:   Phase 5 - Link-in-Bio
Week 9-12:  Phase 6 - Marketplace

Total: ~3 months to marketplace-ready
```

---

## Alpha Release Gate

**Minimum for Alpha (Phases 1-4):**
- [ ] AI widgets connect via pipelines
- [ ] Canvas feels polished
- [ ] Stickers work with animations
- [ ] Can publish and share canvas URL

**Target:** Week 6-7

---

## Notes

- Each phase builds on the previous
- Don't skip phases — they're ordered by dependency
- Get feedback between phases
- Adjust scope based on learnings
- Perfect is the enemy of shipped
