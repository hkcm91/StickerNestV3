/**
 * StickerNest v2 - Built-in Widget Library
 *
 * This module exports all first-party built-in widgets.
 * These widgets serve as the core primitives that all AI-generated widgets can build upon.
 */

import { BasicTextWidget } from './BasicTextWidget';
import { NotesWidget } from './NotesWidget';
import { ToDoListWidget } from './ToDoListWidget';
import { TimerWidget } from './TimerWidget';
import { ImageStickerWidget } from './ImageStickerWidget';
import { LottiePlayerWidget } from './LottiePlayerWidget';
import { ContainerWidget } from './ContainerWidget';
import { DataDisplayWidget } from './DataDisplayWidget';
import { ClockWidget } from './ClockWidget';
import { WeatherWidget } from './WeatherWidget';
import { QuoteWidget } from './QuoteWidget';
import { ProgressBarWidget } from './ProgressBarWidget';
import { BookmarkWidget } from './BookmarkWidget';
import { CounterWidget } from './CounterWidget';
import { TikTokPlaylistWidget } from './TikTokPlaylistWidget';
import { ProductCardWidget } from './ProductCardWidget';
import { LeadCaptureWidget } from './LeadCaptureWidget';
import { CustomerLoginWidget } from './CustomerLoginWidget';
import { CustomerGateWidget } from './CustomerGateWidget';

// Commerce Widgets (Pipeline-enabled storefront components)
import { ProductGalleryWidget } from './commerce/ProductGalleryWidget';
import { CheckoutFlowWidget } from './commerce/CheckoutFlowWidget';
import { CustomerDashboardWidget } from './commerce/CustomerDashboardWidget';
import { StorefrontLayoutWidget } from './commerce/StorefrontLayoutWidget';

// Social Widgets
import { CommentWidget } from './social/CommentWidget';
import { LiveFeedWidget } from './social/LiveFeedWidget';
import { UserCardWidget } from './social/UserCardWidget';
import { PresenceWidget } from './social/PresenceWidget';
import { NotificationWidget } from './social/NotificationWidget';
import { LiveChatWidget } from './social/LiveChatWidget';

// Cross-Canvas Tester Widgets
import { CrossCanvasBroadcasterWidget } from './CrossCanvasBroadcasterWidget';
import { CrossCanvasListenerWidget } from './CrossCanvasListenerWidget';
import { ColorSyncWidget } from './ColorSyncWidget';

// Debug & Testing Widgets
import { SignalTesterWidget } from './SignalTesterWidget';

// Design Tools
import { DesignToolbarWidget } from './DesignToolbarWidget';
import { ColorPickerWidget } from './ColorPickerWidget';
import { EffectsWidget } from './EffectsWidget';
import { TransformWidget } from './TransformWidget';
import { TypographyWidget } from './TypographyWidget';
import { TextToolWidget } from './TextToolWidget';

// V2 Enhanced Design Tools (Upgraded X5)
import { TextToolWidgetV2 } from './TextToolWidgetV2';
import { ShapeToolWidgetV2 } from './ShapeToolWidgetV2';
import { ImageToolWidgetV2 } from './ImageToolWidgetV2';
import { ColorPickerWidgetV2 } from './ColorPickerWidgetV2';
import { CanvasControlWidgetV2 } from './CanvasControlWidgetV2';

// Media/Display Widgets
import { RetroTVWidget } from './RetroTVWidget';

// Fun & Interactive Widgets
import { BubblesWidget } from './BubblesWidget';
import { BubbleHunterWidget } from './BubbleHunterWidget';
import { SpeechBubbleWidget } from './SpeechBubbleWidget';
import { AIBrainWidget } from './AIBrainWidget';
import { ShelfWidget } from './ShelfWidget';

// AI Self-Improvement Widgets
import { SelfImprovingDashboardWidget } from './SelfImprovingDashboardWidget';

// Stream Widgets
import { OBSControlWidget } from './OBSControlWidget';
import { StreamAlertWidget } from './StreamAlertWidget';
import { ViewerCountWidget } from './ViewerCountWidget';

