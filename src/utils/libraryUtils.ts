/**
 * StickerNest v2 - Library Utilities
 * Sorting, filtering, and search utilities for Widget Library
 */

import type { WidgetManifest } from '../types/manifest';
import type { LibraryWidget, WidgetCategory } from '../runtime/WidgetLibrary';
import type {
  SortMode,
  WidgetFilter,
  StickerFilter,
  PipelineGroup,
  WidgetUsageRecord,
  StickerLibraryItem,
} from '../state/useLibraryStore';

// ==================
// Types
// ==================

export interface WidgetListItem {
  id: string;
  manifest: WidgetManifest;
  source: 'builtin' | 'local' | 'official' | 'user' | 'generated' | 'test';
  category: WidgetCategory | string;
  pipelineGroup?: PipelineGroup;
  qualityScore?: number;
  useCount?: number;
  lastUsedAt?: number;
  createdAt?: number;
  updatedAt?: number;
  isAI?: boolean;
  tags?: string[];
}

// ==================
// Widget Category Mapping
// ==================

const CATEGORY_TO_FILTER: Record<string, WidgetFilter[]> = {
  'vector-tools': ['canvas-tools', 'vector-tools'],
  'data-display': ['utility', 'data-display'],
  'controls': ['controls'],
  'timers': ['timers'],
  'data-transform': ['utility'],
  'layout': ['layout'],
  'communication': ['communication'],
  'utility': ['utility'],
  'custom': ['custom'],
};

const TAG_TO_FILTER: Record<string, WidgetFilter> = {
  'ai': 'ai',
  'ai-generated': 'ai',
  'generated': 'ai',
  'media': 'media',
  'video': 'media',
  'audio': 'media',
  'image': 'media',
  'pipeline': 'pipeline',
  'canvas': 'canvas-tools',
  'vector': 'vector-tools',
  'shape': 'vector-tools',
  'timer': 'timers',
  'button': 'controls',
  'input': 'controls',
  'slider': 'controls',
};

const PIPELINE_GROUP_TAGS: Record<PipelineGroup, string[]> = {
  'ai-tools': ['ai', 'ai-generated', 'ml', 'generation', 'prompt'],
  'canvas-tools': ['canvas', 'vector', 'shape', 'drawing', 'paint'],
  'asset-tools': ['asset', 'library', 'sticker', 'image', 'upload'],
  'media-tools': ['media', 'video', 'audio', 'player', 'recorder'],
  'custom': [],
};

// ==================
// Search Functions
// ==================

/**
 * Fuzzy search implementation using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score (0-1, higher is better)
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (t === q) return 1;

  // Starts with (high priority)
  if (t.startsWith(q)) return 0.9;

  // Contains (medium priority)
  if (t.includes(q)) return 0.7;

  // Fuzzy match with Levenshtein
  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const similarity = 1 - distance / maxLen;

  return similarity > 0.4 ? similarity * 0.5 : 0;
}

/**
 * Search widgets with fuzzy matching
 */
export function searchWidgets(
  widgets: WidgetListItem[],
  query: string
): WidgetListItem[] {
  if (!query.trim()) return widgets;

  const normalizedQuery = query.toLowerCase().trim();

  const scored = widgets
    .map((widget) => {
      const nameScore = fuzzyScore(normalizedQuery, widget.manifest.name);
      const descScore = fuzzyScore(normalizedQuery, widget.manifest.description || '');
      const idScore = fuzzyScore(normalizedQuery, widget.id);
      const tagScore = (widget.manifest.tags || []).reduce(
        (max, tag) => Math.max(max, fuzzyScore(normalizedQuery, tag)),
        0
      );

      // Weighted score: name > tags > description > id
      const totalScore =
        nameScore * 0.4 + tagScore * 0.3 + descScore * 0.2 + idScore * 0.1;

      return { widget, score: totalScore };
    })
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.widget);
}

/**
 * Search stickers with fuzzy matching
 */
