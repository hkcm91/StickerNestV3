/**
 * StickerNest v2 - Themed App Background
 * Renders the parallax background at the app level based on the current theme.
 * This component sits behind the entire app and shows through glass effects.
 */

import React, { useMemo } from 'react';
import { useThemeStore } from '../state/useThemeStore';
import { ParallaxBackground } from './ParallaxBackground';
import { gradientToCss } from '../types/customTheme';

interface ThemedAppBackgroundProps {
  /** Additional className */
  className?: string;
  /** Override styles */
  style?: React.CSSProperties;
  /** Whether to render (can be disabled for performance) */
  enabled?: boolean;
}

/**
 * Renders the themed app background based on current theme settings.
 * Supports solid colors, gradients, images, and parallax backgrounds.
 */
export const ThemedAppBackground: React.FC<ThemedAppBackgroundProps> = ({
  className = '',
  style,
  enabled = true,
}) => {
  const currentTheme = useThemeStore(state => state.currentTheme);

  // Get background configuration from theme
  const backgroundConfig = useMemo(() => {
    if (!currentTheme) return null;
    return currentTheme.appBackground;
  }, [currentTheme]);

  // Don't render if disabled or no theme
  if (!enabled || !backgroundConfig) return null;

  // Render based on background type
  const renderBackground = () => {
    switch (backgroundConfig.type) {
      case 'solid':
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: backgroundConfig.color ?? '#0a0a1a',
            }}
          />
        );

      case 'gradient':
        if (!backgroundConfig.gradient) return null;
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: gradientToCss(backgroundConfig.gradient),
            }}
          />
        );

      case 'image':
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${backgroundConfig.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: backgroundConfig.overlay ? 0.8 : 1,
            }}
          >
            {backgroundConfig.overlay && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: backgroundConfig.overlay,
                }}
              />
            )}
          </div>
        );

      case 'parallax':
        if (!backgroundConfig.parallax) return null;
        return (
          <ParallaxBackground
            config={backgroundConfig.parallax}
            style={{ position: 'absolute', inset: 0 }}
          />
        );

      default:
        // Fallback to theme's primary background color
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: currentTheme?.colors.background.primary ?? '#0a0a1a',
            }}
          />
        );
    }
  };

  return (
    <div
      className={`sn-themed-app-background ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {renderBackground()}
    </div>
  );
};

export default ThemedAppBackground;
