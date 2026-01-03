/**
 * StickerNest - Spatial Widget Utilities
 *
 * Helper functions for rendering widgets in 3D space.
 */

import type { WidgetInstance } from '../../../types/domain';
import { getBuiltinWidget } from '../../../widgets/builtin';
import { getCachedWidgetHtml } from './vrWidgetHtmlCache';

// ============================================================================
// VR/AR Resolution Settings
// ============================================================================

/** Resolution multiplier for widget rendering in VR/AR modes */
export const VR_RESOLUTION_SCALE = 2.5;

/** Minimum resolution scale (for very large widgets) */
export const MIN_RESOLUTION_SCALE = 1.5;

/** Maximum widget dimension before reducing resolution scale */
export const MAX_WIDGET_DIMENSION_FOR_FULL_SCALE = 600;

/**
 * Calculate the appropriate resolution scale for a widget based on its size.
 */
export function getWidgetResolutionScale(width: number, height: number): number {
  const maxDimension = Math.max(width, height);

  if (maxDimension <= MAX_WIDGET_DIMENSION_FOR_FULL_SCALE) {
    return VR_RESOLUTION_SCALE;
  }

  const scaleFactor = MAX_WIDGET_DIMENSION_FOR_FULL_SCALE / maxDimension;
  return Math.max(MIN_RESOLUTION_SCALE, VR_RESOLUTION_SCALE * scaleFactor);
}

// ============================================================================
// Widget Type Detection
// ============================================================================

/**
 * Get an emoji icon for a widget type based on its definition ID
 */
export function getWidgetTypeEmoji(widgetDefId: string): string {
  const defLower = widgetDefId.toLowerCase();

  // Media widgets
  if (defLower.includes('image') || defLower.includes('photo')) return '🖼️';
  if (defLower.includes('video')) return '🎬';
  if (defLower.includes('audio') || defLower.includes('music')) return '🎵';
  if (defLower.includes('camera')) return '📷';

  // Social widgets
  if (defLower.includes('chat') || defLower.includes('message')) return '💬';
  if (defLower.includes('feed') || defLower.includes('post')) return '📰';
  if (defLower.includes('profile') || defLower.includes('user')) return '👤';
  if (defLower.includes('friend') || defLower.includes('social')) return '👥';
  if (defLower.includes('notification') || defLower.includes('alert')) return '🔔';

  // Commerce widgets
  if (defLower.includes('cart') || defLower.includes('shopping')) return '🛒';
  if (defLower.includes('product') || defLower.includes('store')) return '🏪';
  if (defLower.includes('payment') || defLower.includes('checkout')) return '💳';
  if (defLower.includes('grocery') || defLower.includes('food')) return '🥬';

  // Utility widgets
  if (defLower.includes('clock') || defLower.includes('time')) return '🕐';
  if (defLower.includes('weather')) return '🌤️';
  if (defLower.includes('calendar') || defLower.includes('date')) return '📅';
  if (defLower.includes('note') || defLower.includes('text')) return '📝';
  if (defLower.includes('list') || defLower.includes('todo')) return '📋';
  if (defLower.includes('chart') || defLower.includes('graph')) return '📊';
  if (defLower.includes('map') || defLower.includes('location')) return '🗺️';

  // Design widgets
  if (defLower.includes('color') || defLower.includes('palette')) return '🎨';
  if (defLower.includes('button')) return '🔘';
  if (defLower.includes('slider') || defLower.includes('range')) return '🎚️';
  if (defLower.includes('frame') || defLower.includes('container')) return '🖼️';

  return '📦';
}

/**
 * Format widget definition ID for display
 */
export function formatWidgetType(widgetDefId: string): string {
  let formatted = widgetDefId
    .replace(/^widgets[-_]/, '')
    .replace(/^widget[-_]/, '')
    .replace(/[-_]/g, ' ');

  formatted = formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return formatted;
}

/**
 * Check if a widget should be rendered as a 3D React component
 */
export function is3DReactWidget(widgetDefId: string): boolean {
  const builtin = getBuiltinWidget(widgetDefId);
  if (!builtin?.component) return false;

  const manifest = builtin.manifest;
  return manifest?.kind === '3d' || manifest?.capabilities?.supports3d === true;
}

/**
 * Check if a widget has a React component that can be rendered
 */
export function isReactWidget(widgetDefId: string): boolean {
  const builtin = getBuiltinWidget(widgetDefId);
  return !!builtin?.component;
}

/**
 * Check if a widget has HTML content that can be rendered
 */
export function hasHtmlContent(widget: WidgetInstance): boolean {
  const builtin = getBuiltinWidget(widget.widgetDefId);
  if (builtin?.html) return true;

  if (widget.metadata?.source === 'generated' && widget.metadata?.generatedContent?.html) {
    return true;
  }

  if (widget.metadata?.source === 'local') {
    const cached = getCachedWidgetHtml(widget.widgetDefId);
    if (cached) return true;
    return true; // Allow component to attempt fetching
  }

  return false;
}

/**
 * Get HTML content for a widget
 */
export function getWidgetHtml(widget: WidgetInstance): string | null {
  const builtin = getBuiltinWidget(widget.widgetDefId);
  if (builtin?.html) return builtin.html;

  if (widget.metadata?.source === 'generated' && widget.metadata?.generatedContent?.html) {
    return widget.metadata.generatedContent.html;
  }

  if (widget.metadata?.source === 'local') {
    return getCachedWidgetHtml(widget.widgetDefId);
  }

  return null;
}

/**
 * Check if a widget can be rendered in VR
 */
export function canRenderWidget(widget: WidgetInstance): boolean {
  return isReactWidget(widget.widgetDefId) || hasHtmlContent(widget);
}

/**
 * Create a minimal WidgetAPI for 3D React component widgets.
 */
export function createSpatial3DAPI(widget: WidgetInstance): any {
  return {
    widgetId: widget.id,
    widgetDefId: widget.widgetDefId,

    emitEvent: (event: any) => {
      console.log('[Spatial3DAPI] emitEvent:', event);
    },

    emitOutput: (port: string, data: any) => {
      console.log('[Spatial3DAPI] emitOutput:', port, data);
    },

    onEvent: (type: string, handler: any) => {
      return () => {};
    },

    onInput: (port: string, handler: any) => {
      return () => {};
    },

    getState: () => widget.state || {},

    setState: (patch: any) => {
      console.log('[Spatial3DAPI] setState:', patch);
    },

    getAssetUrl: (path: string) => path,

    log: (...args: any[]) => console.log(`[${widget.widgetDefId}]`, ...args),
    info: (...args: any[]) => console.info(`[${widget.widgetDefId}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${widget.widgetDefId}]`, ...args),
    error: (...args: any[]) => console.error(`[${widget.widgetDefId}]`, ...args),
    debugLog: (msg: string, data?: any) => console.debug(`[${widget.widgetDefId}]`, msg, data),

    onMount: (callback: (context: { state: any }) => void) => {
      callback({ state: widget.state || {} });
    },
  };
}
