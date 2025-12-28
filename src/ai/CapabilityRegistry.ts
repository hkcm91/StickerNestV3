/**
 * StickerNest v2 - Capability Registry
 * Global registry of all known capabilities, with scanning and validation
 * Used by AI to understand widget I/O and propose connections/upgrades
 */

import type { WidgetManifest } from '../types/manifest';
import type {
  CapabilityDefinition,
  CapabilityId,
  CapabilityScanResult,
  CapabilityMatch,
  CapabilityGapAnalysis,
  WidgetUpgrade,
  WidgetCapabilityDeclaration,
} from '../types/capabilities';
import {
  STANDARD_CAPABILITIES,
  STANDARD_INPUT_CAPABILITIES,
  STANDARD_OUTPUT_CAPABILITIES,
  getStandardCapability,
  isStandardCapability,
  areCapabilitiesCompatible,
  parseCapabilityId,
} from '../types/capabilities';
import type { EntityType } from '../types/entities';

/**
 * CapabilityRegistry - Central registry for all capabilities
 */
export class CapabilityRegistry {
  /** All registered capabilities (standard + custom) */
  private capabilities: Map<CapabilityId, CapabilityDefinition> = new Map();
  
  /** Widget manifests indexed by widget ID */
  private widgetManifests: Map<string, WidgetManifest> = new Map();
  
  /** Scan results cache */
  private scanCache: Map<string, CapabilityScanResult> = new Map();
  
  constructor() {
    // Initialize with standard capabilities
    this.registerStandardCapabilities();
  }

  // ==================
  // Registration
  // ==================

  /**
   * Register standard capabilities
   */
  private registerStandardCapabilities(): void {
    STANDARD_CAPABILITIES.forEach(cap => {
      this.capabilities.set(cap.id, cap);
    });
  }

  /**
   * Register a custom capability
   */
  registerCapability(capability: CapabilityDefinition): void {
    this.capabilities.set(capability.id, capability);
  }

  /**
   * Register a widget manifest
   */
  registerWidget(manifest: WidgetManifest): void {
    this.widgetManifests.set(manifest.id, manifest);
    
    // Register any custom capabilities from the manifest
    if (manifest.io?.customInputs) {
      manifest.io.customInputs.forEach(cap => this.registerCapability(cap));
    }
    if (manifest.io?.customOutputs) {
      manifest.io.customOutputs.forEach(cap => this.registerCapability(cap));
    }
    
    // Invalidate scan cache
    this.scanCache.delete(manifest.id);
  }

  /**
   * Unregister a widget
   */
  unregisterWidget(widgetId: string): void {
    this.widgetManifests.delete(widgetId);
    this.scanCache.delete(widgetId);
  }

  // ==================
  // Queries
  // ==================

  /**
   * Get a capability by ID
   */
  getCapability(id: CapabilityId): CapabilityDefinition | undefined {
    return this.capabilities.get(id);
  }

