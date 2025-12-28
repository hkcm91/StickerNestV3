/**
 * StickerNest v2 - Port Compatibility Detection
 * Runtime detection of compatible ports between widgets for AI auto-wiring
 */

import type { WidgetManifest } from '../types/manifest';
import type { CapabilityId } from '../types/capabilities';

// ==================
// Types
// ==================

export type PortDataType =
  | 'event'      // Simple trigger/signal
  | 'string'     // Text data
  | 'number'     // Numeric data
  | 'boolean'    // True/false
  | 'array'      // Array of items
  | 'object'     // Complex object
  | 'any'        // Accepts anything
  | 'color'      // Color value (special string)
  | 'date'       // Date/time
  | 'unknown';   // Cannot determine

export interface PortDefinition {
  /** Port name/ID */
  name: string;
  /** Port data type */
  type: PortDataType;
  /** Description */
  description?: string;
  /** Whether this is an input or output */
  direction: 'input' | 'output';
  /** Schema for complex types */
  schema?: Record<string, unknown>;
  /** Required payload fields */
  requiredFields?: string[];
  /** Optional payload fields */
  optionalFields?: string[];
}

export interface PortCompatibility {
  /** Output port */
  output: PortDefinition;
  /** Input port */
  input: PortDefinition;
  /** Compatibility score (0-1) */
  score: number;
  /** Compatibility level */
  level: 'exact' | 'compatible' | 'convertible' | 'incompatible';
  /** Conversion function needed */
  conversion?: string;
  /** Reason for compatibility/incompatibility */
  reason: string;
}

export interface WidgetPortAnalysis {
  /** Widget ID */
  widgetId: string;
  /** Widget name */
  widgetName: string;
  /** All input ports */
  inputs: PortDefinition[];
  /** All output ports */
  outputs: PortDefinition[];
}

// ==================
// Type Inference
// ==================

/**
 * Infer port data type from manifest port definition
 */
export function inferPortType(portDef: { type?: string; description?: string } | undefined): PortDataType {
  if (!portDef) return 'unknown';

  const typeStr = (portDef.type || '').toLowerCase();
  const desc = (portDef.description || '').toLowerCase();

  // Direct type mapping
  if (typeStr === 'string' || typeStr === 'text') return 'string';
  if (typeStr === 'number' || typeStr === 'int' || typeStr === 'float') return 'number';
  if (typeStr === 'boolean' || typeStr === 'bool') return 'boolean';
  if (typeStr === 'array' || typeStr === 'list') return 'array';
  if (typeStr === 'object' || typeStr === 'json') return 'object';
  if (typeStr === 'event' || typeStr === 'trigger' || typeStr === 'signal') return 'event';
  if (typeStr === 'any' || typeStr === '*') return 'any';
  if (typeStr === 'color' || typeStr === 'hex') return 'color';
  if (typeStr === 'date' || typeStr === 'datetime' || typeStr === 'timestamp') return 'date';

  // Infer from description
  if (desc.includes('text') || desc.includes('string') || desc.includes('message')) return 'string';
  if (desc.includes('number') || desc.includes('count') || desc.includes('value') || desc.includes('progress')) return 'number';
  if (desc.includes('toggle') || desc.includes('enabled') || desc.includes('active')) return 'boolean';
  if (desc.includes('list') || desc.includes('items') || desc.includes('array')) return 'array';
  if (desc.includes('data') || desc.includes('state') || desc.includes('config')) return 'object';
  if (desc.includes('click') || desc.includes('trigger') || desc.includes('press')) return 'event';
  if (desc.includes('color') || desc.includes('rgb') || desc.includes('hex')) return 'color';

  return 'unknown';
}

/**
 * Extract ports from a widget manifest
 * Supports both legacy format (inputs/outputs as objects) and v3 format (io.inputs/outputs as arrays)
 */
