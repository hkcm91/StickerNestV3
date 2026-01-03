/**
 * StickerNest - SpatialScene
 *
 * The 3D scene content for VR/AR modes.
 * This component renders widgets, entities, and canvases in 3D space.
 * Includes AR hit testing for mobile and VR teleportation for headsets.
 *
 * Key features:
 * - Renders 2D canvas widgets as 3D panels
 * - Spatial stickers for anchored content
 * - VR teleportation and AR hit testing
 * - Room visualization and occlusion for AR
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useActiveSpatialMode, useSpatialModeStore } from '../../state/useSpatialModeStore';
import {
  useSpatialStickerStore,
  useDetectedQRCodes,
} from '../../state/useSpatialStickerStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useUndoRedoStore } from '../../state/useUndoRedoStore';
import { DEFAULT_WIDGET_Z, DEFAULT_EYE_HEIGHT } from '../../utils/spatialCoordinates';
import { ARHitTest, ARPlacedObject } from './ARHitTest';
import { VRTeleport } from './VRTeleport';
import {
  XRToolbar,
  VRToolHub,
  XRWidgetLibrary,
  type XRToolType,
  type VRToolHubToolType,
  RoomVisualizer,
  OcclusionLayer,
  RoomSetupGuide,
} from './xr';
import { SpatialStickerManager } from './stickers';
import { SpatialWidgetContainer } from './widgets';
import { SpatialSticker } from '../../types/spatialEntity';

// ============================================================================
// XR Welcome Panel
// ============================================================================

/**
 * Welcome panel that appears when entering XR mode.
 * Confirms the system is working and provides basic guidance.
 */
interface XRWelcomePanelProps {
  mode: 'vr' | 'ar' | 'desktop';
  widgetCount: number;
}

function XRWelcomePanel({ mode, widgetCount }: XRWelcomePanelProps) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  // Fade out after 8 seconds
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setOpacity(0.3);
    }, 6000);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 15000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const isVR = mode === 'vr';
  const title = isVR ? '🥽 VR Mode Active' : '📱 AR Mode Active';
  const color = isVR ? '#8b5cf6' : '#22c55e';

  return (
    <group position={[0, 1.6, -1.5]}>
      {/* Background panel */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.4, 0.6]} />
        <meshBasicMaterial
          color="#0a0a15"
          transparent
          opacity={0.9 * opacity}
        />
      </mesh>

      {/* Border glow */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.44, 0.64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4 * opacity}
        />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.18, 0]}
        fontSize={0.1}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor="#000000"
      >
        {title}
      </Text>

      {/* Status info */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.06}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {widgetCount > 0
          ? `${widgetCount} widget${widgetCount > 1 ? 's' : ''} loaded`
          : 'Ready to add widgets'}
      </Text>

      {/* Instructions */}
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.04}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.2}
        textAlign="center"
      >
        {isVR
          ? 'Look for the toolbar • Point to interact • Thumbstick to teleport'
          : 'Look around to see boundaries • Tap surfaces to place content'}
      </Text>
    </group>
  );
}

// ============================================================================
// AR Playspace Boundary
// ============================================================================

/**
 * Visual indicator of the AR playspace boundary.
 * Shows a subtle grid/ring at floor level to help users understand their space.
 */
function ARPlayspaceBoundary() {
  const [visible, setVisible] = useState(true);

  // Fade out after 10 seconds to be less intrusive
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <group name="ar-playspace-boundary">
      {/* Floor ring to indicate playspace center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.4}
          side={2}
        />
      </mesh>

      {/* Inner safe zone indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0, 0.8, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.1}
          side={2}
        />
      </mesh>

      {/* Cardinal direction indicators */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2;
        const x = Math.sin(angle) * 1.2;
        const z = Math.cos(angle) * 1.2;
        const colors = ['#ef4444', '#3b82f6', '#ef4444', '#3b82f6']; // N/S red, E/W blue
        return (
          <mesh
            key={i}
            position={[x, 0.02, z]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <coneGeometry args={[0.05, 0.15, 4]} />
            <meshBasicMaterial color={colors[i]} transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Outer boundary ring (2m radius) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.95, 2.0, 64]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>

      {/* Info text */}
      <Text
        position={[0, 0.1, -1.5]}
        rotation={[-Math.PI / 4, 0, 0]}
        fontSize={0.08}
        color="#22c55e"
        anchorX="center"
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        AR Playspace
      </Text>
    </group>
  );
}

// ============================================================================
// Placeholder Canvas Panel
// ============================================================================

interface CanvasPanel3DProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
}

/**
 * A placeholder 3D panel representing where the 2D canvas would be displayed.
 * In the future, this will render actual widgets/entities.
 */
