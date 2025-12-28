/**
 * StickerNest v2 - Tool Canvas Interaction Hook
 * Handles interactions between toolbar tools and canvas entity creation
 * Emits widget:add-request events for proper mounting by CanvasRuntime
 */

import { useCallback, useRef } from 'react';
import { useToolStore, useActiveTool } from '../state/useToolStore';
import type { EventBus } from '../runtime/EventBus';
import type { VectorShapeType } from '../types/entities';

interface UseToolCanvasInteractionOptions {
  eventBus: EventBus;
  canvasId: string;
  enabled?: boolean;
}

// SVG generators for different shapes
const shapeGenerators: Record<VectorShapeType, (fill: string, stroke: string, strokeWidth: number) => string> = {
  rectangle: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <rect x="5" y="5" width="90" height="90" rx="0"
            fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>
  `,
  circle: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="45"
              fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>
  `,
  triangle: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <polygon points="50,5 95,95 5,95"
               fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>
  `,
  polygon: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <polygon points="50,3 93,25 93,75 50,97 7,75 7,25"
               fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>
  `,
  star: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
               fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>
  `,
  ellipse: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 150 100" width="100%" height="100%">
      <ellipse cx="75" cy="50" rx="70" ry="45"
               fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>
  `,
  line: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 200 20" width="100%" height="100%">
      <line x1="5" y1="10" x2="195" y2="10"
            stroke="${stroke || fill}" stroke-width="${Math.max(strokeWidth, 3)}" stroke-linecap="round"/>
    </svg>
  `,
  arrow: (fill, stroke, strokeWidth) => `
    <svg viewBox="0 0 200 30" width="100%" height="100%">
      <defs>
        <marker id="arrowhead-${Date.now()}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${stroke || fill}"/>
        </marker>
      </defs>
      <line x1="5" y1="15" x2="175" y2="15"
            stroke="${stroke || fill}" stroke-width="${Math.max(strokeWidth, 3)}"
            stroke-linecap="round" marker-end="url(#arrowhead-${Date.now()})"/>
    </svg>
  `,
};

// Shape dimensions
const shapeDimensions: Record<VectorShapeType, { width: number; height: number }> = {
  rectangle: { width: 150, height: 150 },
  circle: { width: 150, height: 150 },
  triangle: { width: 150, height: 150 },
  polygon: { width: 150, height: 150 },
  star: { width: 150, height: 150 },
  ellipse: { width: 200, height: 120 },
  line: { width: 200, height: 20 },
  arrow: { width: 200, height: 30 },
};

// Generate HTML for a shape widget
function generateShapeHtml(svg: string, shapeType: VectorShapeType): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
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
      <div class="shape-container" id="shapeContainer">${svg}</div>
      <script>
        function init() {
          if (!window.WidgetAPI) { setTimeout(init, 50); return; }
          window.WidgetAPI.emitEvent({ type: 'widget.ready' });
        }
        init();
      </script>
    </body>
    </html>
  `;
}

// Generate HTML for a text widget
function generateTextHtml(content: string, styles: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
        .text-content {
          width: 100%;
          height: 100%;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: ${styles.textAlign === 'center' ? 'center' : styles.textAlign === 'right' ? 'flex-end' : 'flex-start'};
          word-break: break-word;
          font-family: ${styles.fontFamily || 'Inter, sans-serif'};
          font-size: ${styles.fontSize || 32}px;
          font-weight: ${styles.fontWeight || 400};
          color: ${styles.color || '#e2e8f0'};
          text-align: ${styles.textAlign || 'left'};
        }
      </style>
    </head>
    <body>
      <div class="text-content" id="textContent">${content}</div>
      <script>
        function init() {
          if (!window.WidgetAPI) { setTimeout(init, 50); return; }
          window.WidgetAPI.emitEvent({ type: 'widget.ready' });
        }
        init();
      </script>
    </body>
    </html>
  `;
}

// Generate HTML for an image widget
function generateImageHtml(src: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
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
          object-fit: cover;
        }
      </style>
    </head>
    <body>
      <div class="image-container">
        <img src="${src}" alt="Image" id="imageElement">
      </div>
      <script>
        function init() {
          if (!window.WidgetAPI) { setTimeout(init, 50); return; }
          window.WidgetAPI.emitEvent({ type: 'widget.ready' });
        }
        init();
      </script>
    </body>
    </html>
  `;
}