export function extractPorts(manifest: WidgetManifest): { inputs: PortDefinition[]; outputs: PortDefinition[] } {
  const inputs: PortDefinition[] = [];
  const outputs: PortDefinition[] = [];

  // Extract from manifest.inputs (legacy v2 format - object with port names as keys)
  if (manifest.inputs && typeof manifest.inputs === 'object' && !Array.isArray(manifest.inputs)) {
    for (const [name, def] of Object.entries(manifest.inputs)) {
      inputs.push({
        name,
        type: inferPortType(def as { type?: string; description?: string }),
        description: (def as { description?: string }).description,
        direction: 'input',
      });
    }
  }

  // Extract from manifest.outputs (legacy v2 format - object with port names as keys)
  if (manifest.outputs && typeof manifest.outputs === 'object' && !Array.isArray(manifest.outputs)) {
    for (const [name, def] of Object.entries(manifest.outputs)) {
      outputs.push({
        name,
        type: inferPortType(def as { type?: string; description?: string }),
        description: (def as { description?: string }).description,
        direction: 'output',
      });
    }
  }

  // Extract from manifest.io (v3 format - arrays of port objects)
  if (manifest.io) {
    type IoPort = string | { id?: string; name?: string; type?: string; description?: string };
    const io = manifest.io as { inputs?: IoPort[]; outputs?: IoPort[] };

    // Process io.inputs
    if (io.inputs && Array.isArray(io.inputs)) {
      for (const port of io.inputs) {
        let portName: string;
        let portType: PortDataType;
        let description: string | undefined;

        if (typeof port === 'string') {
          // Simple string format: just the port name
          portName = port;
          portType = inferTypeFromName(port);
        } else {
          // Object format: { id, name, type, description }
          portName = port.id || port.name || 'unknown';
          portType = port.type ? inferPortType({ type: port.type, description: port.description }) : inferTypeFromName(portName);
          description = port.description;
        }

        if (!inputs.some(p => p.name === portName)) {
          inputs.push({
            name: portName,
            type: portType,
            description,
            direction: 'input',
          });
        }
      }
    }

    // Process io.outputs
    if (io.outputs && Array.isArray(io.outputs)) {
      for (const port of io.outputs) {
        let portName: string;
        let portType: PortDataType;
        let description: string | undefined;

        if (typeof port === 'string') {
          // Simple string format: just the port name
          portName = port;
          portType = inferTypeFromName(port);
        } else {
          // Object format: { id, name, type, description }
          portName = port.id || port.name || 'unknown';
          portType = port.type ? inferPortType({ type: port.type, description: port.description }) : inferTypeFromName(portName);
          description = port.description;
        }

        if (!outputs.some(p => p.name === portName)) {
          outputs.push({
            name: portName,
            type: portType,
            description,
            direction: 'output',
          });
        }
      }
    }
  }

  return { inputs, outputs };
}

/**
 * Infer type from port name using conventions
 */
function inferTypeFromName(name: string): PortDataType {
  const lower = name.toLowerCase();

  // Event patterns
  if (lower.includes('click') || lower.includes('press') || lower.includes('trigger')) return 'event';
  if (lower.endsWith('.started') || lower.endsWith('.stopped') || lower.endsWith('.complete')) return 'event';

  // Number patterns
  if (lower.includes('progress') || lower.includes('value') || lower.includes('count')) return 'number';
  if (lower.includes('tick') || lower.includes('timer')) return 'number';

  // String patterns
  if (lower.includes('text') || lower.includes('message') || lower.includes('content')) return 'string';
  if (lower.includes('title') || lower.includes('label') || lower.includes('name')) return 'string';

  // Boolean patterns
  if (lower.includes('enabled') || lower.includes('active') || lower.includes('visible')) return 'boolean';
  if (lower.startsWith('is') || lower.startsWith('has') || lower.startsWith('can')) return 'boolean';

  // Object patterns
  if (lower.includes('data') || lower.includes('state') || lower.includes('config')) return 'object';

  // Color patterns
  if (lower.includes('color') || lower.includes('rgb')) return 'color';

  return 'unknown';
}

// ==================
// Compatibility Checking
// ==================

/**
 * Type compatibility matrix
 */
const TYPE_COMPATIBILITY: Record<PortDataType, PortDataType[]> = {
  event: ['event', 'any'],
  string: ['string', 'any', 'color'], // color is a string
  number: ['number', 'any', 'boolean'], // numbers can become booleans
  boolean: ['boolean', 'any', 'number'], // booleans can become 0/1
  array: ['array', 'any', 'object'],
  object: ['object', 'any', 'array'],
  any: ['any', 'string', 'number', 'boolean', 'array', 'object', 'event', 'color', 'date'],
  color: ['color', 'string', 'any'],
  date: ['date', 'string', 'number', 'any'],
  unknown: ['any', 'unknown'],
};

/**
 * Check if two types are compatible
 */
export function areTypesCompatible(outputType: PortDataType, inputType: PortDataType): boolean {
  if (outputType === inputType) return true;
  if (inputType === 'any') return true;
  if (outputType === 'any') return true;
  return TYPE_COMPATIBILITY[outputType]?.includes(inputType) || false;
}

/**
 * Calculate compatibility score between an output and input port
 */