function CanvasPanel3D({
  position = [0, DEFAULT_EYE_HEIGHT, DEFAULT_WIDGET_Z],
  width = 4,
  height = 3,
}: CanvasPanel3DProps) {
  const [hovered, setHovered] = useState(false);
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  // Effective mode for display
  const effectiveMode = sessionState === 'requesting' && targetMode
    ? targetMode
    : spatialMode;

  return (
    <group position={position}>
      {/* Main canvas panel */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={hovered ? '#4c1d95' : '#1f2937'}
          transparent
          opacity={0.9}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Border glow when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[width + 0.05, height + 0.05]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Title text */}
      <Text
        position={[0, height / 2 + 0.15, 0.01]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        StickerNest Canvas
      </Text>

      {/* Mode indicator */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.2}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
      >
        {effectiveMode === 'vr' ? '🥽 VR Mode' : effectiveMode === 'ar' ? '📱 AR Mode' : '🖥️ Preview'}
      </Text>

      {/* Instructions */}
      <Text
        position={[0, -0.5, 0.01]}
        fontSize={0.08}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        textAlign="center"
      >
        {effectiveMode === 'vr'
          ? 'Point and click to interact • Use thumbstick to teleport'
          : effectiveMode === 'ar'
          ? 'Point at surfaces to place content'
          : 'Use mouse to orbit • Click VR button to enter immersive mode'}
      </Text>
    </group>
  );
}

// ============================================================================
// Interactive Demo Object
// ============================================================================

interface InteractiveBoxProps {
  position: [number, number, number];
  color?: string;
}

/**
 * A simple interactive box to test VR/AR interactions.
 */
function InteractiveBox({ position, color = '#8b5cf6' }: InteractiveBoxProps) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setClicked(!clicked);
  };

  return (
    <mesh
      position={position}
      scale={clicked ? 1.2 : 1}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial
        color={clicked ? '#22c55e' : hovered ? '#a78bfa' : color}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  );
}

// ============================================================================
// Placed Object (for AR)
// ============================================================================

interface PlacedMarker {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
}