// Media Widgets
import { WebcamWidget } from './WebcamWidget';
import { WebcamFrameWidget } from './WebcamFrameWidget';
import { JitsiMeetWidget } from './JitsiMeetWidget';

// Spatial/VR/AR Widgets
import { GreenScreenPlaneWidget } from './GreenScreenPlaneWidget';
import { PanoramicOverlayWidget } from './PanoramicOverlayWidget';
import { SpatialMediaControllerWidget } from './spatial/SpatialMediaControllerWidget';
import { EnvironmentControlWidget } from './spatial/EnvironmentControlWidget';

// Collaboration Widgets
import { ViewSwitcherWidget } from './ViewSwitcherWidget';
import { CollaboratorListWidget } from './CollaboratorListWidget';

// Sign-In Widgets (Customer Auth & Account Management)
import { SIGNIN_WIDGETS } from './signin';
import {
  CustomerSignInWidget,
  CustomerProfileWidget,
  CustomerSubscriptionWidget,
  CustomerAccountMenuWidget,
} from './signin';

// Automation Widgets (AI Pipeline Components)
import { AUTOMATION_WIDGETS, SYSTEM_WIDGETS } from './automation';
import {
  TemplateEngineWidget,
  AIImageGeneratorWidget,
  CompositorWidget,
  TemplateManagerWidget,
  AIConfiguratorWidget,
  PipelineControllerWidget,
} from './automation';

// Wizard Widgets (UI Flow Components)
import { WIZARD_WIDGETS } from './wizards';
import { BusinessCardGeneratorWidget } from './wizards';

// Halo's Widgets Pipeline (Personal Document Management)
import { HALO_WIDGETS, HALO_PIPELINE_PRESET } from './halo';
import {
  OCRScannerWidget,
  VoiceNotesWidget,
  DocumentEditorWidget,
  NoteHubWidget,
} from './halo';

// Grocery Management Pipeline
import { GROCERY_WIDGETS, GROCERY_PIPELINE_PRESET } from './grocery';
import {
  ShoppingListWidget,
  PantryWidget,
  ReceiptScannerWidget,
  PriceTrackerWidget,
  RecipeManagerWidget,
  AIMealSuggesterWidget,
  MealPlannerWidget,
} from './grocery';

// MySpace 2006 Theme Widgets (Nostalgic Social Layer - 16 widgets!)
import { MYSPACE_WIDGETS } from './myspace';
import {
  // Profile Widgets
  MySpaceProfileWidget,
  MySpaceDetailsWidget,
  MySpaceInterestsWidget,
  MySpaceContactWidget,
  MySpaceMoodWidget,
  MySpacePhotosWidget,
  // Social Widgets
  MySpaceTop8Widget,
  MySpaceCommentsWidget,
  MySpaceNetworkWidget,
  MySpaceFriendRequestsWidget,
  // Content & Media Widgets
  MySpaceMusicWidget,
  MySpaceBlogWidget,
  MySpaceBulletinWidget,
  // Navigation & Notifications Widgets
  MySpaceNavWidget,
  MySpaceMailWidget,
  MySpaceEventsWidget,
} from './myspace';

// Windows 98 Theme Widgets (Retro Desktop Experience - 6 widgets!)
import { WIN98_WIDGETS } from './win98';
import {
  Win98NotepadWidget,
  Win98ExplorerWidget,
  Win98DesktopWidget,
  Win98StartMenuWidget,
  Win98TaskbarWidget,
  Win98MediaPlayerWidget,
} from './win98';

// Advanced Widgets
import { FormFlowWidget } from '../FormFlow';
import formFlowManifest from '../FormFlow/formflow.manifest.json';
import { BusinessCardLayoutWidget } from '../BusinessCardLayout';
import layoutManifest from '../BusinessCardLayout/manifest.json';
import { ImageGenPipelineWidget } from '../ImageGenPipeline';
import imageGenManifest from '../ImageGenPipeline/manifest.json';
import { PreviewExportWidget } from '../PreviewExport';
import previewManifest from '../PreviewExport/manifest.json';
import { ModularToolbarWidget } from '../DashboardBuilder/widget';
import { EntityPanel3DWidget } from '../EntityPanel3D';
import entityPanel3DManifest from '../EntityPanel3D/manifest.json';

