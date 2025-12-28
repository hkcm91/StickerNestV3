/**
 * StickerNest v2 - MySpace 2006 Theme Widgets
 * =============================================
 *
 * A comprehensive collection of social widgets styled exactly like MySpace circa 2006.
 * This collection recreates the complete MySpace user experience with authentic styling,
 * including the iconic blue color scheme, Verdana font, and classic UI patterns.
 *
 * ## Available Widgets (16 Total)
 *
 * ### Profile Sections
 * | Widget                  | Description                                    |
 * |-------------------------|------------------------------------------------|
 * | MySpaceProfileWidget    | Classic "About Me" profile box                 |
 * | MySpaceDetailsWidget    | General info (status, zodiac, etc.)            |
 * | MySpaceInterestsWidget  | Music, Movies, Books, Heroes                   |
 * | MySpaceContactWidget    | "Contacting [user]" action links               |
 * | MySpaceMoodWidget       | Current mood with emoticons                    |
 * | MySpacePhotosWidget     | "View My: Pics" photo gallery                  |
 *
 * ### Social Features
 * | Widget                      | Description                                |
 * |-----------------------------|-------------------------------------------|
 * | MySpaceTop8Widget           | Top 8 Friends grid                        |
 * | MySpaceCommentsWidget       | Comment wall                              |
 * | MySpaceNetworkWidget        | Extended network & friend suggestions     |
 * | MySpaceFriendRequestsWidget | Friend request notifications              |
 *
 * ### Content & Media
 * | Widget                  | Description                                    |
 * |-------------------------|------------------------------------------------|
 * | MySpaceMusicWidget      | Embedded music player                          |
 * | MySpaceBlogWidget       | Blog posts with "Currently Listening"          |
 * | MySpaceBulletinWidget   | Bulletin board posts                           |
 *
 * ### Navigation & Notifications
 * | Widget                  | Description                                    |
 * |-------------------------|------------------------------------------------|
 * | MySpaceNavWidget        | Classic navigation bar                         |
 * | MySpaceMailWidget       | Inbox/messages                                 |
 * | MySpaceEventsWidget     | Events and invitations                         |
 *
 * ## Design System
 *
 * All widgets use the authentic MySpace 2006 color palette:
 * - Navy Header: #003366
 * - Link Blue: #336699
 * - Orange Accent: #FF6633
 * - Background: #B4D0DC
 * - Content White: #FFFFFF
 * - Border Blue: #99CCFF
 *
 * @see SocialEventBridge - Events are routed through this
 * @see useSocialStore - For relationship state
 */

// Profile Widgets
export { MySpaceProfileWidget, MySpaceProfileWidgetManifest, MySpaceProfileWidgetHTML } from './MySpaceProfileWidget';
export { MySpaceDetailsWidget, MySpaceDetailsWidgetManifest, MySpaceDetailsWidgetHTML } from './MySpaceDetailsWidget';
export { MySpaceInterestsWidget, MySpaceInterestsWidgetManifest, MySpaceInterestsWidgetHTML } from './MySpaceInterestsWidget';
export { MySpaceContactWidget, MySpaceContactWidgetManifest, MySpaceContactWidgetHTML } from './MySpaceContactWidget';
export { MySpaceMoodWidget, MySpaceMoodWidgetManifest, MySpaceMoodWidgetHTML } from './MySpaceMoodWidget';
export { MySpacePhotosWidget, MySpacePhotosWidgetManifest, MySpacePhotosWidgetHTML } from './MySpacePhotosWidget';

// Social Widgets
export { MySpaceTop8Widget, MySpaceTop8WidgetManifest, MySpaceTop8WidgetHTML } from './MySpaceTop8Widget';
export { MySpaceCommentsWidget, MySpaceCommentsWidgetManifest, MySpaceCommentsWidgetHTML } from './MySpaceCommentsWidget';
export { MySpaceNetworkWidget, MySpaceNetworkWidgetManifest, MySpaceNetworkWidgetHTML } from './MySpaceNetworkWidget';
export { MySpaceFriendRequestsWidget, MySpaceFriendRequestsWidgetManifest, MySpaceFriendRequestsWidgetHTML } from './MySpaceFriendRequestsWidget';

