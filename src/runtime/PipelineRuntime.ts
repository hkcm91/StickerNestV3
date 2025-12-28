/**
 * StickerNest v2 - PipelineRuntime
 * Manages pipeline execution and event routing between widgets
 * Subscribes to EventBus for widget output events and routes to connected inputs
 * Phase 8C implementation
 */

import type { Pipeline, PipelineConnection, PipelineNode } from '../types/domain';
import type { Event, UnsubscribeFn } from '../types/runtime';
import type { WidgetManifest } from '../types/manifest';
import { EventBus } from './EventBus';

/**
 * Event emitted when a widget produces output
 * Widgets emit: widget:output with { portName, value }
 */
export interface WidgetOutputEvent {
  widgetInstanceId: string;
  portName: string;
  value: any;
}

/**
 * Event sent to a widget's input port
 * PipelineRuntime emits: widget:input with { targetWidgetId, portName, value }
 */
export interface WidgetInputEvent {
  targetWidgetId: string;
  portName: string;
  value: any;
  sourceWidgetId: string;
  sourcePortName: string;
  connectionId: string;
}

/**
 * Debug info for pipeline activity
 */
export interface PipelineActivityEvent {
  pipelineId: string;
  pipelineName: string;
  connectionId: string;
  from: { widgetInstanceId: string; portName: string };
  to: { widgetInstanceId: string; portName: string };
  value: any;
  timestamp: number;
}

/**
 * Connection lookup for fast routing
 */
interface ConnectionMap {
  /** Map from "widgetInstanceId:portName" to array of target connections */
  bySource: Map<string, PipelineConnection[]>;
  /** Map from connection ID to connection */
  byId: Map<string, PipelineConnection>;
}

/**
 * Node lookup for fast access
 */
interface NodeMap {
  /** Map from node ID to node */
  byId: Map<string, PipelineNode>;
  /** Map from widget instance ID to node */
  byWidgetInstance: Map<string, PipelineNode>;
  /** Map from widget definition ID to node (for fallback matching) */
  byWidgetDef: Map<string, PipelineNode>;
}

/**
 * Live widget info for runtime ID resolution
 */
interface LiveWidgetInfo {
  instanceId: string;
  defId: string;
}

export class PipelineRuntime {
  private eventBus: EventBus;
  private pipelines: Map<string, Pipeline> = new Map();
  private connectionMaps: Map<string, ConnectionMap> = new Map();
  private nodeMaps: Map<string, NodeMap> = new Map();
  private eventSubscriptions: UnsubscribeFn[] = [];
  private debugEnabled: boolean;
  private canvasId: string;

  /** Cache of widget manifests for port validation */
  private manifestCache: Map<string, WidgetManifest> = new Map();

  /** Live widget instances for ID resolution (instanceId -> defId) */
  private liveWidgets: Map<string, LiveWidgetInfo> = new Map();
  /** Reverse lookup (defId -> instanceId) for widgets on canvas */
  private defToInstanceId: Map<string, string> = new Map();

  /**
   * Broadcast event listeners: Maps event type -> Set of widget instance IDs that listen for it
   * This enables manifest-based event routing without explicit pipeline connections
   */
  private broadcastListeners: Map<string, Set<string>> = new Map();

  /**
   * Recent broadcast tracking to prevent duplicate event delivery
   * Key format: "eventType:sourceWidgetId:timestamp" - cleared after short delay
   */
  private recentBroadcasts: Set<string> = new Set();

  constructor(canvasId: string, eventBus: EventBus, debugEnabled: boolean = false) {
    this.canvasId = canvasId;
    this.eventBus = eventBus;
    this.debugEnabled = debugEnabled;

    this.setupEventListeners();
  }

