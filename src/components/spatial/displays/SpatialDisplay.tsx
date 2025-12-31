/**
 * StickerNest - Spatial Display
 *
 * A 3D display surface for video/images in VR/AR space.
 * Can be placed on collision surfaces (walls, doors, TVs, frames, etc.)
 * and controlled via pipelines or broadcast events.
 *
 * Features:
 * - Video texture rendering on 3D plane
 * - Image display support
 * - Snap-to-surface placement using collision system
 * - Pipeline input for media control
 * - Broadcast event support for multi-display control
 * - Chroma key transparency option
 * - Emissive (self-lit) mode for visibility in dark scenes
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import {
  Vector3,
  Quaternion,
  Mesh,
  Group,
  VideoTexture,
  TextureLoader,
  Texture,
  DoubleSide,
  Color,
  SRGBColorSpace,
  LinearFilter,
  MeshStandardMaterial,
  MeshBasicMaterial,
} from 'three';
import { useCollisionStore } from '../../../state/useCollisionStore';
import type { CollisionSurface, SnapPoint } from '../../../types/collisionTypes';

// ============================================================================
// Types
// ============================================================================

export type MediaType = 'none' | 'video' | 'image' | 'color' | 'stream';

export interface MediaSource {
  type: MediaType;
  url?: string;
  color?: string;
  stream?: MediaStream;
}

export interface SpatialDisplayProps {
  /** Unique display ID for targeting via pipelines */
  id: string;

  /** Display name shown in controller */
  name?: string;

  /** Initial position in 3D space */
  position?: [number, number, number];

  /** Initial rotation as quaternion */
  quaternion?: Quaternion;

  /** Display size in meters [width, height] */
  size?: [number, number];

  /** Initial media source */
  media?: MediaSource;

  /** Surface ID this display is attached to */
  surfaceId?: string;

  /** Snap point ID this display is attached to */
  snapPointId?: string;

  /** Whether display is emissive (self-lit) */
  emissive?: boolean;

  /** Emissive intensity (0-2) */
  emissiveIntensity?: number;

  /** Enable chroma key transparency */
  chromaKey?: boolean;

  /** Chroma key color (default: green) */
  chromaKeyColor?: string;

  /** Chroma key threshold (0-1) */
  chromaKeyThreshold?: number;

  /** Show border frame */
  showFrame?: boolean;

  /** Frame color */
  frameColor?: string;

  /** Frame thickness in meters */
  frameThickness?: number;

  /** Interactive (can be grabbed/moved) */
  interactive?: boolean;

  /** Show debug info */
  debug?: boolean;

  /** Called when display is clicked */
  onClick?: (displayId: string) => void;

  /** Called when media changes */
  onMediaChange?: (displayId: string, media: MediaSource) => void;

  /** Called when display is moved */
  onPositionChange?: (displayId: string, position: Vector3, rotation: Quaternion) => void;
}

// ============================================================================
// Display Registry (for controller discovery)
// ============================================================================

interface DisplayRegistryEntry {
  id: string;
  name: string;
  surfaceType?: string;
  media: MediaSource;
}

const displayRegistry = new Map<string, DisplayRegistryEntry>();

export function getRegisteredDisplays(): DisplayRegistryEntry[] {
  return Array.from(displayRegistry.values());
}