function PlacedMarkerObject({ position }: { position: [number, number, number] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Base cylinder */}
      <mesh
        position={[0, 0.025, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
        <meshStandardMaterial
          color={hovered ? '#a78bfa' : '#8b5cf6'}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {/* Floating indicator */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Main SpatialScene Component
// ============================================================================

export function SpatialScene() {
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);
  const [placedObjects, setPlacedObjects] = useState<PlacedMarker[]>([]);
  const [activeTool, setActiveTool] = useState<XRToolType>('select');

  // Room mapping settings - DEFAULT TO TRUE IN AR MODE for boundary visibility
  const [showRoomVisualization, setShowRoomVisualization] = useState(true);
  const [enableOcclusion, setEnableOcclusion] = useState(true);

  // Widget library visibility - starts visible in XR modes for discoverability
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  // Effective mode considers transitioning states
  // When sessionState is 'requesting', use targetMode to determine what to render
  const effectiveMode = useMemo(() => {
    if (sessionState === 'requesting' && targetMode) {
      return targetMode;
    }
    return spatialMode;
  }, [spatialMode, sessionState, targetMode]);

  // Debug logging
  useEffect(() => {
    console.log('[SpatialScene] Mode state:', {
      spatialMode,
      sessionState,
      targetMode,
      effectiveMode,
    });
  }, [spatialMode, sessionState, targetMode, effectiveMode]);

  // Canvas widgets from the main canvas store
  // These are the actual widgets that users have placed on their 2D canvas
  // IMPORTANT: Don't use useWidgets() or useSelectedIds() directly - they create new arrays every render causing infinite loops!
  // Access the raw Map/Set and convert to array with useMemo for stable references (same pattern as spatialStickers)
  const widgetsMap = useCanvasStore((state) => state.widgets);
  const canvasWidgets = useMemo(
    () => Array.from(widgetsMap.values()),
    [widgetsMap]
  );
  const selectionSet = useCanvasStore((state) => state.selection.selectedIds);
  const selectedWidgetIds = useMemo(
    () => Array.from(selectionSet),
    [selectionSet]
  );
  const selectWidget = useCanvasStore((state) => state.select);
  const updateWidget = useCanvasStore((state) => state.updateWidget);

  // Primary selected widget (for single selection operations)
  const primarySelectedWidgetId = selectedWidgetIds.length > 0 ? selectedWidgetIds[0] : undefined;

  // Debug: Log widget data
  useEffect(() => {
    console.log('[SpatialScene] Canvas widgets:', {
      widgetsMapSize: widgetsMap.size,
      canvasWidgetsCount: canvasWidgets.length,
      effectiveMode,
      shouldRenderWidgets: effectiveMode !== 'desktop',
      widgets: canvasWidgets.map(w => ({
        id: w.id,
        name: w.name,
        widgetDefId: w.widgetDefId,
        visible: w.visible,
        position: w.position,
      })),
    });
  }, [widgetsMap, canvasWidgets, effectiveMode]);

  // Spatial sticker state
  // IMPORTANT: Don't call functions inside Zustand selectors - it creates new references every render!
  // Access the raw Map and convert to array with useMemo for stable references
  const spatialStickersMap = useSpatialStickerStore((state) => state.spatialStickers);
  const spatialStickers = useMemo(
    () => Array.from(spatialStickersMap.values()),
    [spatialStickersMap]
  );
  const selectedStickerId = useSpatialStickerStore((state) => state.selectedSpatialStickerId);
  const selectSticker = useSpatialStickerStore((state) => state.selectSpatialSticker);
  const persistentAnchors = useSpatialStickerStore((state) => state.persistentAnchors);
  const showDebugInfo = useSpatialStickerStore((state) => state.showDebugInfo);
  const detectedQRCodes = useDetectedQRCodes();

  // Convert Maps to the format expected by SpatialStickerManager
  const detectedQRCodesMap = useMemo(() => {
    const map = new Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>();
    detectedQRCodes.forEach((code, content) => {
      map.set(content, { position: code.position, rotation: code.rotation });
    });
    return map;
  }, [detectedQRCodes]);

  const persistentAnchorsMap = useMemo(() => {
    const map = new Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>();
    persistentAnchors.forEach((anchor, handle) => {
      map.set(handle, { position: anchor.position, rotation: anchor.rotation });
    });
    return map;
  }, [persistentAnchors]);

  // Handle AR object placement
  const handleARPlace = useCallback(
    (position: [number, number, number], rotation: [number, number, number, number]) => {
      const newObject: PlacedMarker = {
        id: `placed-${Date.now()}`,
        position,
        rotation,
      };
      setPlacedObjects((prev) => [...prev, newObject]);
    },
    []
  );

  // Handle VR teleportation
  const handleTeleport = useCallback((position: [number, number, number]) => {
    console.log('Teleported to:', position);
  }, []);

  // Handle XR toolbar actions
  const handleToolChange = useCallback((tool: XRToolType) => {
    setActiveTool(tool);
    console.log('XR Tool changed:', tool);
  }, []);

  const handleAddWidget = useCallback(() => {
    console.log('Add widget requested from XR toolbar');
    setShowWidgetLibrary((prev) => !prev);
  }, []);

  // Get undo/redo actions from the unified store
  const undoAction = useUndoRedoStore((state) => state.undo);
  const redoAction = useUndoRedoStore((state) => state.redo);
  const canUndo = useUndoRedoStore((state) => state.canUndo);
  const canRedo = useUndoRedoStore((state) => state.canRedo);

  const handleUndo = useCallback(() => {
    console.log('Undo requested from XR toolbar');
    const success = undoAction();
    if (success) {
      console.log('Undo successful');
    } else {
      console.log('Nothing to undo');
    }
  }, [undoAction]);

  const handleRedo = useCallback(() => {
    console.log('Redo requested from XR toolbar');
    const success = redoAction();
    if (success) {
      console.log('Redo successful');
    } else {
      console.log('Nothing to redo');
    }
  }, [redoAction]);

  const handleSettings = useCallback(() => {
    console.log('Settings requested from XR toolbar');
    // Toggle room visualization for now (will be full settings panel later)
    setShowRoomVisualization((prev) => !prev);
  }, []);

  // Handle spatial sticker click
  const handleStickerClick = useCallback((sticker: SpatialSticker) => {
    selectSticker(sticker.id);
    console.log('Spatial sticker clicked:', sticker.name);
  }, [selectSticker]);

  // Handle widget launch from sticker
  const handleLaunchWidget = useCallback((widgetDefId: string, sticker: SpatialSticker) => {
    console.log('Launch widget:', widgetDefId, 'from sticker:', sticker.name);
    // TODO: Connect to widget spawning system
  }, []);

  // Handle widget toggle from sticker
  const handleToggleWidget = useCallback((widgetInstanceId: string, sticker: SpatialSticker) => {
    console.log('Toggle widget:', widgetInstanceId, 'from sticker:', sticker.name);
    // TODO: Connect to widget visibility system
  }, []);

  // Handle event emission from sticker
  const handleEmitEvent = useCallback((event: string, sticker: SpatialSticker) => {
    console.log('Emit event:', event, 'from sticker:', sticker.name);
    // TODO: Connect to EventBus
  }, []);

  // Handle pipeline execution from sticker
  const handleRunPipeline = useCallback((pipelineId: string, sticker: SpatialSticker) => {
    console.log('Run pipeline:', pipelineId, 'from sticker:', sticker.name);
    // TODO: Connect to pipeline execution system
  }, []);

  // Handle widget selection in 3D space
  const handleWidgetSelect = useCallback((widgetId: string) => {
    selectWidget(widgetId, false); // false = not additive (single select)
    console.log('Widget selected in 3D:', widgetId);
  }, [selectWidget]);

  // Handle widget transform changes from 3D manipulation
  const handleWidgetTransformChange = useCallback((
    widgetId: string,
    transform: {
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: number;
    }
  ) => {
    // Convert 3D position back to 2D canvas coordinates if needed
    // For now, log the transform - full sync will come in Phase 6+
    console.log('Widget transform changed in 3D:', widgetId, transform);

    // If we have position, we could convert it back to 2D
    // This would require the inverse of toSpatialPosition
    // For MVP, we track 3D-specific positions separately
  }, [updateWidget]);

  // Auto-show widget library when entering XR mode for discoverability
  useEffect(() => {
    if ((effectiveMode === 'vr' || effectiveMode === 'ar') && sessionState === 'active') {
      // Show widget library briefly to let user know it's available
      console.log('[SpatialScene] XR session active, widget library available');
    }
  }, [effectiveMode, sessionState]);

  return (
    <group>
      {/* VR Tool Hub - 3D native toolbar (available in both VR and AR modes) */}
      {(effectiveMode === 'vr' || effectiveMode === 'ar') && (
        <VRToolHub
          onToolChange={handleToolChange}
          onAddWidget={handleAddWidget}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSettings={handleSettings}
        />
      )}

      {/* XR Widget Library (all 3D modes - VR, AR, and desktop preview) */}
      <XRWidgetLibrary
        visible={showWidgetLibrary}
        onClose={() => setShowWidgetLibrary(false)}
        position={[0.9, 1.5, -1.2]}
      />

      {/* VR Teleportation (only in VR mode) */}
      <VRTeleport
        initialPosition={[0, 0, 0]}
        floorSize={[20, 20]}
        enabled={effectiveMode === 'vr'}
        onTeleport={handleTeleport}
      />

      {/* AR Room Mapping - Occlusion Layer (renders first for proper depth) */}
      {effectiveMode === 'ar' && enableOcclusion && (
        <OcclusionLayer renderOrder={0} />
      )}

      {/* AR Room Visualization - ALWAYS SHOW in AR mode for boundary awareness */}
      {effectiveMode === 'ar' && (
        <RoomVisualizer
          showPlanes={true}
          showMesh={showRoomVisualization}
          showLabels={showRoomVisualization}
          showStats={true}
          planeOpacity={0.35}
          meshOpacity={0.15}
        />
      )}

      {/* AR Playspace Boundary Indicator */}
      {effectiveMode === 'ar' && (
        <ARPlayspaceBoundary />
      )}

      {/* AR Room Setup Guide (shown when no room data available) */}
      {effectiveMode === 'ar' && (
        <RoomSetupGuide
          onDismiss={() => console.log('Room setup guide dismissed')}
        />
      )}

      {/* AR Hit Test Indicator (only in AR mode) */}
      <ARHitTest
        enabled={effectiveMode === 'ar'}
        onPlace={handleARPlace}
        indicatorColor="#8b5cf6"
        indicatorSize={0.12}
      />

      {/* AR Placed Objects (render after occlusion for proper depth sorting) */}
      <group renderOrder={1}>
        {placedObjects.map((obj) => (
          <ARPlacedObject key={obj.id} position={obj.position} rotation={obj.rotation}>
            <PlacedMarkerObject position={[0, 0, 0]} />
          </ARPlacedObject>
        ))}
      </group>

      {/* Spatial Stickers (both VR and AR) */}
      <group renderOrder={2}>
        <SpatialStickerManager
          stickers={spatialStickers}
          selectedStickerId={selectedStickerId ?? undefined}
          detectedQRCodes={detectedQRCodesMap}
          persistentAnchors={persistentAnchorsMap}
          onStickerClick={handleStickerClick}
          onLaunchWidget={handleLaunchWidget}
          onToggleWidget={handleToggleWidget}
          onEmitEvent={handleEmitEvent}
          onRunPipeline={handleRunPipeline}
          debug={showDebugInfo}
        />
      </group>

      {/* Canvas widgets rendered in 3D space */}
      {/* These are the actual widgets from the user's canvas, converted to 3D panels */}
      {/* Pass effectiveMode so widgets render during transition */}
      <SpatialWidgetContainer
        widgets={canvasWidgets}
        selectedWidgetId={primarySelectedWidgetId}
        onWidgetSelect={handleWidgetSelect}
        onWidgetTransformChange={handleWidgetTransformChange}
        interactive={activeTool === 'select' || activeTool === 'move'}
        debug={showDebugInfo}
        forceRender={effectiveMode !== 'desktop'}
      />
    </group>
  );
}

export default SpatialScene;