export function calculatePortCompatibility(
  output: PortDefinition,
  input: PortDefinition
): PortCompatibility {
  // Check type compatibility
  const typesCompatible = areTypesCompatible(output.type, input.type);

  if (!typesCompatible) {
    return {
      output,
      input,
      score: 0,
      level: 'incompatible',
      reason: `Type mismatch: ${output.type} -> ${input.type}`,
    };
  }

  // Calculate score based on various factors
  let score = 0;
  let level: PortCompatibility['level'] = 'compatible';
  let reason = '';
  let conversion: string | undefined;

  // Exact type match
  if (output.type === input.type) {
    score += 0.5;
    level = 'exact';
    reason = 'Exact type match';
  } else {
    // Type conversion needed
    score += 0.3;
    level = 'convertible';
    reason = `Convertible: ${output.type} -> ${input.type}`;
    conversion = `convert_${output.type}_to_${input.type}`;
  }

  // Name similarity bonus
  const nameSimilarity = calculateNameSimilarity(output.name, input.name);
  score += nameSimilarity * 0.3;
  if (nameSimilarity > 0.7) {
    reason += ', names match';
  }

  // Domain matching bonus (e.g., timer.tick -> timer.setDuration)
  const outputDomain = output.name.split('.')[0];
  const inputDomain = input.name.split('.')[0];
  if (outputDomain === inputDomain) {
    score += 0.2;
    reason += ', same domain';
  }

  return {
    output,
    input,
    score: Math.min(1, score),
    level,
    reason,
    conversion,
  };
}

/**
 * Calculate similarity between two port names
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const a = name1.toLowerCase().replace(/[.-_]/g, '');
  const b = name2.toLowerCase().replace(/[.-_]/g, '');

  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.7;

  // Check for common keywords
  const keywords1 = a.split(/(?=[A-Z])/).map(s => s.toLowerCase());
  const keywords2 = b.split(/(?=[A-Z])/).map(s => s.toLowerCase());
  const common = keywords1.filter(k => keywords2.includes(k));

  if (common.length > 0) {
    return common.length / Math.max(keywords1.length, keywords2.length);
  }

  return 0;
}

// ==================
// Main Detection Function
// ==================

/**
 * Detect all compatible ports between two widgets
 */
export function detectCompatiblePorts(
  widgetA: WidgetManifest,
  widgetB: WidgetManifest
): PortCompatibility[] {
  const portsA = extractPorts(widgetA);
  const portsB = extractPorts(widgetB);

  const compatibilities: PortCompatibility[] = [];

  // A outputs -> B inputs
  for (const output of portsA.outputs) {
    for (const input of portsB.inputs) {
      const compat = calculatePortCompatibility(output, input);
      if (compat.score > 0) {
        compatibilities.push(compat);
      }
    }
  }

  // B outputs -> A inputs
  for (const output of portsB.outputs) {
    for (const input of portsA.inputs) {
      const compat = calculatePortCompatibility(output, input);
      if (compat.score > 0) {
        compatibilities.push(compat);
      }
    }
  }

  // Sort by score descending
  return compatibilities.sort((a, b) => b.score - a.score);
}

/**
 * Get the best compatible connection between two widgets
 */
export function getBestConnection(
  widgetA: WidgetManifest,
  widgetB: WidgetManifest
): PortCompatibility | null {
  const compatibilities = detectCompatiblePorts(widgetA, widgetB);
  return compatibilities[0] || null;
}

/**
 * Analyze a widget's ports for AI auto-wiring
 */
export function analyzeWidgetPorts(
  widgetId: string,
  manifest: WidgetManifest
): WidgetPortAnalysis {
  const { inputs, outputs } = extractPorts(manifest);

  return {
    widgetId,
    widgetName: manifest.name,
    inputs,
    outputs,
  };
}

/**
 * Suggest connections for a newly added widget based on existing widgets
 */
export function suggestConnections(
  newWidget: WidgetManifest,
  existingWidgets: Array<{ id: string; manifest: WidgetManifest }>
): Array<{ widgetId: string; connection: PortCompatibility }> {
  const suggestions: Array<{ widgetId: string; connection: PortCompatibility }> = [];

  for (const existing of existingWidgets) {
    const compatibilities = detectCompatiblePorts(newWidget, existing.manifest);
    const best = compatibilities.find(c => c.score >= 0.5);
    if (best) {
      suggestions.push({
        widgetId: existing.id,
        connection: best,
      });
    }
  }

  return suggestions.sort((a, b) => b.connection.score - a.connection.score);
}

export default {
  detectCompatiblePorts,
  getBestConnection,
  analyzeWidgetPorts,
  suggestConnections,
  extractPorts,
  inferPortType,
  areTypesCompatible,
  calculatePortCompatibility,
};
