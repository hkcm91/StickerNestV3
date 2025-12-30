/**
 * StickerNest - SpatialStickerManager
 *
 * Manages and renders a collection of SpatialStickers in 3D space.
 * Handles anchor resolution, visibility filtering, and interaction routing.
 * Integrates with the widget system for sticker click behaviors.
 * Supports IWSDK grab interactions for VR manipulation.
 */

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Object3D, Vector3, Quaternion } from 'three';
import { SpatialSticker, SpatialTransform } from '../../../types/spatialEntity';
import { useActiveSpatialMode } from '../../../state/useSpatialModeStore';
import { AnchoredSticker } from './AnchoredSticker';
import { useGrabInteraction } from '../iwsdk';

// ============================================================================
// Types
// ============================================================================

export interface SpatialStickerManagerProps {
  /** Array of spatial stickers to render */
  stickers: SpatialSticker[];
  /** Currently selected sticker ID */
  selectedStickerId?: string;
  /** Detected QR codes (from external detection system) */
  detectedQRCodes?: Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>;
  /** Persistent anchor data (loaded from storage) */
  persistentAnchors?: Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>;
  /** Callback when a sticker is clicked */
  onStickerClick?: (sticker: SpatialSticker) => void;
  /** Callback when a sticker requests widget launch */
  onLaunchWidget?: (widgetDefId: string, sticker: SpatialSticker) => void;
  /** Callback when a sticker requests widget toggle */
  onToggleWidget?: (widgetInstanceId: string, sticker: SpatialSticker) => void;
  /** Callback when a sticker requests URL opening */
  onOpenUrl?: (url: string) => void;
  /** Callback when a sticker emits an event */
  onEmitEvent?: (event: string, sticker: SpatialSticker) => void;
  /** Callback when a sticker requests pipeline execution */
  onRunPipeline?: (pipelineId: string, sticker: SpatialSticker) => void;
  /** Enable debug mode for all stickers */
  debug?: boolean;
  /** Enable IWSDK grab interactions (VR only) */
  enableGrab?: boolean;
  /** Callback when sticker transform changes (from grab manipulation) */
  onStickerTransformChange?: (sticker: SpatialSticker, transform: SpatialTransform) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function SpatialStickerManager({
  stickers,
  selectedStickerId,
  detectedQRCodes,
  persistentAnchors,
  onStickerClick,
  onLaunchWidget,
  onToggleWidget,
  onOpenUrl,
  onEmitEvent,
  onRunPipeline,
  debug = false,
  enableGrab = true,
  onStickerTransformChange,
}: SpatialStickerManagerProps) {
  const spatialMode = useActiveSpatialMode();
  const stickerRefs = useRef<Map<string, Object3D>>(new Map());

  // IWSDK Grab Interactions
  const grabInteraction = useGrabInteraction({
    enabled: enableGrab && spatialMode === 'vr',
    distanceGrab: true,
    maxGrabDistance: 3,
    twoHandManipulation: true,
    hapticIntensity: 0.5,
    onGrab: useCallback((object: Object3D, hand: 'left' | 'right') => {
      // Find which sticker was grabbed
      const stickerId = object.userData.stickerId;
      if (stickerId) {
        const sticker = stickers.find((s) => s.id === stickerId);
        if (sticker) {
          onStickerClick?.(sticker);
        }
      }
    }, [stickers, onStickerClick]),
    onManipulate: useCallback((object: Object3D, transform: { position: Vector3; rotation: Quaternion; scale: Vector3 }) => {
      const stickerId = object.userData.stickerId;
      if (stickerId && onStickerTransformChange) {
        const sticker = stickers.find((s) => s.id === stickerId);
        if (sticker) {
          const newTransform: SpatialTransform = {
            position: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
            rotation: {
              // Convert quaternion to euler (simplified)
              x: 0, y: 0, z: 0,
            },
            scale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z },
          };
          onStickerTransformChange(sticker, newTransform);
        }
      }
    }, [stickers, onStickerTransformChange]),
    debug,
  });

  // Filter stickers based on current mode visibility
  const visibleStickers = useMemo(() => {
    return stickers.filter((sticker) => {
      switch (spatialMode) {
        case 'vr':
          return sticker.visibleIn.vr;
        case 'ar':
          return sticker.visibleIn.ar;
        case 'desktop':
        default:
          return sticker.visibleIn.desktop;
      }
    });
  }, [stickers, spatialMode]);

  // Register grabbable stickers
  useEffect(() => {
    if (!enableGrab || spatialMode !== 'vr') return;

    visibleStickers.forEach((sticker) => {
      if (sticker.interactable) {
        const ref = stickerRefs.current.get(sticker.id);
        if (ref) {
          ref.userData.stickerId = sticker.id;
          grabInteraction.makeGrabbable(ref);
        }
      }
    });

    return () => {
      stickerRefs.current.forEach((ref) => {
        grabInteraction.makeNotGrabbable(ref);
      });
    };
  }, [enableGrab, spatialMode, visibleStickers, grabInteraction]);

  // Group stickers by layer for proper render ordering
  const stickersByLayer = useMemo(() => {
    const layers = new Map<string | undefined, SpatialSticker[]>();

    visibleStickers.forEach((sticker) => {
      const layerId = sticker.layerId;
      if (!layers.has(layerId)) {
        layers.set(layerId, []);
      }
      layers.get(layerId)!.push(sticker);
    });

    return layers;
  }, [visibleStickers]);

  // Check if sticker is being grabbed
  const isGrabbed = useCallback((stickerId: string): boolean => {
    const leftGrab = grabInteraction.leftGrab;
    const rightGrab = grabInteraction.rightGrab;
    return (
      (leftGrab?.object.userData.stickerId === stickerId) ||
      (rightGrab?.object.userData.stickerId === stickerId)
    );
  }, [grabInteraction.leftGrab, grabInteraction.rightGrab]);

  // Default URL handler
  const handleOpenUrl = useCallback(
    (url: string) => {
      if (onOpenUrl) {
        onOpenUrl(url);
      } else {
        // Default: open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [onOpenUrl]
  );

  return (
    <group name="spatial-sticker-manager">
      {/* Render stickers grouped by layer */}
      {Array.from(stickersByLayer.entries()).map(([layerId, layerStickers]) => (
        <group key={layerId ?? 'default-layer'} name={`sticker-layer-${layerId ?? 'default'}`}>
          {layerStickers.map((sticker) => (
            <AnchoredSticker
              key={sticker.id}
              sticker={sticker}
              selected={selectedStickerId === sticker.id}
              detectedQRCodes={detectedQRCodes}
              persistentAnchors={persistentAnchors}
              onClick={onStickerClick}
              onLaunchWidget={onLaunchWidget}
              onToggleWidget={onToggleWidget}
              onOpenUrl={handleOpenUrl}
              onEmitEvent={onEmitEvent}
              onRunPipeline={onRunPipeline}
              debug={debug}
              grabbable={enableGrab && sticker.interactable}
              isGrabbed={isGrabbed(sticker.id)}
            />
          ))}
        </group>
      ))}

      {/* Grab state indicator */}
      {debug && grabInteraction.state !== 'idle' && (
        <group position={[0, 2.5, -2]}>
          {/* Could add grab state visualization here */}
        </group>
      )}
    </group>
  );
}

export default SpatialStickerManager;
