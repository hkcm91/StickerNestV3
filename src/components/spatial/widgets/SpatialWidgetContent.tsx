/**
 * StickerNest - SpatialWidget Content Renderers
 *
 * Components for rendering widget content in 3D space:
 * - WidgetPlaceholder: 3D text labels for XR mode
 * - WidgetHtmlContent: Html overlay for desktop preview
 */

import React from 'react';
import { Text, Html } from '@react-three/drei';
import type { WidgetInstance } from '../../../types/domain';
import { getBuiltinWidget } from '../../../widgets/builtin';
import {
  getWidgetResolutionScale,
  getWidgetTypeEmoji,
  formatWidgetType,
  getWidgetHtml,
  createSpatial3DAPI,
} from './spatialWidgetUtils';

// ============================================================================
// Widget Placeholder (for XR mode)
// ============================================================================

interface WidgetPlaceholderProps {
  widget: WidgetInstance;
  size3D: { width: number; height: number };
  debug?: boolean;
}

export function WidgetPlaceholder({ widget, size3D, debug }: WidgetPlaceholderProps) {
  // Scale text sizes based on widget dimensions for better VR readability
  const baseScale = Math.min(size3D.width, size3D.height, 0.6);
  const titleSize = Math.max(0.04, baseScale * 0.12);
  const iconSize = Math.max(0.06, baseScale * 0.2);
  const subtitleSize = Math.max(0.03, baseScale * 0.08);
  const detailSize = Math.max(0.025, baseScale * 0.06);

  return (
    <group position={[0, 0, 0.015]}>
      {/* Inner content background for better contrast in VR */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[size3D.width * 0.9, size3D.height * 0.85]} />
        <meshBasicMaterial color="#1a1625" transparent opacity={0.95} />
      </mesh>

      {/* Decorative border */}
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[size3D.width * 0.92, size3D.height * 0.87]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* Widget name title - above the icon */}
      <Text
        position={[0, size3D.height * 0.28, 0.005]}
        fontSize={titleSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={size3D.width * 0.85}
        outlineWidth={titleSize * 0.08}
        outlineColor="#000000"
      >
        {widget.name || formatWidgetType(widget.widgetDefId)}
      </Text>

      {/* Central icon with background */}
      <group position={[0, size3D.height * 0.02, 0.005]}>
        <mesh position={[0, 0, -0.003]}>
          <circleGeometry args={[iconSize * 0.7, 32]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.005]}>
          <circleGeometry args={[iconSize * 0.8, 32]} />
          <meshBasicMaterial color="#6d28d9" transparent opacity={0.6} />
        </mesh>
        <Text
          position={[0, 0, 0]}
          fontSize={iconSize}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {getWidgetTypeEmoji(widget.widgetDefId)}
        </Text>
      </group>

      {/* Widget type subtitle */}
      <Text
        position={[0, -size3D.height * 0.18, 0.005]}
        fontSize={subtitleSize}
        color="#c4b5fd"
        anchorX="center"
        anchorY="middle"
        maxWidth={size3D.width * 0.8}
        outlineWidth={subtitleSize * 0.05}
        outlineColor="#0a0a0f"
      >
        {widget.widgetDefId}
      </Text>

      {/* Dimensions */}
      <Text
        position={[0, -size3D.height * 0.3, 0.005]}
        fontSize={detailSize}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        outlineWidth={detailSize * 0.05}
        outlineColor="#0a0a0f"
      >
        {Math.round(widget.width)} × {Math.round(widget.height)} px
      </Text>

      {/* Debug info */}
      {debug && (
        <Text
          position={[0, -size3D.height * 0.38, 0.005]}
          fontSize={detailSize * 0.8}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          ID: {widget.id.slice(0, 8)}...
        </Text>
      )}

      {/* "VR Mode" indicator */}
      <group position={[size3D.width * 0.35, size3D.height * 0.35, 0.005]}>
        <mesh position={[0, 0, -0.002]}>
          <planeGeometry args={[0.08, 0.025]} />
          <meshBasicMaterial color="#8b5cf6" />
        </mesh>
        <Text
          position={[0, 0, 0]}
          fontSize={0.015}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          VR
        </Text>
      </group>
    </group>
  );
}

// ============================================================================
// Widget HTML Content (for desktop preview)
// ============================================================================

interface WidgetHtmlContentProps {
  widget: WidgetInstance;
  htmlLoadState: 'idle' | 'loading' | 'loaded' | 'error';
}

export function WidgetHtmlContent({ widget, htmlLoadState }: WidgetHtmlContentProps) {
  const resolutionScale = getWidgetResolutionScale(widget.width, widget.height);
  const scaledWidth = widget.width * resolutionScale;
  const scaledHeight = widget.height * resolutionScale;
  const inverseScale = 1 / resolutionScale;
  const source = widget.metadata?.source;

  return (
    <Html
      transform
      distanceFactor={1.5}
      position={[0, 0, 0.02]}
      zIndexRange={[100, 0]}
      center
      scale={inverseScale}
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        pointerEvents: 'auto',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: 8 * resolutionScale,
          background: 'rgba(20, 20, 30, 0.95)',
          fontSize: `${16 * resolutionScale}px`,
        }}
      >
        <WidgetInnerContent
          widget={widget}
          htmlLoadState={htmlLoadState}
          resolutionScale={resolutionScale}
          source={source}
        />
      </div>
    </Html>
  );
}

