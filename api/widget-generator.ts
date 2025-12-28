/**
 * StickerNest v2 - Widget Generator API Endpoint v3
 * Server-side endpoint for AI-powered widget generation with CORRECT protocol
 */

import Replicate from 'replicate';

/**
 * The CORRECT widget protocol - matches how actual working widgets communicate
 */
const WIDGET_PROTOCOL_V3 = `
# StickerNest Widget Protocol v3.0

## Critical: Communication via postMessage

Widgets run in iframes and communicate ONLY via window.parent.postMessage().

### 1. Signal Ready (REQUIRED - Every widget must do this)
\`\`\`javascript
window.parent.postMessage({ type: 'READY' }, '*');
\`\`\`

### 2. Emit Events to Other Widgets
\`\`\`javascript
// IMPORTANT: The event type MUST match one of your io.outputs[].id values!
// If your manifest has io.outputs: [{ id: 'result', ... }], emit 'result':
window.parent.postMessage({
    type: 'widget:emit',
    payload: {
        type: 'result',  // <-- Must match an io.outputs[].id
        payload: { /* your data */ }
    }
}, '*');
\`\`\`

### 3. Listen for Events from Other Widgets
\`\`\`javascript
// Events arrive matching your io.inputs[].id values
window.addEventListener('message', (event) => {
    if (event.data.type === 'widget:event') {
        const eventType = event.data.payload?.type;  // matches io.inputs[].id
        const eventPayload = event.data.payload?.payload;
        // Handle event based on eventType
    }
    // Also handle pipeline:input for direct port routing
    if (event.data.type === 'pipeline:input') {
        const portName = event.data.portName;  // matches io.inputs[].id
        const value = event.data.value;
        // Handle input
    }
});
\`\`\`

## CRITICAL: Port ID Matching
- Your emitted event types MUST match your io.outputs[].id exactly
- You will receive events matching your io.inputs[].id
- This enables pipeline routing between widgets
`;

/**
 * Vector-specific events reference
 */
const VECTOR_EVENTS = `
## Vector Graphics Events

### Events to EMIT (send to canvas):
- vector:spawn-shape - Create shape: { shape: 'rect'|'circle'|'ellipse'|'polygon'|'star'|'line', x, y, options }
  options: { width, height, fill, stroke, strokeWidth, radius, rx, ry }
- vector:set-fill - Set fill color on selected: { fill: '#hexcolor' }
- vector:set-stroke - Set stroke color on selected: { stroke: '#hexcolor' }
- vector:set-stroke-width - Set stroke width: { strokeWidth: number }
- vector:set-opacity - Set opacity: { opacity: 0.0 to 1.0 }
- vector:set-shadow - Set drop shadow: { enabled, offsetX, offsetY, blur, color, opacity }
- vector:transform - Transform selected: { translateX, translateY, scaleX, scaleY, rotate }
- vector:delete-selected - Delete the selected entity
- vector:duplicate-selected - Duplicate the selected entity
- vector:bring-to-front - Move selected to top layer
- vector:send-to-back - Move selected to bottom layer

### Events to LISTEN for (from canvas):
- vector:selection-changed - When selection changes
  payload: { id, type, fill, stroke, strokeWidth, opacity } or null if deselected
- vector:entity-added - When new entity is created
  payload: { id, type, fill, stroke, ... }
- vector:entity-updated - When entity is modified
  payload: { id, ...changedProperties }
- vector:entity-deleted - When entity is removed
  payload: { id }
`;

/**
 * Style-specific CSS examples for variety
 */
