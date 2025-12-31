/**
 * StickerNest - SpatialWidgetContainer
 *
 * Renders 2D widgets in 3D space for VR/AR modes.
 * Each widget becomes a floating panel that can be grabbed, moved, and resized.
 *
 * Key features:
 * - Converts 2D canvas positions to 3D world coordinates
 * - Renders widget HTML as a texture on a 3D plane (via iframe capture)
 * - Supports grab interactions for repositioning
 * - Supports 3D rotation and Z-axis manipulation
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Text, Html, useCursor } from '@react-three/drei';
import { useXRInputSourceState, useXR } from '@react-three/xr';
import { Vector3, Euler, Quaternion, Mesh, Group } from 'three';
import type { WidgetInstance } from '../../types/domain';
import {
  toSpatialPosition,
  toSpatialSize,
  toSpatialRotation,
  PIXELS_PER_METER,
  DEFAULT_WIDGET_Z,
  DEFAULT_EYE_HEIGHT,
} from '../../utils/spatialCoordinates';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { getBuiltinWidget } from '../../widgets/builtin';

// ============================================================================
// VR Widget HTML Cache
// ============================================================================

/**
 * Cache for fetched widget HTML content (for local/remote widgets)
 * This prevents re-fetching on every render in VR mode
 */
const vrWidgetHtmlCache = new Map<string, string>();
const vrWidgetHtmlFetchStatus = new Map<string, 'pending' | 'success' | 'error'>();

/**
 * Get cached HTML or null if not available
 */
function getCachedWidgetHtml(widgetDefId: string): string | null {
  return vrWidgetHtmlCache.get(widgetDefId) || null;
}

/**
 * Fetch and cache HTML for a local widget
 */
