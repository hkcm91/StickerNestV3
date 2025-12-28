/**
 * StickerNest v2 - Built-in Widget Types
 *
 * Shared types for built-in widgets to avoid circular dependencies.
 */

import type { WidgetManifest } from '../../types/manifest';

/**
 * Built-in widget definition
 */
export interface BuiltinWidget {
  /** Widget manifest */
  manifest: WidgetManifest;
  /** Widget HTML content (inline) */
  html?: string;
  /** React component for the widget */
  component?: React.ComponentType;
}