  /**
   * Load pipelines for the canvas
   * Builds connection maps for efficient routing
   */
  loadPipelines(pipelines: Pipeline[]): void {
    // Clear existing pipelines
    this.pipelines.clear();
    this.connectionMaps.clear();
    this.nodeMaps.clear();

    console.log(`[PipelineRuntime] ========================================`);
    console.log(`[PipelineRuntime] Loading ${pipelines.length} pipelines for canvas ${this.canvasId}`);
    console.log(`[PipelineRuntime] ========================================`);

    for (const pipeline of pipelines) {
      // Accept pipelines for this canvas OR for 'default' canvas (Widget Lab compatibility)
      if (pipeline.canvasId !== this.canvasId && pipeline.canvasId !== 'default') {
        console.warn(`Pipeline ${pipeline.id} belongs to different canvas (${pipeline.canvasId}), skipping`);
        continue;
      }

      console.log(`[PipelineRuntime] Loading pipeline: ${pipeline.name} (${pipeline.id})`);
      console.log(`[PipelineRuntime]   Nodes: ${pipeline.nodes.length}, Connections: ${pipeline.connections.length}`);
      pipeline.nodes.forEach(n => {
        console.log(`[PipelineRuntime]   - Node: ${n.id} -> widget: ${n.widgetInstanceId}`);
      });
      pipeline.connections.forEach(c => {
        console.log(`[PipelineRuntime]   - Connection: ${c.from.nodeId}:${c.from.portName} -> ${c.to.nodeId}:${c.to.portName}`);
      });

      this.pipelines.set(pipeline.id, pipeline);
      this.buildConnectionMap(pipeline);
      this.buildNodeMap(pipeline);
    }

    this.emitDebug('info', `Loaded ${pipelines.length} pipelines`);

    // Emit pipelines loaded event
    this.eventBus.emit({
      type: 'pipeline:loaded',
      scope: 'canvas',
      payload: {
        canvasId: this.canvasId,
        pipelineIds: pipelines.map(p => p.id),
        count: pipelines.length
      }
    });
  }

  /**
   * Add or update a single pipeline
   */
  updatePipeline(pipeline: Pipeline): void {
    // Accept pipelines for this canvas OR for 'default' canvas (Widget Lab compatibility)
    if (pipeline.canvasId !== this.canvasId && pipeline.canvasId !== 'default') {
      console.warn(`Pipeline ${pipeline.id} belongs to different canvas (${pipeline.canvasId})`);
      return;
    }

    this.pipelines.set(pipeline.id, pipeline);
    this.buildConnectionMap(pipeline);
    this.buildNodeMap(pipeline);

    this.emitDebug('info', `Updated pipeline: ${pipeline.name}`);

    this.eventBus.emit({
      type: 'pipeline:updated',
      scope: 'canvas',
      payload: { pipelineId: pipeline.id, pipelineName: pipeline.name }
    });
  }

  /**
   * Remove a pipeline
   */
  removePipeline(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;

    this.pipelines.delete(pipelineId);
    this.connectionMaps.delete(pipelineId);
    this.nodeMaps.delete(pipelineId);

    this.emitDebug('info', `Removed pipeline: ${pipeline.name}`);

    this.eventBus.emit({
      type: 'pipeline:removed',
      scope: 'canvas',
      payload: { pipelineId, pipelineName: pipeline.name }
    });
  }

  /**
   * Register a widget manifest for port validation
   */
  registerManifest(widgetDefId: string, manifest: WidgetManifest): void {
    this.manifestCache.set(widgetDefId, manifest);
  }

  /**
   * Register a live widget instance for ID resolution
   * This allows pipelines with definition IDs to match runtime instance IDs
   */
  registerWidget(instanceId: string, defId: string): void {
    this.liveWidgets.set(instanceId, { instanceId, defId });
    this.defToInstanceId.set(defId, instanceId);
    console.log(`[PipelineRuntime] Registered widget: ${defId} -> ${instanceId}`);
  }

