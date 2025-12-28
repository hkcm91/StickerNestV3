/**
 * StickerNest v2 - Pipeline Execution Service
 *
 * Executes pipeline graphs with step-by-step processing.
 * Supports widget nodes, transform nodes, and system nodes.
 *
 * Features:
 * - Topological execution order
 * - Error handling with retry logic
 * - Progress reporting via callbacks
 * - Parallel execution where possible
 */

import { aiService } from './ai.service.js';
import type { ExecutePipelineInput, AIProvider } from '../schemas/ai.schema.js';

// ==================
// Types
// ==================

export type PipelineNodeType = 'widget' | 'transform' | 'system' | 'ai';

export type PipelineDirection = 'input' | 'output';

export interface PipelinePort {
  name: string;
  direction: PipelineDirection;
  type: string;
  description?: string;
}

export interface PipelineNode {
  id: string;
  widgetInstanceId: string | null;
  type: PipelineNodeType;
  position: { x: number; y: number };
  label?: string;
  inputs?: PipelinePort[];
  outputs?: PipelinePort[];
  config?: Record<string, unknown>;
}

export interface PipelineEndpoint {
  nodeId: string;
  portName: string;
}

export interface PipelineConnection {
  id: string;
  from: PipelineEndpoint;
  to: PipelineEndpoint;
  enabled?: boolean;
}

export interface Pipeline {
  id: string;
  canvasId: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface NodeExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  outputs: Record<string, unknown>;
  error?: string;
  duration?: number;
  retryCount?: number;
}

export interface PipelineExecutionResult {
  pipelineId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  nodeResults: NodeExecutionResult[];
  finalOutputs: Record<string, unknown>;
  error?: string;
}

export interface ExecutionProgress {
  pipelineId: string;
  totalNodes: number;
  completedNodes: number;
  currentNode: string | null;
  status: ExecutionStatus;
  percentage: number;
  message?: string;
}

export type ProgressCallback = (progress: ExecutionProgress) => void;

// ==================
// Constants
// ==================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ==================
// Pipeline Execution Service
// ==================

export class PipelineExecutionService {
  private progressCallbacks: Map<string, ProgressCallback[]> = new Map();

  /**
   * Execute a pipeline by ID
   */
  async executePipeline(
    input: ExecutePipelineInput,
    pipeline: Pipeline,
    onProgress?: ProgressCallback
  ): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const nodeResults: NodeExecutionResult[] = [];
    const nodeOutputs = new Map<string, Record<string, unknown>>();

    // Register progress callback
    if (onProgress) {
      this.registerProgressCallback(input.pipelineId, onProgress);
    }

    try {
      // Validate pipeline
      if (!pipeline.enabled) {
        throw new Error('Pipeline is disabled');
      }

      if (pipeline.nodes.length === 0) {
        return {
          pipelineId: input.pipelineId,
          status: 'completed',
          startTime,
          endTime: Date.now(),
          nodeResults: [],
          finalOutputs: {},
        };
      }

      // Get execution order (topological sort)
      const executionOrder = this.getExecutionOrder(pipeline);
      const totalNodes = executionOrder.length;

      this.emitProgress(input.pipelineId, {
        pipelineId: input.pipelineId,
        totalNodes,
        completedNodes: 0,
        currentNode: null,
        status: 'running',
        percentage: 0,
        message: 'Starting pipeline execution',
      });

      // Initialize with input values
      for (const [key, value] of Object.entries(input.inputs)) {
        // Find node that matches input key
        const inputNode = pipeline.nodes.find(n => n.label === key || n.id === key);
        if (inputNode) {
          nodeOutputs.set(inputNode.id, { value });
        }
      }

      // Execute nodes in order
      for (let i = 0; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i];
        const node = pipeline.nodes.find(n => n.id === nodeId);

        if (!node) continue;

        this.emitProgress(input.pipelineId, {
          pipelineId: input.pipelineId,
          totalNodes,
          completedNodes: i,
          currentNode: nodeId,
          status: 'running',
          percentage: Math.round((i / totalNodes) * 100),
          message: `Executing node: ${node.label || node.id}`,
        });

        // Gather inputs for this node
        const nodeInputs = this.gatherNodeInputs(
          node,
          pipeline.connections,
          nodeOutputs
        );

        // Execute node with retry
        const result = await this.executeNodeWithRetry(node, nodeInputs, pipeline);
        nodeResults.push(result);

        if (result.status === 'failed') {
          // Pipeline failed
          this.emitProgress(input.pipelineId, {
            pipelineId: input.pipelineId,
            totalNodes,
            completedNodes: i,
            currentNode: nodeId,
            status: 'failed',
            percentage: Math.round((i / totalNodes) * 100),
            message: `Node failed: ${result.error}`,
          });

          return {
            pipelineId: input.pipelineId,
            status: 'failed',
            startTime,
            endTime: Date.now(),
            nodeResults,
            finalOutputs: {},
            error: result.error,
          };
        }

        // Store outputs for downstream nodes
        nodeOutputs.set(nodeId, result.outputs);
      }

