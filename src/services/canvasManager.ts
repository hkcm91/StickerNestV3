/**
 * StickerNest v2 - Canvas Manager Service
 * Comprehensive canvas management with proper state synchronization,
 * multiple canvas support, sharing, and privacy settings.
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';
import { useCanvasStore } from '../state/useCanvasStore';
import { useStickerStore } from '../state/useStickerStore';
import { useCanvasExtendedStore } from '../state/useCanvasExtendedStore';
import type {
  Canvas,
  CanvasVisibility,
  CanvasShareSettings,
  CanvasBackground,
  WidgetInstance,
  Pipeline,
  StickerInstance,
  DockZone,
  DockedWidgetState,
} from '../types/domain';
import type { Entity } from '../types/entities';

// ==================
// Types
// ==================

/** Full canvas data including widgets, stickers, and all state */
export interface CanvasData {
  canvas: Canvas;
  widgets: WidgetInstance[];
  pipelines: Pipeline[];
  entities: Entity[];
  /** Stickers on the canvas */
  stickers?: StickerInstance[];
  /** Dock zones configuration */
  dockZones?: DockZone[];
  /** Docked widget states */
  dockedWidgets?: DockedWidgetState[];
}

/** Canvas list item for the canvas switcher */
export interface CanvasListItem {
  id: string;
  name: string;
  visibility: CanvasVisibility;
  width: number;
  height: number;
  widgetCount: number;
  thumbnailUrl?: string;
  updatedAt: string;
  hasPassword: boolean;
}

/** Result type for canvas operations */
export interface CanvasResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Share URL result */
export interface ShareUrlResult {
  url: string;
  slug: string;
  visibility: CanvasVisibility;
  hasPassword: boolean;
}

// ==================
// Local Storage Keys
// ==================

const STORAGE_KEYS = {
  CANVAS_PREFIX: 'stickernest-canvas-',
  CANVAS_INDEX: 'stickernest-canvas-index',
  ACTIVE_CANVAS: 'stickernest-active-canvas',
  ACCESS_TOKENS: 'stickernest-access-tokens',
  DEMO_INITIALIZED: 'stickernest-demo-initialized',
} as const;

// ==================
// Demo Canvas Data (for local dev mode)
// ==================

const DEMO_CANVAS_ID = 'demo-canvas-main';

const DEMO_CANVAS_DATA: CanvasData = {
  canvas: {
    id: DEMO_CANVAS_ID,
    userId: 'demo-user-123',
    name: 'Welcome to StickerNest',
    visibility: 'private',
    createdAt: new Date().toISOString(),
    width: 1920,
    height: 1080,
    hasPassword: false,
    description: 'Your first canvas - start creating!',
  },
  widgets: [],
  pipelines: [],
  entities: [],
};

/** Initialize demo canvas in localStorage if not exists */
function initializeDemoCanvas(): void {
  if (!isLocalDevMode) return;

  const key = `${STORAGE_KEYS.CANVAS_PREFIX}${DEMO_CANVAS_ID}`;
  const existing = localStorage.getItem(key);

  if (!existing) {
    // Save demo canvas to localStorage
    localStorage.setItem(key, JSON.stringify(DEMO_CANVAS_DATA));

    // Add to index
    const indexStr = localStorage.getItem(STORAGE_KEYS.CANVAS_INDEX);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    if (!index.includes(DEMO_CANVAS_ID)) {
      index.push(DEMO_CANVAS_ID);
      localStorage.setItem(STORAGE_KEYS.CANVAS_INDEX, JSON.stringify(index));
    }

    console.log('[CanvasManager] Demo canvas initialized');
  }
}

// Initialize demo canvas on module load
if (typeof window !== 'undefined') {
  initializeDemoCanvas();
}

// ==================
// Utility Functions
// ==================

