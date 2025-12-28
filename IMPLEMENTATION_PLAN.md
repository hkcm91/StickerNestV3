# StickerNestV2 Implementation Plan

## Executive Summary

StickerNestV2 is approximately **52% complete** with critical gaps in:
- Pipeline execution (server-side stub)
- Widget state persistence (localStorage only, not database)
- Creator earnings (hardcoded returns)
- Purchase flow (30% complete)
- Feed system (global only)
- Embed UI (backend exists, no frontend)

---

## Phase 1: Foundation/Runtime
**Goal:** Fix state persistence and core runtime issues that block all other features

### Task 1.1: Widget State Database Persistence
**Why:** Widgets only persist to localStorage. State lost when switching devices.

| Subtask | Description | Files |
|---------|-------------|-------|
| 1.1.1 | Create `widget_instances` table migration | `supabase/migrations/` (new) |
| 1.1.2 | Implement `saveWidgetState()` in WidgetSandboxHost | `src/runtime/WidgetSandboxHost.ts:1324` |
| 1.1.3 | Implement `loadWidgetState()` in WidgetSandboxHost | `src/runtime/WidgetSandboxHost.ts` |
| 1.1.4 | Wire RuntimeContext.loadWidgetInstances()/saveWidgetInstances() | `src/runtime/RuntimeContext.ts:190-199` |

### Task 1.2: Canvas Runtime Position/Size Persistence
**Why:** Position/size updates have Phase 7/8 TODOs - changes lost on reload.

| Subtask | Description | Files |
|---------|-------------|-------|
| 1.2.1 | Implement position update persistence | `src/runtime/CanvasRuntime.ts:303,345` |
| 1.2.2 | Implement size update persistence | `src/runtime/CanvasRuntime.ts:386,424` |
| 1.2.3 | Add debounced auto-save (500ms) | `src/runtime/CanvasRuntime.ts` |
| 1.2.4 | Apply CSS transforms for real-time updates | `src/runtime/WidgetSandboxHost.ts:1329-1340` |

### Task 1.3: Undo/Redo System Wiring
**Why:** Undo/Redo buttons exist but are not connected.

| Subtask | Description | Files |
|---------|-------------|-------|
| 1.3.1 | Wire up onUndo handler to CommandStack | `src/canvas/MainCanvas.tsx:802-803` |
| 1.3.2 | Wire up onRedo handler to CommandStack | `src/canvas/MainCanvas.tsx` |
| 1.3.3 | Integrate with useUndoRedoStore | `src/state/useUndoRedoStore.ts` |

### Task 1.4: Widget Sandbox Context Fixes
**Why:** Hardcoded values prevent widgets from knowing actual canvas state.

| Subtask | Description | Files |
|---------|-------------|-------|
| 1.4.1 | Pass actual canvas mode (hardcoded to 'view') | `src/runtime/WidgetSandboxHost.ts:481` |
| 1.4.2 | Pass actual canvas size (hardcoded 1920x1080) | `src/runtime/WidgetSandboxHost.ts:484-485` |
| 1.4.3 | Implement permission system from manifest.permissions | `src/runtime/WidgetSandboxHost.ts:890` |

### Task 1.5: Widget Registration Flow Fix
**Why:** AI-generated widgets fail to register with PipelineRuntime.

| Subtask | Description | Files |
|---------|-------------|-------|
| 1.5.1 | Add diagnostic logging to trace registration | `src/runtime/PipelineRuntime.ts` |
| 1.5.2 | Ensure pipelineRuntime.registerWidget() called on AI widget mount | `src/runtime/WidgetSandboxHost.ts` |
| 1.5.3 | Verify AI widget manifests have correct I/O port structure | `src/services/widget-generator-v2/` |

---

## Phase 2: AI/Pipeline System
**Goal:** Enable full pipeline execution and AI widget capabilities

### Task 2.1: Server-Side Pipeline Execution Engine
**Why:** Critical blocker - endpoint returns "TODO: Implement pipeline execution".

| Subtask | Description | Files |
|---------|-------------|-------|
| 2.1.1 | Design pipeline execution with step-by-step processing | `server/controllers/ai.controller.ts:90` |
| 2.1.2 | Implement node execution by type (widget, action, transform) | `server/services/pipeline-execution.service.ts` (new) |
| 2.1.3 | Add error handling and retry logic | `server/services/` |
| 2.1.4 | Implement progress reporting via WebSocket | `server/websocket/` |

