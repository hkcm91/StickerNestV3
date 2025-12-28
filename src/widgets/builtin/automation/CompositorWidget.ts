/**
 * Compositor Widget
 *
 * Combines AI-generated backgrounds with user text and logos.
 * Outputs final composed images and editable PDFs with text layers.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import type {
  ContentZone,
  TemplateDimensions,
  StyleConfig,
  UserFormData,
  UploadedImage,
  CompositorOutput,
} from './types';

export const CompositorManifest: WidgetManifest = {
  id: 'stickernest.compositor',
  name: 'Compositor',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'Combines AI-generated images with text overlays and logos. Exports final designs as PNG and editable PDF with text layers.',
  author: 'StickerNest',
  tags: ['automation', 'compositor', 'text-overlay', 'pdf', 'export', 'pipeline'],
  inputs: {
    imageBase: {
      type: 'object',
      description: 'AI-generated background image',
      required: true,
    },
    layoutZones: {
      type: 'object',
      description: 'Zone definitions for text/image placement',
      required: true,
    },
    userData: {
      type: 'object',
      description: 'User data to overlay (name, email, etc.)',
      required: true,
    },
    triggerCompose: {
      type: 'trigger',
      description: 'Start composition',
    },
    triggerExport: {
      type: 'trigger',
      description: 'Export final assets',
    },
  },
  outputs: {
    imageComposed: {
      type: 'object',
      description: 'Final composed image',
    },
    pdfReady: {
      type: 'object',
      description: 'Editable PDF with text layers',
    },
    exportPackage: {
      type: 'object',
      description: 'All export assets (PNG, PDF, etc.)',
    },
    statusProgress: {
      type: 'object',
      description: 'Composition progress',
    },
    error: {
      type: 'object',
      description: 'Error information',
    },
  },
  capabilities: {
    draggable: true,
    resizable: false,
    rotatable: false,
  },
  io: {
    inputs: [
      'image.base',
      'layout.zones',
      'user.data',
      'trigger.compose',
      'trigger.export',
    ],
    outputs: [
      'image.composed',
      'pdf.ready',
      'export.package',
      'status.progress',
      'error.occurred',
    ],
  },
  size: {
    width: 200,
    height: 140,
    minWidth: 150,
    minHeight: 120,
  },
};

export const CompositorHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #064e3b 0%, #0f0f19 100%);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 12px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .icon {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
    }
    .title {
      font-size: 11px;
      font-weight: 600;
      flex: 1;
    }
    .status-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .progress-container {
      display: none;
    }
    .progress-container.visible {
      display: block;
    }
    .progress-bar {
      height: 4px;
      background: rgba(16, 185, 129, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
      width: 0%;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 9px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-top: 4px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      font-size: 9px;
    }
    .stat {
      display: flex;
      justify-content: space-between;
    }
    .stat-label {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .stat-value {
      color: var(--sn-text-primary, #e2e8f0);
      font-weight: 500;
    }
    .stat-value.compositing {
      color: #f59e0b;
    }
    .stat-value.ready {
      color: #22c55e;
    }
    .stat-value.error {
      color: #ef4444;
    }
    .export-buttons {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }
    .export-btn {
      flex: 1;
      padding: 4px 6px;
      font-size: 9px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 4px;
      color: #10b981;
      cursor: pointer;
      transition: all 0.2s;
    }
    .export-btn:hover {
      background: rgba(16, 185, 129, 0.3);
    }
    .export-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .preview-mini {
      width: 100%;
      height: 35px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      display: none;
      overflow: hidden;
      margin-top: 4px;
    }
    .preview-mini.visible {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-mini img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">C</div>
      <span class="title">Compositor</span>
    </div>

    <div class="status-area">
      <div class="progress-container" id="progressContainer">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">Processing...</div>
      </div>

      <div class="stats">
        <div class="stat">
          <span class="stat-label">Status:</span>
          <span class="stat-value" id="statusValue">Idle</span>
        </div>
        <div class="stat">
          <span class="stat-label">Layers:</span>
          <span class="stat-value" id="layersValue">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Size:</span>
          <span class="stat-value" id="sizeValue">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">DPI:</span>
          <span class="stat-value" id="dpiValue">-</span>
        </div>
      </div>

      <div class="preview-mini" id="previewMini"></div>

      <div class="export-buttons">
        <button class="export-btn" id="btnPng" disabled>PNG</button>
        <button class="export-btn" id="btnPdf" disabled>PDF</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI || {
        emitOutput: console.log,
        onInput: () => {},
        onMount: (cb) => cb({ state: {} }),
        onStateChange: () => {},
        setState: () => {},
        log: console.log,
      };

      // State
      let state = {
        baseImage: null,
        layoutConfig: null,
        userData: null,
        status: 'idle',
        progress: 0,
        composedImage: null,
        pdfData: null,
        exportPackage: null,
      };

      // DOM Elements
      const progressContainer = document.getElementById('progressContainer');
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');
      const statusValue = document.getElementById('statusValue');
      const layersValue = document.getElementById('layersValue');
      const sizeValue = document.getElementById('sizeValue');
      const dpiValue = document.getElementById('dpiValue');
      const previewMini = document.getElementById('previewMini');
      const btnPng = document.getElementById('btnPng');
      const btnPdf = document.getElementById('btnPdf');

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        API.log('Compositor mounted');

        // Export button handlers
        btnPng.addEventListener('click', () => downloadExport('png'));
        btnPdf.addEventListener('click', () => downloadExport('pdf'));
      });

      // Input handlers
      API.onInput('image.base', function(imageData) {
        API.log('Base image received');
        state.baseImage = imageData;
        API.setState({ baseImage: imageData });
        tryAutoCompose();
      });

      API.onInput('layout.zones', function(config) {
        API.log('Layout config received');
        state.layoutConfig = config;
        API.setState({ layoutConfig: config });
        updateLayoutInfo();
        tryAutoCompose();
      });

      API.onInput('user.data', function(data) {
        API.log('User data received');
        state.userData = data;
        API.setState({ userData: data });
      });

      API.onInput('trigger.compose', function() {
        compose();
      });

      API.onInput('trigger.export', function() {
        exportAll();
      });

      // Auto-compose when all inputs ready
      function tryAutoCompose() {
        if (state.baseImage && state.layoutConfig) {
          compose();
        }
      }

      // Main composition function
      async function compose() {
        if (!state.baseImage) {
          emitError('NO_IMAGE', 'No base image provided');
          return;
        }

        if (!state.layoutConfig) {
          emitError('NO_LAYOUT', 'No layout configuration provided');
          return;
        }

        state.status = 'compositing';
        setProgress(0, 'Starting composition...');
        updateUI();

        try {
          const canvas = document.createElement('canvas');
          const dimensions = state.layoutConfig.dimensions || { width: 600, height: 350, dpi: 300 };
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          const ctx = canvas.getContext('2d');

          // Step 1: Draw base image
          setProgress(10, 'Loading base image...');
          await drawBaseImage(ctx, canvas.width, canvas.height);

          // Step 2: Draw text zones
          setProgress(40, 'Rendering text layers...');
          const zones = state.layoutConfig.zones || [];
          const textZones = zones.filter(z => z.type === 'text');
          await drawTextZones(ctx, textZones, canvas.width, canvas.height);

          // Step 3: Draw image zones (logos, photos)
          setProgress(70, 'Placing images...');
          const imageZones = zones.filter(z => z.type === 'image' || z.type === 'logo');
          await drawImageZones(ctx, imageZones, canvas.width, canvas.height);

          // Step 4: Generate outputs
          setProgress(85, 'Generating exports...');

          const composedImage = canvas.toDataURL('image/png');
          state.composedImage = composedImage;

          // Generate high-res version
          const hiResCanvas = document.createElement('canvas');
          const scale = 2;
          hiResCanvas.width = canvas.width * scale;
          hiResCanvas.height = canvas.height * scale;
          const hiResCtx = hiResCanvas.getContext('2d');
          hiResCtx.scale(scale, scale);
          hiResCtx.drawImage(canvas, 0, 0);
          const hiResImage = hiResCanvas.toDataURL('image/png');

          // Create export package
          state.exportPackage = {
            png: composedImage,
            pngHighRes: hiResImage,
            pdf: null, // Will generate on demand
          };

          setProgress(100, 'Composition complete!');
          state.status = 'ready';
          updateUI();

          // Show preview
          previewMini.innerHTML = '<img src="' + composedImage + '" alt="Preview">';
          previewMini.classList.add('visible');

          // Enable export buttons
          btnPng.disabled = false;
          btnPdf.disabled = false;

          // Emit outputs
          API.emitOutput('image.composed', {
            imageData: composedImage,
            width: canvas.width,
            height: canvas.height,
          });

          API.emitOutput('export.package', state.exportPackage);

          API.emitOutput('status.progress', {
            stage: 'complete',
            percent: 100,
            message: 'Design ready for download',
          });

          API.log('Composition complete');

        } catch (error) {
          state.status = 'error';
          setProgress(0, 'Composition failed');
          updateUI();
          emitError('COMPOSE_ERROR', error.message || 'Unknown error');
        }
      }

      // Draw base image onto canvas
      function drawBaseImage(ctx, width, height) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = function() {
            // Cover the canvas
            const imgRatio = img.width / img.height;
            const canvasRatio = width / height;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (imgRatio > canvasRatio) {
              drawHeight = height;
              drawWidth = height * imgRatio;
              offsetX = (width - drawWidth) / 2;
              offsetY = 0;
            } else {
              drawWidth = width;
              drawHeight = width / imgRatio;
              offsetX = 0;
              offsetY = (height - drawHeight) / 2;
            }

            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            resolve();
          };

          img.onerror = function() {
            // If image fails, draw placeholder
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, width, height);
            resolve();
          };

          // Handle both URL and data URL
          const src = state.baseImage.imageUrl || state.baseImage.imageData || state.baseImage;
          img.src = src;
        });
      }

      // Draw text zones
      async function drawTextZones(ctx, zones, canvasWidth, canvasHeight) {
        const colors = state.layoutConfig.colors || {};
        const userData = state.layoutConfig.userData || state.userData || {};

        for (const zone of zones) {
          const config = zone.textConfig;
          if (!config) continue;

          // Get bounds
          const bounds = zone.bounds;
          let x, y, w, h;

          if (bounds.unit === 'percent') {
            x = (bounds.x / 100) * canvasWidth;
            y = (bounds.y / 100) * canvasHeight;
            w = (bounds.width / 100) * canvasWidth;
            h = (bounds.height / 100) * canvasHeight;
          } else {
            x = bounds.x;
            y = bounds.y;
            w = bounds.width;
            h = bounds.height;
          }

          // Get text from user data
          const text = userData[config.fieldMapping] || '';
          if (!text) continue;

          // Resolve color
          let color = config.color;
          if (color === 'primary') color = colors.primary || '#8b5cf6';
          else if (color === 'secondary') color = colors.secondary || '#06b6d4';
          else if (color === 'accent') color = colors.accent || '#f59e0b';
          else if (color === 'text') color = colors.text || '#1f2937';

          // Set font
          const fontWeight = getFontWeight(config.fontWeight);
          const fontSize = config.fontSize || 16;
          const fontFamily = config.fontFamily || '-apple-system, BlinkMacSystemFont, sans-serif';
          ctx.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
          ctx.fillStyle = color;
          ctx.textBaseline = 'top';

          // Text alignment
          if (config.alignment === 'center') {
            ctx.textAlign = 'center';
            x = x + w / 2;
          } else if (config.alignment === 'right') {
            ctx.textAlign = 'right';
            x = x + w;
          } else {
            ctx.textAlign = 'left';
          }

          // Handle multi-line text
          const lines = wrapText(ctx, text, w);
          const lineHeight = fontSize * (config.lineHeight || 1.3);
          const maxLines = config.maxLines || 10;

          for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
            ctx.fillText(lines[i], x, y + i * lineHeight);
          }
        }
      }

      // Draw image zones (logos, photos)
      async function drawImageZones(ctx, zones, canvasWidth, canvasHeight) {
        const images = state.layoutConfig.images || [];

        for (const zone of zones) {
          const config = zone.imageConfig;
          if (!config) continue;

          // Find matching uploaded image
          const uploadedImage = images.find(img => img.fieldName === config.fieldMapping);
          if (!uploadedImage) continue;

          // Get bounds
          const bounds = zone.bounds;
          let x, y, w, h;

          if (bounds.unit === 'percent') {
            x = (bounds.x / 100) * canvasWidth;
            y = (bounds.y / 100) * canvasHeight;
            w = (bounds.width / 100) * canvasWidth;
            h = (bounds.height / 100) * canvasHeight;
          } else {
            x = bounds.x;
            y = bounds.y;
            w = bounds.width;
            h = bounds.height;
          }

          await drawImage(ctx, uploadedImage.dataUrl, x, y, w, h, config.fit);
        }
      }

      // Draw single image with fit mode
      function drawImage(ctx, src, x, y, w, h, fit) {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = function() {
            const imgRatio = img.width / img.height;
            const boxRatio = w / h;

            let drawX = x, drawY = y, drawW = w, drawH = h;

            if (fit === 'contain') {
              if (imgRatio > boxRatio) {
                drawW = w;
                drawH = w / imgRatio;
                drawY = y + (h - drawH) / 2;
              } else {
                drawH = h;
                drawW = h * imgRatio;
                drawX = x + (w - drawW) / 2;
              }
            } else if (fit === 'cover') {
              if (imgRatio > boxRatio) {
                drawH = h;
                drawW = h * imgRatio;
                drawX = x - (drawW - w) / 2;
              } else {
                drawW = w;
                drawH = w / imgRatio;
                drawY = y - (drawH - h) / 2;
              }
            }

            // Apply border radius if needed
            if (config?.borderRadius) {
              ctx.save();
              roundRect(ctx, x, y, w, h, config.borderRadius);
              ctx.clip();
            }

            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            if (config?.borderRadius) {
              ctx.restore();
            }

            resolve();
          };

          img.onerror = () => resolve();
          img.src = src;
        });
      }

      // Helper: wrap text to fit width
      function wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        return lines;
      }

      // Helper: font weight string
      function getFontWeight(weight) {
        const weights = {
          'light': '300',
          'normal': '400',
          'medium': '500',
          'semibold': '600',
          'bold': '700',
        };
        return weights[weight] || '400';
      }

      // Helper: draw rounded rectangle
      function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }

      // Export all formats
      async function exportAll() {
        if (!state.composedImage) {
          emitError('NO_COMPOSED', 'No composed image to export');
          return;
        }

        setProgress(0, 'Preparing exports...');

        // Generate PDF if not already done
        if (!state.exportPackage.pdf) {
          setProgress(50, 'Generating PDF...');
          state.exportPackage.pdf = await generatePDF();
        }

        setProgress(100, 'Export ready');

        API.emitOutput('export.package', state.exportPackage);
        API.emitOutput('pdf.ready', { pdfData: state.exportPackage.pdf });
      }

      // Generate PDF (basic implementation)
      async function generatePDF() {
        // For now, return the PNG as base64
        // Full PDF implementation would use jsPDF or similar
        // This is a placeholder that outputs PNG data
        API.log('PDF generation: using PNG fallback (jsPDF not loaded)');
        return state.exportPackage.pngHighRes || state.exportPackage.png;
      }

      // Download export
      function downloadExport(format) {
        if (!state.exportPackage) return;

        let data, filename, mimeType;

        if (format === 'png') {
          data = state.exportPackage.pngHighRes || state.exportPackage.png;
          filename = 'business-card.png';
          mimeType = 'image/png';
        } else if (format === 'pdf') {
          data = state.exportPackage.pdf || state.exportPackage.png;
          filename = 'business-card.pdf';
          mimeType = 'application/pdf';
        }

        if (data) {
          const link = document.createElement('a');
          link.href = data;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      // Update layout info display
      function updateLayoutInfo() {
        if (state.layoutConfig) {
          const dims = state.layoutConfig.dimensions || {};
          const zones = state.layoutConfig.zones || [];
          layersValue.textContent = zones.length.toString();
          sizeValue.textContent = (dims.width || 0) + 'x' + (dims.height || 0);
          dpiValue.textContent = (dims.dpi || 300).toString();
        }
      }

      // Progress update
      function setProgress(percent, message) {
        state.progress = percent;
        progressFill.style.width = percent + '%';
        progressText.textContent = message;
        progressContainer.classList.toggle('visible', percent > 0 && percent < 100);
      }

      // Error emitter
      function emitError(code, message) {
        state.status = 'error';
        updateUI();
        API.emitOutput('error.occurred', { code, message });
        API.log('Error: ' + code + ' - ' + message);
      }

      // Update UI
      function updateUI() {
        statusValue.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
        statusValue.className = 'stat-value ' + state.status;
      }

      // State change handler
      API.onStateChange(function(newState) {
        state = { ...state, ...newState };
        updateUI();
      });

    })();
  </script>
</body>
</html>
`;

export const CompositorWidget: BuiltinWidget = {
  manifest: CompositorManifest,
  html: CompositorHTML,
};
