/**
 * StickerNest v2 - Pipelines Client
 * Service for managing pipeline data
 * Supports both Supabase (production) and localStorage (local dev)
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';
import type { Pipeline, PipelineNode, PipelineConnection } from '../types/domain';

// ==================
// localStorage Helpers
// ==================

const PIPELINE_STORAGE_PREFIX = 'stickernest_pipeline_';
const PIPELINE_INDEX_KEY = 'stickernest_pipeline_index';

function getLocalPipelineIndex(): Record<string, string[]> {
  try {
    const data = localStorage.getItem(PIPELINE_INDEX_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setLocalPipelineIndex(index: Record<string, string[]>): void {
  localStorage.setItem(PIPELINE_INDEX_KEY, JSON.stringify(index));
}

function getLocalPipeline(pipelineId: string): Pipeline | null {
  try {
    const data = localStorage.getItem(PIPELINE_STORAGE_PREFIX + pipelineId);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setLocalPipeline(pipeline: Pipeline): void {
  localStorage.setItem(PIPELINE_STORAGE_PREFIX + pipeline.id, JSON.stringify({
    ...pipeline,
    updatedAt: new Date().toISOString()
  }));

  // Update index
  const index = getLocalPipelineIndex();
  if (!index[pipeline.canvasId]) {
    index[pipeline.canvasId] = [];
  }
  if (!index[pipeline.canvasId].includes(pipeline.id)) {
    index[pipeline.canvasId].push(pipeline.id);
  }
  setLocalPipelineIndex(index);
}

function deleteLocalPipeline(pipelineId: string): void {
  // Find canvas and remove from index
  const index = getLocalPipelineIndex();
  for (const canvasId of Object.keys(index)) {
    index[canvasId] = index[canvasId].filter(id => id !== pipelineId);
  }
  setLocalPipelineIndex(index);
  localStorage.removeItem(PIPELINE_STORAGE_PREFIX + pipelineId);
}

function listLocalPipelinesForCanvas(canvasId: string): Pipeline[] {
  const index = getLocalPipelineIndex();
  // Include pipelines for this canvas AND 'default' canvas (for Widget Lab compatibility)
  const pipelineIds = [
    ...(index[canvasId] || []),
    ...(canvasId !== 'default' ? (index['default'] || []) : [])
  ];
  // Remove duplicates
  const uniqueIds = [...new Set(pipelineIds)];

  return uniqueIds
    .map(id => getLocalPipeline(id))
    .filter((p): p is Pipeline => p !== null)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

/**
 * List all pipelines from localStorage across all canvases
 */
