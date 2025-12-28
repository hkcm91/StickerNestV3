/**
 * Widget Generator 2.0 - Code Template Engine (Module B)
 *
 * Takes SpecJSON and produces deterministic, standard-compliant widget packages.
 * This is the ONLY place where widget code is generated.
 * Templates are static and deterministic - the only variable is SpecJSON.
 *
 * VERSION: 2.0.0
 */

import type {
  SpecJSON,
  GeneratedWidgetPackage,
  GeneratedFile,
  StateSpec,
  ActionSpec,
  EventSpec,
  APISpec,
  VisualSpec,
  SizeSpec,
  PermissionSpec
} from '../types/specjson';
import type { WidgetManifest, WidgetInputSchema, WidgetOutputSchema } from '../types/manifest';
import { validateSpecJSON } from '../utils/specJsonValidator';

// ============================================================================
// TEMPLATE ENGINE CONFIGURATION
// ============================================================================

export const TEMPLATE_ENGINE_VERSION = '2.0.0';
export const WIDGET_PROTOCOL_VERSION = '3.0';

interface TemplateOptions {
  minify?: boolean;
  includeTests?: boolean;
  includeComments?: boolean;
  targetFormat?: 'html' | 'react';
}

const DEFAULT_OPTIONS: TemplateOptions = {
  minify: false,
  includeTests: true,
  includeComments: true,
  targetFormat: 'html'
};

// ============================================================================
// MAIN TEMPLATE ENGINE
// ============================================================================

/**
 * Generate a complete widget package from SpecJSON
 */
