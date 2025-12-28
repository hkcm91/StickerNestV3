/**
 * StickerNest v2 - Pipeline Integration for V2 Generator
 * Auto-wiring and connection suggestions for generated widgets
 */

import type { WidgetManifest } from '../../types/manifest';
import type { DraftWidget } from '../../ai/DraftManager';
import { detectCompatiblePorts, extractPorts, type PortDefinition } from '../../runtime/PortCompatibility';

// ============================================
// Types
// ============================================

export interface ConnectionSuggestion {
  id: string;
  direction: 'outgoing' | 'incoming';
  sourceWidgetId: string;
  sourceWidgetName: string;
  sourcePort: PortDefinition;
  targetWidgetId: string;
  targetWidgetName: string;
  targetPort: PortDefinition;
  compatibility: number;
  reason: string;
  description: string;
}

export interface AutoWireResult {
  widgetId: string;
  widgetName: string;
  ports: {
    inputs: PortDefinition[];
    outputs: PortDefinition[];
  };
  suggestions: ConnectionSuggestion[];
  hasCompatibleWidgets: boolean;
}

export interface CanvasWidget {
  id: string;
  manifest: WidgetManifest;
}

// ============================================
// Auto-Wire Functions
// ============================================

/**
 * Analyze a generated widget and find compatible connections
 */
export function analyzeWidgetConnections(
  generatedWidget: DraftWidget,
  canvasWidgets: CanvasWidget[],
  options?: {
    minCompatibility?: number;
    maxSuggestions?: number;
  }
): AutoWireResult {
  const { minCompatibility = 0.3, maxSuggestions = 10 } = options || {};

  // Extract ports from generated widget
  const generatedPorts = extractPorts(generatedWidget.manifest);

  const suggestions: ConnectionSuggestion[] = [];

  // Analyze connections with each canvas widget
  for (const canvasWidget of canvasWidgets) {
    // Skip self
    if (canvasWidget.id === generatedWidget.id) continue;

    // Get compatibility in both directions
    const compatibilities = detectCompatiblePorts(
      generatedWidget.manifest,
      canvasWidget.manifest
    );

    // Process each compatible port pair
    for (const compat of compatibilities) {
      if (compat.score < minCompatibility) continue;
      if (compat.level === 'incompatible') continue;

      // Determine direction (is generated widget source or target?)
      const isOutgoing = generatedPorts.outputs.some(
        p => p.name === compat.output.name || p.id === compat.output.id
      );

      suggestions.push({
        id: `${generatedWidget.id}-${compat.output.name}-${canvasWidget.id}-${compat.input.name}`,
        direction: isOutgoing ? 'outgoing' : 'incoming',
        sourceWidgetId: isOutgoing ? generatedWidget.id : canvasWidget.id,
        sourceWidgetName: isOutgoing ? generatedWidget.manifest.name : canvasWidget.manifest.name,
        sourcePort: compat.output,
        targetWidgetId: isOutgoing ? canvasWidget.id : generatedWidget.id,
        targetWidgetName: isOutgoing ? canvasWidget.manifest.name : generatedWidget.manifest.name,
        targetPort: compat.input,
        compatibility: compat.score,
        reason: compat.reason,
        description: buildConnectionDescription(
          compat.output,
          compat.input,
          isOutgoing ? generatedWidget.manifest.name : canvasWidget.manifest.name,
          isOutgoing ? canvasWidget.manifest.name : generatedWidget.manifest.name
        ),
      });
    }
  }

  // Sort by compatibility score (highest first) and limit
  suggestions.sort((a, b) => b.compatibility - a.compatibility);
  const topSuggestions = suggestions.slice(0, maxSuggestions);

  return {
    widgetId: generatedWidget.id,
    widgetName: generatedWidget.manifest.name,
    ports: generatedPorts,
    suggestions: topSuggestions,
    hasCompatibleWidgets: topSuggestions.length > 0,
  };
}

/**
 * Build a human-readable description of a connection
 */
function buildConnectionDescription(
  outputPort: PortDefinition,
  inputPort: PortDefinition,
  sourceName: string,
  targetName: string
): string {
  const outputLabel = outputPort.description || outputPort.name;
  const inputLabel = inputPort.description || inputPort.name;

  return `Connect "${outputLabel}" from ${sourceName} to "${inputLabel}" on ${targetName}`;
}

/**
 * Group suggestions by target widget for UI display
 */
export function groupSuggestionsByWidget(
  suggestions: ConnectionSuggestion[]
): Map<string, ConnectionSuggestion[]> {
  const grouped = new Map<string, ConnectionSuggestion[]>();

  for (const suggestion of suggestions) {
    const key = suggestion.direction === 'outgoing'
      ? suggestion.targetWidgetId
      : suggestion.sourceWidgetId;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(suggestion);
  }

  return grouped;
}

/**
 * Get compatibility level label
 */
export function getCompatibilityLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 0.8) {
    return { label: 'Excellent', color: '#22c55e' };
  }
  if (score >= 0.6) {
    return { label: 'Good', color: '#84cc16' };
  }
  if (score >= 0.4) {
    return { label: 'Possible', color: '#f59e0b' };
  }
  return { label: 'Weak', color: '#ef4444' };
}

/**
 * Suggest port connections based on common patterns
 */
export function suggestCommonConnections(
  generatedWidget: DraftWidget
): string[] {
  const ports = extractPorts(generatedWidget.manifest);
  const suggestions: string[] = [];

  // Check for common output patterns
  for (const output of ports.outputs) {
    const name = output.name.toLowerCase();
    const type = output.type;

    if (name.includes('tick') || name.includes('timer')) {
      suggestions.push(`This widget outputs "${output.name}" which can drive animations or counters`);
    }
    if (name.includes('click') || name.includes('press')) {
      suggestions.push(`The "${output.name}" event can trigger actions in other widgets`);
    }
    if (type === 'number' && (name.includes('value') || name.includes('count'))) {
      suggestions.push(`Connect "${output.name}" to display widgets or charts`);
    }
    if (type === 'string' && (name.includes('text') || name.includes('message'))) {
      suggestions.push(`The "${output.name}" output can send text to notification or display widgets`);
    }
  }

  // Check for common input patterns
  for (const input of ports.inputs) {
    const name = input.name.toLowerCase();

    if (name.includes('reset') || name.includes('clear')) {
      suggestions.push(`Other widgets can reset this one via the "${input.name}" input`);
    }
    if (name.includes('set') || name.includes('update')) {
      suggestions.push(`Send data to this widget through the "${input.name}" input`);
    }
    if (name.includes('toggle') || name.includes('switch')) {
      suggestions.push(`Button widgets can control this via "${input.name}"`);
    }
  }

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

// ============================================
// Export Singleton Functions
// ============================================

export const PipelineIntegration = {
  analyzeWidgetConnections,
  groupSuggestionsByWidget,
  getCompatibilityLabel,
  suggestCommonConnections,
};

export default PipelineIntegration;