  /**
   * Get all registered capabilities
   */
  getAllCapabilities(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capabilities by direction
   */
  getCapabilitiesByDirection(direction: 'input' | 'output'): CapabilityDefinition[] {
    return this.getAllCapabilities().filter(c => c.direction === direction);
  }

  /**
   * Get capabilities by entity type
   */
  getCapabilitiesByEntityType(entityType: EntityType): CapabilityDefinition[] {
    return this.getAllCapabilities().filter(c => c.entityTypes?.includes(entityType));
  }

  /**
   * Get a widget manifest
   */
  getWidgetManifest(widgetId: string): WidgetManifest | undefined {
    return this.widgetManifests.get(widgetId);
  }

  /**
   * Get all registered widgets
   */
  getAllWidgets(): WidgetManifest[] {
    return Array.from(this.widgetManifests.values());
  }

  // ==================
  // Scanning
  // ==================

  /**
   * Scan a widget's capabilities
   */
  scanWidget(widgetId: string): CapabilityScanResult | null {
    // Check cache
    if (this.scanCache.has(widgetId)) {
      return this.scanCache.get(widgetId)!;
    }

    const manifest = this.widgetManifests.get(widgetId);
    if (!manifest) {
      return null;
    }

    // Extract capabilities from manifest
    const inputs: CapabilityId[] = [];
    const outputs: CapabilityId[] = [];
    const entityTypes: EntityType[] = [];

    // From explicit io declaration
    if (manifest.io) {
      inputs.push(...manifest.io.inputs);
      outputs.push(...manifest.io.outputs);
      if (manifest.io.entityTypes) {
        entityTypes.push(...manifest.io.entityTypes);
      }
    }

    // Infer from manifest inputs/outputs (legacy format)
    Object.keys(manifest.inputs).forEach(inputName => {
      // Try to map to standard capability
      const mappedCap = this.mapInputToCapability(inputName, manifest.inputs[inputName]);
      if (mappedCap && !inputs.includes(mappedCap)) {
        inputs.push(mappedCap);
      }
    });

    Object.keys(manifest.outputs).forEach(outputName => {
      // Try to map to standard capability
      const mappedCap = this.mapOutputToCapability(outputName, manifest.outputs[outputName]);
      if (mappedCap && !outputs.includes(mappedCap)) {
        outputs.push(mappedCap);
      }
    });

    // Suggest missing capabilities
    const suggestedInputs = this.suggestMissingInputs(inputs, entityTypes);
    const suggestedOutputs = this.suggestMissingOutputs(outputs, entityTypes);

    const result: CapabilityScanResult = {
      widgetId,
      widgetName: manifest.name,
      inputs,
      outputs,
      entityTypes,
      suggestedInputs: suggestedInputs.length > 0 ? suggestedInputs : undefined,
      suggestedOutputs: suggestedOutputs.length > 0 ? suggestedOutputs : undefined,
    };

    // Cache result
    this.scanCache.set(widgetId, result);

    return result;
  }

  /**
   * Scan all registered widgets
   */
  scanAllWidgets(): CapabilityScanResult[] {
    return this.getAllWidgets()
      .map(m => this.scanWidget(m.id))
      .filter((r): r is CapabilityScanResult => r !== null);
  }

  /**
   * Find widgets with specific input capability
   */
  findWidgetsWithInput(capabilityId: CapabilityId): CapabilityScanResult[] {
    return this.scanAllWidgets().filter(r => r.inputs.includes(capabilityId));
  }

  /**
   * Find widgets with specific output capability
   */
  findWidgetsWithOutput(capabilityId: CapabilityId): CapabilityScanResult[] {
    return this.scanAllWidgets().filter(r => r.outputs.includes(capabilityId));
  }

  // ==================
  // Compatibility Analysis
  // ==================

  /**
   * Find compatible connections between two widgets
   */
  findCompatibleConnections(
    sourceWidgetId: string,
    targetWidgetId: string
  ): CapabilityMatch[] {
    const sourceScan = this.scanWidget(sourceWidgetId);
    const targetScan = this.scanWidget(targetWidgetId);

    if (!sourceScan || !targetScan) {
      return [];
    }

    const matches: CapabilityMatch[] = [];

    // Check each source output against each target input
    for (const output of sourceScan.outputs) {
      for (const input of targetScan.inputs) {
        const match = areCapabilitiesCompatible(output, input);
        if (match.confidence > 0.3) {
          matches.push(match);
        }
      }
    }

    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze capability gaps for a proposed connection
   */
  analyzeCapabilityGap(
    sourceWidgetId: string,
    sourceOutput: CapabilityId,
    targetWidgetId: string,
    targetInput: CapabilityId
  ): CapabilityGapAnalysis {
    const sourceScan = this.scanWidget(sourceWidgetId);
    const targetScan = this.scanWidget(targetWidgetId);

    const result: CapabilityGapAnalysis = {
      connection: {
        sourceWidget: sourceWidgetId,
        sourceOutput,
        targetWidget: targetWidgetId,
        targetInput,
      },
      possible: false,
    };

    if (!sourceScan || !targetScan) {
      return result;
    }

    // Check if source has the output
    const hasOutput = sourceScan.outputs.includes(sourceOutput);
    if (!hasOutput) {
      result.missingSource = [sourceOutput];
    }

    // Check if target has the input
    const hasInput = targetScan.inputs.includes(targetInput);
    if (!hasInput) {
      result.missingTarget = [targetInput];
    }

    // If both exist, check compatibility
    if (hasOutput && hasInput) {
      const match = areCapabilitiesCompatible(sourceOutput, targetInput);
      result.possible = match.typeCompatible;
      if (!match.typeCompatible && match.conversion) {
        // Connection possible with conversion
        result.possible = true;
      }
    }

    // Generate suggested upgrades if connection not possible
    if (!result.possible) {
      result.suggestedUpgrades = this.generateUpgradeSuggestions(
        sourceWidgetId,
        sourceScan,
        sourceOutput,
        targetWidgetId,
        targetScan,
        targetInput
      );
    }

    return result;
  }

  /**
   * Find all possible connections for a widget
   */
  findAllPossibleConnections(widgetId: string): {
    asSource: Array<{ targetWidget: string; matches: CapabilityMatch[] }>;
    asTarget: Array<{ sourceWidget: string; matches: CapabilityMatch[] }>;
  } {
    const result = {
      asSource: [] as Array<{ targetWidget: string; matches: CapabilityMatch[] }>,
      asTarget: [] as Array<{ sourceWidget: string; matches: CapabilityMatch[] }>,
    };

    const allWidgets = this.getAllWidgets();

    for (const other of allWidgets) {
      if (other.id === widgetId) continue;

      // As source (this widget outputs to other)
      const sourceMatches = this.findCompatibleConnections(widgetId, other.id);
      if (sourceMatches.length > 0) {
        result.asSource.push({ targetWidget: other.id, matches: sourceMatches });
      }

      // As target (other widget outputs to this)
      const targetMatches = this.findCompatibleConnections(other.id, widgetId);
      if (targetMatches.length > 0) {
        result.asTarget.push({ sourceWidget: other.id, matches: targetMatches });
      }
    }

    return result;
  }

  // ==================
  // Validation
  // ==================

  /**
   * Validate a widget's capability declaration
   */
  validateCapabilityDeclaration(declaration: WidgetCapabilityDeclaration): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check inputs
    for (const input of declaration.inputs) {
      if (!isStandardCapability(input)) {
        // Check if it's a valid custom format
        const { domain, action } = parseCapabilityId(input);
        if (!domain || !action || domain === 'unknown') {
          errors.push(`Invalid input capability format: ${input}`);
        } else {
          warnings.push(`Non-standard input capability: ${input}`);
        }
      }
    }

    // Check outputs
    for (const output of declaration.outputs) {
      if (!isStandardCapability(output)) {
        const { domain, action } = parseCapabilityId(output);
        if (!domain || !action || domain === 'unknown') {
          errors.push(`Invalid output capability format: ${output}`);
        } else {
          warnings.push(`Non-standard output capability: ${output}`);
        }
      }
    }

    // Check custom definitions
    if (declaration.customInputs) {
      for (const custom of declaration.customInputs) {
        if (custom.direction !== 'input') {
          errors.push(`Custom input ${custom.id} has wrong direction: ${custom.direction}`);
        }
        if (!declaration.inputs.includes(custom.id)) {
          warnings.push(`Custom input ${custom.id} not declared in inputs array`);
        }
      }
    }

    if (declaration.customOutputs) {
      for (const custom of declaration.customOutputs) {
        if (custom.direction !== 'output') {
          errors.push(`Custom output ${custom.id} has wrong direction: ${custom.direction}`);
        }
        if (!declaration.outputs.includes(custom.id)) {
          warnings.push(`Custom output ${custom.id} not declared in outputs array`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================
  // Private Helpers
  // ==================

  private mapInputToCapability(
    inputName: string,
    _schema: { type: string; description?: string }
  ): CapabilityId | null {
    // Try to match common input names to standard capabilities
    const lowerName = inputName.toLowerCase();
    
    if (lowerName.includes('text') || lowerName === 'content') {
      return 'text.set';
    }
    if (lowerName.includes('play')) {
      return 'animation.play';
    }
    if (lowerName.includes('pause')) {
      return 'animation.pause';
    }
    if (lowerName.includes('stop')) {
      return 'animation.stop';
    }
    if (lowerName.includes('start') || lowerName === 'trigger') {
      return 'timer.start';
    }
    if (lowerName.includes('reset') || lowerName === 'clear') {
      return 'timer.reset';
    }
    if (lowerName.includes('data') || lowerName === 'value') {
      return 'data.set';
    }
    if (lowerName === 'show' || lowerName === 'visible') {
      return 'ui.show';
    }
    if (lowerName === 'hide') {
      return 'ui.hide';
    }

    return null;
  }

  private mapOutputToCapability(
    outputName: string,
    _schema: { type: string; description?: string }
  ): CapabilityId | null {
    const lowerName = outputName.toLowerCase();

    if (lowerName.includes('click') || lowerName === 'pressed') {
      return 'button.pressed';
    }
    if (lowerName.includes('change') && lowerName.includes('text')) {
      return 'text.changed';
    }
    if (lowerName.includes('submit')) {
      return 'text.submitted';
    }
    if (lowerName.includes('tick')) {
      return 'timer.tick';
    }
    if (lowerName.includes('complete') || lowerName.includes('done')) {
      return 'timer.complete';
    }
    if (lowerName.includes('change') && lowerName.includes('data')) {
      return 'data.changed';
    }
    if (lowerName.includes('select')) {
      return 'selection.changed';
    }
    if (lowerName === 'ready' || lowerName === 'loaded') {
      return 'ready';
    }

    return null;
  }

  private suggestMissingInputs(
    existingInputs: CapabilityId[],
    entityTypes: EntityType[]
  ): CapabilityId[] {
    const suggestions: CapabilityId[] = [];

    // Suggest inputs based on entity types
    for (const entityType of entityTypes) {
      const relevantCaps = STANDARD_INPUT_CAPABILITIES.filter(
        c => c.entityTypes?.includes(entityType)
      );
      for (const cap of relevantCaps) {
        if (!existingInputs.includes(cap.id)) {
          suggestions.push(cap.id);
        }
      }
    }

    // Always suggest common inputs if not present
    const commonInputs: CapabilityId[] = ['state.set', 'ui.show', 'ui.hide'];
    for (const cap of commonInputs) {
      if (!existingInputs.includes(cap) && !suggestions.includes(cap)) {
        suggestions.push(cap);
      }
    }

    return suggestions.slice(0, 5); // Limit suggestions
  }

  private suggestMissingOutputs(
    existingOutputs: CapabilityId[],
    entityTypes: EntityType[]
  ): CapabilityId[] {
    const suggestions: CapabilityId[] = [];

    // Suggest outputs based on entity types
    for (const entityType of entityTypes) {
      const relevantCaps = STANDARD_OUTPUT_CAPABILITIES.filter(
        c => c.entityTypes?.includes(entityType)
      );
      for (const cap of relevantCaps) {
        if (!existingOutputs.includes(cap.id)) {
          suggestions.push(cap.id);
        }
      }
    }

    // Always suggest common outputs if not present
    const commonOutputs: CapabilityId[] = ['ready', 'state.changed'];
    for (const cap of commonOutputs) {
      if (!existingOutputs.includes(cap) && !suggestions.includes(cap)) {
        suggestions.push(cap);
      }
    }

    return suggestions.slice(0, 5);
  }

  private generateUpgradeSuggestions(
    sourceWidgetId: string,
    sourceScan: CapabilityScanResult,
    sourceOutput: CapabilityId,
    targetWidgetId: string,
    targetScan: CapabilityScanResult,
    targetInput: CapabilityId
  ): WidgetUpgrade[] {
    const upgrades: WidgetUpgrade[] = [];

    // Suggest adding missing output to source
    if (!sourceScan.outputs.includes(sourceOutput)) {
      upgrades.push({
        widgetId: sourceWidgetId,
        addOutputs: [sourceOutput],
        complexity: this.estimateUpgradeComplexity(sourceOutput, 'output'),
        codeChanges: this.generateCodeChanges(sourceOutput, 'output'),
      });
    }

    // Suggest adding missing input to target
    if (!targetScan.inputs.includes(targetInput)) {
      upgrades.push({
        widgetId: targetWidgetId,
        addInputs: [targetInput],
        complexity: this.estimateUpgradeComplexity(targetInput, 'input'),
        codeChanges: this.generateCodeChanges(targetInput, 'input'),
      });
    }

    return upgrades;
  }

  private estimateUpgradeComplexity(
    capabilityId: CapabilityId,
    _direction: 'input' | 'output'
  ): 'trivial' | 'simple' | 'moderate' | 'complex' {
    const cap = getStandardCapability(capabilityId);
    if (!cap) return 'moderate';

    // Simple capabilities with no payload
    if (cap.payload.length === 0) return 'trivial';

    // Single simple payload
    if (cap.payload.length === 1 && ['string', 'number', 'boolean'].includes(cap.payload[0].type)) {
      return 'simple';
    }

    // Complex payload
    if (cap.payload.some(p => p.type === 'object' || p.type === 'array')) {
      return 'moderate';
    }

    return 'simple';
  }

  private generateCodeChanges(
    capabilityId: CapabilityId,
    direction: 'input' | 'output'
  ): WidgetUpgrade['codeChanges'] {
    const cap = getStandardCapability(capabilityId);
    if (!cap) return [];

    if (direction === 'input') {
      return [{
        type: 'add-handler',
        description: `Add handler for ${cap.name} input`,
        code: `window.WidgetAPI.onEvent('${capabilityId}', (event) => {\n  // Handle ${cap.name}\n  const payload = event.payload;\n  // TODO: Implement handler\n});`,
        location: 'init function',
      }];
    } else {
      const payloadStr = cap.payload.length > 0
        ? `{ ${cap.payload.map(p => `${p.name}: /* ${p.type} */`).join(', ')} }`
        : '{}';
      
      return [{
        type: 'add-emitter',
        description: `Add emitter for ${cap.name} output`,
        code: `window.WidgetAPI.emitEvent({\n  type: '${capabilityId}',\n  payload: ${payloadStr}\n});`,
        location: 'relevant function',
      }];
    }
  }
}

// ==================
// Singleton Instance
// ==================

let registryInstance: CapabilityRegistry | null = null;

/**
 * Get the global capability registry
 */
export function getCapabilityRegistry(): CapabilityRegistry {
  if (!registryInstance) {
    registryInstance = new CapabilityRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (for testing)
 */
export function resetCapabilityRegistry(): void {
  registryInstance = null;
}

