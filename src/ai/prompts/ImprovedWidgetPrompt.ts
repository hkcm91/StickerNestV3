/**
 * StickerNest v2 - Improved Widget Generation Prompts
 * Comprehensive, structured prompts for higher quality widget generation
 */

import type { ComplexityLevel, StylePreset, FeatureRequirements } from '../types';

/**
 * Core widget protocol documentation
 */
const WIDGET_PROTOCOL = `
## Widget Communication Protocol

Widgets run in iframes and communicate via the injected WidgetAPI object.
The WidgetAPI is automatically injected by the host - you MUST wait for it.

### Required Initialization Pattern
\`\`\`javascript
function init() {
  // CRITICAL: Wait for WidgetAPI to be available
  if (!window.WidgetAPI) {
    setTimeout(init, 50);
    return;
  }

  // Widget is now ready - set up your logic here
  window.WidgetAPI.log('Widget initialized');

  // Register event handlers
  setupEventHandlers();

  // Initialize UI
  setupUI();
}

// Start initialization
init();
\`\`\`

### Emitting Events (Outputs)
\`\`\`javascript
// Emit an event that other widgets can receive
window.WidgetAPI.emitEvent({
  type: 'my-widget:value-changed',  // Use namespace:action format
  scope: 'canvas',                   // Always use 'canvas' scope
  payload: {                         // Your data here
    value: 42,
    timestamp: Date.now()
  }
});
\`\`\`

### Receiving Events (Inputs)
\`\`\`javascript
// Listen for specific event types
window.WidgetAPI.onEvent('color:changed', (event) => {
  const color = event.payload.color;
  updateDisplay(color);
});

// Listen for all events (useful for debugging)
window.WidgetAPI.onEvent('*', (event) => {
  console.log('Received:', event.type, event.payload);
});
\`\`\`

### Pipeline I/O (For Pipeline Widgets)
\`\`\`javascript
// Emit to a specific output port
window.WidgetAPI.emitOutput('result', { data: processedValue });

// Listen on a specific input port
window.WidgetAPI.onInput('data', (value, source) => {
  processData(value);
});
\`\`\`

### State Persistence
\`\`\`javascript
// Save state (persists across page reloads)
window.WidgetAPI.setState({ count: 10, lastUpdate: Date.now() });

// Get saved state
const state = window.WidgetAPI.getState();
if (state) {
  restoreFromState(state);
}
\`\`\`

### Logging (Shows in Debug Panel)
\`\`\`javascript
window.WidgetAPI.log('Info message');
window.WidgetAPI.warn('Warning message');
window.WidgetAPI.error('Error message');
\`\`\`
`;

/**
 * Visual design system and CSS guidelines
 */
const DESIGN_SYSTEM = `
## StickerNest Design System

### CSS Variables (Available in all widgets)
\`\`\`css
/* Backgrounds */
--sn-bg-primary: #0f0f19;     /* Darkest background */
--sn-bg-secondary: #1a1a2e;   /* Card/panel background */
--sn-bg-tertiary: #252542;    /* Elevated elements */

/* Text */
--sn-text-primary: #e2e8f0;   /* Main text */
--sn-text-secondary: #94a3b8; /* Secondary text */
--sn-text-tertiary: #64748b;  /* Muted text */

/* Accent Colors */
--sn-accent-primary: #8b5cf6; /* Purple - primary actions */
--sn-accent-blue: #3b82f6;    /* Blue - secondary actions */
--sn-accent-green: #22c55e;   /* Green - success states */
--sn-accent-red: #ef4444;     /* Red - errors/destructive */
--sn-accent-yellow: #eab308;  /* Yellow - warnings */

/* Borders */
--sn-border-primary: rgba(139, 92, 246, 0.2);
--sn-border-subtle: rgba(255, 255, 255, 0.08);

/* Spacing */
--sn-space-1: 4px;
--sn-space-2: 8px;
--sn-space-3: 12px;
--sn-space-4: 16px;
--sn-space-6: 24px;

/* Border Radius */
--sn-radius-sm: 4px;
--sn-radius-md: 6px;
--sn-radius-lg: 8px;
--sn-radius-xl: 12px;

/* Shadows */
--sn-shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--sn-shadow-md: 0 4px 6px rgba(0,0,0,0.3);
--sn-shadow-lg: 0 10px 15px rgba(0,0,0,0.3);

/* Transitions */
--sn-transition-fast: 0.15s ease;
--sn-transition-normal: 0.2s ease;
\`\`\`

### Standard Button Styles
\`\`\`css
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: var(--sn-radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--sn-transition-fast);
}
.btn-primary {
  background: var(--sn-accent-primary);
  color: white;
}
.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.btn-secondary {
  background: var(--sn-bg-tertiary);
  color: var(--sn-text-primary);
  border: 1px solid var(--sn-border-subtle);
}
\`\`\`

### Standard Input Styles
\`\`\`css
.input {
  width: 100%;
  padding: 10px 12px;
  background: var(--sn-bg-tertiary);
  border: 1px solid var(--sn-border-subtle);
  border-radius: var(--sn-radius-md);
  color: var(--sn-text-primary);
  font-size: 13px;
}
.input:focus {
  outline: none;
  border-color: var(--sn-accent-primary);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}
\`\`\`
`;

