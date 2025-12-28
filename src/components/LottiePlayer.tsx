/**
 * StickerNest v2 - Lottie Player Component
 *
 * Renders Lottie animations from JSON data or URL.
 * Features:
 * - Auto-play on mount
 * - Loop control
 * - Play/pause on hover
 * - Speed control
 * - Lazy loading
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { AnimationItem, AnimationConfigWithData, AnimationConfigWithPath } from 'lottie-web';

// ============================================
// Types
// ============================================

interface LottiePlayerProps {
  /** Lottie animation JSON data */
  animationData?: object;
  /** URL to Lottie JSON file */
  src?: string;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Whether to autoplay on mount */
  autoplay?: boolean;
  /** Animation speed (1 = normal) */
  speed?: number;
  /** Play direction (1 = forward, -1 = reverse) */
  direction?: 1 | -1;
  /** Whether to play on hover only */
  playOnHover?: boolean;
  /** Renderer type */
  renderer?: 'svg' | 'canvas' | 'html';
  /** Custom styles */
  style?: React.CSSProperties;
  /** Custom class name */
  className?: string;
  /** Callback when animation is ready */
  onReady?: (animation: AnimationItem) => void;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback when animation loops */
  onLoop?: () => void;
}

// ============================================
// Component
// ============================================

export const LottiePlayer: React.FC<LottiePlayerProps> = ({
  animationData,
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  direction = 1,
  playOnHover = false,
  renderer = 'svg',
  style,
  className,
  onReady,
  onComplete,
  onLoop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse animation data from base64 data URL if needed
  const parseAnimationData = useCallback((data: string | object): object | null => {
    if (typeof data === 'object') return data;

    if (typeof data === 'string') {
      // Check if it's a data URL (base64 encoded JSON)
      if (data.startsWith('data:')) {
        try {
          const base64 = data.split(',')[1];
          const jsonString = atob(base64);
          return JSON.parse(jsonString);
        } catch (e) {
          console.error('Failed to parse Lottie data URL:', e);
          return null;
        }
      }

      // Try to parse as JSON string
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }

    return null;
  }, []);

  // Initialize animation with dynamic import
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous animation
    if (animationRef.current) {
      animationRef.current.destroy();
      animationRef.current = null;
    }

    setError(null);
    setIsLoaded(false);

    let cancelled = false;

    // Dynamically import lottie-web to avoid loading 308KB until needed
    import('lottie-web').then((lottieModule) => {
      if (cancelled || !containerRef.current) return;

      const lottie = lottieModule.default;

      try {
        let config: AnimationConfigWithData | AnimationConfigWithPath;

        if (animationData) {
          const parsedData = parseAnimationData(animationData);
          if (!parsedData) {
            setError('Invalid animation data');
            return;
          }
          config = {
            container: containerRef.current,
            renderer,
            loop,
            autoplay: playOnHover ? false : autoplay,
            animationData: parsedData,
          };
        } else if (src) {
          // Check if src is a data URL
          if (src.startsWith('data:')) {
            const parsedData = parseAnimationData(src);
            if (!parsedData) {
              setError('Invalid animation data URL');
              return;
            }
            config = {
              container: containerRef.current,
              renderer,
              loop,
              autoplay: playOnHover ? false : autoplay,
              animationData: parsedData,
            };
          } else {
            config = {
              container: containerRef.current,
              renderer,
              loop,
              autoplay: playOnHover ? false : autoplay,
              path: src,
            };
          }
        } else {
          setError('No animation source provided');
          return;
        }

        const anim = lottie.loadAnimation(config);
        animationRef.current = anim;

        // Set speed and direction
        anim.setSpeed(speed);
        anim.setDirection(direction);

        // Event handlers
        anim.addEventListener('DOMLoaded', () => {
          setIsLoaded(true);
          onReady?.(anim);
        });

        anim.addEventListener('complete', () => {
          onComplete?.();
        });

        anim.addEventListener('loopComplete', () => {
          onLoop?.();
        });

        anim.addEventListener('data_failed', () => {
          setError('Failed to load animation');
        });

      } catch (e) {
        console.error('Lottie initialization error:', e);
        setError('Failed to initialize animation');
      }
    }).catch((e) => {
      if (!cancelled) {
        console.error('Failed to load lottie-web:', e);
        setError('Failed to load animation library');
      }
    });

    return () => {
      cancelled = true;
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, [animationData, src, loop, autoplay, renderer, playOnHover, parseAnimationData, onReady, onComplete, onLoop, speed, direction]);

  // Update speed when prop changes
  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.setSpeed(speed);
    }
  }, [speed]);

  // Update direction when prop changes
  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.setDirection(direction);
    }
  }, [direction]);

  // Handle hover play/pause
  useEffect(() => {
    if (!playOnHover || !animationRef.current) return;

    if (isHovered) {
      animationRef.current.play();
    } else {
      animationRef.current.pause();
      animationRef.current.goToAndStop(0, true);
    }
  }, [isHovered, playOnHover]);

  // Handle mouse events for hover play
  const handleMouseEnter = useCallback(() => {
    if (playOnHover) {
      setIsHovered(true);
    }
  }, [playOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (playOnHover) {
      setIsHovered(false);
    }
  }, [playOnHover]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {error && (
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
      {!isLoaded && !error && (
        <div
          style={{
            width: 24,
            height: 24,
            border: '2px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
    </div>
  );
};

// Add keyframes for loading spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  try {
    if (styleSheet) {
      styleSheet.insertRule(`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `, styleSheet.cssRules.length);
    }
  } catch (e) {
    // Style may already exist
  }
}

export default LottiePlayer;
