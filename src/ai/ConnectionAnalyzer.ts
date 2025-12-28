/**
 * StickerNest v2 - Connection Analyzer
 * Analyzes widget I/O schemas for compatibility and suggests connections
 */

import type { WidgetManifest, WidgetInputSchema, WidgetOutputSchema } from '../types/manifest';

export interface ConnectionSuggestion {
  /** Source widget instance ID */
  fromWidgetId: string;
  /** Source output port name */
  fromPort: string;
  /** Target widget instance ID */
  toWidgetId: string;
  /** Target input port name */
  toPort: string;
  /** Compatibility score 0-1 */
  compatibility: number;
  /** Human-readable description */
  description: string;
  /** Connection type */
  type: 'direct' | 'transform' | 'event';
  /** Suggested transformation if types don't match directly */
  transform?: string;
}

export interface WidgetWithManifest {
  instanceId: string;
  manifest: WidgetManifest;
}

/**
 * Type compatibility matrix
 * Maps source types to compatible target types with compatibility scores
 */
const TYPE_COMPATIBILITY: Record<string, Record<string, number>> = {
  'string': { 'string': 1.0, 'any': 0.9, 'text': 1.0 },
  'number': { 'number': 1.0, 'any': 0.9, 'string': 0.7, 'int': 0.9, 'float': 0.9 },
  'boolean': { 'boolean': 1.0, 'any': 0.9, 'string': 0.6 },
  'object': { 'object': 1.0, 'any': 0.9, 'json': 1.0 },
  'array': { 'array': 1.0, 'any': 0.9, 'list': 1.0 },
  'event': { 'event': 1.0, 'any': 0.8, 'trigger': 0.9 },
  'any': { 'any': 1.0, 'string': 0.8, 'number': 0.8, 'object': 0.8, 'array': 0.8 },
  'color': { 'color': 1.0, 'string': 0.8, 'any': 0.7 },
  'image': { 'image': 1.0, 'url': 0.9, 'string': 0.7, 'any': 0.6 },
  'url': { 'url': 1.0, 'string': 0.9, 'any': 0.7 },
  'json': { 'json': 1.0, 'object': 0.9, 'string': 0.7, 'any': 0.8 },
};

/**
 * Get compatibility score between two types
 */
function getTypeCompatibility(sourceType: string, targetType: string): number {
  const sourceLower = sourceType.toLowerCase();
  const targetLower = targetType.toLowerCase();
  
  // Exact match
  if (sourceLower === targetLower) return 1.0;
  
  // Check compatibility matrix
  if (TYPE_COMPATIBILITY[sourceLower]?.[targetLower] !== undefined) {
    return TYPE_COMPATIBILITY[sourceLower][targetLower];
  }
  
  // Check reverse (some types are bidirectionally compatible)
  if (TYPE_COMPATIBILITY[targetLower]?.[sourceLower] !== undefined) {
    return TYPE_COMPATIBILITY[targetLower][sourceLower] * 0.9;
  }
  
  // Default low compatibility for unknown combinations
  return 0.3;
}

/**
 * Analyze semantic compatibility based on names and descriptions
 */
function getSemanticCompatibility(
  output: { name: string; schema: WidgetOutputSchema },
  input: { name: string; schema: WidgetInputSchema }
): number {
  const outputName = output.name.toLowerCase();
  const inputName = input.name.toLowerCase();
  const outputDesc = (output.schema.description || '').toLowerCase();
  const inputDesc = (input.schema.description || '').toLowerCase();
  
  let score = 0;
  
  // Exact name match
  if (outputName === inputName) {
    score += 0.5;
  } else {
    // Partial name match
    if (outputName.includes(inputName) || inputName.includes(outputName)) {
      score += 0.3;
    }
    
    // Common patterns
    const patterns = [
      ['value', 'data', 'input', 'output'],
      ['click', 'trigger', 'action', 'event'],
      ['color', 'colour', 'hue'],
      ['text', 'string', 'message', 'content'],
      ['number', 'count', 'amount', 'quantity'],
      ['image', 'picture', 'photo', 'media'],
      ['result', 'output', 'response'],
    ];
    
    for (const group of patterns) {
      const outputMatches = group.some(p => outputName.includes(p));
      const inputMatches = group.some(p => inputName.includes(p));
      if (outputMatches && inputMatches) {
        score += 0.2;
        break;
      }
    }
  }
  
  // Description similarity (simple check)
  if (outputDesc && inputDesc) {
    const outputWords = new Set(outputDesc.split(/\s+/));
    const inputWords = new Set(inputDesc.split(/\s+/));
    let commonWords = 0;
    for (const word of outputWords) {
      if (inputWords.has(word) && word.length > 3) {
        commonWords++;
      }
    }
    score += Math.min(commonWords * 0.1, 0.3);
  }
  
  return Math.min(score, 1.0);
}

/**
 * Generate description for a connection suggestion
 */
function generateDescription(
  fromManifest: WidgetManifest,
  toManifest: WidgetManifest,
  outputName: string,
  inputName: string,
  compatibility: number
): string {
  const from = fromManifest.name || fromManifest.id;
  const to = toManifest.name || toManifest.id;
  
  if (compatibility > 0.8) {
    return `Connect ${from}'s ${outputName} directly to ${to}'s ${inputName}`;
  } else if (compatibility > 0.5) {
    return `${from}'s ${outputName} is compatible with ${to}'s ${inputName} (may need type conversion)`;
  } else {
    return `${from}'s ${outputName} might work with ${to}'s ${inputName} (low compatibility)`;
  }
}

