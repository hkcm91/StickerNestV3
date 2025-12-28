/**
 * StickerNest v2 - Manifest Types
 * Widget manifest structure for v2 widgets
 */

import type { WidgetKind, WidgetCapabilities } from './domain';
import type { WidgetCapabilityDeclaration } from './capabilities';
import type { SkinSlot } from './skin';

export interface WidgetManifest {
  id: string;
  name: string;
  version: string;
  kind: WidgetKind;
  entry: string;
  inputs: Record<string, WidgetInputSchema>;
  outputs: Record<string, WidgetOutputSchema>;
  capabilities: WidgetCapabilities;
  /** I/O capability declarations for AI wiring */
  io?: WidgetCapabilityDeclaration;
  assets?: string[];
  sandbox?: boolean;
  /** Widget description for AI context */
  description?: string;
  /** Tags for categorization and search */
  tags?: string[];
  /** Author information */
  author?: string;
  /** Skin configuration */
  skin?: WidgetSkinManifest;
  /** Event declarations for broadcast routing */
  events?: {
    /** Events this widget emits */
    emits?: string[];
    /** Events this widget listens for */
    listens?: string[];
  };
  /** Default size configuration */
  size?: WidgetSizeConfig;
}

/** Widget size configuration in manifest */
export interface WidgetSizeConfig {
  /** Default width in pixels */
  width?: number;
  /** Default height in pixels */
  height?: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Aspect ratio to maintain (e.g., 16/9, 1, 4/3) */
  aspectRatio?: number;
  /** Whether to allow free resizing or lock to aspect ratio */
  lockAspectRatio?: boolean;
  /** Scale mode: how content scales when widget is resized */
  scaleMode?: 'crop' | 'scale' | 'stretch' | 'contain';
}

/** Widget skin configuration in manifest */
export interface WidgetSkinManifest {
  /** Skin slots this widget exposes for customization */
  slots?: SkinSlot[];
  /** Default skin ID to apply (if different from global) */
  defaultSkin?: string;
  /** Whether widget supports theming */
  themeable?: boolean;
  /** CSS variables the widget uses */
  usesVariables?: string[];
}

export interface WidgetInputSchema {
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface WidgetOutputSchema {
  type: string;
  description?: string;
}

export interface WidgetBundle {
  manifest: WidgetManifest;
  files: WidgetBundleFile[];
}

export interface WidgetBundleFile {
  path: string;
  content: string;
  type: 'js' | 'tsx' | 'html' | 'css' | 'json' | 'asset';
}

export interface WidgetMetadata {
  widgetId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isOfficial: boolean;
  isAIGenerated: boolean;
  /** For AI-generated widgets: the inline HTML content */
  generatedHtml?: string;
}
