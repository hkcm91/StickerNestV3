/**
 * StickerNest v2 - Widget Evolution AI
 * AI-powered widget capability scanning, gap analysis, and upgrade proposals
 * Enables AI to modify existing widgets to add missing capabilities
 */

import type { WidgetManifest } from '../types/manifest';
import type {
  CapabilityId,
  CapabilityScanResult,
  CapabilityGapAnalysis,
  WidgetUpgrade,
} from '../types/capabilities';
import { getCapabilityRegistry, CapabilityRegistry } from './CapabilityRegistry';
import { getStandardCapability, parseCapabilityId } from '../types/capabilities';
import type { AIProvider } from './providers';
import { getProviderForTask, getModelRegistry } from './providers';
import {
  WIDGET_UPGRADE_SYSTEM_PROMPT,
  generateAddInputsPrompt,
  generateAddOutputsPrompt,
} from './prompts/UpgradePrompt';

// ==================
// Types
// ==================

/** Result of proposing upgrades */
export interface UpgradeProposal {
  /** Whether upgrades are needed */
  upgradesNeeded: boolean;
  /** Proposed widget upgrades */
  upgrades: WidgetUpgrade[];
  /** Summary for user */
  summary: string;
  /** Estimated total complexity */
  totalComplexity: 'trivial' | 'simple' | 'moderate' | 'complex';
  /** Warnings or notes */
  warnings?: string[];
}

/** Result of applying an upgrade */
export interface UpgradeResult {
  success: boolean;
  /** Updated manifest */
  manifest?: WidgetManifest;
  /** Updated HTML */
  html?: string;
  /** Changes made */
  changes: string[];
  /** Errors if failed */
  errors?: string[];
}

/** Dependency graph node */
export interface DependencyNode {
  widgetId: string;
  widgetName: string;
  inputs: CapabilityId[];
  outputs: CapabilityId[];
  dependsOn: string[]; // Widget IDs this widget receives input from
  dependents: string[]; // Widget IDs that receive input from this widget
}

/** Dependency graph for multi-widget upgrades */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Array<{
    from: string;
    to: string;
    output: CapabilityId;
    input: CapabilityId;
  }>;
  upgradeOrder: string[]; // Order to apply upgrades
}

// ==================
// Widget Evolution Class
// ==================

export class WidgetEvolution {
  private registry: CapabilityRegistry;
  private provider: AIProvider;

  constructor(registry?: CapabilityRegistry) {
    this.registry = registry || getCapabilityRegistry();
    this.provider = getProviderForTask('modify');
  }

  // ==================
  // Scanning APIs
  // ==================

  /**
   * Scan a widget's capabilities
   */
  scanCapabilities(widgetId: string): CapabilityScanResult | null {
    return this.registry.scanWidget(widgetId);
  }

  /**
   * Scan all registered widgets
   */
  scanAllCapabilities(): CapabilityScanResult[] {
    return this.registry.scanAllWidgets();
  }

  /**
   * Find widgets that can connect to a given widget
   */
  findCompatibleWidgets(widgetId: string): {
    canReceiveFrom: Array<{ widgetId: string; widgetName: string; outputs: CapabilityId[] }>;
    canSendTo: Array<{ widgetId: string; widgetName: string; inputs: CapabilityId[] }>;
  } {
    const connections = this.registry.findAllPossibleConnections(widgetId);
    
    return {
      canReceiveFrom: connections.asTarget.map(c => {
        const manifest = this.registry.getWidgetManifest(c.sourceWidget);
        return {
          widgetId: c.sourceWidget,
          widgetName: manifest?.name || c.sourceWidget,
          outputs: c.matches.map(m => m.source),
        };
      }),
      canSendTo: connections.asSource.map(c => {
        const manifest = this.registry.getWidgetManifest(c.targetWidget);
        return {
          widgetId: c.targetWidget,
          widgetName: manifest?.name || c.targetWidget,
          inputs: c.matches.map(m => m.target),
        };
      }),
    };
  }

  // ==================
  // Gap Analysis APIs
  // ==================

  /**
   * Find missing capabilities for a proposed connection
   */
  findMissingCapabilities(
    sourceWidgetId: string,
    sourceOutput: CapabilityId,
    targetWidgetId: string,
    targetInput: CapabilityId
  ): CapabilityGapAnalysis {
    return this.registry.analyzeCapabilityGap(
      sourceWidgetId,
      sourceOutput,
      targetWidgetId,
      targetInput
    );
  }

