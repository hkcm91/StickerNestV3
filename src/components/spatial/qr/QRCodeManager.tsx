/**
 * StickerNest - QR Code Manager
 *
 * 3D panel for managing QR codes in VR/AR space.
 * Allows users to register new QR codes and view attached stickers.
 */

import React, { useState, useCallback } from 'react';
import { Text, RoundedBox } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import {
  useSpatialStickerStore,
  useRegisteredQRCodes,
  useDetectedQRCodes,
} from '../../../state/useSpatialStickerStore';
import { RegisteredQRCode } from '../../../types/spatialEntity';
import { FloatingPanel } from '../xr/FloatingPanel';

// ============================================================================
// Types
// ============================================================================

export interface QRCodeManagerProps {
  /** Panel position in 3D space */
  position?: [number, number, number];
  /** Whether panel is visible */
  visible?: boolean;
  /** Callback when panel should close */
  onClose?: () => void;
}

// ============================================================================
// QR Code Item
// ============================================================================

interface QRCodeItemProps {
  qrCode: RegisteredQRCode;
  isDetected: boolean;
  position: [number, number, number];
  onSelect?: (qrCode: RegisteredQRCode) => void;
}

function QRCodeItem({ qrCode, isDetected, position, onSelect }: QRCodeItemProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.(qrCode);
  };

  return (
    <group position={position}>
      {/* Background */}
      <RoundedBox
        args={[0.35, 0.08, 0.005]}
        radius={0.01}
        smoothness={4}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <meshBasicMaterial
          color={hovered ? '#374151' : '#1f2937'}
          transparent
          opacity={0.95}
        />
      </RoundedBox>

      {/* Detection indicator */}
      <mesh position={[-0.15, 0, 0.003]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial
          color={isDetected ? '#22c55e' : '#6b7280'}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0.02, 0, 0.003]}
        fontSize={0.022}
        color="white"
        anchorX="left"
        anchorY="middle"
        maxWidth={0.25}
      >
        {qrCode.label}
      </Text>

      {/* Sticker count */}
      <Text
        position={[0.15, 0, 0.003]}
        fontSize={0.018}
        color="#9ca3af"
        anchorX="right"
        anchorY="middle"
      >
        {qrCode.attachedStickerIds.length}
      </Text>
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function QRCodeManager({
  position = [0.5, 1.5, -0.8],
  visible = true,
  onClose,
}: QRCodeManagerProps) {
  const registeredQRCodes = useRegisteredQRCodes();
  const detectedQRCodes = useDetectedQRCodes();
  const [selectedQR, setSelectedQR] = useState<RegisteredQRCode | null>(null);

  const registerQRCode = useSpatialStickerStore((state) => state.registerQRCode);
  const unregisterQRCode = useSpatialStickerStore((state) => state.unregisterQRCode);

  // Register a new QR code from detection
  const handleRegisterFromDetection = useCallback((content: string) => {
    const newQR: RegisteredQRCode = {
      id: `qr-${Date.now()}`,
      userId: 'current-user', // TODO: Get from auth context
      content,
      label: `QR ${registeredQRCodes.size + 1}`,
      sizeMeters: 0.1,
      attachedStickerIds: [],
      createdAt: Date.now(),
    };
    registerQRCode(newQR);
  }, [registerQRCode, registeredQRCodes.size]);

  const handleSelectQR = useCallback((qrCode: RegisteredQRCode) => {
    setSelectedQR(qrCode);
  }, []);

  if (!visible) return null;

  const qrCodesList = Array.from(registeredQRCodes.values());
  const detectedList = Array.from(detectedQRCodes.values());

  // Find unregistered detections
  const unregisteredDetections = detectedList.filter(
    (d) => !registeredQRCodes.has(d.content)
  );

  return (
    <FloatingPanel
      position={position}
      width={0.4}
      height={0.5}
      title="QR Codes"
      onClose={onClose}
    >
      {/* Registered QR Codes Section */}
      <group position={[0, 0.15, 0]}>
        <Text
          position={[-0.17, 0, 0.003]}
          fontSize={0.02}
          color="#9ca3af"
          anchorX="left"
          anchorY="middle"
        >
          Registered ({qrCodesList.length})
        </Text>

        {qrCodesList.length === 0 ? (
          <Text
            position={[0, -0.05, 0.003]}
            fontSize={0.018}
            color="#6b7280"
            anchorX="center"
            anchorY="middle"
          >
            No QR codes registered
          </Text>
        ) : (
          qrCodesList.map((qr, index) => (
            <QRCodeItem
              key={qr.id}
              qrCode={qr}
              isDetected={detectedQRCodes.has(qr.content)}
              position={[0, -0.05 - index * 0.09, 0]}
              onSelect={handleSelectQR}
            />
          ))
        )}
      </group>

      {/* Detected (Unregistered) Section */}
      {unregisteredDetections.length > 0 && (
        <group position={[0, -0.1, 0]}>
          <Text
            position={[-0.17, 0, 0.003]}
            fontSize={0.02}
            color="#f59e0b"
            anchorX="left"
            anchorY="middle"
          >
            Detected ({unregisteredDetections.length})
          </Text>

          {unregisteredDetections.map((detection, index) => (
            <group key={detection.content} position={[0, -0.05 - index * 0.09, 0]}>
              <RoundedBox
                args={[0.35, 0.08, 0.005]}
                radius={0.01}
                smoothness={4}
                onClick={() => handleRegisterFromDetection(detection.content)}
              >
                <meshBasicMaterial color="#422006" transparent opacity={0.9} />
              </RoundedBox>

              {/* Pulsing indicator */}
              <mesh position={[-0.15, 0, 0.003]}>
                <circleGeometry args={[0.012, 16]} />
                <meshBasicMaterial color="#f59e0b" />
              </mesh>

              <Text
                position={[0.02, 0, 0.003]}
                fontSize={0.018}
                color="#f59e0b"
                anchorX="left"
                anchorY="middle"
                maxWidth={0.2}
              >
                {detection.content.substring(0, 20)}...
              </Text>

              <Text
                position={[0.15, 0, 0.003]}
                fontSize={0.016}
                color="#fbbf24"
                anchorX="right"
                anchorY="middle"
              >
                + Add
              </Text>
            </group>
          ))}
        </group>
      )}

      {/* Help text */}
      <Text
        position={[0, -0.22, 0.003]}
        fontSize={0.014}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={0.35}
      >
        Point at QR codes to detect them. Tap to register and attach stickers.
      </Text>
    </FloatingPanel>
  );
}

export default QRCodeManager;
