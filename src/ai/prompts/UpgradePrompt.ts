/**
 * StickerNest v2 - Widget Upgrade Prompts
 * Prompts for AI-powered widget evolution and capability enhancement
 */

import type { WidgetManifest } from '../../types/manifest';
import type { CapabilityId, CapabilityDefinition } from '../../types/capabilities';
import { getStandardCapability } from '../../types/capabilities';

/**
 * System prompt for widget upgrades
 */
export const WIDGET_UPGRADE_SYSTEM_PROMPT = `You are an expert at enhancing StickerNest widgets.

## Your Role
Modify existing widgets to add new capabilities while:
1. Preserving all existing functionality
2. Following the WidgetAPI protocol exactly
3. Maintaining code quality and style
4. Adding only what's necessary

## Upgrade Rules
1. NEVER remove existing features
2. NEVER change existing event names
3. Keep the same visual style
4. Add new handlers for new capabilities
5. Update the manifest to declare new inputs/outputs

## WidgetAPI Protocol
\`\`\`javascript
// Emit events
window.WidgetAPI.emitEvent({
  type: 'event-name',
  scope: 'canvas',
  payload: { /* data */ }
});

// Listen for events
window.WidgetAPI.onEvent('*', (event) => {
  if (event.type === 'some-event') {
    // Handle
  }
});
\`\`\`

## Response Format
Return JSON with:
- manifest: Updated manifest with new capabilities
- html: Updated HTML with new functionality
- changes: Array of changes made`;

/**
 * Generate upgrade prompt for adding input capabilities
 */
export function generateAddInputsPrompt(
  manifest: WidgetManifest,
  html: string,
  inputsToAdd: CapabilityId[]
): string {
  const inputDescriptions = inputsToAdd.map(id => {
    const cap = getStandardCapability(id);
    return cap 
      ? `- ${id}: ${cap.description} (payload: ${JSON.stringify(cap.payload || {})})`
      : `- ${id}: Custom input capability`;
  }).join('\n');

  return `## Add Input Capabilities to Widget

### Widget Info
- Name: ${manifest.name}
- ID: ${manifest.id}
- Current inputs: ${manifest.inputs ? Object.keys(manifest.inputs).join(', ') : 'none'}

### Inputs to Add
${inputDescriptions}

### Current HTML
\`\`\`html
${html}
\`\`\`

### Instructions
1. Add event listeners for each new input
2. Implement appropriate behavior for each input type
3. Update the manifest.inputs with new capabilities
4. Return the updated manifest and HTML

### Example Input Handler
\`\`\`javascript
window.WidgetAPI.onEvent('*', (event) => {
  switch(event.type) {
    case 'data.set':
      // Update widget with new data
      handleDataSet(event.payload);
      break;
    case 'visibility.toggle':
      // Toggle visibility
      handleVisibilityToggle(event.payload);
      break;
  }
});
\`\`\``;
}

/**
 * Generate upgrade prompt for adding output capabilities
 */
export function generateAddOutputsPrompt(
  manifest: WidgetManifest,
  html: string,
  outputsToAdd: CapabilityId[]
): string {
  const outputDescriptions = outputsToAdd.map(id => {
    const cap = getStandardCapability(id);
    return cap 
      ? `- ${id}: ${cap.description} (payload: ${JSON.stringify(cap.payload || {})})`
      : `- ${id}: Custom output capability`;
  }).join('\n');

  return `## Add Output Capabilities to Widget

### Widget Info
- Name: ${manifest.name}
- ID: ${manifest.id}
- Current outputs: ${manifest.outputs ? Object.keys(manifest.outputs).join(', ') : 'none'}

### Outputs to Add
${outputDescriptions}

### Current HTML
\`\`\`html
${html}
\`\`\`

### Instructions
1. Identify appropriate places to emit each new output
2. Add emitEvent calls at the right moments
3. Update the manifest.outputs with new capabilities
4. Return the updated manifest and HTML

### Example Output Emission
\`\`\`javascript
// Emit when state changes
function onStateChange(newState) {
  window.WidgetAPI.emitEvent({
    type: 'state.changed',
    scope: 'canvas',
    payload: { state: newState }
  });
}

// Emit on user action
button.onclick = () => {
  window.WidgetAPI.emitEvent({
    type: 'button.clicked',
    scope: 'canvas',
    payload: { buttonId: 'my-button', timestamp: Date.now() }
  });
};
\`\`\``;
}

