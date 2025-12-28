# StickerNest Social Features Roadmap

## Executive Summary

**Goal**: Enable full social functionality including search, follow, multi-user collaborative editing, and a hidden social layer widgets can tap into for live data.

**Current State**: ~75% of backend infrastructure exists. Primary gaps are UI integration, search expansion, and real-time event wiring.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Search  │ │  Follow  │ │  Collab  │ │  Chat    │ │  Feed    │ │
│  │   Bar    │ │  Button  │ │  Panel   │ │  Panel   │ │  Panel   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└───────┼────────────┼────────────┼────────────┼────────────┼────────┘
        │            │            │            │            │
┌───────┴────────────┴────────────┴────────────┴────────────┴────────┐
│                       ZUSTAND STORES                                │
│  useUserSearchStore │ useFollowStore │ useCollaborationStore       │
│  useSocialStore     │ usePresenceStore │ useFeedStore              │
│  useNotificationStore │ useChatStore │ usePermissionsStore         │
└───────┬────────────────────────────────────────────────────────────┘
        │
┌───────┴────────────────────────────────────────────────────────────┐
│                     SOCIAL SERVICES                                 │
│  BroadcastService │ FriendSyncService │ SocialEventBridge          │
│  FeedService │ ProfileService │ NotificationService                │
└───────┬────────────────────────────────────────────────────────────┘
        │
┌───────┴────────────────────────────────────────────────────────────┐
│                    RUNTIME MANAGERS                                 │
│  PresenceManager │ SocialManager │ CollaborationManager            │
└───────┬────────────────────────────────────────────────────────────┘
        │
┌───────┴────────────────────────────────────────────────────────────┐
│                      EVENT BUS                                      │
│  social:* events │ presence:* events │ collaboration:* events      │
└───────┬────────────────────────────────────────────────────────────┘
        │
┌───────┴────────────────────────────────────────────────────────────┐
│                   WIDGET SOCIAL LAYER                               │
│  Widgets subscribe to social events via SocialEventBridge          │
│  Events: activity, notifications, comments, presence, chat         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

| Feature | Backend | Frontend Store | UI Component | Status |
|---------|---------|----------------|--------------|--------|
| User Search | ✅ | ✅ useUserSearchStore | ✅ UserSearchBar | **COMPLETE** |
| Canvas Search | ❌ | ❌ | ❌ | **NOT STARTED** |
| Widget Search | ❌ | ❌ | ❌ | **NOT STARTED** |
| Follow/Unfollow | ✅ | ✅ useFollowStore | ⚠️ Basic only | **NEEDS UI** |
| Block Users | ✅ | ✅ useSocialStore | ❌ | **NEEDS UI** |
| Collaboration Rooms | ✅ | ✅ useCollaborationStore | ❌ | **NEEDS UI** |
| Add Editor to Canvas | ⚠️ Partial | ✅ usePermissionsStore | ❌ | **NEEDS WIRING** |
| Real-Time Presence | ✅ | ✅ usePresenceStore | ⚠️ Partial | **NEEDS WIRING** |
| Live Cursors | ✅ PresenceManager | ✅ | ⚠️ Renderer exists | **NEEDS WIRING** |
| Social Event Bridge | ✅ | ✅ | N/A | **COMPLETE** |
| Widget Broadcasting | ✅ BroadcastService | ✅ | N/A | **COMPLETE** |
| Chat System | ✅ | ⚠️ Basic | ❌ | **NEEDS UI** |
| Notifications | ✅ | ✅ useNotificationStore | ⚠️ Partial | **NEEDS POLISH** |
| Activity Feed | ✅ | ✅ useFeedStore | ⚠️ Partial | **NEEDS POLISH** |

---

## Phase 1: Search System Expansion

**Priority**: HIGH
**Dependencies**: None
**Estimated Effort**: 3-4 days

### 1.1 Canvas Search API & Store

#### Backend Task: Create Canvas Search Endpoint

**File**: `server/controllers/search.controller.ts` (new)

