# StickerNest v2 - Social Widgets Documentation

## Overview

The Social Layer is a "hidden" dimension of social features that users can reveal through widget windows. Think of it like augmented reality overlays on top of the canvas - social activity exists all around, but you choose when and how to see it.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SOCIAL LAYER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         ZUSTAND STORES                               │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐     │   │
│   │  │ useSocial    │  │ useFeed      │  │ useNotification        │     │   │
│   │  │ Store        │  │ Store        │  │ Store                  │     │   │
│   │  │              │  │              │  │                        │     │   │
│   │  │ • Relations  │  │ • Activities │  │ • Notifications        │     │   │
│   │  │ • Privacy    │  │ • Pagination │  │ • Unread count         │     │   │
│   │  │ • Profiles   │  │ • Caching    │  │ • Grouping             │     │   │
│   │  └──────────────┘  └──────────────┘  └────────────────────────┘     │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                             │
│                                ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      SOCIAL EVENT BRIDGE                             │   │
│   │  • Connects stores to EventBus                                       │   │
│   │  • Emits social:* events for widgets                                 │   │
│   │  • Subscribes to Supabase Realtime                                   │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                             │
│                                ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          EVENT BUS                                   │   │
│   │  social:activity-new | social:notification-new | social:follow-new  │   │
│   │  social:comment-new | social:presence-update | social:chat-message  │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                             │
│                                ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       SOCIAL WIDGETS                                 │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │   │
│   │  │ Comment   │ │ LiveFeed  │ │ UserCard  │ │ Presence  │           │   │
│   │  │ Widget    │ │ Widget    │ │ Widget    │ │ Widget    │           │   │
│   │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘           │   │
│   │        │             │             │             │                   │   │
│   │  ┌───────────┐ ┌───────────┐                                        │   │
│   │  │Notification│ │ LiveChat │       ┌─────────────────────────┐      │   │
│   │  │ Widget    │ │ Widget   │       │ Social Layer Manager   │      │   │
│   │  └───────────┘ └───────────┘       │ • Visibility control   │      │   │
│   │                                     │ • User preferences     │      │   │
│   │                                     └─────────────────────────┘      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Available Widgets

| Widget | Description | Key Features |
|--------|-------------|--------------|
| `CommentWidget` | Threaded comments on canvas/widgets | Likes, replies, real-time updates |
| `LiveFeedWidget` | Scrollable activity feed | Global/friends tabs, infinite scroll |
| `UserCardWidget` | Compact user profile card | Follow button, online status |
| `PresenceWidget` | Canvas viewers indicator | Avatar stack, cursor positions |
| `NotificationWidget` | Live notification stream | Type icons, unread badge |
| `LiveChatWidget` | Real-time canvas chat | Typing indicators, reactions |

## Quick Start

### Adding Social Widgets to Canvas

```typescript
import { SOCIAL_WIDGETS } from '@/widgets/builtin/social';

// Get a specific social widget
const userCardWidget = SOCIAL_WIDGETS['stickernest.user-card'];

// Add to canvas via the widget system
widgetManager.addWidget(userCardWidget.manifest.id, {
  position: { x: 100, y: 100 },
  config: { userId: 'user-123' }
});
```

### Using Pipeline Presets

```typescript
import { applySocialPreset, SocialPreset } from '@/pipelines/presets/socialWidgets';

// Create a social dashboard pipeline
const pipeline = applySocialPreset(
  SocialPreset.SOCIAL_OVERVIEW,
  canvasId,
  {
    liveFeed: feedWidgetInstance,
    userCard: cardWidgetInstance,
    comment: commentWidgetInstance,
    presence: presenceWidgetInstance,
  }
);
```

### Controlling Social Layer Visibility

```typescript
import { getSocialLayerManager } from '@/runtime/SocialLayerManager';

const manager = getSocialLayerManager();

// Set visibility mode
manager.setVisibilityMode('full');     // Show all social widgets
manager.setVisibilityMode('minimal');  // Show only presence
manager.setVisibilityMode('hidden');   // Hide all

// Toggle individual categories
manager.showCategory('chat');
manager.hideCategory('notification');
```

## Widget Details

### CommentWidget

**ID:** `stickernest.comment-widget`

**Inputs:**
- `targetId` (string) - Canvas or widget ID to show comments for
- `targetType` (string) - 'canvas' | 'widget'
- `limit` (number) - Max comments to display

**Outputs:**
- `commentAdded` - { commentId, content, timestamp }
- `commentLiked` - { commentId, userId }
- `userClicked` - userId

**Events Listened:**
- `social:comment-new`
- `social:comment-deleted`

### LiveFeedWidget

**ID:** `stickernest.live-feed`

**Inputs:**
- `feedType` (string) - 'global' | 'friends' | 'user'
- `userId` (string) - For user-specific feeds
- `limit` (number) - Items per page

**Outputs:**
- `activityClicked` - Activity object
- `userClicked` - userId
- `objectClicked` - { type, id }

**Events Listened:**
- `social:activity-new`

### UserCardWidget

**ID:** `stickernest.user-card`

**Inputs:**
- `userId` (string) - User to display
- `showFollowButton` (boolean) - Show follow/unfollow
- `compact` (boolean) - Compact display mode

**Outputs:**
- `followToggled` - { userId, isFollowing }
- `profileClicked` - userId
- `messageClicked` - userId

**Events Listened:**
- `social:online-status-changed`
- `social:follow-new`