import type { WidgetManifest } from '../../types/manifest';

// Re-export BuiltinWidget type from shared types to avoid circular dependencies
export type { BuiltinWidget } from './types';
import type { BuiltinWidget } from './types';

/**
 * All built-in widgets (as record)
 */
export const BUILTIN_WIDGETS: Record<string, BuiltinWidget> = {
  // Core Display Widgets
  'stickernest.basic-text': BasicTextWidget,
  'stickernest.notes': NotesWidget,
  'stickernest.todo-list': ToDoListWidget,
  'stickernest.timer': TimerWidget,
  'stickernest.image-sticker': ImageStickerWidget,
  'stickernest.lottie-player': LottiePlayerWidget,
  'stickernest.container': ContainerWidget,
  'stickernest.data-display': DataDisplayWidget,

  // New Core Widgets
  'stickernest.clock': ClockWidget,
  'stickernest.weather': WeatherWidget,
  'stickernest.quote': QuoteWidget,
  'stickernest.progress-bar': ProgressBarWidget,
  'stickernest.bookmark': BookmarkWidget,
  'stickernest.counter': CounterWidget,
  'stickernest.tiktok-playlist': TikTokPlaylistWidget,

  // Commerce Widgets
  'stickernest.product-card': ProductCardWidget,
  'stickernest.lead-capture': LeadCaptureWidget,
  'stickernest.customer-login': CustomerLoginWidget,
  'stickernest.customer-gate': CustomerGateWidget,
  'stickernest.product-gallery': ProductGalleryWidget,
  'stickernest.checkout-flow': CheckoutFlowWidget,
  'stickernest.customer-dashboard': CustomerDashboardWidget,
  'stickernest.storefront-layout': StorefrontLayoutWidget,

  // Cross-Canvas Tester Widgets
  'stickernest.cross-canvas-broadcaster': CrossCanvasBroadcasterWidget,
  'stickernest.cross-canvas-listener': CrossCanvasListenerWidget,
  'stickernest.color-sync': ColorSyncWidget,

  // Debug & Testing Widgets
  'stickernest.signal-tester': SignalTesterWidget,

  // Social Widgets (Hidden Social Layer)
  'stickernest.comment-widget': CommentWidget,
  'stickernest.live-feed': LiveFeedWidget,
  'stickernest.user-card': UserCardWidget,
  'stickernest.presence': PresenceWidget,
  'stickernest.notification': NotificationWidget,
  'stickernest.live-chat': LiveChatWidget,

  // Design Tools
  'stickernest.design-toolbar': DesignToolbarWidget,
  'stickernest.color-picker': ColorPickerWidget,
  'stickernest.effects': EffectsWidget,
  'stickernest.transform': TransformWidget,
  'stickernest.typography': TypographyWidget,
  'stickernest.text-tool': TextToolWidget,

  // V2 Enhanced Design Tools (Upgraded X5)
  'stickernest.text-tool-v2': TextToolWidgetV2,
  'stickernest.shape-tool-v2': ShapeToolWidgetV2,
  'stickernest.image-tool-v2': ImageToolWidgetV2,
  'stickernest.color-picker-v2': ColorPickerWidgetV2,
  'stickernest.canvas-control-v2': CanvasControlWidgetV2,

  // Media/Display Widgets
  'stickernest.retro-tv': RetroTVWidget,

  // Fun & Interactive Widgets
  'stickernest.bubbles': BubblesWidget,
  'stickernest.bubble-hunter': BubbleHunterWidget,
  'stickernest.speech-bubble': SpeechBubbleWidget,
  'stickernest.ai-brain': AIBrainWidget,
  'stickernest.shelf': ShelfWidget,

  // AI Self-Improvement Widgets
  'stickernest.self-improving-dashboard': SelfImprovingDashboardWidget,

  // Stream Widgets
  'stickernest.obs-control': OBSControlWidget,
  'stickernest.stream-alert': StreamAlertWidget,
  'stickernest.viewer-count': ViewerCountWidget,

  // Media Widgets
  'stickernest.webcam': WebcamWidget,
  'stickernest.webcam-frame': WebcamFrameWidget,
  'stickernest.jitsi-meet': JitsiMeetWidget,

  // Spatial/VR/AR Widgets
  'stickernest.green-screen-plane': GreenScreenPlaneWidget,
  'stickernest.panoramic-overlay': PanoramicOverlayWidget,
  'stickernest.spatial-media-controller': SpatialMediaControllerWidget,
  'stickernest.environment-control': EnvironmentControlWidget,
  'stickernest.entity-panel-3d': {
    manifest: entityPanel3DManifest as unknown as WidgetManifest,
    component: EntityPanel3DWidget
  },

  // Collaboration Widgets
  'stickernest.view-switcher': ViewSwitcherWidget,
  'stickernest.collaborator-list': CollaboratorListWidget,

  // Advanced Widgets
  'stickernest.form-flow': {
    manifest: formFlowManifest as unknown as WidgetManifest,
    component: FormFlowWidget
  },
  'stickernest.business-card-layout': {
    manifest: layoutManifest as unknown as WidgetManifest,
    component: BusinessCardLayoutWidget
  },
  'stickernest.image-gen-pipeline': {
    manifest: imageGenManifest as unknown as WidgetManifest,
    component: ImageGenPipelineWidget
  },
  'stickernest.preview-export': {
    manifest: previewManifest as unknown as WidgetManifest,
    component: PreviewExportWidget
  },
  'stickernest.modular-toolbar': ModularToolbarWidget,

  // Automation Widgets (AI Pipeline Components)
  ...AUTOMATION_WIDGETS,

  // System Widgets (Pipeline Owner Control Panels)
  ...SYSTEM_WIDGETS,

  // Wizard Widgets (UI Flow Components)
  ...WIZARD_WIDGETS,

  // Sign-In Widgets (Customer Auth & Account Management)
  ...SIGNIN_WIDGETS,

  // Halo's Widgets Pipeline (Personal Document Management)
  ...HALO_WIDGETS,

  // Grocery Management Pipeline
  ...GROCERY_WIDGETS,

  // MySpace 2006 Theme Widgets (Nostalgic Social Layer)
  ...MYSPACE_WIDGETS,

  // Windows 98 Theme Widgets (Retro Desktop Experience)
  ...WIN98_WIDGETS,
};