```typescript
// GET /api/search/canvases?q=query&filter=public|following|mine&page=1
interface CanvasSearchResult {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  owner: { id: string; displayName: string; avatarUrl: string };
  isPublic: boolean;
  collaboratorCount: number;
  widgetCount: number;
  lastModified: string;
}
```

**Subtasks**:
- [ ] Create `server/controllers/search.controller.ts`
- [ ] Add route `GET /api/search/canvases`
- [ ] Implement full-text search on canvas name/description
- [ ] Add filters: `public`, `following` (canvases by followed users), `mine`
- [ ] Add pagination (20 per page)
- [ ] Index canvas metadata for performance

#### Frontend Task: Canvas Search Store

**File**: `src/state/useCanvasSearchStore.ts` (new)

**Subtasks**:
- [ ] Create store with query, results, filters, loading states
- [ ] Add `searchCanvases(query, filters)` action
- [ ] Add recent searches (persisted)
- [ ] Add `clearSearch()` action

#### Frontend Task: Canvas Search UI

**File**: `src/components/social/CanvasSearchBar.tsx` (new)

**Subtasks**:
- [ ] Create autocomplete search bar component
- [ ] Show canvas thumbnails in results
- [ ] Add filter chips (Public, Following, My Canvases)
- [ ] Add "Open Canvas" and "Request Access" actions
- [ ] Keyboard navigation support

---

### 1.2 Widget/Marketplace Search

#### Backend Task: Widget Search Endpoint

**File**: `server/controllers/search.controller.ts`

```typescript
// GET /api/search/widgets?q=query&category=all&sort=popular|recent
interface WidgetSearchResult {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  creator: { id: string; displayName: string };
  category: string;
  installCount: number;
  rating: number;
  price: number | null; // null = free
}
```

**Subtasks**:
- [ ] Add route `GET /api/search/widgets`
- [ ] Search widget name, description, tags
- [ ] Add category filter
- [ ] Add sort options: popular, recent, top-rated
- [ ] Include free/paid filter

#### Frontend Task: Widget Search Store

**File**: `src/state/useWidgetSearchStore.ts` (new)

**Subtasks**:
- [ ] Create store with query, results, category, sort
- [ ] Add `searchWidgets(query, options)` action
- [ ] Track search history

#### Frontend Task: Widget Search UI

**File**: `src/components/social/WidgetSearchBar.tsx` (new)

**Subtasks**:
- [ ] Create search bar with category dropdown
- [ ] Show widget cards in results grid
- [ ] Add "Add to Canvas" quick action
- [ ] Add "View Details" action

---

### 1.3 Unified Search Component

**File**: `src/components/social/UnifiedSearchBar.tsx` (new)

**Subtasks**:
- [ ] Tab-based search: Users | Canvases | Widgets
- [ ] Unified keyboard shortcut (Cmd/Ctrl+K)
- [ ] Recent searches across all types
- [ ] Quick actions per result type

---

## Phase 2: Collaboration & Multi-User Editing UI

**Priority**: HIGH
**Dependencies**: Phase 1 (for user search when inviting)
**Estimated Effort**: 5-7 days

### 2.1 Collaboration Panel

**File**: `src/components/collaboration/CollaborationPanel.tsx` (new)

#### Subtasks:

- [ ] **Panel Header**
  - Canvas name with edit button (owner only)
  - Share button (opens invite modal)
  - Settings gear (room settings)

- [ ] **Active Collaborators Section**
  - List of current collaborators with avatars
  - Role badge (Owner/Editor/Viewer)
  - Status indicator (online/away/idle)
  - "Following" indicator if following their cursor
  - Context menu: Follow cursor, Change role, Remove

- [ ] **Invite Section**
  - User search input (uses `useUserSearchStore`)
  - Role selector dropdown (Editor/Viewer)
  - Send invite button
  - Generate invite link button

- [ ] **Pending Invites Section**
  - List of pending invites
  - Resend/Cancel actions