export function generateWidgetPackage(
  spec: SpecJSON,
  options: TemplateOptions = {}
): GeneratedWidgetPackage {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate spec first
  const validation = validateSpecJSON(spec);
  if (!validation.valid) {
    throw new Error(`Invalid SpecJSON: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const files: GeneratedFile[] = [];

  // Generate manifest.json
  files.push({
    path: 'manifest.json',
    content: generateManifest(spec),
    type: 'manifest'
  });

  // Generate index.html (main entry)
  files.push({
    path: 'index.html',
    content: generateIndexHtml(spec, opts),
    type: 'index'
  });

  // Generate state.ts (state management)
  files.push({
    path: 'state.ts',
    content: generateStateModule(spec.state, spec.id),
    type: 'state'
  });

  // Generate actions.ts (action handlers)
  files.push({
    path: 'actions.ts',
    content: generateActionsModule(spec.actions, spec.state, spec.id),
    type: 'actions'
  });

  // Generate styles.css
  files.push({
    path: 'styles.css',
    content: generateStyles(spec),
    type: 'styles'
  });

  // Generate test file if enabled
  if (opts.includeTests) {
    files.push({
      path: `${spec.id}.test.ts`,
      content: generateTestFile(spec),
      type: 'test'
    });
  }

  return {
    id: spec.id,
    spec,
    files,
    generatedAt: Date.now(),
    templateVersion: TEMPLATE_ENGINE_VERSION
  };
}

// ============================================================================
// MANIFEST GENERATOR
// ============================================================================

function generateManifest(spec: SpecJSON): string {
  const manifest: WidgetManifest = {
    id: spec.id,
    name: spec.displayName,
    version: spec.version,
    kind: determineWidgetKind(spec.visual),
    entry: 'index.html',
    description: spec.description,
    author: spec.author,
    tags: spec.tags,
    inputs: generateInputs(spec.api),
    outputs: generateOutputs(spec.api),
    capabilities: {
      draggable: true,
      resizable: true,
      rotatable: false
    },
    io: {
      inputs: spec.api.inputs.map(p => `custom.${p.id}`),
      outputs: spec.api.outputs.map(p => `custom.${p.id}`)
    },
    assets: spec.visual.defaultAsset ? [spec.visual.defaultAsset] : [],
    sandbox: true,
    skin: spec.visual.skins.length > 0 ? {
      slots: [],
      themeable: true,
      usesVariables: spec.visual.cssVariables?.map(v => v.name)
    } : undefined,
    events: {
      emits: spec.events.broadcasts?.map(b => b.event) || [],
      listens: spec.events.subscriptions?.map(s => s.event) || []
    },
    size: spec.size ? {
      width: spec.size.width,
      height: spec.size.height,
      minWidth: spec.size.minWidth,
      minHeight: spec.size.minHeight,
      maxWidth: spec.size.maxWidth,
      maxHeight: spec.size.maxHeight,
      aspectRatio: spec.size.aspectRatio,
      lockAspectRatio: spec.size.lockAspectRatio,
      scaleMode: spec.size.scaleMode
    } : undefined
  };

  return JSON.stringify(manifest, null, 2);
}

function determineWidgetKind(visual: VisualSpec): '2d' | '3d' | 'audio' | 'video' | 'hybrid' {
  switch (visual.type) {
    case 'lottie':
    case 'canvas':
      return 'hybrid';
    default:
      return '2d';
  }
}

function generateInputs(api: APISpec): Record<string, WidgetInputSchema> {
  const inputs: Record<string, WidgetInputSchema> = {};
  for (const port of api.inputs) {
    inputs[port.id] = {
      type: port.type,
      description: port.description,
      required: port.required,
      default: port.default
    };
  }
  return inputs;
}

function generateOutputs(api: APISpec): Record<string, WidgetOutputSchema> {
  const outputs: Record<string, WidgetOutputSchema> = {};
  for (const port of api.outputs) {
    outputs[port.id] = {
      type: port.type,
      description: port.description
    };
  }
  return outputs;
}

// ============================================================================
// INDEX.HTML GENERATOR
// ============================================================================

function generateIndexHtml(spec: SpecJSON, options: TemplateOptions): string {
  const stateInit = generateStateInitialization(spec.state);
  const actionHandlers = generateActionHandlers(spec.actions, spec.state);
  const eventBindings = generateEventBindings(spec.events, spec.actions);
  const apiMethods = generateAPIMethods(spec.api);
  const pipelineHandlers = generatePipelineHandlers(spec.api);
  const cssVars = generateCSSVariables(spec.visual);
  const visualContent = generateVisualContent(spec);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="widget-id" content="${spec.id}">
  <meta name="widget-version" content="${spec.version}">
  <meta name="generator" content="StickerNest Widget Generator ${TEMPLATE_ENGINE_VERSION}">
  <title>${spec.displayName}</title>
  <style>
    ${generateBaseStyles()}
    ${cssVars}
    ${generateWidgetStyles(spec)}
  </style>
</head>
<body>
  <div id="widget-root" class="widget-container">
    ${visualContent}
  </div>

  <script>
    (function() {
      'use strict';

      // ========================================
      // WIDGET PROTOCOL v${WIDGET_PROTOCOL_VERSION}
      // ========================================

      const WIDGET_ID = '${spec.id}';
      const WIDGET_VERSION = '${spec.version}';

      // ========================================
      // STATE MANAGEMENT
      // ========================================

      ${stateInit}

      function getState() {
        return { ...state };
      }

      function setState(patch) {
        const prevState = { ...state };
        Object.assign(state, patch);
        onStateChange(state, prevState);
        emitStateChange(patch);
      }

      function onStateChange(newState, prevState) {
        render();
        ${spec.events.triggers?.onStateChange?.length ? `
        // Trigger onStateChange actions
        ${spec.events.triggers.onStateChange.map(a => `actions.${a}();`).join('\n        ')}
        ` : ''}
      }

      // ========================================
      // ACTION HANDLERS
      // ========================================

      const actions = {
        ${actionHandlers}
      };

      // ========================================
      // API METHODS (Exposed)
      // ========================================

      const api = {
        ${apiMethods}
      };

      // ========================================
      // PIPELINE I/O
      // ========================================

      ${pipelineHandlers}

      // ========================================
      // EVENT SYSTEM
      // ========================================

      function emitEvent(type, payload) {
        window.parent.postMessage({
          type: 'widget:emit',
          payload: { type, payload }
        }, '*');
      }

      function emitOutput(portName, value) {
        window.parent.postMessage({
          type: 'widget:output',
          payload: { portName, value }
        }, '*');
      }

      function emitStateChange(patch) {
        window.parent.postMessage({
          type: 'STATE_PATCH',
          payload: patch
        }, '*');
      }

      function broadcast(event, payload) {
        window.parent.postMessage({
          type: 'widget:broadcast',
          payload: { event, payload }
        }, '*');
      }

      // ========================================
      // MESSAGE HANDLER
      // ========================================

      window.addEventListener('message', function(event) {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'INIT':
            handleInit(payload);
            break;
          case 'widget:event':
            handleWidgetEvent(payload);
            break;
          case 'pipeline:input':
            handlePipelineInput(payload);
            break;
          case 'STATE_UPDATE':
            setState(payload);
            break;
          case 'SETTINGS_UPDATE':
            handleSettingsUpdate(payload);
            break;
          case 'RESIZE':
            handleResize(payload);
            break;
          case 'DESTROY':
            handleDestroy();
            break;
        }
      });

      function handleInit(data) {
        if (data && data.state) {
          Object.assign(state, data.state);
        }
        ${spec.events.triggers?.onMount?.length ? `
        // Execute onMount actions
        ${spec.events.triggers.onMount.map(a => `actions.${a}();`).join('\n        ')}
        ` : ''}
        render();
      }

      function handleWidgetEvent(payload) {
        const { type, data } = payload || {};
        ${generateEventSwitchCases(spec.events)}
      }

      function handleSettingsUpdate(settings) {
        // Handle settings changes
      }

      function handleResize(data) {
        ${spec.events.triggers?.onResize?.length ? `
        // Execute onResize actions
        ${spec.events.triggers.onResize.map(a => `actions.${a}();`).join('\n        ')}
        ` : ''}
        render();
      }

      function handleDestroy() {
        ${spec.events.triggers?.onUnmount?.length ? `
        // Execute onUnmount actions
        ${spec.events.triggers.onUnmount.map(a => `actions.${a}();`).join('\n        ')}
        ` : ''}
      }

      // ========================================
      // DOM EVENT BINDINGS
      // ========================================

      ${eventBindings}

      // ========================================
      // RENDER FUNCTION
      // ========================================

      function render() {
        ${generateRenderLogic(spec)}
      }

      // ========================================
      // INITIALIZATION
      // ========================================

      document.addEventListener('DOMContentLoaded', function() {
        setupEventListeners();
        render();
        // Signal ready
        window.parent.postMessage({ type: 'READY' }, '*');
      });

    })();
  </script>
</body>
</html>`;

  return options.minify ? minifyHtml(html) : html;
}

// ============================================================================
// STATE MODULE GENERATOR
// ============================================================================

function generateStateModule(stateSpec: StateSpec, widgetId: string): string {
  const fields = Object.entries(stateSpec);

  return `/**
 * State module for ${widgetId}
 * Generated by Widget Generator ${TEMPLATE_ENGINE_VERSION}
 */

export interface ${pascalCase(widgetId)}State {
${fields.map(([key, field]) => `  ${key}: ${tsType(field.type)};`).join('\n')}
}

export const initialState: ${pascalCase(widgetId)}State = {
${fields.map(([key, field]) => `  ${key}: ${JSON.stringify(field.default ?? getDefaultValue(field.type))},`).join('\n')}
};

export function createState(): ${pascalCase(widgetId)}State {
  return { ...initialState };
}

export function validateState(state: Partial<${pascalCase(widgetId)}State>): boolean {
${fields.map(([key, field]) => {
  if (field.validate) {
    const checks: string[] = [];
    if (field.validate.required) {
      checks.push(`state.${key} !== undefined && state.${key} !== null`);
    }
    if (field.validate.min !== undefined) {
      checks.push(`(state.${key} === undefined || state.${key} >= ${field.validate.min})`);
    }
    if (field.validate.max !== undefined) {
      checks.push(`(state.${key} === undefined || state.${key} <= ${field.validate.max})`);
    }
    if (checks.length > 0) {
      return `  if (!(${checks.join(' && ')})) return false;`;
    }
  }
  return '';
}).filter(Boolean).join('\n')}
  return true;
}
`;
}

function generateStateInitialization(stateSpec: StateSpec): string {
  const fields = Object.entries(stateSpec);
  return `const state = {
${fields.map(([key, field]) => `        ${key}: ${JSON.stringify(field.default ?? getDefaultValue(field.type))},`).join('\n')}
      };`;
}

// ============================================================================
// ACTIONS MODULE GENERATOR
// ============================================================================

function generateActionsModule(actions: ActionSpec, state: StateSpec, widgetId: string): string {
  const actionEntries = Object.entries(actions);

  return `/**
 * Actions module for ${widgetId}
 * Generated by Widget Generator ${TEMPLATE_ENGINE_VERSION}
 */

import type { ${pascalCase(widgetId)}State } from './state';

export type ActionContext = {
  getState: () => ${pascalCase(widgetId)}State;
  setState: (patch: Partial<${pascalCase(widgetId)}State>) => void;
  emit: (event: string, payload?: unknown) => void;
  broadcast: (event: string, payload?: unknown) => void;
  emitOutput: (port: string, value: unknown) => void;
};

${actionEntries.map(([id, action]) => `
/**
 * ${action.description || id}
 */
export function ${camelCase(id)}(ctx: ActionContext) {
  ${generateActionBody(id, action, state)}
}
`).join('\n')}

export const actionMap = {
${actionEntries.map(([id]) => `  ${camelCase(id)},`).join('\n')}
};
`;
}

function generateActionHandlers(actions: ActionSpec, state: StateSpec): string {
  const entries = Object.entries(actions);
  return entries.map(([id, action]) => {
    return `${camelCase(id)}: function() {
          ${generateActionBody(id, action, state)}
        }`;
  }).join(',\n        ');
}

function generateActionBody(id: string, action: ActionSpec[string], state: StateSpec): string {
  const params = action.params || {};

  switch (action.type) {
    case 'setState':
      return `setState({ ${params.stateKey}: ${JSON.stringify(params.value)} });`;

    case 'toggleState':
      return `setState({ ${params.toggleKey}: !state.${params.toggleKey} });`;

    case 'incrementState':
      return `setState({ ${params.stateKey}: state.${params.stateKey} + ${params.amount || 1} });`;

    case 'decrementState':
      return `setState({ ${params.stateKey}: state.${params.stateKey} - ${params.amount || 1} });`;

    case 'resetState':
      const field = params.stateKey ? state[params.stateKey] : null;
      const defaultVal = field?.default ?? getDefaultValue(field?.type || 'any');
      return `setState({ ${params.stateKey}: ${JSON.stringify(defaultVal)} });`;

    case 'emit':
      return `emitEvent('${params.eventType}', ${JSON.stringify(params.eventPayload || {})});`;

    case 'broadcast':
      return `broadcast('${params.broadcastEvent}', ${JSON.stringify(params.eventPayload || {})});`;

    case 'animate':
      return `document.getElementById('widget-root').animate(
          ${params.animation ? `[{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }]` : '[]'},
          { duration: ${params.duration || 300}, easing: 'ease-in-out' }
        );`;

    case 'sequence':
      return (params.actions || []).map(a => `actions.${camelCase(a)}();`).join('\n          ');

    case 'parallel':
      return `Promise.all([${(params.actions || []).map(a => `actions.${camelCase(a)}()`).join(', ')}]);`;

    case 'custom':
      return `// Custom action: ${params.customHandler || id}
          console.log('Custom action executed: ${id}');`;

    default:
      return `// Action type '${action.type}' - implement custom logic here`;
  }
}

// ============================================================================
// EVENT BINDINGS GENERATOR
// ============================================================================

function generateEventBindings(events: EventSpec, actions: ActionSpec): string {
  const triggers = events.triggers || {};
  const bindings: string[] = [];

  bindings.push(`function setupEventListeners() {
        const root = document.getElementById('widget-root');`);

  if (triggers.onClick?.length) {
    bindings.push(`
        root.addEventListener('click', function(e) {
          ${triggers.onClick.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onDoubleClick?.length) {
    bindings.push(`
        root.addEventListener('dblclick', function(e) {
          ${triggers.onDoubleClick.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onHover?.length) {
    bindings.push(`
        root.addEventListener('mouseenter', function(e) {
          ${triggers.onHover.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onHoverEnd?.length) {
    bindings.push(`
        root.addEventListener('mouseleave', function(e) {
          ${triggers.onHoverEnd.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onKeyDown?.length) {
    bindings.push(`
        document.addEventListener('keydown', function(e) {
          ${triggers.onKeyDown.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onKeyUp?.length) {
    bindings.push(`
        document.addEventListener('keyup', function(e) {
          ${triggers.onKeyUp.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onContextMenu?.length) {
    bindings.push(`
        root.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          ${triggers.onContextMenu.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  if (triggers.onWheel?.length) {
    bindings.push(`
        root.addEventListener('wheel', function(e) {
          ${triggers.onWheel.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        });`);
  }

  // Interval triggers
  if (triggers.onInterval?.length) {
    bindings.push(`
        setInterval(function() {
          ${triggers.onInterval.map(a => `actions.${camelCase(a)}();`).join('\n          ')}
        }, 1000);`);
  }

  bindings.push(`
      }`);

  return bindings.join('');
}

function generateEventSwitchCases(events: EventSpec): string {
  const subscriptions = events.subscriptions || [];
  if (subscriptions.length === 0) {
    return '// No event subscriptions';
  }

  return `switch (type) {
${subscriptions.map(s => `          case '${s.event}':
            actions.${camelCase(s.handler)}();
            break;`).join('\n')}
        }`;
}

// ============================================================================
// PIPELINE HANDLERS GENERATOR
// ============================================================================

function generatePipelineHandlers(api: APISpec): string {
  const inputs = api.inputs;
  if (inputs.length === 0) {
    return `function handlePipelineInput(data) {
        // No pipeline inputs defined
      }`;
  }

  return `function handlePipelineInput(data) {
        const { portName, value } = data || {};
        switch (portName) {
${inputs.map(port => `          case '${port.id}':
            // Handle ${port.name} input
            ${port.type === 'trigger' ? `actions.${camelCase(port.id)}Handler && actions.${camelCase(port.id)}Handler();` : `setState({ ${camelCase(port.id)}Value: value });`}
            break;`).join('\n')}
        }
      }`;
}

// ============================================================================
// API METHODS GENERATOR
// ============================================================================

function generateAPIMethods(api: APISpec): string {
  const exposed = api.exposes;
  if (exposed.length === 0) {
    return '// No API methods exposed';
  }

  return exposed.map(method => {
    return `${camelCase(method.id)}: function(${method.params ? Object.keys(method.params).join(', ') : ''}) {
          // ${method.description || method.name}
          return actions.${camelCase(method.id)} ? actions.${camelCase(method.id)}() : null;
        }`;
  }).join(',\n        ');
}

// ============================================================================
// STYLES GENERATOR
// ============================================================================

function generateBaseStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .widget-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
  `;
}

function generateCSSVariables(visual: VisualSpec): string {
  const vars = visual.cssVariables || [];
  if (vars.length === 0) return '';

  return `:root {
${vars.map(v => `      ${v.name}: ${v.defaultValue};`).join('\n')}
    }`;
}

function generateWidgetStyles(spec: SpecJSON): string {
  const visual = spec.visual;

  let styles = `
    .widget-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      transition: all 0.2s ease;
    }
    .widget-content:hover {
      transform: scale(1.02);
    }
  `;

  // Add background styles
  if (visual.background) {
    switch (visual.background.type) {
      case 'color':
        styles += `.widget-container { background-color: ${visual.background.value || '#ffffff'}; }\n`;
        break;
      case 'gradient':
        styles += `.widget-container { background: ${visual.background.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; }\n`;
        break;
      case 'transparent':
        styles += `.widget-container { background: transparent; }\n`;
        break;
    }
  }

  return styles;
}

function generateStyles(spec: SpecJSON): string {
  return `/**
 * Styles for ${spec.id}
 * Generated by Widget Generator ${TEMPLATE_ENGINE_VERSION}
 */

${generateCSSVariables(spec.visual)}

.widget-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.widget-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

/* State-based styles */
.widget-content[data-state="active"] {
  transform: scale(1.05);
}

.widget-content[data-state="disabled"] {
  opacity: 0.5;
  pointer-events: none;
}

/* Responsive styles */
@media (max-width: 200px) {
  .widget-content {
    padding: 8px;
    font-size: 14px;
  }
}
`;
}

// ============================================================================
// VISUAL CONTENT GENERATOR
// ============================================================================

function generateVisualContent(spec: SpecJSON): string {
  const visual = spec.visual;

  switch (visual.type) {
    case 'html':
      return `<div class="widget-content" id="content">
      <h3>${spec.displayName}</h3>
      <p class="description">${spec.description}</p>
      ${Object.keys(spec.state).length > 0 ? generateStateDisplay(spec.state) : ''}
    </div>`;

    case 'svg':
      return `<div class="widget-content" id="content">
      <svg id="widget-svg" width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="var(--primary-color, #667eea)" />
      </svg>
    </div>`;

    case 'canvas':
      return `<div class="widget-content" id="content">
      <canvas id="widget-canvas" width="200" height="200"></canvas>
    </div>`;

    case 'lottie':
      return `<div class="widget-content" id="content">
      <div id="lottie-container" style="width: 100%; height: 100%;"></div>
    </div>`;

    case 'png':
    case 'css':
    default:
      return `<div class="widget-content" id="content">
      ${visual.defaultAsset ? `<img src="${visual.defaultAsset}" alt="${spec.displayName}" class="widget-image" />` : ''}
      <span class="widget-label">${spec.displayName}</span>
    </div>`;
  }
}

function generateStateDisplay(state: StateSpec): string {
  const displayableState = Object.entries(state).slice(0, 3); // Show max 3 state values
  if (displayableState.length === 0) return '';

  return `<div class="state-display">
${displayableState.map(([key, field]) => `        <span class="state-item" data-key="${key}">
          <span class="state-label">${key}:</span>
          <span class="state-value" id="state-${key}">${JSON.stringify(field.default ?? '-')}</span>
        </span>`).join('\n')}
      </div>`;
}

function generateRenderLogic(spec: SpecJSON): string {
  const stateKeys = Object.keys(spec.state);
  if (stateKeys.length === 0) {
    return '// No state to render';
  }

  return stateKeys.map(key => {
    return `const ${key}El = document.getElementById('state-${key}');
        if (${key}El) ${key}El.textContent = state.${key};`;
  }).join('\n        ');
}

// ============================================================================
// TEST FILE GENERATOR
// ============================================================================

function generateTestFile(spec: SpecJSON): string {
  return `/**
 * Test file for ${spec.id}
 * Generated by Widget Generator ${TEMPLATE_ENGINE_VERSION}
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createState, validateState, initialState } from './state';
import { actionMap } from './actions';

describe('${spec.displayName}', () => {
  describe('State', () => {
    it('should create initial state', () => {
      const state = createState();
      expect(state).toEqual(initialState);
    });

${Object.entries(spec.state).map(([key, field]) => `
    it('should have correct default for ${key}', () => {
      const state = createState();
      expect(state.${key}).toEqual(${JSON.stringify(field.default ?? getDefaultValue(field.type))});
    });
`).join('')}
  });

  describe('Actions', () => {
${Object.entries(spec.actions).map(([id, action]) => `
    it('should define ${id} action', () => {
      expect(actionMap.${camelCase(id)}).toBeDefined();
      expect(typeof actionMap.${camelCase(id)}).toBe('function');
    });
`).join('')}
  });

  describe('Validation', () => {
    it('should validate correct state', () => {
      expect(validateState(initialState)).toBe(true);
    });

    it('should validate partial state', () => {
      expect(validateState({})).toBe(true);
    });
  });
});
`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function pascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function camelCase(str: string): string {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function tsType(type: string): string {
  switch (type) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'object': return 'Record<string, unknown>';
    case 'array': return 'unknown[]';
    case 'any':
    default: return 'unknown';
  }
}

function getDefaultValue(type: string): unknown {
  switch (type) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'object': return {};
    case 'array': return [];
    default: return null;
  }
}

function minifyHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/<!--.*?-->/g, '')
    .trim();
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  generateWidgetPackage,
  generateManifest,
  generateStateModule,
  generateActionsModule,
  generateStyles,
  generateTestFile,
  TEMPLATE_ENGINE_VERSION,
  WIDGET_PROTOCOL_VERSION
};
