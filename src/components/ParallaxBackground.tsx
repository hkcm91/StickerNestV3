/**
 * StickerNest v2 - Parallax Background
 * Renders animated parallax backgrounds with multiple layers, particles, and effects.
 * Supports mouse-responsive parallax, animated particles, and theme integration.
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import type { ParallaxConfig, ParallaxLayer, ParticleConfig, ShapeConfig, GradientConfig } from '../types/customTheme';
import { gradientToCss } from '../types/customTheme';

interface ParallaxBackgroundProps {
  config: ParallaxConfig;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  speed: number;
  delay: number;
  glow: boolean;
  glowIntensity: number;
}

interface FloatingShape {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  rotation: number;
  delay: number;
  blur: number;
}

/**
 * Generate random particles based on config
 */
function generateParticles(config: ParticleConfig, count?: number): Particle[] {
  const particles: Particle[] = [];
  const particleCount = count ?? config.count;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
      opacity: config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin),
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      speed: 0.5 + Math.random() * config.speed,
      delay: Math.random() * 10,
      glow: config.glow ?? false,
      glowIntensity: config.glowIntensity ?? 0.5,
    });
  }

  return particles;
}

/**
 * Generate random floating shapes based on config
 */
function generateShapes(config: ShapeConfig): FloatingShape[] {
  const shapes: FloatingShape[] = [];

  for (let i = 0; i < config.count; i++) {
    shapes.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
      opacity: config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin),
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      rotation: Math.random() * 360,
      delay: Math.random() * 15,
      blur: config.blur ?? 0,
    });
  }

  return shapes;
}

/**
 * Particle Layer Component
 */
const ParticleLayer: React.FC<{
  particles: ParticleConfig;
  depth: number;
  opacity: number;
  mouseOffset: { x: number; y: number };
  animationSpeed: number;
}> = ({ particles, depth, opacity, mouseOffset, animationSpeed }) => {
  const particleList = useMemo(() => generateParticles(particles), [particles]);

  // Calculate parallax offset based on depth
  const parallaxX = mouseOffset.x * depth * 0.5;
  const parallaxY = mouseOffset.y * depth * 0.5;

  const getParticleAnimation = (particle: Particle) => {
    const direction = particles.direction ?? 'float';
    const baseDuration = (15 + particle.delay * 2) / animationSpeed;

    switch (direction) {
      case 'up':
        return `particleRiseUp ${baseDuration}s ease-in-out infinite`;
      case 'down':
        return `particleFallDown ${baseDuration}s ease-in-out infinite`;
      case 'float':
        return `particleFloat ${baseDuration}s ease-in-out infinite`;
      case 'random':
        return `particleWander ${baseDuration}s ease-in-out infinite`;
      default:
        return `particleFloat ${baseDuration}s ease-in-out infinite`;
    }
  };

  const getParticleStyle = (particle: Particle): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: particle.size,
      height: particle.size,
      opacity: particle.opacity * opacity,
      transform: `translate(${parallaxX}px, ${parallaxY}px)`,
      animation: getParticleAnimation(particle),
      animationDelay: `${particle.delay}s`,
      pointerEvents: 'none',
      willChange: 'transform, opacity',
    };

    // Different styles for different particle types
    switch (particles.type) {
      case 'bubbles':
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${particle.color} 50%, transparent 70%)`,
          border: `1px solid rgba(255,255,255,0.3)`,
          boxShadow: particle.glow
            ? `0 0 ${particle.size * particle.glowIntensity}px ${particle.color}, inset 0 0 ${particle.size * 0.3}px rgba(255,255,255,0.3)`
            : `inset 0 0 ${particle.size * 0.3}px rgba(255,255,255,0.3)`,
        };

      case 'fireflies':
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: particle.color,
          boxShadow: `0 0 ${particle.size * 2}px ${particle.size}px ${particle.color}`,
          animation: `${getParticleAnimation(particle)}, fireflyPulse ${3 + Math.random() * 2}s ease-in-out infinite`,
        };

      case 'bokeh':
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
          filter: `blur(${particle.size * 0.2}px)`,
          boxShadow: particle.glow ? `0 0 ${particle.size}px ${particle.color}` : 'none',
        };

      case 'dust':
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: particle.color,
          filter: `blur(1px)`,
        };

      case 'stars':
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: particle.color,
          boxShadow: `0 0 ${particle.size}px ${particle.size * 0.5}px ${particle.color}`,
          animation: `${getParticleAnimation(particle)}, starTwinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
        };

      case 'snow':
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 0 2px rgba(255, 255, 255, 0.5)',
        };

      default:
        return {
          ...baseStyle,
          borderRadius: '50%',
          background: particle.color,
        };
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particleList.map((particle) => (
        <div key={particle.id} style={getParticleStyle(particle)} />
      ))}
    </div>
  );
};

