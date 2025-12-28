/**
 * StickerNest v2 - Asset Types
 * Defines types for the asset management system
 */

// ==================
// Asset Types
// ==================

/** Supported asset types */
export type AssetType = 'image' | 'font' | 'audio' | 'video' | 'json' | 'lottie' | 'svg' | 'other';

/** Asset source types */
export type AssetSource = 'local' | 'url' | 'data-url' | 'blob' | 'widget-bundle';

/** Asset loading states */
export type AssetLoadState = 'pending' | 'loading' | 'loaded' | 'error';

// ==================
// Asset Definitions
// ==================

/** Base asset interface */
export interface Asset {
  /** Unique asset ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Asset type */
  type: AssetType;
  /** Source type */
  source: AssetSource;
  /** Original URL or path */
  url: string;
  /** Resolved blob URL (for loaded assets) */
  blobUrl?: string;
  /** Data URL (for small assets) */
  dataUrl?: string;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  size?: number;
  /** Dimensions for images/videos */
  dimensions?: { width: number; height: number };
  /** Duration for audio/video */
  duration?: number;
  /** Loading state */
  loadState: AssetLoadState;
  /** Error message if loading failed */
  error?: string;
  /** When the asset was added */
  createdAt: number;
  /** When the asset was last accessed */
  lastAccessed?: number;
  /** Tags for organization */
  tags?: string[];
  /** Widget ID if this asset belongs to a widget */
  widgetId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Image-specific asset */
export interface ImageAsset extends Asset {
  type: 'image';
  dimensions: { width: number; height: number };
  /** Thumbnail data URL */
  thumbnail?: string;
  /** Image format */
  format?: 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg' | 'avif';
  /** Whether the image has transparency */
  hasAlpha?: boolean;
}

/** Font asset */
export interface FontAsset extends Asset {
  type: 'font';
  /** Font family name */
  fontFamily: string;
  /** Font weight */
  fontWeight?: number | string;
  /** Font style */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** Font format */
  format?: 'woff' | 'woff2' | 'ttf' | 'otf' | 'eot';
  /** Whether the font has been registered with CSS */
  isRegistered?: boolean;
}

/** Audio asset */
export interface AudioAsset extends Asset {
  type: 'audio';
  duration: number;
  /** Audio format */
  format?: 'mp3' | 'wav' | 'ogg' | 'm4a' | 'webm';
  /** Sample rate */
  sampleRate?: number;
  /** Number of channels */
  channels?: number;
  /** Waveform data for visualization */
  waveform?: number[];
}

/** Video asset */
export interface VideoAsset extends Asset {
  type: 'video';
  dimensions: { width: number; height: number };
  duration: number;
  /** Video format */
  format?: 'mp4' | 'webm' | 'ogv' | 'mov';
  /** Frame rate */
  frameRate?: number;
  /** Whether video has audio */
  hasAudio?: boolean;
  /** Poster image */
  poster?: string;
}

/** Lottie animation asset */
export interface LottieAsset extends Asset {
  type: 'lottie';
  /** Animation duration in seconds */
  duration: number;
  /** Frame rate */
  frameRate: number;
  /** Total frames */
  totalFrames: number;
  /** Animation dimensions */
  dimensions: { width: number; height: number };
  /** Animation markers */
  markers?: Array<{ name: string; time: number }>;
}

/** SVG asset */
export interface SVGAsset extends Asset {
  type: 'svg';
  dimensions: { width: number; height: number };
  /** SVG content (for inline use) */
  content?: string;
  /** Whether SVG contains animations */
  isAnimated?: boolean;
}

/** JSON data asset */
export interface JSONAsset extends Asset {
  type: 'json';
  /** Parsed JSON data */
  data?: unknown;
  /** Schema URL if available */
  schema?: string;
}

/** Union type for all asset types */
export type AnyAsset =
  | ImageAsset
  | FontAsset
  | AudioAsset
  | VideoAsset
  | LottieAsset
  | SVGAsset
  | JSONAsset
  | Asset;

// ==================
// Asset Collections
// ==================

/** Collection of assets */
export interface AssetCollection {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Collection description */
  description?: string;
  /** Asset IDs in this collection */
  assetIds: string[];
  /** Tags for organization */
  tags?: string[];
  /** When created */
  createdAt: number;
  /** When last modified */
  updatedAt: number;
}

// ==================
// Asset Loading
// ==================

/** Options for loading an asset */
export interface AssetLoadOptions {
  /** Force reload even if cached */
  force?: boolean;
  /** Generate thumbnail for images */
  generateThumbnail?: boolean;
  /** Maximum dimensions to resize to */
  maxDimensions?: { width: number; height: number };
  /** Whether to store as data URL */
  asDataUrl?: boolean;
  /** Timeout in ms */
  timeout?: number;
  /** Tags to apply */
  tags?: string[];
  /** Widget ID to associate with */
  widgetId?: string;
}

/** Result of loading an asset */
export interface AssetLoadResult {
  success: boolean;
  asset?: AnyAsset;
  error?: string;
}

// ==================
// Asset References
// ==================

/** Reference to an asset for use in widgets */
export interface AssetReference {
  /** Asset ID */
  assetId: string;
  /** Asset type */
  type: AssetType;
  /** URL to use (blob URL, data URL, or original) */
  url: string;
  /** Optional alt text for images */
  alt?: string;
}

// ==================
// Helpers
// ==================

/** Get asset type from MIME type */
export function getAssetTypeFromMime(mimeType: string): AssetType {
  if (mimeType.startsWith('image/')) {
    if (mimeType === 'image/svg+xml') return 'svg';
    return 'image';
  }
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('font/')) return 'font';
  if (mimeType === 'application/json') return 'json';
  if (mimeType.includes('lottie')) return 'lottie';
  return 'other';
}

/** Get asset type from file extension */
export function getAssetTypeFromExtension(filename: string): AssetType {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'avif':
    case 'bmp':
      return 'image';
    case 'svg':
      return 'svg';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
    case 'aac':
    case 'flac':
      return 'audio';
    case 'mp4':
    case 'webm':
    case 'ogv':
    case 'mov':
    case 'avi':
      return 'video';
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
    case 'eot':
      return 'font';
    case 'json':
      return 'json';
    case 'lottie':
      return 'lottie';
    default:
      return 'other';
  }
}

/** Generate a unique asset ID */
export function generateAssetId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Check if an asset is loaded and ready to use */
export function isAssetReady(asset: Asset | undefined): boolean {
  return asset?.loadState === 'loaded' && !!(asset.blobUrl || asset.dataUrl || asset.url);
}

/** Get the best URL to use for an asset */
export function getAssetUrl(asset: Asset | undefined): string | null {
  if (!asset) return null;
  return asset.blobUrl || asset.dataUrl || asset.url || null;
}