export function searchStickers(
  stickers: StickerLibraryItem[],
  query: string
): StickerLibraryItem[] {
  if (!query.trim()) return stickers;

  const normalizedQuery = query.toLowerCase().trim();

  const scored = stickers
    .map((sticker) => {
      const nameScore = fuzzyScore(normalizedQuery, sticker.name);
      const packScore = fuzzyScore(normalizedQuery, sticker.pack || '');
      const categoryScore = fuzzyScore(normalizedQuery, sticker.category || '');
      const tagScore = (sticker.tags || []).reduce(
        (max, tag) => Math.max(max, fuzzyScore(normalizedQuery, tag)),
        0
      );

      const totalScore =
        nameScore * 0.4 + tagScore * 0.3 + packScore * 0.2 + categoryScore * 0.1;

      return { sticker, score: totalScore };
    })
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.sticker);
}

// ==================
// Sorting Functions
// ==================

/**
 * Sort widgets by specified mode
 */
export function sortWidgets(
  widgets: WidgetListItem[],
  mode: SortMode,
  usageMap?: Map<string, WidgetUsageRecord>
): WidgetListItem[] {
  const sorted = [...widgets];

  switch (mode) {
    case 'newest':
      return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    case 'oldest':
      return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    case 'alpha-asc':
      return sorted.sort((a, b) =>
        a.manifest.name.localeCompare(b.manifest.name)
      );

    case 'alpha-desc':
      return sorted.sort((a, b) =>
        b.manifest.name.localeCompare(a.manifest.name)
      );

    case 'most-used':
      return sorted.sort((a, b) => {
        const aUsage = usageMap?.get(a.id)?.useCount || 0;
        const bUsage = usageMap?.get(b.id)?.useCount || 0;
        return bUsage - aUsage;
      });

    case 'least-used':
      return sorted.sort((a, b) => {
        const aUsage = usageMap?.get(a.id)?.useCount || 0;
        const bUsage = usageMap?.get(b.id)?.useCount || 0;
        return aUsage - bUsage;
      });

    case 'by-type':
      return sorted.sort((a, b) =>
        (a.manifest.kind || '').localeCompare(b.manifest.kind || '')
      );

    case 'by-pipeline':
      return sorted.sort((a, b) =>
        (a.pipelineGroup || 'custom').localeCompare(b.pipelineGroup || 'custom')
      );

    case 'recently-updated':
      return sorted.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    default:
      return sorted;
  }
}

/**
 * Sort stickers by specified mode
 */
export function sortStickers(
  stickers: StickerLibraryItem[],
  mode: SortMode
): StickerLibraryItem[] {
  const sorted = [...stickers];

  switch (mode) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);

    case 'oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);

    case 'alpha-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'alpha-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));

    case 'by-type':
      return sorted.sort((a, b) => a.type.localeCompare(b.type));

    default:
      return sorted;
  }
}

// ==================
// Filtering Functions
// ==================

/**
 * Detect pipeline group from widget tags/manifest
 */
export function detectPipelineGroup(widget: WidgetListItem): PipelineGroup {
  const tags = [
    ...(widget.manifest.tags || []),
    widget.manifest.name.toLowerCase(),
    widget.manifest.description?.toLowerCase() || '',
  ].join(' ');

  for (const [group, groupTags] of Object.entries(PIPELINE_GROUP_TAGS)) {
    if (groupTags.some((tag) => tags.includes(tag))) {
      return group as PipelineGroup;
    }
  }

  return 'custom';
}

/**
 * Check if widget matches source filter
 */
function matchesSourceFilter(widget: WidgetListItem, filter: WidgetFilter): boolean {
  switch (filter) {
    case 'builtin':
      return widget.source === 'builtin';
    case 'custom':
      return widget.source === 'user' || widget.source === 'generated';
    case 'ai':
      return widget.isAI === true || widget.source === 'generated';
    default:
      return true;
  }
}

/**
 * Check if widget matches category filter
 */