function listLocalPipelinesAll(): Pipeline[] {
  const index = getLocalPipelineIndex();
  const allIds: string[] = [];

  // Collect all pipeline IDs from all canvases
  Object.values(index).forEach(canvasIds => {
    allIds.push(...canvasIds);
  });

  // Remove duplicates
  const uniqueIds = [...new Set(allIds)];

  return uniqueIds
    .map(id => getLocalPipeline(id))
    .filter((p): p is Pipeline => p !== null)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

// ==================
// Database Types
// ==================

/**
 * Database row structure for pipelines table
 * Matches the schema in supabase/schema.sql
 */
interface PipelineRow {
  id: string;
  canvas_id: string;
  name: string;
  description: string | null;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Pipeline domain object
 */
function rowToPipeline(row: PipelineRow): Pipeline {
  return {
    id: row.id,
    canvasId: row.canvas_id,
    name: row.name,
    description: row.description || undefined,
    nodes: row.nodes || [],
    connections: row.connections || [],
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Convert Pipeline domain object to database insert/update format
 */
function pipelineToRow(pipeline: Pipeline): Omit<PipelineRow, 'created_at' | 'updated_at'> {
  return {
    id: pipeline.id,
    canvas_id: pipeline.canvasId,
    name: pipeline.name,
    description: pipeline.description || null,
    nodes: pipeline.nodes,
    connections: pipeline.connections,
    enabled: pipeline.enabled
  };
}

/**
 * List all pipelines for a canvas
 * Also includes pipelines with canvasId 'default' for Widget Lab compatibility
 */
export async function listPipelinesForCanvas(canvasId: string): Promise<Pipeline[]> {
  // Use localStorage fallback if Supabase not configured or in local dev mode
  if (!supabaseClient || isLocalDevMode) {
    const localPipelines = listLocalPipelinesForCanvas(canvasId);
    return localPipelines;
  }

  try {
    // Include pipelines for this canvas AND 'default' canvas (for Widget Lab compatibility)
    const filter = canvasId === 'default'
      ? `canvas_id.eq.${canvasId}`
      : `canvas_id.eq.${canvasId},canvas_id.eq.default`;

    const { data, error } = await supabaseClient
      .from('pipelines')
      .select('*')
      .or(filter)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to list pipelines:', error);
      // Fall back to localStorage on error
      return listLocalPipelinesForCanvas(canvasId);
    }

    return (data || []).map(rowToPipeline);
  } catch (error) {
    console.error('Error listing pipelines for canvas:', canvasId, error);
    // Fall back to localStorage on error
    return listLocalPipelinesForCanvas(canvasId);
  }
}

/**
 * List all pipelines across all canvases
 */
export async function listAllPipelines(): Promise<Pipeline[]> {
  // Use localStorage fallback if Supabase not configured
  if (!supabaseClient || isLocalDevMode) {
    const localPipelines = listLocalPipelinesAll();
    console.log(`[Local Dev Mode] Loaded ${localPipelines.length} total pipelines from localStorage`);
    return localPipelines;
  }

  try {
    const { data, error } = await supabaseClient
      .from('pipelines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to list all pipelines:', error);
      return listLocalPipelinesAll();
    }

    return (data || []).map(rowToPipeline);
  } catch (error) {
    console.error('Error listing all pipelines:', error);
    return listLocalPipelinesAll();
  }
}

/**
 * Get a single pipeline by ID
 */
export async function getPipeline(pipelineId: string): Promise<Pipeline | null> {
  // Use localStorage fallback if Supabase not configured
  if (!supabaseClient || isLocalDevMode) {
    return getLocalPipeline(pipelineId);
  }

  try {
    const { data, error } = await supabaseClient
      .from('pipelines')
      .select('*')
      .eq('id', pipelineId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned, try localStorage
        return getLocalPipeline(pipelineId);
      }
      console.error('Failed to get pipeline:', error);
      return getLocalPipeline(pipelineId);
    }

    return data ? rowToPipeline(data) : null;
  } catch (error) {
    console.error('Error getting pipeline:', pipelineId, error);
    return getLocalPipeline(pipelineId);
  }
}

/**
 * Save (create or update) a pipeline
 */
export async function savePipeline(pipeline: Pipeline): Promise<{ success: boolean; error?: any }> {
  // Always save to localStorage for local backup
  setLocalPipeline(pipeline);

  // If Supabase not configured, localStorage is our primary storage
  if (!supabaseClient || isLocalDevMode) {
    console.log(`[Local Dev Mode] Saved pipeline ${pipeline.id} to localStorage`);
    return { success: true };
  }

  try {
    const row = pipelineToRow(pipeline);

    const { error } = await supabaseClient
      .from('pipelines')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save pipeline to Supabase:', error);
      // Already saved to localStorage, report success
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving pipeline:', pipeline.id, error);
    // Already saved to localStorage, report success
    return { success: true };
  }
}

/**
 * Delete a pipeline by ID
 */
export async function deletePipeline(pipelineId: string): Promise<{ success: boolean; error?: any }> {
  // Always delete from localStorage
  deleteLocalPipeline(pipelineId);

  // If Supabase not configured, localStorage is our primary storage
  if (!supabaseClient || isLocalDevMode) {
    console.log(`[Local Dev Mode] Deleted pipeline ${pipelineId} from localStorage`);
    return { success: true };
  }

  try {
    const { error } = await supabaseClient
      .from('pipelines')
      .delete()
      .eq('id', pipelineId);

    if (error) {
      console.error('Failed to delete pipeline from Supabase:', error);
      // Already deleted from localStorage
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting pipeline:', pipelineId, error);
    // Already deleted from localStorage
    return { success: true };
  }
}

/**
 * Create a new empty pipeline for a canvas
 */
export function createEmptyPipeline(canvasId: string, name: string = 'New Pipeline'): Pipeline {
  return {
    id: crypto.randomUUID(),
    canvasId,
    name,
    description: undefined,
    nodes: [],
    connections: [],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Create a pipeline node from a widget instance
 */
export function createWidgetNode(
  widgetInstanceId: string,
  position: { x: number; y: number } = { x: 0, y: 0 },
  label?: string
): PipelineNode {
  return {
    id: crypto.randomUUID(),
    widgetInstanceId,
    type: 'widget',
    position,
    label
  };
}

/**
 * Create a pipeline connection
 */
export function createConnection(
  fromNodeId: string,
  fromPortName: string,
  toNodeId: string,
  toPortName: string
): PipelineConnection {
  return {
    id: crypto.randomUUID(),
    from: { nodeId: fromNodeId, portName: fromPortName },
    to: { nodeId: toNodeId, portName: toPortName },
    enabled: true
  };
}

/**
 * Validate pipeline structure
 * Returns list of validation errors
 */
export function validatePipeline(pipeline: Pipeline): string[] {
  const errors: string[] = [];

  if (!pipeline.id) {
    errors.push('Pipeline must have an ID');
  }

  if (!pipeline.canvasId) {
    errors.push('Pipeline must have a canvas ID');
  }

  if (!pipeline.name || pipeline.name.trim() === '') {
    errors.push('Pipeline must have a name');
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of pipeline.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // Validate connections reference existing nodes
  for (const conn of pipeline.connections) {
    if (!nodeIds.has(conn.from.nodeId)) {
      errors.push(`Connection ${conn.id} references non-existent source node: ${conn.from.nodeId}`);
    }
    if (!nodeIds.has(conn.to.nodeId)) {
      errors.push(`Connection ${conn.id} references non-existent target node: ${conn.to.nodeId}`);
    }
  }

  return errors;
}

// TODO: Phase 9 - Add SQL schema migration script for pipelines table
// TODO: Phase 9 - Add real-time subscriptions for collaborative editing