### PresenceWidget

**ID:** `stickernest.presence`

**Inputs:**
- `canvasId` (string) - Canvas to show presence for
- `maxVisible` (number) - Max avatars before "+N"
- `showCursors` (boolean) - Show cursor positions

**Outputs:**
- `userClicked` - userId
- `cursorHovered` - { userId, position }
- `viewerCountChanged` - count

**Events Listened:**
- `social:presence-update`
- `presence:user-joined`
- `presence:user-left`

### NotificationWidget

**ID:** `stickernest.notification`

**Inputs:**
- `limit` (number) - Max notifications to show
- `filter` (string) - Notification type filter

**Outputs:**
- `notificationClicked` - Notification object
- `notificationDismissed` - notificationId
- `userClicked` - userId
- `unreadChanged` - count

### LiveChatWidget

**ID:** `stickernest.live-chat`

**Inputs:**
- `canvasId` (string) - Canvas to chat in
- `maxMessages` (number) - Message history limit
- `showTypingIndicator` (boolean) - Show typing status

**Outputs:**
- `messageSent` - { messageId, content, timestamp }
- `userClicked` - userId
- `reactionAdded` - { messageId, reaction }

## Theming

Social widgets use CSS custom properties from `social-tokens.css`:

```css
/* Status colors */
--sn-social-status-online: #22c55e;
--sn-social-status-away: #f59e0b;
--sn-social-status-busy: #ef4444;

/* Chat colors */
--sn-social-chat-bubble-own: var(--sn-accent-primary);
--sn-social-chat-bubble-other: var(--sn-bg-elevated);

/* Activity type colors */
--sn-social-activity-follow: var(--sn-rainbow-purple);
--sn-social-activity-like: var(--sn-rainbow-red);
--sn-social-activity-comment: var(--sn-rainbow-blue);
```

## Pipeline Connections

Social widgets are designed to connect via pipelines:

```
LiveFeed.userClicked ──────► UserCard.userId
Comment.userClicked  ──────► UserCard.userId
LiveChat.userClicked ──────► UserCard.userId
Presence.userClicked ──────► UserCard.userId
Notification.userClicked ──► UserCard.userId
```

## Services

### ChatService

Handles real-time messaging via Supabase Realtime.

```typescript
import { ChatService } from '@/services/social/ChatService';

// Get message history
const messages = await ChatService.getMessages(canvasId, 50);

// Send a message
const message = await ChatService.sendMessage(canvasId, 'Hello!');

// Subscribe to new messages
const unsubscribe = ChatService.subscribeToMessages(canvasId, (payload) => {
  if (payload.eventType === 'INSERT') {
    console.log('New message:', payload.new);
  }
});

// Broadcast typing indicator
ChatService.broadcastTyping(canvasId, userId, userName, true);
```

### NotificationService

Handles notification fetching and real-time subscriptions.

```typescript
import { NotificationService } from '@/services/social/NotificationService';

// Get notifications
const notifications = await NotificationService.getNotifications(20);

// Subscribe to real-time updates
const unsubscribe = NotificationService.subscribeToNotifications((payload) => {
  if (payload.eventType === 'INSERT') {
    // New notification received
  }
});

// Mark as read
await NotificationService.markAsRead(notificationId);
```

## Database Schema

### chat_messages

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  reply_to UUID REFERENCES chat_messages(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  actor_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  object_type TEXT,
  object_id UUID,
  message TEXT,
  metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing

Run E2E tests:

```bash
npx playwright test tests/social-widgets.spec.ts
npx playwright test tests/social-widgets.spec.ts --headed
```

## File Structure

```
src/
├── widgets/
│   └── builtin/
│       └── social/
│           ├── index.ts           # Social widgets barrel export
│           ├── CommentWidget.ts   # Threaded comments
│           ├── LiveFeedWidget.ts  # Activity feed
│           ├── UserCardWidget.ts  # Profile card
│           ├── PresenceWidget.ts  # Canvas viewers
│           ├── NotificationWidget.ts # Notifications
│           └── LiveChatWidget.ts  # Real-time chat
├── services/
│   └── social/
│       ├── ChatService.ts         # Chat messaging
│       └── NotificationService.ts # Notification management
├── state/
│   ├── useSocialStore.ts          # Relationships, privacy
│   ├── useFeedStore.ts            # Activity feed
│   └── useNotificationStore.ts    # Notifications
├── runtime/
│   ├── SocialEventBridge.ts       # Store-to-EventBus bridge
│   └── SocialLayerManager.ts      # Visibility coordination
├── pipelines/
│   └── presets/
│       └── socialWidgets.ts       # Pipeline presets
├── themes/
│   └── social-tokens.css          # Social-specific CSS tokens
└── tests/
    └── social-widgets.spec.ts     # E2E tests
```

## Best Practices

1. **Use Pipeline Presets** - Don't manually wire widgets; use presets for consistent behavior
2. **Respect Privacy** - Check user privacy mode before showing social features
3. **Handle Offline** - Social widgets should gracefully degrade when offline
4. **Throttle Events** - Use debouncing for typing indicators and presence updates
5. **Clean Up** - Always unsubscribe from real-time channels when widgets unmount

## Future Considerations

- Direct messaging between users
- Group chat rooms
- Emoji picker integration
- File/image sharing in chat
- Mention autocomplete (@username)
- Rich message formatting (markdown)
- Message reactions statistics
- Social analytics dashboard