/**
 * Complete widget example
 */
const WIDGET_EXAMPLE = `
## Complete Widget Example

Here's a fully working widget that follows all best practices:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #1a1a2e;
      --text: #e2e8f0;
      --accent: #8b5cf6;
      --border: rgba(139, 92, 246, 0.2);
    }

    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 16px;
    }

    .widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .widget-title {
      font-size: 14px;
      font-weight: 600;
    }

    .widget-content {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }

    .value-display {
      font-size: 32px;
      font-weight: 700;
      text-align: center;
      color: var(--accent);
      margin: 20px 0;
    }

    .btn {
      width: 100%;
      padding: 12px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="widget-header">
    <span class="widget-title">Counter Widget</span>
  </div>

  <div class="widget-content">
    <div class="value-display" id="counter">0</div>
    <button class="btn" id="incrementBtn">Increment</button>
  </div>

  <script>
    // State
    let count = 0;
    const counterEl = document.getElementById('counter');
    const incrementBtn = document.getElementById('incrementBtn');

    // Update display
    function updateDisplay() {
      counterEl.textContent = count;
    }

    // Emit count changed event
    function emitCount() {
      if (window.WidgetAPI) {
        window.WidgetAPI.emitEvent({
          type: 'counter:changed',
          scope: 'canvas',
          payload: { count, timestamp: Date.now() }
        });
      }
    }

    // Handle increment
    function increment() {
      count++;
      updateDisplay();
      emitCount();

      // Save state
      if (window.WidgetAPI) {
        window.WidgetAPI.setState({ count });
      }
    }

    // Initialize
    function init() {
      if (!window.WidgetAPI) {
        setTimeout(init, 50);
        return;
      }

      // Restore saved state
      const state = window.WidgetAPI.getState();
      if (state && typeof state.count === 'number') {
        count = state.count;
        updateDisplay();
      }

      // Listen for reset events
      window.WidgetAPI.onEvent('counter:reset', () => {
        count = 0;
        updateDisplay();
        emitCount();
      });

      // Set up button
      incrementBtn.addEventListener('click', increment);

      window.WidgetAPI.log('Counter widget initialized');
    }

    init();

    // CRITICAL: Signal ready to parent - ALWAYS include this!
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>
\`\`\`
`;

/**
 * Main system prompt for widget generation
 */
export const IMPROVED_SYSTEM_PROMPT = `You are an expert widget developer for StickerNest, a visual canvas platform where widgets communicate with each other.

Your job is to generate high-quality, self-contained HTML widgets that:
1. Work perfectly inside iframes
2. Communicate via the WidgetAPI protocol
3. Are visually polished with smooth animations
4. Handle all edge cases gracefully

${WIDGET_PROTOCOL}

${DESIGN_SYSTEM}

${WIDGET_EXAMPLE}

## Critical Requirements

1. **Self-Contained**: All CSS and JS must be inline. No external dependencies.
2. **Wait for WidgetAPI**: Always check if window.WidgetAPI exists before using it.
3. **READY Signal**: ALWAYS include \`window.parent.postMessage({ type: 'READY' }, '*');\` at the end of your script. This is REQUIRED for the widget to work.
4. **Complete HTML**: Include DOCTYPE, html, head, style, body, and script tags.
5. **Dark Theme**: Use dark backgrounds (#1a1a2e or similar) with light text (#e2e8f0).
6. **Responsive**: Widget should adapt to its container size.
7. **Error Handling**: Gracefully handle missing data or failed operations.

## Output Format

Return a JSON object with exactly these fields:
\`\`\`json
{
  "manifest": {
    "id": "unique-kebab-case-id",
    "name": "Widget Display Name",
    "version": "1.0.0",
    "kind": "widget",
    "description": "What this widget does",
    "entry": "index.html",
    "inputs": {
      "input-name": { "type": "event", "description": "What it receives" }
    },
    "outputs": {
      "output-name": { "type": "event", "description": "What it emits" }
    },
    "capabilities": {
      "draggable": true,
      "resizable": true
    }
  },
  "html": "<!DOCTYPE html>..."
}
\`\`\`

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, just the JSON object.
`;

