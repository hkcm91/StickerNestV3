/**
 * StickerNest v2 - Floating Preview Window
 * Draggable, resizable preview window for AI-generated widgets
 *
 * Updated with new design system: SNIcon, SNIconButton
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { DraftWidget } from '../../ai/DraftManager';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';

export type PreviewSize = 'small' | 'medium' | 'large' | 'custom';

export interface FloatingPreviewProps {
  draft: DraftWidget | null;
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onPinToggle: () => void;
  initialPosition?: { x: number; y: number };
  initialSize?: PreviewSize;
}

const SIZE_PRESETS: Record<PreviewSize, { width: number; height: number }> = {
  small: { width: 300, height: 250 },
  medium: { width: 400, height: 350 },
  large: { width: 550, height: 450 },
  custom: { width: 400, height: 350 },
};

export const FloatingPreview: React.FC<FloatingPreviewProps> = ({
  draft,
  isOpen,
  onClose,
  isPinned,
  onPinToggle,
  initialPosition = { x: 100, y: 100 },
  initialSize = 'medium',
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState<PreviewSize>(initialSize);
  const [customSize, setCustomSize] = useState(SIZE_PRESETS.medium);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get current dimensions
  const currentSize = size === 'custom' ? customSize : SIZE_PRESETS[size];

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.preview-controls')) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: Math.max(0, e.clientX - dragOffset.x),
        y: Math.max(0, e.clientY - dragOffset.y),
      });
    }
    
    if (isResizing && windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      const newWidth = Math.max(250, e.clientX - rect.left);
      const newHeight = Math.max(200, e.clientY - rect.top);
      setCustomSize({ width: newWidth, height: newHeight });
      setSize('custom');
    }
  }, [isDragging, isResizing, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Refresh preview when draft changes
  useEffect(() => {
    if (draft) {
      setRefreshKey(prev => prev + 1);
    }
  }, [draft?.html, draft?.manifest]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from our iframe
      if (iframeRef.current?.contentWindow !== event.source) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Handle READY signal from widget
      if (data.type === 'READY' || data.type === 'widget:ready') {
        console.log('[FloatingPreview] Widget ready, sending INIT');
        iframeRef.current?.contentWindow?.postMessage({
          type: 'INIT',
          instanceId: draft?.manifest?.id || 'preview',
          payload: {
            manifest: draft?.manifest,
            state: {},
            assetBaseUrl: '',
            debugEnabled: true,
            size: { width: currentSize.width, height: currentSize.height - 50 },
            canvasMode: 'view',
            capabilities: ['canvas'],
            canvasInfo: {
              width: 1920,
              height: 1080,
              mode: 'view',
              zoom: 1,
              theme: 'dark'
            },
            settings: {}
          }
        }, '*');
      }

      // Log other messages for debugging
      if (data.type === 'widget:emit' || data.type === 'widget:broadcast') {
        console.log('[FloatingPreview] Widget event:', data.payload?.type, data.payload?.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [draft, currentSize]);

  // Generate iframe content
  const generatePreviewContent = useCallback(() => {
    if (!draft?.html) return '';

    // Inject a minimal WidgetAPI mock for preview with proper lifecycle
    const mockWidgetAPI = `
      <script>
        (function() {
          var instanceId = '${draft?.manifest?.id || 'preview'}';
          var widgetState = {};
          var eventHandlers = {};
          var inputHandlers = {};
          var isInitialized = false;

          window.WidgetAPI = {
            emitEvent: function(event) {
              window.parent.postMessage({
                type: 'EVENT',
                instanceId: instanceId,
                payload: event
              }, '*');
            },
            onEvent: function(eventType, handler) {
              if (!eventHandlers[eventType]) eventHandlers[eventType] = [];
              eventHandlers[eventType].push(handler);
              return function() {
                var idx = eventHandlers[eventType].indexOf(handler);
                if (idx > -1) eventHandlers[eventType].splice(idx, 1);
              };
            },
            emitOutput: function(portName, value) {
              window.parent.postMessage({
                type: 'OUTPUT',
                instanceId: instanceId,
                payload: { portName: portName, value: value }
              }, '*');
            },
            onInput: function(portName, handler) {
              if (!inputHandlers[portName]) inputHandlers[portName] = [];
              inputHandlers[portName].push(handler);
              return function() {
                var idx = inputHandlers[portName].indexOf(handler);
                if (idx > -1) inputHandlers[portName].splice(idx, 1);
              };
            },
            getState: function() { return widgetState; },
            setState: function(patch) {
              Object.assign(widgetState, patch);
              window.parent.postMessage({
                type: 'STATE_PATCH',
                instanceId: instanceId,
                payload: patch
              }, '*');
            },
            getAssetUrl: function(path) { return path; },
            log: function() { console.log.apply(console, ['[Widget]'].concat(Array.from(arguments))); },
            info: function() { console.info.apply(console, ['[Widget]'].concat(Array.from(arguments))); },
            warn: function() { console.warn.apply(console, ['[Widget]'].concat(Array.from(arguments))); },
            error: function() { console.error.apply(console, ['[Widget]'].concat(Array.from(arguments))); },
            debugLog: function() { console.log.apply(console, ['[Widget Debug]'].concat(Array.from(arguments))); },
            onMount: function(handler) { if (isInitialized) handler(); else window.addEventListener('load', handler); },
            onDestroy: function(handler) { window.addEventListener('unload', handler); },
            onResize: function(handler) { window.addEventListener('resize', handler); },
          };

          // Listen for messages from parent
          window.addEventListener('message', function(event) {
            var data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'INIT') {
              isInitialized = true;
              if (data.payload && data.payload.state) {
                widgetState = data.payload.state;
              }
            }

            if (data.type === 'EVENT' && data.payload) {
              var handlers = eventHandlers[data.payload.type] || [];
              handlers.forEach(function(h) { h(data.payload); });
            }

            if (data.type === 'pipeline:input' || (data.type === 'widget:event' && data.payload)) {
              var portName = data.portName || (data.payload && data.payload.type);
              var value = data.value || (data.payload && data.payload.payload);
              var portHandlers = inputHandlers[portName] || [];
              portHandlers.forEach(function(h) { h(value); });
            }
          });

          // Signal ready
          window.parent.postMessage({ type: 'READY' }, '*');
        })();
      </script>
    `;

    // Inject mock API into the HTML
    let html = draft.html;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${mockWidgetAPI}`);
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', `<body>${mockWidgetAPI}`);
    } else {
      html = mockWidgetAPI + html;
    }

    return html;
  }, [draft]);

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: currentSize.width,
        height: currentSize.height,
        background: '#1e1e2e',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 12px',
          background: 'var(--sn-glass-bg, rgba(0,0,0,0.3))',
          borderBottom: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--sn-accent-primary, #8b5cf6)' }}>
            <SNIcon name="eye" size="md" />
          </span>
          <span style={{ color: 'var(--sn-text-primary, #e2e8f0)', fontSize: '0.85rem', fontWeight: 500 }}>
            {draft?.manifest?.name || 'Widget Preview'}
          </span>
        </div>

        <div className="preview-controls" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Size presets */}
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as PreviewSize)}
            style={{
              background: 'var(--sn-glass-bg, rgba(255,255,255,0.1))',
              border: 'none',
              borderRadius: 4,
              color: 'var(--sn-text-primary, #e2e8f0)',
              fontSize: '0.75rem',
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            {size === 'custom' && <option value="custom">Custom</option>}
          </select>

          {/* Refresh */}
          <SNIconButton
            icon="refresh"
            variant="glass"
            size="sm"
            tooltip="Refresh preview"
            onClick={() => setRefreshKey(prev => prev + 1)}
          />

          {/* Pin toggle */}
          <SNIconButton
            icon="pin"
            variant={isPinned ? 'primary' : 'glass'}
            size="sm"
            tooltip={isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
            onClick={onPinToggle}
            active={isPinned}
          />

          {/* Close */}
          <SNIconButton
            icon="close"
            variant="danger"
            size="sm"
            tooltip="Close preview"
            onClick={onClose}
          />
        </div>
      </div>

      {/* Preview Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {draft ? (
          <iframe
            ref={iframeRef}
            key={refreshKey}
            srcDoc={generatePreviewContent()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#1a1a2e',
            }}
            sandbox="allow-scripts"
            title="Widget Preview"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#64748b',
              fontSize: '0.9rem',
            }}
          >
            No widget selected for preview
          </div>
        )}
      </div>

      {/* Status bar */}
      {draft && (
        <div
          style={{
            padding: '4px 12px',
            background: 'rgba(0,0,0,0.2)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.7rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>ID: {draft.manifest?.id || 'unknown'}</span>
          <span>v{draft.manifest?.version || '1.0.0'}</span>
        </div>
      )}

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={() => setIsResizing(true)}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'se-resize',
          background: 'linear-gradient(135deg, transparent 50%, rgba(139, 92, 246, 0.5) 50%)',
          borderRadius: '0 0 8px 0',
        }}
      />
    </div>
  );
};

export default FloatingPreview;

