/**
 * StickerNest v2 - Windows 98 Theme Widgets
 * ==========================================
 *
 * A comprehensive collection of widgets styled exactly like Windows 98.
 * This collection recreates the classic Windows 98 desktop experience
 * with authentic styling, including the iconic 3D beveled borders,
 * silver backgrounds, and system fonts.
 *
 * ## Design System
 *
 * All widgets use the authentic Windows 98 color palette:
 * - Title Bar Active: #000080 → #1084d0 (gradient)
 * - Title Bar Inactive: #808080 → #a0a0a0 (gradient)
 * - Window Background: #c0c0c0 (silver)
 * - Button Face: #c0c0c0
 * - Button Highlight: #ffffff (top/left edge)
 * - Button Shadow: #808080 (bottom/right edge)
 * - Button Dark Shadow: #000000 (outer edge)
 * - Desktop: #008080 (teal)
 * - Selection: #000080 background, white text
 * - Font: "MS Sans Serif", Tahoma, Arial (8pt/11px)
 *
 * ## Available Widgets
 *
 * | Widget              | Description                              |
 * |---------------------|------------------------------------------|
 * | Win98NotepadWidget  | Classic Notepad text editor              |
 * | Win98ExplorerWidget | Windows Explorer file browser            |
 * | Win98DesktopWidget  | Desktop with icons                       |
 * | Win98StartMenuWidget| Start menu with programs                 |
 * | Win98TaskbarWidget  | Taskbar with Start button and tray       |
 * | Win98MediaPlayerWidget | Windows Media Player                  |
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { BuiltinWidget } from '../types';

// Widget imports
export { Win98NotepadWidget, Win98NotepadWidgetManifest, Win98NotepadWidgetHTML } from './Win98NotepadWidget';
export { Win98ExplorerWidget, Win98ExplorerWidgetManifest, Win98ExplorerWidgetHTML } from './Win98ExplorerWidget';
export { Win98DesktopWidget, Win98DesktopWidgetManifest, Win98DesktopWidgetHTML } from './Win98DesktopWidget';
export { Win98StartMenuWidget, Win98StartMenuWidgetManifest, Win98StartMenuWidgetHTML } from './Win98StartMenuWidget';
export { Win98TaskbarWidget, Win98TaskbarWidgetManifest, Win98TaskbarWidgetHTML } from './Win98TaskbarWidget';
export { Win98MediaPlayerWidget, Win98MediaPlayerWidgetManifest, Win98MediaPlayerWidgetHTML } from './Win98MediaPlayerWidget';

// Re-import for record
import { Win98NotepadWidget } from './Win98NotepadWidget';
import { Win98ExplorerWidget } from './Win98ExplorerWidget';
import { Win98DesktopWidget } from './Win98DesktopWidget';
import { Win98StartMenuWidget } from './Win98StartMenuWidget';
import { Win98TaskbarWidget } from './Win98TaskbarWidget';
import { Win98MediaPlayerWidget } from './Win98MediaPlayerWidget';

/**
 * Windows 98 Theme Color Palette
 */
export const WIN98_COLORS = {
  // Title bars
  titleBarActiveStart: '#000080',
  titleBarActiveEnd: '#1084d0',
  titleBarInactiveStart: '#808080',
  titleBarInactiveEnd: '#a0a0a0',
  titleBarText: '#ffffff',

  // Window chrome
  windowBackground: '#c0c0c0',
  windowBorder: '#c0c0c0',

  // 3D button effect
  buttonFace: '#c0c0c0',
  buttonHighlight: '#ffffff',
  buttonShadow: '#808080',
  buttonDarkShadow: '#000000',
  buttonLight: '#dfdfdf',

  // Desktop
  desktop: '#008080',

  // Text
  textPrimary: '#000000',
  textDisabled: '#808080',
  textSelected: '#ffffff',

  // Selection
  selectionBackground: '#000080',
  selectionText: '#ffffff',

  // Menu
  menuBackground: '#c0c0c0',
  menuText: '#000000',
  menuHighlight: '#000080',

  // Scrollbar
  scrollbarTrack: '#c0c0c0',
  scrollbarThumb: '#c0c0c0',

  // Other
  infoBackground: '#ffffe1', // Tooltip yellow
  infoBorder: '#000000',
  linkBlue: '#0000ff',
} as const;

/**
 * Windows 98 Font Stack
 */
export const WIN98_FONTS = {
  system: '"MS Sans Serif", "Tahoma", "Arial", sans-serif',
  monospace: '"Fixedsys", "Courier New", monospace',
  size: '11px',
  sizeSmall: '10px',
  sizeLarge: '12px',
} as const;

/**
 * Windows 98 CSS helper - generates the classic 3D border effect
 */
export const WIN98_BORDER_STYLES = {
  raised: `
    border: 2px solid;
    border-color: #ffffff #000000 #000000 #ffffff;
    box-shadow: inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080;
  `,
  sunken: `
    border: 2px solid;
    border-color: #808080 #ffffff #ffffff #808080;
    box-shadow: inset 1px 1px 0 #000000, inset -1px -1px 0 #dfdfdf;
  `,
  field: `
    border: 2px solid;
    border-color: #808080 #ffffff #ffffff #808080;
    box-shadow: inset 1px 1px 0 #000000;
  `,
  groove: `
    border: 2px solid;
    border-color: #808080 #ffffff #ffffff #808080;
  `,
} as const;

/**
 * All Windows 98 widgets as a record for easy registration
 */