### Task 2.2: AI Widget Model Upgrade
**Why:** Current Llama model produces lower quality widgets than GPT-4/Claude.

| Subtask | Description | Files |
|---------|-------------|-------|
| 2.2.1 | Create endpoint using Claude/GPT-4 provider | `server/ai/providers/` |
| 2.2.2 | Update widget generation prompt for better code quality | `src/services/widget-generator-v2/PromptBuilder.ts` |
| 2.2.3 | Ensure generated widgets include READY signal and event protocol | `src/services/widget-generator-v2/ResponseParser.ts` |

### Task 2.3: Visual Pipeline Connections
**Why:** Connect mode shows blank nodes - connections don't render visually.

| Subtask | Description | Files |
|---------|-------------|-------|
| 2.3.1 | Debug why connect mode shows blank nodes | `src/components/ConnectModeOverlay/` |
| 2.3.2 | Ensure existing connections render as visual lines | `src/canvas/` |
| 2.3.3 | Add connection lines SVG layer between linked widgets | `src/canvas/components/` |

### Task 2.4: AI Widget Evolution/Upgrade Flow
**Why:** Capability scanner UI exists but upgrade result not applied.

| Subtask | Description | Files |
|---------|-------------|-------|
| 2.4.1 | Wire upgrade result to widget update | `src/components/AISidebar/CapabilityScanner.tsx:137` |
| 2.4.2 | Show diff between old and new capabilities | `src/components/AISidebar/` |
| 2.4.3 | Allow user to confirm or reject upgrade | `src/ai/WidgetEvolution.ts` |

---

## Phase 3: Monetization
**Goal:** Enable creator earnings and widget purchases

### Task 3.1: Widget Purchase Flow Completion
**Why:** Endpoint returns "not implemented" - 30% complete.

| Subtask | Description | Files |
|---------|-------------|-------|
| 3.1.1 | Complete `POST /api/payments/widgets/:packageId/purchase` | `server/payments/stripe.ts` |
| 3.1.2 | Wire checkout.session.completed webhook handler | `server/payments/stripe.ts` |
| 3.1.3 | Record purchase in MarketplacePurchase, grant widget access | `server/services/marketplace-purchase.service.ts` |
| 3.1.4 | Add purchase button to marketplace widget cards | `src/components/marketplace/` |

### Task 3.2: Creator Payouts Real Data
**Why:** Returns hardcoded zeros - 50% complete.

| Subtask | Description | Files |
|---------|-------------|-------|
| 3.2.1 | Implement real DB queries in `GET /api/payments/creator/earnings` | `server/services/creator-earnings.service.ts` |
| 3.2.2 | Implement real data in `GET /api/payments/creator/sales` | `server/services/creator-earnings.service.ts` |
| 3.2.3 | Create Stripe Connect transfer on purchase (85/15 split) | `server/services/creator-earnings.service.ts` |
| 3.2.4 | Wire Creator Settings tab to real earnings data | `src/pages/settings/` |

### Task 3.3: Schema Field Additions
**Why:** Missing fields block payment webhook processing.

| Subtask | Description | Files |
|---------|-------------|-------|
| 3.3.1 | Add `installCount` to WidgetPackage/MarketplaceItem | `server/db/prisma/schema.prisma` |
| 3.3.2 | Add `totalEarnings` to WidgetPackage/MarketplaceItem | `server/db/prisma/schema.prisma` |
| 3.3.3 | Run Prisma migration and verify relationships | `server/db/prisma/` |

### Task 3.4: Payment Notifications
**Why:** TODO at line 754 - no notification on payment failure.

| Subtask | Description | Files |
|---------|-------------|-------|
| 3.4.1 | Set up email service (SendGrid or AWS SES) | `server/services/email.service.ts` (new) |
| 3.4.2 | Create failed payment email template | `server/templates/` (new) |
| 3.4.3 | Implement webhook handler for invoice.payment_failed | `server/payments/stripe.ts:754` |

---

## Phase 4: Social/Polish
**Goal:** Complete social features, embed UI, and performance improvements

### Task 4.1: Feed System Completion
**Why:** Friends feed and canvas-specific feed return empty/fallback.

