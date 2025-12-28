/**
 * StickerNest v2 - AI Widget Generator Service
 * Generates widgets using AI based on the widget protocol
 */

import { Pipeline, PipelineNode } from '../types/domain';
import { getEventRegistry, VECTOR_EVENTS, TIMER_EVENTS, UI_EVENTS } from '../runtime/EventRegistry';

/** Widget generation mode */
export type GenerationMode = 'new' | 'variation' | 'layer';

/** Widget generation request */
export interface WidgetGenerationRequest {
    /** Description of what the widget should do */
    description: string;
    /** Generation mode */
    mode: GenerationMode;
    /** For variation mode: the source widget to base variations on */
    sourceWidgetId?: string;
    /** For layer mode: the pipeline to add to */
    pipelineId?: string;
    /** Category for organizing widgets */
    category?: string;
    /** Event types this widget should listen to */
    inputEvents?: string[];
    /** Event types this widget should emit */
    outputEvents?: string[];
    /** Style preferences */
    style?: {
        theme?: 'light' | 'dark' | 'system';
        colorScheme?: string;
        compact?: boolean;
    };
}

/** Generated widget output */
export interface GeneratedWidget {
    id: string;
    name: string;
    manifest: {
        id: string;
        name: string;
        version: string;
        kind: string;
        entry: string;
        capabilities: {
            draggable: boolean;
            resizable: boolean;
        };
        inputs: Record<string, { type: string; description: string }>;
        outputs: Record<string, { type: string; description: string }>;
    };
    html: string;
    /** Explanation of what was generated */
    explanation: string;
}

/** Batch generation result */
export interface BatchGenerationResult {
    widgets: GeneratedWidget[];
    errors: string[];
    /** Suggested pipeline connections between generated widgets */
    suggestedConnections?: Array<{
        fromWidgetId: string;
        fromOutput: string;
        toWidgetId: string;
        toInput: string;
    }>;
}

/**
 * The widget protocol documentation that the AI uses
 * This is updated whenever widget generation rules change
 * PROTOCOL V3.0 - Uses postMessage for iframe communication
 */
