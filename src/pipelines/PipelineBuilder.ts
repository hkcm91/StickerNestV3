/**
 * StickerNest v2 - Pipeline Builder
 * Fluent API for creating pipelines programmatically
 * 
 * Usage:
 *   const pipeline = PipelineBuilder.create('my-pipeline', canvasId)
 *     .connect(timerWidget, 'tick').to(displayWidget, 'setValue')
 *     .connect(buttonWidget, 'clicked').to(timerWidget, 'reset')
 *     .build();
 */

import type { Pipeline, PipelineConnection, PipelineNode, WidgetInstance } from '../types/domain';
import { createEmptyPipeline, createWidgetNode, createConnection } from '../services/pipelinesClient';

/** Connection being built */
interface PendingConnection {
  fromWidget: WidgetInstance;
  fromPort: string;
}

/** Builder state */
interface BuilderState {
  pipeline: Pipeline;
  nodeMap: Map<string, PipelineNode>;
  pendingConnection: PendingConnection | null;
}

/**
 * PipelineBuilder - Fluent interface for building pipelines
 */
export class PipelineBuilder {
  private state: BuilderState;

  private constructor(name: string, canvasId: string) {
    this.state = {
      pipeline: createEmptyPipeline(canvasId, name),
      nodeMap: new Map(),
      pendingConnection: null
    };
  }

  /**
   * Create a new pipeline builder
   */
  static create(name: string, canvasId: string): PipelineBuilder {
    return new PipelineBuilder(name, canvasId);
  }

  /**
   * Start a connection from a widget's output port
   */
  connect(widget: WidgetInstance | string, outputPort: string): ConnectionSource {
    const widgetInstance = typeof widget === 'string' 
      ? { id: widget, widgetDefId: widget, position: { x: 0, y: 0 }, width: 200, height: 150 } as WidgetInstance
      : widget;

    // Ensure widget has a node
    this.ensureNode(widgetInstance);

    this.state.pendingConnection = {
      fromWidget: widgetInstance,
      fromPort: outputPort
    };

    return new ConnectionSource(this);
  }

  /**
   * Complete a connection to a widget's input port
   * (Called by ConnectionSource)
   */
  _completeTo(toWidget: WidgetInstance | string, inputPort: string): PipelineBuilder {
    if (!this.state.pendingConnection) {
      throw new Error('No pending connection. Call connect() first.');
    }

    const targetWidget = typeof toWidget === 'string'
      ? { id: toWidget, widgetDefId: toWidget, position: { x: 0, y: 0 }, width: 200, height: 150 } as WidgetInstance
      : toWidget;

    // Ensure target widget has a node
    this.ensureNode(targetWidget);

    const fromNode = this.state.nodeMap.get(this.state.pendingConnection.fromWidget.id)!;
    const toNode = this.state.nodeMap.get(targetWidget.id)!;

    // Create the connection
    const connection = createConnection(
      fromNode.id,
      this.state.pendingConnection.fromPort,
      toNode.id,
      inputPort
    );

    this.state.pipeline.connections.push(connection);
    this.state.pendingConnection = null;

    return this;
  }

  /**
   * Set pipeline name
   */
  name(name: string): PipelineBuilder {
    this.state.pipeline.name = name;
    return this;
  }

  /**
   * Set pipeline description
   */
  description(desc: string): PipelineBuilder {
    this.state.pipeline.description = desc;
    return this;
  }

  /**
   * Enable or disable the pipeline
   */
  enabled(value: boolean): PipelineBuilder {
    this.state.pipeline.enabled = value;
    return this;
  }

  /**
   * Add a widget node without connections
   */
  addWidget(widget: WidgetInstance, label?: string): PipelineBuilder {
    this.ensureNode(widget, label);
    return this;
  }

  /**
   * Remove a connection by source and target
   */
  disconnect(
    fromWidgetId: string, 
    fromPort: string, 
    toWidgetId: string, 
    toPort: string
  ): PipelineBuilder {
    const fromNode = this.state.nodeMap.get(fromWidgetId);
    const toNode = this.state.nodeMap.get(toWidgetId);

    if (!fromNode || !toNode) return this;

    this.state.pipeline.connections = this.state.pipeline.connections.filter(conn =>
      !(conn.from.nodeId === fromNode.id && 
        conn.from.portName === fromPort &&
        conn.to.nodeId === toNode.id &&
        conn.to.portName === toPort)
    );

    return this;
  }

  /**
   * Clear all connections
   */
  clearConnections(): PipelineBuilder {
    this.state.pipeline.connections = [];
    return this;
  }

