/**
 * StickerNest v2 - Spatial Sticker Service
 *
 * Service for persisting spatial stickers to Supabase database.
 * Handles CRUD operations for:
 * - Spatial stickers (3D transforms, anchors, visibility)
 * - Registered QR codes
 * - Persistent XR anchors
 * - Scene configuration
 *
 * Features:
 * - Database persistence via Supabase
 * - Debounced save to prevent excessive writes
 * - Local storage fallback for offline/dev mode
 * - Batch operations for canvas-level saves
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';
import {
  SpatialSticker,
  SpatialAnchor,
  RegisteredQRCode,
  SpatialSceneConfig,
} from '../types/spatialEntity';
import {
  useSpatialStickerStore,
  PersistentAnchorData,
} from '../state/useSpatialStickerStore';

// ==================
// Types
// ==================

export interface SpatialStickerRow {
  id: string;
  canvas_id: string;
  user_id: string;
  name: string;
  media_type: string;
  media_src: string | null;
  position_2d: { x: number; y: number };
  size_2d: { width: number; height: number };
  rotation_2d: number;
  z_index: number;
  transform_3d: object;
  anchor: object;
  billboard_3d: boolean;
  model_3d_config: object | null;
  primitive_3d_config: object | null;
  click_behavior: string;
  linked_widget_def_id: string | null;
  linked_widget_instance_id: string | null;
  linked_url: string | null;
  linked_event: string | null;
  linked_pipeline_id: string | null;
  opacity: number;
  hover_animation: string | null;
  click_animation: string | null;
  cast_shadow: boolean;
  receive_shadow: boolean;
  locked: boolean;
  visible_in: { desktop: boolean; vr: boolean; ar: boolean };
  layer_id: string | null;
  group_id: string | null;
  metadata: object | null;
  created_at: string;
  updated_at: string;
}

export interface SpatialQRCodeRow {
  id: string;
  canvas_id: string;
  user_id: string;
  content: string;
  label: string;
  size_meters: number;
  attached_sticker_ids: string[];
  created_at: string;
  last_scanned: string | null;
}

export interface SpatialAnchorRow {
  id: string;
  canvas_id: string;
  user_id: string;
  handle: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  rotation_w: number;
  label: string | null;
  created_at: string;
}

export interface SpatialSceneConfigRow {
  canvas_id: string;
  user_id: string;
  show_room_visualization: boolean;
  enable_occlusion: boolean;
  enable_shadows: boolean;
  ambient_intensity: number;
  vr_environment: string;
  custom_environment_url: string | null;
  show_floor_grid: boolean;
  snap_to_surfaces: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  savedCount?: number;
}

// ==================
// Debounce State
// ==================

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 500;

// ==================
// Conversion Functions - Spatial Stickers
// ==================

/**
 * Convert SpatialSticker to database row format
 */
function stickerToRow(sticker: SpatialSticker, userId: string): Partial<SpatialStickerRow> {
  return {
    id: sticker.id,
    canvas_id: sticker.canvasId,
    user_id: userId,
    name: sticker.name,
    media_type: sticker.mediaType,
    media_src: sticker.mediaSrc || null,
    position_2d: sticker.position2D,
    size_2d: sticker.size2D,
    rotation_2d: sticker.rotation2D,
    z_index: sticker.zIndex,
    transform_3d: sticker.transform3D,
    anchor: sticker.anchor,
    billboard_3d: sticker.billboard3D ?? false,
    model_3d_config: sticker.model3DConfig || null,
    primitive_3d_config: sticker.primitive3DConfig || null,
    click_behavior: sticker.clickBehavior,
    linked_widget_def_id: sticker.linkedWidgetDefId || null,
    linked_widget_instance_id: sticker.linkedWidgetInstanceId || null,
    linked_url: sticker.linkedUrl || null,
    linked_event: sticker.linkedEvent || null,
    linked_pipeline_id: sticker.linkedPipelineId || null,
    opacity: sticker.opacity,
    hover_animation: sticker.hoverAnimation || null,
    click_animation: sticker.clickAnimation || null,
    cast_shadow: sticker.castShadow ?? true,
    receive_shadow: sticker.receiveShadow ?? true,
    locked: sticker.locked,
    visible_in: sticker.visibleIn,
    layer_id: sticker.layerId || null,
    group_id: sticker.groupId || null,
    metadata: sticker.metadata || null,
  };
}

