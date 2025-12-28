# Social Layer Implementation Plan

## Overview
Complete implementation plan for StickerNest's social features including following system, real-time collaboration, chat, notifications, and activity feeds.

## Current Status (Updated Dec 2024)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Database Schema | ✅ Complete | All social tables added to Prisma |
| Phase 2: WebSocket Server | ✅ Complete | Already existed (CanvasWebSocketServer) |
| Phase 3: Social API Routes | ✅ Complete | All endpoints implemented |
| Phase 4: Social Widget UIs | ✅ Complete | All 7 widgets fully implemented |
| Phase 5: Integration | ✅ Frontend API | Backend API client expanded |
| Database Migration | ⏳ Pending | Run `npm run db:migrate` |

---

## Phase 1: Database Schema (Foundation) ✅ COMPLETE
**Status: All tables added to Prisma schema**

### 1.1 Core Social Tables
- [x] `Follow` - User follows user relationship (self-referential)
- [x] `Block` - User blocks user
- [x] `UserProfile` - Extended profile data (bio, avatar, social links, privacy settings)

### 1.2 Notification System
- [x] `Notification` - All notification types
- [x] `NotificationType` enum (follow, mention, comment, like, canvas_shared, etc.)

### 1.3 Chat System
- [x] `ChatRoom` - Direct messages and group chats
- [x] `ChatRoomMember` - Room membership with roles
- [x] `ChatMessage` - Individual messages with content types
- [x] `MessageReaction` - Emoji reactions on messages

### 1.4 Activity Feed
- [x] `Activity` - Feed items with actor, object, visibility
- [x] `ActivityType` enum (canvas_created, widget_published, user_followed, etc.)

### 1.5 Collaboration
- [x] `CollaborationRoom` - Active collaboration sessions
- [x] `CollaborationMember` - Room participants with roles

**Files Modified:**
- `server/db/prisma/schema.prisma` - ~400 lines added

---

## Phase 2: WebSocket Collaboration Server ✅ ALREADY COMPLETE
**Status: Already implemented in codebase**

The codebase already has a complete WebSocket implementation:
- `server/websocket/CanvasWebSocketServer.ts` - Local mode
- `server/websocket/ScalableCanvasWebSocketServer.ts` - Distributed mode with Redis pub/sub

### Features Available
- [x] Socket.io server with room management
- [x] Connection state tracking
- [x] Heartbeat/ping mechanism
- [x] Real-time cursor broadcasting
- [x] Selection state sync
- [x] Typing indicators
- [x] Widget operation broadcasting
- [x] Redis adapter for scaling

---

## Phase 3: Social API Routes ✅ COMPLETE
**Status: All endpoints implemented**

### 3.1 Follow System (`/api/social/follow/*`)
- [x] POST `/follow/:userId` - Follow user
- [x] DELETE `/follow/:userId` - Unfollow user
- [x] GET `/follow/:userId/check` - Check if following
- [x] GET `/followers/:userId?` - Get followers (paginated)
- [x] GET `/following/:userId?` - Get following (paginated)

### 3.2 Block System (`/api/social/block/*`)
- [x] POST `/block/:userId` - Block user
- [x] DELETE `/block/:userId` - Unblock user
- [x] GET `/blocked` - Get blocked users

### 3.3 Profile System (`/api/social/profile/*`)
- [x] GET `/profile` - Get current user's social profile
- [x] PUT `/profile` - Update social profile
- [x] GET `/profile/:userId` - Get another user's profile

### 3.4 Notifications (`/api/social/notifications/*`)
- [x] GET `/notifications` - List notifications (paginated)
- [x] POST `/notifications/:id/read` - Mark as read
- [x] POST `/notifications/read-all` - Mark all as read

### 3.5 Chat (`/api/social/chat/*`)
- [x] GET `/chat/rooms` - List chat rooms
- [x] POST `/chat/rooms` - Create room (DM or group)
- [x] GET `/chat/rooms/:roomId` - Get room details
- [x] GET `/chat/rooms/:roomId/messages` - Get messages (paginated)
- [x] POST `/chat/rooms/:roomId/messages` - Send message
- [x] PUT `/chat/rooms/:roomId/messages/:messageId` - Edit message
- [x] DELETE `/chat/rooms/:roomId/messages/:messageId` - Delete message
- [x] POST `/chat/rooms/:roomId/messages/:messageId/reactions` - Add reaction
- [x] DELETE `/chat/rooms/:roomId/messages/:messageId/reactions/:emoji` - Remove reaction

### 3.6 Activity Feed (`/api/social/feed/*`)
- [x] GET `/feed` - Global activity feed
- [x] GET `/feed/following` - Activity from followed users
- [x] GET `/feed/user/:userId` - User's activity

