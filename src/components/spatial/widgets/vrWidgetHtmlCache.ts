/**
 * StickerNest - VR Widget HTML Cache
 *
 * Caches fetched HTML content for local widgets to prevent
 * re-fetching on every render in VR mode.
 */

// ============================================================================
// Cache Storage
// ============================================================================

const vrWidgetHtmlCache = new Map<string, string>();
const vrWidgetHtmlFetchStatus = new Map<string, 'pending' | 'success' | 'error'>();

// ============================================================================
// Cache Functions
// ============================================================================

/**
 * Get cached HTML or null if not available
 */
export function getCachedWidgetHtml(widgetDefId: string): string | null {
  return vrWidgetHtmlCache.get(widgetDefId) || null;
}

/**
 * Get fetch status for a widget
 */
export function getWidgetFetchStatus(widgetDefId: string): 'pending' | 'success' | 'error' | undefined {
  return vrWidgetHtmlFetchStatus.get(widgetDefId);
}

/**
 * Fetch and cache HTML for a local widget
 */
export async function fetchAndCacheWidgetHtml(
  widgetDefId: string,
  source: string | undefined
): Promise<string | null> {
  // Check if already fetching or cached
  const status = vrWidgetHtmlFetchStatus.get(widgetDefId);
  if (status === 'success') {
    return vrWidgetHtmlCache.get(widgetDefId) || null;
  }
  if (status === 'pending') {
    return null; // Still fetching
  }

  // Only fetch for local widgets
  if (source !== 'local') {
    console.log(`[VR Widget] Skipping fetch for non-local widget: ${widgetDefId} (source: ${source})`);
    return null;
  }

  vrWidgetHtmlFetchStatus.set(widgetDefId, 'pending');

  try {
    // First try to get the manifest to find the entry file
    const manifestResponse = await fetch(`/test-widgets/${widgetDefId}/manifest.json`);
    if (!manifestResponse.ok) {
      throw new Error(`Manifest not found for ${widgetDefId}`);
    }
    const manifest = await manifestResponse.json();
    const entry = manifest.entry || 'index.html';

    // Fetch the entry HTML
    const htmlResponse = await fetch(`/test-widgets/${widgetDefId}/${entry}`);
    if (!htmlResponse.ok) {
      throw new Error(`Entry file not found: ${entry}`);
    }
    const html = await htmlResponse.text();

    console.log(`[VR Widget] Fetched HTML for ${widgetDefId} (${html.length} chars)`);
    vrWidgetHtmlCache.set(widgetDefId, html);
    vrWidgetHtmlFetchStatus.set(widgetDefId, 'success');
    return html;
  } catch (error) {
    console.error(`[VR Widget] Failed to fetch HTML for ${widgetDefId}:`, error);
    vrWidgetHtmlFetchStatus.set(widgetDefId, 'error');
    return null;
  }
}

/**
 * Clear cache for a specific widget
 */
export function clearWidgetHtmlCache(widgetDefId: string): void {
  vrWidgetHtmlCache.delete(widgetDefId);
  vrWidgetHtmlFetchStatus.delete(widgetDefId);
}

/**
 * Clear all cached HTML
 */
export function clearAllWidgetHtmlCache(): void {
  vrWidgetHtmlCache.clear();
  vrWidgetHtmlFetchStatus.clear();
}