/**
 * Convert database row to SpatialSticker
 */
function rowToSticker(row: SpatialStickerRow): SpatialSticker {
  return {
    id: row.id,
    canvasId: row.canvas_id,
    name: row.name,
    mediaType: row.media_type as SpatialSticker['mediaType'],
    mediaSrc: row.media_src || '',
    position2D: row.position_2d,
    size2D: row.size_2d,
    rotation2D: row.rotation_2d,
    zIndex: row.z_index,
    transform3D: row.transform_3d as SpatialSticker['transform3D'],
    anchor: row.anchor as SpatialAnchor,
    billboard3D: row.billboard_3d,
    model3DConfig: row.model_3d_config as SpatialSticker['model3DConfig'],
    primitive3DConfig: row.primitive_3d_config as SpatialSticker['primitive3DConfig'],
    clickBehavior: row.click_behavior as SpatialSticker['clickBehavior'],
    linkedWidgetDefId: row.linked_widget_def_id || undefined,
    linkedWidgetInstanceId: row.linked_widget_instance_id || undefined,
    linkedUrl: row.linked_url || undefined,
    linkedEvent: row.linked_event || undefined,
    linkedPipelineId: row.linked_pipeline_id || undefined,
    opacity: row.opacity,
    hoverAnimation: row.hover_animation as SpatialSticker['hoverAnimation'],
    clickAnimation: row.click_animation as SpatialSticker['clickAnimation'],
    castShadow: row.cast_shadow,
    receiveShadow: row.receive_shadow,
    locked: row.locked,
    visibleIn: row.visible_in,
    layerId: row.layer_id || undefined,
    groupId: row.group_id || undefined,
    metadata: row.metadata as SpatialSticker['metadata'],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// ==================
// Conversion Functions - QR Codes
// ==================

function qrCodeToRow(qrCode: RegisteredQRCode, userId: string, canvasId: string): Partial<SpatialQRCodeRow> {
  return {
    id: qrCode.id,
    canvas_id: canvasId,
    user_id: userId,
    content: qrCode.content,
    label: qrCode.label,
    size_meters: qrCode.sizeMeters,
    attached_sticker_ids: qrCode.attachedStickerIds,
    last_scanned: qrCode.lastScanned ? new Date(qrCode.lastScanned).toISOString() : null,
  };
}

function rowToQRCode(row: SpatialQRCodeRow): RegisteredQRCode {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    label: row.label,
    sizeMeters: row.size_meters,
    attachedStickerIds: row.attached_sticker_ids || [],
    createdAt: new Date(row.created_at).getTime(),
    lastScanned: row.last_scanned ? new Date(row.last_scanned).getTime() : undefined,
  };
}

// ==================
// Conversion Functions - Anchors
// ==================

function anchorToRow(anchor: PersistentAnchorData, userId: string, canvasId: string): Partial<SpatialAnchorRow> {
  return {
    canvas_id: canvasId,
    user_id: userId,
    handle: anchor.handle,
    position_x: anchor.position[0],
    position_y: anchor.position[1],
    position_z: anchor.position[2],
    rotation_x: anchor.rotation[0],
    rotation_y: anchor.rotation[1],
    rotation_z: anchor.rotation[2],
    rotation_w: anchor.rotation[3],
    label: anchor.label || null,
  };
}

function rowToAnchor(row: SpatialAnchorRow): PersistentAnchorData {
  return {
    handle: row.handle,
    position: [row.position_x, row.position_y, row.position_z],
    rotation: [row.rotation_x, row.rotation_y, row.rotation_z, row.rotation_w],
    label: row.label || undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ==================
// Conversion Functions - Scene Config
// ==================

function sceneConfigToRow(config: SpatialSceneConfig, userId: string, canvasId: string): Partial<SpatialSceneConfigRow> {
  return {
    canvas_id: canvasId,
    user_id: userId,
    show_room_visualization: config.showRoomVisualization,
    enable_occlusion: config.enableOcclusion,
    enable_shadows: config.enableShadows,
    ambient_intensity: config.ambientIntensity,
    vr_environment: config.vrEnvironment,
    custom_environment_url: config.customEnvironmentUrl || null,
    show_floor_grid: config.showFloorGrid,
    snap_to_surfaces: config.snapToSurfaces,
  };
}

function rowToSceneConfig(row: SpatialSceneConfigRow): SpatialSceneConfig {
  return {
    showRoomVisualization: row.show_room_visualization,
    enableOcclusion: row.enable_occlusion,
    enableShadows: row.enable_shadows,
    ambientIntensity: row.ambient_intensity,
    vrEnvironment: row.vr_environment as SpatialSceneConfig['vrEnvironment'],
    customEnvironmentUrl: row.custom_environment_url || undefined,
    showFloorGrid: row.show_floor_grid,
    snapToSurfaces: row.snap_to_surfaces,
  };
}

// ==================
// Service Functions - Spatial Stickers
// ==================

/**
 * Load all spatial stickers for a canvas
 */
export async function loadSpatialStickers(
  canvasId: string,
  userId: string
): Promise<SpatialSticker[]> {
  if (isLocalDevMode || !supabaseClient) {
    console.log('[SpatialStickerService] Local mode - loading from Zustand store');
    return useSpatialStickerStore.getState().getSpatialStickersByCanvas(canvasId);
  }

  try {
    const { data, error } = await supabaseClient
      .from('spatial_stickers')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('z_index', { ascending: true });

    if (error) {
      console.error('[SpatialStickerService] Load error:', error);
      return [];
    }

    const stickers = (data || []).map(rowToSticker);
    console.log(`[SpatialStickerService] Loaded ${stickers.length} spatial stickers for canvas ${canvasId}`);

    // Sync to Zustand store
    const store = useSpatialStickerStore.getState();
    stickers.forEach((sticker) => {
      store.addSpatialSticker(sticker);
    });

    return stickers;
  } catch (error) {
    console.error('[SpatialStickerService] Load exception:', error);
    return [];
  }
}

/**
 * Save a single spatial sticker (debounced)
 */
export function saveSpatialSticker(
  sticker: SpatialSticker,
  userId: string,
  immediate = false
): void {
  const existingTimeout = pendingSaves.get(sticker.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(sticker.id);

    if (isLocalDevMode || !supabaseClient) {
      console.log(`[SpatialStickerService] Local mode - saved ${sticker.id} to Zustand`);
      return;
    }

    try {
      const row = stickerToRow(sticker, userId);

      const { error } = await supabaseClient
        .from('spatial_stickers')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.error('[SpatialStickerService] Save error:', error);
      } else {
        console.log(`[SpatialStickerService] Saved spatial sticker ${sticker.id}`);
      }
    } catch (error) {
      console.error('[SpatialStickerService] Save exception:', error);
    }
  };

  if (immediate) {
    doSave();
  } else {
    const timeout = setTimeout(doSave, DEBOUNCE_MS);
    pendingSaves.set(sticker.id, timeout);
  }
}

/**
 * Save 3D transform only (for frequent position/rotation updates)
 */
export function saveSpatialTransform(
  stickerId: string,
  position: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number },
  userId: string
): void {
  const key = `${stickerId}:transform`;
  const existingTimeout = pendingSaves.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(key);

    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('spatial_stickers')
        .update({
          transform_3d: { position, rotation, scale },
          updated_at: new Date().toISOString(),
        })
        .eq('id', stickerId);

      if (error) {
        console.error('[SpatialStickerService] Transform save error:', error);
      }
    } catch (error) {
      console.error('[SpatialStickerService] Transform save exception:', error);
    }
  };

  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(key, timeout);
}

