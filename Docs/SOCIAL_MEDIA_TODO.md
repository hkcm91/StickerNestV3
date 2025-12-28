# Social Media Layer Implementation Plan

This document outlines the step-by-step tasks required to add social features to StickerNest.

## Phase 1: Database Schema (Supabase)

- [x] **Create `profiles` table**
  - `id` (uuid, references auth.users)
  - `username` (text, unique)
  - `display_name` (text)
  - `avatar_url` (text)
  - `bio` (text)
  - `created_at` (timestamp)

- [x] **Create `follows` table**
  - `follower_id` (uuid, references profiles.id)
  - `following_id` (uuid, references profiles.id)
  - `created_at` (timestamp)
  - *Constraint: Unique composite key (follower_id, following_id)*

- [x] **Create `activities` table** (The Feed)
  - `id` (uuid)
  - `actor_id` (uuid, references profiles.id)
  - `verb` (text: 'published', 'forked', 'liked', 'commented')
  - `object_type` (text: 'widget', 'canvas', 'user')
  - `object_id` (text/uuid)
  - `metadata` (jsonb: snapshot url, title, etc.)
  - `created_at` (timestamp)

- [x] **Create `notifications` table**
  - `id` (uuid)
  - `recipient_id` (uuid, references profiles.id)
  - `actor_id` (uuid, references profiles.id)
  - `type` (text: 'follow', 'mention', 'system')
  - `read_at` (timestamp, nullable)
  - `created_at` (timestamp)

- [x] **Setup RLS Policies**
  - Public read access for profiles and activities.
  - Authenticated write access for own data.

## Phase 2: Frontend Services (`src/services/social/`)

- [x] **Create `SocialGraphService.ts`**
  - `followUser(targetId: string)`
  - `unfollowUser(targetId: string)`
  - `getFollowers(userId: string)`
  - `getFollowing(userId: string)`
  - `checkIsFollowing(targetId: string)`

- [x] **Create `FeedService.ts`**
  - `getGlobalFeed(limit, offset)`
  - `getUserFeed(userId, limit, offset)`
  - `postActivity(activity: Activity)`

- [x] **Create `NotificationService.ts`**
  - `getNotifications(userId)`
  - `markAsRead(notificationId)`
  - `subscribeToNotifications(callback)` (Realtime)

## Phase 3: Runtime Integration (`src/runtime/`)

- [x] **Create `SocialManager.ts`**
  - Initialize with `EventBus` and `TransportManager`.
  - **Event Listener**: Listen for `widget:published` or `canvas:saved`.
    - Automatically trigger `FeedService.postActivity()`.
  - **Presence Enrichment**:
    - Fetch friend list on init.
    - Decorate `PresenceManager` users with "Friend" status (e.g., gold border).

- [x] **Update `App.tsx`**
  - Initialize `SocialManager`.
  - Pass social context to `RuntimeContext`.

## Phase 4: UI Components (`src/components/social/`)

- [ ] **`SocialSidebar.tsx`**
  - Collapsible right-hand panel.
  - Tabs: "Feed", "Friends", "Notifications".

- [ ] **`ActivityFeedItem.tsx`**
  - Display "User X published Widget Y".
  - Show thumbnail/snapshot.
  - "Fork" button directly in the feed.

- [ ] **`UserProfileCard.tsx`**
  - Hover card for users in the presence bar.
  - "Follow" button.

- [ ] **`NotificationToast.tsx`**
  - Real-time popup when receiving a notification.

## Phase 5: Social Widgets

- [ ] **Create "Feed Widget"**
  - A standard StickerNest widget that displays a specific user's feed.
  - Allows users to embed their updates directly onto a canvas.

## Phase 6: Cross-Canvas & Direct Messaging Engine

- [ ] **Update Protocol (`src/protocol/runtimeMessage.ts`)**
  - Update `RuntimeMessageTargetSchema` to include `'user'`, `'canvas'`, `'session'`.
  - Add `targetAddress` field for specific IDs (e.g., `userId`).

- [ ] **Update Sync Policies (`src/protocol/syncPolicies.ts`)**
  - Add `messaging` section to `EventSyncPolicy`.
  - Add `allowDirectMessaging` boolean flag.
  - Add `requiresFriendship` boolean flag (spam protection).

- [ ] **Update Transport Layer**
  - **`TransportManager.ts`**: Add routing logic for `target: 'user'`.
  - **`WebSocketTransport.ts`**: Implement server-side routing for direct messages.

- [ ] **Update Widget API**
  - Expose `sendToUser(userId, event, payload)` method.
  - Expose `sendToCanvas(canvasId, event, payload)` method.
  - Add permission request flow for sending messages to strangers.
