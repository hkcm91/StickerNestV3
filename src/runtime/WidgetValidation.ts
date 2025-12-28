/**
 * StickerNest v2 - Widget Validation
 * Shared validation rules for upload, generate, and presets
 *
 * Ensures all widgets follow the same protocol regardless of source
 */

import { WidgetManifest } from '../types/manifest';
import { getEventRegistry } from './EventRegistry';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface WidgetBundle {
  manifest: WidgetManifest;
  html: string;
}

/**
 * Validate widget manifest
 */
export function validateManifest(manifest: Partial<WidgetManifest>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required fields
  if (!manifest.id) {
    errors.push('Missing required field: id');
  } else if (!/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push('Widget ID must be lowercase alphanumeric with hyphens only');
  }

  if (!manifest.name) {
    errors.push('Missing required field: name');
  }

  if (!manifest.version) {
    warnings.push('Missing version, defaulting to 1.0.0');
  } else if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    warnings.push('Version should follow semver format (X.Y.Z)');
  }

  if (!manifest.entry) {
    errors.push('Missing required field: entry (usually index.html)');
  }

  // Size validation
  if (manifest.size) {
    if (manifest.size.defaultWidth && manifest.size.defaultWidth < 50) {
      warnings.push('defaultWidth is very small (<50px)');
    }
    if (manifest.size.defaultHeight && manifest.size.defaultHeight < 50) {
      warnings.push('defaultHeight is very small (<50px)');
    }
  } else {
    suggestions.push('Consider adding size configuration for better layout');
  }

  // IO validation
  const registry = getEventRegistry();
  const hasIo = manifest.io && (manifest.io.inputs?.length || manifest.io.outputs?.length);
  const hasLegacyIo = manifest.inputs || manifest.outputs;
  const hasEventsIo = manifest.events?.emits?.length || manifest.events?.listens?.length;

  if (!hasIo && !hasLegacyIo && !hasEventsIo) {
    warnings.push('Widget has no IO ports defined - it cannot communicate with other widgets');
  }

  // Validate events against registry
  if (manifest.io?.inputs) {
    for (const input of manifest.io.inputs) {
      const inputId = typeof input === 'string' ? input : input.id;
      if (inputId && !registry.has(inputId)) {
        warnings.push(`Input "${inputId}" is not in the event registry - may not be handled`);
      }
    }
  }

  if (manifest.io?.outputs) {
    for (const output of manifest.io.outputs) {
      const outputId = typeof output === 'string' ? output : output.id;
      if (outputId && !registry.has(outputId)) {
        suggestions.push(`Output "${outputId}" is a custom event - ensure something handles it`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate widget HTML for protocol compliance
 */
export function validateHtml(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for READY signal (required)
  const hasReadySignal = html.includes("postMessage({ type: 'READY' }") ||
                         html.includes('postMessage({ type: "READY" }') ||
                         html.includes("postMessage({type:'READY'}");

  if (!hasReadySignal) {
    errors.push('Missing READY signal - widget must send postMessage({ type: "READY" }, "*")');
  }

  // Check for proper emit function
  const hasEmitFunction = html.includes('widget:emit') || html.includes("type: 'widget:emit'");
  const hasOldEmit = html.includes('WidgetAPI.emitEvent') || html.includes('window.WidgetAPI');

  if (hasOldEmit && !hasEmitFunction) {
    errors.push('Using deprecated WidgetAPI - must use postMessage protocol v3.0');
  }

  // Check for event listener
  const hasEventListener = html.includes("addEventListener('message'") ||
                           html.includes('addEventListener("message"');

  if (!hasEventListener) {
    warnings.push('No message event listener - widget cannot receive events from others');
  }

  // Check for widget:event handling
  const handlesWidgetEvent = html.includes('widget:event');
  if (hasEventListener && !handlesWidgetEvent) {
    warnings.push('Listens for messages but does not handle widget:event type');
  }

  // Security checks
  if (html.includes('eval(')) {
    warnings.push('Contains eval() - potential security risk');
  }
  if (html.includes('innerHTML') && html.includes('${')) {
    warnings.push('Template literals with innerHTML - ensure proper escaping');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Full widget bundle validation
 */
export function validateWidget(bundle: WidgetBundle): ValidationResult {
  const manifestResult = validateManifest(bundle.manifest);
  const htmlResult = validateHtml(bundle.html);

  return {
    valid: manifestResult.valid && htmlResult.valid,
    errors: [...manifestResult.errors, ...htmlResult.errors],
    warnings: [...manifestResult.warnings, ...htmlResult.warnings],
    suggestions: [...manifestResult.suggestions, ...htmlResult.suggestions],
  };
}

/**
 * Generate a valid test widget that follows all rules
 */
export function generateTestWidget(options: {
  name: string;
  type: 'vector-control' | 'timer' | 'button' | 'display';
}): WidgetBundle {
  const id = `test-${options.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;

  let inputs: Array<{ id: string; name: string; type: string; description: string }> = [];
  let outputs: Array<{ id: string; name: string; type: string; description: string }> = [];
  let htmlContent = '';

  switch (options.type) {
    case 'vector-control':
      inputs = [
        { id: 'vector:selection-changed', name: 'Selection Changed', type: 'object', description: 'Receives when vector selection changes' }
      ];
      outputs = [
        { id: 'vector:set-fill', name: 'Set Fill', type: 'object', description: 'Sets fill color on selected entity' },
        { id: 'vector:set-shadow', name: 'Set Shadow', type: 'object', description: 'Sets shadow on selected entity' }
      ];
      htmlContent = generateVectorControlHtml(id);
      break;

    case 'timer':
      inputs = [
        { id: 'trigger', name: 'Trigger', type: 'event', description: 'Triggers the timer' }
      ];
      outputs = [
        { id: 'timer:tick', name: 'Tick', type: 'object', description: 'Emits on each tick' },
        { id: 'timer:complete', name: 'Complete', type: 'void', description: 'Emits when done' }
      ];
      htmlContent = generateTimerHtml(id);
      break;

    case 'button':
      inputs = [];
      outputs = [
        { id: 'clicked', name: 'Clicked', type: 'void', description: 'Emits when clicked' },
        { id: 'trigger', name: 'Trigger', type: 'void', description: 'Generic trigger output' }
      ];
      htmlContent = generateButtonHtml(id);
      break;

    case 'display':
      inputs = [
        { id: 'valueChanged', name: 'Value', type: 'any', description: 'Receives values to display' },
        { id: 'textChanged', name: 'Text', type: 'string', description: 'Receives text to display' }
      ];
      outputs = [];
      htmlContent = generateDisplayHtml(id);
      break;
  }

  const manifest: WidgetManifest = {
    id,
    name: options.name,
    version: '1.0.0',
    description: `Test widget: ${options.type}`,
    entry: 'index.html',
    category: 'test',
    size: {
      defaultWidth: 220,
      defaultHeight: 200,
      minWidth: 160,
      minHeight: 140,
    },
    io: { inputs, outputs },
  };

  return { manifest, html: htmlContent };
}

// Helper functions for generating test widget HTML

function generateVectorControlHtml(id: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --sn-bg-primary: #0f0f19;
      --sn-bg-secondary: #1a1a2e;
      --sn-text-primary: #e2e8f0;
      --sn-text-secondary: #94a3b8;
      --sn-accent-primary: #8b5cf6;
      --sn-border-primary: rgba(139, 92, 246, 0.2);
      --sn-radius-md: 6px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--sn-bg-primary);
      min-height: 100vh;
      padding: 12px;
      color: var(--sn-text-primary);
    }
    .panel {
      background: var(--sn-bg-secondary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-md);
      padding: 12px;
      margin-bottom: 8px;
    }
    .label {
      font-size: 11px;
      color: var(--sn-text-secondary);
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    input[type="color"] {
      width: 100%;
      height: 36px;
      border: none;
      border-radius: var(--sn-radius-md);
      cursor: pointer;
    }
    input[type="range"] {
      width: 100%;
      accent-color: var(--sn-accent-primary);
    }
    .status {
      font-size: 10px;
      color: var(--sn-text-secondary);
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="panel">
    <div class="label">Fill Color</div>
    <input type="color" id="fillColor" value="#3b82f6">
  </div>
  <div class="panel">
    <div class="label">Shadow Blur</div>
    <input type="range" id="shadowBlur" min="0" max="30" value="8">
  </div>
  <div class="status" id="status">Waiting for selection...</div>

  <script>
    // Protocol v3.0 emit function
    function emit(portId, data) {
      window.parent.postMessage({
        type: 'widget:emit',
        payload: { type: portId, payload: data }
      }, '*');
    }

    let selectedEntity = null;

    // Listen for events
    window.addEventListener('message', (event) => {
      if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};
        if (type === 'vector:selection-changed') {
          selectedEntity = payload;
          document.getElementById('status').textContent =
            payload?.id ? 'Selected: ' + payload.type : 'No selection';
          if (payload?.fill) {
            document.getElementById('fillColor').value = payload.fill;
          }
        }
      }
    });

    // Color change handler
    document.getElementById('fillColor').addEventListener('input', (e) => {
      emit('vector:set-fill', { fill: e.target.value });
    });

    // Shadow blur handler
    document.getElementById('shadowBlur').addEventListener('input', (e) => {
      emit('vector:set-shadow', { blur: parseInt(e.target.value), enabled: true });
    });

    // Signal ready - REQUIRED!
    window.parent.postMessage({ type: 'READY' }, '*');
    console.log('[Test Widget ${id}] Ready');
  </script>
</body>
</html>`;
}

function generateTimerHtml(id: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --sn-bg-primary: #0f0f19;
      --sn-bg-secondary: #1a1a2e;
      --sn-text-primary: #e2e8f0;
      --sn-accent-primary: #8b5cf6;
      --sn-border-primary: rgba(139, 92, 246, 0.2);
      --sn-radius-md: 6px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--sn-bg-primary);
      min-height: 100vh;
      padding: 12px;
      color: var(--sn-text-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .time {
      font-size: 48px;
      font-weight: bold;
      font-family: monospace;
      margin-bottom: 16px;
    }
    .btn {
      background: var(--sn-accent-primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: var(--sn-radius-md);
      cursor: pointer;
      font-size: 14px;
      margin: 4px;
    }
  </style>
</head>
<body>
  <div class="time" id="display">00:10</div>
  <div>
    <button class="btn" id="startBtn">Start</button>
    <button class="btn" id="resetBtn">Reset</button>
  </div>

  <script>
    function emit(portId, data) {
      window.parent.postMessage({
        type: 'widget:emit',
        payload: { type: portId, payload: data }
      }, '*');
    }

    let seconds = 10;
    let running = false;
    let interval = null;

    function updateDisplay() {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      document.getElementById('display').textContent =
        String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function tick() {
      if (seconds > 0) {
        seconds--;
        updateDisplay();
        emit('timer:tick', { remaining: seconds, progress: 1 - (seconds / 10) });
      } else {
        running = false;
        clearInterval(interval);
        emit('timer:complete', {});
      }
    }

    document.getElementById('startBtn').addEventListener('click', () => {
      if (!running && seconds > 0) {
        running = true;
        interval = setInterval(tick, 1000);
      }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      running = false;
      clearInterval(interval);
      seconds = 10;
      updateDisplay();
    });

    window.addEventListener('message', (event) => {
      if (event.data.type === 'widget:event') {
        const { type } = event.data.payload || {};
        if (type === 'trigger' && !running) {
          running = true;
          interval = setInterval(tick, 1000);
        }
      }
    });

    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;
}

function generateButtonHtml(id: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --sn-bg-primary: #0f0f19;
      --sn-accent-primary: #8b5cf6;
      --sn-radius-md: 6px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--sn-bg-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn {
      background: linear-gradient(135deg, #8b5cf6, #3b82f6);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: var(--sn-radius-md);
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5); }
    .btn:active { transform: translateY(0); }
  </style>
</head>
<body>
  <button class="btn" id="mainBtn">Click Me</button>

  <script>
    function emit(portId, data) {
      window.parent.postMessage({
        type: 'widget:emit',
        payload: { type: portId, payload: data }
      }, '*');
    }

    document.getElementById('mainBtn').addEventListener('click', () => {
      emit('clicked', {});
      emit('trigger', {});
    });

    window.addEventListener('message', () => {}); // Ready to receive
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;
}

function generateDisplayHtml(id: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --sn-bg-primary: #0f0f19;
      --sn-bg-secondary: #1a1a2e;
      --sn-text-primary: #e2e8f0;
      --sn-text-secondary: #94a3b8;
      --sn-border-primary: rgba(139, 92, 246, 0.2);
      --sn-radius-md: 6px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--sn-bg-primary);
      min-height: 100vh;
      padding: 12px;
      color: var(--sn-text-primary);
    }
    .display {
      background: var(--sn-bg-secondary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-md);
      padding: 16px;
      min-height: 80px;
      font-size: 14px;
      word-wrap: break-word;
    }
    .label {
      font-size: 10px;
      color: var(--sn-text-secondary);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="label">Received Value</div>
  <div class="display" id="content">Waiting for data...</div>

  <script>
    window.addEventListener('message', (event) => {
      if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};
        if (type === 'valueChanged' || type === 'textChanged') {
          const value = payload?.value ?? payload?.text ?? JSON.stringify(payload);
          document.getElementById('content').textContent = String(value);
        }
      }
    });

    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;
}
