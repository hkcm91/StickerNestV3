/**
 * Visual Effects Layer
 * Listens for 'effect:update' events and applies global CSS filters/effects
 * such as blur, brightness, contrast, hue-rotate, glitch, scanlines, etc.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { EventBus } from '../../runtime/EventBus';

interface VisualEffectsLayerProps {
  eventBus: EventBus;
}

interface EffectsState {
  blur?: number;
  brightness?: number;
  contrast?: number;
  hueRotate?: number;
  invert?: number;
  saturate?: number;
  sepia?: number;
  glitch?: boolean;
  scanlines?: boolean;
}

export const VisualEffectsLayer: React.FC<VisualEffectsLayerProps> = ({ eventBus }) => {
  const [effects, setEffects] = useState<EffectsState>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = eventBus.on('effect:update', (event: any) => {
      setEffects(prev => ({ ...prev, ...event.payload }));
    });
    return unsub;
  }, [eventBus]);

  // Construct CSS filter string
  const filterString = useMemo(() => {
    const filters: string[] = [];
    if (effects.blur) filters.push(`blur(${effects.blur}px)`);
    if (effects.brightness) filters.push(`brightness(${effects.brightness}%)`);
    if (effects.contrast) filters.push(`contrast(${effects.contrast}%)`);
    if (effects.hueRotate) filters.push(`hue-rotate(${effects.hueRotate}deg)`);
    if (effects.invert) filters.push(`invert(${effects.invert}%)`);
    if (effects.saturate) filters.push(`saturate(${effects.saturate}%)`);
    if (effects.sepia) filters.push(`sepia(${effects.sepia}%)`);
    return filters.join(' ');
  }, [effects]);

  // Glitch animation styles
  const glitchStyle: React.CSSProperties = effects.glitch ? {
    animation: 'global-glitch 0.2s infinite',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    mixBlendMode: 'hard-light',
  } : {};

  const scanlineStyle: React.CSSProperties = effects.scanlines ? {
    backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
    backgroundSize: '100% 4px',
    pointerEvents: 'none',
  } : {};

  if (!filterString && !effects.glitch && !effects.scanlines) return null;

  return (
    <>
      <style>
        {`
          @keyframes global-glitch {
            0% { transform: translate(0) }
            20% { transform: translate(-2px, 2px) }
            40% { transform: translate(-2px, -2px) }
            60% { transform: translate(2px, 2px) }
            80% { transform: translate(2px, -2px) }
            100% { transform: translate(0) }
          }
        `}
      </style>
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999, // Always on top
          backdropFilter: filterString,
          WebkitBackdropFilter: filterString,
          ...glitchStyle,
          ...scanlineStyle,
        }}
      />
    </>
  );
};

export default VisualEffectsLayer;