const STYLE_EXAMPLES: Record<string, string> = {
  minimal: `
/* MINIMAL STYLE - Clean, simple, functional */
body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    background: #ffffff;
    color: #1a1a1a;
    padding: 16px;
}
.title { font-size: 13px; font-weight: 500; margin-bottom: 16px; color: #333; }
.control { margin-bottom: 12px; }
.control label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; }
.control input, .control select {
    width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;
    font-size: 13px; background: #fafafa;
}
button {
    width: 100%; padding: 10px; border: none; border-radius: 4px;
    background: #1a1a1a; color: white; font-size: 13px; cursor: pointer;
}
button:hover { background: #333; }`,

  polished: `
/* POLISHED STYLE - Professional with subtle gradients */
body {
    font-family: 'Inter', 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 16px;
    color: white;
}
.card {
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
.title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
button {
    width: 100%; padding: 12px; border: none; border-radius: 8px;
    background: white; color: #764ba2; font-weight: 600; cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}
button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }`,

  glass: `
/* GLASSMORPHISM STYLE - Frosted glass effect */
body {
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
    min-height: 100vh;
    padding: 16px;
    color: rgba(255,255,255,0.9);
}
.glass-panel {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 20px;
}
.title { font-size: 14px; font-weight: 500; letter-spacing: 0.5px; margin-bottom: 20px; }
button {
    width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,0.2);
    border-radius: 10px; background: rgba(255,255,255,0.1);
    color: white; cursor: pointer; transition: all 0.3s;
}
button:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.3); }`,

  neon: `
/* NEON/CYBERPUNK STYLE - Glowing colors on dark */
body {
    font-family: 'Orbitron', 'Rajdhani', monospace;
    background: #0a0a0f;
    min-height: 100vh;
    padding: 16px;
    color: #00ff88;
}
.neon-box {
    background: rgba(0,255,136,0.05);
    border: 1px solid #00ff88;
    box-shadow: 0 0 20px rgba(0,255,136,0.3), inset 0 0 20px rgba(0,255,136,0.1);
    border-radius: 4px;
    padding: 16px;
}
.title {
    font-size: 14px; text-transform: uppercase; letter-spacing: 2px;
    text-shadow: 0 0 10px #00ff88, 0 0 20px #00ff88;
    margin-bottom: 16px;
}
button {
    width: 100%; padding: 12px; border: 2px solid #ff00ff;
    background: transparent; color: #ff00ff; cursor: pointer;
    text-transform: uppercase; letter-spacing: 1px;
    box-shadow: 0 0 10px rgba(255,0,255,0.5);
    transition: all 0.3s;
}
button:hover {
    background: #ff00ff; color: #0a0a0f;
    box-shadow: 0 0 30px rgba(255,0,255,0.8);
}`,

  retro: `
/* RETRO/8-BIT STYLE - Pixel aesthetic */
body {
    font-family: 'Press Start 2P', 'Courier New', monospace;
    background: #2d1b69;
    min-height: 100vh;
    padding: 16px;
    color: #ffd93d;
    image-rendering: pixelated;
}
.retro-panel {
    background: #1a0f3c;
    border: 4px solid #ffd93d;
    padding: 16px;
    box-shadow: 8px 8px 0 #ff6b6b;
}
.title { font-size: 10px; margin-bottom: 16px; }
button {
    width: 100%; padding: 12px 8px; border: 4px solid #4ecdc4;
    background: #1a0f3c; color: #4ecdc4; cursor: pointer;
    font-family: inherit; font-size: 8px;
    box-shadow: 4px 4px 0 #ff6b6b;
    transition: transform 0.1s;
}
button:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #ff6b6b; }
button:active { transform: translate(4px, 4px); box-shadow: none; }`,

  elaborate: `
/* ELABORATE STYLE - Rich with animations */
body {
    font-family: 'Poppins', 'Segoe UI', sans-serif;
    background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
    min-height: 100vh;
    padding: 16px;
    color: white;
}
@keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
.card {
    background: rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 25px 45px rgba(0,0,0,0.2);
    animation: float 6s ease-in-out infinite;
}
@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}
button {
    width: 100%; padding: 14px; border: none; border-radius: 12px;
    background: white; color: #e73c7e; font-weight: 700;
    cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
button:hover { transform: scale(1.05); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }`
};

/**
 * Minimal code pattern (not a full example, just the communication pattern)
 */
