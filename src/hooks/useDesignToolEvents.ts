/**
 * StickerNest v2 - Design Tool Events Hook
 * Handles events from design tool widgets (Text Tool, Shape Tool, Image Tool)
 * Creates entities and applies real-time style changes to selected widgets
 */

import { useEffect, useCallback } from 'react';
import type { EventBus } from '../runtime/EventBus';
import type { RuntimeContext } from '../runtime/RuntimeContext';
import type { WidgetInstance } from '../types/domain';
import { useCanvasStore } from '../state/useCanvasStore';

interface UseDesignToolEventsOptions {
  eventBus: EventBus;
  runtime: RuntimeContext;
  canvasId: string;
  enabled?: boolean;
}

interface TextStylePayload {
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | 'normal' | 'bold';
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: string;
  fontStyle?: string;
  textDecoration?: string;
}

interface ShapeStylePayload {
  type?: string;
  svg?: string;
  fill?: { enabled: boolean; color: string };
  stroke?: { enabled: boolean; color: string; width: number };
  cornerRadius?: number;
  opacity?: number;
  shadow?: { enabled: boolean; blur: number; color?: string };
}

interface ImageStylePayload {
  src?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  mask?: string;
  objectFit?: string;
  opacity?: number;
  borderRadius?: number;
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    grayscale?: number;
  };
  shadow?: { enabled: boolean; blur: number };
}

interface StyleChangedPayload {
  targetType: 'text' | 'shape' | 'image';
  targetId?: string;
  styles: TextStylePayload | ShapeStylePayload | ImageStylePayload;
}

