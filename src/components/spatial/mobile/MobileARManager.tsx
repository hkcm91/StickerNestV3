/**
 * StickerNest - Mobile AR Manager Component
 *
 * Main component for mobile AR experiences. Combines touch placement,
 * pinch gestures, and AR capabilities detection into a cohesive system.
 * Optimized for Chrome Android, with Safari iOS fallbacks.
 *
 * Features:
 * - Automatic AR capability detection
 * - Touch-based sticker placement
 * - Pinch-to-scale and rotate gestures
 * - Visual placement indicators
 * - AR session management
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Vector3, Quaternion } from 'three';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useMobileAR, useARSessionFeatures } from './useMobileAR';
import { useTouchPlacement, TouchPlacementResult } from './useTouchPlacement';
import { usePinchGestures } from './usePinchGestures';
import { useActiveSpatialMode } from '../../../state/useSpatialModeStore';
import { haptic } from '../../../utils/haptics';

// ============================================================================
// Types
// ============================================================================

export interface MobileARManagerProps {
  /** Enable mobile AR features */
  enabled?: boolean;
  /** Callback when sticker is placed */
  onStickerPlace?: (position: [number, number, number], rotation: [number, number, number, number], scale: number) => void;
  /** Callback when selected sticker transform changes */
  onStickerTransform?: (stickerId: string, scale: number, rotation: number) => void;
  /** Currently selected sticker ID (for manipulation) */
  selectedStickerId?: string | null;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Indicator color */
  indicatorColor?: string;
  /** Debug mode */
  debug?: boolean;
  /** Children (stickers, etc.) */
  children?: React.ReactNode;
}

// ============================================================================
// Placement Indicator Component
// ============================================================================

interface PlacementIndicatorProps {
  position: Vector3;
  rotation: Quaternion;
  color: string;
  visible: boolean;
  scale?: number;
}