const CODE_PATTERN = `
## Communication Pattern (REQUIRED)

\`\`\`javascript
// 1. READY signal - ALWAYS include this
window.parent.postMessage({ type: 'READY' }, '*');

// 2. Emit events - eventType MUST match your io.outputs[].id!
function emit(portId, data) {
    // portId should be one of your io.outputs[].id values (e.g., 'result', 'colorChanged')
    window.parent.postMessage({
        type: 'widget:emit',
        payload: { type: portId, payload: data }
    }, '*');
}

// 3. Listen for events - types will match your io.inputs[].id
window.addEventListener('message', (event) => {
    if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};
        // type will be one of your io.inputs[].id values (e.g., 'trigger', 'setValue')
    }
    if (event.data.type === 'pipeline:input') {
        // Direct pipeline input: event.data.portName and event.data.value
    }
});
\`\`\`

IMPORTANT: When you emit events, use the EXACT id from your io.outputs array!
`;

interface GenerationRequest {
    description: string;
    mode: 'new' | 'variation' | 'layer';
    quality?: 'basic' | 'standard' | 'advanced' | 'professional';
    style?: 'minimal' | 'polished' | 'elaborate' | 'glass' | 'neon' | 'retro';
    sourceWidgetId?: string;
    pipelineId?: string;
}

interface GeneratedWidget {
    id: string;
    name: string;
    manifest: any;
    html: string;
    explanation: string;
}

function detectWidgetType(description: string): 'vector' | 'pipeline' | 'general' {
    const lower = description.toLowerCase();

    if (lower.includes('vector') || lower.includes('shape') || lower.includes('svg') ||
        lower.includes('canvas') || lower.includes('draw') || lower.includes('color') ||
        lower.includes('fill') || lower.includes('stroke') || lower.includes('transform') ||
        lower.includes('layer') || lower.includes('shadow') || lower.includes('entity') ||
        lower.includes('drop shadow') || lower.includes('opacity') || lower.includes('gradient')) {
        return 'vector';
    }

    if (lower.includes('pipeline') || lower.includes('data flow') || lower.includes('chain')) {
        return 'pipeline';
    }

    return 'general';
}