/**
 * Generate complexity guidelines
 */
function getComplexityGuidelines(complexity: ComplexityLevel): string {
  const guidelines: Record<ComplexityLevel, string> = {
    basic: `
### Basic Widget
- Single, focused purpose
- Simple, clean UI with 2-3 interactive elements
- Minimal state management
- Basic styling (no complex animations)
- ~50-100 lines of code
- Focus on reliability over features`,

    standard: `
### Standard Widget
- Complete feature set for its purpose
- Polished UI with 4-6 interactive elements
- Proper state management with persistence
- Smooth hover effects and transitions
- ~150-300 lines of code
- Include loading/empty states`,

    advanced: `
### Advanced Widget
- Rich, sophisticated functionality
- Multiple interactive sections
- Complex state with undo/redo support
- Advanced CSS animations and effects
- Keyboard shortcuts
- ~300-500 lines of code
- Comprehensive error handling`,

    professional: `
### Professional Widget
- Production-ready, enterprise-grade
- Complete feature coverage
- Full accessibility (ARIA, keyboard nav)
- Performance optimized
- Comprehensive error boundaries
- ~500+ lines of code
- Edge case handling for all scenarios`
  };

  return guidelines[complexity] || guidelines.standard;
}

/**
 * Generate style guidelines
 */
function getStyleGuidelines(style: StylePreset): string {
  const styles: Record<StylePreset, string> = {
    minimal: `
### Minimal Style
- Maximum whitespace, sparse layout
- No shadows, subtle 1px borders
- Single accent color only
- Simple geometric shapes
- Sans-serif typography
- Muted, understated animations`,

    polished: `
### Polished Style
- Clean, modern appearance
- Subtle shadows for depth
- Rounded corners (6-8px)
- Smooth micro-interactions
- Primary + secondary accent colors
- Professional, refined feel`,

    elaborate: `
### Elaborate Style
- Rich visual details
- Multiple decorative elements
- Layered backgrounds
- Complex gradients
- Custom iconography
- Expressive animations`,

    glassmorphism: `
### Glassmorphism Style
- Frosted glass effect: backdrop-filter: blur(10px)
- Semi-transparent backgrounds: rgba(255,255,255,0.1)
- Subtle borders: 1px solid rgba(255,255,255,0.2)
- Light color palette on dark
- Floating, layered appearance
- Soft shadows`,

    neon: `
### Neon Style
- Dark background (#0a0a0f)
- Bright neon accent colors
- Glow effects with box-shadow
- Cyan (#00ffff) and magenta (#ff00ff)
- Pulsing/glowing animations
- Cyberpunk aesthetic`,

    retro: `
### Retro Style
- Pixel-perfect borders
- Limited, bold color palette
- Chunky typography
- 8-bit inspired elements
- No gradients, flat colors
- Nostalgic, playful feel`
  };

  return styles[style] || styles.polished;
}

/**
 * Generate feature requirements
 */
function getFeatureRequirements(features: FeatureRequirements): string {
  const requirements: string[] = [];

  if (features.animations) {
    requirements.push('- Smooth CSS animations and transitions');
  }
  if (features.microInteractions) {
    requirements.push('- Hover effects, click feedback, focus states');
  }
  if (features.loadingStates) {
    requirements.push('- Loading spinners/skeletons while processing');
  }
  if (features.errorHandling) {
    requirements.push('- User-friendly error messages');
  }
  if (features.keyboardShortcuts) {
    requirements.push('- Keyboard navigation and shortcuts');
  }
  if (features.responsive) {
    requirements.push('- Adapt to container size changes');
  }
  if (features.accessibility) {
    requirements.push('- ARIA labels, semantic HTML, screen reader support');
  }
  if (features.persistence) {
    requirements.push('- Save/restore state using WidgetAPI.setState/getState');
  }
  if (features.soundEffects) {
    requirements.push('- Optional audio feedback (mutable)');
  }

  return requirements.length > 0
    ? '### Required Features\n' + requirements.join('\n')
    : '';
}