export function getDisplayById(id: string): DisplayRegistryEntry | undefined {
  return displayRegistry.get(id);
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SIZE: [number, number] = [1.6, 0.9]; // 16:9 aspect ratio
const DEFAULT_COLOR = '#000000';
const FRAME_DEFAULT_COLOR = '#1a1a2e';
const FRAME_DEFAULT_THICKNESS = 0.02;

// ============================================================================
// Main Component
// ============================================================================

export function SpatialDisplay({
  id,
  name,
  position = [0, 1.5, -2],
  quaternion,
  size = DEFAULT_SIZE,
  media = { type: 'color', color: '#111111' },
  surfaceId,
  snapPointId,
  emissive = true,
  emissiveIntensity = 0.8,
  chromaKey = false,
  chromaKeyColor = '#00FF00',
  chromaKeyThreshold = 0.4,
  showFrame = true,
  frameColor = FRAME_DEFAULT_COLOR,
  frameThickness = FRAME_DEFAULT_THICKNESS,
  interactive = true,
  debug = false,
  onClick,
  onMediaChange,
  onPositionChange,
}: SpatialDisplayProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial | MeshBasicMaterial>(null);

  // State
  const [hovered, setHovered] = useState(false);
  const [currentMedia, setCurrentMedia] = useState<MediaSource>(media);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collision store for surface info
  const surfaces = useCollisionStore((s) => s.surfaces);

  // Get attached surface info
  const attachedSurface = useMemo(() => {
    if (!surfaceId) return null;
    return surfaces.get(surfaceId) || null;
  }, [surfaceId, surfaces]);

  // Display name for UI
  const displayName = useMemo(() => {
    if (name) return name;
    if (attachedSurface) {
      return `Display on ${attachedSurface.type}`;
    }
    return `Display ${id.slice(0, 8)}`;
  }, [id, name, attachedSurface]);

  // Cursor feedback
  useCursor(hovered && interactive);

  // Register display for discovery
  useEffect(() => {
    displayRegistry.set(id, {
      id,
      name: displayName,
      surfaceType: attachedSurface?.type,
      media: currentMedia,
    });

    return () => {
      displayRegistry.delete(id);
    };
  }, [id, displayName, attachedSurface, currentMedia]);

  // ============================================================================
  // Media Loading
  // ============================================================================

  /**
   * Load video from URL
   */
  const loadVideo = useCallback(async (url: string) => {
    try {
      setError(null);

      // Clean up previous video
      if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
        videoElement.load();
      }

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true; // Start muted for autoplay
      video.playsInline = true;
      video.src = url;

      await video.play();

      const videoTexture = new VideoTexture(video);
      videoTexture.minFilter = LinearFilter;
      videoTexture.magFilter = LinearFilter;
      videoTexture.colorSpace = SRGBColorSpace;

      setVideoElement(video);
      setTexture(videoTexture);
      setIsPlaying(true);

      console.log(`[SpatialDisplay ${id}] Video loaded:`, url);
    } catch (err) {
      console.error(`[SpatialDisplay ${id}] Video load error:`, err);
      setError(`Failed to load video: ${err}`);
    }
  }, [id, videoElement]);

  /**
   * Load image from URL
   */
  const loadImage = useCallback(async (url: string) => {
    try {
      setError(null);

      const loader = new TextureLoader();
      const imageTexture = await new Promise<Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });

      imageTexture.colorSpace = SRGBColorSpace;
      setTexture(imageTexture);

      console.log(`[SpatialDisplay ${id}] Image loaded:`, url);
    } catch (err) {
      console.error(`[SpatialDisplay ${id}] Image load error:`, err);
      setError(`Failed to load image: ${err}`);
    }
  }, [id]);

  /**
   * Load media stream (webcam, screen share)
   */
  const loadStream = useCallback((stream: MediaStream) => {
    try {
      setError(null);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      video.play();

      const videoTexture = new VideoTexture(video);
      videoTexture.minFilter = LinearFilter;
      videoTexture.magFilter = LinearFilter;

      setVideoElement(video);
      setTexture(videoTexture);
      setIsPlaying(true);

      console.log(`[SpatialDisplay ${id}] Stream connected`);
    } catch (err) {
      console.error(`[SpatialDisplay ${id}] Stream error:`, err);
      setError(`Failed to load stream: ${err}`);
    }
  }, [id]);

  // Handle media changes
  useEffect(() => {
    // Clean up previous resources
    if (videoElement && currentMedia.type !== 'video' && currentMedia.type !== 'stream') {
      videoElement.pause();
      videoElement.src = '';
      setVideoElement(null);
    }

    if (texture && currentMedia.type === 'color') {
      texture.dispose();
      setTexture(null);
    }

    // Load new media
    switch (currentMedia.type) {
      case 'video':
        if (currentMedia.url) {
          loadVideo(currentMedia.url);
        }
        break;

      case 'image':
        if (currentMedia.url) {
          loadImage(currentMedia.url);
        }
        break;

      case 'stream':
        if (currentMedia.stream) {
          loadStream(currentMedia.stream);
        }
        break;

      case 'color':
      case 'none':
      default:
        setTexture(null);
        break;
    }
  }, [currentMedia, loadVideo, loadImage, loadStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
      }
      if (texture) {
        texture.dispose();
      }
    };
  }, []);

  // ============================================================================
  // Media Control API
  // ============================================================================

  /**
   * Public API for controlling this display
   */
  const controlAPI = useMemo(() => ({
    load: (newMedia: MediaSource) => {
      setCurrentMedia(newMedia);
      onMediaChange?.(id, newMedia);
    },

    play: () => {
      if (videoElement) {
        videoElement.play();
        setIsPlaying(true);
      }
    },

    pause: () => {
      if (videoElement) {
        videoElement.pause();
        setIsPlaying(false);
      }
    },

    stop: () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
        setIsPlaying(false);
      }
    },

    setVolume: (volume: number) => {
      if (videoElement) {
        videoElement.volume = Math.max(0, Math.min(1, volume));
        videoElement.muted = volume === 0;
      }
    },

    seek: (time: number) => {
      if (videoElement) {
        videoElement.currentTime = time;
      }
    },

    getStatus: () => ({
      id,
      name: displayName,
      media: currentMedia,
      isPlaying,
      duration: videoElement?.duration || 0,
      currentTime: videoElement?.currentTime || 0,
      error,
    }),
  }), [id, displayName, currentMedia, isPlaying, videoElement, error, onMediaChange]);

  // Expose control API globally for pipeline access
  useEffect(() => {
    (window as any).__spatialDisplays = (window as any).__spatialDisplays || {};
    (window as any).__spatialDisplays[id] = controlAPI;

    return () => {
      delete (window as any).__spatialDisplays?.[id];
    };
  }, [id, controlAPI]);

  // ============================================================================
  // Rendering
  // ============================================================================

  // Material color when no texture
  const displayColor = currentMedia.type === 'color' && currentMedia.color
    ? currentMedia.color
    : DEFAULT_COLOR;

  // Handle click
  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [id, onClick]);

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
    >
      {/* Main display surface */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <planeGeometry args={[size[0], size[1]]} />
        {emissive ? (
          <meshStandardMaterial
            ref={materialRef as any}
            map={texture}
            color={texture ? '#ffffff' : displayColor}
            emissive={texture ? '#ffffff' : displayColor}
            emissiveMap={texture}
            emissiveIntensity={emissiveIntensity}
            side={DoubleSide}
            transparent={chromaKey}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial
            ref={materialRef as any}
            map={texture}
            color={texture ? '#ffffff' : displayColor}
            side={DoubleSide}
            transparent={chromaKey}
            toneMapped={false}
          />
        )}
      </mesh>

      {/* Frame border */}
      {showFrame && (
        <>
          {/* Top frame */}
          <mesh position={[0, size[1] / 2 + frameThickness / 2, -0.005]}>
            <boxGeometry args={[size[0] + frameThickness * 2, frameThickness, 0.01]} />
            <meshStandardMaterial color={frameColor} />
          </mesh>
          {/* Bottom frame */}
          <mesh position={[0, -size[1] / 2 - frameThickness / 2, -0.005]}>
            <boxGeometry args={[size[0] + frameThickness * 2, frameThickness, 0.01]} />
            <meshStandardMaterial color={frameColor} />
          </mesh>
          {/* Left frame */}
          <mesh position={[-size[0] / 2 - frameThickness / 2, 0, -0.005]}>
            <boxGeometry args={[frameThickness, size[1], 0.01]} />
            <meshStandardMaterial color={frameColor} />
          </mesh>
          {/* Right frame */}
          <mesh position={[size[0] / 2 + frameThickness / 2, 0, -0.005]}>
            <boxGeometry args={[frameThickness, size[1], 0.01]} />
            <meshStandardMaterial color={frameColor} />
          </mesh>
        </>
      )}

      {/* Hover highlight */}
      {hovered && (
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[size[0] + 0.02, size[1] + 0.02]} />
          <meshBasicMaterial
            color="#6366f1"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Error indicator */}
      {error && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.05}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
          maxWidth={size[0] * 0.9}
        >
          ⚠️ {error}
        </Text>
      )}

      {/* Loading indicator */}
      {currentMedia.type !== 'none' && currentMedia.type !== 'color' && !texture && !error && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="#a5b4fc"
          anchorX="center"
          anchorY="middle"
        >
          Loading...
        </Text>
      )}

      {/* Debug info */}
      {debug && (
        <>
          <Text
            position={[0, size[1] / 2 + 0.08, 0.01]}
            fontSize={0.04}
            color="white"
            anchorX="center"
            anchorY="bottom"
          >
            {displayName}
          </Text>
          <Text
            position={[0, -size[1] / 2 - 0.04, 0.01]}
            fontSize={0.03}
            color="#9ca3af"
            anchorX="center"
            anchorY="top"
          >
            {`${currentMedia.type} | ${isPlaying ? 'playing' : 'paused'} | ${surfaceId || 'floating'}`}
          </Text>
        </>
      )}
    </group>
  );
}

// ============================================================================
// Preset Configurations
// ============================================================================

export const DisplayPresets = {
  /** Standard 16:9 display */
  standard: {
    size: [1.6, 0.9] as [number, number],
    showFrame: true,
  },

  /** Large wall display */
  wall: {
    size: [3.2, 1.8] as [number, number],
    showFrame: true,
    frameThickness: 0.03,
  },

  /** Small picture frame */
  frame: {
    size: [0.4, 0.3] as [number, number],
    showFrame: true,
    frameColor: '#4a3728',
    frameThickness: 0.025,
  },

  /** TV screen */
  tv: {
    size: [1.2, 0.68] as [number, number],
    showFrame: true,
    frameColor: '#1a1a1a',
    frameThickness: 0.015,
  },

  /** Window overlay */
  window: {
    size: [1.0, 1.5] as [number, number],
    showFrame: true,
    frameColor: '#ffffff',
    frameThickness: 0.03,
    emissive: false,
  },

  /** Door panel */
  door: {
    size: [0.8, 2.0] as [number, number],
    showFrame: false,
  },

  /** Ceiling display */
  ceiling: {
    size: [2.0, 2.0] as [number, number],
    showFrame: true,
    frameColor: '#2a2a2a',
  },
};

export default SpatialDisplay;