- [ ] **Room Settings Section** (expandable)
  - Toggle: Viewers can react
  - Toggle: Viewers can chat
  - Toggle: Editors can invite
  - Toggle: Show cursor trails
  - Toggle: Sync viewport
  - Max participants slider
  - Idle timeout slider

---

### 2.2 Add Editor Flow

**File**: `src/components/collaboration/AddEditorModal.tsx` (new)

#### Subtasks:

- [ ] **Search Step**
  - User search with autocomplete
  - Show mutual followers first
  - Show online status

- [ ] **Role Selection Step**
  - Editor: Full widget manipulation
  - Viewer: Watch only, can react/chat

- [ ] **Permissions Step** (optional advanced)
  - Per-canvas overrides
  - Temporary elevation option

- [ ] **Confirmation Step**
  - Summary of access being granted
  - Send notification toggle
  - Confirm button

#### Backend Wiring:

- [ ] Connect to `useCollaborationStore.addCollaborator()`
- [ ] Connect to `usePermissionsStore.setCanvasAccess()`
- [ ] Send notification via `server/controllers/social.controller.ts`

---

### 2.3 Live Cursor Rendering

**File**: `src/components/collaboration/RemoteCursors.tsx` (enhance existing or create)

#### Subtasks:

- [ ] **Cursor Component**
  - User color (from `usePresenceStore`)
  - User name label
  - Tool indicator (select/draw/etc)
  - Smooth interpolation (use `PresenceManager.getInterpolatedPosition`)

- [ ] **Cursor Trail Effect**
  - Optional trail rendering
  - Fade out animation
  - Configurable via room settings

- [ ] **Selection Highlight**
  - Show what others have selected
  - Different border color per user
  - Selection box overlay

- [ ] **Typing Indicator**
  - Show who's editing which widget
  - Pulsing indicator near widget

---

### 2.4 Presence Indicators

**File**: `src/components/collaboration/PresenceIndicators.tsx` (new)

#### Subtasks:

- [ ] **Canvas Header Avatars**
  - Stack of collaborator avatars
  - Click to expand list
  - Status dot on each avatar

- [ ] **Minimap Presence** (if minimap exists)
  - Show collaborator positions on minimap
  - Clickable to jump to their view

---

### 2.5 Permission Enforcement UI

**File**: `src/components/collaboration/PermissionGate.tsx` (new)

#### Subtasks:

- [ ] **Read-Only Overlay**
  - Show when user is Viewer
  - "Request Edit Access" button
  - Explain limitations

- [ ] **Widget Lock Indicator**
  - Show lock icon on locked widgets
  - "Being edited by [User]" tooltip
  - Auto-unlock after timeout

- [ ] **Action Blocked Toast**
  - Show when action denied
  - Explain why (role, lock, etc)
  - Suggest alternative

---

## Phase 3: Social Layer for Widgets

**Priority**: MEDIUM-HIGH
**Dependencies**: Phase 2
**Estimated Effort**: 4-5 days

### 3.1 Widget Social API Enhancement

**File**: `src/runtime/WidgetSocialAPI.ts` (new)

Expose social capabilities to widgets via `window.WidgetAPI`:

```typescript
interface WidgetSocialAPI {
  // Presence
  getCollaborators(): Collaborator[];
  onCollaboratorJoin(callback: (user: Collaborator) => void): void;
  onCollaboratorLeave(callback: (userId: string) => void): void;

  // Cursors
  getCursors(): RemoteCursor[];
  onCursorMove(callback: (cursor: RemoteCursor) => void): void;

  // Social Events
  onSocialEvent(type: string, callback: (payload: any) => void): void;

  // Feed
  getRecentActivity(limit?: number): FeedActivity[];
  onNewActivity(callback: (activity: FeedActivity) => void): void;

  // Notifications
  getNotifications(unreadOnly?: boolean): Notification[];
  onNotification(callback: (notification: Notification) => void): void;

  // Chat (canvas-level)
  sendChatMessage(content: string): void;
  onChatMessage(callback: (message: ChatMessage) => void): void;

  // User Info
  getCurrentUser(): UserProfile;
  getUserProfile(userId: string): Promise<UserProfile>;

  // Reactions
  emitReaction(emoji: string, position?: {x: number, y: number}): void;
  onReaction(callback: (reaction: Reaction) => void): void;
}
```

