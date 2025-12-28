/**
 * StickerNest v2 - Halo Document Store
 *
 * Persistent document storage using IndexedDB that survives widget and canvas deletion.
 * Documents are never automatically deleted - only manual user deletion removes them.
 *
 * Features:
 * - IndexedDB for large document storage (no localStorage limits)
 * - Documents persist independently of widgets/canvases
 * - Full CRUD operations with metadata
 * - Search and filtering capabilities
 * - Export/import for backup
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// ==================
// Types
// ==================

export interface HaloDocument {
  /** Unique document ID */
  id: string;
  /** Document title */
  title: string;
  /** Document content (plain text or HTML) */
  content: string;
  /** Content type: 'text' | 'html' | 'markdown' */
  contentType: 'text' | 'html' | 'markdown';
  /** Document category for organization */
  category: 'note' | 'shopping-list' | 'todo' | 'ocr-scan' | 'voice-memo' | 'general';
  /** User-defined tags */
  tags: string[];
  /** Source widget ID that created this document (for reference only) */
  sourceWidgetId?: string;
  /** Source canvas ID (for reference only) */
  sourceCanvasId?: string;
  /** Original source type: 'ocr' | 'speech' | 'manual' | 'import' */
  sourceType: 'ocr' | 'speech' | 'manual' | 'import';
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** Whether document is starred/favorited */
  starred: boolean;
  /** Whether document is archived (hidden from main view) */
  archived: boolean;
  /** Original image data if from OCR (base64) */
  originalImage?: string;
  /** Word count */
  wordCount: number;
}

export interface HaloDocumentMetadata {
  id: string;
  title: string;
  category: HaloDocument['category'];
  tags: string[];
  sourceType: HaloDocument['sourceType'];
  createdAt: number;
  updatedAt: number;
  starred: boolean;
  archived: boolean;
  wordCount: number;
}

// ==================
// IndexedDB Setup
// ==================

const DB_NAME = 'HaloDocuments';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbInstance: IDBDatabase | null = null;

async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[HaloDocumentStore] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for efficient querying
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('starred', 'starred', { unique: false });
        store.createIndex('archived', 'archived', { unique: false });
        store.createIndex('sourceType', 'sourceType', { unique: false });

        console.log('[HaloDocumentStore] Created IndexedDB store with indexes');
      }
    };
  });
}

// ==================
// IndexedDB Operations
// ==================