async function fetchAndCacheWidgetHtml(widgetDefId: string, source: string | undefined): Promise<string | null> {
  // Check if already fetching or cached
  const status = vrWidgetHtmlFetchStatus.get(widgetDefId);
  if (status === 'success') {
    return vrWidgetHtmlCache.get(widgetDefId) || null;
  }
  if (status === 'pending') {
    return null; // Still fetching
  }

  // Only fetch for local widgets
  if (source !== 'local') {
    console.log(`[VR Widget] Skipping fetch for non-local widget: ${widgetDefId} (source: ${source})`);
    return null;
  }

  vrWidgetHtmlFetchStatus.set(widgetDefId, 'pending');

  try {
    // First try to get the manifest to find the entry file
    const manifestResponse = await fetch(`/test-widgets/${widgetDefId}/manifest.json`);
    if (!manifestResponse.ok) {
      throw new Error(`Manifest not found for ${widgetDefId}`);
    }
    const manifest = await manifestResponse.json();
    const entry = manifest.entry || 'index.html';

    // Fetch the entry HTML
    const htmlResponse = await fetch(`/test-widgets/${widgetDefId}/${entry}`);
    if (!htmlResponse.ok) {
      throw new Error(`Entry file not found: ${entry}`);
    }
    const html = await htmlResponse.text();

    console.log(`[VR Widget] Fetched HTML for ${widgetDefId} (${html.length} chars)`);
    vrWidgetHtmlCache.set(widgetDefId, html);
    vrWidgetHtmlFetchStatus.set(widgetDefId, 'success');
    return html;
  } catch (error) {
    console.error(`[VR Widget] Failed to fetch HTML for ${widgetDefId}:`, error);
    vrWidgetHtmlFetchStatus.set(widgetDefId, 'error');
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get an emoji icon for a widget type based on its definition ID
 */
function getWidgetTypeEmoji(widgetDefId: string): string {
  const defLower = widgetDefId.toLowerCase();

  // Media widgets
  if (defLower.includes('image') || defLower.includes('photo')) return '🖼️';
  if (defLower.includes('video')) return '🎬';
  if (defLower.includes('audio') || defLower.includes('music')) return '🎵';
  if (defLower.includes('camera')) return '📷';

  // Social widgets
  if (defLower.includes('chat') || defLower.includes('message')) return '💬';
  if (defLower.includes('feed') || defLower.includes('post')) return '📰';
  if (defLower.includes('profile') || defLower.includes('user')) return '👤';
  if (defLower.includes('friend') || defLower.includes('social')) return '👥';
  if (defLower.includes('notification') || defLower.includes('alert')) return '🔔';

  // Commerce widgets
  if (defLower.includes('cart') || defLower.includes('shopping')) return '🛒';
  if (defLower.includes('product') || defLower.includes('store')) return '🏪';
  if (defLower.includes('payment') || defLower.includes('checkout')) return '💳';
  if (defLower.includes('grocery') || defLower.includes('food')) return '🥬';

  // Utility widgets
  if (defLower.includes('clock') || defLower.includes('time')) return '🕐';
  if (defLower.includes('weather')) return '🌤️';
  if (defLower.includes('calendar') || defLower.includes('date')) return '📅';
  if (defLower.includes('note') || defLower.includes('text')) return '📝';
  if (defLower.includes('list') || defLower.includes('todo')) return '📋';
  if (defLower.includes('chart') || defLower.includes('graph')) return '📊';
  if (defLower.includes('map') || defLower.includes('location')) return '🗺️';

  // Design widgets
  if (defLower.includes('color') || defLower.includes('palette')) return '🎨';
  if (defLower.includes('button')) return '🔘';
  if (defLower.includes('slider') || defLower.includes('range')) return '🎚️';
  if (defLower.includes('frame') || defLower.includes('container')) return '🖼️';

  // Default widget icon
  return '📦';
}

/**
 * Create a minimal WidgetAPI for 3D React component widgets.
 * This provides the essential API methods that widgets need.
 * Uses 'any' type since widgets expect extended API beyond the base WidgetAPI interface.
 */
function createSpatial3DAPI(widget: WidgetInstance): any {
  return {
    widgetId: widget.id,
    widgetDefId: widget.widgetDefId,

    emitEvent: (event: any) => {
      console.log('[Spatial3DAPI] emitEvent:', event);
    },

    emitOutput: (port: string, data: any) => {
      console.log('[Spatial3DAPI] emitOutput:', port, data);
    },

    onEvent: (type: string, handler: any) => {
      // Return unsubscribe function
      return () => {};
    },

    onInput: (port: string, handler: any) => {
      // Return unsubscribe function
      return () => {};
    },

    getState: () => widget.state || {},

    setState: (patch: any) => {
      console.log('[Spatial3DAPI] setState:', patch);
      // In a full implementation, this would update widget state
    },

    getAssetUrl: (path: string) => path,

    log: (...args: any[]) => console.log(`[${widget.widgetDefId}]`, ...args),
    info: (...args: any[]) => console.info(`[${widget.widgetDefId}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${widget.widgetDefId}]`, ...args),
    error: (...args: any[]) => console.error(`[${widget.widgetDefId}]`, ...args),
    debugLog: (msg: string, data?: any) => console.debug(`[${widget.widgetDefId}]`, msg, data),

    onMount: (callback: (context: { state: any }) => void) => {
      // Call immediately since we're already mounted
      callback({ state: widget.state || {} });
    },
  };
}

/**
 * Check if a widget should be rendered as a 3D React component
 */
function is3DReactWidget(widgetDefId: string): boolean {
  const builtin = getBuiltinWidget(widgetDefId);
  if (!builtin?.component) return false;

  // Check if manifest indicates 3D widget
  const manifest = builtin.manifest;
  return manifest?.kind === '3d' || manifest?.capabilities?.supports3d === true;
}

/**
 * Check if a widget has a React component that can be rendered in VR
 * This includes both 2D and 3D React widgets
 */
function isReactWidget(widgetDefId: string): boolean {
  const builtin = getBuiltinWidget(widgetDefId);
  return !!builtin?.component;
}

/**
 * Check if a widget has HTML content that can be rendered in VR
 * This includes builtin HTML widgets, AI-generated widgets, and local widgets with cached HTML
 */
function hasHtmlContent(widget: WidgetInstance): boolean {
  // Check for builtin HTML widget
  const builtin = getBuiltinWidget(widget.widgetDefId);
  if (builtin?.html) return true;

  // Check for AI-generated widget with non-empty HTML content
  if (widget.metadata?.source === 'generated' && widget.metadata?.generatedContent?.html) {
    return true;
  }

  // Check for local widget with cached HTML
  if (widget.metadata?.source === 'local') {
    const cached = getCachedWidgetHtml(widget.widgetDefId);
    if (cached) return true;
    // Return true to allow the component to attempt fetching
    return true;
  }

  return false;
}

/**
 * Get HTML content for a widget (from builtin, AI-generated, or cached local)
 */
function getWidgetHtml(widget: WidgetInstance): string | null {
  // Check for builtin HTML widget
  const builtin = getBuiltinWidget(widget.widgetDefId);
  if (builtin?.html) return builtin.html;

  // Check for AI-generated widget with non-empty HTML content
  if (widget.metadata?.source === 'generated' && widget.metadata?.generatedContent?.html) {
    return widget.metadata.generatedContent.html;
  }

  // Check for local widget with cached HTML
  if (widget.metadata?.source === 'local') {
    return getCachedWidgetHtml(widget.widgetDefId);
  }

  return null;
}

/**
 * Check if a widget can be rendered in VR (has either component or HTML)
 */
function canRenderWidget(widget: WidgetInstance): boolean {
  return isReactWidget(widget.widgetDefId) || hasHtmlContent(widget);
}

/**
 * Format widget definition ID for display
 */
function formatWidgetType(widgetDefId: string): string {
  // Remove common prefixes
  let formatted = widgetDefId
    .replace(/^widgets[-_]/, '')
    .replace(/^widget[-_]/, '')
    .replace(/[-_]/g, ' ');

  // Capitalize first letter of each word
  formatted = formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return formatted;
}

// ============================================================================
// Types
// ============================================================================

export interface SpatialWidgetProps {
  /** The widget instance data */
  widget: WidgetInstance;
  /** Whether this widget is selected */
  selected?: boolean;
  /** Called when widget is clicked */
  onClick?: (widget: WidgetInstance) => void;
  /** Called when widget position changes (in 3D space) */
  onPositionChange?: (widgetId: string, position: [number, number, number]) => void;
  /** Called when widget rotation changes (in 3D space) */
  onRotationChange?: (widgetId: string, rotation: [number, number, number]) => void;
  /** Called when widget scale changes */
  onScaleChange?: (widgetId: string, scale: number) => void;
  /** Z-offset in meters from default plane */
  zOffset?: number;
  /** Enable interaction (grab, resize) */
  interactive?: boolean;
  /** Show debug information */
  debug?: boolean;
}

interface SpatialWidgetContainerProps {
  /** Widget instances to render */
  widgets: WidgetInstance[];
  /** Currently selected widget ID */
  selectedWidgetId?: string;
  /** Called when a widget is selected */
  onWidgetSelect?: (widgetId: string) => void;
  /** Called when widget transforms change */
  onWidgetTransformChange?: (
    widgetId: string,
    transform: {
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: number;
    }
  ) => void;
  /** Base Z position for all widgets */
  baseZ?: number;
  /** Enable interactions */
  interactive?: boolean;
  /** Show debug info */
  debug?: boolean;
  /** Force render even in desktop mode (for transitions) */
  forceRender?: boolean;
}

// ============================================================================
// Single Widget in 3D Space
// ============================================================================

function SpatialWidget({
  widget,
  selected = false,
  onClick,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  zOffset = 0,
  interactive = true,
  debug = false,
}: SpatialWidgetProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const spatialMode = useActiveSpatialMode();
  // Check if in XR session (replaces deprecated isPresenting)
  const session = useXR((state) => state.session);
  const isPresenting = !!session;

  // Interaction state
  const [hovered, setHovered] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [grabOffset, setGrabOffset] = useState<Vector3 | null>(null);

  // HTML loading state for local widgets
  const [htmlLoadState, setHtmlLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [, forceUpdate] = useState({});

  // Effect to fetch HTML for local widgets
  useEffect(() => {
    const source = widget.metadata?.source;

    // Only fetch for local widgets
    if (source === 'local') {
      const cached = getCachedWidgetHtml(widget.widgetDefId);
      if (cached) {
        setHtmlLoadState('loaded');
        return;
      }

      // Check if fetch is already in progress
      const status = vrWidgetHtmlFetchStatus.get(widget.widgetDefId);
      if (status === 'success') {
        setHtmlLoadState('loaded');
        return;
      }
      if (status === 'error') {
        setHtmlLoadState('error');
        return;
      }

      // Start fetching
      setHtmlLoadState('loading');
      console.log(`[VR Widget] Fetching HTML for local widget: ${widget.widgetDefId}`);

      fetchAndCacheWidgetHtml(widget.widgetDefId, source).then((html) => {
        if (html) {
          setHtmlLoadState('loaded');
          forceUpdate({}); // Force re-render to pick up cached HTML
        } else {
          setHtmlLoadState('error');
        }
      });
    }
  }, [widget.widgetDefId, widget.metadata?.source]);

  // Cursor feedback
  useCursor(hovered && interactive);

  // Convert 2D position to 3D - arrange in arc around user for VR
  const position3D = useMemo((): [number, number, number] => {
    // For VR, we want widgets in a comfortable viewing arc around the user
    // Instead of directly mapping canvas coordinates, arrange them sensibly

    // Get base position from 2D coordinates
    const rawX = widget.position.x / PIXELS_PER_METER;
    const rawY = widget.position.y / PIXELS_PER_METER;

    // Clamp position to reasonable bounds for VR viewing
    // Maximum spread: 3 meters left/right, 1.5 meters up/down from eye level
    const maxSpreadX = 3; // meters
    const maxSpreadY = 1.5; // meters

    // Normalize large canvas coordinates to fit in viewing arc
    // Canvas is typically 1920x1080, so divide by that to get 0-1 range
    const normalizedX = Math.min(1, rawX / 19.2); // 1920 pixels / 100 = 19.2 meters raw
    const normalizedY = Math.min(1, rawY / 10.8); // 1080 pixels / 100 = 10.8 meters raw

    // Map to arc: spread widgets across -maxSpread to +maxSpread
    const arcX = (normalizedX - 0.5) * 2 * maxSpreadX;
    // Y: keep near eye level (1.6m), adjusted by normalized position
    const arcY = DEFAULT_EYE_HEIGHT - (normalizedY - 0.5) * maxSpreadY;

    // Z: place at comfortable viewing distance, with slight curve
    // Widgets further to the side are slightly further away
    const baseZ = DEFAULT_WIDGET_Z + zOffset;
    const curveAmount = 0.5; // how much the arc curves back
    const curvedZ = baseZ - (Math.abs(arcX) / maxSpreadX) * curveAmount;

    // Center the widget (2D origin is top-left, 3D is center)
    const size3D = toSpatialSize({ width: widget.width, height: widget.height });

    return [
      arcX + size3D.width / 2,
      arcY - size3D.height / 2,
      curvedZ,
    ];
  }, [widget.position, widget.width, widget.height, zOffset]);

  // Convert 2D size to 3D (meters)
  const size3D = useMemo(() => {
    return toSpatialSize({ width: widget.width, height: widget.height });
  }, [widget.width, widget.height]);

  // Convert rotation - but also calculate lookAt rotation to face user
  const rotation3D = useMemo((): [number, number, number] => {
    // User is at origin (0, 1.6, 0) - widgets should face toward user
    // Plane geometry in Three.js faces +Z by default
    // We want the widget's front (+Z) to point toward the user

    // Get widget position
    const widgetX = position3D[0];
    const widgetZ = position3D[2];

    // Direction from widget TO user (origin) in XZ plane
    // To make +Z face this direction, we rotate by atan2(-x, -z)
    // This ensures widgets always face the user regardless of their canvas position
    const facingAngleY = Math.atan2(-widgetX, -widgetZ);

    // Combine with existing 2D rotation (Z-axis rotation from canvas)
    const existingRotation = toSpatialRotation(widget.rotation || 0);

    // Return [X, Y, Z] Euler angles
    // X: 0 (no tilt)
    // Y: facing angle to look at user
    // Z: existing canvas rotation
    return [existingRotation[0], facingAngleY, existingRotation[2]];
  }, [widget.rotation, position3D]);

  // Handle click
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick?.(widget);
    },
    [onClick, widget]
  );

  // Handle pointer down (start grab in VR)
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!interactive) return;
      e.stopPropagation();
      setGrabbed(true);
      // Calculate offset from grab point to widget center
      if (groupRef.current) {
        const offset = new Vector3().subVectors(
          new Vector3(...position3D),
          e.point
        );
        setGrabOffset(offset);
      }
    },
    [interactive, position3D]
  );

  // Handle pointer up (end grab)
  const handlePointerUp = useCallback(() => {
    if (grabbed && groupRef.current) {
      const newPos = groupRef.current.position;
      onPositionChange?.(widget.id, [newPos.x, newPos.y, newPos.z]);
    }
    setGrabbed(false);
    setGrabOffset(null);
  }, [grabbed, widget.id, onPositionChange]);

  // Frame update for grabbed widgets
  useFrame((state) => {
    if (!grabbed || !grabOffset || !groupRef.current) return;

    // In VR, follow the controller
    // In desktop, follow the mouse (raycaster)
    if (isPresenting) {
      // VR mode: use raycaster intersection point
      const intersects = state.raycaster.intersectObjects(state.scene.children, true);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        groupRef.current.position.set(
          point.x + grabOffset.x,
          point.y + grabOffset.y,
          point.z + grabOffset.z
        );
      }
    }
  });

  // Widget panel colors based on state
  const panelColor = selected ? '#6366f1' : hovered ? '#4c1d95' : '#1e1b4b';
  const borderColor = selected ? '#8b5cf6' : hovered ? '#7c3aed' : '#4c1d95';

  return (
    <group
      ref={groupRef}
      position={position3D}
      rotation={rotation3D}
    >
      {/* Main widget panel */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[size3D.width, size3D.height]} />
        <meshStandardMaterial
          color={panelColor}
          transparent
          opacity={0.95}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Selection border */}
      {(selected || hovered) && (
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[size3D.width + 0.02, size3D.height + 0.02]} />
          <meshBasicMaterial
            color={borderColor}
            transparent
            opacity={selected ? 0.8 : 0.4}
          />
        </mesh>
      )}

      {/* Check if this is a renderable widget - render actual content */}
      {/* Debug: Log canRenderWidget result */}
      {(() => {
        const canRender = canRenderWidget(widget);
        const hasReact = isReactWidget(widget.widgetDefId);
        const hasHtml = hasHtmlContent(widget);
        const source = widget.metadata?.source;
        const htmlFromCache = getCachedWidgetHtml(widget.widgetDefId);
        const htmlFromGenerated = widget.metadata?.generatedContent?.html;
        const builtinHtml = getBuiltinWidget(widget.widgetDefId)?.html;
        console.log(`[SpatialWidget] "${widget.name || widget.widgetDefId}":`, {
          canRender,
          hasReact,
          hasHtml,
          source,
          htmlLoadState,
          hasBuiltinHtml: !!builtinHtml,
          hasGeneratedHtml: !!htmlFromGenerated && htmlFromGenerated.length > 0,
          hasCachedHtml: !!htmlFromCache,
        });
        return null;
      })()}
      {canRenderWidget(widget) ? (
        <>
          {/* Render actual widget content via Html */}
          {/* NOTE: Removed 'occlude' prop - it was hiding content behind the transparent panel */}
          {/* distanceFactor: Scale factor for HTML content in 3D space. Higher = larger content at distance. */}
          {/* At VR viewing distances (1-3m), distanceFactor ~10 gives readable UI */}
          {/* zIndexRange ensures Html content layers properly on mobile browsers */}
          {/* RENDER SCALE: We render at 2x resolution then scale down via CSS for sharper text on mobile */}
          <Html
            transform
            distanceFactor={10}
            position={[0, 0, 0.02]}
            zIndexRange={[100, 0]}
            center
            scale={0.5}
            style={{
              width: `${widget.width * 2}px`,
              height: `${widget.height * 2}px`,
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: 16,
                background: 'rgba(20, 20, 30, 0.95)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                imageRendering: 'auto',
              }}
            >
              {/* Render either React component or HTML widget */}
              {(() => {
                const builtin = getBuiltinWidget(widget.widgetDefId);
                const source = widget.metadata?.source;

                // First try to render as React component
                if (builtin?.component) {
                  const Component = builtin.component as React.ComponentType<{ api: any }>;
                  const api = createSpatial3DAPI(widget);
                  return <Component api={api} />;
                }

                // Show loading state for local widgets while fetching HTML
                // 'idle' also shows loading as we haven't started fetch yet
                // NOTE: Font sizes are 2x because we render at 2x scale for sharper text
                if (source === 'local' && (htmlLoadState === 'loading' || htmlLoadState === 'idle')) {
                  return (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a5b4fc',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>⟳</div>
                      <div style={{ fontSize: 28 }}>Loading widget...</div>
                      <div style={{ fontSize: 22, color: '#6b7280' }}>{widget.widgetDefId}</div>
                      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                  );
                }

                // Show error state for local widgets that failed to load
                // NOTE: Font sizes are 2x because we render at 2x scale for sharper text
                if (source === 'local' && htmlLoadState === 'error') {
                  return (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        gap: 16,
                        padding: 32,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 48 }}>⚠️</div>
                      <div style={{ fontSize: 28 }}>Failed to load widget</div>
                      <div style={{ fontSize: 22, color: '#9ca3af' }}>{widget.widgetDefId}</div>
                    </div>
                  );
                }

                // Then try to render as HTML widget in an iframe
                const htmlContent = getWidgetHtml(widget);

                // Mobile detection for fallback rendering
                const isMobile = typeof navigator !== 'undefined' &&
                  /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                // If no HTML content available, show a preview card
                // NOTE: Font sizes are 2x because we render at 2x scale for sharper text
                if (!htmlContent) {
                  return (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a5b4fc',
                        gap: 24,
                        padding: 32,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 64 }}>{getWidgetTypeEmoji(widget.widgetDefId)}</div>
                      <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff' }}>
                        {widget.name || formatWidgetType(widget.widgetDefId)}
                      </div>
                      <div style={{ fontSize: 22, color: '#9ca3af' }}>
                        {widget.widgetDefId}
                      </div>
                      <div style={{ fontSize: 20, color: '#6b7280', marginTop: 16 }}>
                        {source || 'unknown'} • {Math.round(widget.width)}×{Math.round(widget.height)}
                      </div>
                    </div>
                  );
                }

                if (htmlContent) {
                  // Normalize state for compatibility: map 'text' to 'content' for BasicTextWidget
                  const normalizedState = { ...widget.state };
                  if (normalizedState.text && !normalizedState.content) {
                    normalizedState.content = normalizedState.text;
                  }

                  // Inject a complete WidgetAPI mock for VR context
                  const mockAPI = `
                    <script>
                      window.WidgetAPI = {
                        widgetId: '${widget.id}',
                        widgetDefId: '${widget.widgetDefId}',
                        // Event emission
                        emit: function(type, data) { console.log('[VR Widget] emit:', type, data); },
                        emitEvent: function(e) { console.log('[VR Widget] emitEvent:', e); },
                        emitOutput: function(port, data) { console.log('[VR Widget] emitOutput:', port, data); },
                        // Event handlers
                        onEvent: function(type, handler) { return function() {}; },
                        onInput: function(port, handler) { return function() {}; },
                        // State management
                        getState: function() { return ${JSON.stringify(normalizedState)}; },
                        setState: function(patch) {
                          console.log('[VR Widget] setState:', patch);
                          Object.assign(window.WidgetAPI._state, patch);
                        },
                        _state: ${JSON.stringify(normalizedState)},
                        _source: '${source}',
                        // Asset handling - resolve to proper base URL for local widgets
                        getAssetUrl: function(path) {
                          if (this._source === 'local') {
                            // Local widgets: resolve to /test-widgets/{widgetDefId}/
                            if (path.startsWith('/') || path.startsWith('http')) return path;
                            return '/test-widgets/${widget.widgetDefId}/' + path;
                          }
                          return path;
                        },
                        // Logging
                        log: function() { console.log.apply(console, ['[${widget.widgetDefId}]'].concat(Array.from(arguments))); },
                        info: function() { console.info.apply(console, ['[${widget.widgetDefId}]'].concat(Array.from(arguments))); },
                        warn: function() { console.warn.apply(console, ['[${widget.widgetDefId}]'].concat(Array.from(arguments))); },
                        error: function() { console.error.apply(console, ['[${widget.widgetDefId}]'].concat(Array.from(arguments))); },
                        debugLog: function(msg, data) { console.debug('[${widget.widgetDefId}]', msg, data); },
                        // Lifecycle hooks
                        onMount: function(callback) {
                          setTimeout(function() { callback({ state: ${JSON.stringify(normalizedState)} }); }, 0);
                        },
                        onStateChange: function(callback) {
                          window.WidgetAPI._stateChangeCallback = callback;
                          return function() { window.WidgetAPI._stateChangeCallback = null; };
                        },
                        onDestroy: function(callback) {
                          window.WidgetAPI._destroyCallback = callback;
                          return function() { window.WidgetAPI._destroyCallback = null; };
                        },
                        _stateChangeCallback: null,
                        _destroyCallback: null,
                      };
                      console.log('[VR Widget] WidgetAPI initialized for ${widget.widgetDefId}');
                    </script>
                  `;

                  // Inject API and base tag into HTML
                  let html = htmlContent;

                  // For local widgets, add a base tag so relative URLs resolve correctly
                  const baseTag = source === 'local'
                    ? `<base href="/test-widgets/${widget.widgetDefId}/">`
                    : '';

                  if (html.includes('<head>')) {
                    html = html.replace('<head>', `<head>${baseTag}${mockAPI}`);
                  } else if (html.includes('<html>')) {
                    html = html.replace('<html>', `<html><head>${baseTag}${mockAPI}</head>`);
                  } else {
                    html = baseTag + mockAPI + html;
                  }

                  // For simple text widgets, render directly instead of iframe (better mobile support)
                  if (widget.widgetDefId === 'stickernest.basic-text') {
                    const state = normalizedState as any;
                    return (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: state.textAlign === 'left' ? 'flex-start' :
                                         state.textAlign === 'right' ? 'flex-end' : 'center',
                          padding: state.padding || 8,
                          color: state.color || '#ffffff',
                          fontSize: state.fontSize || 16,
                          fontFamily: state.fontFamily || 'system-ui, sans-serif',
                          fontWeight: state.fontWeight || 'normal',
                          textAlign: state.textAlign || 'center',
                          backgroundColor: state.backgroundColor || 'transparent',
                          borderRadius: state.borderRadius || 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflow: 'hidden',
                        }}
                      >
                        {state.content || state.text || 'Text'}
                      </div>
                    );
                  }

                  // For complex widgets, use iframe with permissive sandbox for mobile
                  return (
                    <iframe
                      srcDoc={html}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: 8,
                        backgroundColor: 'transparent',
                      }}
                      sandbox="allow-scripts allow-same-origin"
                      title={widget.name || widget.widgetDefId}
                    />
                  );
                }

                return null;
              })()}
            </div>
          </Html>
        </>
      ) : (
        <>
          {/* Widget name label (for placeholder widgets) */}
          <Text
            position={[0, size3D.height / 2 + 0.05, 0.01]}
            fontSize={0.05}
            color="white"
            anchorX="center"
            anchorY="bottom"
            maxWidth={size3D.width}
          >
            {widget.name || widget.widgetDefId || 'Widget'}
          </Text>

          {/* Widget type icon and content preview */}
          <group position={[0, 0.05, 0.01]}>
            {/* Widget type icon background */}
            <mesh position={[0, 0, -0.002]}>
              <circleGeometry args={[0.08, 32]} />
              <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
            </mesh>
            {/* Widget type emoji/icon */}
            <Text
              position={[0, 0, 0]}
              fontSize={0.08}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {getWidgetTypeEmoji(widget.widgetDefId)}
            </Text>
          </group>

          {/* Widget definition ID */}
          <Text
            position={[0, -0.08, 0.01]}
            fontSize={0.05}
            color="#a5b4fc"
            anchorX="center"
            anchorY="middle"
            maxWidth={size3D.width * 0.9}
          >
            {formatWidgetType(widget.widgetDefId)}
          </Text>

          {/* Widget dimensions */}
          <Text
            position={[0, -0.18, 0.01]}
            fontSize={0.035}
            color="#6b7280"
            anchorX="center"
            anchorY="middle"
          >
            {Math.round(widget.width)} × {Math.round(widget.height)} px
          </Text>

          {/* Instance ID (smaller, for debugging) */}
          {debug && (
            <Text
              position={[0, -0.26, 0.01]}
              fontSize={0.025}
              color="#4b5563"
              anchorX="center"
              anchorY="middle"
            >
              ID: {widget.id.slice(0, 8)}...
            </Text>
          )}
        </>
      )}

      {/* Grab indicator (when being dragged) */}
      {grabbed && (
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.08, 0.1, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Debug info */}
      {debug && (
        <>
          <Text
            position={[0, -size3D.height / 2 - 0.08, 0.01]}
            fontSize={0.03}
            color="#9ca3af"
            anchorX="center"
            anchorY="top"
          >
            {`pos: (${position3D[0].toFixed(2)}, ${position3D[1].toFixed(2)}, ${position3D[2].toFixed(2)})`}
          </Text>
          <Text
            position={[0, -size3D.height / 2 - 0.14, 0.01]}
            fontSize={0.025}
            color={htmlLoadState === 'error' ? '#f87171' : htmlLoadState === 'loaded' ? '#22c55e' : '#fbbf24'}
            anchorX="center"
            anchorY="top"
          >
            {`source: ${widget.metadata?.source || 'unknown'} | html: ${htmlLoadState}`}
          </Text>
        </>
      )}
    </group>
  );
}

