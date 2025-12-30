/**
 * StickerNest - SpatialStickerManager
 *
 * Manages and renders a collection of SpatialStickers in 3D space.
 * Handles anchor resolution, visibility filtering, and interaction routing.
 * Integrates with the widget system for sticker click behaviors.
 */

import React, { useCallback, useMemo } from 'react';
import { SpatialSticker } from '../../../types/spatialEntity';
import { useActiveSpatialMode } from '../../../state/useSpatialModeStore';
import { AnchoredSticker } from './AnchoredSticker';

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
}: SpatialStickerManagerProps) {
  const spatialMode = useActiveSpatialMode();

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
            />
          ))}
        </group>
      ))}

      {/* Debug info overlay */}
      {debug && (
        <group position={[0, 2.5, -2]}>
          {/* Could add HTML debug panel here */}
        </group>
      )}
    </group>
  );
}

export default SpatialStickerManager;