/**
 * Generate prompt for connecting two widgets
 */
export function generateConnectionUpgradePrompt(
  sourceManifest: WidgetManifest,
  sourceHtml: string,
  targetManifest: WidgetManifest,
  targetHtml: string,
  desiredConnection: {
    sourceOutput: CapabilityId;
    targetInput: CapabilityId;
  }
): string {
  return `## Connect Two Widgets

### Source Widget
- Name: ${sourceManifest.name}
- ID: ${sourceManifest.id}
- Has output "${desiredConnection.sourceOutput}": ${sourceManifest.outputs?.[desiredConnection.sourceOutput] ? 'YES' : 'NO'}

### Target Widget
- Name: ${targetManifest.name}
- ID: ${targetManifest.id}
- Has input "${desiredConnection.targetInput}": ${targetManifest.inputs?.[desiredConnection.targetInput] ? 'YES' : 'NO'}

### Desired Connection
Source emits: ${desiredConnection.sourceOutput}
Target receives: ${desiredConnection.targetInput}

### Source Widget HTML
\`\`\`html
${sourceHtml.slice(0, 3000)}${sourceHtml.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

### Target Widget HTML
\`\`\`html
${targetHtml.slice(0, 3000)}${targetHtml.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

### Instructions
1. If source doesn't have the output, add it
2. If target doesn't have the input, add it
3. Ensure payload formats are compatible
4. Return both updated widgets

### Response Format
\`\`\`json
{
  "source": {
    "manifest": { ... },
    "html": "...",
    "changes": ["Added output xyz"]
  },
  "target": {
    "manifest": { ... },
    "html": "...",
    "changes": ["Added input handler for xyz"]
  }
}
\`\`\``;
}

/**
 * Generate prompt for analyzing widget capabilities
 */
export function generateCapabilityAnalysisPrompt(
  manifest: WidgetManifest,
  html: string
): string {
  return `## Analyze Widget Capabilities

### Widget Info
- Name: ${manifest.name}
- ID: ${manifest.id}
- Description: ${manifest.description || 'N/A'}

### Current Declared Capabilities
Inputs: ${manifest.inputs ? JSON.stringify(manifest.inputs, null, 2) : 'none'}
Outputs: ${manifest.outputs ? JSON.stringify(manifest.outputs, null, 2) : 'none'}

### Widget HTML
\`\`\`html
${html}
\`\`\`

### Analysis Tasks
1. List all events the widget actually emits (look for emitEvent calls)
2. List all events the widget actually handles (look for onEvent handlers)
3. Identify undeclared capabilities (in code but not manifest)
4. Suggest additional capabilities that would make sense for this widget type
5. Identify potential integration points with other widgets

### Response Format
\`\`\`json
{
  "actualOutputs": ["event1", "event2"],
  "actualInputs": ["event3", "event4"],
  "undeclaredOutputs": ["event1"],
  "undeclaredInputs": [],
  "suggestedOutputs": [
    { "id": "state.changed", "reason": "Would allow other widgets to react to state changes" }
  ],
  "suggestedInputs": [
    { "id": "data.set", "reason": "Would allow data injection from data sources" }
  ],
  "integrationNotes": "This widget would pair well with timers or data fetchers"
}
\`\`\``;
}

/**
 * Generate diff-friendly upgrade prompt
 */
export function generateMinimalUpgradePrompt(
  manifest: WidgetManifest,
  html: string,
  changes: string[]
): string {
  return `## Minimal Widget Upgrade

### Widget: ${manifest.name} (${manifest.id})

### Changes Required
${changes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### Current HTML
\`\`\`html
${html}
\`\`\`

### Instructions
Make ONLY the specified changes. Do not:
- Refactor existing code
- Change styling
- Add unrelated features
- Modify event names

Return the minimal diff needed:
\`\`\`json
{
  "manifestChanges": {
    "inputs": { "newInput": { ... } }
  },
  "htmlChanges": [
    {
      "type": "insert",
      "after": "// existing code",
      "code": "// new code"
    }
  ]
}
\`\`\``;
}

export default {
  WIDGET_UPGRADE_SYSTEM_PROMPT,
  generateAddInputsPrompt,
  generateAddOutputsPrompt,
  generateConnectionUpgradePrompt,
  generateCapabilityAnalysisPrompt,
  generateMinimalUpgradePrompt
};

