/**
 * StickerNest v2 - Dashboard Client
 * Save/load dashboards (canvas layouts, widgets, pipelines) to Supabase
 * Provides persistence layer for the entire canvas state
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';
import type { WidgetInstance, Pipeline, Canvas } from '../types/domain';
import type { Entity } from '../types/entities';

// ==================
// Types
// ==================

/** Complete dashboard state for save/load */
export interface DashboardState {
  /** Dashboard/canvas metadata */
  canvas: Canvas;
  /** All widget instances */
  widgets: WidgetInstance[];
  /** All pipelines */
  pipelines: Pipeline[];
  /** All entities */
  entities: Entity[];
  /** Dashboard version for migrations */
  version: number;
  /** Last save timestamp */
  savedAt: string;
}

/** Dashboard summary for listing */
export interface DashboardSummary {
  id: string;
  name: string;
  visibility: 'private' | 'unlisted' | 'public';
  widgetCount: number;
  pipelineCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

/** Save result */
export interface SaveResult {
  success: boolean;
  dashboardId?: string;
  error?: string;
  savedAt?: string;
}

/** Load result */
export interface LoadResult {
  success: boolean;
  dashboard?: DashboardState;
  error?: string;
}

// ==================
// Local Storage Fallback
// ==================

const STORAGE_PREFIX = 'stickernest-dashboard-';

function getLocalStorageKey(canvasId: string): string {
  return `${STORAGE_PREFIX}${canvasId}`;
}

/**
 * Save dashboard to localStorage
 */
function saveToLocalStorage(state: DashboardState): SaveResult {
  try {
    const key = getLocalStorageKey(state.canvas.id);
    const data = JSON.stringify(state);
    localStorage.setItem(key, data);
    
    // Also save to dashboard index
    const indexKey = `${STORAGE_PREFIX}index`;
    const indexData = localStorage.getItem(indexKey);
    const index: string[] = indexData ? JSON.parse(indexData) : [];
    if (!index.includes(state.canvas.id)) {
      index.push(state.canvas.id);
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
    
    return {
      success: true,
      dashboardId: state.canvas.id,
      savedAt: state.savedAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to localStorage',
    };
  }
}

/**
 * Load dashboard from localStorage
 */
function loadFromLocalStorage(canvasId: string): LoadResult {
  try {
    const key = getLocalStorageKey(canvasId);
    const data = localStorage.getItem(key);
    
    if (!data) {
      return {
        success: false,
        error: 'Dashboard not found',
      };
    }
    
    const dashboard = JSON.parse(data) as DashboardState;
    return {
      success: true,
      dashboard,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load from localStorage',
    };
  }
}

/**
 * List dashboards from localStorage
 */
function listFromLocalStorage(): DashboardSummary[] {
  try {
    const indexKey = `${STORAGE_PREFIX}index`;
    const indexData = localStorage.getItem(indexKey);
    const index: string[] = indexData ? JSON.parse(indexData) : [];
    
    return index.map(canvasId => {
      const result = loadFromLocalStorage(canvasId);
      if (result.success && result.dashboard) {
        const d = result.dashboard;
        return {
          id: d.canvas.id,
          name: d.canvas.name,
          visibility: d.canvas.visibility,
          widgetCount: d.widgets.length,
          pipelineCount: d.pipelines.length,
          createdAt: d.canvas.createdAt,
          updatedAt: d.savedAt,
        };
      }
      return null;
    }).filter((s): s is DashboardSummary => s !== null);
  } catch {
    return [];
  }
}

/**
 * Delete dashboard from localStorage
 */
function deleteFromLocalStorage(canvasId: string): boolean {
  try {
    const key = getLocalStorageKey(canvasId);
    localStorage.removeItem(key);
    
    // Update index
    const indexKey = `${STORAGE_PREFIX}index`;
    const indexData = localStorage.getItem(indexKey);
    const index: string[] = indexData ? JSON.parse(indexData) : [];
    const newIndex = index.filter(id => id !== canvasId);
    localStorage.setItem(indexKey, JSON.stringify(newIndex));
    
    return true;
  } catch {
    return false;
  }
}

// ==================
// Supabase Operations
// ==================

/**
 * Save dashboard to Supabase
 */
async function saveToSupabase(state: DashboardState, userId: string): Promise<SaveResult> {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  try {
    // Upsert canvas
    const { error: canvasError } = await supabaseClient
      .from('canvases')
      .upsert({
        id: state.canvas.id,
        user_id: userId,
        name: state.canvas.name,
        visibility: state.canvas.visibility,
        slug: state.canvas.slug,
        updated_at: new Date().toISOString(),
      });
    
    if (canvasError) {
      throw new Error(`Canvas save failed: ${canvasError.message}`);
    }
    
    // Save widget instances
    if (state.widgets.length > 0) {
      const { error: widgetsError } = await supabaseClient
        .from('widget_instances')
        .upsert(
          state.widgets.map(w => ({
            id: w.id,
            canvas_id: w.canvasId,
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
      
      if (widgetsError) {
        throw new Error(`Widgets save failed: ${widgetsError.message}`);
      }
    }
    
    // Save pipelines
    if (state.pipelines.length > 0) {
      const { error: pipelinesError } = await supabaseClient
        .from('pipelines')
        .upsert(
          state.pipelines.map(p => ({
            id: p.id,
            canvas_id: p.canvasId,
            name: p.name,
            description: p.description,
            nodes: p.nodes,
            connections: p.connections,
            enabled: p.enabled,
            widget_edits: p.widgetEdits,
            version: p.version,
          }))
        );
      
      if (pipelinesError) {
        throw new Error(`Pipelines save failed: ${pipelinesError.message}`);
      }
    }
    
    return {
      success: true,
      dashboardId: state.canvas.id,
      savedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to Supabase',
    };
  }
}

/**
 * Load dashboard from Supabase
 */
async function loadFromSupabase(canvasId: string): Promise<LoadResult> {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  try {
    // Load canvas
    const { data: canvas, error: canvasError } = await supabaseClient
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .single();
    
    if (canvasError || !canvas) {
      throw new Error('Canvas not found');
    }
    
    // Load widgets
    const { data: widgets, error: widgetsError } = await supabaseClient
      .from('widget_instances')
      .select('*')
      .eq('canvas_id', canvasId);
    
    if (widgetsError) {
      throw new Error(`Failed to load widgets: ${widgetsError.message}`);
    }
    
    // Load pipelines
    const { data: pipelines, error: pipelinesError } = await supabaseClient
      .from('pipelines')
      .select('*')
      .eq('canvas_id', canvasId);
    
    if (pipelinesError) {
      throw new Error(`Failed to load pipelines: ${pipelinesError.message}`);
    }
    
    // Transform to domain types
    const dashboard: DashboardState = {
      canvas: {
        id: canvas.id,
        userId: canvas.user_id,
        name: canvas.name,
        visibility: canvas.visibility,
        slug: canvas.slug,
        createdAt: canvas.created_at,
      },
      widgets: (widgets || []).map((w: Record<string, unknown>) => ({
        id: w.id as string,
        canvasId: w.canvas_id as string,
        widgetDefId: w.widget_def_id as string,
        position: { x: w.position_x as number, y: w.position_y as number },
        sizePreset: 'md' as const,
        width: w.width as number,
        height: w.height as number,
        rotation: w.rotation as number,
        zIndex: w.z_index as number,
        state: (w.state as Record<string, unknown>) || {},
        metadata: w.metadata as WidgetInstance['metadata'],
      })),
      pipelines: (pipelines || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        canvasId: p.canvas_id as string,
        name: p.name as string,
        description: p.description as string | undefined,
        nodes: p.nodes as Pipeline['nodes'],
        connections: p.connections as Pipeline['connections'],
        enabled: p.enabled as boolean,
        widgetEdits: p.widget_edits as Pipeline['widgetEdits'],
        version: p.version as number | undefined,
      })),
      entities: [], // Entities loaded separately
      version: 1,
      savedAt: canvas.updated_at || canvas.created_at,
    };
    
    return {
      success: true,
      dashboard,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load from Supabase',
    };
  }
}

/**
 * List dashboards from Supabase
 */
async function listFromSupabase(userId: string): Promise<DashboardSummary[]> {
  if (!supabaseClient) {
    return [];
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('canvases')
      .select(`
        id,
        name,
        visibility,
        created_at,
        updated_at,
        widget_instances(count),
        pipelines(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Failed to list dashboards:', error);
      return [];
    }
    
    return (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      name: d.name as string,
      visibility: d.visibility as 'private' | 'unlisted' | 'public',
      widgetCount: ((d.widget_instances as { count: number }[])?.[0]?.count) || 0,
      pipelineCount: ((d.pipelines as { count: number }[])?.[0]?.count) || 0,
      createdAt: d.created_at as string,
      updatedAt: (d.updated_at as string) || (d.created_at as string),
    }));
  } catch {
    return [];
  }
}

// ==================
// Dashboard Client API
// ==================

export class DashboardClient {
  private useSupabase: boolean;
  private userId: string;

  constructor(userId: string, useSupabase: boolean = false) {
    this.userId = userId;
    this.useSupabase = useSupabase;
  }

  /**
   * Save a dashboard
   */
  async save(state: DashboardState): Promise<SaveResult> {
    // Ensure timestamps
    state.savedAt = new Date().toISOString();
    state.version = state.version || 1;

    // Always save to localStorage as backup
    saveToLocalStorage(state);

    // Also save to Supabase if enabled
    if (this.useSupabase) {
      return saveToSupabase(state, this.userId);
    }

    return {
      success: true,
      dashboardId: state.canvas.id,
      savedAt: state.savedAt,
    };
  }

  /**
   * Load a dashboard
   */
  async load(canvasId: string): Promise<LoadResult> {
    // Try Supabase first if enabled
    if (this.useSupabase) {
      const result = await loadFromSupabase(canvasId);
      if (result.success) {
        return result;
      }
    }

    // Fall back to localStorage
    return loadFromLocalStorage(canvasId);
  }

  /**
   * List all dashboards
   */
  async list(): Promise<DashboardSummary[]> {
    const localDashboards = listFromLocalStorage();

    if (this.useSupabase) {
      const supabaseDashboards = await listFromSupabase(this.userId);
      
      // Merge, preferring Supabase versions
      const merged = new Map<string, DashboardSummary>();
      localDashboards.forEach(d => merged.set(d.id, d));
      supabaseDashboards.forEach(d => merged.set(d.id, d));
      
      return Array.from(merged.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return localDashboards;
  }

  /**
   * Delete a dashboard
   */
  async delete(canvasId: string): Promise<boolean> {
    // Delete from localStorage
    deleteFromLocalStorage(canvasId);

    // Delete from Supabase if enabled
    if (this.useSupabase && supabaseClient) {
      try {
        // Delete pipelines first (foreign key)
        await supabaseClient
          .from('pipelines')
          .delete()
          .eq('canvas_id', canvasId);
        
        // Delete widget instances
        await supabaseClient
          .from('widget_instances')
          .delete()
          .eq('canvas_id', canvasId);
        
        // Delete canvas
        const { error } = await supabaseClient
          .from('canvases')
          .delete()
          .eq('id', canvasId);
        
        if (error) {
          console.error('Failed to delete from Supabase:', error);
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a new dashboard
   */
  async create(name: string, visibility: 'private' | 'unlisted' | 'public' = 'private'): Promise<SaveResult> {
    const canvasId = `canvas-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    
    const state: DashboardState = {
      canvas: {
        id: canvasId,
        userId: this.userId,
        name,
        visibility,
        createdAt: new Date().toISOString(),
      },
      widgets: [],
      pipelines: [],
      entities: [],
      version: 1,
      savedAt: new Date().toISOString(),
    };

    return this.save(state);
  }

  /**
   * Duplicate a dashboard
   */
  async duplicate(canvasId: string, newName?: string): Promise<SaveResult> {
    const result = await this.load(canvasId);
    if (!result.success || !result.dashboard) {
      return { success: false, error: 'Failed to load dashboard' };
    }

    const original = result.dashboard;
    const newCanvasId = `canvas-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Create ID mapping for widgets
    const widgetIdMap = new Map<string, string>();
    const newWidgets = original.widgets.map(w => {
      const newId = `${w.id}-${Date.now().toString(36)}`;
      widgetIdMap.set(w.id, newId);
      return { ...w, id: newId, canvasId: newCanvasId };
    });

    // Update pipeline node references
    const newPipelines = original.pipelines.map(p => ({
      ...p,
      id: `${p.id}-${Date.now().toString(36)}`,
      canvasId: newCanvasId,
      nodes: p.nodes.map(n => ({
        ...n,
        id: `${n.id}-${Date.now().toString(36)}`,
        widgetInstanceId: n.widgetInstanceId ? widgetIdMap.get(n.widgetInstanceId) || n.widgetInstanceId : null,
      })),
    }));

    const newState: DashboardState = {
      canvas: {
        ...original.canvas,
        id: newCanvasId,
        name: newName || `${original.canvas.name} (Copy)`,
        createdAt: new Date().toISOString(),
      },
      widgets: newWidgets,
      pipelines: newPipelines,
      entities: original.entities.map(e => ({
        ...e,
        id: `${e.id}-${Date.now().toString(36)}`,
        widgetInstanceId: e.widgetInstanceId ? widgetIdMap.get(e.widgetInstanceId) || e.widgetInstanceId : undefined,
      })),
      version: 1,
      savedAt: new Date().toISOString(),
    };

    return this.save(newState);
  }

  /**
   * Export dashboard as JSON
   */
  async exportJSON(canvasId: string): Promise<string | null> {
    const result = await this.load(canvasId);
    if (!result.success || !result.dashboard) {
      return null;
    }
    return JSON.stringify(result.dashboard, null, 2);
  }

  /**
   * Import dashboard from JSON
   */
  async importJSON(json: string): Promise<SaveResult> {
    try {
      const state = JSON.parse(json) as DashboardState;
      
      // Generate new IDs to avoid conflicts
      const newCanvasId = `canvas-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      state.canvas.id = newCanvasId;
      state.canvas.userId = this.userId;
      state.canvas.createdAt = new Date().toISOString();
      
      // Update canvas ID references
      state.widgets.forEach(w => w.canvasId = newCanvasId);
      state.pipelines.forEach(p => p.canvasId = newCanvasId);
      
      return this.save(state);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }
}

// ==================
// Singleton
// ==================

let clientInstance: DashboardClient | null = null;

/**
 * Get the dashboard client singleton
 */
export function getDashboardClient(userId: string, useSupabase: boolean = false): DashboardClient {
  if (!clientInstance || clientInstance['userId'] !== userId) {
    clientInstance = new DashboardClient(userId, useSupabase);
  }
  return clientInstance;
}

// ==================
// Helper Functions (for simpler imports)
// ==================

/**
 * Save dashboard - uses Supabase when configured, localStorage as backup
 */
export async function saveDashboard(state: DashboardState): Promise<SaveResult> {
  // Always save to localStorage as backup
  const localResult = saveToLocalStorage(state);

  // Also save to Supabase if configured
  if (!isLocalDevMode && supabaseClient) {
    const supabaseResult = await saveToSupabase(state, state.canvas.userId);
    if (!supabaseResult.success) {
      console.warn('[Dashboard] Supabase save failed, using localStorage:', supabaseResult.error);
    }
    return supabaseResult.success ? supabaseResult : localResult;
  }

  return localResult;
}

/**
 * Load dashboard - tries Supabase first, falls back to localStorage
 */
export async function loadDashboard(canvasId: string): Promise<LoadResult> {
  // Try Supabase first if configured
  if (!isLocalDevMode && supabaseClient) {
    const supabaseResult = await loadFromSupabase(canvasId);
    if (supabaseResult.success) {
      return supabaseResult;
    }
    console.warn('[Dashboard] Supabase load failed, trying localStorage:', supabaseResult.error);
  }

  // Fall back to localStorage
  return loadFromLocalStorage(canvasId);
}

/**
 * List all dashboards - merges Supabase and localStorage
 */
export async function listDashboards(userId?: string): Promise<DashboardSummary[]> {
  const localDashboards = listFromLocalStorage();

  // Also get from Supabase if configured
  if (!isLocalDevMode && supabaseClient && userId) {
    const supabaseDashboards = await listFromSupabase(userId);

    // Merge, preferring Supabase versions (more up-to-date)
    const merged = new Map<string, DashboardSummary>();
    localDashboards.forEach(d => merged.set(d.id, d));
    supabaseDashboards.forEach(d => merged.set(d.id, d));

    return Array.from(merged.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return localDashboards;
}

/**
 * Delete dashboard from both Supabase and localStorage
 */
export async function deleteDashboard(canvasId: string): Promise<{ success: boolean; error?: string }> {
  // Delete from localStorage
  deleteFromLocalStorage(canvasId);

  // Also delete from Supabase if configured
  if (!isLocalDevMode && supabaseClient) {
    try {
      // Delete pipelines first (foreign key)
      await supabaseClient
        .from('pipelines')
        .delete()
        .eq('canvas_id', canvasId);

      // Delete widget instances
      await supabaseClient
        .from('widget_instances')
        .delete()
        .eq('canvas_id', canvasId);

      // Delete canvas
      const { error } = await supabaseClient
        .from('canvases')
        .delete()
        .eq('id', canvasId);

      if (error) {
        console.warn('[Dashboard] Supabase delete failed:', error);
      }
    } catch (err) {
      console.warn('[Dashboard] Supabase delete error:', err);
    }
  }

  return { success: true };
}

/**
 * Export dashboard as JSON string
 */
export async function exportDashboard(canvasId: string): Promise<{ success: boolean; json?: string; error?: string }> {
  const result = await loadDashboard(canvasId);
  if (result.success && result.dashboard) {
    return { success: true, json: JSON.stringify(result.dashboard, null, 2) };
  }
  return { success: false, error: result.error || 'Dashboard not found' };
}

/**
 * Import dashboard from JSON string
 */
export async function importDashboard(json: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const dashboard = JSON.parse(json) as DashboardState;
    // Update userId to current user
    dashboard.canvas.userId = userId;
    return saveDashboard(dashboard);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

