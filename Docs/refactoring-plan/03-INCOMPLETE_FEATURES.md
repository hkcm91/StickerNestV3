# Incomplete Features Plan

> Complete half-built features and remove dead code

---

## STATUS LEGEND

- **STUB**: Function exists but returns placeholder data
- **PARTIAL**: Some functionality works, some doesn't
- **UI_ONLY**: UI exists but no backend logic
- **BACKEND_ONLY**: Backend exists but no UI
- **BLOCKED**: Waiting on external dependency
- **DEPRECATED**: Should be removed

---

## PRIORITY 1: DATABASE PERSISTENCE (Critical Path)

### 1.1 Widget Runtime Persistence
**Status**: STUB
**Impact**: HIGH - Widgets lose state on refresh

#### Locations:
- `src/runtime/WidgetSandboxHost.ts` (Lines 577, 1200-1216)
- `src/runtime/CanvasRuntime.ts` (Lines 290, 332, 373, 411)
- `src/runtime/RuntimeContext.ts` (Lines 189-199)

#### Missing:
- Widget state not persisted to database
- Position/size/rotation updates (Phase 7 & 8 TODOs)
- Load/save widget instances

**Subtasks:**
- [ ] 1.1.1: Design widget_instances table schema
  ```sql
  CREATE TABLE widget_instances (
    id UUID PRIMARY KEY,
    canvas_id UUID REFERENCES canvases(id),
    widget_definition_id TEXT NOT NULL,
    position JSONB NOT NULL,
    size JSONB NOT NULL,
    rotation FLOAT DEFAULT 0,
    scale_mode TEXT DEFAULT 'scale',
    state JSONB,
    z_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] 1.1.2: Create Supabase migration
- [ ] 1.1.3: Implement saveWidgetState() in WidgetSandboxHost
- [ ] 1.1.4: Implement loadWidgetState() in WidgetSandboxHost
- [ ] 1.1.5: Wire up position update persistence in CanvasRuntime
- [ ] 1.1.6: Wire up size update persistence in CanvasRuntime
- [ ] 1.1.7: Wire up rotation update persistence
- [ ] 1.1.8: Wire up z-index update persistence
- [ ] 1.1.9: Implement RuntimeContext.loadWidgetInstances()
- [ ] 1.1.10: Implement RuntimeContext.saveWidgetInstances()
- [ ] 1.1.11: Add debounced auto-save (500ms)
- [ ] 1.1.12: Test widget state survives page refresh

---

## PRIORITY 2: SOCIAL FEATURES

### 2.1 Feed System
**Status**: PARTIAL
**Impact**: MEDIUM - Social features incomplete

#### Locations:
- `src/state/useFeedStore.ts` (Lines 259-265, 423)

#### Current State:
- Global feed: WORKING
- Friends feed: NOT IMPLEMENTED (falls back to global)
- Canvas-specific feed: NOT IMPLEMENTED (returns empty)

**Subtasks:**
- [ ] 2.1.1: Design friends_feed algorithm
- [ ] 2.1.2: Create getFollowedUsers() query
- [ ] 2.1.3: Filter feed by followed users
- [ ] 2.1.4: Implement friends feed in useFeedStore
- [ ] 2.1.5: Design canvas_feed table/view
- [ ] 2.1.6: Implement canvas-specific feed query
- [ ] 2.1.7: Wire up canvas feed in useFeedStore
- [ ] 2.1.8: Add feed toggle UI (Global/Friends/Canvas)
- [ ] 2.1.9: Test feed switching

---

### 2.2 Block/Unblock User
**Status**: BLOCKED (Waiting on backend endpoint)
**Impact**: MEDIUM - Safety feature

#### Locations:
- `src/state/useSocialStore.ts` (Lines 402-414)

#### Current State:
Code is commented out, awaiting backend.

**Subtasks:**
- [ ] 2.2.1: Create blocked_users table
  ```sql
  CREATE TABLE blocked_users (
    blocker_id UUID REFERENCES users(id),
    blocked_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
  );
  ```
- [ ] 2.2.2: Create /api/users/block endpoint
- [ ] 2.2.3: Create /api/users/unblock endpoint
- [ ] 2.2.4: Create /api/users/blocked endpoint (list)
- [ ] 2.2.5: Uncomment blockUser() in useSocialStore
- [ ] 2.2.6: Uncomment unblockUser() in useSocialStore
- [ ] 2.2.7: Add Block button to user profiles
- [ ] 2.2.8: Filter blocked users from feeds
- [ ] 2.2.9: Test block/unblock flow

---

### 2.3 Notification Grouping
**Status**: STUB
**Impact**: LOW - UX improvement

#### Location:
- `src/state/useNotificationStore.ts` (Line 640)

**Subtasks:**
- [ ] 2.3.1: Design grouping algorithm
- [ ] 2.3.2: Implement notification grouping logic
- [ ] 2.3.3: Update notification UI to show groups
- [ ] 2.3.4: Test grouping behavior

---

## PRIORITY 3: WIDGET FEATURES

### 3.1 3D Object Creation
**Status**: STUB
**Impact**: LOW - Nice to have

#### Location:
- `src/hooks/useToolCanvasInteraction.ts` (Lines 457-459)

#### Current State:
```typescript
// logs "not yet implemented"
// returns false
```

**Subtasks:**
- [ ] 3.1.1: Research 3D library options (Three.js, Babylon.js)
- [ ] 3.1.2: Design 3D object widget structure
- [ ] 3.1.3: Implement basic 3D primitive creation
- [ ] 3.1.4: Wire up to tool interaction
- [ ] 3.1.5: Add 3D tool to toolbar

---

### 3.2 Widget Sandbox Missing Features
**Status**: PARTIAL
**Impact**: MEDIUM - Widget capability limitations

#### Location:
- `src/runtime/WidgetSandboxHost.ts`

#### Missing:
- Canvas mode context (Line 426) - hardcoded to 'view'
- Canvas size (Line 429) - hardcoded 1920x1080
- Proper permission system (Line 800)
- CSS transforms for position updates (Lines 1205-1216)
- Network capability (Line 693) - returns error

**Subtasks:**
- [ ] 3.2.1: Pass actual canvas mode to widget context
- [ ] 3.2.2: Pass actual canvas size to widget context
- [ ] 3.2.3: Implement permission request flow
- [ ] 3.2.4: Apply CSS transforms for real-time updates
- [ ] 3.2.5: Design network capability security model
- [ ] 3.2.6: Implement network capability with restrictions

---

### 3.3 AI Capability Scanner
**Status**: UI_ONLY
**Impact**: LOW - Developer tool

#### Location:
- `src/components/AISidebar/CapabilityScanner.tsx` (Line 137)

#### Current State:
Upgrade logic runs but result not applied to widget.

**Subtasks:**
- [ ] 3.3.1: Wire up upgrade result to widget update
- [ ] 3.3.2: Show diff between old and new capabilities
- [ ] 3.3.3: Allow user to confirm upgrade
- [ ] 3.3.4: Test capability scanning flow

---

## PRIORITY 4: UI FEATURES

### 4.1 Gallery Share Button
**Status**: UI_ONLY
**Impact**: LOW - Social feature

#### Location:
- `src/pages/GalleryPage.tsx` (Line 510)

**Subtasks:**
- [ ] 4.1.1: Design share modal
- [ ] 4.1.2: Create ShareModal component
- [ ] 4.1.3: Implement share link generation
- [ ] 4.1.4: Add social share buttons (Twitter, etc.)
- [ ] 4.1.5: Wire up share button

---

### 4.2 Widget Generator Expert Mode
**Status**: STUB
**Impact**: LOW - Power user feature

#### Location:
- `src/components/WidgetGenerator2/tabs/CodeOutput.tsx` (Line 212)

#### Current State:
onChange handler is empty.

**Subtasks:**
- [ ] 4.2.1: Implement code editing in expert mode
- [ ] 4.2.2: Add syntax validation
- [ ] 4.2.3: Add live preview of edits
- [ ] 4.2.4: Test expert mode editing

---

### 4.3 Visual Asset Upload
**Status**: STUB
**Impact**: LOW - Creator feature

#### Location:
- `src/components/WidgetGenerator2/tabs/VisualAssets.tsx` (Line 332)

**Subtasks:**
- [ ] 4.3.1: Implement file upload handler
- [ ] 4.3.2: Add asset storage (Supabase Storage)
- [ ] 4.3.3: Add asset preview
- [ ] 4.3.4: Wire up to widget generation

---

### 4.4 Rotation-based Resize Cursor
**Status**: STUB
**Impact**: LOW - UX polish

#### Location:
- `src/components/WidgetFrame.tsx` (Line 488)

**Subtasks:**
- [ ] 4.4.1: Calculate cursor angle from rotation
- [ ] 4.4.2: Implement custom cursor SVG rotation
- [ ] 4.4.3: Apply rotated cursor to resize handles

---

## PRIORITY 5: BACKEND FEATURES

### 5.1 Pipeline Execution
**Status**: STUB
**Impact**: HIGH - Core feature

#### Location:
- `server/controllers/ai.controller.ts` (Line 90)

**Subtasks:**
- [ ] 5.1.1: Design pipeline execution engine
- [ ] 5.1.2: Implement step-by-step execution
- [ ] 5.1.3: Add error handling and retry
- [ ] 5.1.4: Add progress reporting
- [ ] 5.1.5: Test pipeline execution

---

### 5.2 Creator Notification Emails
**Status**: STUB
**Impact**: MEDIUM - Creator experience

#### Location:
- `server/services/admin.service.ts` (Lines 253, 287)

**Subtasks:**
- [ ] 5.2.1: Set up email service (SendGrid/SES)
- [ ] 5.2.2: Create approval email template
- [ ] 5.2.3: Create rejection email template
- [ ] 5.2.4: Wire up email sending
- [ ] 5.2.5: Test email delivery

---

### 5.3 Failed Payment Notifications
**Status**: STUB
**Impact**: MEDIUM - Revenue protection

#### Location:
- `server/payments/stripe.ts` (Line 754)

**Subtasks:**
- [ ] 5.3.1: Create failed payment email template
- [ ] 5.3.2: Implement webhook handler
- [ ] 5.3.3: Send notification email
- [ ] 5.3.4: Add retry instructions
- [ ] 5.3.5: Test with Stripe test mode

---

### 5.4 Session Timeout Cleanup
**Status**: STUB
**Impact**: LOW - Resource management

#### Location:
- `server/lib/sync/session-manager.ts` (Line 229)

**Subtasks:**
- [ ] 5.4.1: Implement session expiry check
- [ ] 5.4.2: Add cleanup cron job
- [ ] 5.4.3: Clean up orphaned resources
- [ ] 5.4.4: Test cleanup behavior

---

## PRIORITY 6: DEPRECATED CODE REMOVAL

### 6.1 Deprecated Canvas Components
**Status**: DEPRECATED

#### Files to Remove:
- [ ] `src/canvas/Canvas2.tsx` (after migration period)
- [ ] `src/components/editor/Canvas.tsx` (after verification)

**Subtasks:**
- [ ] 6.1.1: Verify no remaining usages
- [ ] 6.1.2: Delete deprecated files
- [ ] 6.1.3: Update any documentation

---

### 6.2 Placeholder Implementations
**Status**: DEPRECATED

Many files have "For now" comments indicating temporary code.

#### Files with Placeholders:
- `src/contexts/AuthContext.tsx` (Lines 149, 184)
- `src/state/useCanvasExtendedStore.ts`
- `src/services/workflow/WorkflowOrchestrator.ts`
- `src/runtime/PermissionManager.ts`
- + 20 more files

**Subtasks:**
- [ ] 6.2.1: Audit all "For now" comments
- [ ] 6.2.2: Categorize: implement, remove, or document as intentional
- [ ] 6.2.3: Create tickets for each implementation needed
- [ ] 6.2.4: Clean up dead placeholder code

---

## DOCUMENTED INCOMPLETE FEATURES

### From CREATIVE_SUITE_TODO.md
- [ ] Filter Overlay Widget
- [ ] Synthesizer Widget
- [ ] Effect Widgets (Glitch, RGB Shift)
- [ ] Audio/Video Source Widgets

### From SOCIAL_MEDIA_TODO.md
- [ ] SocialSidebar component
- [ ] ActivityFeedItem component
- [ ] UserProfileCard component
- [ ] NotificationToast component
- [ ] Feed Widget
- [ ] Direct Messaging (partial)

### From AGENT_TODO_WIDGET_PANEL.md
- [ ] 50+ tasks across multiple phases
- [ ] See original document for details

---

## COMPLETION CHECKLIST

After completing features:
- [ ] All database tables created
- [ ] All API endpoints implemented
- [ ] All UI components connected
- [ ] All deprecated code removed
- [ ] All placeholders resolved
- [ ] Feature flags cleaned up
- [ ] Tests added for new features