export const WIDGET_PROTOCOL = `
# StickerNest Widget Protocol v3.0

## Overview
Widgets are self-contained HTML/JS applications that run in iframes and communicate via postMessage.

## CRITICAL: Communication via postMessage
Widgets communicate ONLY via window.parent.postMessage().

### 1. Signal Ready (REQUIRED - Every widget must do this)
\`\`\`javascript
window.parent.postMessage({ type: 'READY' }, '*');
\`\`\`

### 2. Emit Events to Other Widgets
\`\`\`javascript
// IMPORTANT: The event type MUST match one of your io.outputs[].id values!
function emit(portId, data) {
    window.parent.postMessage({
        type: 'widget:emit',
        payload: {
            type: portId,  // <-- Must match an io.outputs[].id
            payload: data
        }
    }, '*');
}
\`\`\`

### 3. Listen for Events from Other Widgets
\`\`\`javascript
window.addEventListener('message', (event) => {
    // Handle widget events (types match io.inputs[].id)
    if (event.data.type === 'widget:event') {
        const eventType = event.data.payload?.type;
        const eventPayload = event.data.payload?.payload;
        // Handle based on eventType
    }
    // Handle direct pipeline inputs
    if (event.data.type === 'pipeline:input') {
        const portName = event.data.portName;
        const value = event.data.value;
        // Handle input
    }
});
\`\`\`

## Manifest Schema (v3 - uses io format)
\`\`\`json
{
    "id": "widget-id",
    "name": "Widget Name",
    "version": "1.0.0",
    "description": "What this widget does",
    "entry": "index.html",
    "category": "utility",
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
    }
}
\`\`\`

## CRITICAL: Port ID Matching
- Your emitted event types MUST match your io.outputs[].id exactly
- You will receive events matching your io.inputs[].id
- This enables pipeline routing between widgets

## Theme Tokens (CSS Variables)
### Colors
- --sn-bg-primary: #0f0f19 (main background)
- --sn-bg-secondary: #1a1a2e (cards, panels)
- --sn-bg-tertiary: #252538 (hover, active states)
- --sn-text-primary: #e2e8f0 (main text)
- --sn-text-secondary: #94a3b8 (secondary text)
- --sn-accent-primary: #8b5cf6 (purple accent)
- --sn-success: #22c55e (green)
- --sn-error: #ef4444 (red)
- --sn-border-primary: rgba(139, 92, 246, 0.2) (borders)

### Spacing & Radius
- --sn-space-2: 8px, --sn-space-3: 12px, --sn-space-4: 16px
- --sn-radius-md: 6px, --sn-radius-lg: 8px

## Widget HTML Template
\`\`\`html
<!DOCTYPE html>
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
        .sn-button {
            background: var(--sn-accent-primary);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: var(--sn-radius-md);
            cursor: pointer;
        }
        .sn-panel {
            background: var(--sn-bg-secondary);
            border: 1px solid var(--sn-border-primary);
            border-radius: var(--sn-radius-md);
            padding: 16px;
        }
    </style>
</head>
<body>
    <!-- Widget UI here -->
    <script>
        // Emit events - portId MUST match io.outputs[].id!
        function emit(portId, data) {
            window.parent.postMessage({
                type: 'widget:emit',
                payload: { type: portId, payload: data }
            }, '*');
        }

        // Listen for events
        window.addEventListener('message', (event) => {
            if (event.data.type === 'widget:event') {
                const { type, payload } = event.data.payload || {};
                // Handle event based on type (matches io.inputs[].id)
            }
        });

        // Signal ready - REQUIRED!
        window.parent.postMessage({ type: 'READY' }, '*');
    </script>
</body>
</html>
\`\`\`

## Best Practices
1. ALWAYS send READY signal on load
2. Use the emit() function with correct port IDs
3. Listen for widget:event messages
4. Port IDs in code MUST match manifest io declarations
`;

/**
 * Generate documentation about available events for AI
 */
function generateEventDocs(): string {
    const registry = getEventRegistry();
    return registry.generatePromptDocs();
}

/**
 * Generate the AI prompt for widget creation
 */