// ============================================================================
// Main Container Component
// ============================================================================

export function SpatialWidgetContainer({
  widgets,
  selectedWidgetId,
  onWidgetSelect,
  onWidgetTransformChange,
  baseZ = DEFAULT_WIDGET_Z,
  interactive = true,
  debug = false,
  forceRender = false,
}: SpatialWidgetContainerProps) {
  const spatialMode = useActiveSpatialMode();

  // Filter to visible widgets only - MUST be before any conditional returns (React hooks rule)
  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => w.visible !== false);
  }, [widgets]);

  // Handle widget click - MUST be before any conditional returns
  const handleWidgetClick = useCallback(
    (widget: WidgetInstance) => {
      onWidgetSelect?.(widget.id);
    },
    [onWidgetSelect]
  );

  // Handle position change - MUST be before any conditional returns
  const handlePositionChange = useCallback(
    (widgetId: string, position: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { position });
    },
    [onWidgetTransformChange]
  );

  // Handle rotation change - MUST be before any conditional returns
  const handleRotationChange = useCallback(
    (widgetId: string, rotation: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { rotation });
    },
    [onWidgetTransformChange]
  );

  // Debug logging - detailed widget position info
  useEffect(() => {
    console.log('[SpatialWidgetContainer] Rendering state:', {
      spatialMode,
      forceRender,
      shouldRender: spatialMode !== 'desktop' || forceRender,
      totalWidgets: widgets.length,
      visibleWidgets: visibleWidgets.length,
    });

    // Log each widget's 2D and calculated 3D positions
    visibleWidgets.forEach((w, i) => {
      const pos3D = toSpatialPosition(w.position, DEFAULT_WIDGET_Z);
      const size3D = toSpatialSize({ width: w.width, height: w.height });
      console.log(`[Widget ${i}] "${w.name || w.widgetDefId}":`, {
        '2D pos': w.position,
        '2D size': { width: w.width, height: w.height },
        '3D pos': pos3D,
        '3D size': size3D,
      });
    });
  }, [spatialMode, forceRender, widgets.length, visibleWidgets]);

  // Only render in VR/AR modes (or when forceRender is true for transitions)
  if (spatialMode === 'desktop' && !forceRender) {
    console.log('[SpatialWidgetContainer] Not rendering - desktop mode and forceRender=false');
    return null;
  }

  if (visibleWidgets.length === 0) {
    console.log('[SpatialWidgetContainer] Not rendering - no visible widgets');
    // Still render the info panel even if no widgets
  }

  return (
    <group name="spatial-widget-container">
      {visibleWidgets.map((widget, index) => (
        <SpatialWidget
          key={widget.id}
          widget={widget}
          selected={widget.id === selectedWidgetId}
          onClick={handleWidgetClick}
          onPositionChange={handlePositionChange}
          onRotationChange={handleRotationChange}
          zOffset={(index * 0.05)} // Slight Z offset to prevent z-fighting
          interactive={interactive}
          debug={debug}
        />
      ))}
    </group>
  );
}

export default SpatialWidgetContainer;