/** Generate a random slug */
function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Generate a canvas ID */
function generateCanvasId(): string {
  return `canvas-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/** Simple hash function for passwords (client-side, real hashing done server-side) */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify password (client-side check) */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// ==================
// Local Storage Operations
// ==================

/** Save canvas data to localStorage */
function saveCanvasToLocal(data: CanvasData): void {
  try {
    const key = `${STORAGE_KEYS.CANVAS_PREFIX}${data.canvas.id}`;
    console.log('[CanvasManager] saveCanvasToLocal:', {
      key,
      canvasId: data.canvas.id,
      slug: data.canvas.slug,
      widgetCount: data.widgets.length,
      stickerCount: data.stickers?.length || 0,
      widgets: data.widgets.map(w => ({ id: w.id, name: w.name || w.widgetDefId })),
    });
    localStorage.setItem(key, JSON.stringify(data));

    // Update index
    const indexStr = localStorage.getItem(STORAGE_KEYS.CANVAS_INDEX);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    if (!index.includes(data.canvas.id)) {
      index.push(data.canvas.id);
      localStorage.setItem(STORAGE_KEYS.CANVAS_INDEX, JSON.stringify(index));
      console.log('[CanvasManager] Updated index:', index);
    }
  } catch (error) {
    console.error('[CanvasManager] Failed to save to localStorage:', error);
  }
}

/** Load canvas data from localStorage */
function loadCanvasFromLocal(canvasId: string): CanvasData | null {
  try {
    const key = `${STORAGE_KEYS.CANVAS_PREFIX}${canvasId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[CanvasManager] Failed to load from localStorage:', error);
    return null;
  }
}

/** List all canvases from localStorage */
function listCanvasesFromLocal(): CanvasListItem[] {
  try {
    const indexStr = localStorage.getItem(STORAGE_KEYS.CANVAS_INDEX);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];

    const items: CanvasListItem[] = [];
    for (const canvasId of index) {
      const data = loadCanvasFromLocal(canvasId);
      if (data) {
        items.push({
          id: data.canvas.id,
          name: data.canvas.name,
          visibility: data.canvas.visibility,
          width: data.canvas.width || 1920,
          height: data.canvas.height || 1080,
          widgetCount: data.widgets.length,
          thumbnailUrl: data.canvas.thumbnailUrl,
          updatedAt: data.canvas.createdAt,
          hasPassword: !!data.canvas.hasPassword,
        });
      }
    }
    return items;
  } catch (error) {
    console.error('[CanvasManager] Failed to list from localStorage:', error);
    return [];
  }
}

/** Delete canvas from localStorage */
function deleteCanvasFromLocal(canvasId: string): void {
  try {
    const key = `${STORAGE_KEYS.CANVAS_PREFIX}${canvasId}`;
    localStorage.removeItem(key);

    // Update index
    const indexStr = localStorage.getItem(STORAGE_KEYS.CANVAS_INDEX);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    const newIndex = index.filter(id => id !== canvasId);
    localStorage.setItem(STORAGE_KEYS.CANVAS_INDEX, JSON.stringify(newIndex));
  } catch (error) {
    console.error('[CanvasManager] Failed to delete from localStorage:', error);
  }
}

// ==================
// Supabase Operations
// ==================

/** Save canvas to Supabase */
async function saveCanvasToSupabase(data: CanvasData, passwordHash?: string): Promise<boolean> {
  if (!supabaseClient || isLocalDevMode) {
    console.log('[CanvasManager] saveCanvasToSupabase skipped - no Supabase or local dev mode');
    return false;
  }

  console.log('[CanvasManager] saveCanvasToSupabase called:', {
    canvasId: data.canvas.id,
    visibility: data.canvas.visibility,
    slug: data.canvas.slug
  });

  try {
    // Upsert canvas
    const { error: canvasError } = await supabaseClient
      .from('canvases')
      .upsert({
        id: data.canvas.id,
        user_id: data.canvas.userId,
        name: data.canvas.name,
        visibility: data.canvas.visibility,
        slug: data.canvas.slug,
        width: data.canvas.width || 1920,
        height: data.canvas.height || 1080,
        password_hash: passwordHash || null,
        description: data.canvas.description,
        thumbnail_url: data.canvas.thumbnailUrl,
        background_config: data.canvas.backgroundConfig || { type: 'color', color: '#0f0f19' },
        updated_at: new Date().toISOString(),
      });

    if (canvasError) {
      console.error('[CanvasManager] saveCanvasToSupabase canvas upsert error:', canvasError);
      throw canvasError;
    }

    console.log('[CanvasManager] saveCanvasToSupabase canvas upsert success');

    // Delete existing widgets and re-insert (simpler than complex upsert logic)
    await supabaseClient
      .from('widget_instances')
      .delete()
      .eq('canvas_id', data.canvas.id);

    if (data.widgets.length > 0) {
      const { error: widgetsError } = await supabaseClient
        .from('widget_instances')
        .insert(
          data.widgets.map(w => ({
            id: w.id,
            canvas_id: data.canvas.id,
            widget_def_id: w.widgetDefId,
            position_x: w.position.x,
            position_y: w.position.y,
            width: w.width,
            height: w.height,
            rotation: w.rotation,
            z_index: w.zIndex,
            state: w.state,
            metadata: w.metadata,
          }))
        );

      if (widgetsError) throw widgetsError;
    }

    // Delete existing pipelines and re-insert
    await supabaseClient
      .from('pipelines')
      .delete()
      .eq('canvas_id', data.canvas.id);

    if (data.pipelines.length > 0) {
      const { error: pipelinesError } = await supabaseClient
        .from('pipelines')
        .insert(
          data.pipelines.map(p => ({
            id: p.id,
            canvas_id: data.canvas.id,
            name: p.name,
            description: p.description,
            nodes: p.nodes,
            connections: p.connections,
            enabled: p.enabled,
            widget_edits: p.widgetEdits,
            version: p.version,
          }))
        );

      if (pipelinesError) throw pipelinesError;
    }

    return true;
  } catch (error) {
    console.error('[CanvasManager] Supabase save failed:', error);
    return false;
  }
}