/**
 * Shape Layer Component (for floating shapes like leaves, blobs)
 */
const ShapeLayer: React.FC<{
  shapes: ShapeConfig;
  depth: number;
  opacity: number;
  mouseOffset: { x: number; y: number };
  animationSpeed: number;
}> = ({ shapes, depth, opacity, mouseOffset, animationSpeed }) => {
  const shapeList = useMemo(() => generateShapes(shapes), [shapes]);

  const parallaxX = mouseOffset.x * depth * 0.5;
  const parallaxY = mouseOffset.y * depth * 0.5;

  const getShapeContent = (shape: FloatingShape) => {
    switch (shapes.type) {
      case 'circle':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: shape.color,
            }}
          />
        );

      case 'blob':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
              background: shape.color,
            }}
          />
        );

      case 'leaf':
        return (
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <path
              d="M50 5 C70 20, 95 50, 50 95 C5 50, 30 20, 50 5"
              fill={shape.color}
            />
            <path
              d="M50 20 L50 80"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        );

      case 'custom':
        if (shapes.customPath) {
          return (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <path d={shapes.customPath} fill={shape.color} />
            </svg>
          );
        }
        return null;

      default:
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: shape.color,
            }}
          />
        );
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {shapeList.map((shape) => (
        <div
          key={shape.id}
          style={{
            position: 'absolute',
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            opacity: shape.opacity * opacity,
            transform: `translate(${parallaxX}px, ${parallaxY}px) rotate(${shape.rotation}deg)`,
            filter: shape.blur > 0 ? `blur(${shape.blur}px)` : undefined,
            animation: shapes.rotate
              ? `shapeFloat ${(20 + shape.delay * 2) / animationSpeed}s ease-in-out infinite, shapeRotate ${(30 + shape.delay) / animationSpeed}s linear infinite`
              : `shapeFloat ${(20 + shape.delay * 2) / animationSpeed}s ease-in-out infinite`,
            animationDelay: `${shape.delay}s`,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }}
        >
          {getShapeContent(shape)}
        </div>
      ))}
    </div>
  );
};

/**
 * Gradient Layer Component
 */