function matchesCategoryFilter(widget: WidgetListItem, filter: WidgetFilter): boolean {
  const category = widget.category;
  const categoryFilters = CATEGORY_TO_FILTER[category] || [];
  if (categoryFilters.includes(filter)) return true;

  // Check tags
  const tags = widget.manifest.tags || [];
  for (const tag of tags) {
    const tagFilter = TAG_TO_FILTER[tag.toLowerCase()];
    if (tagFilter === filter) return true;
  }

  return false;
}

/**
 * Filter widgets by multiple filters (AND logic)
 */
export function filterWidgets(
  widgets: WidgetListItem[],
  filters: WidgetFilter[],
  pipelineGroup?: PipelineGroup | null,
  customTags?: string[]
): WidgetListItem[] {
  if (filters.includes('all') && !pipelineGroup && (!customTags || customTags.length === 0)) {
    return widgets;
  }

  return widgets.filter((widget) => {
    // Check custom tag filters
    if (customTags && customTags.length > 0) {
      const widgetTags = (widget.manifest.tags || []).map((t) => t.toLowerCase());
      const hasCustomTag = customTags.some((tag) =>
        widgetTags.includes(tag.toLowerCase())
      );
      if (!hasCustomTag) return false;
    }

    // Check pipeline group filter
    if (pipelineGroup) {
      const widgetGroup = detectPipelineGroup(widget);
      if (widgetGroup !== pipelineGroup) return false;
    }

    // Check filter matches (excluding 'all')
    const activeFilters = filters.filter((f) => f !== 'all');
    if (activeFilters.length === 0) return true;

    // Widget must match at least one filter (OR within category)
    return activeFilters.some((filter) => {
      // Exclude container from library view (it's now a tool)
      if (widget.id === 'stickernest.container') return false;
      return matchesSourceFilter(widget, filter) || matchesCategoryFilter(widget, filter);
    });
  });
}

/**
 * Filter stickers by multiple filters (AND logic)
 */
export function filterStickers(
  stickers: StickerLibraryItem[],
  filters: StickerFilter[],
  customTags?: string[]
): StickerLibraryItem[] {
  if (filters.includes('all') && (!customTags || customTags.length === 0)) {
    return stickers;
  }

  return stickers.filter((sticker) => {
    // Check custom tag filters
    if (customTags && customTags.length > 0) {
      const stickerTags = (sticker.tags || []).map((t) => t.toLowerCase());
      const hasCustomTag = customTags.some((tag) =>
        stickerTags.includes(tag.toLowerCase())
      );
      if (!hasCustomTag) return false;
    }

    // Check filter matches
    const activeFilters = filters.filter((f) => f !== 'all');
    if (activeFilters.length === 0) return true;

    return activeFilters.some((filter) => {
      switch (filter) {
        case 'static':
          return !sticker.isAnimated;
        case 'animated':
          return sticker.isAnimated;
        case 'png':
          return sticker.type === 'png';
        case 'lottie':
          return sticker.type === 'lottie';
        case 'packs':
          return !!sticker.pack;
        case 'favorites':
          return sticker.isFavorite;
        default:
          return true;
      }
    });
  });
}

// ==================
// Grouping Functions
// ==================

/**
 * Group widgets by category
 */
export function groupWidgetsByCategory(
  widgets: WidgetListItem[]
): Record<string, WidgetListItem[]> {
  const groups: Record<string, WidgetListItem[]> = {};

  for (const widget of widgets) {
    const category = widget.category || 'custom';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(widget);
  }

  return groups;
}

/**
 * Group widgets by pipeline group
 */
export function groupWidgetsByPipeline(
  widgets: WidgetListItem[]
): Record<PipelineGroup, WidgetListItem[]> {
  const groups: Record<PipelineGroup, WidgetListItem[]> = {
    'ai-tools': [],
    'canvas-tools': [],
    'asset-tools': [],
    'media-tools': [],
    'custom': [],
  };

  for (const widget of widgets) {
    const group = detectPipelineGroup(widget);
    groups[group].push(widget);
  }

  return groups;
}