  /**
   * Build and return the pipeline
   */
  build(): Pipeline {
    if (this.state.pendingConnection) {
      console.warn('[PipelineBuilder] Incomplete connection discarded');
    }
    return { ...this.state.pipeline };
  }

  /**
   * Ensure a widget has a node in the pipeline
   */
  private ensureNode(widget: WidgetInstance, label?: string): PipelineNode {
    if (this.state.nodeMap.has(widget.id)) {
      return this.state.nodeMap.get(widget.id)!;
    }

    const nodeCount = this.state.nodeMap.size;
    const node = createWidgetNode(
      widget.id,
      { x: 50 + (nodeCount % 4) * 200, y: 50 + Math.floor(nodeCount / 4) * 150 },
      label || widget.widgetDefId
    );

    this.state.pipeline.nodes.push(node);
    this.state.nodeMap.set(widget.id, node);

    return node;
  }
}

/**
 * ConnectionSource - Intermediate object for fluent connection building
 */
class ConnectionSource {
  constructor(private builder: PipelineBuilder) {}

  /**
   * Connect to a widget's input port
   */
  to(widget: WidgetInstance | string, inputPort: string): PipelineBuilder {
    return this.builder._completeTo(widget, inputPort);
  }
}

// ==================
// Quick Connection Helpers
// ==================

/**
 * Create a simple one-to-one pipeline connection
 */
export function createSimplePipeline(
  name: string,
  canvasId: string,
  connections: Array<{
    from: { widget: WidgetInstance | string; port: string };
    to: { widget: WidgetInstance | string; port: string };
  }>
): Pipeline {
  let builder = PipelineBuilder.create(name, canvasId);

  for (const conn of connections) {
    builder = builder
      .connect(conn.from.widget, conn.from.port)
      .to(conn.to.widget, conn.to.port);
  }

  return builder.build();
}

/**
 * Create a fan-out pipeline (one output to many inputs)
 */
export function createFanOutPipeline(
  name: string,
  canvasId: string,
  source: { widget: WidgetInstance | string; port: string },
  targets: Array<{ widget: WidgetInstance | string; port: string }>
): Pipeline {
  let builder = PipelineBuilder.create(name, canvasId);

  for (const target of targets) {
    builder = builder
      .connect(source.widget, source.port)
      .to(target.widget, target.port);
  }

  return builder.build();
}

/**
 * Create a fan-in pipeline (many outputs to one input)
 */
export function createFanInPipeline(
  name: string,
  canvasId: string,
  sources: Array<{ widget: WidgetInstance | string; port: string }>,
  target: { widget: WidgetInstance | string; port: string }
): Pipeline {
  let builder = PipelineBuilder.create(name, canvasId);

  for (const source of sources) {
    builder = builder
      .connect(source.widget, source.port)
      .to(target.widget, target.port);
  }

  return builder.build();
}

/**
 * Merge two pipelines
 */
export function mergePipelines(base: Pipeline, addition: Pipeline): Pipeline {
  // Create node ID mapping for addition pipeline
  const nodeIdMap = new Map<string, string>();
  
  const mergedNodes = [...base.nodes];
  const mergedConnections = [...base.connections];

  // Add nodes from addition, generating new IDs to avoid conflicts
  for (const node of addition.nodes) {
    // Check if widget already has a node in base
    const existingNode = base.nodes.find(n => n.widgetInstanceId === node.widgetInstanceId);
    if (existingNode) {
      nodeIdMap.set(node.id, existingNode.id);
    } else {
      const newNode = { ...node, id: crypto.randomUUID() };
      nodeIdMap.set(node.id, newNode.id);
      mergedNodes.push(newNode);
    }
  }

  // Add connections with remapped node IDs
  for (const conn of addition.connections) {
    const fromNodeId = nodeIdMap.get(conn.from.nodeId) || conn.from.nodeId;
    const toNodeId = nodeIdMap.get(conn.to.nodeId) || conn.to.nodeId;

    // Check for duplicate connection
    const isDuplicate = base.connections.some(c =>
      c.from.nodeId === fromNodeId &&
      c.from.portName === conn.from.portName &&
      c.to.nodeId === toNodeId &&
      c.to.portName === conn.to.portName
    );

    if (!isDuplicate) {
      mergedConnections.push({
        ...conn,
        id: crypto.randomUUID(),
        from: { ...conn.from, nodeId: fromNodeId },
        to: { ...conn.to, nodeId: toNodeId }
      });
    }
  }

  return {
    ...base,
    nodes: mergedNodes,
    connections: mergedConnections,
    updatedAt: new Date().toISOString()
  };
}