/**
 * Save anchor only
 */
export function saveSpatialAnchor(
  stickerId: string,
  anchor: SpatialAnchor,
  userId: string
): void {
  const key = `${stickerId}:anchor`;
  const existingTimeout = pendingSaves.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(key);

    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('spatial_stickers')
        .update({
          anchor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stickerId);

      if (error) {
        console.error('[SpatialStickerService] Anchor save error:', error);
      }
    } catch (error) {
      console.error('[SpatialStickerService] Anchor save exception:', error);
    }
  };

  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(key, timeout);
}

/**
 * Delete a spatial sticker
 */
export async function deleteSpatialSticker(stickerId: string): Promise<boolean> {
  // Remove from Zustand store
  useSpatialStickerStore.getState().removeSpatialSticker(stickerId);

  // Clear any pending saves
  pendingSaves.forEach((timeout, key) => {
    if (key.startsWith(stickerId)) {
      clearTimeout(timeout);
      pendingSaves.delete(key);
    }
  });

  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from('spatial_stickers')
      .delete()
      .eq('id', stickerId);

    if (error) {
      console.error('[SpatialStickerService] Delete error:', error);
      return false;
    }

    console.log(`[SpatialStickerService] Deleted spatial sticker ${stickerId}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Delete exception:', error);
    return false;
  }
}

/**
 * Save all spatial stickers for a canvas (batch operation)
 */
export async function saveAllSpatialStickers(
  stickers: SpatialSticker[],
  userId: string
): Promise<SaveResult> {
  // Flush any pending saves first
  pendingSaves.forEach((timeout) => clearTimeout(timeout));
  pendingSaves.clear();

  if (isLocalDevMode || !supabaseClient) {
    console.log(`[SpatialStickerService] Local mode - saved ${stickers.length} stickers to Zustand`);
    return { success: true, savedCount: stickers.length };
  }

  try {
    const rows = stickers.map((s) => stickerToRow(s, userId));

    const { error } = await supabaseClient
      .from('spatial_stickers')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[SpatialStickerService] Batch save error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[SpatialStickerService] Batch saved ${stickers.length} spatial stickers`);
    return { success: true, savedCount: stickers.length };
  } catch (error) {
    console.error('[SpatialStickerService] Batch save exception:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ==================
// Service Functions - QR Codes
// ==================

/**
 * Load all registered QR codes for a canvas
 */
export async function loadQRCodes(
  canvasId: string,
  userId: string
): Promise<RegisteredQRCode[]> {
  if (isLocalDevMode || !supabaseClient) {
    console.log('[SpatialStickerService] Local mode - loading QR codes from Zustand');
    return Array.from(useSpatialStickerStore.getState().registeredQRCodes.values());
  }

  try {
    const { data, error } = await supabaseClient
      .from('spatial_qr_codes')
      .select('*')
      .eq('canvas_id', canvasId);

    if (error) {
      console.error('[SpatialStickerService] Load QR codes error:', error);
      return [];
    }

    const qrCodes = (data || []).map(rowToQRCode);
    console.log(`[SpatialStickerService] Loaded ${qrCodes.length} QR codes`);

    // Sync to Zustand store
    const store = useSpatialStickerStore.getState();
    qrCodes.forEach((qr) => {
      store.registerQRCode(qr);
    });

    return qrCodes;
  } catch (error) {
    console.error('[SpatialStickerService] Load QR codes exception:', error);
    return [];
  }
}

/**
 * Save a registered QR code
 */
export async function saveQRCode(
  qrCode: RegisteredQRCode,
  userId: string,
  canvasId: string
): Promise<boolean> {
  if (isLocalDevMode || !supabaseClient) {
    console.log(`[SpatialStickerService] Local mode - saved QR code ${qrCode.content}`);
    return true;
  }

  try {
    const row = qrCodeToRow(qrCode, userId, canvasId);

    const { error } = await supabaseClient
      .from('spatial_qr_codes')
      .upsert(row, { onConflict: 'canvas_id,content' });

    if (error) {
      console.error('[SpatialStickerService] Save QR code error:', error);
      return false;
    }

    console.log(`[SpatialStickerService] Saved QR code ${qrCode.content}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Save QR code exception:', error);
    return false;
  }
}

/**
 * Delete a registered QR code
 */
export async function deleteQRCode(
  content: string,
  canvasId: string
): Promise<boolean> {
  useSpatialStickerStore.getState().unregisterQRCode(content);

  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from('spatial_qr_codes')
      .delete()
      .eq('canvas_id', canvasId)
      .eq('content', content);

    if (error) {
      console.error('[SpatialStickerService] Delete QR code error:', error);
      return false;
    }

    console.log(`[SpatialStickerService] Deleted QR code ${content}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Delete QR code exception:', error);
    return false;
  }
}

// ==================
// Service Functions - Persistent Anchors
// ==================

/**
 * Load all persistent anchors for a canvas
 */
export async function loadPersistentAnchors(
  canvasId: string,
  userId: string
): Promise<PersistentAnchorData[]> {
  if (isLocalDevMode || !supabaseClient) {
    console.log('[SpatialStickerService] Local mode - loading anchors from Zustand');
    return Array.from(useSpatialStickerStore.getState().persistentAnchors.values());
  }

  try {
    const { data, error } = await supabaseClient
      .from('spatial_anchors')
      .select('*')
      .eq('canvas_id', canvasId);

    if (error) {
      console.error('[SpatialStickerService] Load anchors error:', error);
      return [];
    }

    const anchors = (data || []).map(rowToAnchor);
    console.log(`[SpatialStickerService] Loaded ${anchors.length} persistent anchors`);

    // Sync to Zustand store
    const store = useSpatialStickerStore.getState();
    anchors.forEach((anchor) => {
      store.savePersistentAnchor(anchor);
    });

    return anchors;
  } catch (error) {
    console.error('[SpatialStickerService] Load anchors exception:', error);
    return [];
  }
}

/**
 * Save a persistent anchor
 */
export async function savePersistentAnchor(
  anchor: PersistentAnchorData,
  userId: string,
  canvasId: string
): Promise<boolean> {
  if (isLocalDevMode || !supabaseClient) {
    console.log(`[SpatialStickerService] Local mode - saved anchor ${anchor.handle}`);
    return true;
  }

  try {
    const row = anchorToRow(anchor, userId, canvasId);

    const { error } = await supabaseClient
      .from('spatial_anchors')
      .upsert(row, { onConflict: 'canvas_id,handle' });

    if (error) {
      console.error('[SpatialStickerService] Save anchor error:', error);
      return false;
    }

    console.log(`[SpatialStickerService] Saved anchor ${anchor.handle}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Save anchor exception:', error);
    return false;
  }
}

/**
 * Delete a persistent anchor
 */
export async function deletePersistentAnchor(
  handle: string,
  canvasId: string
): Promise<boolean> {
  useSpatialStickerStore.getState().removePersistentAnchor(handle);

  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from('spatial_anchors')
      .delete()
      .eq('canvas_id', canvasId)
      .eq('handle', handle);

    if (error) {
      console.error('[SpatialStickerService] Delete anchor error:', error);
      return false;
    }

    console.log(`[SpatialStickerService] Deleted anchor ${handle}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Delete anchor exception:', error);
    return false;
  }
}

// ==================
// Service Functions - Scene Config
// ==================

/**
 * Load scene configuration for a canvas
 */
export async function loadSceneConfig(
  canvasId: string,
  userId: string
): Promise<SpatialSceneConfig | null> {
  if (isLocalDevMode || !supabaseClient) {
    console.log('[SpatialStickerService] Local mode - loading scene config from Zustand');
    return useSpatialStickerStore.getState().sceneConfig;
  }

  try {
    const { data, error } = await supabaseClient
      .from('spatial_scene_configs')
      .select('*')
      .eq('canvas_id', canvasId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No config found - use defaults
        console.log('[SpatialStickerService] No scene config found, using defaults');
        return null;
      }
      console.error('[SpatialStickerService] Load scene config error:', error);
      return null;
    }

    const config = rowToSceneConfig(data);
    console.log(`[SpatialStickerService] Loaded scene config for canvas ${canvasId}`);

    // Sync to Zustand store
    useSpatialStickerStore.getState().updateSceneConfig(config);

    return config;
  } catch (error) {
    console.error('[SpatialStickerService] Load scene config exception:', error);
    return null;
  }
}

/**
 * Save scene configuration
 */
export async function saveSceneConfig(
  config: SpatialSceneConfig,
  userId: string,
  canvasId: string
): Promise<boolean> {
  if (isLocalDevMode || !supabaseClient) {
    console.log(`[SpatialStickerService] Local mode - saved scene config`);
    return true;
  }

  try {
    const row = sceneConfigToRow(config, userId, canvasId);

    const { error } = await supabaseClient
      .from('spatial_scene_configs')
      .upsert(row, { onConflict: 'canvas_id' });

    if (error) {
      console.error('[SpatialStickerService] Save scene config error:', error);
      return false;
    }

    console.log(`[SpatialStickerService] Saved scene config for canvas ${canvasId}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Save scene config exception:', error);
    return false;
  }
}

// ==================
// Full Canvas Load/Save
// ==================

/**
 * Load all spatial data for a canvas
 */
export async function loadSpatialData(canvasId: string, userId: string): Promise<{
  stickers: SpatialSticker[];
  qrCodes: RegisteredQRCode[];
  anchors: PersistentAnchorData[];
  sceneConfig: SpatialSceneConfig | null;
}> {
  const [stickers, qrCodes, anchors, sceneConfig] = await Promise.all([
    loadSpatialStickers(canvasId, userId),
    loadQRCodes(canvasId, userId),
    loadPersistentAnchors(canvasId, userId),
    loadSceneConfig(canvasId, userId),
  ]);

  return { stickers, qrCodes, anchors, sceneConfig };
}

/**
 * Save all spatial data for a canvas
 */
export async function saveSpatialData(
  canvasId: string,
  userId: string,
  data: {
    stickers: SpatialSticker[];
    qrCodes: RegisteredQRCode[];
    anchors: PersistentAnchorData[];
    sceneConfig: SpatialSceneConfig;
  }
): Promise<SaveResult> {
  try {
    const results = await Promise.all([
      saveAllSpatialStickers(data.stickers, userId),
      ...data.qrCodes.map((qr) => saveQRCode(qr, userId, canvasId)),
      ...data.anchors.map((anchor) => savePersistentAnchor(anchor, userId, canvasId)),
      saveSceneConfig(data.sceneConfig, userId, canvasId),
    ]);

    const stickerResult = results[0] as SaveResult;
    const allSuccess = stickerResult.success && results.slice(1).every((r) => r === true);

    if (allSuccess) {
      console.log(`[SpatialStickerService] Saved all spatial data for canvas ${canvasId}`);
      return { success: true, savedCount: data.stickers.length };
    } else {
      return { success: false, error: 'Some items failed to save' };
    }
  } catch (error) {
    console.error('[SpatialStickerService] Save spatial data exception:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete all spatial data for a canvas
 */
export async function deleteSpatialData(canvasId: string): Promise<boolean> {
  // Clear from Zustand store
  useSpatialStickerStore.getState().clearSpatialStickers(canvasId);

  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    // Delete in order due to foreign keys (stickers first, then config, etc.)
    const { error: stickersError } = await supabaseClient
      .from('spatial_stickers')
      .delete()
      .eq('canvas_id', canvasId);

    const { error: qrError } = await supabaseClient
      .from('spatial_qr_codes')
      .delete()
      .eq('canvas_id', canvasId);

    const { error: anchorsError } = await supabaseClient
      .from('spatial_anchors')
      .delete()
      .eq('canvas_id', canvasId);

    const { error: configError } = await supabaseClient
      .from('spatial_scene_configs')
      .delete()
      .eq('canvas_id', canvasId);

    if (stickersError || qrError || anchorsError || configError) {
      console.error('[SpatialStickerService] Delete spatial data errors:', {
        stickersError,
        qrError,
        anchorsError,
        configError,
      });
      return false;
    }

    console.log(`[SpatialStickerService] Deleted all spatial data for canvas ${canvasId}`);
    return true;
  } catch (error) {
    console.error('[SpatialStickerService] Delete spatial data exception:', error);
    return false;
  }
}

/**
 * Flush all pending saves (call on unmount/navigation)
 */
export function flushPendingSaves(): void {
  pendingSaves.forEach((timeout) => clearTimeout(timeout));
  pendingSaves.clear();
  console.log('[SpatialStickerService] Flushed pending saves');
}