/**
 * Group stickers by category
 */
export function groupStickersByCategory(
  stickers: StickerLibraryItem[]
): Record<string, StickerLibraryItem[]> {
  const groups: Record<string, StickerLibraryItem[]> = {};

  for (const sticker of stickers) {
    const category = sticker.category || 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(sticker);
  }

  return groups;
}

/**
 * Group stickers by pack
 */
export function groupStickersByPack(
  stickers: StickerLibraryItem[]
): Record<string, StickerLibraryItem[]> {
  const groups: Record<string, StickerLibraryItem[]> = {};

  for (const sticker of stickers) {
    const pack = sticker.pack || 'No Pack';
    if (!groups[pack]) {
      groups[pack] = [];
    }
    groups[pack].push(sticker);
  }

  return groups;
}

// ==================
// Combined Pipeline
// ==================

/**
 * Full processing pipeline for widgets
 */
export function processWidgets(
  widgets: WidgetListItem[],
  options: {
    searchQuery?: string;
    sortMode: SortMode;
    filters: WidgetFilter[];
    pipelineGroup?: PipelineGroup | null;
    customTags?: string[];
    usageMap?: Map<string, WidgetUsageRecord>;
  }
): WidgetListItem[] {
  let result = widgets;

  // Filter first
  result = filterWidgets(result, options.filters, options.pipelineGroup, options.customTags);

  // Then search
  if (options.searchQuery) {
    result = searchWidgets(result, options.searchQuery);
  } else {
    // Sort only if not searching (search returns sorted by relevance)
    result = sortWidgets(result, options.sortMode, options.usageMap);
  }

  return result;
}

/**
 * Full processing pipeline for stickers
 */
export function processStickers(
  stickers: StickerLibraryItem[],
  options: {
    searchQuery?: string;
    sortMode: SortMode;
    filters: StickerFilter[];
    customTags?: string[];
  }
): StickerLibraryItem[] {
  let result = stickers;

  // Filter first
  result = filterStickers(result, options.filters, options.customTags);

  // Then search
  if (options.searchQuery) {
    result = searchStickers(result, options.searchQuery);
  } else {
    // Sort only if not searching
    result = sortStickers(result, options.sortMode);
  }

  return result;
}

// ==================
// Helper Functions
// ==================

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    'vector-tools': 'Vector Tools',
    'data-display': 'Data Display',
    'controls': 'Controls',
    'timers': 'Timers',
    'data-transform': 'Data Transform',
    'layout': 'Layout',
    'communication': 'Communication',
    'utility': 'Utility',
    'custom': 'Custom',
    'ai-tools': 'AI Tools',
    'canvas-tools': 'Canvas Tools',
    'asset-tools': 'Asset Tools',
    'media-tools': 'Media Tools',
  };
  return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get emoji for category
 */
export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    'vector-tools': '✏️',
    'data-display': '📊',
    'controls': '🎛️',
    'timers': '⏱️',
    'data-transform': '🔄',
    'layout': '📐',
    'communication': '📡',
    'utility': '🔧',
    'custom': '⭐',
    'ai-tools': '🤖',
    'canvas-tools': '🎨',
    'asset-tools': '📁',
    'media-tools': '🎬',
  };
  return emojis[category] || '📦';
}

/**
 * Get sort mode display name
 */
export function getSortModeDisplayName(mode: SortMode): string {
  const names: Record<SortMode, string> = {
    'newest': 'Newest First',
    'oldest': 'Oldest First',
    'alpha-asc': 'A → Z',
    'alpha-desc': 'Z → A',
    'most-used': 'Most Used',
    'least-used': 'Least Used',
    'by-type': 'By Type',
    'by-pipeline': 'By Pipeline',
    'recently-updated': 'Recently Updated',
  };
  return names[mode] || mode;
}
