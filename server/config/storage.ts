import { env } from './env.js';

/**
 * Storage configuration for S3/R2 compatible storage
 * Designed to work with Cloudflare R2, AWS S3, or MinIO
 */
export const storageConfig = {
  /**
   * S3-compatible endpoint
   */
  endpoint: env.STORAGE_ENDPOINT,

  /**
   * Region (use 'auto' for R2)
   */
  region: env.STORAGE_REGION,

  /**
   * Credentials
   */
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },

  /**
   * Bucket names
   */
  buckets: {
    userWidgets: env.STORAGE_BUCKET_USER_WIDGETS,
    systemWidgets: env.STORAGE_BUCKET_SYSTEM_WIDGETS,
    assets: env.STORAGE_BUCKET_ASSETS,
  },

  /**
   * Upload settings
   */
  upload: {
    /**
     * Maximum file sizes in bytes
     */
    maxFileSizes: {
      image: 10 * 1024 * 1024,       // 10MB for images
      lottie: 5 * 1024 * 1024,       // 5MB for Lottie JSON
      widgetBundle: 50 * 1024 * 1024, // 50MB for widget bundles
      asset: 100 * 1024 * 1024,      // 100MB for general assets
    },

    /**
     * Allowed MIME types by category
     */
    allowedMimeTypes: {
      image: [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/avif',
      ],
      lottie: [
        'application/json',
      ],
      widgetBundle: [
        'application/zip',
        'application/x-zip-compressed',
      ],
      asset: [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/avif',
        'application/json',
        'application/zip',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
      ],
    },

    /**
     * Signed URL expiration time in seconds
     */
    signedUrlExpiry: 3600, // 1 hour
  },

  /**
   * Path templates for storage
   */
  paths: {
    /**
     * User widget bundle path
     * Format: {userId}/{widgetId}/{version}/
     */
    userWidget: (userId: string, widgetId: string, version: string) =>
      `${userId}/${widgetId}/${version}/`,

    /**
     * System widget bundle path
     * Format: {widgetId}/{version}/
     */
    systemWidget: (widgetId: string, version: string) =>
      `${widgetId}/${version}/`,

    /**
     * User asset path
     * Format: {userId}/assets/{assetId}/{filename}
     */
    userAsset: (userId: string, assetId: string, filename: string) =>
      `${userId}/assets/${assetId}/${filename}`,

    /**
     * Canvas asset path
     * Format: {canvasId}/assets/{assetId}/{filename}
     */
    canvasAsset: (canvasId: string, assetId: string, filename: string) =>
      `${canvasId}/assets/${assetId}/${filename}`,
  },
};

/**
 * Asset types for categorization
 */
export type AssetType = 'image' | 'video' | 'audio' | 'lottie' | 'widgetBundle';

type ConfigCategory = keyof typeof storageConfig.upload.allowedMimeTypes;

/**
 * Map asset types to config categories
 */
function getConfigCategory(type: AssetType): ConfigCategory {
  switch (type) {
    case 'video':
    case 'audio':
      return 'asset';
    default:
      return type;
  }
}

/**
 * Get allowed MIME types for an asset type
 */
export function getAllowedMimeTypes(type: AssetType): string[] {
  return storageConfig.upload.allowedMimeTypes[getConfigCategory(type)];
}

/**
 * Get max file size for an asset type
 */
export function getMaxFileSize(type: AssetType): number {
  return storageConfig.upload.maxFileSizes[getConfigCategory(type)];
}

/**
 * Check if a MIME type is allowed for an asset type
 */
export function isMimeTypeAllowed(mimeType: string, assetType: AssetType): boolean {
  return storageConfig.upload.allowedMimeTypes[getConfigCategory(assetType)].includes(mimeType);
}
