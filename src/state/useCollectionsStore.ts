/**
 * StickerNest v2 - Collections Store (Zustand)
 * Manages canvas collections/folders with API integration
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { collectionsApi } from '../services/api';
import { isLocalDevMode } from '../services/supabaseClient';

// ============================================
// Types
// ============================================

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  canvasIds: string[];
  canvasCount: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithCanvases extends Collection {
  canvases: {
    id: string;
    name: string;
    thumbnailUrl?: string;
  }[];
}

// ============================================
// Mock Data (for local dev mode)
// ============================================

const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'col-favorites',
    name: 'Favorites',
    description: 'My favorite canvases',
    color: '#ef4444',
    icon: 'heart',
    canvasIds: ['canvas-1', 'canvas-3'],
    canvasCount: 2,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'col-work',
    name: 'Work Projects',
    description: 'Professional project canvases',
    color: '#8b5cf6',
    icon: 'briefcase',
    canvasIds: ['canvas-2', 'canvas-4', 'canvas-5'],
    canvasCount: 3,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'col-personal',
    name: 'Personal',
    description: 'Personal creative projects',
    color: '#22c55e',
    icon: 'star',
    canvasIds: ['canvas-6'],
    canvasCount: 1,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
  },
];

// ============================================
// Store Types
// ============================================

interface CollectionsState {
  collections: Collection[];
  selectedCollectionId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CollectionsActions {
  // Load collections
  loadCollections: () => Promise<void>;

  // Select collection
  selectCollection: (id: string | null) => void;

  // CRUD operations
  createCollection: (data: {
    name: string;
    description?: string;
    color: string;
    icon: string;
  }) => Promise<Collection>;

  updateCollection: (
    id: string,
    data: Partial<Pick<Collection, 'name' | 'description' | 'color' | 'icon'>>
  ) => Promise<void>;

  deleteCollection: (id: string) => Promise<void>;

  // Canvas management
  addCanvasToCollection: (collectionId: string, canvasId: string) => Promise<void>;
  removeCanvasFromCollection: (collectionId: string, canvasId: string) => Promise<void>;
  getCollectionsForCanvas: (canvasId: string) => Collection[];

  // Utilities
  setError: (error: string | null) => void;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: CollectionsState = {
  collections: [],
  selectedCollectionId: null,
  isLoading: false,
  error: null,
};

// ============================================
// Store
// ============================================

export const useCollectionsStore = create<CollectionsState & CollectionsActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Load Collections
        // ==================

        loadCollections: async () => {
          set({ isLoading: true, error: null }, false, 'loadCollections:start');

          try {
            if (!isLocalDevMode) {
              const response = await collectionsApi.list();
              if (response.success && response.data) {
                // Transform API response to our Collection type
                const collections: Collection[] = response.data.collections.map(col => ({
                  id: col.id,
                  name: col.name,
                  description: col.description,
                  color: col.color || '#8b5cf6',
                  icon: col.icon || 'folder',
                  canvasIds: [], // API doesn't return canvas IDs in list
                  canvasCount: col.canvasCount || 0,
                  isDefault: col.isDefault,
                  createdAt: col.createdAt,
                  updatedAt: col.updatedAt,
                }));

                set({ collections, isLoading: false }, false, 'loadCollections:success');
                return;
              }
            }

            // Local dev mode or API failed - use mock data
            await new Promise(resolve => setTimeout(resolve, 300));
            const { collections } = get();
            if (collections.length === 0) {
              set({ collections: MOCK_COLLECTIONS, isLoading: false }, false, 'loadCollections:mock');
            } else {
              set({ isLoading: false }, false, 'loadCollections:cached');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load collections',
              isLoading: false,
            }, false, 'loadCollections:error');
          }
        },

        // ==================
        // Select Collection
        // ==================

        selectCollection: (id) => {
          set({ selectedCollectionId: id }, false, 'selectCollection');
        },

        // ==================
        // Create Collection
        // ==================

        createCollection: async (data) => {
          const tempId = `col-${Date.now()}`;
          const newCollection: Collection = {
            id: tempId,
            name: data.name,
            description: data.description,
            color: data.color,
            icon: data.icon,
            canvasIds: [],
            canvasCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Optimistic update
          set(
            (state) => ({
              collections: [...state.collections, newCollection],
            }),
            false,
            'createCollection:optimistic'
          );

          try {
            if (!isLocalDevMode) {
              const response = await collectionsApi.create(data);
              if (response.success && response.data) {
                // Update with real ID from server
                const serverCollection: Collection = {
                  ...newCollection,
                  id: response.data.collection.id,
                };

                set(
                  (state) => ({
                    collections: state.collections.map(c =>
                      c.id === tempId ? serverCollection : c
                    ),
                  }),
                  false,
                  'createCollection:success'
                );

                return serverCollection;
              }
              throw new Error('Failed to create collection');
            }

            // Local dev mode - just simulate delay
            await new Promise(resolve => setTimeout(resolve, 200));
            return newCollection;
          } catch (error) {
            // Revert optimistic update
            set(
              (state) => ({
                collections: state.collections.filter(c => c.id !== tempId),
                error: error instanceof Error ? error.message : 'Failed to create collection',
              }),
              false,
              'createCollection:revert'
            );
            throw error;
          }
        },

        // ==================
        // Update Collection
        // ==================

        updateCollection: async (id, data) => {
          const { collections } = get();
          const original = collections.find(c => c.id === id);
          if (!original) return;

          // Optimistic update
          set(
            (state) => ({
              collections: state.collections.map((col) =>
                col.id === id
                  ? { ...col, ...data, updatedAt: new Date().toISOString() }
                  : col
              ),
            }),
            false,
            'updateCollection:optimistic'
          );

          try {
            if (!isLocalDevMode) {
              const response = await collectionsApi.update(id, data);
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to update collection');
              }
            } else {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            // Revert optimistic update
            set(
              (state) => ({
                collections: state.collections.map(c =>
                  c.id === id ? original : c
                ),
                error: error instanceof Error ? error.message : 'Failed to update collection',
              }),
              false,
              'updateCollection:revert'
            );
            throw error;
          }
        },

        // ==================
        // Delete Collection
        // ==================

        deleteCollection: async (id) => {
          const { collections, selectedCollectionId } = get();
          const collection = collections.find((c) => c.id === id);

          if (!collection) return;
          if (collection.isDefault) {
            throw new Error('Cannot delete default collection');
          }

          // Optimistic update
          set(
            (state) => ({
              collections: state.collections.filter((col) => col.id !== id),
              selectedCollectionId:
                state.selectedCollectionId === id ? null : state.selectedCollectionId,
            }),
            false,
            'deleteCollection:optimistic'
          );

          try {
            if (!isLocalDevMode) {
              const response = await collectionsApi.delete(id);
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to delete collection');
              }
            } else {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            // Revert optimistic update
            set(
              (state) => ({
                collections: [...state.collections, collection],
                selectedCollectionId,
                error: error instanceof Error ? error.message : 'Failed to delete collection',
              }),
              false,
              'deleteCollection:revert'
            );
            throw error;
          }
        },

        // ==================
        // Canvas Management
        // ==================

        addCanvasToCollection: async (collectionId, canvasId) => {
          const { collections } = get();
          const original = collections.find(c => c.id === collectionId);
          if (!original || original.canvasIds.includes(canvasId)) return;

          // Optimistic update
          set(
            (state) => ({
              collections: state.collections.map((col) => {
                if (col.id !== collectionId) return col;
                return {
                  ...col,
                  canvasIds: [...col.canvasIds, canvasId],
                  canvasCount: col.canvasCount + 1,
                  updatedAt: new Date().toISOString(),
                };
              }),
            }),
            false,
            'addCanvasToCollection:optimistic'
          );

          try {
            if (!isLocalDevMode) {
              const response = await collectionsApi.addCanvas(collectionId, canvasId);
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to add canvas');
              }
            } else {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            // Revert optimistic update
            set(
              (state) => ({
                collections: state.collections.map(c =>
                  c.id === collectionId ? original : c
                ),
              }),
              false,
              'addCanvasToCollection:revert'
            );
            throw error;
          }
        },

        removeCanvasFromCollection: async (collectionId, canvasId) => {
          const { collections } = get();
          const original = collections.find(c => c.id === collectionId);
          if (!original) return;

          // Optimistic update
          set(
            (state) => ({
              collections: state.collections.map((col) => {
                if (col.id !== collectionId) return col;
                return {
                  ...col,
                  canvasIds: col.canvasIds.filter((id) => id !== canvasId),
                  canvasCount: Math.max(0, col.canvasCount - 1),
                  updatedAt: new Date().toISOString(),
                };
              }),
            }),
            false,
            'removeCanvasFromCollection:optimistic'
          );

          try {
            if (!isLocalDevMode) {
              const response = await collectionsApi.removeCanvas(collectionId, canvasId);
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to remove canvas');
              }
            } else {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            // Revert optimistic update
            set(
              (state) => ({
                collections: state.collections.map(c =>
                  c.id === collectionId ? original : c
                ),
              }),
              false,
              'removeCanvasFromCollection:revert'
            );
            throw error;
          }
        },

        getCollectionsForCanvas: (canvasId) => {
          return get().collections.filter((col) => col.canvasIds.includes(canvasId));
        },

        // ==================
        // Utilities
        // ==================

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        reset: () => {
          set(initialState, false, 'reset');
        },
      }),
      {
        name: 'collections-storage',
        partialize: (state) => ({
          collections: state.collections,
          selectedCollectionId: state.selectedCollectionId,
        }),
      }
    ),
    {
      name: 'CollectionsStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useCollections = () => useCollectionsStore((s) => s.collections);
export const useSelectedCollection = () => {
  const id = useCollectionsStore((s) => s.selectedCollectionId);
  const collections = useCollectionsStore((s) => s.collections);
  return id ? collections.find((c) => c.id === id) : null;
};
export const useIsCollectionsLoading = () => useCollectionsStore((s) => s.isLoading);
export const useCollectionsError = () => useCollectionsStore((s) => s.error);
