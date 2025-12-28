/**
 * StickerNest v2 - Asset Store
 * Zustand store for managing asset state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Asset,
  AnyAsset,
  AssetType,
  AssetLoadOptions,
  AssetLoadResult,
  AssetCollection,
  ImageAsset,
  FontAsset,
  AudioAsset,
} from '../types/asset';
import {
  generateAssetId,
  getAssetTypeFromMime,
  getAssetTypeFromExtension,
  isAssetReady,
  getAssetUrl,
} from '../types/asset';

// ==================
// Types
// ==================

interface AssetState {
  /** All assets by ID */
  assets: Map<string, AnyAsset>;
  /** Asset collections */
  collections: Map<string, AssetCollection>;
  /** Currently loading assets */
  loadingAssets: Set<string>;
  /** Total cache size in bytes */
  cacheSize: number;
  /** Maximum cache size in bytes (50MB default) */
  maxCacheSize: number;
}

interface AssetActions {
  /** Load an asset from URL */
  loadAsset: (url: string, options?: AssetLoadOptions) => Promise<AssetLoadResult>;
  /** Load an asset from a File object */
  loadFile: (file: File, options?: AssetLoadOptions) => Promise<AssetLoadResult>;
  /** Add an already-loaded asset */
  addAsset: (asset: AnyAsset) => void;
  /** Remove an asset */
  removeAsset: (assetId: string) => void;
  /** Get an asset by ID */
  getAsset: (assetId: string) => AnyAsset | undefined;
  /** Get assets by type */
  getAssetsByType: (type: AssetType) => AnyAsset[];
  /** Get assets by widget ID */
  getAssetsByWidget: (widgetId: string) => AnyAsset[];
  /** Update asset metadata */
  updateAsset: (assetId: string, updates: Partial<AnyAsset>) => void;
  /** Create a collection */
  createCollection: (name: string, assetIds?: string[]) => AssetCollection;
  /** Add asset to collection */
  addToCollection: (collectionId: string, assetId: string) => void;
  /** Remove asset from collection */
  removeFromCollection: (collectionId: string, assetId: string) => void;
  /** Delete a collection */
  deleteCollection: (collectionId: string) => void;
  /** Clear all assets */
  clearAssets: () => void;
  /** Cleanup unused blob URLs */
  cleanup: () => void;
  /** Register a font with CSS */
  registerFont: (fontAsset: FontAsset) => Promise<void>;
}

// ==================
// Asset Loading Helpers
// ==================

async function loadImageAsset(
  blob: Blob,
  baseAsset: Asset
): Promise<ImageAsset> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);

    img.onload = () => {
      const asset: ImageAsset = {
        ...baseAsset,
        type: 'image',
        blobUrl,
        dimensions: { width: img.width, height: img.height },
        format: baseAsset.mimeType?.split('/')[1] as ImageAsset['format'],
        loadState: 'loaded',
      };
      resolve(asset);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = blobUrl;
  });
}

async function loadAudioAsset(
  blob: Blob,
  baseAsset: Asset
): Promise<AudioAsset> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const blobUrl = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      const asset: AudioAsset = {
        ...baseAsset,
        type: 'audio',
        blobUrl,
        duration: audio.duration,
        format: baseAsset.mimeType?.split('/')[1] as AudioAsset['format'],
        loadState: 'loaded',
      };
      resolve(asset);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load audio'));
    };

    audio.src = blobUrl;
  });
}

async function loadVideoAsset(
  blob: Blob,
  baseAsset: Asset
): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const blobUrl = URL.createObjectURL(blob);

    video.onloadedmetadata = () => {
      const asset: Asset = {
        ...baseAsset,
        type: 'video',
        blobUrl,
        dimensions: { width: video.videoWidth, height: video.videoHeight },
        duration: video.duration,
        loadState: 'loaded',
      };
      resolve(asset);
    };

    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video'));
    };

    video.src = blobUrl;
  });
}

async function loadGenericAsset(
  blob: Blob,
  baseAsset: Asset
): Promise<Asset> {
  const blobUrl = URL.createObjectURL(blob);
  return {
    ...baseAsset,
    blobUrl,
    loadState: 'loaded',
  };
}

// ==================
// Store
// ==================