function PlacementIndicator({ position, rotation, color, visible, scale = 1 }: PlacementIndicatorProps) {
  const [pulse, setPulse] = useState(0);

  useFrame((_, delta) => {
    setPulse(prev => (prev + delta * 3) % (Math.PI * 2));
  });

  if (!visible) return null;

  const pulseScale = 1 + Math.sin(pulse) * 0.15;

  return (
    <group position={position} quaternion={rotation}>
      {/* Main indicator ring */}
      <mesh rotation-x={-Math.PI / 2} scale={[pulseScale * scale, pulseScale * scale, 1]}>
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Center dot */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.03 * scale, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>

      {/* Directional arrow (shows forward direction) */}
      <mesh position={[0, 0.001, -0.15 * scale]} rotation-x={-Math.PI / 2}>
        <coneGeometry args={[0.04 * scale, 0.08 * scale, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Mobile AR Status Overlay
// ============================================================================

interface ARStatusOverlayProps {
  status: string;
  level: 'full' | 'limited' | 'fallback' | 'none';
  isPlacing: boolean;
}

function ARStatusOverlay({ status, level, isPlacing }: ARStatusOverlayProps) {
  // Status colors based on capability level
  const levelColors = {
    full: '#22c55e',
    limited: '#f59e0b',
    fallback: '#ef4444',
    none: '#6b7280',
  };

  return (
    <group position={[0, 2, -2]}>
      {/* This is a 3D status indicator - actual UI would be HTML overlay */}
      {isPlacing && (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.5, 0.1]} />
          <meshBasicMaterial color={levelColors[level]} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MobileARManager({
  enabled = true,
  onStickerPlace,
  onStickerTransform,
  selectedStickerId,
  haptics = true,
  indicatorColor = '#8b5cf6',
  debug = false,
  children,
}: MobileARManagerProps) {
  const spatialMode = useActiveSpatialMode();
  const arCapabilities = useMobileAR();
  const { isPresenting } = useXR();
  const sessionFeatures = useARSessionFeatures();

  // Only active in AR mode on mobile
  const isARMode = spatialMode === 'ar';
  const isMobileAR = isARMode && arCapabilities.isMobile;
  const isActive = enabled && isMobileAR;

  // Placement state
  const [pendingScale, setPendingScale] = useState(1);
  const [pendingRotation, setPendingRotation] = useState(0);

  // Touch placement hook
  const touchPlacement = useTouchPlacement({
    enabled: isActive,
    heightOffset: 0.02,
    haptics,
    mode: 'tap',
    debug,
    onPositionUpdate: useCallback((result) => {
      if (debug && result) {
        console.log('[MobileARManager] Placement preview:', result.position.toArray());
      }
    }, [debug]),
    onPlace: useCallback((result: TouchPlacementResult) => {
      if (haptics) {
        haptic.success();
      }

      onStickerPlace?.(
        [result.position.x, result.position.y, result.position.z],
        [result.rotation.x, result.rotation.y, result.rotation.z, result.rotation.w],
        pendingScale
      );

      // Reset pending transforms
      setPendingScale(1);
      setPendingRotation(0);

      if (debug) {
        console.log('[MobileARManager] Sticker placed:', result);
      }
    }, [haptics, onStickerPlace, pendingScale, debug]),
  });

  // Pinch gestures for manipulating selected sticker
  const pinchGestures = usePinchGestures({
    enabled: isActive && !!selectedStickerId,
    minScale: 0.25,
    maxScale: 3,
    initialScale: 1,
    enableRotation: true,
    haptics,
    debug,
    onTransformChange: useCallback((scale, rotation) => {
      if (selectedStickerId) {
        onStickerTransform?.(selectedStickerId, scale, rotation);
      } else {
        // If no sticker selected, adjust pending placement transforms
        setPendingScale(scale);
        setPendingRotation(rotation);
      }
    }, [selectedStickerId, onStickerTransform]),
  });

  // Auto-start placement mode in AR
  useEffect(() => {
    if (isActive && !touchPlacement.isPlacing) {
      touchPlacement.startPlacement();
    } else if (!isActive && touchPlacement.isPlacing) {
      touchPlacement.stopPlacement();
    }
  }, [isActive, touchPlacement.isPlacing]);

  // Compute indicator transform with pending adjustments
  const indicatorTransform = useMemo(() => {
    if (!touchPlacement.previewPosition) return null;

    const position = touchPlacement.previewPosition.position.clone();
    const rotation = touchPlacement.previewPosition.rotation.clone();

    // Apply pending rotation from pinch gesture
    if (pendingRotation !== 0) {
      const additionalRotation = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        pendingRotation
      );
      rotation.multiply(additionalRotation);
    }

    return { position, rotation, scale: pendingScale };
  }, [touchPlacement.previewPosition, pendingScale, pendingRotation]);

  // Don't render if not active
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <group name="mobile-ar-manager">
      {/* AR Status (dev mode) */}
      {debug && (
        <ARStatusOverlay
          status={arCapabilities.statusMessage}
          level={arCapabilities.level}
          isPlacing={touchPlacement.isPlacing}
        />
      )}

      {/* Placement Indicator */}
      {indicatorTransform && (
        <PlacementIndicator
          position={indicatorTransform.position}
          rotation={indicatorTransform.rotation}
          color={indicatorColor}
          visible={touchPlacement.isPlacing}
          scale={indicatorTransform.scale}
        />
      )}

      {/* Touch target for pinch gestures (invisible plane) */}
      {selectedStickerId && (
        <mesh
          position={[0, 1, -2]}
          {...pinchGestures.bind()}
          visible={false}
        >
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Render children (stickers, etc.) */}
      {children}
    </group>
  );
}

// ============================================================================
// Mobile AR Entry Button
// ============================================================================

interface MobileARButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function MobileARButton({ onClick, disabled, className }: MobileARButtonProps) {
  const arCapabilities = useMobileAR();

  // Show appropriate button based on AR capabilities
  const buttonText = useMemo(() => {
    switch (arCapabilities.level) {
      case 'full':
        return 'Enter AR';
      case 'limited':
        return 'Enter AR (Limited)';
      case 'fallback':
        return 'View in AR';
      default:
        return 'AR Not Available';
    }
  }, [arCapabilities.level]);

  const isDisabled = disabled || arCapabilities.level === 'none';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 600,
        borderRadius: '8px',
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        backgroundColor: isDisabled ? '#6b7280' : '#8b5cf6',
        color: 'white',
        opacity: isDisabled ? 0.5 : 1,
        touchAction: 'manipulation',
        ...(!isDisabled && {
          boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
        }),
      }}
    >
      {buttonText}
    </button>
  );
}

// ============================================================================
// AR Capability Badge
// ============================================================================

export function ARCapabilityBadge() {
  const arCapabilities = useMobileAR();

  if (!arCapabilities.isMobile) return null;

  const badgeColors = {
    full: { bg: '#dcfce7', text: '#166534' },
    limited: { bg: '#fef3c7', text: '#92400e' },
    fallback: { bg: '#fee2e2', text: '#991b1b' },
    none: { bg: '#f3f4f6', text: '#6b7280' },
  };

  const colors = badgeColors[arCapabilities.level];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '4px',
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {arCapabilities.browser === 'chrome-android' ? 'Chrome AR' :
       arCapabilities.browser === 'safari-ios' ? 'Safari AR' :
       'AR'}: {arCapabilities.level}
    </span>
  );
}

export default MobileARManager;