export const WIN98_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.win98-notepad': Win98NotepadWidget,
  'stickernest.win98-explorer': Win98ExplorerWidget,
  'stickernest.win98-desktop': Win98DesktopWidget,
  'stickernest.win98-start-menu': Win98StartMenuWidget,
  'stickernest.win98-taskbar': Win98TaskbarWidget,
  'stickernest.win98-media-player': Win98MediaPlayerWidget,
};

export const WIN98_WIDGET_IDS = Object.keys(WIN98_WIDGETS);

/**
 * Get all Windows 98 widget manifests
 */
export function getWin98WidgetManifests() {
  return Object.values(WIN98_WIDGETS).map(w => w.manifest);
}

/**
 * Check if a widget ID is a Windows 98 widget
 */
export function isWin98Widget(id: string): boolean {
  return id in WIN98_WIDGETS;
}

/**
 * Get count of Windows 98 widgets
 */
export function getWin98WidgetCount(): number {
  return Object.keys(WIN98_WIDGETS).length;
}

/**
 * Windows 98 Desktop Pipeline Preset
 *
 * This pipeline connects all Windows 98 widgets for a complete desktop experience:
 *
 * Desktop Flow:
 * Desktop icon double-click → Opens corresponding application
 * Start Menu → Opens applications
 * Taskbar → Shows running applications
 *
 * File Operations:
 * Explorer → Notepad (open text files)
 * Explorer → Media Player (open media files)
 *
 * Window Management:
 * All windows → Taskbar (register in taskbar)
 * Taskbar → Windows (focus/minimize)
 */
export const WIN98_PIPELINE_PRESET = {
  id: 'windows-98-desktop',
  name: 'Windows 98 Desktop',
  description: 'Complete Windows 98 desktop experience with Start menu, taskbar, and classic applications',
  category: 'retro',
  tags: ['windows', 'retro', '98', 'nostalgia', 'desktop', 'os'],
  widgets: WIN98_WIDGET_IDS,
  connections: [
    // Desktop → App launching
    {
      from: { widgetId: 'stickernest.win98-desktop', port: 'app.launch' },
      to: { widgetId: 'stickernest.win98-notepad', port: 'window.open' },
      condition: { app: 'notepad' },
    },
    {
      from: { widgetId: 'stickernest.win98-desktop', port: 'app.launch' },
      to: { widgetId: 'stickernest.win98-explorer', port: 'window.open' },
      condition: { app: 'explorer' },
    },
    {
      from: { widgetId: 'stickernest.win98-desktop', port: 'app.launch' },
      to: { widgetId: 'stickernest.win98-media-player', port: 'window.open' },
      condition: { app: 'mediaplayer' },
    },

    // Start Menu → App launching
    {
      from: { widgetId: 'stickernest.win98-start-menu', port: 'program.clicked' },
      to: { widgetId: 'stickernest.win98-notepad', port: 'window.open' },
      condition: { program: 'notepad' },
    },
    {
      from: { widgetId: 'stickernest.win98-start-menu', port: 'program.clicked' },
      to: { widgetId: 'stickernest.win98-explorer', port: 'window.open' },
      condition: { program: 'explorer' },
    },
    {
      from: { widgetId: 'stickernest.win98-start-menu', port: 'program.clicked' },
      to: { widgetId: 'stickernest.win98-media-player', port: 'window.open' },
      condition: { program: 'mediaplayer' },
    },

    // Taskbar ↔ Window management
    {
      from: { widgetId: 'stickernest.win98-notepad', port: 'window.state' },
      to: { widgetId: 'stickernest.win98-taskbar', port: 'windows.update' },
    },
    {
      from: { widgetId: 'stickernest.win98-explorer', port: 'window.state' },
      to: { widgetId: 'stickernest.win98-taskbar', port: 'windows.update' },
    },
    {
      from: { widgetId: 'stickernest.win98-media-player', port: 'window.state' },
      to: { widgetId: 'stickernest.win98-taskbar', port: 'windows.update' },
    },
    {
      from: { widgetId: 'stickernest.win98-taskbar', port: 'window.focus' },
      to: { widgetId: 'stickernest.win98-notepad', port: 'window.activate' },
    },

    // Explorer → Open files in apps
    {
      from: { widgetId: 'stickernest.win98-explorer', port: 'file.open' },
      to: { widgetId: 'stickernest.win98-notepad', port: 'file.load' },
      condition: { ext: 'txt' },
    },
    {
      from: { widgetId: 'stickernest.win98-explorer', port: 'file.open' },
      to: { widgetId: 'stickernest.win98-media-player', port: 'media.load' },
      condition: { ext: 'mp3' },
    },

    // Start button → Start Menu
    {
      from: { widgetId: 'stickernest.win98-taskbar', port: 'start.clicked' },
      to: { widgetId: 'stickernest.win98-start-menu', port: 'menu.toggle' },
    },
  ],
  suggestedLayout: {
    columns: 4,
    rows: 3,
    positions: [
      // Desktop takes most of the screen
      { widgetId: 'stickernest.win98-desktop', col: 0, row: 0, colSpan: 4, rowSpan: 2 },
      // Taskbar at bottom
      { widgetId: 'stickernest.win98-taskbar', col: 0, row: 2, colSpan: 4 },
      // Start menu overlays
      { widgetId: 'stickernest.win98-start-menu', col: 0, row: 1 },
      // Application windows (floating)
      { widgetId: 'stickernest.win98-notepad', col: 1, row: 0 },
      { widgetId: 'stickernest.win98-explorer', col: 2, row: 0 },
      { widgetId: 'stickernest.win98-media-player', col: 1, row: 1 },
    ],
  },
};

export default WIN98_WIDGETS;