| Subtask | Description | Files |
|---------|-------------|-------|
| 4.1.1 | Design friends_feed algorithm with getFollowedUsers() | `src/services/social/FeedService.ts` |
| 4.1.2 | Implement friends feed filtering in useFeedStore | `src/state/useFeedStore.ts:259-264` |
| 4.1.3 | Implement canvas-specific feed query | `src/state/useFeedStore.ts:264` |
| 4.1.4 | Add feed toggle UI (Global/Friends/Canvas) | `src/components/social/` |

### Task 4.2: Block/Unblock User Feature
**Why:** Code is commented out, awaiting backend.

| Subtask | Description | Files |
|---------|-------------|-------|
| 4.2.1 | Create blocked_users table migration | `supabase/migrations/` (new) |
| 4.2.2 | Create /api/users/block, /unblock, /blocked endpoints | `server/routes/user.routes.ts` |
| 4.2.3 | Uncomment blockUser()/unblockUser() in useSocialStore | `src/state/useSocialStore.ts:402-414` |
| 4.2.4 | Filter blocked users from feeds, add Block button | `src/components/` |

### Task 4.3: Embed Configuration UI
**Why:** Backend exists (embed.routes.ts) but no frontend.

| Subtask | Description | Files |
|---------|-------------|-------|
| 4.3.1 | Add "Embed" tab to Settings page | `src/pages/settings/` |
| 4.3.2 | Create token list with status indicators | `src/components/settings/EmbedSettings.tsx` (new) |
| 4.3.3 | Create new token modal with origin whitelist | `src/components/settings/` |
| 4.3.4 | Add embed code snippet generator with preview | `src/components/settings/` |

### Task 4.4: Notification Grouping
**Why:** TODO at line 640 - notifications not grouped.

| Subtask | Description | Files |
|---------|-------------|-------|
| 4.4.1 | Design grouping algorithm (by type, actor, time) | `src/state/useNotificationStore.ts:640` |
| 4.4.2 | Implement notification grouping logic | `src/state/useNotificationStore.ts` |
| 4.4.3 | Update notification UI for grouped notifications | `src/components/notifications/` |

### Task 4.5: Widget Library Quality
**Why:** 70+ widgets need accessibility, error handling, mobile support.

| Subtask | Description | Files |
|---------|-------------|-------|
| 4.5.1 | Add ARIA attributes and keyboard nav to Tier S widgets | `test-widgets/` (10 widgets) |
| 4.5.2 | Add error boundaries and toast notifications | `test-widgets/` |
| 4.5.3 | Add touch handlers and responsive CSS | `test-widgets/` |
| 4.5.4 | Move debug widgets (Tier D) to dev-tools directory | `test-widgets/` (6 widgets) |

### Task 4.6: Public Profile Like Persistence
**Why:** TODO at line 89 - likes not persisted.

| Subtask | Description | Files |
|---------|-------------|-------|
| 4.6.1 | Implement like persistence API call | `src/pages/public/PublicProfilePage.tsx:89` |
| 4.6.2 | Add own profile detection | `src/pages/public/PublicProfilePage.tsx:229` |
| 4.6.3 | Wire useLikesStore for optimistic updates | `src/state/useLikesStore.ts` |

---

## Phase Summary

| Phase | Focus | Tasks | Critical Files |
|-------|-------|-------|----------------|
| **1** | Foundation/Runtime | 5 tasks, 17 subtasks | WidgetSandboxHost.ts, CanvasRuntime.ts, RuntimeContext.ts |
| **2** | AI/Pipeline | 4 tasks, 12 subtasks | ai.controller.ts, PipelineRuntime.ts |
| **3** | Monetization | 4 tasks, 13 subtasks | stripe.ts, creator-earnings.service.ts, schema.prisma |
| **4** | Social/Polish | 6 tasks, 21 subtasks | useFeedStore.ts, useSocialStore.ts, embed.routes.ts |

**Total:** 19 tasks, 63 subtasks

---

## Dependencies

```
Phase 1 (Foundation) ──┬──> Phase 2 (AI/Pipeline)
                       │
                       └──> Phase 3 (Monetization) ──> Phase 4 (Social/Polish)
```

- Phase 2 depends on Phase 1 (state persistence for pipelines)
- Phase 3 depends on Phase 1 (database schema)
- Phase 4 depends on Phase 1 & 3 (schema and notifications)

---

## Quick Start Commands

```bash
# Phase 1 - Start with widget state persistence
# 1. Create migration
npx supabase migration new widget_instances

# 2. Run dev server
npm run dev

# 3. Run tests
npx playwright test
```