function buildPrompt(request: GenerationRequest, index: number, total: number): string {
    const widgetType = detectWidgetType(request.description);
    const quality = request.quality || 'standard';
    const style = request.style || 'polished';

    // Get style-specific CSS example
    const styleCSS = STYLE_EXAMPLES[style] || STYLE_EXAMPLES.polished;

    let prompt = `You are a creative UI designer and widget developer for StickerNest, a visual canvas application.
Your task is to create a UNIQUE, thoughtfully designed widget. DO NOT copy existing patterns - be creative!

${WIDGET_PROTOCOL_V3}
${CODE_PATTERN}
`;

    // Add context based on widget type
    if (widgetType === 'vector') {
        prompt += `\n${VECTOR_EVENTS}\n`;
    }

    // Add style-specific CSS example
    prompt += `
## Visual Style: ${style.toUpperCase()}

Use this CSS style as your foundation (adapt it creatively, don't copy exactly):
\`\`\`css
${styleCSS}
\`\`\`

## Design Principles for "${style}" style:
${style === 'minimal' ? `
- WHITE or very light backgrounds
- Sans-serif system fonts
- Subtle borders, no shadows
- Black/gray text with high contrast
- Simple rectangular shapes
- Generous whitespace` : ''}
${style === 'polished' ? `
- Gradient backgrounds (purple/blue tones work well)
- Smooth rounded corners (8-12px)
- Subtle drop shadows
- White cards on colored backgrounds
- Hover transitions (transform, shadow)
- Professional, modern feel` : ''}
${style === 'glass' ? `
- Dark gradient backgrounds
- Semi-transparent panels with backdrop-filter blur
- Thin light borders (1px rgba white)
- Soft glows and transparency
- Elegant, premium feel
- Light text on dark` : ''}
${style === 'neon' ? `
- Very dark backgrounds (#0a0a0f or similar)
- Bright neon accent colors (cyan, magenta, lime)
- Glowing box-shadows with colored light
- Text-shadow for glow effects
- Monospace or futuristic fonts
- Cyberpunk/sci-fi aesthetic` : ''}
${style === 'retro' ? `
- Bold, saturated colors (purple, yellow, cyan, coral)
- Hard pixel-style shadows (offset, no blur)
- Chunky borders (3-4px)
- Pixelated or monospace fonts
- 8-bit game aesthetic
- No rounded corners or minimal rounding` : ''}
${style === 'elaborate' ? `
- Animated gradient backgrounds
- Floating/breathing animations
- Multiple layered effects
- Rich color transitions
- Playful, eye-catching design
- CSS keyframe animations` : ''}

## Quality Level: ${quality}
${quality === 'basic' ? '- Simple functionality, clean look' : ''}
${quality === 'standard' ? '- Polished UI with hover states and transitions' : ''}
${quality === 'advanced' ? '- Animations, micro-interactions, smooth UX' : ''}
${quality === 'professional' ? '- Production-ready: loading states, error handling, accessibility' : ''}

## Your Task
Create a widget for: "${request.description}"

${total > 1 ? `This is widget ${index + 1} of ${total}. Make it DISTINCT from others - different layout, colors, interactions.` : ''}

BE CREATIVE:
- Don't just make a generic form with sliders
- Think about what UI best fits this specific widget's PURPOSE
- Use appropriate input types (buttons, toggles, color pickers, etc.)
- Consider the user flow and what makes sense
- Add personality that matches the style

## Output Format
Return ONLY a JSON object (no markdown, no explanation outside JSON):
{
    "manifest": {
        "id": "unique-kebab-case-id-${Date.now().toString(36)}",
        "name": "Creative Widget Name",
        "version": "1.0.0",
        "description": "Clear description of functionality",
        "entry": "index.html",
        "kind": "2d",
        "category": "${widgetType === 'vector' ? 'vector' : widgetType === 'pipeline' ? 'pipeline' : 'utility'}",
        "capabilities": {
            "draggable": true,
            "resizable": true
        },
        "size": {
            "defaultWidth": 220,
            "defaultHeight": 300,
            "minWidth": 160,
            "minHeight": 180
        },
        "io": {
            "inputs": [
                { "id": "trigger", "name": "Trigger", "type": "event", "description": "Trigger this widget" }
            ],
            "outputs": [
                { "id": "result", "name": "Result", "type": "any", "description": "Output from this widget" }
            ]
        },
        "events": {
            "emits": ["result"],
            "listens": ${widgetType === 'vector' ? '["vector:selection-changed", "vector:entity-updated"]' : '[]'}
        }
    },
    "html": "<!DOCTYPE html>...(complete working HTML with inline CSS and JS)...",
    "explanation": "What this widget does and how to use it"
}

REQUIREMENTS:
1. MUST call window.parent.postMessage({ type: 'READY' }, '*') on load
2. MUST use the emit pattern for sending events
3. MUST listen for widget:event messages
4. HTML must be complete and self-contained
5. Escape quotes and newlines properly for JSON
6. Match the ${style} visual style closely
7. Be creative with the UI - don't just copy the example
8. CRITICAL: emit() calls MUST use io.outputs[].id as the event type (e.g., emit('result', data) if io.outputs has id:'result')
9. CRITICAL: Event listeners should handle events matching io.inputs[].id values
10. Define meaningful io ports that describe your widget's actual inputs/outputs
11. CRITICAL: Manifest MUST include "kind": "2d" and "capabilities": { "draggable": true, "resizable": true }
12. CRITICAL: For vector widgets, manifest.events.listens MUST include "vector:selection-changed" and "vector:entity-updated" to receive canvas events
`;

    return prompt;
}

/**
 * Generate widget using Claude API (primary, best for code)
 */
async function generateWithClaude(
    prompt: string,
    apiKey: string
): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 8000,
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.content?.[0]?.text || '';
}