function buildGenerationPrompt(request: WidgetGenerationRequest, existingWidgetCode?: string): string {
    // Generate event documentation
    const eventDocs = generateEventDocs();

    // Auto-detect if this is a vector-related widget
    const descLower = request.description.toLowerCase();
    const isVectorWidget = descLower.includes('vector') || descLower.includes('shape') ||
                           descLower.includes('canvas') || descLower.includes('shadow') ||
                           descLower.includes('fill') || descLower.includes('stroke') ||
                           descLower.includes('color picker') || descLower.includes('style');

    const isTimerWidget = descLower.includes('timer') || descLower.includes('countdown') ||
                          descLower.includes('clock') || descLower.includes('stopwatch');

    // Build recommended events based on widget type
    let recommendedInputs: string[] = request.inputEvents || [];
    let recommendedOutputs: string[] = request.outputEvents || [];

    if (isVectorWidget && recommendedInputs.length === 0) {
        recommendedInputs = ['vector:selection-changed'];
    }
    if (isVectorWidget && recommendedOutputs.length === 0) {
        recommendedOutputs = ['vector:set-fill', 'vector:set-stroke', 'vector:set-shadow'];
    }
    if (isTimerWidget && recommendedOutputs.length === 0) {
        recommendedOutputs = ['timer:tick', 'timer:complete'];
    }

    let prompt = `You are a widget generator for StickerNest, a visual canvas platform.

${WIDGET_PROTOCOL}

${eventDocs}

## IMPORTANT: Use Registered Events
When creating widgets that interact with vector graphics, timers, or other widgets:
- Use events from the registry above for maximum compatibility
- The vector-canvas widget handles: vector:set-fill, vector:set-stroke, vector:set-shadow, etc.
- Timer widgets should emit: timer:tick, timer:complete
- Generic widgets can use: trigger, clicked, valueChanged, colorChanged

## Your Task
Generate a complete widget based on this description:
"${request.description}"

Mode: ${request.mode}
${request.category ? `Category: ${request.category}` : ''}
${recommendedInputs.length ? `Recommended input events: ${recommendedInputs.join(', ')}` : ''}
${recommendedOutputs.length ? `Recommended output events: ${recommendedOutputs.join(', ')}` : ''}
${request.style?.theme ? `Theme: ${request.style.theme}` : ''}
${request.style?.colorScheme ? `Color scheme: ${request.style.colorScheme}` : ''}
${request.style?.compact ? 'Layout: compact' : ''}
`;

    if (request.mode === 'variation' && existingWidgetCode) {
        prompt += `
## Source Widget (create a variation of this):
\`\`\`html
${existingWidgetCode}
\`\`\`

Create a variation that has different styling or enhanced features while maintaining the same core functionality.
`;
    }

    if (request.mode === 'layer') {
        prompt += `
## Layer Mode Instructions
Create a widget that can be added as a new layer to an existing pipeline.
It should process data from inputs and emit transformed data to outputs.
Focus on data transformation, filtering, or aggregation capabilities.
`;
    }

    prompt += `
## Output Format
Respond with a JSON object (no markdown, just JSON):
{
    "manifest": { ... },
    "html": "<!DOCTYPE html>...",
    "explanation": "Brief explanation of what was created"
}

Important:
- The html must be a complete, working widget
- Use the dark theme colors shown in the protocol
- Include meaningful interactivity
- Make sure event types are consistent between manifest and code
- Escape the HTML properly for JSON (newlines as \\n, quotes as \\")
`;

    return prompt;
}

/**
 * Parse AI response into GeneratedWidget
 */
function parseGeneratedWidget(response: string, requestId: string): GeneratedWidget {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Handle markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    try {
        const parsed = JSON.parse(jsonStr);

        return {
            id: parsed.manifest?.id || `generated-${requestId}`,
            name: parsed.manifest?.name || 'Generated Widget',
            manifest: parsed.manifest,
            html: parsed.html,
            explanation: parsed.explanation || 'Widget generated successfully'
        };
    } catch (e) {
        throw new Error(`Failed to parse AI response: ${e}`);
    }
}

/**
 * Call the AI service to generate a widget
 */
async function callAI(prompt: string): Promise<string> {
    // Use the Replicate API proxy
    const response = await fetch('/api/replicate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            max_tokens: 4000,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI service error: ${error}`);
    }

    const result = await response.json();
    return result.output;
}

/**
 * Generate a single widget
 */
export async function generateWidget(
    request: WidgetGenerationRequest,
    existingWidgetCode?: string
): Promise<GeneratedWidget> {
    const prompt = buildGenerationPrompt(request, existingWidgetCode);
    const response = await callAI(prompt);
    const requestId = Date.now().toString(36);
    return parseGeneratedWidget(response, requestId);
}

/**
 * Generate multiple widgets (batch)
 */
export async function generateWidgetBatch(
    requests: WidgetGenerationRequest[],
    maxConcurrent = 5
): Promise<BatchGenerationResult> {
    const widgets: GeneratedWidget[] = [];
    const errors: string[] = [];

    // Limit to max 5 concurrent
    const limitedRequests = requests.slice(0, maxConcurrent);

    // Generate widgets in parallel
    const results = await Promise.allSettled(
        limitedRequests.map((req, i) =>
            generateWidget(req).then(w => ({ index: i, widget: w }))
        )
    );

    for (const result of results) {
        if (result.status === 'fulfilled') {
            widgets.push(result.value.widget);
        } else {
            errors.push(result.reason?.message || 'Unknown error');
        }
    }

    // Suggest connections between generated widgets
    const suggestedConnections = suggestConnections(widgets);

    return { widgets, errors, suggestedConnections };
}

