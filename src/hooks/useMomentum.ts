/**
 * StickerNest v2 - Momentum Physics Hook
 * Provides velocity tracking and momentum animation for smooth scrolling
 */

import { useRef, useCallback } from 'react';

// Momentum configuration
const DEFAULT_FRICTION = 0.92;
const DEFAULT_MIN_VELOCITY = 0.5;
const DEFAULT_MULTIPLIER = 0.8;
const VELOCITY_SAMPLE_WINDOW = 100; // ms

export interface MomentumConfig {
  friction?: number;
  minVelocity?: number;
  multiplier?: number;
}

export interface VelocitySample {
  x: number;
  y: number;
  timestamp: number;
}

export interface MomentumResult {
  /** Track a position for velocity calculation */
  trackVelocity: (x: number, y: number) => void;
  /** Calculate current velocity from samples */
  calculateVelocity: () => { x: number; y: number };
  /** Start momentum animation */
  applyMomentum: (onUpdate: (dx: number, dy: number) => void) => void;
  /** Stop momentum animation */
  stopMomentum: () => void;
  /** Reset velocity tracking */
  resetTracking: () => void;
  /** Check if momentum is active */
  isActive: () => boolean;
}

/**
 * Hook for momentum-based scrolling with velocity tracking
 */
export function useMomentum(config: MomentumConfig = {}): MomentumResult {
  const {
    friction = DEFAULT_FRICTION,
    minVelocity = DEFAULT_MIN_VELOCITY,
    multiplier = DEFAULT_MULTIPLIER,
  } = config;

  const velocityRef = useRef<VelocitySample[]>([]);
  const animationRef = useRef<number | null>(null);

  /**
   * Stop any ongoing momentum animation
   */
  const stopMomentum = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  /**
   * Reset velocity tracking
   */
  const resetTracking = useCallback(() => {
    velocityRef.current = [];
  }, []);

  /**
   * Track position for velocity calculation
   */
  const trackVelocity = useCallback((x: number, y: number) => {
    const now = performance.now();
    velocityRef.current.push({ x, y, timestamp: now });

    // Keep only recent samples
    const cutoff = now - VELOCITY_SAMPLE_WINDOW;
    velocityRef.current = velocityRef.current.filter(s => s.timestamp >= cutoff);
  }, []);

  /**
   * Calculate velocity from recent position samples
   */
  const calculateVelocity = useCallback((): { x: number; y: number } => {
    const samples = velocityRef.current;
    if (samples.length < 2) return { x: 0, y: 0 };

    // Use last few samples for velocity calculation
    const recentSamples = samples.slice(-5);
    const first = recentSamples[0];
    const last = recentSamples[recentSamples.length - 1];
    const dt = (last.timestamp - first.timestamp) / 1000;

    if (dt < 0.01) return { x: 0, y: 0 };

    return {
      x: (last.x - first.x) / dt / 60, // Per-frame velocity
      y: (last.y - first.y) / dt / 60,
    };
  }, []);

  /**
   * Apply momentum scrolling after release
   */
  const applyMomentum = useCallback((onUpdate: (dx: number, dy: number) => void) => {
    stopMomentum();

    const initialVelocity = calculateVelocity();
    let velocityX = initialVelocity.x * multiplier;
    let velocityY = initialVelocity.y * multiplier;

    const animate = () => {
      // Apply friction
      velocityX *= friction;
      velocityY *= friction;

      // Stop if velocity is too low
      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      if (speed < minVelocity) {
        animationRef.current = null;
        return;
      }

      // Apply update
      onUpdate(velocityX, velocityY);

      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [stopMomentum, calculateVelocity, friction, minVelocity, multiplier]);

  /**
   * Check if momentum animation is active
   */
  const isActive = useCallback(() => animationRef.current !== null, []);

  return {
    trackVelocity,
    calculateVelocity,
    applyMomentum,
    stopMomentum,
    resetTracking,
    isActive,
  };
}

export default useMomentum;
