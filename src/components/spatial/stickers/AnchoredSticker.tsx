/**
 * StickerNest - AnchoredSticker
 *
 * Wraps a SpatialSticker3D with anchor-based positioning.
 * Handles QR code anchoring, room surface anchoring, and persistent XR anchors.
 * Automatically positions stickers relative to real-world objects and surfaces.
 */

import React, { useMemo } from 'react';
import { useXRPlanes, XRSpace } from '@react-three/xr';
import { Billboard } from '@react-three/drei';
import { MathUtils } from 'three';
import {
  SpatialSticker,
  SpatialAnchor,
  isQRCodeAnchor,
  isRoomMappingAnchor,
  isPersistentAnchor,
  isManualAnchor,
  QRCodeAnchor,
  RoomMappingAnchor,
} from '../../../types/spatialEntity';
import { SpatialSticker3D, SpatialSticker3DProps } from './SpatialSticker3D';

// ============================================================================
// Types
// ============================================================================

export interface AnchoredStickerProps extends Omit<SpatialSticker3DProps, 'sticker'> {
  sticker: SpatialSticker;
  /** Detected QR codes in the scene (from external QR detection) */
  detectedQRCodes?: Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>;
  /** Persistent anchor positions (loaded from storage) */
  persistentAnchors?: Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>;
}

// ============================================================================
// QR Code Anchored Sticker
// ============================================================================

interface QRAnchoredProps {
  sticker: SpatialSticker;
  anchor: QRCodeAnchor;
  detectedQRCodes?: Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>;
  children: React.ReactNode;
}

function QRAnchored({ sticker, anchor, detectedQRCodes, children }: QRAnchoredProps) {
  // Find the QR code position from detected codes
  const qrData = detectedQRCodes?.get(anchor.qrContent);

  if (!qrData) {
    // QR code not currently detected - don't render
    return null;
  }

  // Apply offset from QR code center
  const position: [number, number, number] = [
    qrData.position[0] + anchor.offset.x,
    qrData.position[1] + anchor.offset.y,
    qrData.position[2] + anchor.offset.z,
  ];

  // Apply relative rotation
  const rotation: [number, number, number] = [
    MathUtils.degToRad(anchor.relativeRotation.x),
    MathUtils.degToRad(anchor.relativeRotation.y),
    MathUtils.degToRad(anchor.relativeRotation.z),
  ];

  return (
    <group position={position} rotation={rotation}>
      {children}
    </group>
  );
}

// ============================================================================
// Room Surface Anchored Sticker
// ============================================================================

interface SurfaceAnchoredProps {
  sticker: SpatialSticker;
  anchor: RoomMappingAnchor;
  children: React.ReactNode;
}

function SurfaceAnchored({ sticker, anchor, children }: SurfaceAnchoredProps) {
  // Get planes of the appropriate type
  const planes = useXRPlanes(anchor.type as 'floor' | 'wall' | 'table' | 'ceiling');

  // Find the nearest or first plane
  const targetPlane = planes[0]; // TODO: Use surfaceOffset to pick correct plane

  if (!targetPlane) {
    // No plane detected - render at transform position as fallback
    return <>{children}</>;
  }

  // Position relative to plane surface
  const offsetPosition: [number, number, number] = [
    anchor.surfaceOffset.x,
    anchor.distanceFromSurface,
    anchor.surfaceOffset.y,
  ];

  const content = (
    <group position={offsetPosition}>
      {children}
    </group>
  );

  // Wrap in billboard if requested
  if (anchor.billboard) {
    return (
      <XRSpace space={targetPlane.planeSpace}>
        <Billboard>{content}</Billboard>
      </XRSpace>
    );
  }

  return (
    <XRSpace space={targetPlane.planeSpace}>
      {content}
    </XRSpace>
  );
}

// ============================================================================
// Persistent Anchor Sticker
// ============================================================================

interface PersistentAnchoredProps {
  sticker: SpatialSticker;
  anchorHandle: string;
  persistentAnchors?: Map<string, { position: [number, number, number]; rotation: [number, number, number, number] }>;
  children: React.ReactNode;
}

function PersistentAnchored({
  sticker,
  anchorHandle,
  persistentAnchors,
  children,
}: PersistentAnchoredProps) {
  // Get position from persistent anchor storage
  const anchorData = persistentAnchors?.get(anchorHandle);

  if (!anchorData) {
    // Anchor not available - render at transform position
    return <>{children}</>;
  }

  return (
    <group position={anchorData.position} quaternion={anchorData.rotation as unknown as [number, number, number, number]}>
      {children}
    </group>
  );
}

// ============================================================================
// Manual/No Anchor Sticker
// ============================================================================

function ManualAnchored({ children }: { children: React.ReactNode }) {
  // No special positioning - just render children with their transform
  return <>{children}</>;
}

// ============================================================================
// Main Component
// ============================================================================

export function AnchoredSticker({
  sticker,
  detectedQRCodes,
  persistentAnchors,
  ...stickerProps
}: AnchoredStickerProps) {
  const anchor = sticker.anchor;

  // Create the base sticker component
  const stickerComponent = (
    <SpatialSticker3D sticker={sticker} {...stickerProps} />
  );

  // Wrap based on anchor type
  if (isQRCodeAnchor(anchor)) {
    return (
      <QRAnchored
        sticker={sticker}
        anchor={anchor}
        detectedQRCodes={detectedQRCodes}
      >
        {stickerComponent}
      </QRAnchored>
    );
  }

  if (isRoomMappingAnchor(anchor)) {
    return (
      <SurfaceAnchored sticker={sticker} anchor={anchor}>
        {stickerComponent}
      </SurfaceAnchored>
    );
  }

  if (isPersistentAnchor(anchor)) {
    return (
      <PersistentAnchored
        sticker={sticker}
        anchorHandle={anchor.anchorHandle}
        persistentAnchors={persistentAnchors}
      >
        {stickerComponent}
      </PersistentAnchored>
    );
  }

  // Manual or no anchor - render directly
  return <ManualAnchored>{stickerComponent}</ManualAnchored>;
}

export default AnchoredSticker;
