/**
 * StickerNest v2 - Pipeline Validator
 * Validates pipeline connections for:
 * - Port existence (does the port exist in the manifest?)
 * - Type compatibility (are payload types compatible?)
 * - Circular loop detection (prevent infinite loops)
 * - Rate limiting detection
 */

import type { Pipeline, PipelineConnection, PipelineNode } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';

// ============================================
// Validation Result Types
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssueFix {
  label: string;
  action: 'delete_connection' | 'change_type' | 'add_port' | 'remove_node';
  data?: Record<string, unknown>;
}

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: ValidationErrorCode;
  message: string;
  pipelineId?: string;
  connectionId?: string;
  nodeId?: string;
  portName?: string;
  details?: Record<string, unknown>;
  fix?: ValidationIssueFix;
}

export type ValidationErrorCode =
  | 'PORT_NOT_FOUND'
  | 'PORT_TYPE_MISMATCH'
  | 'CIRCULAR_DEPENDENCY'
  | 'SELF_CONNECTION'
  | 'DUPLICATE_CONNECTION'
  | 'MISSING_WIDGET'
  | 'MISSING_MANIFEST'
  | 'INVALID_NODE'
  | 'DISCONNECTED_NODE'
  | 'RATE_LIMIT_RISK';

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

export interface PortDefinition {
  name: string;
  type: string;
  description?: string;
}

// ============================================
// Type Compatibility
// ============================================

/**
 * Type compatibility rules
 * 'any' is compatible with everything
 * Same types are compatible
 * Some types have implicit conversions
 */
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  'any': ['*'],  // Special: compatible with all
  'string': ['any', 'string'],
  'number': ['any', 'number', 'string'],  // numbers can become strings
  'boolean': ['any', 'boolean', 'string', 'number'],
  'object': ['any', 'object'],
  'array': ['any', 'array', 'object'],
  'event': ['any', 'event', 'object'],
  'entity': ['any', 'entity', 'object'],
  'animation': ['any', 'animation', 'object'],
  'audio': ['any', 'audio', 'object'],
  'image': ['any', 'image', 'object', 'string'],  // image can be URL string
  'video': ['any', 'video', 'object', 'string'],
  'color': ['any', 'color', 'string'],
  'position': ['any', 'position', 'object'],
  'size': ['any', 'size', 'object'],
};

/**
 * Check if output type is compatible with input type
 */
export function areTypesCompatible(outputType: string, inputType: string): boolean {
  // 'any' accepts everything
  if (inputType === 'any' || outputType === 'any') {
    return true;
  }

  // Same type
  if (outputType === inputType) {
    return true;
  }

  // Check compatibility matrix
  const compatibleWith = TYPE_COMPATIBILITY[outputType];
  if (compatibleWith) {
    if (compatibleWith.includes('*')) return true;
    return compatibleWith.includes(inputType);
  }

  // Unknown types - allow but warn
  return true;
}

// ============================================
// Pipeline Validator Class
// ============================================

export class PipelineValidator {
  private manifests: Map<string, WidgetManifest>;
  private widgetNodeMap: Map<string, PipelineNode>;

  constructor() {
    this.manifests = new Map();
    this.widgetNodeMap = new Map();
  }

  /**
   * Register a widget manifest for validation
   */
  registerManifest(widgetDefId: string, manifest: WidgetManifest): void {
    this.manifests.set(widgetDefId, manifest);
  }

  /**
   * Get registered manifests
   */
  getManifests(): Map<string, WidgetManifest> {
    return this.manifests;
  }

  /**
   * Get port definitions from a manifest
   */
  getPortsFromManifest(manifest: WidgetManifest): { inputs: PortDefinition[]; outputs: PortDefinition[] } {
    const inputs: PortDefinition[] = [];
    const outputs: PortDefinition[] = [];

    // New format: io.inputs/outputs
    if (manifest.io) {
      if (manifest.io.inputs) {
        manifest.io.inputs.forEach((input: any) => {
          const name = typeof input === 'string' ? input : input.id || input.name;
          const type = typeof input === 'object' ? input.payloadType || input.type || 'any' : 'any';
          inputs.push({ name, type, description: input.description });
        });
      }
      if (manifest.io.outputs) {
        manifest.io.outputs.forEach((output: any) => {
          const name = typeof output === 'string' ? output : output.id || output.name;
          const type = typeof output === 'object' ? output.payloadType || output.type || 'any' : 'any';
          outputs.push({ name, type, description: output.description });
        });
      }
    }

    // Legacy format: inputs/outputs as objects
    if (manifest.inputs && typeof manifest.inputs === 'object') {
      Object.entries(manifest.inputs).forEach(([name, def]: [string, any]) => {
        const type = typeof def === 'object' ? def.type || 'any' : 'any';
        inputs.push({ name, type, description: def?.description });
      });
    }
    if (manifest.outputs && typeof manifest.outputs === 'object') {
      Object.entries(manifest.outputs).forEach(([name, def]: [string, any]) => {
        const type = typeof def === 'object' ? def.type || 'any' : 'any';
        outputs.push({ name, type, description: def?.description });
      });
    }

    return { inputs, outputs };
  }

