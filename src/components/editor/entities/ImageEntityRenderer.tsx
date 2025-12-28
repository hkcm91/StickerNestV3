/**
 * StickerNest v2 - Image Entity Renderer
 *
 * Renders image entities with filters and object-fit modes.
 */

import React, { useMemo, useState } from 'react';
import type { CanvasImageEntity } from '../../../types/canvasEntity';

// ============================================================================
// Types
// ============================================================================

interface ImageEntityRendererProps {
  entity: CanvasImageEntity;
}

// ============================================================================
// Component
// ============================================================================

export function ImageEntityRenderer({ entity }: ImageEntityRendererProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Compute CSS filter string from entity filters
  const filterStyle = useMemo(() => {
    if (!entity.filters) return 'none';

    const filters: string[] = [];

    if (entity.filters.brightness !== undefined && entity.filters.brightness !== 100) {
      filters.push(`brightness(${entity.filters.brightness}%)`);
    }
    if (entity.filters.contrast !== undefined && entity.filters.contrast !== 100) {
      filters.push(`contrast(${entity.filters.contrast}%)`);
    }
    if (entity.filters.saturation !== undefined && entity.filters.saturation !== 100) {
      filters.push(`saturate(${entity.filters.saturation}%)`);
    }
    if (entity.filters.blur !== undefined && entity.filters.blur > 0) {
      filters.push(`blur(${entity.filters.blur}px)`);
    }
    if (entity.filters.grayscale !== undefined && entity.filters.grayscale > 0) {
      filters.push(`grayscale(${entity.filters.grayscale}%)`);
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
  }, [entity.filters]);

  // Image styles
  const imageStyle = useMemo((): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      objectFit: entity.objectFit,
      borderRadius: entity.borderRadius,
      filter: filterStyle,
      display: isLoading || hasError ? 'none' : 'block',
    };
  }, [entity.objectFit, entity.borderRadius, filterStyle, isLoading, hasError]);

  // Container styles
  const containerStyle = useMemo((): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: entity.borderRadius,
      backgroundColor: hasError ? 'var(--sn-bg-secondary)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }, [entity.borderRadius, hasError]);

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Handle image error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div style={containerStyle}>
      {/* Loading placeholder */}
      {isLoading && !hasError && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--sn-text-muted)',
            fontSize: 12,
            gap: 8,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid var(--sn-text-muted)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          Loading...
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--sn-error)',
            fontSize: 12,
            gap: 4,
            textAlign: 'center',
            padding: 8,
          }}
        >
          <span style={{ fontSize: 24 }}>🖼️</span>
          <span>Failed to load image</span>
        </div>
      )}

      {/* Actual image */}
      <img
        src={entity.src}
        alt={entity.alt}
        style={imageStyle}
        onLoad={handleLoad}
        onError={handleError}
        draggable={false}
      />

      {/* Inline keyframes for loading spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default ImageEntityRenderer;
