/**
 * Social Services
 * ===============
 *
 * Unified exports for all social/multiplayer services.
 *
 * Services:
 * - ProfileService: User profile CRUD operations
 * - SocialGraphService: Follow/unfollow, followers/following
 * - FeedService: Activity feed management
 * - NotificationService: Real-time notifications
 * - ChatService: Real-time canvas chat
 * - BroadcastService: Broadcast widget state to followers
 * - FriendSyncService: Multiplayer widget synchronization
 */

// Profile management
export { ProfileService } from './ProfileService';
export type {
  ProfileRow,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileWithStats,
  ProfileCallback,
} from './ProfileService';

// Follow system
export { SocialGraphService } from './SocialGraphService';

// Activity feed
export { FeedService } from './FeedService';
export type { Activity } from './FeedService';

// Notifications
export { NotificationService } from './NotificationService';
export type {
  NotificationRow,
  NotificationWithProfile,
  NotificationCallback,
} from './NotificationService';

// Chat
export { ChatService } from './ChatService';
export type {
  ChatMessageRow,
  ChatMessageWithProfile,
  TypingIndicator,
  MessageCallback,
  TypingCallback,
} from './ChatService';

// Broadcasting
export { BroadcastService } from './BroadcastService';
export type {
  BroadcastEventType,
  BroadcastPayload,
  WidgetStateBroadcast,
  WidgetSpawnBroadcast,
  WidgetDeleteBroadcast,
  CanvasActivityBroadcast,
  UserStatusBroadcast,
  CursorPositionBroadcast,
  Broadcast,
  BroadcastCallback,
  BroadcastOptions,
} from './BroadcastService';

// Friend Sync (Multiplayer)
export { FriendSyncService } from './FriendSyncService';
export type {
  SyncMode,
  SyncedWidget,
  FriendCursor,
  SyncSession,
  WidgetSyncCallback,
  CursorSyncCallback,
  SyncOptions,
} from './FriendSyncService';