export function useDesignToolEvents({
  eventBus,
  runtime,
  canvasId,
  enabled = true,
}: UseDesignToolEventsOptions) {
  const addWidget = useCanvasStore(state => state.addWidget);
  const updateWidget = useCanvasStore(state => state.updateWidget);
  const getSelectedWidgets = useCanvasStore(state => state.getSelectedWidgets);
  const selection = useCanvasStore(state => state.selection);
  const saveSnapshot = useCanvasStore(state => state.saveSnapshot);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `widget-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Get canvas center position
  const getCenterPosition = useCallback(() => {
    return { x: 100, y: 100 }; // Default position; could be computed from viewport
  }, []);

  // Create a text widget
  const createTextWidget = useCallback((payload: TextStylePayload & { position?: { x: number; y: number } }) => {
    const id = generateId();
    const position = payload.position || getCenterPosition();

    // Create text entity HTML for the widget
    const content = payload.content || 'New Text';
    const styles = `
      font-family: ${payload.fontFamily || 'Inter, sans-serif'};
      font-size: ${payload.fontSize || 32}px;
      font-weight: ${payload.fontWeight || 400};
      color: ${payload.color || '#e2e8f0'};
      letter-spacing: ${payload.letterSpacing || 0}px;
      line-height: ${payload.lineHeight || 1.5};
      text-align: ${payload.textAlign || 'left'};
      text-transform: ${payload.textTransform || 'none'};
      font-style: ${payload.fontStyle || 'normal'};
      text-decoration: ${payload.textDecoration || 'none'};
    `.replace(/\s+/g, ' ').trim();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Open+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Bebas+Neue&family=Dancing+Script:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: transparent; overflow: hidden; }
          .text-content {
            width: 100%;
            height: 100%;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            word-break: break-word;
            ${styles}
          }
        </style>
      </head>
      <body>
        <div class="text-content" id="textContent">${content}</div>
        <script>
          const state = ${JSON.stringify(payload)};

          function updateStyles(newStyles) {
            const el = document.getElementById('textContent');
            Object.entries(newStyles).forEach(([key, value]) => {
              state[key] = value;
              switch(key) {
                case 'content': el.textContent = value; break;
                case 'fontFamily': el.style.fontFamily = value; break;
                case 'fontSize': el.style.fontSize = value + 'px'; break;
                case 'fontWeight': el.style.fontWeight = value; break;
                case 'color': el.style.color = value; break;
                case 'letterSpacing': el.style.letterSpacing = value + 'px'; break;
                case 'lineHeight': el.style.lineHeight = value; break;
                case 'textAlign': el.style.textAlign = value; break;
                case 'textTransform': el.style.textTransform = value; break;
                case 'fontStyle': el.style.fontStyle = value; break;
                case 'textDecoration': el.style.textDecoration = value; break;
              }
            });
          }

          function init() {
            if (!window.WidgetAPI) { setTimeout(init, 50); return; }
            window.WidgetAPI.onEvent('*', (e) => {
              if (e.type === 'canvas:style-changed' && e.payload?.targetType === 'text') {
                updateStyles(e.payload.styles || {});
              }
            });
            window.WidgetAPI.emitEvent({ type: 'widget.ready' });
          }
          init();
        </script>
      </body>
      </html>
    `;

    const widget: WidgetInstance = {
      id,
      canvasId,
      widgetDefId: 'text-entity',
      version: '1.0.0',
      position,
      width: Math.max(200, (payload.content?.length || 10) * (payload.fontSize || 32) * 0.6),
      height: Math.max(60, (payload.fontSize || 32) * (payload.lineHeight || 1.5) + 20),
      rotation: 0,
      zIndex: Date.now(),
      sizePreset: 'md',
      state: { ...payload, entityType: 'text' },
      metadata: {
        source: 'generated',
        generatedContent: {
          html,
          manifest: {
            id: 'text-entity',
            name: 'Text',
            version: '1.0.0',
            kind: '2d',
            capabilities: { draggable: true, resizable: true },
            size: { width: 200, height: 60 },
            broadcasts: { listens: ['canvas:style-changed'] },
          },
        },
      },
    };

    addWidget(widget);
    runtime.addWidgetInstance(widget);

    console.log('[DesignToolEvents] Created text widget:', id);

    // Emit event for other components
    eventBus.emit({
      type: 'widget:created',
      scope: 'canvas',
      payload: { widgetInstanceId: id, widgetType: 'text-entity', entityType: 'text' },
    });

    return id;
  }, [addWidget, runtime, canvasId, eventBus, generateId, getCenterPosition]);

  // Create a shape widget
  const createShapeWidget = useCallback((payload: ShapeStylePayload & { position?: { x: number; y: number } }) => {
    const id = generateId();
    const position = payload.position || getCenterPosition();

    const svgContent = payload.svg || `
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect x="10" y="10" width="80" height="80"
              fill="${payload.fill?.enabled !== false ? (payload.fill?.color || '#8b5cf6') : 'none'}"
              stroke="${payload.stroke?.enabled ? (payload.stroke?.color || '#6d28d9') : 'none'}"
              stroke-width="${payload.stroke?.width || 0}"
              opacity="${(payload.opacity || 100) / 100}"/>
      </svg>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: transparent; overflow: hidden; }
          .shape-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .shape-container svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="shape-container" id="shapeContainer">${svgContent}</div>
        <script>
          const state = ${JSON.stringify(payload)};

          function updateStyles(newStyles) {
            const el = document.getElementById('shapeContainer');
            if (newStyles.svg) {
              el.innerHTML = newStyles.svg;
            }
            Object.assign(state, newStyles);
          }

          function init() {
            if (!window.WidgetAPI) { setTimeout(init, 50); return; }
            window.WidgetAPI.onEvent('*', (e) => {
              if (e.type === 'canvas:style-changed' && e.payload?.targetType === 'shape') {
                updateStyles(e.payload.styles || {});
              }
            });
            window.WidgetAPI.emitEvent({ type: 'widget.ready' });
          }
          init();
        </script>
      </body>
      </html>
    `;

    const widget: WidgetInstance = {
      id,
      canvasId,
      widgetDefId: 'shape-entity',
      version: '1.0.0',
      position,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: Date.now(),
      sizePreset: 'md',
      state: { ...payload, entityType: 'shape' },
      metadata: {
        source: 'generated',
        generatedContent: {
          html,
          manifest: {
            id: 'shape-entity',
            name: 'Shape',
            version: '1.0.0',
            kind: '2d',
            capabilities: { draggable: true, resizable: true },
            size: { width: 150, height: 150 },
            broadcasts: { listens: ['canvas:style-changed'] },
          },
        },
      },
    };

    addWidget(widget);
    runtime.addWidgetInstance(widget);

    console.log('[DesignToolEvents] Created shape widget:', id);

    eventBus.emit({
      type: 'widget:created',
      scope: 'canvas',
      payload: { widgetInstanceId: id, widgetType: 'shape-entity', entityType: 'shape' },
    });

    return id;
  }, [addWidget, runtime, canvasId, eventBus, generateId, getCenterPosition]);

  // Create an image widget
  const createImageWidget = useCallback((payload: ImageStylePayload & { position?: { x: number; y: number } }) => {
    const id = generateId();
    const position = payload.position || getCenterPosition();

    // Build filter string
    const filters = payload.filters || {};
    const filterParts: string[] = [];
    if (filters.brightness && filters.brightness !== 100) filterParts.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast && filters.contrast !== 100) filterParts.push(`contrast(${filters.contrast}%)`);
    if (filters.saturation && filters.saturation !== 100) filterParts.push(`saturate(${filters.saturation}%)`);
    if (filters.blur && filters.blur > 0) filterParts.push(`blur(${filters.blur}px)`);
    if (filters.grayscale && filters.grayscale > 0) filterParts.push(`grayscale(${filters.grayscale}%)`);
    if (payload.shadow?.enabled) filterParts.push(`drop-shadow(0 4px ${payload.shadow.blur || 10}px rgba(0,0,0,0.5))`);

    const clipPaths: Record<string, string> = {
      rect: 'none',
      rounded: 'none',
      circle: 'circle(50% at 50% 50%)',
      triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: transparent; overflow: hidden; }
          .image-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .image-container img {
            width: 100%;
            height: 100%;
            object-fit: ${payload.objectFit || 'cover'};
            opacity: ${(payload.opacity || 100) / 100};
            border-radius: ${payload.borderRadius || 0}px;
            clip-path: ${clipPaths[payload.mask || 'rect'] || 'none'};
            filter: ${filterParts.join(' ') || 'none'};
          }
        </style>
      </head>
      <body>
        <div class="image-container" id="imageContainer">
          <img src="${payload.src}" alt="Image" id="imageElement">
        </div>
        <script>
          const state = ${JSON.stringify(payload)};
          const clipPaths = ${JSON.stringify(clipPaths)};

          function updateStyles(newStyles) {
            const img = document.getElementById('imageElement');
            Object.entries(newStyles).forEach(([key, value]) => {
              state[key] = value;
              switch(key) {
                case 'src': img.src = value; break;
                case 'objectFit': img.style.objectFit = value; break;
                case 'opacity': img.style.opacity = value / 100; break;
                case 'borderRadius': img.style.borderRadius = value + 'px'; break;
                case 'mask': img.style.clipPath = clipPaths[value] || 'none'; break;
                case 'filters': {
                  const parts = [];
                  if (value.brightness && value.brightness !== 100) parts.push('brightness(' + value.brightness + '%)');
                  if (value.contrast && value.contrast !== 100) parts.push('contrast(' + value.contrast + '%)');
                  if (value.saturation && value.saturation !== 100) parts.push('saturate(' + value.saturation + '%)');
                  if (value.blur && value.blur > 0) parts.push('blur(' + value.blur + 'px)');
                  if (value.grayscale && value.grayscale > 0) parts.push('grayscale(' + value.grayscale + '%)');
                  img.style.filter = parts.join(' ') || 'none';
                  break;
                }
              }
            });
          }

          function init() {
            if (!window.WidgetAPI) { setTimeout(init, 50); return; }
            window.WidgetAPI.onEvent('*', (e) => {
              if (e.type === 'canvas:style-changed' && e.payload?.targetType === 'image') {
                updateStyles(e.payload.styles || {});
              }
            });
            window.WidgetAPI.emitEvent({ type: 'widget.ready' });
          }
          init();
        </script>
      </body>
      </html>
    `;

    const width = payload.naturalWidth ? Math.min(payload.naturalWidth, 400) : 300;
    const height = payload.naturalHeight ? Math.min(payload.naturalHeight, 300) : 200;

    const widget: WidgetInstance = {
      id,
      canvasId,
      widgetDefId: 'image-entity',
      version: '1.0.0',
      position,
      width,
      height,
      rotation: 0,
      zIndex: Date.now(),
      sizePreset: 'md',
      state: { ...payload, entityType: 'image' },
      metadata: {
        source: 'generated',
        generatedContent: {
          html,
          manifest: {
            id: 'image-entity',
            name: 'Image',
            version: '1.0.0',
            kind: '2d',
            capabilities: { draggable: true, resizable: true },
            size: { width, height },
            broadcasts: { listens: ['canvas:style-changed'] },
          },
        },
      },
    };

    addWidget(widget);
    runtime.addWidgetInstance(widget);

    console.log('[DesignToolEvents] Created image widget:', id);

    eventBus.emit({
      type: 'widget:created',
      scope: 'canvas',
      payload: { widgetInstanceId: id, widgetType: 'image-entity', entityType: 'image' },
    });

    return id;
  }, [addWidget, runtime, canvasId, eventBus, generateId, getCenterPosition]);

  // Handle style changes to selected widgets
  const handleStyleChange = useCallback((payload: StyleChangedPayload) => {
    const selectedWidgets = getSelectedWidgets();

    // If targeting a specific widget, update only that one
    if (payload.targetId) {
      updateWidget(payload.targetId, {
        state: { ...payload.styles, entityType: payload.targetType },
      });
      return;
    }

    // Otherwise, update all selected widgets of matching type
    selectedWidgets.forEach(widget => {
      const widgetEntityType = widget.state?.entityType;
      if (widgetEntityType === payload.targetType) {
        updateWidget(widget.id, {
          state: { ...widget.state, ...payload.styles },
        });
      }
    });

    // Broadcast the style change for widgets to react to
    eventBus.emit({
      type: 'canvas:style-changed',
      scope: 'canvas',
      payload,
    });
  }, [getSelectedWidgets, updateWidget, eventBus]);

  // Listen for design tool events
  useEffect(() => {
    if (!enabled) return;

    const handlers = [
      // Add text to canvas
      eventBus.on('canvas:add-text', (event) => {
        if (event.payload) {
          createTextWidget(event.payload as TextStylePayload);
        }
      }),

      // Add shape to canvas
      eventBus.on('canvas:add-shape', (event) => {
        if (event.payload) {
          createShapeWidget(event.payload as ShapeStylePayload);
        }
      }),

      // Add image to canvas
      eventBus.on('canvas:add-image', (event) => {
        if (event.payload) {
          createImageWidget(event.payload as ImageStylePayload);
        }
      }),

      // Handle style changes
      eventBus.on('canvas:style-changed', (event) => {
        if (event.payload) {
          handleStyleChange(event.payload as StyleChangedPayload);
        }
      }),
    ];

    console.log('[DesignToolEvents] Listening for design tool events');

    return () => {
      handlers.forEach(unsubscribe => unsubscribe());
    };
  }, [enabled, eventBus, createTextWidget, createShapeWidget, createImageWidget, handleStyleChange]);

  // Create a stable string representation of selected IDs for dependency comparison
  // This avoids infinite loops caused by Set reference changes
  const selectedIdsKey = Array.from(selection.selectedIds).sort().join(',');

  // Emit selection info when selection changes
  useEffect(() => {
    if (!enabled) return;

    const selectedWidgets = getSelectedWidgets();
    if (selectedWidgets.length === 0) return;

    // Emit selection info for design tools
    selectedWidgets.forEach(widget => {
      const entityType = widget.state?.entityType;
      if (entityType) {
        eventBus.emit({
          type: 'entity:selected',
          scope: 'canvas',
          payload: {
            id: widget.id,
            widgetInstanceId: widget.id,
            entityType,
            type: entityType,
            styles: widget.state,
            content: widget.state?.content,
            src: widget.state?.src,
          },
        });
      }
    });
  }, [selectedIdsKey, getSelectedWidgets, eventBus, enabled]);

  return {
    createTextWidget,
    createShapeWidget,
    createImageWidget,
    handleStyleChange,
  };
}

export default useDesignToolEvents;
