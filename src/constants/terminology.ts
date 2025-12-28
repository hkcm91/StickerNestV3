/**
 * StickerNest Terminology Constants
 *
 * This file defines the official terminology used throughout StickerNest.
 * Import these constants when building UI text, error messages, and documentation.
 *
 * @see /Docs/LANGUAGE-LIBRARY.md for full terminology guidelines
 */

// =============================================================================
// Entity Names
// =============================================================================

export const ENTITY_NAMES = {
  // Primary entities
  CANVAS: 'Canvas',
  CANVAS_PLURAL: 'Canvases',
  WIDGET: 'Widget',
  WIDGET_PLURAL: 'Widgets',
  STICKER: 'Sticker',
  STICKER_PLURAL: 'Stickers',
  PIPELINE: 'Pipeline',
  PIPELINE_PLURAL: 'Pipelines',

  // User entities
  USER: 'User',
  CREATOR: 'Creator',
  VIEWER: 'Viewer',

  // Marketplace entities (UI terms)
  WIDGET_LISTING: 'Widget Listing',
  WIDGET_LISTING_PLURAL: 'Widget Listings',
  WIDGET_BUNDLE: 'Widget Bundle',
  WIDGET_BUNDLE_PLURAL: 'Widget Bundles',
} as const;

// =============================================================================
// Feature Names
// =============================================================================

export const FEATURE_NAMES = {
  HOME_DASHBOARD: 'Dashboard',
  CANVAS_EDITOR: 'Canvas Editor',
  MARKETPLACE: 'Marketplace',
  WIDGET_LIBRARY: 'Widget Library',
  STICKER_LIBRARY: 'Sticker Library',
  CREATOR_STUDIO: 'Creator Studio',
  CREATOR_ANALYTICS: 'Creator Analytics',
  TEMPLATE_LIBRARY: 'Template Library',
} as const;

// =============================================================================
// Canvas Modes
// =============================================================================

/**
 * Primary canvas interaction modes
 * Used throughout the editor for mode switching
 */
export const CANVAS_MODES = {
  VIEW: 'view',
  EDIT: 'edit',
  CONNECT: 'connect',
} as const;

export type CanvasModeValue = typeof CANVAS_MODES[keyof typeof CANVAS_MODES];

/**
 * Canvas mode display labels for UI
 */
export const CANVAS_MODE_LABELS = {
  [CANVAS_MODES.VIEW]: 'View',
  [CANVAS_MODES.EDIT]: 'Edit',
  [CANVAS_MODES.CONNECT]: 'Connect',
} as const;

/**
 * Canvas mode descriptions for tooltips/help text
 */
export const CANVAS_MODE_DESCRIPTIONS = {
  [CANVAS_MODES.VIEW]: 'Interact with widgets in read-only mode',
  [CANVAS_MODES.EDIT]: 'Drag, resize, and arrange widgets',
  [CANVAS_MODES.CONNECT]: 'Create data pipelines between widgets',
} as const;

// =============================================================================
// Canvas Visibility
// =============================================================================

export const CANVAS_VISIBILITY = {
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
  PUBLIC: 'public',
} as const;

export const CANVAS_VISIBILITY_LABELS = {
  [CANVAS_VISIBILITY.PRIVATE]: 'Private',
  [CANVAS_VISIBILITY.UNLISTED]: 'Unlisted',
  [CANVAS_VISIBILITY.PUBLIC]: 'Public',
} as const;

export const CANVAS_VISIBILITY_DESCRIPTIONS = {
  [CANVAS_VISIBILITY.PRIVATE]: 'Only visible to you',
  [CANVAS_VISIBILITY.UNLISTED]: 'Accessible via direct link only',
  [CANVAS_VISIBILITY.PUBLIC]: 'Discoverable and shareable',
} as const;

// =============================================================================
// Widget Source Types
// =============================================================================

export const WIDGET_SOURCES = {
  OFFICIAL: 'official',
  COMMUNITY: 'community',
  LOCAL: 'local',
  GENERATED: 'generated',
} as const;

export type WidgetSourceValue = typeof WIDGET_SOURCES[keyof typeof WIDGET_SOURCES];

export const WIDGET_SOURCE_LABELS = {
  [WIDGET_SOURCES.OFFICIAL]: 'Official',
  [WIDGET_SOURCES.COMMUNITY]: 'Community',
  [WIDGET_SOURCES.LOCAL]: 'Local',
  [WIDGET_SOURCES.GENERATED]: 'AI Generated',
} as const;

// =============================================================================
// Widget Categories
// =============================================================================