// ============================================================================
// Widget Inner Content
// ============================================================================

interface WidgetInnerContentProps {
  widget: WidgetInstance;
  htmlLoadState: 'idle' | 'loading' | 'loaded' | 'error';
  resolutionScale: number;
  source: string | undefined;
}

function WidgetInnerContent({ widget, htmlLoadState, resolutionScale, source }: WidgetInnerContentProps) {
  const builtin = getBuiltinWidget(widget.widgetDefId);

  // React component
  if (builtin?.component) {
    const Component = builtin.component as React.ComponentType<{ api: any }>;
    const api = createSpatial3DAPI(widget);
    return <Component api={api} />;
  }

  // Loading state for local widgets
  if (source === 'local' && (htmlLoadState === 'loading' || htmlLoadState === 'idle')) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', gap: 8 * resolutionScale
      }}>
        <div style={{ fontSize: 24 * resolutionScale, animation: 'spin 1s linear infinite' }}>⟳</div>
        <div style={{ fontSize: 14 * resolutionScale }}>Loading widget...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (source === 'local' && htmlLoadState === 'error') {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#f87171', gap: 8 * resolutionScale
      }}>
        <div style={{ fontSize: 24 * resolutionScale }}>⚠️</div>
        <div style={{ fontSize: 14 * resolutionScale }}>Failed to load widget</div>
      </div>
    );
  }

  // HTML content
  const htmlContent = getWidgetHtml(widget);
  if (!htmlContent) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#a5b4fc',
        gap: 12 * resolutionScale, padding: 16 * resolutionScale, textAlign: 'center'
      }}>
        <div style={{ fontSize: 32 * resolutionScale }}>{getWidgetTypeEmoji(widget.widgetDefId)}</div>
        <div style={{ fontSize: 14 * resolutionScale, fontWeight: 'bold', color: '#ffffff' }}>
          {widget.name || formatWidgetType(widget.widgetDefId)}
        </div>
        <div style={{ fontSize: 11 * resolutionScale, color: '#9ca3af' }}>{widget.widgetDefId}</div>
      </div>
    );
  }

  // Normalize state
  const normalizedState = { ...widget.state };
  if (normalizedState.text && !normalizedState.content) {
    normalizedState.content = normalizedState.text;
  }

  // Basic text widget - render directly
  if (widget.widgetDefId === 'stickernest.basic-text') {
    const state = normalizedState as any;
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: state.textAlign === 'left' ? 'flex-start' : state.textAlign === 'right' ? 'flex-end' : 'center',
        padding: (state.padding || 8) * resolutionScale, color: state.color || '#ffffff',
        fontSize: (state.fontSize || 16) * resolutionScale, fontFamily: state.fontFamily || 'system-ui, sans-serif',
        textAlign: state.textAlign || 'center', backgroundColor: state.backgroundColor || 'transparent',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden',
      }}>
        {state.content || state.text || 'Text'}
      </div>
    );
  }

  // Complex widgets - use iframe
  const mockAPI = createWidgetAPIScript(widget, normalizedState, source);
  let html = htmlContent;
  const baseTag = source === 'local' ? `<base href="/test-widgets/${widget.widgetDefId}/">` : '';

  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${baseTag}${mockAPI}`);
  } else if (html.includes('<html>')) {
    html = html.replace('<html>', `<html><head>${baseTag}${mockAPI}</head>`);
  } else {
    html = baseTag + mockAPI + html;
  }

  return (
    <iframe
      srcDoc={html}
      style={{
        width: '100%', height: '100%', border: 'none',
        borderRadius: 8 * resolutionScale, backgroundColor: 'transparent'
      }}
      sandbox="allow-scripts allow-same-origin"
      title={widget.name || widget.widgetDefId}
    />
  );
}

function createWidgetAPIScript(widget: WidgetInstance, state: any, source: string | undefined): string {
  return `<script>
    window.WidgetAPI = {
      widgetId: '${widget.id}',
      widgetDefId: '${widget.widgetDefId}',
      emit: function(type, data) { console.log('[VR Widget] emit:', type, data); },
      emitEvent: function(e) { console.log('[VR Widget] emitEvent:', e); },
      emitOutput: function(port, data) { console.log('[VR Widget] emitOutput:', port, data); },
      onEvent: function(type, handler) { return function() {}; },
      onInput: function(port, handler) { return function() {}; },
      getState: function() { return ${JSON.stringify(state)}; },
      setState: function(patch) { Object.assign(window.WidgetAPI._state, patch); },
      _state: ${JSON.stringify(state)},
      _source: '${source}',
      getAssetUrl: function(path) {
        if (this._source === 'local') {
          if (path.startsWith('/') || path.startsWith('http')) return path;
          return '/test-widgets/${widget.widgetDefId}/' + path;
        }
        return path;
      },
      log: function() { console.log.apply(console, ['[${widget.widgetDefId}]'].concat(Array.from(arguments))); },
      onMount: function(callback) { setTimeout(function() { callback({ state: ${JSON.stringify(state)} }); }, 0); },
    };
  </script>`;
}