/** Load canvas from Supabase */
async function loadCanvasFromSupabase(canvasId: string): Promise<CanvasData | null> {
  console.log('[CanvasManager] loadCanvasFromSupabase called with ID:', canvasId);

  if (!supabaseClient || isLocalDevMode) {
    console.log('[CanvasManager] Supabase not available or in local dev mode');
    return null;
  }

  try {
    // Load canvas
    const { data: canvas, error: canvasError } = await supabaseClient
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .maybeSingle();

    console.log('[CanvasManager] Canvas load result:', { canvas: canvas ? 'found' : null, error: canvasError });

    if (canvasError) {
      console.error('[CanvasManager] Error loading canvas by ID:', canvasError.message, canvasError.code);
      return null;
    }

    if (!canvas) {
      console.log('[CanvasManager] Canvas not found by ID:', canvasId);
      return null;
    }

    // Load widgets
    const { data: widgets } = await supabaseClient
      .from('widget_instances')
      .select('*')
      .eq('canvas_id', canvasId);

    // Load pipelines
    const { data: pipelines } = await supabaseClient
      .from('pipelines')
      .select('*')
      .eq('canvas_id', canvasId);

    return {
      canvas: {
        id: canvas.id,
        userId: canvas.user_id,
        name: canvas.name,
        visibility: canvas.visibility,
        slug: canvas.slug,
        createdAt: canvas.created_at,
        width: canvas.width,
        height: canvas.height,
        hasPassword: !!canvas.password_hash,
        description: canvas.description,
        thumbnailUrl: canvas.thumbnail_url,
        viewCount: canvas.view_count,
        backgroundConfig: canvas.background_config,
      },
      widgets: (widgets || []).map((w: any) => ({
        id: w.id,
        canvasId: w.canvas_id,
        widgetDefId: w.widget_def_id,
        position: { x: w.position_x, y: w.position_y },
        sizePreset: 'md' as const,
        width: w.width,
        height: w.height,
        rotation: w.rotation,
        zIndex: w.z_index,
        state: w.state || {},
        metadata: w.metadata,
      })),
      pipelines: (pipelines || []).map((p: any) => ({
        id: p.id,
        canvasId: p.canvas_id,
        name: p.name,
        description: p.description,
        nodes: p.nodes,
        connections: p.connections,
        enabled: p.enabled,
        widgetEdits: p.widget_edits,
        version: p.version,
      })),
      entities: [],
    };
  } catch (error) {
    console.error('[CanvasManager] Supabase load failed:', error);
    return null;
  }
}

/** Load canvas by slug from localStorage (fallback for local dev mode) */
function loadCanvasBySlugFromLocal(slug: string): CanvasData | null {
  try {
    console.log('[CanvasManager] loadCanvasBySlugFromLocal searching for slug:', slug);
    const indexStr = localStorage.getItem(STORAGE_KEYS.CANVAS_INDEX);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    console.log('[CanvasManager] Canvas index:', index);

    for (const canvasId of index) {
      const data = loadCanvasFromLocal(canvasId);
      console.log('[CanvasManager] Checking canvas:', canvasId, 'slug:', data?.canvas.slug);
      if (data?.canvas.slug === slug) {
        console.log('[CanvasManager] Found canvas by slug in localStorage:', canvasId);
        return data;
      }
    }

    // Also check for canvases not in index (e.g., demo canvases)
    const demoCanvasIds = ['user-a-canvas-1', 'user-a-canvas-2', 'user-b-canvas-1'];
    for (const canvasId of demoCanvasIds) {
      const data = loadCanvasFromLocal(canvasId);
      if (data?.canvas.slug === slug) {
        console.log('[CanvasManager] Found demo canvas by slug in localStorage:', canvasId);
        return data;
      }
    }

    return null;
  } catch (error) {
    console.error('[CanvasManager] Failed to load by slug from localStorage:', error);
    return null;
  }
}