export const WIDGET_CATEGORIES = {
  ELEMENT: 'element',
  AI: 'ai',
  DESIGN: 'design',
  CANVAS: 'canvas',
  ECOSYSTEM: 'ecosystem',
  ORGANIZATION: 'organization',
  GALLERY: 'gallery',
  PIPELINE: 'pipeline',
  UTILITY: 'utility',
  EDITOR: 'editor',
  VECTOR: 'vector',
  DEBUG: 'debug',
  TEST: 'test',
} as const;

export const WIDGET_CATEGORY_LABELS = {
  [WIDGET_CATEGORIES.ELEMENT]: 'Canvas Elements',
  [WIDGET_CATEGORIES.AI]: 'AI Tools',
  [WIDGET_CATEGORIES.DESIGN]: 'Design Editors',
  [WIDGET_CATEGORIES.CANVAS]: 'Canvas Control',
  [WIDGET_CATEGORIES.ECOSYSTEM]: 'Project Ecosystem',
  [WIDGET_CATEGORIES.ORGANIZATION]: 'Organization',
  [WIDGET_CATEGORIES.GALLERY]: 'Gallery & Photos',
  [WIDGET_CATEGORIES.PIPELINE]: 'Pipeline Widgets',
  [WIDGET_CATEGORIES.UTILITY]: 'Utility',
  [WIDGET_CATEGORIES.EDITOR]: 'Editor Widgets',
  [WIDGET_CATEGORIES.VECTOR]: 'Vector Graphics',
  [WIDGET_CATEGORIES.DEBUG]: 'Debug Tools',
  [WIDGET_CATEGORIES.TEST]: 'Test Widgets',
} as const;

// =============================================================================
// Publishing Status
// =============================================================================

export const PUBLISHING_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  UNLISTED: 'unlisted',
} as const;

export const PUBLISHING_STATUS_LABELS = {
  [PUBLISHING_STATUS.DRAFT]: 'Draft',
  [PUBLISHING_STATUS.PENDING]: 'Pending Review',
  [PUBLISHING_STATUS.PUBLISHED]: 'Published',
  [PUBLISHING_STATUS.REJECTED]: 'Rejected',
  [PUBLISHING_STATUS.UNLISTED]: 'Unlisted',
} as const;

// =============================================================================
// Action Labels (UI Buttons/Links)
// =============================================================================

export const ACTION_LABELS = {
  // Canvas actions
  NEW_CANVAS: 'New Canvas',
  SAVE: 'Save',
  SHARE: 'Share',
  DELETE: 'Delete',
  DUPLICATE: 'Duplicate',

  // Widget actions
  ADD_WIDGET: 'Add Widget',
  REMOVE_WIDGET: 'Remove',
  CONFIGURE: 'Configure',

  // Marketplace actions
  PUBLISH: 'Publish',
  UNPUBLISH: 'Unpublish',
  DOWNLOAD: 'Download',
  INSTALL: 'Install',

  // Navigation
  BACK: 'Back',
  CANCEL: 'Cancel',
  CONTINUE: 'Continue',
  DONE: 'Done',
} as const;

// =============================================================================
// Status Messages
// =============================================================================

export const STATUS_MESSAGES = {
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  SAVED: 'Saved',
  PUBLISHING: 'Publishing...',
  PUBLISHED: 'Published successfully',

  // Empty states
  NO_CANVASES: 'No canvases yet',
  NO_WIDGETS: 'No widgets yet',
  NO_RESULTS: 'No results found',

  // Error patterns
  FAILED_TO_LOAD: 'Failed to load. Please try again.',
  FAILED_TO_SAVE: 'Failed to save. Please try again.',
  FAILED_TO_PUBLISH: 'Failed to publish. Please try again.',
} as const;

// =============================================================================
// Event Namespaces
// =============================================================================

export const EVENT_NAMESPACES = {
  CANVAS: 'canvas',
  WIDGET: 'widget',
  PIPELINE: 'pipeline',
  SYSTEM: 'system',
  DEV_MODE: 'devMode',
} as const;

/**
 * Build an event name with proper namespace
 * @example buildEventName('canvas', 'modeChanged') => 'canvas:modeChanged'
 */
export function buildEventName(
  namespace: keyof typeof EVENT_NAMESPACES,
  event: string
): string {
  return `${EVENT_NAMESPACES[namespace]}:${event}`;
}

// =============================================================================
// Type Exports
// =============================================================================

export type EntityName = typeof ENTITY_NAMES[keyof typeof ENTITY_NAMES];
export type FeatureName = typeof FEATURE_NAMES[keyof typeof FEATURE_NAMES];
export type CanvasVisibility = typeof CANVAS_VISIBILITY[keyof typeof CANVAS_VISIBILITY];
export type WidgetCategory = typeof WIDGET_CATEGORIES[keyof typeof WIDGET_CATEGORIES];
export type PublishingStatus = typeof PUBLISHING_STATUS[keyof typeof PUBLISHING_STATUS];