/**
 * Generate widget using Replicate/Llama (fallback)
 */
async function generateWithReplicate(
    prompt: string,
    replicate: Replicate
): Promise<string> {
    const model = 'meta/meta-llama-3.1-405b-instruct';
    const output = await replicate.run(model as any, {
        input: {
            prompt,
            max_tokens: 8000,
            temperature: 0.8,
            top_p: 0.95,
        }
    });

    if (Array.isArray(output)) {
        return output.join('');
    } else if (typeof output === 'string') {
        return output;
    }
    return '';
}

/**
 * Parse AI response to extract widget JSON
 */
function parseWidgetResponse(result: string, index: number): GeneratedWidget {
    let jsonStr = result.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object in response
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.manifest || !parsed.html) {
        throw new Error('Response missing manifest or html');
    }

    return {
        id: parsed.manifest?.id || `generated-${Date.now().toString(36)}-${index}`,
        name: parsed.manifest?.name || 'Generated Widget',
        manifest: parsed.manifest,
        html: parsed.html,
        explanation: parsed.explanation || 'Widget generated successfully'
    };
}

async function generateSingleWidget(
    request: GenerationRequest,
    index: number,
    total: number,
    anthropicKey: string | undefined,
    replicate: Replicate | null
): Promise<GeneratedWidget> {
    const prompt = buildPrompt(request, index, total);

    try {
        let result: string;

        // Try Claude first (best for code generation)
        if (anthropicKey) {
            console.log(`[WidgetGenerator] Using Claude 3.5 Sonnet for widget ${index + 1}/${total}`);
            result = await generateWithClaude(prompt, anthropicKey);
        } else if (replicate) {
            // Fall back to Replicate/Llama
            console.log(`[WidgetGenerator] Using Llama 3.1 405B for widget ${index + 1}/${total} (no Claude key)`);
            result = await generateWithReplicate(prompt, replicate);
        } else {
            throw new Error('No AI provider available. Configure ANTHROPIC_API_KEY or VITE_REPLICATE_API_TOKEN.');
        }

        return parseWidgetResponse(result, index);
    } catch (error) {
        console.error('Widget generation error:', error);
        throw new Error(`Failed to generate widget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API keys - Claude preferred, Replicate as fallback
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const replicateKey = process.env.VITE_REPLICATE_API_TOKEN;

    if (!anthropicKey && !replicateKey) {
        return res.status(500).json({
            error: 'No AI provider configured. Set ANTHROPIC_API_KEY (recommended) or VITE_REPLICATE_API_TOKEN.'
        });
    }

    try {
        const { requests } = req.body as { requests: GenerationRequest[] };

        if (!requests || !Array.isArray(requests)) {
            return res.status(400).json({ error: 'Invalid request: requests array required' });
        }

        // Limit to 5 widgets max
        const limitedRequests = requests.slice(0, 5);

        // Create Replicate client only if we have the key (for fallback)
        const replicate = replicateKey ? new Replicate({ auth: replicateKey }) : null;

        // Log which provider will be used
        if (anthropicKey) {
            console.log(`[WidgetGenerator] Primary: Claude 3.5 Sonnet`);
        } else {
            console.log(`[WidgetGenerator] Primary: Llama 3.1 405B (Replicate)`);
        }

        // Generate widgets in parallel
        const results = await Promise.allSettled(
            limitedRequests.map((req, i) =>
                generateSingleWidget(req, i, limitedRequests.length, anthropicKey, replicate)
            )
        );

        const widgets: GeneratedWidget[] = [];
        const errors: string[] = [];

        for (const result of results) {
            if (result.status === 'fulfilled') {
                widgets.push(result.value);
            } else {
                errors.push(result.reason?.message || 'Unknown error');
            }
        }

        return res.status(200).json({
            widgets,
            errors,
            suggestedConnections: []
        });
    } catch (error) {
        console.error('Widget generator error:', error);
        return res.status(500).json({
            error: 'Widget generation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