/**
 * Extract port IDs from a manifest (handles both legacy and io formats)
 */
function extractPortIds(manifest: GeneratedWidget['manifest']): { inputs: string[]; outputs: string[] } {
    const inputs: string[] = [];
    const outputs: string[] = [];

    // Handle new io format (v3) - array of objects with id property
    if (manifest.io) {
        const io = manifest.io as {
            inputs?: Array<{ id?: string; name?: string } | string>;
            outputs?: Array<{ id?: string; name?: string } | string>;
        };
        if (io.inputs) {
            for (const input of io.inputs) {
                if (typeof input === 'string') {
                    inputs.push(input);
                } else if (input.id) {
                    inputs.push(input.id);
                } else if (input.name) {
                    inputs.push(input.name);
                }
            }
        }
        if (io.outputs) {
            for (const output of io.outputs) {
                if (typeof output === 'string') {
                    outputs.push(output);
                } else if (output.id) {
                    outputs.push(output.id);
                } else if (output.name) {
                    outputs.push(output.name);
                }
            }
        }
    }

    // Handle legacy format (v2) - object with port names as keys
    if (manifest.inputs && typeof manifest.inputs === 'object') {
        inputs.push(...Object.keys(manifest.inputs));
    }
    if (manifest.outputs && typeof manifest.outputs === 'object') {
        outputs.push(...Object.keys(manifest.outputs));
    }

    return { inputs, outputs };
}

/**
 * Suggest pipeline connections between widgets
 */
function suggestConnections(widgets: GeneratedWidget[]): BatchGenerationResult['suggestedConnections'] {
    const connections: BatchGenerationResult['suggestedConnections'] = [];

    for (let i = 0; i < widgets.length; i++) {
        const sourceWidget = widgets[i];
        const sourcePorts = extractPortIds(sourceWidget.manifest);

        for (let j = 0; j < widgets.length; j++) {
            if (i === j) continue;

            const targetWidget = widgets[j];
            const targetPorts = extractPortIds(targetWidget.manifest);

            // Look for matching event types
            for (const output of sourcePorts.outputs) {
                for (const input of targetPorts.inputs) {
                    // Simple matching: look for similar names or types
                    const outputLower = output.toLowerCase().replace(/-/g, '');
                    const inputLower = input.toLowerCase().replace(/-/g, '');
                    if (
                        outputLower.includes(inputLower) ||
                        inputLower.includes(outputLower) ||
                        outputLower === inputLower
                    ) {
                        connections.push({
                            fromWidgetId: sourceWidget.id,
                            fromOutput: output,
                            toWidgetId: targetWidget.id,
                            toInput: input,
                        });
                    }
                }
            }
        }
    }

    return connections;
}

/**
 * Generate a widget variation from an existing widget
 */
export async function generateVariation(
    sourceWidgetId: string,
    sourceCode: string,
    variationDescription: string
): Promise<GeneratedWidget> {
    return generateWidget(
        {
            description: variationDescription,
            mode: 'variation',
            sourceWidgetId,
        },
        sourceCode
    );
}

/**
 * Generate a pipeline layer widget
 */
export async function generatePipelineLayer(
    pipelineId: string,
    layerDescription: string,
    inputEvents: string[],
    outputEvents: string[]
): Promise<GeneratedWidget> {
    return generateWidget({
        description: layerDescription,
        mode: 'layer',
        pipelineId,
        inputEvents,
        outputEvents,
    });
}

/**
 * Get the current widget protocol version
 */
export function getProtocolVersion(): string {
    return '2.0';
}

/**
 * Get the full widget protocol documentation
 */
export function getWidgetProtocol(): string {
    return WIDGET_PROTOCOL;
}