  /**
   * Unregister a widget instance
   */
  unregisterWidget(instanceId: string): void {
    const info = this.liveWidgets.get(instanceId);
    if (info) {
      this.defToInstanceId.delete(info.defId);
      this.liveWidgets.delete(instanceId);
      console.log(`[PipelineRuntime] Unregistered widget: ${info.defId}`);
    }
    // Also remove from broadcast listeners
    this.unregisterBroadcastListener(instanceId);
  }

  /**
   * Register a widget to receive broadcast events based on its manifest.events.listens
   */
  registerBroadcastListener(instanceId: string, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      if (!this.broadcastListeners.has(eventType)) {
        this.broadcastListeners.set(eventType, new Set());
      }
      this.broadcastListeners.get(eventType)!.add(instanceId);
    }
    if (eventTypes.length > 0) {
      console.log(`[PipelineRuntime] Registered broadcast listener ${instanceId} for: ${eventTypes.join(', ')}`);
    }
  }

  /**
   * Unregister a widget from all broadcast events
   */
  unregisterBroadcastListener(instanceId: string): void {
    for (const [eventType, listeners] of this.broadcastListeners.entries()) {
      listeners.delete(instanceId);
      if (listeners.size === 0) {
        this.broadcastListeners.delete(eventType);
      }
    }
  }

  /**
   * Broadcast an event to all widgets that listen for it (based on manifest declarations)
   * Supports wildcard patterns: "audio:*" matches "audio:beat-detected"
   */
  private broadcastEvent(eventType: string, sourceWidgetId: string, value: any): void {
    // DEBUG: Log cross-canvas broadcasts
    if (eventType.startsWith('cross.')) {
      console.log(`[PipelineRuntime:${this.canvasId.slice(0,12)}] 🎯 broadcastEvent called for ${eventType}`, {
        sourceWidgetId,
        allListeners: Array.from(this.broadcastListeners.keys()),
        listenersForThisType: Array.from(this.broadcastListeners.get(eventType) || [])
      });
    }
    
    // Deduplication: prevent the same event from being broadcast twice in quick succession
    // This can happen when both widget:output and wildcard handlers fire for the same event
    const dedupeKey = `${eventType}:${sourceWidgetId}`;
    if (this.recentBroadcasts.has(dedupeKey)) {
      // Already broadcast this event recently, skip to prevent duplicates
      if (eventType.startsWith('cross.')) {
        console.log(`[PipelineRuntime:${this.canvasId.slice(0,12)}] ⏭️ SKIPPED (dedupe): ${dedupeKey}`);
      }
      return;
    }

    // Mark as recently broadcast and clear after 50ms
    this.recentBroadcasts.add(dedupeKey);
    setTimeout(() => this.recentBroadcasts.delete(dedupeKey), 50);

    // Collect all matching listeners (exact match + wildcard match)
    const matchingListeners = new Set<string>();

    // Check exact match
    const exactListeners = this.broadcastListeners.get(eventType);
    if (exactListeners) {
      exactListeners.forEach(id => matchingListeners.add(id));
    }

    // Check wildcard matches (e.g., "audio:*" matches "audio:beat-detected")
    const eventNamespace = eventType.includes(':') ? eventType.split(':')[0] : null;
    if (eventNamespace) {
      const wildcardKey = `${eventNamespace}:*`;
      const wildcardListeners = this.broadcastListeners.get(wildcardKey);
      if (wildcardListeners) {
        wildcardListeners.forEach(id => matchingListeners.add(id));
      }
    }

    // Also check global wildcard "*"
    const globalWildcard = this.broadcastListeners.get('*');
    if (globalWildcard) {
      globalWildcard.forEach(id => matchingListeners.add(id));
    }

    if (matchingListeners.size === 0) {
      if (eventType.startsWith('cross.')) {
        console.log(`[PipelineRuntime:${this.canvasId.slice(0,12)}] ⚠️ NO LISTENERS for ${eventType}`);
      }
      return;
    }

    console.log(`[PipelineRuntime] Broadcasting "${eventType}" to ${matchingListeners.size} listener(s)`);

    for (const targetInstanceId of matchingListeners) {
      // Don't send to the source widget
      if (targetInstanceId === sourceWidgetId) continue;

      // Emit widget:input event for the target widget
      this.eventBus.emit({
        type: 'widget:input',
        scope: 'widget',
        payload: {
          targetWidgetId: targetInstanceId,
          portName: eventType, // Use full event type as port name for broadcast events
          value,
          sourceWidgetId,
          sourcePortName: eventType,
          connectionId: `broadcast:${eventType}`
        } as WidgetInputEvent
      });

      this.emitDebug('info', `Broadcast ${eventType} to ${targetInstanceId}`);
    }
  }

  /**
   * Update all live widget registrations at once
   */
  updateLiveWidgets(widgets: Array<{ id: string; widgetDefId: string }>): void {
    // Clear existing registrations
    this.liveWidgets.clear();
    this.defToInstanceId.clear();

    // Register all current widgets
    for (const widget of widgets) {
      this.liveWidgets.set(widget.id, { instanceId: widget.id, defId: widget.widgetDefId });
      this.defToInstanceId.set(widget.widgetDefId, widget.id);
    }

    console.log(`[PipelineRuntime] Updated ${widgets.length} live widget registrations:`,
      Array.from(this.defToInstanceId.entries()).map(([d, i]) => `${d}->${i.slice(0,8)}`).join(', '));
  }

  /**
   * Resolve a widget ID (could be instance ID or definition ID) to the actual runtime instance ID
   */
  private resolveWidgetId(idOrDefId: string): string {
    // If it's already a live widget instance ID, return it
    if (this.liveWidgets.has(idOrDefId)) {
      return idOrDefId;
    }

    // Try to resolve as a definition ID
    const instanceId = this.defToInstanceId.get(idOrDefId);
    if (instanceId) {
      console.log(`[PipelineRuntime] Resolved defId ${idOrDefId} to instanceId ${instanceId}`);
      return instanceId;
    }

    // Return original (may be an old instance ID from a saved pipeline)
    return idOrDefId;
  }

  /**
   * Get all loaded pipelines
   */
  getPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get a specific pipeline by ID
   */
  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * Check if a widget has any pipeline connections
   */
  hasConnections(widgetInstanceId: string): boolean {
    for (const nodeMap of this.nodeMaps.values()) {
      if (nodeMap.byWidgetInstance.has(widgetInstanceId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get connections for a specific widget
   */
  getConnectionsForWidget(widgetInstanceId: string): PipelineConnection[] {
    const connections: PipelineConnection[] = [];

    for (const [pipelineId, connectionMap] of this.connectionMaps.entries()) {
      const pipeline = this.pipelines.get(pipelineId);
      if (!pipeline?.enabled) continue;

      const nodeMap = this.nodeMaps.get(pipelineId);
      if (!nodeMap) continue;

      const node = nodeMap.byWidgetInstance.get(widgetInstanceId);
      if (!node) continue;

      // Find all connections where this node is source or target
      for (const conn of pipeline.connections) {
        if (conn.from.nodeId === node.id || conn.to.nodeId === node.id) {
          connections.push(conn);
        }
      }
    }

    return connections;
  }

  /**
   * Manually trigger an output event for testing/debugging
   */
  triggerOutput(widgetInstanceId: string, portName: string, value: any): void {
    this.routeOutput(widgetInstanceId, portName, value);
  }

  /**
   * Cleanup and destroy the runtime
   */
  destroy(): void {
    // Unsubscribe from all events
    this.eventSubscriptions.forEach(unsub => unsub());
    this.eventSubscriptions = [];

    // Clear all data
    this.pipelines.clear();
    this.connectionMaps.clear();
    this.nodeMaps.clear();
    this.manifestCache.clear();
    this.recentBroadcasts.clear();

    this.eventBus.emit({
      type: 'pipeline:destroyed',
      scope: 'canvas',
      payload: { canvasId: this.canvasId }
    });
  }

  // Private methods

  private setupEventListeners(): void {
    console.log('[PipelineRuntime] Setting up event listeners');

    // Listen for widget output events
    const unsubOutput = this.eventBus.on('widget:output', (event: Event) => {
      console.log('[PipelineRuntime] Received widget:output event:', event);
      const { widgetInstanceId, portName, value } = event.payload as WidgetOutputEvent;

      if (!widgetInstanceId || !portName) {
        console.warn('[PipelineRuntime] Invalid widget:output event - missing widgetInstanceId or portName', event.payload);
        this.emitDebug('warn', 'Invalid widget:output event - missing widgetInstanceId or portName');
        return;
      }

      // DEBUG: Log cross-canvas events specifically
      if (portName.startsWith('cross.')) {
        console.log(`[PipelineRuntime:${this.canvasId.slice(0,12)}] 📨 CROSS-CANVAS OUTPUT: ${portName}`, {
          widgetInstanceId,
          value,
          originTabId: event.metadata?.originTabId,
          broadcastListeners: Array.from(this.broadcastListeners.get(portName) || [])
        });
      }

      console.log(`[PipelineRuntime] Routing output: ${widgetInstanceId}:${portName} = `, value);
      this.routeOutput(widgetInstanceId, portName, value);

      // Also broadcast to any widgets that declared they listen for this event type
      this.broadcastEvent(portName, widgetInstanceId, value);
    });
    this.eventSubscriptions.push(unsubOutput);

    // Also listen for generic events that might be outputs
    // Widgets might emit custom event types that should be routed
    const unsubGeneric = this.eventBus.on('*', (event: Event) => {
      // Skip non-widget events and already-handled output events
      if (!event.sourceWidgetId || event.type === 'widget:output' || event.type === 'widget:input') {
        return;
      }

      // Check if this event type matches any output port name
      // Convention: event type "myWidget:dataChanged" could map to port "dataChanged"
      const portName = this.extractPortNameFromEventType(event.type);
      if (portName) {
        this.routeOutput(event.sourceWidgetId, portName, event.payload);
        // Also broadcast to manifest-declared listeners
        this.broadcastEvent(event.type, event.sourceWidgetId, event.payload);
      }
    });
    this.eventSubscriptions.push(unsubGeneric);

    // Listen for widget state changes as potential outputs
    const unsubState = this.eventBus.on('widget:stateChanged', (event: Event) => {
      const { widgetInstanceId, patch } = event.payload;
      if (!widgetInstanceId || !patch) return;

      // Route each changed state key as a potential output port
      for (const [key, value] of Object.entries(patch)) {
        this.routeOutput(widgetInstanceId, key, value);
      }
    });
    this.eventSubscriptions.push(unsubState);
  }

  /**
   * Route an output from a widget to all connected inputs
   */
  private routeOutput(widgetInstanceId: string, portName: string, value: any): void {
    const sourceKey = `${widgetInstanceId}:${portName}`;
    let routedCount = 0;

    console.log(`[PipelineRuntime] ----------------------------------------`);
    console.log(`[PipelineRuntime] 🚀 routeOutput called:`);
    console.log(`[PipelineRuntime]   Widget ID: ${widgetInstanceId}`);
    console.log(`[PipelineRuntime]   Port: ${portName}`);
    console.log(`[PipelineRuntime]   Value:`, value);
    console.log(`[PipelineRuntime]   Available pipelines: ${this.pipelines.size}`);

    // Check each enabled pipeline for matching connections
    for (const [pipelineId, pipeline] of this.pipelines.entries()) {
      console.log(`[PipelineRuntime] Checking pipeline: ${pipeline.name} (enabled: ${pipeline.enabled})`);
      if (!pipeline.enabled) continue;

      const nodeMap = this.nodeMaps.get(pipelineId);
      const connectionMap = this.connectionMaps.get(pipelineId);
      if (!nodeMap || !connectionMap) {
        console.log(`[PipelineRuntime] Missing nodeMap or connectionMap for pipeline ${pipelineId}`);
        continue;
      }

      // Find the source node - try multiple matching strategies
      let sourceNode = nodeMap.byWidgetInstance.get(widgetInstanceId);

      // Strategy 2: Try to find by widget definition ID if the instance lookup failed
      if (!sourceNode) {
        const widgetInfo = this.liveWidgets.get(widgetInstanceId);
        if (widgetInfo) {
          // Try looking up by definition ID in the nodeMap
          sourceNode = nodeMap.byWidgetDef.get(widgetInfo.defId);
          if (sourceNode) {
            console.log(`[PipelineRuntime] Found node via defId fallback: ${widgetInfo.defId}`);
          }
        }
      }

      // Strategy 3: Try to match by node label (often contains the widget definition ID)
      if (!sourceNode) {
        const widgetInfo = this.liveWidgets.get(widgetInstanceId);
        if (widgetInfo) {
          for (const node of pipeline.nodes) {
            if (node.label === widgetInfo.defId || node.widgetInstanceId === widgetInfo.defId) {
              sourceNode = node;
              console.log(`[PipelineRuntime] Found node via label/defId scan: ${node.label || node.widgetInstanceId}`);
              break;
            }
          }
        }
      }

      if (!sourceNode) {
        console.log(`[PipelineRuntime] No source node found for widget ${widgetInstanceId}`);
        console.log(`[PipelineRuntime] Available widget instances in nodeMap:`, Array.from(nodeMap.byWidgetInstance.keys()));
        console.log(`[PipelineRuntime] Available widget defs in nodeMap:`, Array.from(nodeMap.byWidgetDef.keys()));
        console.log(`[PipelineRuntime] Live widgets registered:`, Array.from(this.liveWidgets.entries()).map(([k,v]) => `${v.defId}->${k.slice(0,8)}`));
        continue;
      }

      console.log(`[PipelineRuntime] Found source node: ${sourceNode.id}`);

      // Look up connections from this source port
      const nodeSourceKey = `${sourceNode.id}:${portName}`;
      const connections = connectionMap.bySource.get(nodeSourceKey);
      console.log(`[PipelineRuntime] Looking for connections with key: ${nodeSourceKey}`);
      console.log(`[PipelineRuntime] Available connection keys:`, Array.from(connectionMap.bySource.keys()));
      if (!connections || connections.length === 0) {
        console.log(`[PipelineRuntime] No connections found for ${nodeSourceKey}`);
        continue;
      }
      console.log(`[PipelineRuntime] Found ${connections.length} connections for ${nodeSourceKey}`);

      // Route to each connected target
      for (const conn of connections) {
        if (conn.enabled === false) {
          console.log(`[PipelineRuntime] Connection ${conn.id} is disabled, skipping`);
          continue;
        }

        const targetNode = nodeMap.byId.get(conn.to.nodeId);
        if (!targetNode || !targetNode.widgetInstanceId) {
          console.log(`[PipelineRuntime] Target node not found for connection ${conn.id}`);
          continue;
        }

        // Resolve target widget ID from definition ID to runtime UUID
        const resolvedTargetId = this.resolveWidgetId(targetNode.widgetInstanceId);
        console.log(`[PipelineRuntime] ✅ ROUTING: ${widgetInstanceId}:${portName} -> ${resolvedTargetId}:${conn.to.portName}`);

        // Emit input event to target widget
        const inputEvent: WidgetInputEvent = {
          targetWidgetId: resolvedTargetId,
          portName: conn.to.portName,
          value,
          sourceWidgetId: widgetInstanceId,
          sourcePortName: portName,
          connectionId: conn.id
        };

        console.log(`[PipelineRuntime] Emitting widget:input event:`, inputEvent);
        this.eventBus.emit({
          type: 'widget:input',
          scope: 'widget',
          targetWidgetId: resolvedTargetId,
          sourceWidgetId: widgetInstanceId,
          payload: inputEvent
        });

        routedCount++;

        // Emit activity event for debugging
        if (this.debugEnabled) {
          const activityEvent: PipelineActivityEvent = {
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            connectionId: conn.id,
            from: { widgetInstanceId, portName },
            to: { widgetInstanceId: resolvedTargetId, portName: conn.to.portName },
            value,
            timestamp: Date.now()
          };

          this.eventBus.emit({
            type: 'pipeline:activity',
            scope: 'canvas',
            payload: activityEvent
          });
        }
      }
    }

    if (routedCount > 0) {
      console.log(`[PipelineRuntime] ✅ Successfully routed to ${routedCount} target(s)`);
      this.emitDebug('log', `Routed ${portName} from ${widgetInstanceId} to ${routedCount} targets`);
    } else {
      console.log(`[PipelineRuntime] ⚠️ No connections found for ${widgetInstanceId}:${portName}`);
      console.log(`[PipelineRuntime] Hint: Make sure to connect widgets in Connect mode before clicking`);
    }
    console.log(`[PipelineRuntime] ----------------------------------------`);
  }

  /**
   * Build connection lookup map for a pipeline
   */
  private buildConnectionMap(pipeline: Pipeline): void {
    const connectionMap: ConnectionMap = {
      bySource: new Map(),
      byId: new Map()
    };

    for (const conn of pipeline.connections) {
      // Index by connection ID
      connectionMap.byId.set(conn.id, conn);

      // Index by source (nodeId:portName)
      const sourceKey = `${conn.from.nodeId}:${conn.from.portName}`;
      if (!connectionMap.bySource.has(sourceKey)) {
        connectionMap.bySource.set(sourceKey, []);
      }
      connectionMap.bySource.get(sourceKey)!.push(conn);
    }

    this.connectionMaps.set(pipeline.id, connectionMap);
  }

  /**
   * Build node lookup map for a pipeline
   */
  private buildNodeMap(pipeline: Pipeline): void {
    const nodeMap: NodeMap = {
      byId: new Map(),
      byWidgetInstance: new Map(),
      byWidgetDef: new Map()
    };

    for (const node of pipeline.nodes) {
      nodeMap.byId.set(node.id, node);
      if (node.widgetInstanceId) {
        nodeMap.byWidgetInstance.set(node.widgetInstanceId, node);

        // Also index by definition ID if the widgetInstanceId looks like a definition ID
        // (contains only alphanumeric, hyphens, and underscores without UUID structure)
        const isDefinitionId = !node.widgetInstanceId.includes('-') ||
          node.widgetInstanceId.split('-').length < 5;
        if (isDefinitionId) {
          nodeMap.byWidgetDef.set(node.widgetInstanceId, node);
        }

        // Also check if we have a label that might be the definition ID
        if (node.label) {
          nodeMap.byWidgetDef.set(node.label, node);
        }
      }
    }

    this.nodeMaps.set(pipeline.id, nodeMap);
  }

  /**
   * Extract potential port name from event type
   * e.g., "myWidget:dataChanged" -> "dataChanged"
   * e.g., "output:temperature" -> "temperature"
   */
  private extractPortNameFromEventType(eventType: string): string | null {
    // Check for output: prefix
    if (eventType.startsWith('output:')) {
      return eventType.slice(7);
    }

    // Check for widgetId:portName pattern
    const colonIndex = eventType.lastIndexOf(':');
    if (colonIndex > 0) {
      return eventType.slice(colonIndex + 1);
    }

    return null;
  }

  /**
   * Emit debug message
   */
  private emitDebug(level: 'log' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.debugEnabled) return;

    this.eventBus.emit({
      type: 'debug:message',
      scope: 'canvas',
      payload: {
        level,
        message: `[PipelineRuntime] ${message}`,
        data,
        timestamp: Date.now(),
        widgetInstanceId: 'pipeline-runtime'
      }
    });
  }
}