#### Subtasks:

- [ ] Create `WidgetSocialAPI` class
- [ ] Inject into widget sandbox via `WidgetSandboxHost`
- [ ] Connect to `SocialEventBridge` for event streaming
- [ ] Add rate limiting for reaction spam
- [ ] Document API for widget developers

---

### 3.2 Social Event Types for Widgets

**File**: `src/runtime/SocialEventBridge.ts` (enhance)

#### New Events to Bridge:

| Event | Payload | Description |
|-------|---------|-------------|
| `social:collaborator-joined` | `{ user, role, canvasId }` | New collaborator |
| `social:collaborator-left` | `{ userId, canvasId }` | Collaborator left |
| `social:cursor-batch` | `{ cursors: RemoteCursor[] }` | Cursor updates (batched) |
| `social:selection-changed` | `{ userId, widgetIds, bounds }` | Selection update |
| `social:widget-locked` | `{ widgetId, lockedBy }` | Widget locked |
| `social:widget-unlocked` | `{ widgetId }` | Widget unlocked |
| `social:reaction-burst` | `{ emoji, position, userId }` | Emoji reaction |
| `social:canvas-chat` | `{ message, sender }` | Canvas chat message |

#### Subtasks:

- [ ] Add new event types to `SocialEventBridge`
- [ ] Throttle cursor events (batch every 50ms)
- [ ] Add event filtering (widgets can specify which events they want)

---

### 3.3 Built-in Social Widgets Enhancement

#### Enhance Existing Widgets:

**Location**: `src/widgets/built-in/`

- [ ] **PresenceWidget** - Show collaborators with live status
- [ ] **LiveChatWidget** - Canvas-level chat
- [ ] **LiveFeedWidget** - Activity feed from followed users
- [ ] **NotificationWidget** - Live notifications
- [ ] **UserCardWidget** - Hover card for user profiles

#### New Widgets:

- [ ] **CollaboratorListWidget** - Detailed collaborator panel
- [ ] **ReactionPickerWidget** - Quick emoji reactions
- [ ] **CanvasActivityWidget** - What's happening on this canvas

---

### 3.4 Widget Capability: Social

**File**: `src/types/manifest.ts` (enhance)

Add `social` capability to widget manifest:

```typescript
capabilities: {
  // ... existing
  social: {
    presence: boolean;      // Can see collaborators
    cursors: boolean;       // Can see remote cursors
    chat: boolean;          // Can send/receive chat
    reactions: boolean;     // Can emit/receive reactions
    feed: boolean;          // Can access activity feed
    notifications: boolean; // Can access notifications
  }
}
```

#### Subtasks:

- [ ] Add social capability types to manifest schema
- [ ] Implement capability checking in `WidgetSocialAPI`
- [ ] Default: all false (opt-in for privacy)

---

## Phase 4: Real-Time Chat & Presence Wiring

**Priority**: MEDIUM
**Dependencies**: Phase 2, Phase 3
**Estimated Effort**: 3-4 days

### 4.1 WebSocket Presence Connection

**File**: `src/runtime/PresenceWebSocket.ts` (new)

#### Subtasks:

- [ ] Create WebSocket connection to presence server
- [ ] Handle reconnection with exponential backoff
- [ ] Sync local cursor position to server (throttled)
- [ ] Receive remote cursor updates
- [ ] Handle user join/leave events
- [ ] Integrate with `usePresenceStore`

#### Server Side:

**File**: `server/websocket/presence.handler.ts` (enhance or create)

- [ ] Handle `presence:cursor-update` messages
- [ ] Broadcast cursor updates to room members
- [ ] Handle `presence:join` / `presence:leave`
- [ ] Track active users per canvas

---

### 4.2 Canvas Chat Panel

**File**: `src/components/social/CanvasChatPanel.tsx` (new)

#### Subtasks:

