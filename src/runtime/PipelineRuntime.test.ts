/**
 * PipelineRuntime Unit Tests
 * Tests widget ID resolution and pipeline event routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipelineRuntime } from './PipelineRuntime';
import { EventBus } from './EventBus';
import type { Pipeline, PipelineNode, PipelineConnection } from '../types/domain';

describe('PipelineRuntime', () => {
  let eventBus: EventBus;
  let pipelineRuntime: PipelineRuntime;

  beforeEach(() => {
    eventBus = new EventBus();
    pipelineRuntime = new PipelineRuntime('test-canvas', eventBus, false);
  });

  describe('Widget ID Resolution', () => {
    it('should resolve definition ID to runtime UUID', () => {
      // Register widgets with their definition IDs
      pipelineRuntime.updateLiveWidgets([
        { id: 'uuid-123-abc', widgetDefId: 'ping-sender' },
        { id: 'uuid-456-def', widgetDefId: 'ping-receiver' },
      ]);

      // Access private method via any cast for testing
      const runtime = pipelineRuntime as any;

      // Should resolve definition ID to UUID
      expect(runtime.resolveWidgetId('ping-sender')).toBe('uuid-123-abc');
      expect(runtime.resolveWidgetId('ping-receiver')).toBe('uuid-456-def');
    });

    it('should return original ID if already a UUID', () => {
      pipelineRuntime.updateLiveWidgets([
        { id: 'uuid-123-abc', widgetDefId: 'ping-sender' },
      ]);

      const runtime = pipelineRuntime as any;

      // Should return UUID as-is
      expect(runtime.resolveWidgetId('uuid-123-abc')).toBe('uuid-123-abc');
    });

    it('should return original ID if not found', () => {
      const runtime = pipelineRuntime as any;

      // Unknown ID should be returned as-is
      expect(runtime.resolveWidgetId('unknown-widget')).toBe('unknown-widget');
    });
  });

  describe('Pipeline Loading', () => {
    it('should load pipelines and build node maps', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Test Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'node-2', widgetInstanceId: 'ping-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-2', portName: 'trigger' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      expect(pipelineRuntime.getPipelines()).toHaveLength(1);
      expect(pipelineRuntime.getPipeline('pipeline-1')).toBeDefined();
    });

    it('should index nodes by definition ID', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Test Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
        ],
        connections: [],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      const runtime = pipelineRuntime as any;
      const nodeMap = runtime.nodeMaps.get('pipeline-1');

      // Should be indexed by definition ID (ping-sender has only one hyphen, not 5 parts)
      expect(nodeMap.byWidgetDef.get('ping-sender')).toBeDefined();
    });

    it('should skip pipelines from different canvas', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'different-canvas',
        name: 'Other Pipeline',
        nodes: [],
        connections: [],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      expect(pipelineRuntime.getPipelines()).toHaveLength(0);
    });

    it('should accept pipelines with default canvasId on any canvas', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'default',
        name: 'Default Canvas Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
        ],
        connections: [],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // PipelineRuntime was created with 'test-canvas', but should accept 'default' canvas pipelines
      pipelineRuntime.loadPipelines([pipeline]);

      expect(pipelineRuntime.getPipelines()).toHaveLength(1);
      expect(pipelineRuntime.getPipeline('pipeline-1')).toBeDefined();
    });
  });

  describe('Event Routing', () => {
    let receivedEvents: any[] = [];

    beforeEach(() => {
      receivedEvents = [];
      eventBus.on('widget:input', (event) => {
        receivedEvents.push(event);
      });
    });

    it('should route events between connected widgets using definition IDs', () => {
      // Setup pipeline with definition IDs
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Ping Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'node-2', widgetInstanceId: 'ping-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-2', portName: 'trigger' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      // Register live widgets (simulating canvas load)
      pipelineRuntime.updateLiveWidgets([
        { id: 'runtime-uuid-sender', widgetDefId: 'ping-sender' },
        { id: 'runtime-uuid-receiver', widgetDefId: 'ping-receiver' },
      ]);

      // Emit output event (widget uses its runtime UUID)
      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'runtime-uuid-sender',
        payload: {
          widgetInstanceId: 'runtime-uuid-sender',
          portName: 'ping',
          value: { message: 'Hello!' },
        },
      });

      // Should have routed to target with resolved UUID
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].payload.targetWidgetId).toBe('runtime-uuid-receiver');
      expect(receivedEvents[0].payload.portName).toBe('trigger');
      expect(receivedEvents[0].payload.value).toEqual({ message: 'Hello!' });
    });

    it('should not route when pipeline is disabled', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Disabled Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'node-2', widgetInstanceId: 'ping-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-2', portName: 'trigger' } },
        ],
        enabled: false, // Disabled!
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);
      pipelineRuntime.updateLiveWidgets([
        { id: 'runtime-uuid-sender', widgetDefId: 'ping-sender' },
        { id: 'runtime-uuid-receiver', widgetDefId: 'ping-receiver' },
      ]);

      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'runtime-uuid-sender',
        payload: {
          widgetInstanceId: 'runtime-uuid-sender',
          portName: 'ping',
          value: { message: 'Hello!' },
        },
      });

      // Should not route when disabled
      expect(receivedEvents).toHaveLength(0);
    });

    it('should not route when connection is disabled', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Test Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'node-2', widgetInstanceId: 'ping-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-2', portName: 'trigger' }, enabled: false },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);
      pipelineRuntime.updateLiveWidgets([
        { id: 'runtime-uuid-sender', widgetDefId: 'ping-sender' },
        { id: 'runtime-uuid-receiver', widgetDefId: 'ping-receiver' },
      ]);

      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'runtime-uuid-sender',
        payload: {
          widgetInstanceId: 'runtime-uuid-sender',
          portName: 'ping',
          value: { message: 'Hello!' },
        },
      });

      expect(receivedEvents).toHaveLength(0);
    });

    it('should route to multiple targets', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Multi-target Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'node-2', widgetInstanceId: 'ping-receiver-1', type: 'widget', position: { x: 100, y: 0 } },
          { id: 'node-3', widgetInstanceId: 'ping-receiver-2', type: 'widget', position: { x: 100, y: 100 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-2', portName: 'trigger' } },
          { id: 'conn-2', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-3', portName: 'trigger' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);
      pipelineRuntime.updateLiveWidgets([
        { id: 'uuid-sender', widgetDefId: 'ping-sender' },
        { id: 'uuid-receiver-1', widgetDefId: 'ping-receiver-1' },
        { id: 'uuid-receiver-2', widgetDefId: 'ping-receiver-2' },
      ]);

      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'uuid-sender',
        payload: {
          widgetInstanceId: 'uuid-sender',
          portName: 'ping',
          value: { message: 'Broadcast!' },
        },
      });

      // Should route to both receivers
      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents.map(e => e.payload.targetWidgetId).sort()).toEqual(['uuid-receiver-1', 'uuid-receiver-2']);
    });
  });

  describe('Widget Registration', () => {
    it('should register and unregister widgets', () => {
      pipelineRuntime.registerWidget('uuid-123', 'my-widget');

      const runtime = pipelineRuntime as any;
      expect(runtime.liveWidgets.get('uuid-123')).toEqual({ instanceId: 'uuid-123', defId: 'my-widget' });
      expect(runtime.defToInstanceId.get('my-widget')).toBe('uuid-123');

      pipelineRuntime.unregisterWidget('uuid-123');
      expect(runtime.liveWidgets.has('uuid-123')).toBe(false);
      expect(runtime.defToInstanceId.has('my-widget')).toBe(false);
    });

    it('should update all widgets at once', () => {
      pipelineRuntime.registerWidget('old-uuid', 'old-widget');

      pipelineRuntime.updateLiveWidgets([
        { id: 'new-uuid-1', widgetDefId: 'widget-1' },
        { id: 'new-uuid-2', widgetDefId: 'widget-2' },
      ]);

      const runtime = pipelineRuntime as any;

      // Old widget should be gone
      expect(runtime.liveWidgets.has('old-uuid')).toBe(false);

      // New widgets should be present
      expect(runtime.liveWidgets.get('new-uuid-1')).toEqual({ instanceId: 'new-uuid-1', defId: 'widget-1' });
      expect(runtime.liveWidgets.get('new-uuid-2')).toEqual({ instanceId: 'new-uuid-2', defId: 'widget-2' });
    });
  });

  describe('Fallback Node Matching', () => {
    it('should find node by label when widgetInstanceId fails', () => {
      const pipeline: Pipeline = {
        id: 'pipeline-1',
        canvasId: 'test-canvas',
        name: 'Labeled Pipeline',
        nodes: [
          { id: 'node-1', widgetInstanceId: 'old-uuid', type: 'widget', position: { x: 0, y: 0 }, label: 'ping-sender' },
          { id: 'node-2', widgetInstanceId: 'ping-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'node-1', portName: 'ping' }, to: { nodeId: 'node-2', portName: 'trigger' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      const runtime = pipelineRuntime as any;
      const nodeMap = runtime.nodeMaps.get('pipeline-1');

      // Should be indexed by label
      expect(nodeMap.byWidgetDef.get('ping-sender')).toBeDefined();
    });
  });

  describe('Mixed AI-Generated + Existing Widget Routing', () => {
    it('should route from AI widget to existing widget with matching port IDs', () => {
      // Simulate: AI widget (ai-color-picker) -> existing widget (color-receiver)
      // AI widget has io.outputs: [{ id: 'colorSelected' }]
      // Existing widget has inputs: { colorSelected: { type: 'string' } }

      const pipeline: Pipeline = {
        id: 'mixed-pipeline',
        canvasId: 'test-canvas',
        name: 'Mixed AI + Existing Pipeline',
        nodes: [
          { id: 'ai-node', widgetInstanceId: 'ai-color-picker', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'existing-node', widgetInstanceId: 'color-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'ai-node', portName: 'colorSelected' }, to: { nodeId: 'existing-node', portName: 'colorSelected' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      // Register the AI widget with runtime instance ID
      pipelineRuntime.registerWidget('ai-instance-uuid', 'ai-color-picker');
      pipelineRuntime.registerWidget('existing-instance-uuid', 'color-receiver');

      // Track routed events
      let routedEvent: any = null;
      eventBus.on('widget:input', (event) => {
        routedEvent = event;
      });

      // Simulate AI widget emitting 'colorSelected' (matching io.outputs[].id)
      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'ai-instance-uuid',
        payload: {
          widgetInstanceId: 'ai-instance-uuid',
          portName: 'colorSelected',  // Must match io.outputs[].id
          value: '#ff0000'
        }
      });

      // Verify routing to existing widget
      expect(routedEvent).not.toBeNull();
      expect(routedEvent.payload.targetWidgetId).toBe('existing-instance-uuid');
      expect(routedEvent.payload.portName).toBe('colorSelected');
      expect(routedEvent.payload.value).toBe('#ff0000');
    });

    it('should route from existing widget to AI widget with matching port IDs', () => {
      // Simulate: existing widget (ping-sender) -> AI widget (ai-ping-receiver)
      // Existing widget has outputs: { ping: { type: 'event' } }
      // AI widget has io.inputs: [{ id: 'ping' }]

      const pipeline: Pipeline = {
        id: 'reverse-pipeline',
        canvasId: 'test-canvas',
        name: 'Existing -> AI Pipeline',
        nodes: [
          { id: 'sender-node', widgetInstanceId: 'test-ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'ai-receiver', widgetInstanceId: 'ai-ping-receiver', type: 'widget', position: { x: 100, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'sender-node', portName: 'ping' }, to: { nodeId: 'ai-receiver', portName: 'ping' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      // Register widgets
      pipelineRuntime.registerWidget('sender-uuid', 'test-ping-sender');
      pipelineRuntime.registerWidget('ai-receiver-uuid', 'ai-ping-receiver');

      // Track routed events
      let routedEvent: any = null;
      eventBus.on('widget:input', (event) => {
        routedEvent = event;
      });

      // Simulate existing widget emitting 'ping'
      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'sender-uuid',
        payload: {
          widgetInstanceId: 'sender-uuid',
          portName: 'ping',
          value: { timestamp: Date.now() }
        }
      });

      // Verify routing to AI widget
      expect(routedEvent).not.toBeNull();
      expect(routedEvent.payload.targetWidgetId).toBe('ai-receiver-uuid');
      expect(routedEvent.payload.portName).toBe('ping');
    });

    it('should support chain: existing -> AI -> existing widgets', () => {
      // Pipeline: ping-sender -> ai-processor -> ping-receiver
      const pipeline: Pipeline = {
        id: 'chain-pipeline',
        canvasId: 'test-canvas',
        name: 'Chain Pipeline',
        nodes: [
          { id: 'sender', widgetInstanceId: 'ping-sender', type: 'widget', position: { x: 0, y: 0 } },
          { id: 'processor', widgetInstanceId: 'ai-processor', type: 'widget', position: { x: 100, y: 0 } },
          { id: 'receiver', widgetInstanceId: 'ping-receiver', type: 'widget', position: { x: 200, y: 0 } },
        ],
        connections: [
          { id: 'conn-1', from: { nodeId: 'sender', portName: 'ping' }, to: { nodeId: 'processor', portName: 'input' } },
          { id: 'conn-2', from: { nodeId: 'processor', portName: 'output' }, to: { nodeId: 'receiver', portName: 'ping' } },
        ],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pipelineRuntime.loadPipelines([pipeline]);

      // Register all widgets
      pipelineRuntime.registerWidget('sender-uuid', 'ping-sender');
      pipelineRuntime.registerWidget('processor-uuid', 'ai-processor');
      pipelineRuntime.registerWidget('receiver-uuid', 'ping-receiver');

      // Track events
      const routedEvents: any[] = [];
      eventBus.on('widget:input', (event) => {
        routedEvents.push(event);
      });

      // Step 1: sender emits ping -> processor receives on 'input'
      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'sender-uuid',
        payload: {
          widgetInstanceId: 'sender-uuid',
          portName: 'ping',
          value: { step: 1 }
        }
      });

      expect(routedEvents.length).toBe(1);
      expect(routedEvents[0].payload.targetWidgetId).toBe('processor-uuid');
      expect(routedEvents[0].payload.portName).toBe('input');

      // Step 2: processor emits output -> receiver receives on 'ping'
      eventBus.emit({
        type: 'widget:output',
        scope: 'widget',
        sourceWidgetId: 'processor-uuid',
        payload: {
          widgetInstanceId: 'processor-uuid',
          portName: 'output',
          value: { step: 2, processed: true }
        }
      });

      expect(routedEvents.length).toBe(2);
      expect(routedEvents[1].payload.targetWidgetId).toBe('receiver-uuid');
      expect(routedEvents[1].payload.portName).toBe('ping');
      expect(routedEvents[1].payload.value.processed).toBe(true);
    });
  });
});