/**
 * All built-in widgets (as array)
 */
export const builtinWidgets: BuiltinWidget[] = Object.values(BUILTIN_WIDGETS);

/**
 * Get a built-in widget by ID
 */
export function getBuiltinWidget(id: string): BuiltinWidget | undefined {
  return BUILTIN_WIDGETS[id];
}

/**
 * Get all built-in widget manifests
 */
export function getAllBuiltinManifests(): WidgetManifest[] {
  return Object.values(BUILTIN_WIDGETS).map(w => w.manifest);
}

/**
 * Check if a widget ID is a built-in widget
 */
export function isBuiltinWidget(id: string): boolean {
  return id in BUILTIN_WIDGETS;
}

// Re-export individual widgets
export {
  BasicTextWidget,
  NotesWidget,
  ToDoListWidget,
  TimerWidget,
  ImageStickerWidget,
  LottiePlayerWidget,
  ContainerWidget,
  DataDisplayWidget,
  ClockWidget,
  WeatherWidget,
  QuoteWidget,
  ProgressBarWidget,
  BookmarkWidget,
  CounterWidget,
  TikTokPlaylistWidget,
  // Commerce Widgets
  ProductCardWidget,
  LeadCaptureWidget,
  CustomerLoginWidget,
  CustomerGateWidget,
  ProductGalleryWidget,
  CheckoutFlowWidget,
  CustomerDashboardWidget,
  StorefrontLayoutWidget,
  // Cross-Canvas Tester Widgets
  CrossCanvasBroadcasterWidget,
  CrossCanvasListenerWidget,
  ColorSyncWidget,
  // Debug & Testing Widgets
  SignalTesterWidget,
  // Design Tools
  DesignToolbarWidget,
  ColorPickerWidget,
  EffectsWidget,
  TransformWidget,
  TypographyWidget,
  TextToolWidget,
  // V2 Enhanced Design Tools (Upgraded X5)
  TextToolWidgetV2,
  ShapeToolWidgetV2,
  ImageToolWidgetV2,
  ColorPickerWidgetV2,
  CanvasControlWidgetV2,
  // Media/Display Widgets
  RetroTVWidget,
  // Fun & Interactive Widgets
  BubblesWidget,
  BubbleHunterWidget,
  SpeechBubbleWidget,
  AIBrainWidget,
  ShelfWidget,
  // Advanced Widgets
  FormFlowWidget,
  BusinessCardLayoutWidget,
  ImageGenPipelineWidget,
  PreviewExportWidget,
  ModularToolbarWidget,
  // Social Widgets
  CommentWidget,
  LiveFeedWidget,
  UserCardWidget,
  PresenceWidget,
  NotificationWidget,
  LiveChatWidget,
  // Stream Widgets
  OBSControlWidget,
  StreamAlertWidget,
  ViewerCountWidget,
  // Media Widgets
  WebcamWidget,
  WebcamFrameWidget,
  JitsiMeetWidget,
  // Spatial/VR/AR Widgets
  GreenScreenPlaneWidget,
  PanoramicOverlayWidget,
  SpatialMediaControllerWidget,
  EntityPanel3DWidget,
  // Collaboration Widgets
  ViewSwitcherWidget,
  CollaboratorListWidget,
  // Automation Widgets
  TemplateEngineWidget,
  AIImageGeneratorWidget,
  CompositorWidget,
  // System Widgets (Pipeline Owner Control Panels)
  TemplateManagerWidget,
  AIConfiguratorWidget,
  PipelineControllerWidget,
  // Wizard Widgets
  BusinessCardGeneratorWidget,
  // Sign-In Widgets
  CustomerSignInWidget,
  CustomerProfileWidget,
  CustomerSubscriptionWidget,
  CustomerAccountMenuWidget,
  // Halo's Widgets Pipeline (Generic Document Management Widgets)
  OCRScannerWidget,
  VoiceNotesWidget,
  DocumentEditorWidget,
  NoteHubWidget,
  // Grocery Management Pipeline Widgets
  ShoppingListWidget,
  PantryWidget,
  ReceiptScannerWidget,
  PriceTrackerWidget,
  RecipeManagerWidget,
  AIMealSuggesterWidget,
  MealPlannerWidget,
  // MySpace 2006 Theme Widgets (16 total)
  MySpaceProfileWidget,
  MySpaceDetailsWidget,
  MySpaceInterestsWidget,
  MySpaceContactWidget,
  MySpaceMoodWidget,
  MySpacePhotosWidget,
  MySpaceTop8Widget,
  MySpaceCommentsWidget,
  MySpaceNetworkWidget,
  MySpaceFriendRequestsWidget,
  MySpaceMusicWidget,
  MySpaceBlogWidget,
  MySpaceBulletinWidget,
  MySpaceNavWidget,
  MySpaceMailWidget,
  MySpaceEventsWidget,
  // Windows 98 Theme Widgets (6 total)
  Win98NotepadWidget,
  Win98ExplorerWidget,
  Win98DesktopWidget,
  Win98StartMenuWidget,
  Win98TaskbarWidget,
  Win98MediaPlayerWidget,
};

// Re-export automation, wizard, signin, halo, grocery, myspace, win98, and spatial modules
export * from './automation';
export * from './wizards';
export * from './signin';
export * from './halo';
export * from './grocery';
export * from './myspace';
export * from './win98';
export * from './spatial';