  /**
   * Validate a single pipeline
   */
  validatePipeline(
    pipeline: Pipeline,
    widgetDefIdMap: Map<string, string>  // widgetInstanceId -> widgetDefId
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    // Build node map
    this.widgetNodeMap.clear();
    for (const node of pipeline.nodes) {
      if (node.widgetInstanceId) {
        this.widgetNodeMap.set(node.widgetInstanceId, node);
      }
    }

    // Validate each node
    for (const node of pipeline.nodes) {
      const nodeIssues = this.validateNode(node, widgetDefIdMap, pipeline.id);
      issues.push(...nodeIssues.filter(i => i.severity === 'error'));
      warnings.push(...nodeIssues.filter(i => i.severity === 'warning'));
      info.push(...nodeIssues.filter(i => i.severity === 'info'));
    }

    // Validate each connection
    for (const connection of pipeline.connections) {
      const connIssues = this.validateConnection(connection, pipeline, widgetDefIdMap);
      issues.push(...connIssues.filter(i => i.severity === 'error'));
      warnings.push(...connIssues.filter(i => i.severity === 'warning'));
      info.push(...connIssues.filter(i => i.severity === 'info'));
    }

    // Check for circular dependencies
    const circularIssues = this.detectCircularDependencies(pipeline);
    issues.push(...circularIssues);

    // Check for disconnected nodes
    const disconnectedIssues = this.detectDisconnectedNodes(pipeline);
    warnings.push(...disconnectedIssues);

    // Check for duplicate connections
    const duplicateIssues = this.detectDuplicateConnections(pipeline);
    warnings.push(...duplicateIssues);

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      info,
    };
  }

  /**
   * Validate a single node
   */
  private validateNode(
    node: PipelineNode,
    widgetDefIdMap: Map<string, string>,
    pipelineId: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (node.type === 'widget') {
      if (!node.widgetInstanceId) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'INVALID_NODE',
          message: `Node ${node.id} is a widget node but has no widgetInstanceId`,
          pipelineId,
          nodeId: node.id,
        });
        return issues;
      }

      const widgetDefId = widgetDefIdMap.get(node.widgetInstanceId);
      if (!widgetDefId) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'MISSING_WIDGET',
          message: `Widget instance ${node.widgetInstanceId} not found`,
          pipelineId,
          nodeId: node.id,
        });
        return issues;
      }

      const manifest = this.manifests.get(widgetDefId);
      if (!manifest) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          code: 'MISSING_MANIFEST',
          message: `Manifest not found for widget ${widgetDefId} - ports cannot be validated`,
          pipelineId,
          nodeId: node.id,
        });
      }
    }

    return issues;
  }

  /**
   * Validate a single connection
   */
  private validateConnection(
    connection: PipelineConnection,
    pipeline: Pipeline,
    widgetDefIdMap: Map<string, string>
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Find source and target nodes
    const fromNode = pipeline.nodes.find(n => n.id === connection.from.nodeId);
    const toNode = pipeline.nodes.find(n => n.id === connection.to.nodeId);

    if (!fromNode) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'INVALID_NODE',
        message: `Source node ${connection.from.nodeId} not found`,
        pipelineId: pipeline.id,
        connectionId: connection.id,
      });
      return issues;
    }

    if (!toNode) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'INVALID_NODE',
        message: `Target node ${connection.to.nodeId} not found`,
        pipelineId: pipeline.id,
        connectionId: connection.id,
      });
      return issues;
    }

    // Check for self-connection
    if (connection.from.nodeId === connection.to.nodeId) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'SELF_CONNECTION',
        message: `Connection creates a self-loop on node ${connection.from.nodeId}`,
        pipelineId: pipeline.id,
        connectionId: connection.id,
      });
      return issues;
    }

    // Validate ports exist and types are compatible
    if (fromNode.type === 'widget' && fromNode.widgetInstanceId) {
      const fromDefId = widgetDefIdMap.get(fromNode.widgetInstanceId);
      const fromManifest = fromDefId ? this.manifests.get(fromDefId) : null;

      if (fromManifest) {
        const { outputs } = this.getPortsFromManifest(fromManifest);
        const outputPort = outputs.find(p => p.name === connection.from.portName);

        if (!outputPort) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'error',
            code: 'PORT_NOT_FOUND',
            message: `Output port "${connection.from.portName}" not found on widget`,
            pipelineId: pipeline.id,
            connectionId: connection.id,
            portName: connection.from.portName,
            details: { availablePorts: outputs.map(p => p.name) },
          });
        }

        // Check target port
        if (toNode.type === 'widget' && toNode.widgetInstanceId) {
          const toDefId = widgetDefIdMap.get(toNode.widgetInstanceId);
          const toManifest = toDefId ? this.manifests.get(toDefId) : null;

          if (toManifest) {
            const { inputs } = this.getPortsFromManifest(toManifest);
            const inputPort = inputs.find(p => p.name === connection.to.portName);

            if (!inputPort) {
              issues.push({
                id: crypto.randomUUID(),
                severity: 'error',
                code: 'PORT_NOT_FOUND',
                message: `Input port "${connection.to.portName}" not found on widget`,
                pipelineId: pipeline.id,
                connectionId: connection.id,
                portName: connection.to.portName,
                details: { availablePorts: inputs.map(p => p.name) },
              });
            }

            // Type compatibility check
            if (outputPort && inputPort) {
              if (!areTypesCompatible(outputPort.type, inputPort.type)) {
                issues.push({
                  id: crypto.randomUUID(),
                  severity: 'warning',
                  code: 'PORT_TYPE_MISMATCH',
                  message: `Type mismatch: output "${outputPort.type}" may not be compatible with input "${inputPort.type}"`,
                  pipelineId: pipeline.id,
                  connectionId: connection.id,
                  details: { outputType: outputPort.type, inputType: inputPort.type },
                });
              }
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(pipeline: Pipeline): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const node of pipeline.nodes) {
      adjacency.set(node.id, []);
    }
    for (const conn of pipeline.connections) {
      const targets = adjacency.get(conn.from.nodeId) || [];
      targets.push(conn.to.nodeId);
      adjacency.set(conn.from.nodeId, targets);
    }

    // DFS for cycle detection
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cyclePath: string[] = [];

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      cyclePath.push(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found cycle
          cyclePath.push(neighbor);
          return true;
        }
      }

      cyclePath.pop();
      recStack.delete(nodeId);
      return false;
    };

    for (const node of pipeline.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'error',
            code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency detected: ${cyclePath.join(' → ')}`,
            pipelineId: pipeline.id,
            details: { cycle: cyclePath },
          });
          break;  // Only report one cycle
        }
      }
    }

    return issues;
  }

  /**
   * Detect nodes with no connections (neither input nor output)
   */
  private detectDisconnectedNodes(pipeline: Pipeline): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const connectedNodes = new Set<string>();
    for (const conn of pipeline.connections) {
      connectedNodes.add(conn.from.nodeId);
      connectedNodes.add(conn.to.nodeId);
    }

    for (const node of pipeline.nodes) {
      if (!connectedNodes.has(node.id)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'info',
          code: 'DISCONNECTED_NODE',
          message: `Node "${node.label || node.id}" has no connections`,
          pipelineId: pipeline.id,
          nodeId: node.id,
        });
      }
    }

    return issues;
  }

  /**
   * Detect duplicate connections (same from/to)
   */
  private detectDuplicateConnections(pipeline: Pipeline): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();

    for (const conn of pipeline.connections) {
      const key = `${conn.from.nodeId}:${conn.from.portName}->${conn.to.nodeId}:${conn.to.portName}`;
      if (seen.has(key)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          code: 'DUPLICATE_CONNECTION',
          message: `Duplicate connection from ${conn.from.portName} to ${conn.to.portName}`,
          pipelineId: pipeline.id,
          connectionId: conn.id,
        });
      }
      seen.add(key);
    }

    return issues;
  }

  /**
   * Validate a proposed new connection before adding it
   */
  validateNewConnection(
    fromNodeId: string,
    fromPortName: string,
    toNodeId: string,
    toPortName: string,
    pipeline: Pipeline,
    widgetDefIdMap: Map<string, string>
  ): ValidationResult {
    // Create a temporary connection
    const tempConnection: PipelineConnection = {
      id: 'temp-validation',
      from: { nodeId: fromNodeId, portName: fromPortName },
      to: { nodeId: toNodeId, portName: toPortName },
    };

    // Create a temporary pipeline with the new connection
    const tempPipeline: Pipeline = {
      ...pipeline,
      connections: [...pipeline.connections, tempConnection],
    };

    return this.validatePipeline(tempPipeline, widgetDefIdMap);
  }
}

// Singleton instance
let validatorInstance: PipelineValidator | null = null;

export function getPipelineValidator(): PipelineValidator {
  if (!validatorInstance) {
    validatorInstance = new PipelineValidator();
  }
  return validatorInstance;
}

export function resetPipelineValidator(): void {
  validatorInstance = null;
}

export default PipelineValidator;
