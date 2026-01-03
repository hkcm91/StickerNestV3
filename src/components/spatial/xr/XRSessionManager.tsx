/**
 * XRSessionManager - Session state tracking and management components
 *
 * Handles XR session lifecycle, background color, and device orientation controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useSpatialModeStore, useActiveSpatialMode } from '../../../state/useSpatialModeStore';

// ============================================================================
// XR Background Controller
// ============================================================================

/**
 * Controls the WebGL clear color based on spatial mode:
 * - VR mode: Fully OPAQUE background (dark space environment)
 * - AR mode: Fully TRANSPARENT (real-world passthrough)
 */
export function XRBackgroundController() {
  const { gl } = useThree();
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  useEffect(() => {
    const isARMode =
      spatialMode === 'ar' ||
      (sessionState === 'requesting' && targetMode === 'ar') ||
      (sessionState === 'active' && targetMode === 'ar');

    if (isARMode) {
      gl.setClearColor(0x000000, 0);
    } else {
      gl.setClearColor(0x0a0a0f, 1);
    }
  }, [gl, spatialMode, sessionState, targetMode]);

  return null;
}

// ============================================================================
// XR Session State Tracker
// ============================================================================

/**
 * Tracks XR session state and syncs to our store.
 * Must be inside the <XR> provider to access useXR hooks.
 */
export function XRSessionStateTracker() {
  const session = useXR((state) => state.session);
  const activeMode = useSpatialModeStore((s) => s.activeMode);
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);

  useEffect(() => {
    if (session) {
      const sessionMode = (session as unknown as { mode?: string }).mode;
      setSessionState('active');
      if (sessionMode === 'immersive-ar') {
        setActiveMode('ar');
      } else {
        setActiveMode('vr');
      }
    } else {
      const isInPreviewMode =
        (activeMode === 'vr' || activeMode === 'ar') && sessionState === 'none';

      if (!isInPreviewMode && sessionState === 'active') {
        setSessionState('none');
        setActiveMode('desktop');
      }
    }
  }, [session, activeMode, sessionState, setActiveMode, setSessionState]);

  return null;
}

// ============================================================================
// Device Orientation Controls (for Mobile VR Preview)
// ============================================================================

interface DeviceOrientationControlsProps {
  enabled?: boolean;
}

/**
 * Device orientation controls for mobile VR/AR preview mode.
 * Uses the phone's gyroscope to allow users to look around.
 */
export function DeviceOrientationControls({ enabled = true }: DeviceOrientationControlsProps) {
  const { camera } = useThree();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const deviceQuaternion = useRef(new THREE.Quaternion());
  const screenOrientation = useRef(0);
  const zee = useRef(new THREE.Vector3(0, 0, 1));
  const euler = useRef(new THREE.Euler());
  const q0 = useRef(new THREE.Quaternion());
  const q1 = useRef(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)));

  const requestPermission = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DOE?.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission();
        setHasPermission(permission === 'granted');
      } catch {
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (!('DeviceOrientationEvent' in window)) {
      setIsSupported(false);
      return;
    }

    requestPermission();
  }, [enabled, requestPermission]);

  useEffect(() => {
    if (!enabled || !hasPermission || !isSupported) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha ?? 0;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;

      const alphaRad = THREE.MathUtils.degToRad(alpha);
      const betaRad = THREE.MathUtils.degToRad(beta);
      const gammaRad = THREE.MathUtils.degToRad(gamma);

      euler.current.set(betaRad, alphaRad, -gammaRad, 'YXZ');
      deviceQuaternion.current.setFromEuler(euler.current);
      deviceQuaternion.current.multiply(q1.current);
      q0.current.setFromAxisAngle(zee.current, -screenOrientation.current);
      deviceQuaternion.current.multiply(q0.current);
    };

    const handleOrientationChange = () => {
      screenOrientation.current = THREE.MathUtils.degToRad(
        (window.orientation as number) || 0
      );
    };

    handleOrientationChange();
    window.addEventListener('deviceorientation', handleOrientation, true);
    window.addEventListener('orientationchange', handleOrientationChange, false);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('orientationchange', handleOrientationChange, false);
    };
  }, [enabled, hasPermission, isSupported]);

  useFrame(() => {
    if (!enabled || !hasPermission || !isSupported) return;
    camera.quaternion.copy(deviceQuaternion.current);
  });

  return null;
}

// ============================================================================
// Loading Fallback
// ============================================================================

export function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#8b5cf6" wireframe />
    </mesh>
  );
}