/** Load canvas by slug from Supabase */
async function loadCanvasBySlug(slugOrId: string): Promise<CanvasData | null> {
  console.log('[CanvasManager] loadCanvasBySlug called with slugOrId:', slugOrId);

  // Try localStorage first (for local dev mode and demo canvases)
  const localData = loadCanvasBySlugFromLocal(slugOrId);
  if (localData) {
    return localData;
  }

  // Also try loading by ID from localStorage (for when canvasId is passed instead of slug)
  const localDataById = loadCanvasFromLocal(slugOrId);
  if (localDataById) {
    console.log('[CanvasManager] Found canvas by ID in localStorage:', slugOrId);
    return localDataById;
  }

  if (!supabaseClient) {
    console.log('[CanvasManager] No supabase client available');
    return null;
  }

  try {
    console.log('[CanvasManager] Loading canvas by slug from Supabase:', slugOrId);
    const { data: canvas, error } = await supabaseClient
      .from('canvases')
      .select('id, visibility, slug')
      .eq('slug', slugOrId)
      .maybeSingle();

    console.log('[CanvasManager] Slug query result:', { canvas, error });

    if (error) {
      console.error('[CanvasManager] Error loading canvas by slug:', error.message, error.code);
    }

    // If not found by slug, try loading by ID
    if (!canvas) {
      console.log('[CanvasManager] No canvas found for slug, trying ID:', slugOrId);
      const dataById = await loadCanvasFromSupabase(slugOrId);
      if (dataById) {
        console.log('[CanvasManager] Found canvas by ID from Supabase');
        return dataById;
      }
      console.log('[CanvasManager] No canvas found by slug or ID:', slugOrId);
      return null;
    }

    console.log('[CanvasManager] Found canvas ID:', canvas.id, 'visibility:', canvas.visibility);
    return loadCanvasFromSupabase(canvas.id);
  } catch (err) {
    console.error('[CanvasManager] Exception in loadCanvasBySlug:', err);
    return null;
  }
}

