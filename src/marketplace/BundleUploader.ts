/**
 * StickerNest v2 - Bundle Uploader
 *
 * Handles uploading widget bundles to storage.
 * Supports various storage backends.
 */

import type { WidgetBundle, BundleFile } from '../types/widget';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
  success: boolean;
  bundlePath: string;
  bundleSize: number;
  manifestUrl: string;
  entryUrl: string;
  assetUrls: Map<string, string>;
  error?: string;
}

export interface StorageProvider {
  name: string;
  upload(path: string, content: string | Uint8Array, contentType?: string): Promise<string>;
  delete(path: string): Promise<boolean>;
  getUrl(path: string): string;
}

export interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'verifying' | 'complete' | 'error';
  progress: number;
  currentFile?: string;
  totalFiles: number;
  uploadedFiles: number;
}

export type ProgressCallback = (progress: UploadProgress) => void;

// ============================================================================
// LOCAL STORAGE PROVIDER (Development)
// ============================================================================

class LocalStorageProvider implements StorageProvider {
  name = 'localStorage';
  private prefix: string;

  constructor(prefix = 'widget-bundle:') {
    this.prefix = prefix;
  }

  async upload(path: string, content: string | Uint8Array): Promise<string> {
    const key = this.prefix + path;
    const data = typeof content === 'string' ? content : btoa(String.fromCharCode(...content));
    localStorage.setItem(key, data);
    return this.getUrl(path);
  }

  async delete(path: string): Promise<boolean> {
    const key = this.prefix + path;
    localStorage.removeItem(key);
    return true;
  }

  getUrl(path: string): string {
    // Return a data URL or blob URL for local storage
    const key = this.prefix + path;
    const data = localStorage.getItem(key);
    if (data) {
      // Try to detect if it's base64 encoded binary
      const ext = path.split('.').pop()?.toLowerCase();
      const mimeType = getMimeType(ext || '');
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        return `data:${mimeType};base64,${btoa(data)}`;
      }
      return `data:${mimeType};base64,${data}`;
    }
    return '';
  }
}

// ============================================================================
// INDEXEDDB STORAGE PROVIDER (Development)
// ============================================================================

class IndexedDBStorageProvider implements StorageProvider {
  name = 'indexedDB';
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'stickernest-widgets') {
    this.dbName = dbName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('bundles')) {
          db.createObjectStore('bundles', { keyPath: 'path' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  async upload(path: string, content: string | Uint8Array, contentType?: string): Promise<string> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bundles'], 'readwrite');
      const store = transaction.objectStore('bundles');

      const data = {
        path,
        content,
        contentType: contentType || getMimeType(path.split('.').pop() || ''),
        uploadedAt: Date.now(),
      };

      const request = store.put(data);

      request.onerror = () => reject(new Error(`Failed to store ${path}`));
      request.onsuccess = () => resolve(this.getUrl(path));
    });
  }

  async delete(path: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(['bundles'], 'readwrite');
      const store = transaction.objectStore('bundles');
      const request = store.delete(path);

      request.onerror = () => resolve(false);
      request.onsuccess = () => resolve(true);
    });
  }

  getUrl(path: string): string {
    // For IndexedDB, we need to create blob URLs on access
    // This returns a scheme that the app can handle
    return `indexeddb://stickernest-widgets/${path}`;
  }

  async getBlobUrl(path: string): Promise<string> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bundles'], 'readonly');
      const store = transaction.objectStore('bundles');
      const request = store.get(path);

      request.onerror = () => reject(new Error(`Failed to get ${path}`));
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`File not found: ${path}`));
          return;
        }

        const { content, contentType } = request.result;
        const blob = new Blob(
          [content instanceof Uint8Array ? content : content],
          { type: contentType }
        );
        resolve(URL.createObjectURL(blob));
      };
    });
  }
}

// ============================================================================
// HTTP STORAGE PROVIDER (Production)
// ============================================================================

