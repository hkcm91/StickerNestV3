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

import React, { useState, useCallback, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';
import {
  useSpatialStickerStore,
  useDetectedQRCodes,
} from '../../state/useSpatialStickerStore';
import { useWidgets, useSelectedIds, useCanvasStore } from '../../state/useCanvasStore';
import { DEFAULT_WIDGET_Z, DEFAULT_EYE_HEIGHT } from '../../utils/spatialCoordinates';
import { ARHitTest, ARPlacedObject } from './ARHitTest';
import { VRTeleport } from './VRTeleport';
import {
  XRToolbar,
  type XRToolType,
  RoomVisualizer,
  OcclusionLayer,
  RoomSetupGuide,
} from './xr';
import { SpatialStickerManager } from './stickers';
import { SpatialWidgetContainer } from './SpatialWidgetContainer';
import { SpatialSticker } from '../../types/spatialEntity';

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
        {spatialMode === 'vr' ? '🥽 VR Mode' : spatialMode === 'ar' ? '📱 AR Mode' : '🖥️ Preview'}
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
        {spatialMode === 'vr'
          ? 'Point and click to interact • Use thumbstick to teleport'
          : spatialMode === 'ar'
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
  const [placedObjects, setPlacedObjects] = useState<PlacedMarker[]>([]);
  const [activeTool, setActiveTool] = useState<XRToolType>('select');

  // Room mapping settings
  const [showRoomVisualization, setShowRoomVisualization] = useState(false);
  const [enableOcclusion, setEnableOcclusion] = useState(true);

  // Canvas widgets from the main canvas store
  // These are the actual widgets that users have placed on their 2D canvas
  const canvasWidgets = useWidgets();
  const selectedWidgetIds = useSelectedIds();
  const selectWidget = useCanvasStore((state) => state.selectWidget);
  const updateWidget = useCanvasStore((state) => state.updateWidget);

  // Primary selected widget (for single selection operations)
  const primarySelectedWidgetId = selectedWidgetIds.length > 0 ? selectedWidgetIds[0] : undefined;

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
    // TODO: Open widget picker in 3D space
  }, []);

  const handleUndo = useCallback(() => {
    console.log('Undo requested from XR toolbar');
    // TODO: Connect to undo system
  }, []);

  const handleRedo = useCallback(() => {
    console.log('Redo requested from XR toolbar');
    // TODO: Connect to redo system
  }, []);

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

  return (
    <group>
      {/* XR Toolbar (spawns from palm gesture in VR mode) */}
      {spatialMode === 'vr' && (
        <XRToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onAddWidget={handleAddWidget}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSettings={handleSettings}
        />
      )}

      {/* VR Teleportation (only in VR mode) */}
      <VRTeleport
        initialPosition={[0, 0, 0]}
        floorSize={[20, 20]}
        enabled={spatialMode === 'vr'}
        onTeleport={handleTeleport}
      />

      {/* AR Room Mapping - Occlusion Layer (renders first for proper depth) */}
      {spatialMode === 'ar' && enableOcclusion && (
        <OcclusionLayer renderOrder={0} />
      )}

      {/* AR Room Visualization (debug/preview) */}
      {spatialMode === 'ar' && showRoomVisualization && (
        <RoomVisualizer
          showPlanes={true}
          showMesh={true}
          showLabels={true}
          showStats={true}
          planeOpacity={0.3}
          meshOpacity={0.1}
        />
      )}

      {/* AR Room Setup Guide (shown when no room data available) */}
      {spatialMode === 'ar' && (
        <RoomSetupGuide
          onDismiss={() => console.log('Room setup guide dismissed')}
        />
      )}

      {/* AR Hit Test Indicator (only in AR mode) */}
      <ARHitTest
        enabled={spatialMode === 'ar'}
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

      {/* Main canvas panel at comfortable viewing distance (VR only) */}
      {spatialMode === 'vr' && <CanvasPanel3D />}

      {/* Canvas widgets rendered in 3D space */}
      {/* These are the actual widgets from the user's canvas, converted to 3D panels */}
      <SpatialWidgetContainer
        widgets={canvasWidgets}
        selectedWidgetId={primarySelectedWidgetId}
        onWidgetSelect={handleWidgetSelect}
        onWidgetTransformChange={handleWidgetTransformChange}
        interactive={activeTool === 'select' || activeTool === 'move'}
        debug={showDebugInfo}
      />

      {/* Demo interactive objects (VR only, AR uses placed objects) */}
      {spatialMode === 'vr' && (
        <>
          <InteractiveBox position={[-1.5, 1, -2]} color="#ef4444" />
          <InteractiveBox position={[1.5, 1, -2]} color="#3b82f6" />
          <InteractiveBox position={[0, 0.5, -1.5]} color="#f59e0b" />
        </>
      )}

      {/* Floating info panel */}
      <group position={[2.5, 1.8, -2]} rotation={[0, -0.3, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 0.8]} />
          <meshStandardMaterial color="#111827" transparent opacity={0.9} />
        </mesh>
        <Text
          position={[0, 0.25, 0.01]}
          fontSize={0.08}
          color="white"
          anchorX="center"
        >
          Spatial Mode
        </Text>
        <Text
          position={[0, 0.05, 0.01]}
          fontSize={0.12}
          color="#8b5cf6"
          anchorX="center"
        >
          {spatialMode.toUpperCase()}
        </Text>
        <Text
          position={[0, -0.2, 0.01]}
          fontSize={0.06}
          color="#6b7280"
          anchorX="center"
          maxWidth={1}
          textAlign="center"
        >
          {spatialMode === 'ar'
            ? `${placedObjects.length} objects placed`
            : 'Click boxes to interact'}
        </Text>
      </group>
    </group>
  );
}

export default SpatialScene;