- [ ] **Chat Container**
  - Collapsible panel (right side or bottom)
  - Unread count badge when collapsed

- [ ] **Message List**
  - User avatars and names
  - Timestamps
  - Message grouping (same user, close time)
  - Auto-scroll to bottom
  - Load more (pagination)

- [ ] **Message Input**
  - Text input with send button
  - Typing indicator ("X is typing...")
  - Emoji picker button
  - Mention support (@username)

- [ ] **WebSocket Integration**
  - Real-time message delivery
  - Typing indicator broadcast
  - Read receipts (optional)

---

### 4.3 Chat Store Enhancement

**File**: `src/state/useChatStore.ts` (create or enhance)

#### Subtasks:

- [ ] Create chat state: rooms, messages, typing indicators
- [ ] Add `sendMessage(roomId, content)` action
- [ ] Add `markAsRead(roomId)` action
- [ ] Add `setTyping(roomId, isTyping)` action
- [ ] Connect to WebSocket for real-time updates

---

### 4.4 Direct Messages

**File**: `src/components/social/DirectMessagePanel.tsx` (new)

#### Subtasks:

- [ ] **Conversation List**
  - Recent conversations
  - Unread indicators
  - Online status

- [ ] **Message Thread**
  - Similar to canvas chat
  - 1:1 or group DMs

- [ ] **New Conversation**
  - User search to start DM
  - Create group option

---

## Phase 5: Social Discovery & Feed Enhancement

**Priority**: MEDIUM
**Dependencies**: Phase 1, Phase 2
**Estimated Effort**: 3-4 days

### 5.1 Enhanced Feed System

**File**: `src/state/useFeedStore.ts` (enhance)

#### Subtasks:

- [ ] **Fix Friends Feed**
  - Currently falls back to global
  - Implement `getFollowedUsers()` query
  - Filter activities by followed users

- [ ] **Canvas-Specific Feed**
  - Activities on current canvas
  - Widget additions, collaborator joins, etc.

- [ ] **Feed Filters**
  - By activity type (widget, canvas, social)
  - By time range
  - By user

---

### 5.2 Feed UI Enhancement

**File**: `src/components/social/ActivityFeed.tsx` (enhance)

#### Subtasks:

- [ ] **Feed Tabs**
  - Global | Following | This Canvas

- [ ] **Activity Cards**
  - Rich previews (canvas thumbnails, widget icons)
  - Like/comment actions
  - Share button

- [ ] **Infinite Scroll**
  - Load more as user scrolls
  - Loading skeleton

---

### 5.3 Social Discovery Page

**File**: `src/pages/DiscoverPage.tsx` (new)

#### Subtasks:

- [ ] **Trending Canvases**
  - Most viewed/edited recently
  - Thumbnails with stats

- [ ] **Popular Creators**
  - Top followed users
  - Recent activity preview

- [ ] **Recommended for You**
  - Based on followed users' activity
  - Similar to canvases you've liked

- [ ] **New Widgets**
  - Recently published widgets
  - Quick add to canvas

---

### 5.4 User Profile Enhancement

**File**: `src/pages/public/PublicProfilePage.tsx` (enhance)

#### Subtasks:

- [ ] **Fix Like Persistence** (TODO at line 89)
  - Call API to save likes

- [ ] **Activity Tab**
  - User's recent activity
  - Public canvases
  - Published widgets

- [ ] **Followers/Following Tabs**
  - Use existing `FollowersListModal`
  - Add to page as full section

- [ ] **Social Stats**
  - Canvas count
  - Widget count
  - Total likes received

---

## Implementation Priority Matrix

| Phase | Priority | Dependencies | Effort | Business Value |
|-------|----------|--------------|--------|----------------|
| Phase 1: Search | HIGH | None | 3-4 days | Enables discovery |
| Phase 2: Collab UI | HIGH | Phase 1 partial | 5-7 days | Core feature |
| Phase 3: Widget Social | MEDIUM-HIGH | Phase 2 | 4-5 days | Unique differentiator |
| Phase 4: Chat/Presence | MEDIUM | Phase 2, 3 | 3-4 days | Engagement |
| Phase 5: Discovery | MEDIUM | Phase 1, 2 | 3-4 days | Growth |