/** List canvases from Supabase */
async function listCanvasesFromSupabase(userId: string): Promise<CanvasListItem[]> {
  if (!supabaseClient || isLocalDevMode) return [];

  try {
    const { data, error } = await supabaseClient
      .from('canvases')
      .select(`
        id, name, visibility, width, height, thumbnail_url, updated_at, password_hash,
        widget_instances(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      visibility: c.visibility,
      width: c.width || 1920,
      height: c.height || 1080,
      widgetCount: c.widget_instances?.[0]?.count || 0,
      thumbnailUrl: c.thumbnail_url,
      updatedAt: c.updated_at,
      hasPassword: !!c.password_hash,
    }));
  } catch (error) {
    console.error('[CanvasManager] Supabase list failed:', error);
    return [];
  }
}

/** Delete canvas from Supabase */
async function deleteCanvasFromSupabase(canvasId: string): Promise<boolean> {
  if (!supabaseClient || isLocalDevMode) return false;

  try {
    const { error } = await supabaseClient
      .from('canvases')
      .delete()
      .eq('id', canvasId);

    return !error;
  } catch {
    return false;
  }
}

/** Verify canvas password */
async function verifyCanvasPassword(canvasId: string, password: string): Promise<boolean> {
  if (!supabaseClient) return false;

  try {
    const { data: canvas } = await supabaseClient
      .from('canvases')
      .select('password_hash')
      .eq('id', canvasId)
      .maybeSingle();

    if (!canvas?.password_hash) return true; // No password required
    return verifyPassword(password, canvas.password_hash);
  } catch {
    return false;
  }
}

// ==================
// Canvas Manager Class
// ==================

export class CanvasManager {
  private userId: string;
  private currentCanvasId: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.currentCanvasId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CANVAS);
  }

  /** Get current canvas ID */
  getCurrentCanvasId(): string | null {
    return this.currentCanvasId;
  }

  /** Set current canvas ID */
  setCurrentCanvasId(canvasId: string): void {
    this.currentCanvasId = canvasId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CANVAS, canvasId);
  }

  /**
   * Create a new canvas
   */
  async createCanvas(options: {
    name: string;
    width?: number;
    height?: number;
    visibility?: CanvasVisibility;
    password?: string;
    slug?: string;
  }): Promise<CanvasResult<Canvas>> {
    const canvasId = generateCanvasId();
    const slug = options.slug || (options.visibility !== 'private' ? generateSlug() : undefined);

    const canvas: Canvas = {
      id: canvasId,
      userId: this.userId,
      name: options.name,
      visibility: options.visibility || 'private',
      slug,
      createdAt: new Date().toISOString(),
      width: options.width || 1920,
      height: options.height || 1080,
      hasPassword: !!options.password,
    };

    const data: CanvasData = {
      canvas,
      widgets: [],
      pipelines: [],
      entities: [],
    };

    // Save to localStorage
    saveCanvasToLocal(data);

    // Save to Supabase
    const passwordHash = options.password ? await hashPassword(options.password) : undefined;
    await saveCanvasToSupabase(data, passwordHash);

    return { success: true, data: canvas };
  }

  /**
   * Save current canvas state from the Zustand stores (canvas + stickers + extended state)
   * Includes background, dimensions, scale, layers, and groups from useCanvasExtendedStore
   */
  async saveCurrentCanvas(): Promise<CanvasResult> {
    const store = useCanvasStore.getState();
    const stickerStore = useStickerStore.getState();
    const extendedStore = useCanvasExtendedStore.getState();

    if (!store.canvasId) {
      return { success: false, error: 'No canvas loaded' };
    }

    // Get existing canvas data to preserve metadata
    const existing = loadCanvasFromLocal(store.canvasId) ||
      await loadCanvasFromSupabase(store.canvasId);

    // Get current background from extended store
    const extendedCanvas = extendedStore.canvases.get(store.canvasId);
    const currentBackground = extendedCanvas?.background;

    // Get current dimensions from extended store (or fall back to existing/defaults)
    const currentDimensions = extendedStore.canvasDimensions;

    // Get stickers for this canvas
    const canvasStickers = stickerStore.getStickersByCanvas(store.canvasId);
    const canvasDockZones = stickerStore.getDockZonesByCanvas(store.canvasId);

    // Build the canvas data with current state from all stores
    const data: CanvasData = {
      canvas: {
        // Start with existing data for fields we don't track in stores
        ...(existing?.canvas || {
          id: store.canvasId,
          userId: store.userId,
          name: 'Untitled Canvas',
          visibility: 'private',
          createdAt: new Date().toISOString(),
        }),
        // Always use current dimensions from extended store
        width: currentDimensions.width,
        height: currentDimensions.height,
        // Always use current background from extended store (if set)
        backgroundConfig: currentBackground || existing?.canvas.backgroundConfig || { type: 'color', color: '#0f0f19' },
      },
      widgets: Array.from(store.widgets.values()),
      pipelines: Array.from(store.pipelines.values()),
      entities: Array.from(store.entities.values()),
      stickers: canvasStickers,
      dockZones: canvasDockZones,
    };

    console.log('[CanvasManager] saveCurrentCanvas:', {
      canvasId: store.canvasId,
      widgetCount: data.widgets.length,
      stickerCount: data.stickers?.length || 0,
      dockZoneCount: data.dockZones?.length || 0,
      dimensions: { width: data.canvas.width, height: data.canvas.height },
      hasBackground: !!data.canvas.backgroundConfig,
      backgroundType: data.canvas.backgroundConfig?.type,
    });

    // Save to localStorage
    saveCanvasToLocal(data);

    // Save to Supabase
    const supabaseSuccess = await saveCanvasToSupabase(data);

    return {
      success: true,
      error: supabaseSuccess ? undefined : 'Saved locally, cloud sync failed'
    };
  }

  /**
   * Load a canvas into the Zustand store
   * Also restores background and dimensions to useCanvasExtendedStore
   */
  async loadCanvas(canvasId: string, password?: string): Promise<CanvasResult<CanvasData>> {
    // Try Supabase first
    let data = await loadCanvasFromSupabase(canvasId);

    // Check password if required
    if (data?.canvas.hasPassword && password) {
      const isValid = await verifyCanvasPassword(canvasId, password);
      if (!isValid) {
        return { success: false, error: 'Invalid password' };
      }
    } else if (data?.canvas.hasPassword && !password) {
      return { success: false, error: 'Password required' };
    }

    // Fall back to localStorage
    if (!data) {
      data = loadCanvasFromLocal(canvasId);
    }

    if (!data) {
      return { success: false, error: 'Canvas not found' };
    }

    // Update Zustand store
    const store = useCanvasStore.getState();
    const extendedStore = useCanvasExtendedStore.getState();

    // Initialize with canvas ID and user ID
    store.initialize(data.canvas.id, data.canvas.userId);

    // Clear existing widgets
    const existingWidgets = Array.from(store.widgets.keys());
    existingWidgets.forEach(id => store.removeWidget(id));

    // Clear existing pipelines
    const existingPipelines = Array.from(store.pipelines.keys());
    existingPipelines.forEach(id => store.removePipeline(id));

    // Add loaded widgets
    data.widgets.forEach(widget => store.addWidget(widget));

    // Add loaded pipelines
    data.pipelines.forEach(pipeline => store.addPipeline(pipeline));

    // Restore canvas dimensions to extended store
    const width = data.canvas.width || 1920;
    const height = data.canvas.height || 1080;
    extendedStore.setCanvasDimensions(width, height, false);

    // Restore background to extended store
    if (data.canvas.backgroundConfig) {
      // Ensure the canvas exists in the extended store
      if (!extendedStore.canvases.has(canvasId)) {
        extendedStore.createCanvas(data.canvas.name || 'Untitled', width, height);
        // After creation, the new canvas has a different ID, so we need to update it
        const newCanvases = new Map(extendedStore.canvases);
        const lastCanvas = Array.from(newCanvases.values()).pop();
        if (lastCanvas) {
          newCanvases.delete(lastCanvas.id);
          lastCanvas.id = canvasId;
          newCanvases.set(canvasId, lastCanvas);
        }
      }
      extendedStore.setCanvasBackground(canvasId, data.canvas.backgroundConfig);
      extendedStore.switchCanvas(canvasId);
    }

    console.log('[CanvasManager] loadCanvas restored:', {
      canvasId,
      dimensions: { width, height },
      backgroundType: data.canvas.backgroundConfig?.type,
    });

    // Set current canvas
    this.setCurrentCanvasId(canvasId);

    return { success: true, data };
  }

  /**
   * Load a canvas by slug (for shared links)
   */
  async loadCanvasBySlug(slug: string, password?: string): Promise<CanvasResult<CanvasData>> {
    console.log('[CanvasManager] Public loadCanvasBySlug called:', { slug, hasPassword: !!password });
    const data = await loadCanvasBySlug(slug);

    if (!data) {
      console.log('[CanvasManager] loadCanvasBySlug returned null - canvas not found');
      return { success: false, error: 'Canvas not found' };
    }

    console.log('[CanvasManager] Canvas data loaded:', {
      id: data.canvas.id,
      visibility: data.canvas.visibility,
      hasPassword: data.canvas.hasPassword
    });

    // Check password if required
    if (data.canvas.hasPassword && password) {
      const isValid = await verifyCanvasPassword(data.canvas.id, password);
      if (!isValid) {
        return { success: false, error: 'Invalid password' };
      }
    } else if (data.canvas.hasPassword && !password) {
      return { success: false, error: 'Password required' };
    }

    return this.loadCanvas(data.canvas.id);
  }

  /**
   * List all canvases for the current user
   */
  async listCanvases(): Promise<CanvasListItem[]> {
    const localCanvases = listCanvasesFromLocal();
    const supabaseCanvases = await listCanvasesFromSupabase(this.userId);

    // Merge, preferring Supabase data
    const merged = new Map<string, CanvasListItem>();
    localCanvases.forEach(c => merged.set(c.id, c));
    supabaseCanvases.forEach(c => merged.set(c.id, c));

    return Array.from(merged.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Delete a canvas
   */
  async deleteCanvas(canvasId: string): Promise<CanvasResult> {
    deleteCanvasFromLocal(canvasId);
    await deleteCanvasFromSupabase(canvasId);

    // Clear from store if it's the current canvas
    if (this.currentCanvasId === canvasId) {
      this.currentCanvasId = null;
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CANVAS);
    }

    return { success: true };
  }

  /**
   * Duplicate a canvas
   */
  async duplicateCanvas(canvasId: string, newName?: string): Promise<CanvasResult<Canvas>> {
    let data = await loadCanvasFromSupabase(canvasId);
    if (!data) {
      data = loadCanvasFromLocal(canvasId);
    }

    if (!data) {
      return { success: false, error: 'Canvas not found' };
    }

    // Create new canvas with duplicated data
    const newCanvasId = generateCanvasId();

    // Map old widget IDs to new ones
    const widgetIdMap = new Map<string, string>();
    const newWidgets = data.widgets.map(w => {
      const newId = `${w.id.split('-')[0]}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      widgetIdMap.set(w.id, newId);
      return { ...w, id: newId, canvasId: newCanvasId };
    });

    // Update pipeline references
    const newPipelines = data.pipelines.map(p => ({
      ...p,
      id: `${p.id.split('-')[0]}-${Date.now().toString(36)}`,
      canvasId: newCanvasId,
      nodes: p.nodes.map(n => ({
        ...n,
        id: `${n.id.split('-')[0]}-${Date.now().toString(36)}`,
        widgetInstanceId: n.widgetInstanceId ? widgetIdMap.get(n.widgetInstanceId) || n.widgetInstanceId : null,
      })),
    }));

    const newData: CanvasData = {
      canvas: {
        ...data.canvas,
        id: newCanvasId,
        name: newName || `${data.canvas.name} (Copy)`,
        slug: generateSlug(),
        createdAt: new Date().toISOString(),
        hasPassword: false, // Don't copy password
      },
      widgets: newWidgets,
      pipelines: newPipelines,
      entities: data.entities.map(e => ({
        ...e,
        id: `${e.id.split('-')[0]}-${Date.now().toString(36)}`,
        widgetInstanceId: e.widgetInstanceId ? widgetIdMap.get(e.widgetInstanceId) : undefined,
      })),
    };

    saveCanvasToLocal(newData);
    await saveCanvasToSupabase(newData);

    return { success: true, data: newData.canvas };
  }

  /**
   * Update canvas metadata (name, visibility, etc.)
   */
  async updateCanvasMetadata(canvasId: string, updates: Partial<Canvas>): Promise<CanvasResult> {
    let data = await loadCanvasFromSupabase(canvasId);
    if (!data) {
      data = loadCanvasFromLocal(canvasId);
    }

    if (!data) {
      return { success: false, error: 'Canvas not found' };
    }

    data.canvas = { ...data.canvas, ...updates };

    saveCanvasToLocal(data);
    await saveCanvasToSupabase(data);

    return { success: true };
  }

  /**
   * Update canvas sharing settings
   */
  async updateShareSettings(canvasId: string, settings: CanvasShareSettings): Promise<CanvasResult<ShareUrlResult>> {
    let data = await loadCanvasFromSupabase(canvasId);
    if (!data) {
      data = loadCanvasFromLocal(canvasId);
    }

    if (!data) {
      return { success: false, error: 'Canvas not found' };
    }

    // Update canvas with new settings
    data.canvas.visibility = settings.visibility;
    data.canvas.slug = settings.slug || data.canvas.slug || generateSlug();

    // Hash password if provided
    let passwordHash: string | undefined;
    if (settings.password) {
      passwordHash = await hashPassword(settings.password);
      data.canvas.hasPassword = true;
    } else {
      data.canvas.hasPassword = false;
    }

    saveCanvasToLocal(data);
    const saveSuccess = await saveCanvasToSupabase(data, passwordHash);

    console.log('[CanvasManager] updateShareSettings saved:', {
      canvasId,
      slug: data.canvas.slug,
      visibility: data.canvas.visibility,
      saveSuccess
    });

    // Generate share URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://stickernest.vercel.app';
    const shareUrl = `${baseUrl}/c/${data.canvas.slug}`;

    return {
      success: true,
      data: {
        url: shareUrl,
        slug: data.canvas.slug!,
        visibility: data.canvas.visibility,
        hasPassword: data.canvas.hasPassword || false,
      }
    };
  }

  /**
   * Resize canvas
   */
  async resizeCanvas(canvasId: string, width: number, height: number, scaleWidgets = false): Promise<CanvasResult> {
    let data = await loadCanvasFromSupabase(canvasId);
    if (!data) {
      data = loadCanvasFromLocal(canvasId);
    }

    if (!data) {
      return { success: false, error: 'Canvas not found' };
    }

    const oldWidth = data.canvas.width || 1920;
    const oldHeight = data.canvas.height || 1080;

    data.canvas.width = width;
    data.canvas.height = height;

    // Scale widgets if requested
    if (scaleWidgets) {
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;

      data.widgets = data.widgets.map(w => ({
        ...w,
        position: {
          x: w.position.x * scaleX,
          y: w.position.y * scaleY,
        },
        width: w.width * scaleX,
        height: w.height * scaleY,
      }));
    }

    saveCanvasToLocal(data);
    await saveCanvasToSupabase(data);

    // Update Zustand store if this is the current canvas
    if (this.currentCanvasId === canvasId) {
      const store = useCanvasStore.getState();
      if (scaleWidgets) {
        data.widgets.forEach(w => store.updateWidget(w.id, w));
      }
    }

    return { success: true };
  }

  /**
   * Export canvas as JSON
   */
  async exportCanvas(canvasId: string): Promise<CanvasResult<string>> {
    let data = await loadCanvasFromSupabase(canvasId);
    if (!data) {
      data = loadCanvasFromLocal(canvasId);
    }

    if (!data) {
      return { success: false, error: 'Canvas not found' };
    }

    // Remove sensitive data
    const exportData = {
      ...data,
      canvas: {
        ...data.canvas,
        hasPassword: false,
      }
    };

    return { success: true, data: JSON.stringify(exportData, null, 2) };
  }

  /**
   * Import canvas from JSON
   */
  async importCanvas(json: string): Promise<CanvasResult<Canvas>> {
    try {
      const importedData = JSON.parse(json) as CanvasData;

      // Generate new IDs
      const newCanvasId = generateCanvasId();
      const widgetIdMap = new Map<string, string>();

      const newWidgets = importedData.widgets.map(w => {
        const newId = `widget-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
        widgetIdMap.set(w.id, newId);
        return { ...w, id: newId, canvasId: newCanvasId };
      });

      const newData: CanvasData = {
        canvas: {
          ...importedData.canvas,
          id: newCanvasId,
          userId: this.userId,
          slug: generateSlug(),
          createdAt: new Date().toISOString(),
          hasPassword: false,
        },
        widgets: newWidgets,
        pipelines: importedData.pipelines.map(p => ({
          ...p,
          id: `pipeline-${Date.now().toString(36)}`,
          canvasId: newCanvasId,
        })),
        entities: importedData.entities.map(e => ({
          ...e,
          id: `entity-${Date.now().toString(36)}`,
        })),
      };

      saveCanvasToLocal(newData);
      await saveCanvasToSupabase(newData);

      return { success: true, data: newData.canvas };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  }
}

// ==================
// Singleton Export
// ==================

let instance: CanvasManager | null = null;

export function getCanvasManager(userId: string): CanvasManager {
  if (!instance || (instance as any).userId !== userId) {
    instance = new CanvasManager(userId);
  }
  return instance;
}

// ==================
// React Hook
// ==================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useCanvasManager(userId: string) {
  const manager = useMemo(() => getCanvasManager(userId), [userId]);
  const [canvases, setCanvases] = useState<CanvasListItem[]>([]);
  const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(manager.getCurrentCanvasId());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCanvases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await manager.listCanvases();
      setCanvases(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load canvases');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    refreshCanvases();
  }, [refreshCanvases]);

  const createCanvas = useCallback(async (options: Parameters<CanvasManager['createCanvas']>[0]) => {
    setError(null);
    const result = await manager.createCanvas(options);
    if (result.success) {
      await refreshCanvases();
    } else {
      setError(result.error || 'Failed to create canvas');
    }
    return result;
  }, [manager, refreshCanvases]);

  const loadCanvas = useCallback(async (canvasId: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await manager.loadCanvas(canvasId, password);
      if (result.success) {
        setCurrentCanvasId(canvasId);
      } else {
        setError(result.error || 'Failed to load canvas');
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const saveCanvas = useCallback(async () => {
    setError(null);
    const result = await manager.saveCurrentCanvas();
    if (!result.success) {
      setError(result.error || 'Failed to save canvas');
    }
    return result;
  }, [manager]);

  const deleteCanvas = useCallback(async (canvasId: string) => {
    setError(null);
    const result = await manager.deleteCanvas(canvasId);
    if (result.success) {
      await refreshCanvases();
      if (currentCanvasId === canvasId) {
        setCurrentCanvasId(null);
      }
    } else {
      setError(result.error || 'Failed to delete canvas');
    }
    return result;
  }, [manager, refreshCanvases, currentCanvasId]);

  return {
    canvases,
    currentCanvasId,
    isLoading,
    error,
    createCanvas,
    loadCanvas,
    saveCanvas,
    deleteCanvas,
    duplicateCanvas: manager.duplicateCanvas.bind(manager),
    updateCanvasMetadata: manager.updateCanvasMetadata.bind(manager),
    updateShareSettings: manager.updateShareSettings.bind(manager),
    resizeCanvas: manager.resizeCanvas.bind(manager),
    exportCanvas: manager.exportCanvas.bind(manager),
    importCanvas: manager.importCanvas.bind(manager),
    refreshCanvases,
  };
}