  /**
   * Analyze what's needed to make multiple widgets work together
   */
  analyzeMultiWidgetGaps(
    connections: Array<{
      sourceWidgetId: string;
      sourceOutput: CapabilityId;
      targetWidgetId: string;
      targetInput: CapabilityId;
    }>
  ): CapabilityGapAnalysis[] {
    return connections.map(c =>
      this.findMissingCapabilities(
        c.sourceWidgetId,
        c.sourceOutput,
        c.targetWidgetId,
        c.targetInput
      )
    );
  }

  // ==================
  // Upgrade Proposal APIs
  // ==================

  /**
   * Propose upgrades for a single connection
   */
  proposeUpgrades(
    sourceWidgetId: string,
    sourceOutput: CapabilityId,
    targetWidgetId: string,
    targetInput: CapabilityId
  ): UpgradeProposal {
    const gap = this.findMissingCapabilities(
      sourceWidgetId,
      sourceOutput,
      targetWidgetId,
      targetInput
    );

    if (gap.possible) {
      return {
        upgradesNeeded: false,
        upgrades: [],
        summary: 'Connection is already possible with existing capabilities.',
        totalComplexity: 'trivial',
      };
    }

    const upgrades = gap.suggestedUpgrades || [];
    const totalComplexity = this.calculateTotalComplexity(upgrades);
    const warnings: string[] = [];

    // Check for potential issues
    if (upgrades.some(u => u.complexity === 'complex')) {
      warnings.push('Some upgrades are complex and may require manual review.');
    }

    const summary = this.generateUpgradeSummary(upgrades, gap);

    return {
      upgradesNeeded: upgrades.length > 0,
      upgrades,
      summary,
      totalComplexity,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Propose upgrades for multiple widgets to work together
   */
  proposeMultiWidgetUpgrades(
    connections: Array<{
      sourceWidgetId: string;
      sourceOutput: CapabilityId;
      targetWidgetId: string;
      targetInput: CapabilityId;
    }>
  ): UpgradeProposal {
    const allUpgrades: Map<string, WidgetUpgrade> = new Map();
    const warnings: string[] = [];

    for (const conn of connections) {
      const proposal = this.proposeUpgrades(
        conn.sourceWidgetId,
        conn.sourceOutput,
        conn.targetWidgetId,
        conn.targetInput
      );

      for (const upgrade of proposal.upgrades) {
        const existing = allUpgrades.get(upgrade.widgetId);
        if (existing) {
          // Merge upgrades for same widget
          existing.addInputs = [...(existing.addInputs || []), ...(upgrade.addInputs || [])];
          existing.addOutputs = [...(existing.addOutputs || []), ...(upgrade.addOutputs || [])];
          existing.codeChanges = [...(existing.codeChanges || []), ...(upgrade.codeChanges || [])];
          // Take higher complexity
          if (this.complexityOrder(upgrade.complexity) > this.complexityOrder(existing.complexity)) {
            existing.complexity = upgrade.complexity;
          }
        } else {
          allUpgrades.set(upgrade.widgetId, { ...upgrade });
        }
      }

      if (proposal.warnings) {
        warnings.push(...proposal.warnings);
      }
    }

    const upgrades = Array.from(allUpgrades.values());
    const totalComplexity = this.calculateTotalComplexity(upgrades);

    // Build summary
    const widgetCount = upgrades.length;
    const inputCount = upgrades.reduce((sum, u) => sum + (u.addInputs?.length || 0), 0);
    const outputCount = upgrades.reduce((sum, u) => sum + (u.addOutputs?.length || 0), 0);

    const summary = widgetCount === 0
      ? 'All connections are already possible.'
      : `Need to upgrade ${widgetCount} widget(s): add ${inputCount} input(s) and ${outputCount} output(s).`;

    return {
      upgradesNeeded: upgrades.length > 0,
      upgrades,
      summary,
      totalComplexity,
      warnings: [...new Set(warnings)], // Deduplicate
    };
  }

  // ==================
  // Dependency Graph
  // ==================

  /**
   * Build a dependency graph for a set of widgets and connections
   */
  buildDependencyGraph(
    widgetIds: string[],
    connections: Array<{
      sourceWidgetId: string;
      sourceOutput: CapabilityId;
      targetWidgetId: string;
      targetInput: CapabilityId;
    }>
  ): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyGraph['edges'] = [];

    // Create nodes for each widget
    for (const widgetId of widgetIds) {
      const scan = this.scanCapabilities(widgetId);
      const manifest = this.registry.getWidgetManifest(widgetId);

      nodes.set(widgetId, {
        widgetId,
        widgetName: manifest?.name || widgetId,
        inputs: scan?.inputs || [],
        outputs: scan?.outputs || [],
        dependsOn: [],
        dependents: [],
      });
    }

    // Add edges and update dependencies
    for (const conn of connections) {
      edges.push({
        from: conn.sourceWidgetId,
        to: conn.targetWidgetId,
        output: conn.sourceOutput,
        input: conn.targetInput,
      });

      const sourceNode = nodes.get(conn.sourceWidgetId);
      const targetNode = nodes.get(conn.targetWidgetId);

      if (sourceNode && !sourceNode.dependents.includes(conn.targetWidgetId)) {
        sourceNode.dependents.push(conn.targetWidgetId);
      }
      if (targetNode && !targetNode.dependsOn.includes(conn.sourceWidgetId)) {
        targetNode.dependsOn.push(conn.sourceWidgetId);
      }
    }

    // Calculate upgrade order (topological sort)
    const upgradeOrder = this.topologicalSort(nodes);

    return { nodes, edges, upgradeOrder };
  }

  // ==================
  // AI-Powered Upgrade Generation
  // ==================

  /**
   * Generate upgrade code for a widget using AI
   * Supports fallback to alternative providers on failure
   */
  async generateUpgradeCode(
    _widgetId: string,
    currentHtml: string,
    currentManifest: WidgetManifest,
    upgrade: WidgetUpgrade
  ): Promise<UpgradeResult> {
    const changes: string[] = [];

    // Build prompt for AI
    const prompt = this.buildUpgradePrompt(currentHtml, currentManifest, upgrade);

    // Get fallback chain for modify task
    const registry = getModelRegistry();
    const fallbackChain = registry.getFallbackChain('modify');
    let lastError: Error | null = null;

    // Try each provider in the fallback chain
    for (const modelId of fallbackChain) {
      try {
        const config = registry.getProviderConfig(modelId);
        if (!config) continue;

        // Create provider for this model
        const provider = getProviderForTask('modify');
        
        console.log(`[WidgetEvolution] Trying model: ${modelId}`);

        const result = await provider.generate(prompt, {
          maxTokens: 8000,
          temperature: 0.3, // Low temperature for precise edits
        });

        // Parse the result
        const parsed = this.parseUpgradeResult(result.content);

        if (!parsed.manifest || !parsed.html) {
          console.warn(`[WidgetEvolution] ${modelId}: Failed to parse response`);
          continue; // Try next provider
        }

        // Track changes
        if (upgrade.addInputs?.length) {
          changes.push(`Added inputs: ${upgrade.addInputs.join(', ')}`);
        }
        if (upgrade.addOutputs?.length) {
          changes.push(`Added outputs: ${upgrade.addOutputs.join(', ')}`);
        }
        changes.push(`Generated using model: ${modelId}`);

        return {
          success: true,
          manifest: parsed.manifest,
          html: parsed.html,
          changes,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`[WidgetEvolution] ${modelId} failed:`, lastError.message);
        // Continue to next fallback
      }
    }

    // All providers failed
    return {
      success: false,
      changes: [],
      errors: [lastError?.message || 'All providers failed to generate upgrade'],
    };
  }

  /**
   * Preview code changes without applying
   */
  generateCodePreview(upgrade: WidgetUpgrade): string {
    const lines: string[] = [];

    lines.push(`// Upgrade preview for widget: ${upgrade.widgetId}`);
    lines.push(`// Complexity: ${upgrade.complexity}`);
    lines.push('');

    if (upgrade.addInputs?.length) {
      lines.push('// === Add Input Handlers ===');
      for (const input of upgrade.addInputs) {
        const cap = getStandardCapability(input);
        lines.push(`// Handle: ${cap?.name || input}`);
        lines.push(`window.WidgetAPI.onEvent('${input}', (event) => {`);
        lines.push('  const payload = event.payload;');
        lines.push(`  // TODO: Handle ${input}`);
        lines.push('});');
        lines.push('');
      }
    }

    if (upgrade.addOutputs?.length) {
      lines.push('// === Add Output Emitters ===');
      for (const output of upgrade.addOutputs) {
        const cap = getStandardCapability(output);
        const payloadStr = cap?.payload.length
          ? `{ ${cap.payload.map(p => `${p.name}: /* ${p.type} */`).join(', ')} }`
          : '{}';
        
        lines.push(`// Emit: ${cap?.name || output}`);
        lines.push(`function emit${this.capitalize(parseCapabilityId(output).action)}() {`);
        lines.push(`  window.WidgetAPI.emitEvent({`);
        lines.push(`    type: '${output}',`);
        lines.push(`    payload: ${payloadStr}`);
        lines.push(`  });`);
        lines.push('}');
        lines.push('');
      }
    }

    if (upgrade.codeChanges?.length) {
      lines.push('// === Additional Changes ===');
      for (const change of upgrade.codeChanges) {
        lines.push(`// ${change.description}`);
        if (change.code) {
          lines.push(change.code);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ==================
  // Private Helpers
  // ==================

  private calculateTotalComplexity(
    upgrades: WidgetUpgrade[]
  ): 'trivial' | 'simple' | 'moderate' | 'complex' {
    if (upgrades.length === 0) return 'trivial';

    const maxComplexity = Math.max(...upgrades.map(u => this.complexityOrder(u.complexity)));

    // Add complexity for multiple widgets
    const adjustedComplexity = maxComplexity + Math.floor(upgrades.length / 3);

    if (adjustedComplexity <= 1) return 'trivial';
    if (adjustedComplexity <= 2) return 'simple';
    if (adjustedComplexity <= 3) return 'moderate';
    return 'complex';
  }

  private complexityOrder(complexity: 'trivial' | 'simple' | 'moderate' | 'complex'): number {
    const order = { trivial: 1, simple: 2, moderate: 3, complex: 4 };
    return order[complexity];
  }

  private generateUpgradeSummary(
    upgrades: WidgetUpgrade[],
    gap: CapabilityGapAnalysis
  ): string {
    if (upgrades.length === 0) {
      return 'No upgrades needed.';
    }

    const parts: string[] = [];

    if (gap.missingSource?.length) {
      parts.push(`Source widget needs: ${gap.missingSource.join(', ')}`);
    }

    if (gap.missingTarget?.length) {
      parts.push(`Target widget needs: ${gap.missingTarget.join(', ')}`);
    }

    return parts.join('. ') || 'Upgrades proposed.';
  }

  private topologicalSort(nodes: Map<string, DependencyNode>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        // Circular dependency - just add it
        console.warn(`Circular dependency detected involving ${nodeId}`);
        return;
      }

      visiting.add(nodeId);
      const node = nodes.get(nodeId);

      if (node) {
        for (const depId of node.dependsOn) {
          visit(depId);
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    for (const nodeId of nodes.keys()) {
      visit(nodeId);
    }

    return result;
  }

  private buildUpgradePrompt(
    currentHtml: string,
    currentManifest: WidgetManifest,
    upgrade: WidgetUpgrade
  ): string {
    // Use structured prompts based on upgrade type
    if (upgrade.addInputs?.length && !upgrade.addOutputs?.length) {
      return WIDGET_UPGRADE_SYSTEM_PROMPT + '\n\n' +
        generateAddInputsPrompt(currentManifest, currentHtml, upgrade.addInputs);
    }
    
    if (upgrade.addOutputs?.length && !upgrade.addInputs?.length) {
      return WIDGET_UPGRADE_SYSTEM_PROMPT + '\n\n' +
        generateAddOutputsPrompt(currentManifest, currentHtml, upgrade.addOutputs);
    }

    // Combined upgrades
    return `${WIDGET_UPGRADE_SYSTEM_PROMPT}

## Current Widget
- Name: ${currentManifest.name}
- ID: ${currentManifest.id}

## Current Manifest
\`\`\`json
${JSON.stringify(currentManifest, null, 2)}
\`\`\`

## Current HTML
\`\`\`html
${currentHtml}
\`\`\`

## Required Upgrades
${upgrade.addInputs?.length ? `### Add Input Handlers\n${upgrade.addInputs.map(i => `- ${i}`).join('\n')}` : ''}
${upgrade.addOutputs?.length ? `### Add Output Emitters\n${upgrade.addOutputs.map(o => `- ${o}`).join('\n')}` : ''}

## Instructions
1. Add the required capability handlers/emitters
2. Update the manifest to declare new capabilities
3. Preserve all existing functionality
4. Follow StickerNest WidgetAPI patterns exactly

## Response Format
\`\`\`json
{
  "manifest": { /* complete updated manifest */ },
  "html": "<!DOCTYPE html>...",
  "changes": ["list of changes made"]
}
\`\`\``;
  }

  private parseUpgradeResult(content: string): {
    manifest?: WidgetManifest;
    html?: string;
    changes?: string[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        manifest: parsed.manifest,
        html: parsed.html,
        changes: parsed.changes,
      };
    } catch {
      return {};
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// ==================
// Singleton Instance
// ==================

let evolutionInstance: WidgetEvolution | null = null;

/**
 * Get the Widget Evolution singleton
 */
export function getWidgetEvolution(): WidgetEvolution {
  if (!evolutionInstance) {
    evolutionInstance = new WidgetEvolution();
  }
  return evolutionInstance;
}

/**
 * Create a new Widget Evolution instance
 */
export function createWidgetEvolution(registry?: CapabilityRegistry): WidgetEvolution {
  return new WidgetEvolution(registry);
}