**Recommended Order**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

---

## Quick Wins (Can Do Anytime)

These are small tasks that can be done independently:

1. **Fix Friends Feed** (`useFeedStore.ts:259-265`) - 2 hours
2. **Fix Profile Like Persistence** (`PublicProfilePage.tsx:89`) - 1 hour
3. **Add Block User UI** - 3 hours
4. **Wire Notification Grouping** (`useNotificationStore.ts:640`) - 2 hours
5. **Add User Search to Canvas Toolbar** - 2 hours

---

## File Reference

### Existing Files to Enhance

| File | Purpose |
|------|---------|
| `src/state/useUserSearchStore.ts` | User search (complete) |
| `src/state/useFollowStore.ts` | Follow system (complete) |
| `src/state/useSocialStore.ts` | Social core (complete) |
| `src/state/useCollaborationStore.ts` | Collab rooms (complete) |
| `src/state/usePresenceStore.ts` | Presence (complete) |
| `src/state/usePermissionsStore.ts` | Permissions (complete) |
| `src/state/useFeedStore.ts` | Activity feed (needs fixes) |
| `src/state/useNotificationStore.ts` | Notifications (needs grouping) |
| `src/runtime/PresenceManager.ts` | Presence runtime (complete) |
| `src/runtime/SocialEventBridge.ts` | Event bridge (complete) |
| `src/services/social/BroadcastService.ts` | Broadcasting (complete) |
| `src/services/social/FriendSyncService.ts` | Friend sync (complete) |
| `server/controllers/social.controller.ts` | Social API (complete) |

### New Files to Create

| File | Purpose |
|------|---------|
| `server/controllers/search.controller.ts` | Search API |
| `src/state/useCanvasSearchStore.ts` | Canvas search state |
| `src/state/useWidgetSearchStore.ts` | Widget search state |
| `src/state/useChatStore.ts` | Chat state |
| `src/components/social/CanvasSearchBar.tsx` | Canvas search UI |
| `src/components/social/WidgetSearchBar.tsx` | Widget search UI |
| `src/components/social/UnifiedSearchBar.tsx` | Unified search |
| `src/components/collaboration/CollaborationPanel.tsx` | Collab panel |
| `src/components/collaboration/AddEditorModal.tsx` | Add editor flow |
| `src/components/collaboration/RemoteCursors.tsx` | Cursor rendering |
| `src/components/collaboration/PresenceIndicators.tsx` | Presence UI |
| `src/components/collaboration/PermissionGate.tsx` | Permission UI |
| `src/components/social/CanvasChatPanel.tsx` | Chat panel |
| `src/components/social/DirectMessagePanel.tsx` | DM panel |
| `src/components/social/ActivityFeed.tsx` | Enhanced feed |
| `src/runtime/WidgetSocialAPI.ts` | Widget social API |
| `src/runtime/PresenceWebSocket.ts` | Presence WebSocket |
| `src/pages/DiscoverPage.tsx` | Discovery page |

---

## Success Metrics

After implementing all phases:

- [ ] Users can search for users, canvases, and widgets
- [ ] Users can follow other users and see their activity
- [ ] Canvas owners can add editors with granular permissions
- [ ] Multiple users can edit the same canvas simultaneously
- [ ] Live cursors show where collaborators are working
- [ ] Widgets can tap into social events (presence, chat, activity)
- [ ] Real-time chat works on canvas and via DMs
- [ ] Activity feed shows relevant content from followed users
- [ ] Discovery page helps users find interesting content

---

## Notes

- **Backend is mostly complete** - Focus on frontend UI and wiring
- **Stores are well-designed** - Follow existing patterns
- **Use SocialEventBridge** - Central hub for widget social data
- **Throttle presence updates** - 50ms for cursors, 16ms for smooth rendering
- **Test with multiple tabs** - Simulate multi-user locally