async function dbGetAll(): Promise<HaloDocument[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(id: string): Promise<HaloDocument | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(doc: HaloDocument): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(doc);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbGetByIndex(
  indexName: string,
  value: IDBValidKey
): Promise<HaloDocument[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ==================
// Helper Functions
// ==================

function countWords(text: string): number {
  if (!text) return 0;
  // Strip HTML tags if present
  const plainText = text.replace(/<[^>]*>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

function createDocumentMetadata(doc: HaloDocument): HaloDocumentMetadata {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    tags: doc.tags,
    sourceType: doc.sourceType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    starred: doc.starred,
    archived: doc.archived,
    wordCount: doc.wordCount,
  };
}

// ==================
// Store State & Actions
// ==================

export interface HaloDocumentStoreState {
  /** Document metadata cache (lightweight, for listing) */
  documentIndex: Record<string, HaloDocumentMetadata>;
  /** Loading state */
  isLoading: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Error message if any */
  error: string | null;
}

export interface HaloDocumentStoreActions {
  /** Initialize store and load index from IndexedDB */
  initialize: () => Promise<void>;

  /** Create a new document */
  createDocument: (
    data: Omit<HaloDocument, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>
  ) => Promise<HaloDocument>;

  /** Get a document by ID (full content) */
  getDocument: (id: string) => Promise<HaloDocument | undefined>;

  /** Update a document */
  updateDocument: (
    id: string,
    updates: Partial<Omit<HaloDocument, 'id' | 'createdAt'>>
  ) => Promise<HaloDocument | undefined>;

  /** Delete a document (requires explicit user action) */
  deleteDocument: (id: string) => Promise<boolean>;

  /** Get all document metadata (for listing) */
  getAllMetadata: () => HaloDocumentMetadata[];

  /** Get documents by category */
  getByCategory: (category: HaloDocument['category']) => Promise<HaloDocument[]>;

  /** Get starred documents */
  getStarred: () => Promise<HaloDocument[]>;

  /** Search documents by title or content */
  searchDocuments: (query: string) => Promise<HaloDocument[]>;

  /** Toggle starred status */
  toggleStarred: (id: string) => Promise<void>;

  /** Toggle archived status */
  toggleArchived: (id: string) => Promise<void>;

  /** Export all documents as JSON */
  exportAllDocuments: () => Promise<string>;

  /** Import documents from JSON */
  importDocuments: (json: string) => Promise<number>;

  /** Get statistics */
  getStats: () => {
    totalDocuments: number;
    byCategory: Record<string, number>;
    bySourceType: Record<string, number>;
    totalWords: number;
  };
}

// ==================
// Store Creation
// ==================

const initialState: HaloDocumentStoreState = {
  documentIndex: {},
  isLoading: false,
  lastSyncAt: null,
  error: null,
};

export const useHaloDocumentStore = create<HaloDocumentStoreState & HaloDocumentStoreActions>()(
  (set, get) => ({
    ...initialState,

    initialize: async () => {
      set({ isLoading: true, error: null });

      try {
        const documents = await dbGetAll();
        const index: Record<string, HaloDocumentMetadata> = {};

        for (const doc of documents) {
          index[doc.id] = createDocumentMetadata(doc);
        }

        set({
          documentIndex: index,
          isLoading: false,
          lastSyncAt: Date.now(),
        });

        console.log(`[HaloDocumentStore] Initialized with ${documents.length} documents`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ isLoading: false, error: message });
        console.error('[HaloDocumentStore] Initialization failed:', error);
      }
    },

    createDocument: async (data) => {
      const now = Date.now();
      const doc: HaloDocument = {
        ...data,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        wordCount: countWords(data.content),
      };

      try {
        await dbPut(doc);

        set((state) => ({
          documentIndex: {
            ...state.documentIndex,
            [doc.id]: createDocumentMetadata(doc),
          },
          lastSyncAt: now,
        }));

        console.log(`[HaloDocumentStore] Created document: ${doc.id} - ${doc.title}`);
        return doc;
      } catch (error) {
        console.error('[HaloDocumentStore] Failed to create document:', error);
        throw error;
      }
    },

    getDocument: async (id) => {
      try {
        return await dbGet(id);
      } catch (error) {
        console.error('[HaloDocumentStore] Failed to get document:', error);
        return undefined;
      }
    },

    updateDocument: async (id, updates) => {
      try {
        const existing = await dbGet(id);
        if (!existing) return undefined;

        const now = Date.now();
        const updated: HaloDocument = {
          ...existing,
          ...updates,
          id, // Ensure ID cannot be changed
          createdAt: existing.createdAt, // Preserve creation time
          updatedAt: now,
          wordCount: updates.content !== undefined
            ? countWords(updates.content)
            : existing.wordCount,
        };

        await dbPut(updated);

        set((state) => ({
          documentIndex: {
            ...state.documentIndex,
            [id]: createDocumentMetadata(updated),
          },
          lastSyncAt: now,
        }));

        console.log(`[HaloDocumentStore] Updated document: ${id}`);
        return updated;
      } catch (error) {
        console.error('[HaloDocumentStore] Failed to update document:', error);
        return undefined;
      }
    },

    deleteDocument: async (id) => {
      try {
        await dbDelete(id);

        set((state) => {
          const { [id]: _, ...rest } = state.documentIndex;
          return {
            documentIndex: rest,
            lastSyncAt: Date.now(),
          };
        });

        console.log(`[HaloDocumentStore] Deleted document: ${id}`);
        return true;
      } catch (error) {
        console.error('[HaloDocumentStore] Failed to delete document:', error);
        return false;
      }
    },

    getAllMetadata: () => {
      return Object.values(get().documentIndex);
    },

    getByCategory: async (category) => {
      try {
        return await dbGetByIndex('category', category);
      } catch (error) {
        console.error('[HaloDocumentStore] Failed to get by category:', error);
        return [];
      }
    },

    getStarred: async () => {
      try {
        return await dbGetByIndex('starred', 1); // IDBKeyRange for true
      } catch (error) {
        console.error('[HaloDocumentStore] Failed to get starred:', error);
        return [];
      }
    },

    searchDocuments: async (query) => {
      if (!query.trim()) return [];

      try {
        const allDocs = await dbGetAll();
        const lowerQuery = query.toLowerCase();

        return allDocs.filter((doc) => {
          const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
          const contentMatch = doc.content.toLowerCase().includes(lowerQuery);
          const tagMatch = doc.tags.some((tag) =>
            tag.toLowerCase().includes(lowerQuery)
          );
          return titleMatch || contentMatch || tagMatch;
        });
      } catch (error) {
        console.error('[HaloDocumentStore] Search failed:', error);
        return [];
      }
    },

    toggleStarred: async (id) => {
      const doc = await get().getDocument(id);
      if (doc) {
        await get().updateDocument(id, { starred: !doc.starred });
      }
    },

    toggleArchived: async (id) => {
      const doc = await get().getDocument(id);
      if (doc) {
        await get().updateDocument(id, { archived: !doc.archived });
      }
    },

    exportAllDocuments: async () => {
      try {
        const documents = await dbGetAll();
        return JSON.stringify({
          version: 1,
          exportedAt: Date.now(),
          documents,
        }, null, 2);
      } catch (error) {
        console.error('[HaloDocumentStore] Export failed:', error);
        throw error;
      }
    },

    importDocuments: async (json) => {
      try {
        const data = JSON.parse(json);
        const documents: HaloDocument[] = data.documents || [];
        let imported = 0;

        for (const doc of documents) {
          // Generate new IDs to avoid conflicts
          const newDoc: HaloDocument = {
            ...doc,
            id: uuidv4(),
            sourceType: 'import',
            updatedAt: Date.now(),
          };

          await dbPut(newDoc);
          imported++;

          set((state) => ({
            documentIndex: {
              ...state.documentIndex,
              [newDoc.id]: createDocumentMetadata(newDoc),
            },
          }));
        }

        set({ lastSyncAt: Date.now() });
        console.log(`[HaloDocumentStore] Imported ${imported} documents`);
        return imported;
      } catch (error) {
        console.error('[HaloDocumentStore] Import failed:', error);
        throw error;
      }
    },

    getStats: () => {
      const metadata = get().getAllMetadata();
      const byCategory: Record<string, number> = {};
      const bySourceType: Record<string, number> = {};
      let totalWords = 0;

      for (const doc of metadata) {
        byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
        bySourceType[doc.sourceType] = (bySourceType[doc.sourceType] || 0) + 1;
        totalWords += doc.wordCount;
      }

      return {
        totalDocuments: metadata.length,
        byCategory,
        bySourceType,
        totalWords,
      };
    },
  })
);

// ==================
// Non-React Accessors
// ==================

/**
 * Create a document outside of React components
 */
export const createHaloDocument = async (
  data: Omit<HaloDocument, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>
): Promise<HaloDocument> => {
  return useHaloDocumentStore.getState().createDocument(data);
};

/**
 * Get a document outside of React components
 */
export const getHaloDocument = async (id: string): Promise<HaloDocument | undefined> => {
  return useHaloDocumentStore.getState().getDocument(id);
};

/**
 * Update a document outside of React components
 */
export const updateHaloDocument = async (
  id: string,
  updates: Partial<Omit<HaloDocument, 'id' | 'createdAt'>>
): Promise<HaloDocument | undefined> => {
  return useHaloDocumentStore.getState().updateDocument(id, updates);
};

/**
 * Initialize the store (call on app startup)
 */
export const initializeHaloDocumentStore = async (): Promise<void> => {
  return useHaloDocumentStore.getState().initialize();
};

// ==================
// Selector Hooks
// ==================

/** Get all document metadata */
export const useHaloDocumentMetadata = () =>
  useHaloDocumentStore((state) => Object.values(state.documentIndex));

/** Get document count */
export const useHaloDocumentCount = () =>
  useHaloDocumentStore((state) => Object.keys(state.documentIndex).length);

/** Check if store is loading */
export const useHaloDocumentLoading = () =>
  useHaloDocumentStore((state) => state.isLoading);

/** Get starred documents metadata */
export const useStarredDocuments = () =>
  useHaloDocumentStore((state) =>
    Object.values(state.documentIndex).filter((doc) => doc.starred)
  );

/** Get documents by category */
export const useDocumentsByCategory = (category: HaloDocument['category']) =>
  useHaloDocumentStore((state) =>
    Object.values(state.documentIndex).filter((doc) => doc.category === category)
  );