/**
 * Generate I/O requirements
 */
function getIORequirements(inputs?: string[], outputs?: string[]): string {
  let io = '';

  if (inputs && inputs.length > 0) {
    io += '### Input Events (Must Listen For)\n';
    inputs.forEach(input => {
      io += `- \`${input}\`: Use window.WidgetAPI.onEvent('${input}', handler)\n`;
    });
    io += '\n';
  }

  if (outputs && outputs.length > 0) {
    io += '### Output Events (Must Emit)\n';
    outputs.forEach(output => {
      io += `- \`${output}\`: Emit via window.WidgetAPI.emitEvent({ type: '${output}', ... })\n`;
    });
  }

  return io;
}

/**
 * Generate the complete user prompt for widget generation
 */
export function generateImprovedPrompt(
  description: string,
  options: {
    complexity?: ComplexityLevel;
    style?: StylePreset;
    features?: FeatureRequirements;
    inputEvents?: string[];
    outputEvents?: string[];
    pipelineName?: string;
    existingWidgets?: string[];
    additionalInstructions?: string;
  } = {}
): string {
  const {
    complexity = 'standard',
    style = 'polished',
    features = {},
    inputEvents = [],
    outputEvents = [],
    pipelineName,
    existingWidgets = [],
    additionalInstructions = ''
  } = options;

  let prompt = `# Widget Generation Request

## Description
${description}

${getComplexityGuidelines(complexity)}

${getStyleGuidelines(style)}

${getFeatureRequirements(features)}

${getIORequirements(inputEvents, outputEvents)}
`;

  // Add pipeline context if available
  if (pipelineName) {
    prompt += `
### Pipeline Context
This widget will be added to the "${pipelineName}" pipeline.
`;
    if (existingWidgets.length > 0) {
      prompt += `Existing widgets in this pipeline: ${existingWidgets.join(', ')}
Consider how this widget might connect with these existing widgets.
`;
    }
  }

  // Add any additional instructions
  if (additionalInstructions) {
    prompt += `
### Additional Requirements
${additionalInstructions}
`;
  }

  prompt += `
## Output
Generate a complete, working widget following all the protocols and guidelines above.
Return ONLY valid JSON with "manifest" and "html" fields.`;

  return prompt;
}

/**
 * Quick prompt for simple widgets
 */
export function generateQuickPrompt(description: string): string {
  return `Create a simple widget: ${description}

Requirements:
- Self-contained HTML with inline CSS and JS
- Dark theme (#1a1a2e background, #e2e8f0 text)
- Wait for window.WidgetAPI before using it
- Emit events via window.WidgetAPI.emitEvent()
- Listen via window.WidgetAPI.onEvent()

Return JSON with "manifest" and "html" fields only.`;
}

/**
 * Modification prompt for updating existing widgets
 */
export function generateModificationPrompt(
  originalHtml: string,
  originalManifest: any,
  modifications: string
): string {
  return `# Widget Modification Request

## Current Widget
Name: ${originalManifest.name}
ID: ${originalManifest.id}

### Current Inputs
${JSON.stringify(originalManifest.inputs || {}, null, 2)}

### Current Outputs
${JSON.stringify(originalManifest.outputs || {}, null, 2)}

## Requested Modifications
${modifications}

## Current HTML
\`\`\`html
${originalHtml}
\`\`\`

## Instructions
1. Apply the requested modifications
2. Preserve existing functionality unless asked to change it
3. Keep the same widget ID
4. Update the version to indicate modification (e.g., 1.0.0 -> 1.1.0)
5. Update manifest inputs/outputs if new events are added

Return the modified widget as JSON with "manifest" and "html" fields.`;
}

export {
  WIDGET_PROTOCOL,
  DESIGN_SYSTEM,
  WIDGET_EXAMPLE,
  getComplexityGuidelines,
  getStyleGuidelines,
  getFeatureRequirements,
  getIORequirements
};
