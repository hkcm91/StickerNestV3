/**
 * StickerNest - QR Code Detection Hook
 *
 * Detects QR codes in AR/VR environment and updates positions.
 * Uses WebXR DOM Overlay or native passthrough for detection.
 *
 * Note: WebXR doesn't have built-in QR detection, so this integrates with:
 * 1. Native platform QR detection (Quest, Vision Pro via native bridge)
 * 2. Camera-based detection using jsQR library (fallback)
 * 3. Manual QR placement for testing
 */

import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useSpatialStickerStore, DetectedQRCode } from '../../../state/useSpatialStickerStore';

// ============================================================================
// Types
// ============================================================================

export interface QRCodeDetectionConfig {
  /** Enable detection */
  enabled: boolean;
  /** Detection interval in ms */
  detectionInterval?: number;
  /** How long before detection expires (ms) */
  detectionTimeout?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface QRCodeDetectionResult {
  /** Currently detected QR codes */
  detectedCodes: Map<string, DetectedQRCode>;
  /** Whether detection is active */
  isDetecting: boolean;
  /** Manually add a QR detection (for testing) */
  simulateDetection: (
    content: string,
    position: [number, number, number],
    rotation?: [number, number, number, number]
  ) => void;
  /** Clear all detections */
  clearDetections: () => void;
  /** Start/stop detection */
  setDetecting: (detecting: boolean) => void;
}

// ============================================================================
// Native Bridge Interface
// ============================================================================

/**
 * Interface for native QR detection bridge.
 * Platforms like Quest/Vision Pro can provide native QR detection.
 */
interface NativeQRBridge {
  startDetection: () => void;
  stopDetection: () => void;
  onDetection: (callback: (codes: NativeQRResult[]) => void) => void;
}

interface NativeQRResult {
  content: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  sizeMeters: number;
  confidence: number;
}

// Check if native bridge is available
function getNativeBridge(): NativeQRBridge | null {
  if (typeof window !== 'undefined' && (window as unknown as { StickerNestQR?: NativeQRBridge }).StickerNestQR) {
    return (window as unknown as { StickerNestQR: NativeQRBridge }).StickerNestQR;
  }
  return null;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useQRCodeDetection(
  config: QRCodeDetectionConfig
): QRCodeDetectionResult {
  const {
    enabled,
    detectionInterval = 100,
    detectionTimeout = 2000,
    minConfidence = 0.5,
    debug = false,
  } = config;

  const { isPresenting } = useXR();
  const isDetectingRef = useRef(false);
  const lastPruneRef = useRef(0);

  // Get store actions
  const updateDetectedQRCode = useSpatialStickerStore(
    (state) => state.updateDetectedQRCode
  );
  const clearDetectedQRCodes = useSpatialStickerStore(
    (state) => state.clearDetectedQRCodes
  );
  const pruneOldDetections = useSpatialStickerStore(
    (state) => state.pruneOldDetections
  );
  const detectedQRCodes = useSpatialStickerStore(
    (state) => state.detectedQRCodes
  );

  // Simulate QR detection (for testing without actual QR codes)
  const simulateDetection = useCallback(
    (
      content: string,
      position: [number, number, number],
      rotation: [number, number, number, number] = [0, 0, 0, 1]
    ) => {
      const detection: DetectedQRCode = {
        content,
        position,
        rotation,
        confidence: 1.0,
        lastSeen: Date.now(),
      };

      updateDetectedQRCode(detection);

      if (debug) {
        console.log('[QR Detection] Simulated:', content, 'at', position);
      }
    },
    [updateDetectedQRCode, debug]
  );

  // Clear all detections
  const clearDetections = useCallback(() => {
    clearDetectedQRCodes();
    if (debug) {
      console.log('[QR Detection] Cleared all detections');
    }
  }, [clearDetectedQRCodes, debug]);

  // Toggle detection
  const setDetecting = useCallback((detecting: boolean) => {
    isDetectingRef.current = detecting;

    const nativeBridge = getNativeBridge();
    if (nativeBridge) {
      if (detecting) {
        nativeBridge.startDetection();
      } else {
        nativeBridge.stopDetection();
      }
    }

    if (debug) {
      console.log('[QR Detection]', detecting ? 'Started' : 'Stopped');
    }
  }, [debug]);

  // Set up native bridge listener
  useEffect(() => {
    if (!enabled) return;

    const nativeBridge = getNativeBridge();
    if (!nativeBridge) {
      if (debug) {
        console.log('[QR Detection] No native bridge available');
      }
      return;
    }

    nativeBridge.onDetection((codes: NativeQRResult[]) => {
      codes.forEach((code) => {
        if (code.confidence >= minConfidence) {
          const detection: DetectedQRCode = {
            content: code.content,
            position: [code.position.x, code.position.y, code.position.z],
            rotation: [code.rotation.x, code.rotation.y, code.rotation.z, code.rotation.w],
            confidence: code.confidence,
            lastSeen: Date.now(),
          };
          updateDetectedQRCode(detection);

          if (debug) {
            console.log('[QR Detection] Native:', code.content);
          }
        }
      });
    });

    if (isPresenting) {
      nativeBridge.startDetection();
      isDetectingRef.current = true;
    }

    return () => {
      nativeBridge.stopDetection();
      isDetectingRef.current = false;
    };
  }, [enabled, isPresenting, minConfidence, updateDetectedQRCode, debug]);

  // Prune old detections periodically
  useFrame(() => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastPruneRef.current > detectionInterval) {
      lastPruneRef.current = now;
      pruneOldDetections(detectionTimeout);
    }
  });

  return {
    detectedCodes: detectedQRCodes,
    isDetecting: isDetectingRef.current,
    simulateDetection,
    clearDetections,
    setDetecting,
  };
}

export default useQRCodeDetection;
