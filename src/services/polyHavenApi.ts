/**
 * StickerNest - Poly Haven API Service
 *
 * Client for searching and downloading free CC0 3D models from Poly Haven.
 * No API key required - all assets are free and CC0 licensed.
 *
 * API Documentation: https://api.polyhaven.com/
 */

// ============================================================================
// Types
// ============================================================================

export interface PolyHavenAsset {
  id: string;
  name: string;
  type: 'models' | 'hdris' | 'textures';
  categories: string[];
  tags: string[];
  download_count: number;
  authors: Record<string, string>;
  date_published: number;
}

export interface PolyHavenAssetList {
  [id: string]: PolyHavenAsset;
}

export interface PolyHavenFiles {
  gltf?: {
    [resolution: string]: {
      gltf?: { url: string; size: number };
      glb?: { url: string; size: number };
    };
  };
  blend?: { url: string; size: number };
  fbx?: { url: string; size: number };
}

export interface PolyHavenModel {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  downloadCount: number;
  authors: string[];
  datePublished: Date;
  thumbnailUrl: string;
  previewUrl: string;
}

export interface PolyHavenSearchParams {
  query?: string;
  categories?: string[];
  page?: number;
  limit?: number;
}

export interface PolyHavenSearchResult {
  models: PolyHavenModel[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface PolyHavenModelFiles {
  glb?: { url: string; size: number };
  gltf?: { url: string; size: number };
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE = 'https://api.polyhaven.com';
const CDN_BASE = 'https://dl.polyhaven.org/file/ph-assets';

// Available categories for 3D models
export const POLY_HAVEN_CATEGORIES = [
  'all',
  'appliances',
  'architecture',
  'decorations',
  'electronics',
  'food',
  'furniture',
  'industrial',
  'nature',
  'props',
  'vehicles',
] as const;

export type PolyHavenCategory = typeof POLY_HAVEN_CATEGORIES[number];

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all available 3D models from Poly Haven
 */
export async function fetchAllModels(): Promise<PolyHavenAssetList> {
  const response = await fetch(`${API_BASE}/assets?type=models`);

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search 3D models with optional filtering
 */
export async function searchModels(
  params: PolyHavenSearchParams = {}
): Promise<PolyHavenSearchResult> {
  const { query = '', categories = [], page = 1, limit = 20 } = params;

  // Fetch all models (Poly Haven doesn't have a search endpoint)
  const allAssets = await fetchAllModels();

  // Convert to array and filter
  let models = Object.entries(allAssets).map(([id, asset]) => ({
    id,
    name: formatName(asset.name || id),
    categories: asset.categories || [],
    tags: asset.tags || [],
    downloadCount: asset.download_count || 0,
    authors: Object.keys(asset.authors || {}),
    datePublished: new Date(asset.date_published * 1000),
    thumbnailUrl: getModelThumbnailUrl(id),
    previewUrl: getModelPreviewUrl(id),
  }));

  // Filter by search query
  if (query) {
    const lowerQuery = query.toLowerCase();
    models = models.filter(
      (m) =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        m.categories.some((c) => c.toLowerCase().includes(lowerQuery))
    );
  }

  // Filter by categories
  if (categories.length > 0 && !categories.includes('all')) {
    models = models.filter((m) =>
      m.categories.some((c) => categories.includes(c))
    );
  }

  // Sort by popularity
  models.sort((a, b) => b.downloadCount - a.downloadCount);

  // Paginate
  const total = models.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedModels = models.slice(startIndex, endIndex);

  return {
    models: paginatedModels,
    total,
    page,
    hasMore: endIndex < total,
  };
}

/**
 * Get download URLs for a specific model
 */
export async function getModelFiles(
  modelId: string
): Promise<PolyHavenModelFiles> {
  const response = await fetch(`${API_BASE}/files/${modelId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch model files: ${response.statusText}`);
  }

  const files: PolyHavenFiles = await response.json();

  // Extract GLB/GLTF files (prefer 1k resolution for performance)
  const gltfFiles = files.gltf;
  if (!gltfFiles) {
    return {};
  }

  // Try to get 1k, then 2k, then any available resolution
  const preferredResolutions = ['1k', '2k', '4k'];
  let resolution: string | undefined;

  for (const res of preferredResolutions) {
    if (gltfFiles[res]) {
      resolution = res;
      break;
    }
  }

  // Fallback to first available resolution
  if (!resolution) {
    resolution = Object.keys(gltfFiles)[0];
  }

  if (!resolution) {
    return {};
  }

  const resolutionFiles = gltfFiles[resolution];

  return {
    glb: resolutionFiles?.glb,
    gltf: resolutionFiles?.gltf,
  };
}

/**
 * Get the best download URL for a model (prefers GLB)
 */
export async function getModelDownloadUrl(
  modelId: string
): Promise<string | null> {
  const files = await getModelFiles(modelId);

  // Prefer GLB (single file, easier to load)
  if (files.glb?.url) {
    return files.glb.url;
  }

  // Fallback to GLTF
  if (files.gltf?.url) {
    return files.gltf.url;
  }

  return null;
}

// ============================================================================
// URL Helpers
// ============================================================================

/**
 * Get thumbnail URL for a model
 */
export function getModelThumbnailUrl(modelId: string): string {
  return `${CDN_BASE}/Models/${modelId}/Renders/thumb.png`;
}

/**
 * Get preview render URL for a model
 */
export function getModelPreviewUrl(modelId: string): string {
  return `${CDN_BASE}/Models/${modelId}/Renders/clay.png`;
}

/**
 * Get environment preview URL for a model (with lighting)
 */
export function getModelEnvironmentPreviewUrl(modelId: string): string {
  return `${CDN_BASE}/Models/${modelId}/Renders/eevee.png`;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format model name from ID (convert snake_case to Title Case)
 */
function formatName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Cache for API responses
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with caching
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}

/**
 * Search models with caching
 */
export async function searchModelsCached(
  params: PolyHavenSearchParams = {}
): Promise<PolyHavenSearchResult> {
  const cacheKey = `search:${JSON.stringify(params)}`;
  return cachedFetch(cacheKey, () => searchModels(params));
}

export default {
  searchModels,
  searchModelsCached,
  getModelFiles,
  getModelDownloadUrl,
  getModelThumbnailUrl,
  getModelPreviewUrl,
  POLY_HAVEN_CATEGORIES,
};
