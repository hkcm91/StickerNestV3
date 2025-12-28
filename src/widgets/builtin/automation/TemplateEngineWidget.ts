/**
 * Template Engine Widget
 *
 * Converts user selections + template into AI-ready prompt and composition mask.
 * This widget bridges the UI layer with the AI generation layer.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import type {
  TemplateMask,
  UserFormData,
  StyleConfig,
  UploadedImage,
  ContentZone,
  TemplateEngineOutput,
} from './types';

export const TemplateEngineManifest: WidgetManifest = {
  id: 'stickernest.template-engine',
  name: 'Template Engine',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'Converts user input and template selection into AI-ready prompts and composition masks. Core automation widget for design generation pipelines.',
  author: 'StickerNest',
  tags: ['automation', 'template', 'prompt', 'mask', 'pipeline', 'ai'],
  inputs: {
    templateSelect: {
      type: 'string',
      description: 'Template ID to use',
      required: true,
    },
    userData: {
      type: 'object',
      description: 'User form data (name, email, etc.)',
      required: true,
    },
    styleConfig: {
      type: 'object',
      description: 'Style configuration (colors, prompts)',
      required: false,
    },
    uploadedImages: {
      type: 'array',
      description: 'User-uploaded images (logo, photo)',
      required: false,
    },
    triggerProcess: {
      type: 'trigger',
      description: 'Trigger processing with current inputs',
    },
  },
  outputs: {
    promptReady: {
      type: 'object',
      description: 'AI prompt configuration ready for generation',
    },
    maskReady: {
      type: 'object',
      description: 'Composition mask with zone definitions',
    },
    layoutReady: {
      type: 'object',
      description: 'Full layout config for compositor',
    },
    error: {
      type: 'object',
      description: 'Error information if processing fails',
    },
  },
  capabilities: {
    draggable: true,
    resizable: false,
    rotatable: false,
  },
  io: {
    inputs: [
      'template.select',
      'user.data',
      'style.config',
      'image.upload',
      'trigger.process',
    ],
    outputs: [
      'prompt.ready',
      'mask.ready',
      'layout.ready',
      'error.occurred',
    ],
  },
  size: {
    width: 200,
    height: 120,
    minWidth: 150,
    minHeight: 100,
  },
};

export const TemplateEngineHTML = `
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
      background: linear-gradient(135deg, var(--sn-bg-secondary, #1a1a2e) 0%, var(--sn-bg-primary, #0f0f19) 100%);
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
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    .title {
      font-size: 12px;
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .status {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
    }
    .status-label {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .status-value {
      color: var(--sn-text-primary, #e2e8f0);
      font-weight: 500;
    }
    .status-value.ready {
      color: var(--sn-success, #22c55e);
    }
    .status-value.processing {
      color: var(--sn-warning, #f59e0b);
    }
    .status-value.error {
      color: var(--sn-error, #ef4444);
    }
    .indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--sn-text-secondary, #94a3b8);
    }
    .indicator.active {
      background: var(--sn-success, #22c55e);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">T</div>
      <span class="title">Template Engine</span>
      <div class="indicator" id="indicator"></div>
    </div>
    <div class="status">
      <div class="status-row">
        <span class="status-label">Template:</span>
        <span class="status-value" id="templateStatus">None</span>
      </div>
      <div class="status-row">
        <span class="status-label">Status:</span>
        <span class="status-value" id="processingStatus">Idle</span>
      </div>
      <div class="status-row">
        <span class="status-label">Output:</span>
        <span class="status-value" id="outputStatus">-</span>
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
        templateId: null,
        template: null,
        userData: {},
        styleConfig: {
          primaryColor: '#8b5cf6',
          secondaryColor: '#06b6d4',
          accentColor: '#f59e0b',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
        },
        uploadedImages: [],
        status: 'idle',
        lastOutput: null,
      };

      // DOM elements
      const templateStatus = document.getElementById('templateStatus');
      const processingStatus = document.getElementById('processingStatus');
      const outputStatus = document.getElementById('outputStatus');
      const indicator = document.getElementById('indicator');

      // Template registry (loaded dynamically)
      let templateRegistry = {};

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        API.log('TemplateEngine mounted');

        // Load templates
        loadTemplates();
      });

      // Load available templates
      async function loadTemplates() {
        // Templates are injected via the template registry
        // For now, we'll receive them via input
        API.log('Template registry ready');
      }

      // Input handlers
      API.onInput('template.select', function(templateId) {
        API.log('Template selected: ' + templateId);
        state.templateId = templateId;
        state.template = templateRegistry[templateId] || null;
        updateUI();
        API.setState({ templateId: state.templateId });

        // Auto-process if we have user data
        if (state.userData && Object.keys(state.userData).length > 0) {
          processTemplate();
        }
      });

      API.onInput('user.data', function(data) {
        API.log('User data received');
        state.userData = data || {};
        API.setState({ userData: state.userData });
        updateUI();
      });

      API.onInput('style.config', function(config) {
        API.log('Style config received');
        state.styleConfig = { ...state.styleConfig, ...config };
        API.setState({ styleConfig: state.styleConfig });
      });

      API.onInput('image.upload', function(images) {
        API.log('Images received: ' + (images ? images.length : 0));
        state.uploadedImages = images || [];
        API.setState({ uploadedImages: state.uploadedImages });
      });

      API.onInput('trigger.process', function() {
        processTemplate();
      });

      // Also accept templates via input for dynamic loading
      API.onInput('templates.register', function(templates) {
        templateRegistry = { ...templateRegistry, ...templates };
        API.log('Templates registered: ' + Object.keys(templates).join(', '));
      });

      // Main processing function
      function processTemplate() {
        if (!state.templateId) {
          emitError('NO_TEMPLATE', 'No template selected');
          return;
        }

        setStatus('processing');

        try {
          // Build the prompt from template
          const prompt = buildPrompt();
          const negativePrompt = buildNegativePrompt();

          // Generate the composition mask
          const maskData = generateMask();

          // Build layout config for compositor
          const layoutConfig = buildLayoutConfig();

          // Create output
          const output = {
            prompt: prompt,
            negativePrompt: negativePrompt,
            seed: Math.floor(Math.random() * 2147483647),
            maskData: maskData.dataUrl,
            maskZones: maskData.zones,
            layoutConfig: layoutConfig,
          };

          state.lastOutput = output;

          // Emit outputs
          API.emitOutput('prompt.ready', {
            prompt: output.prompt,
            negativePrompt: output.negativePrompt,
            seed: output.seed,
            width: layoutConfig.dimensions.width,
            height: layoutConfig.dimensions.height,
          });

          API.emitOutput('mask.ready', {
            maskData: output.maskData,
            zones: output.maskZones,
          });

          API.emitOutput('layout.ready', output.layoutConfig);

          setStatus('ready');
          outputStatus.textContent = 'Prompt ready';
          outputStatus.className = 'status-value ready';

          API.log('Template processing complete');

        } catch (err) {
          emitError('PROCESS_ERROR', err.message || 'Processing failed');
        }
      }

      // Build AI prompt from template and user data
      function buildPrompt() {
        // Default template if none loaded
        let promptTemplate = state.template?.promptTemplate ||
          'professional {{category}} design, clean modern style, {{stylePrompt}}, {{primaryColor}} and {{secondaryColor}} color scheme, high quality, detailed';

        // Variable substitutions
        const variables = {
          category: state.template?.category || 'business card',
          stylePrompt: state.styleConfig.stylePrompt || 'elegant minimalist',
          primaryColor: state.styleConfig.primaryColor || 'purple',
          secondaryColor: state.styleConfig.secondaryColor || 'cyan',
          mood: state.styleConfig.mood || 'professional',
          industry: state.styleConfig.industry || 'modern',
          ...state.userData,
        };

        // Replace {{variable}} placeholders
        let prompt = promptTemplate;
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp('{{' + key + '}}', 'gi');
          prompt = prompt.replace(regex, value || '');
        }

        // Add style hints
        const styleHints = state.template?.styleHints || [];
        if (styleHints.length > 0) {
          prompt += ', ' + styleHints.join(', ');
        }

        return prompt.trim();
      }

      // Build negative prompt
      function buildNegativePrompt() {
        let negativeBase = state.template?.negativePromptBase ||
          'text, words, letters, watermark, signature, blurry, low quality, distorted';

        // Add user's avoid prompt
        if (state.styleConfig.avoidPrompt) {
          negativeBase += ', ' + state.styleConfig.avoidPrompt;
        }

        return negativeBase;
      }

      // Generate composition mask
      function generateMask() {
        const dimensions = state.template?.dimensions || {
          width: 600,
          height: 350,
          dpi: 300,
        };

        const zones = state.template?.zones || [];

        // Create canvas for mask
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');

        // Fill with white (AI generates here)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw black zones (content areas - AI should avoid)
        ctx.fillStyle = '#000000';

        for (const zone of zones) {
          if (zone.maskValue === 0) {
            const bounds = zone.bounds;
            let x, y, w, h;

            if (bounds.unit === 'percent') {
              x = (bounds.x / 100) * canvas.width;
              y = (bounds.y / 100) * canvas.height;
              w = (bounds.width / 100) * canvas.width;
              h = (bounds.height / 100) * canvas.height;
            } else {
              x = bounds.x;
              y = bounds.y;
              w = bounds.width;
              h = bounds.height;
            }

            // Add padding if specified
            const padding = zone.maskPadding || 4;
            x -= padding;
            y -= padding;
            w += padding * 2;
            h += padding * 2;

            ctx.fillRect(x, y, w, h);
          }
        }

        return {
          dataUrl: canvas.toDataURL('image/png'),
          zones: zones,
        };
      }

      // Build layout config for compositor
      function buildLayoutConfig() {
        const template = state.template || {};

        return {
          templateId: state.templateId,
          dimensions: template.dimensions || {
            width: 600,
            height: 350,
            dpi: 300,
          },
          zones: template.zones || [],
          colors: {
            primary: state.styleConfig.primaryColor,
            secondary: state.styleConfig.secondaryColor,
            accent: state.styleConfig.accentColor,
            background: state.styleConfig.backgroundColor,
            text: state.styleConfig.textColor,
          },
          userData: state.userData,
          images: state.uploadedImages,
        };
      }

      // Error emitter
      function emitError(code, message) {
        setStatus('error');
        API.emitOutput('error.occurred', { code, message });
        API.log('Error: ' + code + ' - ' + message);
      }

      // Update status
      function setStatus(status) {
        state.status = status;
        updateUI();
      }

      // Update UI
      function updateUI() {
        // Template status
        templateStatus.textContent = state.templateId || 'None';

        // Processing status
        processingStatus.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
        processingStatus.className = 'status-value ' + state.status;

        // Indicator
        indicator.className = 'indicator' + (state.status === 'ready' ? ' active' : '');

        // Output status based on state
        if (state.status === 'idle') {
          outputStatus.textContent = '-';
          outputStatus.className = 'status-value';
        }
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

export const TemplateEngineWidget: BuiltinWidget = {
  manifest: TemplateEngineManifest,
  html: TemplateEngineHTML,
};
