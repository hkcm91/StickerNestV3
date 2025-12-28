/**
 * StickerNest v2 - Marketplace Module
 *
 * Central exports for marketplace functionality.
 */

// Validator
export { WidgetValidator, validateWidget, validateManifest } from './WidgetValidator';
export type { ValidationOptions, ValidatedWidget } from './WidgetValidator';

// Bundler
export { WidgetBundler, bundleWidget, bundleInlineWidget } from './WidgetBundler';
export type { BundlerOptions, BundleSource, BundleResult } from './WidgetBundler';

// Uploader
export {
  BundleUploader,
  createLocalUploader,
  createIndexedDBUploader,
  createHTTPUploader,
  getDefaultUploader,
  setDefaultUploader,
} from './BundleUploader';
export type { UploadResult, StorageProvider, UploadProgress, ProgressCallback } from './BundleUploader';
