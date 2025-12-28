/**
 * StickerNest v2 - Capability Checker
 * Utility for checking widget capabilities at runtime
 */

import type { WidgetManifest } from '../types/manifest';
import type { WidgetCapabilityDeclaration, CapabilityId, CapabilityDefinition } from '../types/capabilities';
import {
  STANDARD_INPUT_CAPABILITIES,
  STANDARD_OUTPUT_CAPABILITIES,
  getStandardCapability,
  parseCapabilityId
} from '../types/capabilities';

// ==================
// Types
// ==================

export interface CapabilityCheck {
  /** Whether the widget has the capability */
  hasCapability: boolean;
  /** The capability definition if found */
  definition?: CapabilityDefinition;
  /** Whether it's a custom (non-standard) capability */
  isCustom: boolean;
  /** Source of the capability declaration */
  source: 'manifest.io' | 'manifest.inputs' | 'manifest.outputs' | 'none';
}

export interface WidgetCapabilities {
  inputs: CapabilityId[];
  outputs: CapabilityId[];
  customInputs: CapabilityDefinition[];
  customOutputs: CapabilityDefinition[];
}

// ==================
// Core Functions
// ==================

/**
 * Extract all capabilities from a widget manifest
 */
export function extractCapabilities(manifest: WidgetManifest): WidgetCapabilities {
  const result: WidgetCapabilities = {
    inputs: [],
    outputs: [],
    customInputs: [],
    customOutputs: [],
  };

  // Check io declaration (v2 style)
  if (manifest.io) {
    result.inputs = manifest.io.inputs || [];
    result.outputs = manifest.io.outputs || [];
    result.customInputs = manifest.io.customInputs || [];
    result.customOutputs = manifest.io.customOutputs || [];
  }

  // Also check legacy inputs/outputs (v1 style)
  if (manifest.inputs) {
    for (const inputName of Object.keys(manifest.inputs)) {
      if (!result.inputs.includes(inputName)) {
        result.inputs.push(inputName);
      }
    }
  }

  if (manifest.outputs) {
    for (const outputName of Object.keys(manifest.outputs)) {
      if (!result.outputs.includes(outputName)) {
        result.outputs.push(outputName);
      }
    }
  }

  return result;
}

/**
 * Check if a widget has a specific input capability
 */
export function hasInputCapability(
  manifest: WidgetManifest | null | undefined,
  capabilityId: CapabilityId
): CapabilityCheck {
  if (!manifest) {
    return { hasCapability: false, isCustom: false, source: 'none' };
  }

  const caps = extractCapabilities(manifest);

  // Check standard capabilities
  if (caps.inputs.includes(capabilityId)) {
    const definition = getStandardCapability(capabilityId);
    return {
      hasCapability: true,
      definition,
      isCustom: !definition,
      source: manifest.io ? 'manifest.io' : 'manifest.inputs',
    };
  }

  // Check custom capabilities
  const customDef = caps.customInputs.find(c => c.id === capabilityId);
  if (customDef) {
    return {
      hasCapability: true,
      definition: customDef,
      isCustom: true,
      source: 'manifest.io',
    };
  }

  // Check legacy inputs object
  if (manifest.inputs && capabilityId in manifest.inputs) {
    return {
      hasCapability: true,
      isCustom: true,
      source: 'manifest.inputs',
    };
  }

  return { hasCapability: false, isCustom: false, source: 'none' };
}

/**
 * Check if a widget has a specific output capability
 */
export function hasOutputCapability(
  manifest: WidgetManifest | null | undefined,
  capabilityId: CapabilityId
): CapabilityCheck {
  if (!manifest) {
    return { hasCapability: false, isCustom: false, source: 'none' };
  }

  const caps = extractCapabilities(manifest);

  // Check standard capabilities
  if (caps.outputs.includes(capabilityId)) {
    const definition = getStandardCapability(capabilityId);
    return {
      hasCapability: true,
      definition,
      isCustom: !definition,
      source: manifest.io ? 'manifest.io' : 'manifest.outputs',
    };
  }

  // Check custom capabilities
  const customDef = caps.customOutputs.find(c => c.id === capabilityId);
  if (customDef) {
    return {
      hasCapability: true,
      definition: customDef,
      isCustom: true,
      source: 'manifest.io',
    };
  }

  // Check legacy outputs object
  if (manifest.outputs && capabilityId in manifest.outputs) {
    return {
      hasCapability: true,
      isCustom: true,
      source: 'manifest.outputs',
    };
  }

  return { hasCapability: false, isCustom: false, source: 'none' };
}

/**
 * Check if a widget has a capability (input or output)
 */
export function hasCapability(
  manifest: WidgetManifest | null | undefined,
  capabilityId: CapabilityId
): boolean {
  return hasInputCapability(manifest, capabilityId).hasCapability ||
         hasOutputCapability(manifest, capabilityId).hasCapability;
}

/**
 * Check if a widget can receive a specific event type
 */
export function canReceive(
  manifest: WidgetManifest | null | undefined,
  eventType: string
): boolean {
  return hasInputCapability(manifest, eventType).hasCapability;
}

/**
 * Check if a widget can emit a specific event type
 */
export function canEmit(
  manifest: WidgetManifest | null | undefined,
  eventType: string
): boolean {
  return hasOutputCapability(manifest, eventType).hasCapability;
}

/**
 * Get all input capabilities a widget supports
 */
