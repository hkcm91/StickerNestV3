/**
 * Template Loader Widget
 *
 * Backend automation widget that loads and serves reactive templates
 * to the frontend UI widget. Supports dynamic template discovery
 * and reactive zone computation.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import type { ReactiveTemplate, ComputedZone, GeneratedMask } from './ReactiveTemplateEngine';
import type { UserFormData } from './types';

// Import reactive template engine functions (will be available at runtime)
// These are re-exported from the module

export const TemplateLoaderManifest: WidgetManifest = {
  id: 'stickernest.template-loader',
  name: 'Template Loader',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'Loads and serves reactive templates to UI widgets. Computes dynamic zone sizes based on user input.',
  author: 'StickerNest',
  tags: ['automation', 'template', 'loader', 'reactive', 'pipeline'],
  inputs: {
    categorySelect: {
      type: 'string',
      description: 'Template category to load (business-card, tarot, etc.)',
      required: false,
    },
    templateSelect: {
      type: 'string',
      description: 'Specific template ID to select',
      required: false,
    },
    userData: {
      type: 'object',
      description: 'User form data for reactive zone computation',
      required: false,
    },
    refreshTemplates: {
      type: 'trigger',
      description: 'Refresh the template list',
    },
  },
  outputs: {
    templatesAvailable: {
      type: 'array',
      description: 'List of available templates with metadata',
    },
    templateSelected: {
      type: 'object',
      description: 'Full template data with computed reactive zones',
    },
    maskGenerated: {
      type: 'object',
      description: 'Generated mask with reactive zones',
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
      'category.select',
      'template.select',
      'user.data',
      'trigger.refresh',
    ],
    outputs: [
      'templates.available',
      'template.selected',
      'mask.generated',
      'zones.computed',
      'error.occurred',
    ],
  },
  size: {
    width: 180,
    height: 100,
    minWidth: 150,
    minHeight: 80,
  },
};

export const TemplateLoaderHTML = `
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
      padding: 10px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .icon {
      width: 20px;
      height: 20px;
      background: var(--sn-accent-secondary, #06b6d4);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    .title {
      font-size: 11px;
      font-weight: 600;
      flex: 1;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sn-text-secondary, #64748b);
    }
    .status-dot.active {
      background: var(--sn-success, #22c55e);
      animation: pulse 2s infinite;
    }
    .stats {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 9px;
    }
    .stat-row {
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
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">📋</div>
      <span class="title">Template Loader</span>
      <div class="status-dot" id="statusDot"></div>
    </div>
    <div class="stats">
      <div class="stat-row">
        <span class="stat-label">Templates:</span>
        <span class="stat-value" id="templateCount">0</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Selected:</span>
        <span class="stat-value" id="selectedTemplate">None</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Zones:</span>
        <span class="stat-value" id="zoneCount">-</span>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI || {
        emitOutput: console.log,
        onInput: () => {},
        onMount: (cb) => cb({ state: {} }),
        setState: () => {},
        log: console.log,
      };

      // Embedded reactive templates (loaded at build time or via API)
      const TEMPLATES = {
        'minimal-modern-reactive': ${JSON.stringify({
          id: 'minimal-modern-reactive',
          name: 'Minimal Modern',
          category: 'business-card',
          description: 'Clean, minimalist design with reactive text zones.',
          thumbnail: '',
          tags: ['minimal', 'modern', 'professional'],
        })},
        'bold-creative-reactive': ${JSON.stringify({
          id: 'bold-creative-reactive',
          name: 'Bold Creative',
          category: 'business-card',
          description: 'Eye-catching, bold design with reactive text zones.',
          thumbnail: '',
          tags: ['bold', 'creative', 'artistic'],
        })},
        'corporate-classic-reactive': ${JSON.stringify({
          id: 'corporate-classic-reactive',
          name: 'Corporate Classic',
          category: 'business-card',
          description: 'Elegant, professional corporate design.',
          thumbnail: '',
          tags: ['corporate', 'classic', 'elegant'],
        })},
        'photo-feature-reactive': ${JSON.stringify({
          id: 'photo-feature-reactive',
          name: 'Photo Feature',
          category: 'business-card',
          description: 'Portrait-centric design for personal branding.',
          thumbnail: '',
          tags: ['photo', 'portrait', 'personal-branding'],
        })},
      };

      // Full template data cache
      let fullTemplates = {};
      let selectedTemplateId = null;
      let currentUserData = {};

      // DOM refs
      const statusDot = document.getElementById('statusDot');
      const templateCount = document.getElementById('templateCount');
      const selectedTemplate = document.getElementById('selectedTemplate');
      const zoneCount = document.getElementById('zoneCount');

      // Initialize
      API.onMount(function(context) {
        loadTemplates();
        updateUI();
        API.log('TemplateLoader mounted');
      });

      // Load templates from embedded data or API
      async function loadTemplates() {
        try {
          // Emit available templates
          const templateList = Object.values(TEMPLATES).map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            description: t.description,
            thumbnail: t.thumbnail,
            tags: t.tags,
          }));

          API.emitOutput('templates.available', templateList);
          templateCount.textContent = templateList.length;
          statusDot.classList.add('active');

          API.log('Templates loaded: ' + templateList.length);
        } catch (err) {
          API.emitOutput('error.occurred', {
            code: 'LOAD_ERROR',
            message: err.message || 'Failed to load templates'
          });
        }
      }

      // Load full template data
      async function loadFullTemplate(templateId) {
        if (fullTemplates[templateId]) {
          return fullTemplates[templateId];
        }

        try {
          // In production, this would fetch from the server
          // For now, we'll emit a request for the frontend to handle
          const response = await fetch('/api/templates/' + templateId);
          if (response.ok) {
            fullTemplates[templateId] = await response.json();
            return fullTemplates[templateId];
          }
        } catch (err) {
          API.log('Fetch failed, using embedded template data');
        }

        // Fallback: return basic template structure
        return TEMPLATES[templateId] || null;
      }

      // Compute reactive zones based on user data
      function computeReactiveZones(template, userData) {
        if (!template || !template.zones) return [];

        return template.zones.map(zone => {
          const computed = { ...zone };

          // Check if zone is reactive
          if (!zone.reactiveRules?.reactive || zone.type !== 'text') {
            computed.computedBounds = { ...zone.bounds };
            return computed;
          }

          // Get text content
          const fieldName = zone.textConfig?.fieldMapping;
          const text = userData[fieldName] || '';

          // Estimate required width based on text length
          const fontSize = zone.textConfig?.fontSize || 16;
          const charWidth = fontSize * 0.55;
          const textWidth = text.length * charWidth;

          // Convert to percentage
          const templateWidth = template.dimensions?.width || 1050;
          const requiredWidthPct = (textWidth / templateWidth) * 100;

          // Apply bounds with min/max constraints
          const rules = zone.reactiveRules;
          const minWidth = rules.minWidth || zone.bounds.width * 0.5;
          const maxWidth = rules.maxWidth || zone.bounds.width * 1.5;

          const newWidth = Math.min(maxWidth, Math.max(minWidth, requiredWidthPct + 4));

          computed.computedBounds = {
            ...zone.bounds,
            width: newWidth,
          };

          computed.textContent = text;

          return computed;
        });
      }

      // Generate mask from computed zones
      function generateMask(template, computedZones) {
        if (typeof document === 'undefined') return null;

        const width = template.dimensions?.width || 1050;
        const height = template.dimensions?.height || 600;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // White background (AI fills)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Black zones (content areas)
        ctx.fillStyle = '#000000';

        for (const zone of computedZones) {
          if (zone.maskValue !== 0) continue;

          const bounds = zone.computedBounds || zone.bounds;
          const x = bounds.unit === 'percent' ? (bounds.x / 100) * width : bounds.x;
          const y = bounds.unit === 'percent' ? (bounds.y / 100) * height : bounds.y;
          const w = bounds.unit === 'percent' ? (bounds.width / 100) * width : bounds.width;
          const h = bounds.unit === 'percent' ? (bounds.height / 100) * height : bounds.height;

          const padding = zone.maskPadding || 4;
          ctx.fillRect(x - padding, y - padding, w + padding * 2, h + padding * 2);
        }

        return {
          dataUrl: canvas.toDataURL('image/png'),
          width: width,
          height: height,
          zones: computedZones,
        };
      }

      // Input handlers
      API.onInput('category.select', function(category) {
        API.log('Category filter: ' + category);
        const filtered = Object.values(TEMPLATES)
          .filter(t => !category || t.category === category);
        API.emitOutput('templates.available', filtered);
        templateCount.textContent = filtered.length;
      });

      API.onInput('template.select', async function(templateId) {
        API.log('Template selected: ' + templateId);
        selectedTemplateId = templateId;
        selectedTemplate.textContent = TEMPLATES[templateId]?.name || templateId;

        // Load full template
        const template = await loadFullTemplate(templateId);
        if (!template) {
          API.emitOutput('error.occurred', {
            code: 'NOT_FOUND',
            message: 'Template not found: ' + templateId
          });
          return;
        }

        // Compute reactive zones
        const computedZones = computeReactiveZones(template, currentUserData);
        zoneCount.textContent = computedZones.length;

        // Generate mask
        const mask = generateMask(template, computedZones);

        // Emit outputs
        API.emitOutput('template.selected', {
          ...template,
          computedZones: computedZones,
        });

        API.emitOutput('zones.computed', computedZones);

        if (mask) {
          API.emitOutput('mask.generated', mask);
        }

        API.setState({ selectedTemplateId: templateId });
      });

      API.onInput('user.data', function(userData) {
        API.log('User data updated');
        currentUserData = userData || {};
        API.setState({ userData: currentUserData });

        // Recompute zones if template is selected
        if (selectedTemplateId) {
          loadFullTemplate(selectedTemplateId).then(template => {
            if (!template) return;

            const computedZones = computeReactiveZones(template, currentUserData);
            zoneCount.textContent = computedZones.length;

            const mask = generateMask(template, computedZones);

            API.emitOutput('zones.computed', computedZones);
            if (mask) {
              API.emitOutput('mask.generated', mask);
            }
          });
        }
      });

      API.onInput('trigger.refresh', function() {
        API.log('Refreshing templates');
        loadTemplates();
      });

      function updateUI() {
        templateCount.textContent = Object.keys(TEMPLATES).length;
      }

    })();
  </script>
</body>
</html>
`;

export const TemplateLoaderWidget: BuiltinWidget = {
  manifest: TemplateLoaderManifest,
  html: TemplateLoaderHTML,
};