// Content & Media Widgets
export { MySpaceMusicWidget, MySpaceMusicWidgetManifest, MySpaceMusicWidgetHTML } from './MySpaceMusicWidget';
export { MySpaceBlogWidget, MySpaceBlogWidgetManifest, MySpaceBlogWidgetHTML } from './MySpaceBlogWidget';
export { MySpaceBulletinWidget, MySpaceBulletinWidgetManifest, MySpaceBulletinWidgetHTML } from './MySpaceBulletinWidget';

// Navigation & Notifications Widgets
export { MySpaceNavWidget, MySpaceNavWidgetManifest, MySpaceNavWidgetHTML } from './MySpaceNavWidget';
export { MySpaceMailWidget, MySpaceMailWidgetManifest, MySpaceMailWidgetHTML } from './MySpaceMailWidget';
export { MySpaceEventsWidget, MySpaceEventsWidgetManifest, MySpaceEventsWidgetHTML } from './MySpaceEventsWidget';

// Re-import for record
import { MySpaceProfileWidget } from './MySpaceProfileWidget';
import { MySpaceDetailsWidget } from './MySpaceDetailsWidget';
import { MySpaceInterestsWidget } from './MySpaceInterestsWidget';
import { MySpaceContactWidget } from './MySpaceContactWidget';
import { MySpaceMoodWidget } from './MySpaceMoodWidget';
import { MySpacePhotosWidget } from './MySpacePhotosWidget';
import { MySpaceTop8Widget } from './MySpaceTop8Widget';
import { MySpaceCommentsWidget } from './MySpaceCommentsWidget';
import { MySpaceNetworkWidget } from './MySpaceNetworkWidget';
import { MySpaceFriendRequestsWidget } from './MySpaceFriendRequestsWidget';
import { MySpaceMusicWidget } from './MySpaceMusicWidget';
import { MySpaceBlogWidget } from './MySpaceBlogWidget';
import { MySpaceBulletinWidget } from './MySpaceBulletinWidget';
import { MySpaceNavWidget } from './MySpaceNavWidget';
import { MySpaceMailWidget } from './MySpaceMailWidget';
import { MySpaceEventsWidget } from './MySpaceEventsWidget';

import type { BuiltinWidget } from '../types';

/**
 * MySpace 2006 Theme Color Palette (for reference)
 */
export const MYSPACE_COLORS = {
  navyHeader: '#003366',
  linkBlue: '#336699',
  orangeAccent: '#FF6633',
  backgroundBlue: '#B4D0DC',
  contentWhite: '#FFFFFF',
  borderBlue: '#99CCFF',
  headerGradientStart: '#003366',
  headerGradientEnd: '#336699',
  textDark: '#333333',
  textLight: '#666666',
  yellowHighlight: '#FFFFCC',
  successGreen: '#00CC00',
  errorRed: '#CC0000',
} as const;

/**
 * All MySpace widgets as a record for easy registration
 */
export const MYSPACE_WIDGETS: Record<string, BuiltinWidget> = {
  // Profile & Identity
  'stickernest.myspace-profile': MySpaceProfileWidget,
  'stickernest.myspace-details': MySpaceDetailsWidget,
  'stickernest.myspace-interests': MySpaceInterestsWidget,
  'stickernest.myspace-contact': MySpaceContactWidget,
  'stickernest.myspace-mood': MySpaceMoodWidget,
  'stickernest.myspace-photos': MySpacePhotosWidget,
  // Social Connections
  'stickernest.myspace-top8': MySpaceTop8Widget,
  'stickernest.myspace-comments': MySpaceCommentsWidget,
  'stickernest.myspace-network': MySpaceNetworkWidget,
  'stickernest.myspace-friend-requests': MySpaceFriendRequestsWidget,
  // Content & Media
  'stickernest.myspace-music': MySpaceMusicWidget,
  'stickernest.myspace-blog': MySpaceBlogWidget,
  'stickernest.myspace-bulletin': MySpaceBulletinWidget,
  // Navigation & Notifications
  'stickernest.myspace-nav': MySpaceNavWidget,
  'stickernest.myspace-mail': MySpaceMailWidget,
  'stickernest.myspace-events': MySpaceEventsWidget,
};

/**
 * Get all MySpace widget manifests
 */