export const useAssetStore = create<AssetState & AssetActions>()(
  persist(
    (set, get) => ({
      // Initial state
      assets: new Map(),
      collections: new Map(),
      loadingAssets: new Set(),
      cacheSize: 0,
      maxCacheSize: 50 * 1024 * 1024, // 50MB

      // Actions
      loadAsset: async (url: string, options: AssetLoadOptions = {}) => {
        const { assets, loadingAssets } = get();

        // Check if already loaded
        const existing = Array.from(assets.values()).find(a => a.url === url);
        if (existing && !options.force) {
          return { success: true, asset: existing };
        }

        const assetId = generateAssetId();
        loadingAssets.add(assetId);
        set({ loadingAssets: new Set(loadingAssets) });

        try {
          const response = await fetch(url, {
            signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          const mimeType = blob.type || response.headers.get('content-type') || '';
          const type = getAssetTypeFromMime(mimeType) || getAssetTypeFromExtension(url);

          const baseAsset: Asset = {
            id: assetId,
            name: url.split('/').pop() || 'Untitled',
            type,
            source: 'url',
            url,
            mimeType,
            size: blob.size,
            loadState: 'loading',
            createdAt: Date.now(),
            tags: options.tags,
            widgetId: options.widgetId,
          };

          let asset: AnyAsset;

          switch (type) {
            case 'image':
            case 'svg':
              asset = await loadImageAsset(blob, baseAsset);
              break;
            case 'audio':
              asset = await loadAudioAsset(blob, baseAsset);
              break;
            case 'video':
              asset = await loadVideoAsset(blob, baseAsset);
              break;
            default:
              asset = await loadGenericAsset(blob, baseAsset);
          }

          // Add to store
          get().addAsset(asset);

          loadingAssets.delete(assetId);
          set({ loadingAssets: new Set(loadingAssets) });

          return { success: true, asset };
        } catch (error) {
          loadingAssets.delete(assetId);
          set({ loadingAssets: new Set(loadingAssets) });

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      loadFile: async (file: File, options: AssetLoadOptions = {}) => {
        const assetId = generateAssetId();
        const type = getAssetTypeFromMime(file.type) || getAssetTypeFromExtension(file.name);

        const baseAsset: Asset = {
          id: assetId,
          name: file.name,
          type,
          source: 'blob',
          url: '',
          mimeType: file.type,
          size: file.size,
          loadState: 'loading',
          createdAt: Date.now(),
          tags: options.tags,
          widgetId: options.widgetId,
        };

        try {
          let asset: AnyAsset;

          switch (type) {
            case 'image':
            case 'svg':
              asset = await loadImageAsset(file, baseAsset);
              break;
            case 'audio':
              asset = await loadAudioAsset(file, baseAsset);
              break;
            case 'video':
              asset = await loadVideoAsset(file, baseAsset);
              break;
            default:
              asset = await loadGenericAsset(file, baseAsset);
          }

          get().addAsset(asset);
          return { success: true, asset };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      addAsset: (asset: AnyAsset) => {
        const { assets, cacheSize } = get();
        assets.set(asset.id, asset);
        set({
          assets: new Map(assets),
          cacheSize: cacheSize + (asset.size || 0),
        });
      },

      removeAsset: (assetId: string) => {
        const { assets, cacheSize, collections } = get();
        const asset = assets.get(assetId);

        if (asset) {
          // Revoke blob URL if present
          if (asset.blobUrl) {
            URL.revokeObjectURL(asset.blobUrl);
          }

          assets.delete(assetId);

          // Remove from all collections
          for (const collection of collections.values()) {
            collection.assetIds = collection.assetIds.filter(id => id !== assetId);
          }

          set({
            assets: new Map(assets),
            collections: new Map(collections),
            cacheSize: Math.max(0, cacheSize - (asset.size || 0)),
          });
        }
      },

      getAsset: (assetId: string) => {
        const asset = get().assets.get(assetId);
        if (asset) {
          // Update last accessed
          asset.lastAccessed = Date.now();
        }
        return asset;
      },

      getAssetsByType: (type: AssetType) => {
        return Array.from(get().assets.values()).filter(a => a.type === type);
      },

      getAssetsByWidget: (widgetId: string) => {
        return Array.from(get().assets.values()).filter(a => a.widgetId === widgetId);
      },

      updateAsset: (assetId: string, updates: Partial<AnyAsset>) => {
        const { assets } = get();
        const asset = assets.get(assetId);
        if (asset) {
          Object.assign(asset, updates);
          set({ assets: new Map(assets) });
        }
      },

      createCollection: (name: string, assetIds: string[] = []) => {
        const { collections } = get();
        const collection: AssetCollection = {
          id: `col_${Date.now().toString(36)}`,
          name,
          assetIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        collections.set(collection.id, collection);
        set({ collections: new Map(collections) });
        return collection;
      },

      addToCollection: (collectionId: string, assetId: string) => {
        const { collections } = get();
        const collection = collections.get(collectionId);
        if (collection && !collection.assetIds.includes(assetId)) {
          collection.assetIds.push(assetId);
          collection.updatedAt = Date.now();
          set({ collections: new Map(collections) });
        }
      },

      removeFromCollection: (collectionId: string, assetId: string) => {
        const { collections } = get();
        const collection = collections.get(collectionId);
        if (collection) {
          collection.assetIds = collection.assetIds.filter(id => id !== assetId);
          collection.updatedAt = Date.now();
          set({ collections: new Map(collections) });
        }
      },

      deleteCollection: (collectionId: string) => {
        const { collections } = get();
        collections.delete(collectionId);
        set({ collections: new Map(collections) });
      },

      clearAssets: () => {
        const { assets } = get();

        // Revoke all blob URLs
        for (const asset of assets.values()) {
          if (asset.blobUrl) {
            URL.revokeObjectURL(asset.blobUrl);
          }
        }

        set({
          assets: new Map(),
          collections: new Map(),
          loadingAssets: new Set(),
          cacheSize: 0,
        });
      },

      cleanup: () => {
        const { assets, cacheSize, maxCacheSize } = get();

        // If under limit, no cleanup needed
        if (cacheSize <= maxCacheSize) return;

        // Sort by last accessed (oldest first)
        const sortedAssets = Array.from(assets.values())
          .sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

        let currentSize = cacheSize;
        const toRemove: string[] = [];

        // Remove oldest until under limit
        for (const asset of sortedAssets) {
          if (currentSize <= maxCacheSize * 0.8) break; // Target 80% of max
          toRemove.push(asset.id);
          currentSize -= asset.size || 0;
        }

        // Remove assets
        for (const id of toRemove) {
          get().removeAsset(id);
        }
      },

      registerFont: async (fontAsset: FontAsset) => {
        if (fontAsset.isRegistered) return;

        const url = getAssetUrl(fontAsset);
        if (!url) return;

        try {
          const fontFace = new FontFace(fontAsset.fontFamily, `url(${url})`, {
            weight: String(fontAsset.fontWeight || 'normal'),
            style: fontAsset.fontStyle || 'normal',
          });

          await fontFace.load();
          document.fonts.add(fontFace);

          get().updateAsset(fontAsset.id, { isRegistered: true } as Partial<FontAsset>);
        } catch (error) {
          console.error(`[AssetStore] Failed to register font ${fontAsset.fontFamily}:`, error);
        }
      },
    }),
    {
      name: 'stickernest-asset-store',
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key: string, value: unknown) => {
          if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Map') {
            return new Map((value as { entries: [string, unknown][] }).entries);
          }
          if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Set') {
            return new Set((value as { values: unknown[] }).values);
          }
          return value;
        },
        replacer: (_key: string, value: unknown) => {
          if (value instanceof Map) {
            return { __type: 'Map', entries: Array.from(value.entries()) };
          }
          if (value instanceof Set) {
            return { __type: 'Set', values: Array.from(value) };
          }
          return value;
        },
      }),
      partialize: (state) => ({
        // Don't persist blob URLs - they're session-specific
        // Only persist metadata for potential re-loading
        collections: state.collections,
      }),
    }
  )
);

// ==================
// Selector Hooks
// ==================

/** Get all assets */
export const useAssets = () => useAssetStore(state => Array.from(state.assets.values()));

/** Get assets by type */
export const useAssetsByType = (type: AssetType) =>
  useAssetStore(state => Array.from(state.assets.values()).filter(a => a.type === type));

/** Get a single asset */
export const useAsset = (assetId: string) =>
  useAssetStore(state => state.assets.get(assetId));

/** Get loading state */
export const useAssetLoading = (assetId: string) =>
  useAssetStore(state => state.loadingAssets.has(assetId));

/** Get all collections */
export const useCollections = () =>
  useAssetStore(state => Array.from(state.collections.values()));

/** Get cache info */
export const useCacheInfo = () =>
  useAssetStore(state => ({
    size: state.cacheSize,
    maxSize: state.maxCacheSize,
    percentage: (state.cacheSize / state.maxCacheSize) * 100,
  }));

export default useAssetStore;