class HTTPStorageProvider implements StorageProvider {
  name = 'http';
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async upload(path: string, content: string | Uint8Array, contentType?: string): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': contentType || getMimeType(path.split('.').pop() || ''),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/upload/${path}`, {
      method: 'PUT',
      headers,
      body: content,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url || this.getUrl(path);
  }

  async delete(path: string): Promise<boolean> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/delete/${path}`, {
      method: 'DELETE',
      headers,
    });

    return response.ok;
  }

  getUrl(path: string): string {
    return `${this.baseUrl}/bundles/${path}`;
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'css': 'text/css',
    'json': 'application/json',
    'svg': 'image/svg+xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

function generateBundlePath(manifest: { id: string; version: string }): string {
  const sanitizedId = manifest.id.replace(/[^a-z0-9.-]/gi, '-');
  const sanitizedVersion = manifest.version.replace(/[^a-z0-9.-]/gi, '-');
  return `${sanitizedId}/${sanitizedVersion}`;
}

// ============================================================================
// BUNDLE UPLOADER
// ============================================================================

export class BundleUploader {
  private storage: StorageProvider;

  constructor(storage?: StorageProvider) {
    // Default to IndexedDB for development
    this.storage = storage || new IndexedDBStorageProvider();
  }

  /**
   * Upload a widget bundle
   */
  async upload(
    bundle: WidgetBundle,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    const bundlePath = generateBundlePath(bundle.manifest);
    const assetUrls = new Map<string, string>();
    const totalFiles = bundle.files.length;
    let uploadedFiles = 0;

    try {
      // Phase: Preparing
      onProgress?.({
        phase: 'preparing',
        progress: 0,
        totalFiles,
        uploadedFiles: 0,
      });

      // Upload each file
      for (const file of bundle.files) {
        const filePath = `${bundlePath}/${file.path}`;

        onProgress?.({
          phase: 'uploading',
          progress: (uploadedFiles / totalFiles) * 100,
          currentFile: file.path,
          totalFiles,
          uploadedFiles,
        });

        const url = await this.storage.upload(
          filePath,
          file.content,
          getMimeType(file.type)
        );

        assetUrls.set(file.path, url);
        uploadedFiles++;
      }

      // Phase: Verifying
      onProgress?.({
        phase: 'verifying',
        progress: 95,
        totalFiles,
        uploadedFiles,
      });

      // Get manifest and entry URLs
      const manifestUrl = assetUrls.get('manifest.json') || '';
      const entryUrl = assetUrls.get(bundle.manifest.entry) || '';

      // Phase: Complete
      onProgress?.({
        phase: 'complete',
        progress: 100,
        totalFiles,
        uploadedFiles,
      });

      return {
        success: true,
        bundlePath,
        bundleSize: bundle.totalSize,
        manifestUrl,
        entryUrl,
        assetUrls,
      };
    } catch (error) {
      onProgress?.({
        phase: 'error',
        progress: 0,
        totalFiles,
        uploadedFiles,
      });

      return {
        success: false,
        bundlePath: '',
        bundleSize: 0,
        manifestUrl: '',
        entryUrl: '',
        assetUrls: new Map(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete a widget bundle
   */
  async delete(bundlePath: string): Promise<boolean> {
    // In a real implementation, we'd list all files in the bundle
    // and delete them. For now, just try to delete the path.
    return this.storage.delete(bundlePath);
  }

  /**
   * Get the URL for a bundle asset
   */
  getAssetUrl(bundlePath: string, assetPath: string): string {
    return this.storage.getUrl(`${bundlePath}/${assetPath}`);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createLocalUploader(): BundleUploader {
  return new BundleUploader(new LocalStorageProvider());
}

export function createIndexedDBUploader(): BundleUploader {
  return new BundleUploader(new IndexedDBStorageProvider());
}

export function createHTTPUploader(baseUrl: string, apiKey?: string): BundleUploader {
  return new BundleUploader(new HTTPStorageProvider(baseUrl, apiKey));
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

let defaultUploader: BundleUploader | null = null;

export function getDefaultUploader(): BundleUploader {
  if (!defaultUploader) {
    // Use IndexedDB by default
    defaultUploader = createIndexedDBUploader();
  }
  return defaultUploader;
}

export function setDefaultUploader(uploader: BundleUploader): void {
  defaultUploader = uploader;
}