export function getMySpaceWidgetManifests() {
  return Object.values(MYSPACE_WIDGETS).map(w => w.manifest);
}

/**
 * Check if a widget ID is a MySpace widget
 */
export function isMySpaceWidget(id: string): boolean {
  return id in MYSPACE_WIDGETS;
}

/**
 * Get count of MySpace widgets
 */
export function getMySpaceWidgetCount(): number {
  return Object.keys(MYSPACE_WIDGETS).length;
}

// ==================
// Pipeline Preset
// ==================

export const MYSPACE_WIDGET_IDS = Object.keys(MYSPACE_WIDGETS);

/**
 * MySpace 2006 Social Layer Pipeline Preset
 *
 * This pipeline connects all MySpace widgets for a complete social experience:
 *
 * Navigation Flow:
 * Nav → Mail (open inbox)
 * Nav → Profile (view profile)
 * Nav → Events (view events)
 * Nav → Blog (view blog)
 *
 * Social Connections:
 * Top8 → Profile (view friend profile)
 * Top8 → Contact (contact friend)
 * Comments → Profile (view commenter)
 * FriendRequests → Top8 (approved friends added)
 * Network → FriendRequests (add suggested friend)
 * Mail → Profile (view sender)
 *
 * Profile Interactions:
 * Profile → Contact (trigger actions)
 * Contact → Mail (send message)
 * Contact → FriendRequests (add friend)
 *
 * Content Flow:
 * Blog → Comments (blog comments)
 * Photos → Comments (photo comments)
 * Music → Blog (currently listening)
 * Mood → Profile (mood display)
 */
