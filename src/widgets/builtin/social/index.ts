/**
 * StickerNest v2 - Social Widgets
 * =================================
 *
 * This module exports all social widgets for the "hidden" social media layer.
 * These widgets provide social functionality that can be placed on any canvas
 * to preview social content through widget "windows".
 *
 * ## Available Widgets
 *
 * | Widget             | Description                               |
 * |--------------------|-------------------------------------------|
 * | CommentWidget      | Display/add comments on canvas or widgets |
 * | LiveFeedWidget     | Scrollable activity feed                  |
 * | UserCardWidget     | Compact user profile card                 |
 * | PresenceWidget     | Shows who's viewing/editing canvas        |
 * | NotificationWidget | Live notification stream                  |
 * | LiveChatWidget     | Real-time canvas chat                     |
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                       SOCIAL WIDGETS                                │
 * ├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
 * │  Comment    │  LiveFeed   │  UserCard   │  Presence   │  LiveChat   │
 * │  ─────────  │  ─────────  │  ─────────  │  ─────────  │  ─────────  │
 * │  • View/add │  • Global   │  • Profile  │  • Viewers  │  • Messages │
 * │  • Replies  │  • Friends  │  • Follow   │  • Cursors  │  • Typing   │
 * │  • Likes    │  • Canvas   │  • Status   │  • Status   │  • Reactions│
 * └──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┘
 *        │             │             │             │             │
 *        └─────────────┴──────┬──────┴─────────────┴─────────────┘
 *                             ▼
 *               ┌─────────────────────────────┐
 *               │     SocialEventBridge       │
 *               │   (social:* events)         │
 *               └─────────────────────────────┘
 *                             │
 *        ┌────────────────────┼────────────────────┐
 *        ▼                    ▼                    ▼
 *  NotificationWidget   PresenceWidget      LiveChatWidget
 *  (notification-new)   (presence-update)   (chat-message)
 * ```
 *
 * ## Usage
 *
 * These widgets are automatically registered in BUILTIN_WIDGETS.
 * They can be added to any canvas like other widgets.
 *
 * ## Pipeline Connections
 *
 * Social widgets are designed to connect via pipelines:
 *
 * - LiveFeed -> UserCard: Click activity to show user profile
 * - UserCard -> CommentWidget: View user's comments
 * - CommentWidget -> UserCard: Click commenter to view profile
 * - PresenceWidget -> UserCard: Click viewer to show profile
 * - LiveChatWidget -> UserCard: Click message author to show profile
 * - NotificationWidget -> UserCard: Click notification actor to show profile
 *
 * @see SocialEventBridge - For event routing
 * @see useSocialStore - For relationship state
 * @see useFeedStore - For activity feed state
 * @see ChatService - For real-time messaging
 */

// Core Social Widgets
export { CommentWidget, CommentWidgetManifest, CommentWidgetHTML } from './CommentWidget';
export { LiveFeedWidget, LiveFeedWidgetManifest, LiveFeedWidgetHTML } from './LiveFeedWidget';
export { UserCardWidget, UserCardWidgetManifest, UserCardWidgetHTML } from './UserCardWidget';

// Real-time Widgets
export { PresenceWidget, PresenceWidgetManifest, PresenceWidgetHTML } from './PresenceWidget';
export { NotificationWidget, NotificationWidgetManifest, NotificationWidgetHTML } from './NotificationWidget';
export { LiveChatWidget, LiveChatWidgetManifest, LiveChatWidgetHTML } from './LiveChatWidget';

// Re-export for convenience
import { CommentWidget } from './CommentWidget';
import { LiveFeedWidget } from './LiveFeedWidget';
import { UserCardWidget } from './UserCardWidget';
import { PresenceWidget } from './PresenceWidget';
import { NotificationWidget } from './NotificationWidget';
import { LiveChatWidget } from './LiveChatWidget';

import type { BuiltinWidget } from '../types';

/**
 * All social widgets as a record for easy registration
 */
export const SOCIAL_WIDGETS: Record<string, BuiltinWidget> = {
  // Core Social Widgets
  'stickernest.comment-widget': CommentWidget,
  'stickernest.live-feed': LiveFeedWidget,
  'stickernest.user-card': UserCardWidget,
  // Real-time Widgets
  'stickernest.presence': PresenceWidget,
  'stickernest.notification': NotificationWidget,
  'stickernest.live-chat': LiveChatWidget,
};

/**
 * Get all social widget manifests
 */
export function getSocialWidgetManifests() {
  return Object.values(SOCIAL_WIDGETS).map(w => w.manifest);
}

/**
 * Check if a widget ID is a social widget
 */
export function isSocialWidget(id: string): boolean {
  return id in SOCIAL_WIDGETS;
}

export default SOCIAL_WIDGETS;