/**
 * Analyze connections between a source widget and target widgets
 */
export async function analyzeConnections(
  sourceManifest: WidgetManifest,
  targetWidgets: WidgetWithManifest[],
  options?: {
    minCompatibility?: number;
    maxSuggestions?: number;
  }
): Promise<ConnectionSuggestion[]> {
  const { minCompatibility = 0.3, maxSuggestions = 20 } = options || {};
  const suggestions: ConnectionSuggestion[] = [];
  
  const sourceOutputs = Object.entries(sourceManifest.outputs || {});
  
  // For each target widget
  for (const target of targetWidgets) {
    const targetInputs = Object.entries(target.manifest.inputs || {});
    
    // For each output -> input combination
    for (const [outputName, outputSchema] of sourceOutputs) {
      for (const [inputName, inputSchema] of targetInputs) {
        // Calculate type compatibility
        const typeCompat = getTypeCompatibility(
          outputSchema.type,
          inputSchema.type
        );
        
        // Calculate semantic compatibility
        const semanticCompat = getSemanticCompatibility(
          { name: outputName, schema: outputSchema },
          { name: inputName, schema: inputSchema }
        );
        
        // Combined score (weighted)
        const compatibility = typeCompat * 0.6 + semanticCompat * 0.4;
        
        if (compatibility >= minCompatibility) {
          suggestions.push({
            fromWidgetId: 'source', // Will be replaced by caller
            fromPort: outputName,
            toWidgetId: target.instanceId,
            toPort: inputName,
            compatibility,
            description: generateDescription(
              sourceManifest,
              target.manifest,
              outputName,
              inputName,
              compatibility
            ),
            type: outputSchema.type === 'event' ? 'event' : 
                  typeCompat === 1.0 ? 'direct' : 'transform',
            transform: typeCompat < 0.9 && typeCompat >= 0.5 
              ? `Convert ${outputSchema.type} to ${inputSchema.type}` 
              : undefined,
          });
        }
      }
    }
    
    // Also check reverse connections (target outputs -> source inputs)
    const sourceInputs = Object.entries(sourceManifest.inputs || {});
    const targetOutputs = Object.entries(target.manifest.outputs || {});
    
    for (const [outputName, outputSchema] of targetOutputs) {
      for (const [inputName, inputSchema] of sourceInputs) {
        const typeCompat = getTypeCompatibility(
          outputSchema.type,
          inputSchema.type
        );
        
        const semanticCompat = getSemanticCompatibility(
          { name: outputName, schema: outputSchema },
          { name: inputName, schema: inputSchema }
        );
        
        const compatibility = typeCompat * 0.6 + semanticCompat * 0.4;
        
        if (compatibility >= minCompatibility) {
          suggestions.push({
            fromWidgetId: target.instanceId,
            fromPort: outputName,
            toWidgetId: 'source', // Will be replaced by caller
            toPort: inputName,
            compatibility,
            description: generateDescription(
              target.manifest,
              sourceManifest,
              outputName,
              inputName,
              compatibility
            ),
            type: outputSchema.type === 'event' ? 'event' : 
                  typeCompat === 1.0 ? 'direct' : 'transform',
            transform: typeCompat < 0.9 && typeCompat >= 0.5 
              ? `Convert ${outputSchema.type} to ${inputSchema.type}` 
              : undefined,
          });
        }
      }
    }
  }
  
  // Sort by compatibility (highest first) and limit results
  return suggestions
    .sort((a, b) => b.compatibility - a.compatibility)
    .slice(0, maxSuggestions);
}

/**
 * Use AI to suggest additional connections based on widget purposes
 */
export async function analyzeConnectionsWithAI(
  sourceManifest: WidgetManifest,
  targetWidgets: WidgetWithManifest[],
  _aiPrompt?: string
): Promise<ConnectionSuggestion[]> {
  // First get basic analysis
  const basicSuggestions = await analyzeConnections(sourceManifest, targetWidgets);
  
  // AI enhancement would go here
  // For now, return basic suggestions
  // TODO: Integrate with WidgetPipelineAI for smarter suggestions
  
  return basicSuggestions;
}

/**
 * Validate a proposed connection
 */
export function validateConnection(
  fromManifest: WidgetManifest,
  fromPort: string,
  toManifest: WidgetManifest,
  toPort: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if ports exist
  const output = fromManifest.outputs?.[fromPort];
  const input = toManifest.inputs?.[toPort];
  
  if (!output) {
    errors.push(`Output port "${fromPort}" not found in source widget`);
  }
  
  if (!input) {
    errors.push(`Input port "${toPort}" not found in target widget`);
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  // Check type compatibility
  const compatibility = getTypeCompatibility(output!.type, input!.type);
  
  if (compatibility < 0.3) {
    errors.push(`Incompatible types: ${output!.type} → ${input!.type}`);
  } else if (compatibility < 0.7) {
    warnings.push(`Type mismatch may require conversion: ${output!.type} → ${input!.type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  analyzeConnections,
  analyzeConnectionsWithAI,
  validateConnection,
  getTypeCompatibility,
};