export const MYSPACE_PIPELINE_PRESET = {
  id: 'myspace-2006-social-layer',
  name: 'MySpace 2006 Social Layer',
  description: 'Complete MySpace 2006 nostalgic social experience with profile, friends, comments, music, mail, and more',
  category: 'social',
  tags: ['myspace', 'retro', '2006', 'nostalgia', 'social'],
  widgets: MYSPACE_WIDGET_IDS,
  connections: [
    // ==================
    // Navigation Hub
    // ==================
    {
      from: { widgetId: 'stickernest.myspace-nav', port: 'nav.clicked' },
      to: { widgetId: 'stickernest.myspace-mail', port: 'folder.set' },
      condition: { section: 'mail' },
    },

    // ==================
    // Friend Interactions
    // ==================
    // Top8 friend clicks → Profile
    {
      from: { widgetId: 'stickernest.myspace-top8', port: 'friend.clicked' },
      to: { widgetId: 'stickernest.myspace-profile', port: 'data.set' },
    },
    // Top8 friend clicks → Contact widget
    {
      from: { widgetId: 'stickernest.myspace-top8', port: 'friend.clicked' },
      to: { widgetId: 'stickernest.myspace-contact', port: 'data.set' },
    },
    // Top8 friend clicks → Details
    {
      from: { widgetId: 'stickernest.myspace-top8', port: 'friend.clicked' },
      to: { widgetId: 'stickernest.myspace-details', port: 'data.set' },
    },
    // Top8 friend clicks → Interests
    {
      from: { widgetId: 'stickernest.myspace-top8', port: 'friend.clicked' },
      to: { widgetId: 'stickernest.myspace-interests', port: 'data.set' },
    },

    // ==================
    // Comments Flow
    // ==================
    // Comment user click → Profile
    {
      from: { widgetId: 'stickernest.myspace-comments', port: 'user.clicked' },
      to: { widgetId: 'stickernest.myspace-profile', port: 'data.set' },
    },
    // New comment → Profile activity
    {
      from: { widgetId: 'stickernest.myspace-comments', port: 'comment.added' },
      to: { widgetId: 'stickernest.myspace-blog', port: 'data.set' },
    },

    // ==================
    // Friend Requests
    // ==================
    // Approved friend → Top8 update
    {
      from: { widgetId: 'stickernest.myspace-friend-requests', port: 'request.approved' },
      to: { widgetId: 'stickernest.myspace-top8', port: 'friends.set' },
    },
    // Friend request user click → Profile
    {
      from: { widgetId: 'stickernest.myspace-friend-requests', port: 'user.clicked' },
      to: { widgetId: 'stickernest.myspace-profile', port: 'data.set' },
    },

    // ==================
    // Network Suggestions
    // ==================
    // Network add friend → Friend requests
    {
      from: { widgetId: 'stickernest.myspace-network', port: 'friend.add' },
      to: { widgetId: 'stickernest.myspace-friend-requests', port: 'requests.set' },
    },
    // Network user click → Profile
    {
      from: { widgetId: 'stickernest.myspace-network', port: 'user.clicked' },
      to: { widgetId: 'stickernest.myspace-profile', port: 'data.set' },
    },

    // ==================
    // Mail/Messages
    // ==================
    // Mail message click → view message
    {
      from: { widgetId: 'stickernest.myspace-mail', port: 'message.clicked' },
      to: { widgetId: 'stickernest.myspace-profile', port: 'data.set' },
    },
    // Compose from contact → Mail
    {
      from: { widgetId: 'stickernest.myspace-contact', port: 'message.send' },
      to: { widgetId: 'stickernest.myspace-mail', port: 'data.set' },
    },

    // ==================
    // Profile Actions
    // ==================
    // Profile add friend → Contact
    {
      from: { widgetId: 'stickernest.myspace-profile', port: 'friend.add' },
      to: { widgetId: 'stickernest.myspace-contact', port: 'data.set' },
    },

    // ==================
    // Content Integration
    // ==================
    // Mood update → Profile
    {
      from: { widgetId: 'stickernest.myspace-mood', port: 'mood.changed' },
      to: { widgetId: 'stickernest.myspace-profile', port: 'data.set' },
    },
    // Music track → Blog "currently listening"
    {
      from: { widgetId: 'stickernest.myspace-music', port: 'track.changed' },
      to: { widgetId: 'stickernest.myspace-blog', port: 'data.set' },
    },

    // ==================
    // Events
    // ==================
    // Event click → view details
    {
      from: { widgetId: 'stickernest.myspace-events', port: 'event.clicked' },
      to: { widgetId: 'stickernest.myspace-bulletin', port: 'data.set' },
    },
  ],
  suggestedLayout: {
    columns: 4,
    rows: 5,
    positions: [
      // Row 0: Navigation bar (spans full width)
      { widgetId: 'stickernest.myspace-nav', col: 0, row: 0, colSpan: 4 },

      // Row 1: Profile header row
      { widgetId: 'stickernest.myspace-profile', col: 0, row: 1, colSpan: 2 },
      { widgetId: 'stickernest.myspace-contact', col: 2, row: 1 },
      { widgetId: 'stickernest.myspace-mood', col: 3, row: 1 },

      // Row 2: Profile details
      { widgetId: 'stickernest.myspace-details', col: 0, row: 2 },
      { widgetId: 'stickernest.myspace-interests', col: 1, row: 2 },
      { widgetId: 'stickernest.myspace-photos', col: 2, row: 2 },
      { widgetId: 'stickernest.myspace-music', col: 3, row: 2 },

      // Row 3: Social features
      { widgetId: 'stickernest.myspace-top8', col: 0, row: 3, colSpan: 2 },
      { widgetId: 'stickernest.myspace-comments', col: 2, row: 3, colSpan: 2 },

      // Row 4: Notifications and content
      { widgetId: 'stickernest.myspace-friend-requests', col: 0, row: 4 },
      { widgetId: 'stickernest.myspace-mail', col: 1, row: 4 },
      { widgetId: 'stickernest.myspace-blog', col: 2, row: 4 },
      { widgetId: 'stickernest.myspace-bulletin', col: 3, row: 4 },

      // Additional widgets (can be placed separately)
      { widgetId: 'stickernest.myspace-network', col: 0, row: 5 },
      { widgetId: 'stickernest.myspace-events', col: 1, row: 5 },
    ],
  },
};

// ==================
// Utility Types
// ==================

export interface MySpacePipelineConnection {
  from: { widgetId: string; port: string };
  to: { widgetId: string; port: string };
  condition?: Record<string, string>;
}

export interface MySpacePipelinePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  widgets: string[];
  connections: MySpacePipelineConnection[];
  suggestedLayout?: {
    columns: number;
    rows: number;
    positions: Array<{
      widgetId: string;
      col: number;
      row: number;
      colSpan?: number;
      rowSpan?: number;
    }>;
  };
}

export default MYSPACE_WIDGETS;
