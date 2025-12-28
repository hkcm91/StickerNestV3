/**
 * CanvasBackground
 * Renders the canvas background with glass effect, grid, and size indicator
 *
 * Integrates with useCanvasAppearanceStore for:
 * - Background color/image
 * - Border radius and styling
 * - Glassmorphism effects
 * - Grid display and snap settings
 */

import React from 'react';
import type { CanvasMode, CanvasProperties } from '../MainCanvas';

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface GridSettings {
  showGrid: boolean;
  gridType: 'regular' | 'isometric';
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  showCenterGuides: boolean;
}

export interface BackgroundImageSettings {
  imageUrl?: string;
  imageOpacity: number;
  imageBlur: number;
}

export interface CanvasBackgroundProps {
  canvasId: string;
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  properties: CanvasProperties;
  canvasController: {
    canvasStyles: {
      background: React.CSSProperties;
      filter: string;
      borderRadius?: number;
    };
  };
  backgroundStyle?: React.CSSProperties & {
    // Extended props for appearance store integration
    gridSettings?: GridSettings;
    imageSettings?: BackgroundImageSettings;
  };
  mode: CanvasMode;
  isPanning: boolean;
  isCanvasResizeMode: boolean;
}

export const CanvasBackground: React.FC<CanvasBackgroundProps> = ({
  canvasId,
  viewport,
  canvasSize,
  properties,
  canvasController,
  backgroundStyle,
  mode,
  isPanning,
  isCanvasResizeMode,
}) => {
  // Extract grid settings from backgroundStyle or fall back to properties
  const gridSettings = backgroundStyle?.gridSettings;
  const showGrid = gridSettings?.showGrid ?? properties.showGrid;
  const gridSize = gridSettings?.gridSize ?? properties.gridSize;
  const gridType = gridSettings?.gridType ?? 'regular';
  const gridColor = gridSettings?.gridColor ?? 'rgba(139, 92, 246, 0.15)';
  const gridOpacity = gridSettings?.gridOpacity ?? 50;
  const showCenterGuides = gridSettings?.showCenterGuides ?? false;

  // Extract image settings
  const imageSettings = backgroundStyle?.imageSettings;
  const hasBackgroundImage = !!imageSettings?.imageUrl;

  // Calculate background styles
  const getBackgroundStyles = (): React.CSSProperties => {
    const controllerBg = canvasController.canvasStyles.background;

    // 1. Background image from appearance store (highest priority)
    if (hasBackgroundImage && imageSettings?.imageUrl) {
      return {
        backgroundImage: `url(${imageSettings.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }

    // 2. Widget image/pattern backgrounds (from events)
    if (controllerBg.backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(15, 15, 25, 0.3), rgba(15, 15, 25, 0.3)), ${controllerBg.backgroundImage}`,
        backgroundSize: controllerBg.backgroundSize || 'cover',
        backgroundPosition: controllerBg.backgroundPosition || 'center',
        backgroundRepeat: controllerBg.backgroundRepeat || 'no-repeat',
      };
    }

    // 3. Props background from appearance store (solid color/tint)
    if (backgroundStyle?.background) {
      return { background: backgroundStyle.background };
    }

    if (backgroundStyle?.backgroundColor) {
      return { backgroundColor: backgroundStyle.backgroundColor };
    }

    // 4. Widget gradient/complex backgrounds
    if (controllerBg.background) {
      return { background: controllerBg.background };
    }

    // 5. Widget solid color (only if explicitly changed from default)
    if (controllerBg.backgroundColor && controllerBg.backgroundColor !== '#f0f0f0') {
      return { backgroundColor: controllerBg.backgroundColor };
    }

    // 6. Default fallback
    return { background: 'rgba(15, 15, 25, 0.25)' };
  };

  // Generate grid pattern based on type
  const renderGrid = () => {
    if (!showGrid) return null;

    const scaledSize = gridSize * viewport.zoom;
    const colorWithOpacity = gridColor.includes('rgba')
      ? gridColor.replace(/[\d.]+\)$/, `${gridOpacity / 100})`)
      : `rgba(139, 92, 246, ${gridOpacity / 100})`;

    if (gridType === 'isometric') {
      // Isometric grid pattern
      return (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: gridOpacity / 100,
          }}
        >
          <defs>
            <pattern
              id={`iso-grid-${canvasId}`}
              width={scaledSize * 2}
              height={scaledSize * 1.732}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 0 0 L ${scaledSize} ${scaledSize * 0.866} L 0 ${scaledSize * 1.732} M ${scaledSize * 2} 0 L ${scaledSize} ${scaledSize * 0.866} L ${scaledSize * 2} ${scaledSize * 1.732}`}
                fill="none"
                stroke={colorWithOpacity}
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#iso-grid-${canvasId})`} />
        </svg>
      );
    }

    // Regular grid pattern
    return (
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern
            id={`grid-${canvasId}`}
            width={scaledSize}
            height={scaledSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scaledSize} 0 L 0 0 0 ${scaledSize}`}
              fill="none"
              stroke={colorWithOpacity}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${canvasId})`} />
      </svg>
    );
  };

  // Render center guides
  const renderCenterGuides = () => {
    if (!showCenterGuides) return null;

    return (
      <>
        {/* Horizontal center line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(139, 92, 246, 0.4)',
            borderTop: '1px dashed rgba(139, 92, 246, 0.6)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
        {/* Vertical center line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background: 'rgba(139, 92, 246, 0.4)',
            borderLeft: '1px dashed rgba(139, 92, 246, 0.6)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </>
    );
  };

  return (
    <div
      data-canvas-background
      style={{
        position: 'absolute',
        left: viewport.panX,
        top: viewport.panY,
        width: canvasSize.width * viewport.zoom,
        height: canvasSize.height * viewport.zoom,
        // Glass effect - from appearance store or defaults
        backdropFilter: backgroundStyle?.backdropFilter !== undefined
          ? backgroundStyle.backdropFilter
          : 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: backgroundStyle?.WebkitBackdropFilter !== undefined
          ? backgroundStyle.WebkitBackdropFilter
          : 'blur(24px) saturate(180%)',
        border: backgroundStyle?.border !== undefined
          ? backgroundStyle.border
          : '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: backgroundStyle?.borderRadius !== undefined
          ? backgroundStyle.borderRadius
          : (canvasController.canvasStyles.borderRadius ?? 16),
        boxShadow: backgroundStyle?.boxShadow !== undefined
          ? backgroundStyle.boxShadow
          : '0 8px 32px rgba(0, 0, 0, 0.12)',
        // Background
        ...getBackgroundStyles(),
        // Filter
        filter: canvasController.canvasStyles.filter !== 'none'
          ? canvasController.canvasStyles.filter
          : properties.filter !== 'none'
          ? properties.filter
          : (hasBackgroundImage && imageSettings?.imageBlur
            ? `blur(${imageSettings.imageBlur}px)`
            : undefined),
        // Opacity - image opacity or default
        opacity: hasBackgroundImage && imageSettings
          ? imageSettings.imageOpacity / 100
          : (canvasController.canvasStyles.background.opacity ?? properties.opacity),
        transition: 'background 0.3s, filter 0.3s, border-radius 0.3s',
        cursor: isPanning ? 'grabbing' : mode === 'edit' ? 'default' : 'grab',
        zIndex: 1,
        pointerEvents: mode === 'edit' ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Grid overlay */}
      {mode === 'edit' && renderGrid()}

      {/* Center guides */}
      {mode === 'edit' && renderCenterGuides()}

      {/* Canvas Resize Mode Indicator */}
      {isCanvasResizeMode && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '8px 16px',
            background: 'rgba(139, 92, 246, 0.9)',
            borderRadius: 8,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 100,
          }}
        >
          {Math.round(canvasSize.width)} × {Math.round(canvasSize.height)}
        </div>
      )}
    </div>
  );
};