### 3.7 Collaboration (`/api/social/collab/*`)
- [x] POST `/collab/rooms` - Create collaboration room
- [x] GET `/collab/rooms/:roomId` - Get room state
- [x] POST `/collab/rooms/:roomId/join` - Join room
- [x] POST `/collab/rooms/:roomId/leave` - Leave room
- [x] POST `/collab/rooms/:roomId/invite` - Invite user

**Files Created:**
- `server/controllers/social.controller.ts` - ~1200 lines
- `server/routes/social.routes.ts` - Route definitions
- `server/schemas/social.schema.ts` - Zod validation schemas

---

## Phase 4: Social Widget UIs ✅ COMPLETE
**Status: All widgets already implemented**

All widgets located in `src/widgets/builtin/social/`:

### 4.1 PresenceWidget ✅
- [x] Avatar stack showing online collaborators
- [x] Online/idle/away status indicators
- [x] Friend highlighting
- [x] Expandable viewer list
- [x] Click to view user profile

### 4.2 LiveChatWidget ✅
- [x] Message list with auto-scroll
- [x] Message input with emoji support
- [x] Reply threading
- [x] Typing indicators
- [x] Emoji reactions on messages
- [x] Date separators

### 4.3 NotificationWidget ✅
- [x] Notification list with icons by type
- [x] Mark as read (single/all)
- [x] Click to navigate
- [x] Unread count badge

### 4.4 LiveFeedWidget ✅
- [x] Activity stream (global/friends tabs)
- [x] Infinite scroll pagination
- [x] Activity type icons
- [x] Time ago formatting
- [x] "New activity" banner

### 4.5 UserCardWidget ✅
- [x] Profile preview with cover
- [x] Follow/unfollow button
- [x] Stats (followers/following)
- [x] Online status indicator
- [x] Message button
- [x] Compact mode

### 4.6 CommentWidget ✅
- [x] Comment thread display
- [x] Reply support
- [x] Like/unlike comments
- [x] Add new comments

### 4.7 WalkieTalkieWidget ✅
- [x] Channel selection
- [x] Push-to-send messaging
- [x] Typing indicators
- [x] Online status
- [x] Message history

---

## Phase 5: Integration ✅ IN PROGRESS

### 5.1 Frontend API Client ✅ Complete
- [x] `followApi` - Follow/unfollow operations
- [x] `profileApi` - Social profile management
- [x] `blockApi` - User blocking
- [x] `socialNotificationsApi` - Notification operations
- [x] `chatApi` - Chat rooms and messages
- [x] `feedApi` - Activity feed
- [x] `collabApi` - Collaboration rooms
- [x] Combined `socialApi` object

**Files Updated:**
- `src/services/api/social.ts` - Expanded with all endpoints
- `src/services/api/index.ts` - Exports all social modules

### 5.2 Remaining Work
- [ ] Run Prisma migration to generate types
- [ ] Connect stores to real API (remove mocks)
- [ ] WebSocket client integration for real-time updates

---

## Next Steps

### 1. Database Migration (Required)
```bash
cd server
npx prisma generate
npx prisma migrate dev --name add_social_layer
```

### 2. Test API Endpoints
```bash
# Start server
npm run dev

# Test follow endpoint
curl -X POST http://localhost:3001/api/social/follow/user-id \
  -H "Authorization: Bearer <token>"
```

### 3. Connect Frontend Stores
Create or update Zustand stores to use the new API:
- `useSocialStore` - Follow/block relationships
- `useChatStore` - Chat rooms and messages
- `useFeedStore` - Activity feed
- `useNotificationStore` - Notifications

---

## Architecture Summary

```
Frontend                                Backend
─────────────────────────────────────────────────────
┌─────────────────┐   HTTP    ┌─────────────────────┐
│  Social Widgets │ ────────► │  /api/social/*      │
│  (7 widgets)    │           │  social.routes.ts   │
└─────────────────┘           └─────────────────────┘
        │                              │
        │                              ▼
        │                     ┌─────────────────────┐
        │                     │ social.controller   │
        │                     └─────────────────────┘
        │                              │
        │ WebSocket                    ▼
        │                     ┌─────────────────────┐
        └───────────────────► │  Prisma Database    │
          CanvasWebSocket     │  (PostgreSQL)       │
                              └─────────────────────┘
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `server/db/prisma/schema.prisma` | Database schema with social tables |
| `server/controllers/social.controller.ts` | API endpoint handlers |
| `server/routes/social.routes.ts` | Route definitions |
| `server/schemas/social.schema.ts` | Request validation |
| `src/services/api/social.ts` | Frontend API client |
| `src/widgets/builtin/social/*` | Widget implementations |