export function getInputCapabilities(manifest: WidgetManifest | null | undefined): CapabilityId[] {
  if (!manifest) return [];
  return extractCapabilities(manifest).inputs;
}

/**
 * Get all output capabilities a widget supports
 */
export function getOutputCapabilities(manifest: WidgetManifest | null | undefined): CapabilityId[] {
  if (!manifest) return [];
  return extractCapabilities(manifest).outputs;
}

/**
 * Find compatible connections between two widgets
 */
export function findCompatibleConnections(
  sourceManifest: WidgetManifest | null | undefined,
  targetManifest: WidgetManifest | null | undefined
): Array<{ output: CapabilityId; input: CapabilityId; confidence: number }> {
  if (!sourceManifest || !targetManifest) return [];

  const sourceOutputs = getOutputCapabilities(sourceManifest);
  const targetInputs = getInputCapabilities(targetManifest);
  const connections: Array<{ output: CapabilityId; input: CapabilityId; confidence: number }> = [];

  for (const output of sourceOutputs) {
    for (const input of targetInputs) {
      const { domain: outDomain, action: outAction } = parseCapabilityId(output);
      const { domain: inDomain, action: inAction } = parseCapabilityId(input);

      // Exact match
      if (output === input) {
        connections.push({ output, input, confidence: 1.0 });
        continue;
      }

      // Same domain
      if (outDomain === inDomain) {
        // Check for complementary actions (e.g., text.changed -> text.set)
        if (
          (outAction.includes('changed') && inAction === 'set') ||
          (outAction.includes('completed') && inAction === 'start') ||
          (outAction === 'tick' && inAction === 'setDuration')
        ) {
          connections.push({ output, input, confidence: 0.8 });
          continue;
        }
        connections.push({ output, input, confidence: 0.5 });
      }

      // Generic data flow (any data.changed -> data.set)
      if (outAction.includes('changed') && inAction === 'set') {
        connections.push({ output, input, confidence: 0.4 });
      }
    }
  }

  // Sort by confidence
  return connections.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Suggest capabilities a widget might want based on its type
 */
export function suggestCapabilities(
  manifest: WidgetManifest | null | undefined
): { inputs: CapabilityId[]; outputs: CapabilityId[] } {
  if (!manifest) return { inputs: [], outputs: [] };

  const current = extractCapabilities(manifest);
  const suggestions: { inputs: CapabilityId[]; outputs: CapabilityId[] } = {
    inputs: [],
    outputs: [],
  };

  // Analyze manifest name/description for suggestions
  const text = `${manifest.name} ${manifest.description || ''}`.toLowerCase();

  // Text widgets
  if (text.includes('text') || text.includes('label') || text.includes('display')) {
    if (!current.inputs.includes('text.set')) suggestions.inputs.push('text.set');
    if (!current.outputs.includes('text.changed')) suggestions.outputs.push('text.changed');
  }

  // Timer widgets
  if (text.includes('timer') || text.includes('countdown') || text.includes('stopwatch')) {
    if (!current.inputs.includes('timer.start')) suggestions.inputs.push('timer.start');
    if (!current.inputs.includes('timer.pause')) suggestions.inputs.push('timer.pause');
    if (!current.inputs.includes('timer.reset')) suggestions.inputs.push('timer.reset');
    if (!current.outputs.includes('timer.tick')) suggestions.outputs.push('timer.tick');
    if (!current.outputs.includes('timer.complete')) suggestions.outputs.push('timer.complete');
  }

  // Button widgets
  if (text.includes('button') || text.includes('click') || text.includes('trigger')) {
    if (!current.outputs.includes('button.pressed')) suggestions.outputs.push('button.pressed');
  }

  // Animation widgets
  if (text.includes('animation') || text.includes('lottie') || text.includes('animate')) {
    if (!current.inputs.includes('animation.play')) suggestions.inputs.push('animation.play');
    if (!current.inputs.includes('animation.pause')) suggestions.inputs.push('animation.pause');
    if (!current.outputs.includes('animation.completed')) suggestions.outputs.push('animation.completed');
  }

  // All widgets should support ready
  if (!current.outputs.includes('ready')) suggestions.outputs.push('ready');

  return suggestions;
}

/**
 * Validate capability declarations in a manifest
 */
export function validateCapabilities(manifest: WidgetManifest): string[] {
  const errors: string[] = [];
  const caps = extractCapabilities(manifest);

  // Check for duplicate capabilities
  const allInputs = new Set<string>();
  for (const input of caps.inputs) {
    if (allInputs.has(input)) {
      errors.push(`Duplicate input capability: ${input}`);
    }
    allInputs.add(input);
  }

  const allOutputs = new Set<string>();
  for (const output of caps.outputs) {
    if (allOutputs.has(output)) {
      errors.push(`Duplicate output capability: ${output}`);
    }
    allOutputs.add(output);
  }

  // Validate custom capability definitions
  for (const custom of [...caps.customInputs, ...caps.customOutputs]) {
    if (!custom.id) {
      errors.push('Custom capability missing ID');
    }
    if (!custom.name) {
      errors.push(`Custom capability ${custom.id} missing name`);
    }
  }

  return errors;
}

export default {
  extractCapabilities,
  hasInputCapability,
  hasOutputCapability,
  hasCapability,
  canReceive,
  canEmit,
  getInputCapabilities,
  getOutputCapabilities,
  findCompatibleConnections,
  suggestCapabilities,
  validateCapabilities,
};