export function useToolCanvasInteraction({
  eventBus,
  canvasId,
  enabled = true,
}: UseToolCanvasInteractionOptions) {
  const activeTool = useActiveTool();
  const shapeDefaults = useToolStore(s => s.shapeDefaults);
  const textDefaults = useToolStore(s => s.textDefaults);
  const resetToSelect = useToolStore(s => s.resetToSelect);

  // Track if we're in the middle of creating something
  const isCreatingRef = useRef(false);
  // Track file input for image uploads
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Create text entity at position
  const createTextAtPosition = useCallback((x: number, y: number) => {
    if (!enabled) return;

    const content = 'Click to edit';
    const styles = {
      fontFamily: textDefaults.fontFamily,
      fontSize: textDefaults.fontSize,
      fontWeight: textDefaults.fontWeight,
      color: textDefaults.color,
      textAlign: textDefaults.textAlign,
    };

    const html = generateTextHtml(content, styles);
    const width = Math.max(200, content.length * (textDefaults.fontSize || 32) * 0.6);
    const height = Math.max(60, (textDefaults.fontSize || 32) * 1.5 + 30);

    // Emit widget:add-request for CanvasRuntime to mount
    eventBus.emit({
      type: 'widget:add-request',
      scope: 'canvas',
      payload: {
        widgetDefId: 'text-entity',
        version: '1.0.0',
        source: 'generated',
        position: { x, y },
        generatedContent: {
          html,
          manifest: {
            id: 'text-entity',
            name: 'Text',
            version: '1.0.0',
            kind: '2d',
            capabilities: { draggable: true, resizable: true },
            size: { width, height },
          },
        },
      },
    });

    resetToSelect();
  }, [enabled, eventBus, textDefaults, resetToSelect]);

  // Create shape entity at position
  const createShapeAtPosition = useCallback((x: number, y: number, shapeType: VectorShapeType) => {
    if (!enabled) return;

    const fillColor = shapeDefaults.fill;
    const strokeColor = shapeDefaults.stroke;
    const strokeWidth = shapeDefaults.strokeWidth;

    const svgGenerator = shapeGenerators[shapeType];
    const svg = svgGenerator ? svgGenerator(fillColor, strokeColor, strokeWidth) : shapeGenerators.rectangle(fillColor, strokeColor, strokeWidth);
    const html = generateShapeHtml(svg, shapeType);
    const dimensions = shapeDimensions[shapeType] || { width: 150, height: 150 };

    // Emit widget:add-request for CanvasRuntime to mount
    eventBus.emit({
      type: 'widget:add-request',
      scope: 'canvas',
      payload: {
        widgetDefId: `shape-entity-${shapeType}`,
        version: '1.0.0',
        source: 'generated',
        position: { x, y },
        generatedContent: {
          html,
          manifest: {
            id: `shape-entity-${shapeType}`,
            name: `Shape: ${shapeType}`,
            version: '1.0.0',
            kind: '2d',
            capabilities: { draggable: true, resizable: true },
            size: { width: dimensions.width, height: dimensions.height },
          },
        },
      },
    });

    resetToSelect();
  }, [enabled, eventBus, shapeDefaults, resetToSelect]);

  // Create image entity from file
  const createImageFromFile = useCallback((file: File, x: number, y: number) => {
    if (!enabled) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        const html = generateImageHtml(src);
        const width = Math.min(img.naturalWidth, 400);
        const height = Math.min(img.naturalHeight, 300);

        // Emit widget:add-request for CanvasRuntime to mount
        eventBus.emit({
          type: 'widget:add-request',
          scope: 'canvas',
          payload: {
            widgetDefId: 'image-entity',
            version: '1.0.0',
            source: 'generated',
            position: { x, y },
            generatedContent: {
              html,
              manifest: {
                id: 'image-entity',
                name: 'Image',
                version: '1.0.0',
                kind: '2d',
                capabilities: { draggable: true, resizable: true },
                size: { width, height },
              },
            },
          },
        });

        resetToSelect();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [enabled, eventBus, resetToSelect]);

  // Create image from URL
  const createImageFromUrl = useCallback((url: string, x: number, y: number) => {
    if (!enabled) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const html = generateImageHtml(url);
      const width = Math.min(img.naturalWidth, 400);
      const height = Math.min(img.naturalHeight, 300);

      eventBus.emit({
        type: 'widget:add-request',
        scope: 'canvas',
        payload: {
          widgetDefId: 'image-entity',
          version: '1.0.0',
          source: 'generated',
          position: { x, y },
          generatedContent: {
            html,
            manifest: {
              id: 'image-entity',
              name: 'Image',
              version: '1.0.0',
              kind: '2d',
              capabilities: { draggable: true, resizable: true },
              size: { width, height },
            },
          },
        },
      });

      resetToSelect();
    };
    img.onerror = () => {
      console.error('Failed to load image from URL:', url);
    };
    img.src = url;
  }, [enabled, eventBus, resetToSelect]);

  // Open file picker for image tool
  const openImagePicker = useCallback((x: number, y: number) => {
    if (!enabled) return;

    // Create hidden file input if it doesn't exist
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    const input = fileInputRef.current;

    // Set up handler for this specific pick
    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        createImageFromFile(file, x, y);
      }
      // Clean up
      input.removeEventListener('change', handleChange);
      input.value = '';
    };

    input.addEventListener('change', handleChange);
    input.click();
  }, [enabled, createImageFromFile]);

  // Handle canvas click based on active tool
  const handleCanvasToolClick = useCallback((e: React.MouseEvent, canvasRect: DOMRect) => {
    if (!enabled || isCreatingRef.current) return false;

    // Calculate position relative to canvas
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const tool = activeTool;

    switch (tool.category) {
      case 'select':
        // Select tool doesn't create anything
        return false;

      case 'text':
        isCreatingRef.current = true;
        createTextAtPosition(x, y);
        isCreatingRef.current = false;
        return true;

      case 'shape':
        if (tool.shapeType) {
          isCreatingRef.current = true;
          createShapeAtPosition(x, y, tool.shapeType);
          isCreatingRef.current = false;
          return true;
        }
        return false;

      case 'image':
        isCreatingRef.current = true;
        openImagePicker(x, y);
        isCreatingRef.current = false;
        return true;

      case 'object3d':
        // TODO: Implement 3D object creation
        console.log('[ToolCanvasInteraction] 3D object creation not yet implemented');
        return false;

      case 'container':
        // Emit add request for container widget
        isCreatingRef.current = true;
        eventBus.emit({
          type: 'widget:add-request',
          scope: 'canvas',
          payload: {
            widgetDefId: 'stickernest.container',
            version: '1.0.0',
            source: 'builtin',
            // Simple robust positioning: centered on click
            // The container is 320x240 by default, so offset by half
            positionOffset: { x: x - 160, y: y - 120 }
          }
        });
        resetToSelect();
        isCreatingRef.current = false;
        return true;

      default:
        return false;
    }
  }, [enabled, activeTool, createTextAtPosition, createShapeAtPosition, openImagePicker]);

  // Check if current tool creates on click
  const shouldCreateOnClick = useCallback(() => {
    return activeTool.category !== 'select' && activeTool.category !== 'more';
  }, [activeTool.category]);

  // Get cursor style based on active tool
  const getToolCursor = useCallback(() => {
    switch (activeTool.category) {
      case 'select':
        return 'default';
      case 'text':
        return 'text';
      case 'shape':
      case 'image':
      case 'object3d':
      case 'container':
        return 'crosshair';
      default:
        return 'default';
    }
  }, [activeTool.category]);

  return {
    handleCanvasToolClick,
    shouldCreateOnClick,
    getToolCursor,
    createTextAtPosition,
    createShapeAtPosition,
    createImageFromFile,
    createImageFromUrl,
    openImagePicker,
    activeTool,
  };
}

export default useToolCanvasInteraction;