const GradientLayer: React.FC<{
  gradient: GradientConfig;
  depth: number;
  opacity: number;
  mouseOffset: { x: number; y: number };
  animation?: { type: string; duration: number };
  blendMode?: string;
}> = ({ gradient, depth, opacity, mouseOffset, animation, blendMode }) => {
  const parallaxX = mouseOffset.x * depth * 0.3;
  const parallaxY = mouseOffset.y * depth * 0.3;

  const animationStyle = animation?.type === 'wave'
    ? `gradientWave ${animation.duration / 1000}s ease-in-out infinite`
    : animation?.type === 'pulse'
    ? `gradientPulse ${animation.duration / 1000}s ease-in-out infinite`
    : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: gradientToCss(gradient),
        opacity,
        transform: `translate(${parallaxX}px, ${parallaxY}px)`,
        mixBlendMode: (blendMode || 'normal') as any,
        animation: animationStyle,
        willChange: 'transform, opacity',
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * Main Parallax Background Component
 */
export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({
  config,
  style,
  width,
  height,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Handle mouse movement for parallax effect
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!config.mouseParallax || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate offset from center (-1 to 1 range)
    const offsetX = ((e.clientX - centerX) / (rect.width / 2)) * config.intensity * 50;
    const offsetY = ((e.clientY - centerY) / (rect.height / 2)) * config.intensity * 50;

    setMouseOffset({ x: offsetX, y: offsetY });
  }, [config.mouseParallax, config.intensity]);

  // Add mouse move listener
  useEffect(() => {
    if (!config.mouseParallax) return;

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [config.mouseParallax, handleMouseMove]);

  // Sort layers by depth (back to front)
  const sortedLayers = useMemo(() => {
    return [...config.layers].sort((a, b) => a.depth - b.depth);
  }, [config.layers]);

  const animationSpeed = config.animationSpeed ?? 1;

  // Render a single layer
  const renderLayer = (layer: ParallaxLayer) => {
    switch (layer.type) {
      case 'gradient':
        if (!layer.gradient) return null;
        return (
          <GradientLayer
            key={layer.id}
            gradient={layer.gradient}
            depth={layer.depth}
            opacity={layer.opacity}
            mouseOffset={mouseOffset}
            animation={layer.animation ? { type: layer.animation.type, duration: layer.animation.duration } : undefined}
            blendMode={layer.blendMode}
          />
        );

      case 'particles':
        if (!layer.particles) return null;
        return (
          <ParticleLayer
            key={layer.id}
            particles={layer.particles}
            depth={layer.depth}
            opacity={layer.opacity}
            mouseOffset={mouseOffset}
            animationSpeed={animationSpeed}
          />
        );

      case 'shapes':
        if (!layer.shapes) return null;
        return (
          <ShapeLayer
            key={layer.id}
            shapes={layer.shapes}
            depth={layer.depth}
            opacity={layer.opacity}
            mouseOffset={mouseOffset}
            animationSpeed={animationSpeed}
          />
        );

      case 'image':
        if (!layer.imageUrl) return null;
        const imgParallaxX = mouseOffset.x * layer.depth * 0.3;
        const imgParallaxY = mouseOffset.y * layer.depth * 0.3;
        return (
          <div
            key={layer.id}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${layer.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: layer.opacity,
              transform: `translate(${imgParallaxX}px, ${imgParallaxY}px) scale(1.1)`,
              mixBlendMode: (layer.blendMode || 'normal') as any,
              pointerEvents: 'none',
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        width: width ?? '100%',
        height: height ?? '100%',
        ...style,
      }}
    >
      {/* Base gradient layer */}
      {config.baseGradient && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: gradientToCss(config.baseGradient),
            filter: config.backgroundBlur ? `blur(${config.backgroundBlur}px)` : undefined,
          }}
        />
      )}

      {/* Render all layers */}
      {sortedLayers.map(renderLayer)}

      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes particleFloat {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(10px, -15px);
          }
          50% {
            transform: translate(-5px, -25px);
          }
          75% {
            transform: translate(-15px, -10px);
          }
        }

        @keyframes particleRiseUp {
          0% {
            transform: translateY(100vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
        }

        @keyframes particleFallDown {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        @keyframes particleWander {
          0%, 100% {
            transform: translate(0, 0);
          }
          20% {
            transform: translate(30px, -20px);
          }
          40% {
            transform: translate(-20px, -40px);
          }
          60% {
            transform: translate(-40px, 10px);
          }
          80% {
            transform: translate(20px, 30px);
          }
        }

        @keyframes fireflyPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes starTwinkle {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @keyframes shapeFloat {
          0%, 100% {
            transform: translate(0, 0);
          }
          33% {
            transform: translate(20px, -30px);
          }
          66% {
            transform: translate(-15px, -15px);
          }
        }

        @keyframes shapeRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes gradientWave {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gradientPulse {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .parallax-background * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ParallaxBackground;