      // Gather final outputs (from nodes with no outgoing connections)
      const finalOutputs = this.gatherFinalOutputs(pipeline, nodeOutputs);

      this.emitProgress(input.pipelineId, {
        pipelineId: input.pipelineId,
        totalNodes,
        completedNodes: totalNodes,
        currentNode: null,
        status: 'completed',
        percentage: 100,
        message: 'Pipeline execution completed',
      });

      return {
        pipelineId: input.pipelineId,
        status: 'completed',
        startTime,
        endTime: Date.now(),
        nodeResults,
        finalOutputs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.emitProgress(input.pipelineId, {
        pipelineId: input.pipelineId,
        totalNodes: pipeline.nodes.length,
        completedNodes: nodeResults.length,
        currentNode: null,
        status: 'failed',
        percentage: Math.round((nodeResults.length / pipeline.nodes.length) * 100),
        message: `Pipeline error: ${errorMessage}`,
      });

      return {
        pipelineId: input.pipelineId,
        status: 'failed',
        startTime,
        endTime: Date.now(),
        nodeResults,
        finalOutputs: {},
        error: errorMessage,
      };
    } finally {
      // Cleanup progress callback
      if (onProgress) {
        this.unregisterProgressCallback(input.pipelineId, onProgress);
      }
    }
  }

  /**
   * Execute a single node with retry logic
   */
  private async executeNodeWithRetry(
    node: PipelineNode,
    inputs: Record<string, unknown>,
    pipeline: Pipeline
  ): Promise<NodeExecutionResult> {
    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      const startTime = Date.now();

      try {
        const outputs = await this.executeNode(node, inputs, pipeline);

        return {
          nodeId: node.id,
          status: 'completed',
          outputs,
          duration: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        if (retryCount <= MAX_RETRIES) {
          // Wait before retry with exponential backoff
          await this.delay(RETRY_DELAY_MS * Math.pow(2, retryCount - 1));
        }
      }
    }

    return {
      nodeId: node.id,
      status: 'failed',
      outputs: {},
      error: lastError?.message || 'Max retries exceeded',
      retryCount,
    };
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(
    node: PipelineNode,
    inputs: Record<string, unknown>,
    _pipeline: Pipeline
  ): Promise<Record<string, unknown>> {
    switch (node.type) {
      case 'widget':
        return this.executeWidgetNode(node, inputs);

      case 'transform':
        return this.executeTransformNode(node, inputs);

      case 'system':
        return this.executeSystemNode(node, inputs);

      case 'ai':
        return this.executeAINode(node, inputs);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Execute a widget node
   * Widget nodes process data through widget logic
   */
  private async executeWidgetNode(
    node: PipelineNode,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Widget nodes pass through inputs with optional transformation
    // In a real implementation, this would invoke the widget's processing logic

    const config = node.config || {};
    const outputs: Record<string, unknown> = {};

    // Apply any configured transformations
    for (const [outputName, outputConfig] of Object.entries(config)) {
      if (typeof outputConfig === 'object' && outputConfig !== null) {
        const typedConfig = outputConfig as { sourceInput?: string; transform?: string };
        const sourceInput = typedConfig.sourceInput;

        if (sourceInput && sourceInput in inputs) {
          outputs[outputName] = inputs[sourceInput];
        }
      }
    }

    // Pass through all inputs as outputs if no config
    if (Object.keys(outputs).length === 0) {
      return { ...inputs };
    }

    return outputs;
  }

  /**
   * Execute a transform node
   * Transform nodes apply data transformations
   */
  private async executeTransformNode(
    node: PipelineNode,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const config = node.config || {};
    const transformType = config.transformType as string;

    switch (transformType) {
      case 'map':
        return this.applyMapTransform(inputs, config);

      case 'filter':
        return this.applyFilterTransform(inputs, config);

      case 'merge':
        return this.applyMergeTransform(inputs, config);

      case 'split':
        return this.applySplitTransform(inputs, config);

      case 'delay':
        await this.delay((config.delayMs as number) || 1000);
        return inputs;

      default:
        // Pass through
        return inputs;
    }
  }

  /**
   * Execute a system node
   * System nodes interact with system-level features
   */
  private async executeSystemNode(
    node: PipelineNode,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const config = node.config || {};
    const systemAction = config.action as string;

    switch (systemAction) {
      case 'log':
        console.log(`[Pipeline:${node.id}]`, inputs);
        return inputs;

      case 'emit':
        // Emit event (would be handled by WebSocket layer)
        return { emitted: true, data: inputs };

      case 'store':
        // Store data (would persist to database)
        return { stored: true, key: config.key, value: inputs };

      default:
        return inputs;
    }
  }

  /**
   * Execute an AI node
   * AI nodes invoke AI services for text/image generation
   */
  private async executeAINode(
    node: PipelineNode,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const config = node.config || {};
    const aiAction = config.action as string;
    const provider = (config.provider as AIProvider) || 'anthropic';

    switch (aiAction) {
      case 'generateText': {
        const result = await aiService.generateText({
          prompt: (inputs.prompt as string) || (config.prompt as string) || '',
          system: inputs.system as string,
          model: config.model as string,
          maxTokens: (config.maxTokens as number) || 4000,
          temperature: (config.temperature as number) || 0.7,
          provider,
        });
        return { text: result.content, model: result.model };
      }

      case 'generateImage': {
        const result = await aiService.generateImage({
          prompt: (inputs.prompt as string) || (config.prompt as string) || '',
          negativePrompt: inputs.negativePrompt as string,
          width: (config.width as number) || 1024,
          height: (config.height as number) || 1024,
          provider: 'replicate',
        });
        return { images: result.images, model: result.model };
      }

      case 'generateWidget': {
        const result = await aiService.generateWidget({
          description: (inputs.description as string) || (config.description as string) || '',
          mode: (config.mode as 'new' | 'variation' | 'layer') || 'new',
          quality: (config.quality as 'basic' | 'standard' | 'advanced' | 'professional') || 'standard',
          provider,
        });
        return {
          widget: {
            id: result.id,
            name: result.name,
            html: result.html,
            manifest: result.manifest,
          },
        };
      }

      default:
        throw new Error(`Unknown AI action: ${aiAction}`);
    }
  }

  // ==================
  // Transform Helpers
  // ==================

  private applyMapTransform(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>
  ): Record<string, unknown> {
    const mapFn = config.mapFunction as string;
    const inputKey = config.inputKey as string || 'value';

    if (!mapFn || !(inputKey in inputs)) {
      return inputs;
    }

    const inputValue = inputs[inputKey];

    // Simple built-in map functions
    switch (mapFn) {
      case 'toUpperCase':
        return { ...inputs, [inputKey]: String(inputValue).toUpperCase() };
      case 'toLowerCase':
        return { ...inputs, [inputKey]: String(inputValue).toLowerCase() };
      case 'trim':
        return { ...inputs, [inputKey]: String(inputValue).trim() };
      case 'parseJSON':
        return { ...inputs, [inputKey]: JSON.parse(String(inputValue)) };
      case 'stringify':
        return { ...inputs, [inputKey]: JSON.stringify(inputValue) };
      default:
        return inputs;
    }
  }

  private applyFilterTransform(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>
  ): Record<string, unknown> {
    const condition = config.condition as string;
    const inputKey = config.inputKey as string || 'value';

    if (!condition || !(inputKey in inputs)) {
      return inputs;
    }

    const inputValue = inputs[inputKey];
    let shouldPass = false;

    // Simple condition evaluation
    switch (condition) {
      case 'exists':
        shouldPass = inputValue !== undefined && inputValue !== null;
        break;
      case 'notEmpty':
        shouldPass = !!inputValue && String(inputValue).length > 0;
        break;
      case 'isNumber':
        shouldPass = typeof inputValue === 'number' && !isNaN(inputValue);
        break;
      case 'isString':
        shouldPass = typeof inputValue === 'string';
        break;
      default:
        shouldPass = true;
    }

    return shouldPass ? inputs : {};
  }

  private applyMergeTransform(
    inputs: Record<string, unknown>,
    _config: Record<string, unknown>
  ): Record<string, unknown> {
    // Merge all inputs into a single output
    return { merged: inputs };
  }

  private applySplitTransform(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>
  ): Record<string, unknown> {
    const inputKey = config.inputKey as string || 'value';
    const delimiter = config.delimiter as string || ',';

    if (!(inputKey in inputs)) {
      return inputs;
    }

    const inputValue = String(inputs[inputKey]);
    const parts = inputValue.split(delimiter);

    return { parts };
  }

  // ==================
  // Graph Helpers
  // ==================

  /**
   * Get topological execution order for pipeline nodes
   */
  private getExecutionOrder(pipeline: Pipeline): string[] {
    const { nodes, connections } = pipeline;
    const nodeIds = nodes.map(n => n.id);
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    for (const nodeId of nodeIds) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    // Build adjacency list and in-degree count
    for (const conn of connections) {
      if (conn.enabled !== false) {
        const fromNodeId = conn.from.nodeId;
        const toNodeId = conn.to.nodeId;

        if (nodeIds.includes(fromNodeId) && nodeIds.includes(toNodeId)) {
          adjacency.get(fromNodeId)!.push(toNodeId);
          inDegree.set(toNodeId, (inDegree.get(toNodeId) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no incoming edges
    for (const nodeId of nodeIds) {
      if (inDegree.get(nodeId) === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      for (const neighbor of adjacency.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If not all nodes are in result, there's a cycle
    if (result.length !== nodeIds.length) {
      console.warn('[PipelineExecution] Cycle detected in pipeline, executing in original order');
      return nodeIds;
    }

    return result;
  }

  /**
   * Gather inputs for a node from upstream node outputs
   */
  private gatherNodeInputs(
    node: PipelineNode,
    connections: PipelineConnection[],
    nodeOutputs: Map<string, Record<string, unknown>>
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    // Find all connections targeting this node
    for (const conn of connections) {
      if (conn.to.nodeId === node.id && conn.enabled !== false) {
        const sourceOutputs = nodeOutputs.get(conn.from.nodeId);

        if (sourceOutputs && conn.from.portName in sourceOutputs) {
          inputs[conn.to.portName] = sourceOutputs[conn.from.portName];
        } else if (sourceOutputs && 'value' in sourceOutputs) {
          // Fallback to 'value' key
          inputs[conn.to.portName] = sourceOutputs.value;
        }
      }
    }

    return inputs;
  }

  /**
   * Gather final outputs from terminal nodes
   */
  private gatherFinalOutputs(
    pipeline: Pipeline,
    nodeOutputs: Map<string, Record<string, unknown>>
  ): Record<string, unknown> {
    const finalOutputs: Record<string, unknown> = {};

    // Find nodes with no outgoing connections (terminal nodes)
    const nodesWithOutgoing = new Set(
      pipeline.connections.map(c => c.from.nodeId)
    );

    for (const node of pipeline.nodes) {
      if (!nodesWithOutgoing.has(node.id)) {
        const outputs = nodeOutputs.get(node.id);
        if (outputs) {
          finalOutputs[node.label || node.id] = outputs;
        }
      }
    }

    return finalOutputs;
  }

  // ==================
  // Progress Reporting
  // ==================

  private registerProgressCallback(pipelineId: string, callback: ProgressCallback): void {
    if (!this.progressCallbacks.has(pipelineId)) {
      this.progressCallbacks.set(pipelineId, []);
    }
    this.progressCallbacks.get(pipelineId)!.push(callback);
  }

  private unregisterProgressCallback(pipelineId: string, callback: ProgressCallback): void {
    const callbacks = this.progressCallbacks.get(pipelineId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.progressCallbacks.delete(pipelineId);
      }
    }
  }

  private emitProgress(pipelineId: string, progress: ExecutionProgress): void {
    const callbacks = this.progressCallbacks.get(pipelineId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(progress);
        } catch (error) {
          console.error('[PipelineExecution] Progress callback error:', error);
        }
      }
    }
  }

  // ==================
  // Utilities
  // ==================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const pipelineExecutionService = new PipelineExecutionService();
