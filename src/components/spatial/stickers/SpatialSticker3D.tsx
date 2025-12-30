/**
 * StickerNest - SpatialSticker3D
 *
 * Renders a SpatialSticker in 3D space for VR/AR modes.
 * Supports 2D images (as billboards), 3D models, and primitives.
 * Handles click behaviors to launch widgets, open URLs, etc.
 */

import React, { useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, useGLTF, Billboard, Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { Mesh, Group, MathUtils, Color } from 'three';
import {
  SpatialSticker,
  SpatialTransform,
  is3DMediaType,
  Primitive3DConfig,
  Model3DConfig,
} from '../../../types/spatialEntity';

// ============================================================================
// Types
// ============================================================================

export interface SpatialSticker3DProps {
  sticker: SpatialSticker;
  /** Callback when sticker is clicked */
  onClick?: (sticker: SpatialSticker) => void;
  /** Callback when widget should be launched */
  onLaunchWidget?: (widgetDefId: string, sticker: SpatialSticker) => void;
  /** Callback when widget should be toggled */
  onToggleWidget?: (widgetInstanceId: string, sticker: SpatialSticker) => void;
  /** Callback for URL opening */
  onOpenUrl?: (url: string) => void;
  /** Callback for event emission */
  onEmitEvent?: (event: string, sticker: SpatialSticker) => void;
  /** Callback for pipeline execution */
  onRunPipeline?: (pipelineId: string, sticker: SpatialSticker) => void;
  /** Whether this sticker is selected */
  selected?: boolean;
  /** Enable debug visualization */
  debug?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/** Convert SpatialTransform to Three.js format */
function transformToThree(transform: SpatialTransform): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  return {
    position: [transform.position.x, transform.position.y, transform.position.z],
    rotation: [
      MathUtils.degToRad(transform.rotation.x),
      MathUtils.degToRad(transform.rotation.y),
      MathUtils.degToRad(transform.rotation.z),
    ],
    scale: [transform.scale.x, transform.scale.y, transform.scale.z],
  };
}

// ============================================================================
// Hover/Click Animation Component
// ============================================================================

interface AnimatedWrapperProps {
  children: React.ReactNode;
  hovered: boolean;
  clicked: boolean;
  hoverAnimation?: SpatialSticker['hoverAnimation'];
  clickAnimation?: SpatialSticker['clickAnimation'];
  glowColor?: string;
}

function AnimatedWrapper({
  children,
  hovered,
  clicked,
  hoverAnimation = 'scale',
  clickAnimation = 'pulse',
  glowColor = '#8b5cf6',
}: AnimatedWrapperProps) {
  const groupRef = useRef<Group>(null);
  const baseScale = useRef(1);
  const animationTime = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    animationTime.current += delta;

    let targetScale = 1;
    let yOffset = 0;
    let rotationZ = 0;

    // Hover animations
    if (hovered) {
      switch (hoverAnimation) {
        case 'scale':
          targetScale = 1.1;
          break;
        case 'bounce':
          yOffset = Math.sin(animationTime.current * 8) * 0.02;
          break;
        case 'shake':
          rotationZ = Math.sin(animationTime.current * 20) * 0.05;
          break;
        case 'float':
          yOffset = Math.sin(animationTime.current * 2) * 0.03;
          break;
        case 'glow':
          // Glow handled separately
          break;
      }
    }

    // Click animations
    if (clicked) {
      switch (clickAnimation) {
        case 'pulse':
          targetScale = 0.95 + Math.sin(animationTime.current * 15) * 0.05;
          break;
        case 'shrink':
          targetScale = 0.9;
          break;
        case 'ripple':
          // Ripple effect handled separately
          break;
      }
    }

    // Apply smooth interpolation
    baseScale.current = MathUtils.lerp(baseScale.current, targetScale, 0.1);
    groupRef.current.scale.setScalar(baseScale.current);
    groupRef.current.position.y = yOffset;
    groupRef.current.rotation.z = rotationZ;
  });

  return (
    <group ref={groupRef}>
      {children}
      {/* Glow effect */}
      {hovered && hoverAnimation === 'glow' && (
        <mesh scale={1.15}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Image Sticker (Billboard)
// ============================================================================

interface ImageSticker3DProps {
  mediaSrc: string;
  size: { width: number; height: number };
  opacity: number;
  billboard: boolean;
}

function ImageSticker3D({ mediaSrc, size, opacity, billboard }: ImageSticker3DProps) {
  const texture = useTexture(mediaSrc);

  // Calculate aspect ratio from texture
  const aspectRatio = texture.image
    ? texture.image.width / texture.image.height
    : 1;

  // Scale to fit within size while maintaining aspect
  const width = size.width / 100; // Convert from pixels to meters (rough)
  const height = width / aspectRatio;

  const content = (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} />
    </mesh>
  );

  if (billboard) {
    return <Billboard>{content}</Billboard>;
  }

  return content;
}

// ============================================================================
// 3D Model Sticker
// ============================================================================

interface ModelSticker3DProps {
  config: Model3DConfig;
  opacity: number;
}

function ModelSticker3D({ config, opacity }: ModelSticker3DProps) {
  const { scene } = useGLTF(config.modelUrl);

  // Clone scene to avoid shared state
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Apply material overrides
  useMemo(() => {
    if (!config.materialOverrides) return;

    clonedScene.traverse((child) => {
      if (child instanceof Mesh && child.material) {
        const mat = child.material;
        if (config.materialOverrides?.color) {
          mat.color = new Color(config.materialOverrides.color);
        }
        if (config.materialOverrides?.metalness !== undefined) {
          mat.metalness = config.materialOverrides.metalness;
        }
        if (config.materialOverrides?.roughness !== undefined) {
          mat.roughness = config.materialOverrides.roughness;
        }
        if (config.materialOverrides?.opacity !== undefined) {
          mat.transparent = true;
          mat.opacity = config.materialOverrides.opacity;
        }
        if (config.materialOverrides?.emissive) {
          mat.emissive = new Color(config.materialOverrides.emissive);
          mat.emissiveIntensity = config.materialOverrides.emissiveIntensity ?? 1;
        }
      }
    });
  }, [clonedScene, config.materialOverrides]);

  return <primitive object={clonedScene} />;
}

// ============================================================================
// Primitive Sticker
// ============================================================================

interface PrimitiveSticker3DProps {
  config: Primitive3DConfig;
}

function PrimitiveSticker3D({ config }: PrimitiveSticker3DProps) {
  const { primitiveType, dimensions, material } = config;

  const geometry = useMemo(() => {
    switch (primitiveType) {
      case 'cube':
        return <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />;
      case 'sphere':
        return <sphereGeometry args={[dimensions.width / 2, 32, 32]} />;
      case 'cylinder':
        return (
          <cylinderGeometry
            args={[dimensions.width / 2, dimensions.width / 2, dimensions.height, 32]}
          />
        );
      case 'cone':
        return <coneGeometry args={[dimensions.width / 2, dimensions.height, 32]} />;
      case 'torus':
        return (
          <torusGeometry args={[dimensions.width / 2, dimensions.depth / 2, 16, 32]} />
        );
      case 'plane':
        return <planeGeometry args={[dimensions.width, dimensions.height]} />;
      case 'ring':
        return (
          <ringGeometry
            args={[dimensions.width / 4, dimensions.width / 2, 32]}
          />
        );
      default:
        return <boxGeometry args={[0.1, 0.1, 0.1]} />;
    }
  }, [primitiveType, dimensions]);

  return (
    <mesh>
      {geometry}
      <meshStandardMaterial
        color={material.color}
        metalness={material.metalness}
        roughness={material.roughness}
        transparent={material.opacity < 1}
        opacity={material.opacity}
        wireframe={material.wireframe}
        emissive={material.emissive ? new Color(material.emissive) : undefined}
        emissiveIntensity={material.emissiveIntensity}
      />
    </mesh>
  );
}

// ============================================================================
// Selection Indicator
// ============================================================================

function SelectionIndicator({ size = 0.3 }: { size?: number }) {
  const ringRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <ringGeometry args={[size * 0.8, size, 32]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
    </mesh>
  );
}

// ============================================================================
// Loading Fallback
// ============================================================================

function LoadingFallback() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshBasicMaterial color="#8b5cf6" wireframe />
    </mesh>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SpatialSticker3D({
  sticker,
  onClick,
  onLaunchWidget,
  onToggleWidget,
  onOpenUrl,
  onEmitEvent,
  onRunPipeline,
  selected = false,
  debug = false,
}: SpatialSticker3DProps) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  const { position, rotation, scale } = transformToThree(sticker.transform3D);

  // Handle click based on sticker's clickBehavior
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();

      // Trigger click animation
      setClicked(true);
      setTimeout(() => setClicked(false), 200);

      // Generic click callback
      onClick?.(sticker);

      // Behavior-specific callbacks
      switch (sticker.clickBehavior) {
        case 'launch-widget':
          if (sticker.linkedWidgetDefId) {
            onLaunchWidget?.(sticker.linkedWidgetDefId, sticker);
          }
          break;

        case 'toggle-widget':
          if (sticker.linkedWidgetInstanceId) {
            onToggleWidget?.(sticker.linkedWidgetInstanceId, sticker);
          }
          break;

        case 'open-url':
          if (sticker.linkedUrl) {
            onOpenUrl?.(sticker.linkedUrl);
          }
          break;

        case 'emit-event':
          if (sticker.linkedEvent) {
            onEmitEvent?.(sticker.linkedEvent, sticker);
          }
          break;

        case 'run-pipeline':
          if (sticker.linkedPipelineId) {
            onRunPipeline?.(sticker.linkedPipelineId, sticker);
          }
          break;

        case 'none':
        default:
          break;
      }
    },
    [sticker, onClick, onLaunchWidget, onToggleWidget, onOpenUrl, onEmitEvent, onRunPipeline]
  );

  // Render the appropriate content based on media type
  const renderContent = () => {
    switch (sticker.mediaType) {
      case 'image':
      case 'gif':
        return (
          <ImageSticker3D
            mediaSrc={sticker.mediaSrc}
            size={sticker.size2D}
            opacity={sticker.opacity}
            billboard={sticker.billboard3D}
          />
        );

      case '3d-model':
        if (sticker.model3DConfig) {
          return (
            <ModelSticker3D config={sticker.model3DConfig} opacity={sticker.opacity} />
          );
        }
        return <LoadingFallback />;

      case '3d-primitive':
        if (sticker.primitive3DConfig) {
          return <PrimitiveSticker3D config={sticker.primitive3DConfig} />;
        }
        return <LoadingFallback />;

      case 'emoji':
        // Render emoji as HTML billboard
        return (
          <Billboard>
            <Html center>
              <div
                style={{
                  fontSize: '48px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {sticker.mediaSrc}
              </div>
            </Html>
          </Billboard>
        );

      default:
        // Fallback: simple colored box
        return (
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#8b5cf6" />
          </mesh>
        );
    }
  };

  return (
    <group
      name={`spatial-sticker-${sticker.id}`}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <AnimatedWrapper
        hovered={hovered}
        clicked={clicked}
        hoverAnimation={sticker.hoverAnimation}
        clickAnimation={sticker.clickAnimation}
        glowColor={sticker.glowColor}
      >
        {/* Main sticker content */}
        <group
          onClick={handleClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <Suspense fallback={<LoadingFallback />}>{renderContent()}</Suspense>
        </group>

        {/* Selection indicator */}
        {selected && <SelectionIndicator />}

        {/* Debug info */}
        {debug && (
          <Html position={[0, 0.2, 0]} center>
            <div
              style={{
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                whiteSpace: 'nowrap',
              }}
            >
              {sticker.name} ({sticker.mediaType})
            </div>
          </Html>
        )}
      </AnimatedWrapper>
    </group>
  );
}

export default SpatialSticker3D;
