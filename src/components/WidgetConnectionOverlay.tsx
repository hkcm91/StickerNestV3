/**
 * StickerNest v2 - Widget Connection Overlay
 * Overlay for creating pipeline connections between widgets on canvas
 * Shows input/output ports on widgets in connect mode
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { WidgetInstance, Pipeline, PipelineNode, PipelineConnection } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';
import type { RuntimeContext } from '../runtime/RuntimeContext';
import { createEmptyPipeline, createConnection, savePipeline, listPipelinesForCanvas } from '../services/pipelinesClient';

interface WidgetConnectionOverlayProps {
  widgets: WidgetInstance[];
  runtime: RuntimeContext;
  manifests: Map<string, WidgetManifest>;
  canvasId: string;
}

interface Port {
  widgetId: string;
  portName: string;
  direction: 'input' | 'output';
  type: string;
  position: { x: number; y: number };
}

interface DragState {
  isDragging: boolean;
  sourcePort: Port | null;
  mousePos: { x: number; y: number };
}

const PORT_SIZE = 14;
const PORT_OFFSET = 7; // Half of PORT_SIZE

export const WidgetConnectionOverlay: React.FC<WidgetConnectionOverlayProps> = ({
  widgets,
  runtime,
  manifests,
  canvasId,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourcePort: null,
    mousePos: { x: 0, y: 0 },
  });
  const [hoveredPort, setHoveredPort] = useState<Port | null>(null);
  const [connections, setConnections] = useState<Array<{
    from: { widgetId: string; portName: string };
    to: { widgetId: string; portName: string };
    id: string;
  }>>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  // Load existing connections from pipelines
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const pipelines = await listPipelinesForCanvas(canvasId);

        const allConnections: Array<{
          from: { widgetId: string; portName: string };
          to: { widgetId: string; portName: string };
          id: string;
        }> = [];

        pipelines.forEach(pipeline => {
          pipeline.connections.forEach(conn => {
            // Find widget IDs from node IDs
            const fromNode = pipeline.nodes.find(n => n.id === conn.from.nodeId);
            const toNode = pipeline.nodes.find(n => n.id === conn.to.nodeId);
            // Only include connections between widget nodes (non-null widgetInstanceId)
            if (fromNode && toNode && fromNode.widgetInstanceId && toNode.widgetInstanceId) {
              allConnections.push({
                from: { widgetId: fromNode.widgetInstanceId, portName: conn.from.portName },
                to: { widgetId: toNode.widgetInstanceId, portName: conn.to.portName },
                id: conn.id,
              });
            }
          });
        });

        setConnections(allConnections);
      } catch (err) {
        console.warn('[WidgetConnectionOverlay] Failed to load connections:', err);
      }
    };

    loadConnections();

    // Subscribe to pipeline changes
    const unsubSaved = runtime.eventBus.on('pipeline:saved', () => loadConnections());
    const unsubDeleted = runtime.eventBus.on('pipeline:deleted', () => loadConnections());
    const unsubLoaded = runtime.eventBus.on('dashboard:loaded', () => loadConnections());

    return () => {
      unsubSaved();
      unsubDeleted();
      unsubLoaded();
    };
  }, [canvasId, runtime.eventBus]);

  // Get ports for a widget
  const getWidgetPorts = useCallback((widget: WidgetInstance): { inputs: Port[]; outputs: Port[] } => {
    const manifest = manifests.get(widget.widgetDefId) || widget.metadata?.generatedContent?.manifest;
    const inputs: Port[] = [];
    const outputs: Port[] = [];

    // Support both new format (manifest.io.inputs/outputs) and old format (manifest.inputs/outputs)
    const ioInputs = manifest?.io?.inputs || [];
    const ioOutputs = manifest?.io?.outputs || [];
    const legacyInputs = manifest?.inputs || {};
    const legacyOutputs = manifest?.outputs || {};

    // New format: io.inputs/outputs as arrays
    if (ioInputs.length > 0 || ioOutputs.length > 0) {
      ioInputs.forEach((input: any, i: number) => {
        // Support both 'id' (new format) and 'name' (legacy) for port identifier
        const inputId = typeof input === 'string' ? input : (input.id || input.name);
        const inputType = typeof input === 'object' ? (input.type || input.payloadType || 'any') : 'any';
        inputs.push({
          widgetId: widget.id,
          portName: inputId,
          direction: 'input',
          type: inputType,
          position: {
            x: widget.position.x - PORT_OFFSET,
            y: widget.position.y + 30 + i * 24,
          },
        });
      });

      ioOutputs.forEach((output: any, i: number) => {
        // Support both 'id' (new format) and 'name' (legacy) for port identifier
        const outputId = typeof output === 'string' ? output : (output.id || output.name);
        const outputType = typeof output === 'object' ? (output.type || output.payloadType || 'any') : 'any';
        outputs.push({
          widgetId: widget.id,
          portName: outputId,
          direction: 'output',
          type: outputType,
          position: {
            x: widget.position.x + widget.width + PORT_OFFSET,
            y: widget.position.y + 30 + i * 24,
          },
        });
      });
    }

    // Legacy format: inputs/outputs as objects (e.g., { ping: { type: "event" } })
    const legacyInputKeys = Object.keys(legacyInputs);
    const legacyOutputKeys = Object.keys(legacyOutputs);

    if (legacyInputKeys.length > 0) {
      legacyInputKeys.forEach((portName, i) => {
        const portDef = legacyInputs[portName];
        inputs.push({
          widgetId: widget.id,
          portName,
          direction: 'input',
          type: portDef?.type || 'any',
          position: {
            x: widget.position.x - PORT_OFFSET,
            y: widget.position.y + 30 + i * 24,
          },
        });
      });
    }

    if (legacyOutputKeys.length > 0) {
      legacyOutputKeys.forEach((portName, i) => {
        const portDef = legacyOutputs[portName];
        outputs.push({
          widgetId: widget.id,
          portName,
          direction: 'output',
          type: portDef?.type || 'any',
          position: {
            x: widget.position.x + widget.width + PORT_OFFSET,
            y: widget.position.y + 30 + i * 24,
          },
        });
      });
    }

    // Fallback: create default ports if no IO defined
    if (inputs.length === 0) {
      inputs.push({
        widgetId: widget.id,
        portName: 'input',
        direction: 'input',
        type: 'any',
        position: {
          x: widget.position.x - PORT_OFFSET,
          y: widget.position.y + widget.height / 2,
        },
      });
    }

    if (outputs.length === 0) {
      outputs.push({
        widgetId: widget.id,
        portName: 'output',
        direction: 'output',
        type: 'any',
        position: {
          x: widget.position.x + widget.width + PORT_OFFSET,
          y: widget.position.y + widget.height / 2,
        },
      });
    }

    return { inputs, outputs };
  }, [manifests]);

  // Get all ports from all widgets
  const allPorts = widgets.flatMap(widget => {
    const { inputs, outputs } = getWidgetPorts(widget);
    return [...inputs, ...outputs];
  });

  // Handle port mouse down (start drag)
  const handlePortMouseDown = useCallback((port: Port, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (port.direction === 'output') {
      setDragState({
        isDragging: true,
        sourcePort: port,
        mousePos: { x: port.position.x, y: port.position.y },
      });
    }
  }, []);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragState(prev => ({ ...prev, mousePos: { x, y } }));
  }, [dragState.isDragging]);

  // Handle port mouse up (complete connection)
  const handlePortMouseUp = useCallback(async (port: Port, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!dragState.isDragging || !dragState.sourcePort) return;
    if (port.direction !== 'input') return;
    if (port.widgetId === dragState.sourcePort.widgetId) return;

    // Check for duplicate connection
    const isDuplicate = connections.some(c =>
      c.from.widgetId === dragState.sourcePort!.widgetId &&
      c.from.portName === dragState.sourcePort!.portName &&
      c.to.widgetId === port.widgetId &&
      c.to.portName === port.portName
    );

    if (isDuplicate) {
      setDragState({ isDragging: false, sourcePort: null, mousePos: { x: 0, y: 0 } });
      return;
    }

    try {
      // Create or update pipeline with new connection
      const pipelines = await listPipelinesForCanvas(canvasId);
      let targetPipeline: Pipeline;

      if (pipelines.length > 0) {
        // Use existing pipeline
        targetPipeline = { ...pipelines[0] };
      } else {
        // Create new pipeline
        targetPipeline = createEmptyPipeline(canvasId, 'Canvas Connections');
      }

      // Ensure nodes exist for both widgets
      const fromWidget = widgets.find(w => w.id === dragState.sourcePort!.widgetId);
      const toWidget = widgets.find(w => w.id === port.widgetId);

      if (!fromWidget || !toWidget) {
        console.error('[WidgetConnectionOverlay] Widget not found');
        setDragState({ isDragging: false, sourcePort: null, mousePos: { x: 0, y: 0 } });
        return;
      }

      // Find or create source node
      let sourceNode = targetPipeline.nodes.find(n => n.widgetInstanceId === fromWidget.id);
      if (!sourceNode) {
        sourceNode = {
          id: crypto.randomUUID(),
          widgetInstanceId: fromWidget.id,
          type: 'widget' as const,
          label: fromWidget.widgetDefId,
          position: { x: fromWidget.position.x, y: fromWidget.position.y },
        };
        targetPipeline.nodes.push(sourceNode);
      }

      // Find or create target node
      let targetNode = targetPipeline.nodes.find(n => n.widgetInstanceId === toWidget.id);
      if (!targetNode) {
        targetNode = {
          id: crypto.randomUUID(),
          widgetInstanceId: toWidget.id,
          type: 'widget' as const,
          label: toWidget.widgetDefId,
          position: { x: toWidget.position.x, y: toWidget.position.y },
        };
        targetPipeline.nodes.push(targetNode);
      }

      // Create connection using verified nodes
      const newConnection = createConnection(
        sourceNode.id,
        dragState.sourcePort!.portName,
        targetNode.id,
        port.portName
      );

      targetPipeline.connections.push(newConnection);

      // Save pipeline
      const result = await savePipeline(targetPipeline);
      if (result.success) {
        // Emit event to notify other components
        runtime.eventBus.emit({
          type: 'pipeline:saved',
          scope: 'canvas',
          payload: { pipeline: targetPipeline }
        });

        // Update local state
        setConnections(prev => [...prev, {
          from: { widgetId: dragState.sourcePort!.widgetId, portName: dragState.sourcePort!.portName },
          to: { widgetId: port.widgetId, portName: port.portName },
          id: newConnection.id,
        }]);
      } else {
        console.error('[WidgetConnectionOverlay] Failed to save connection:', result.error);
      }
    } catch (err) {
      console.error('[WidgetConnectionOverlay] Error creating connection:', err);
    }

    setDragState({ isDragging: false, sourcePort: null, mousePos: { x: 0, y: 0 } });
  }, [dragState, connections, canvasId, widgets, runtime.eventBus]);

  // Handle mouse up (cancel drag)
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState({ isDragging: false, sourcePort: null, mousePos: { x: 0, y: 0 } });
    }
  }, [dragState.isDragging]);

  // Handle connection click
  const handleConnectionClick = useCallback((connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConnection(selectedConnection === connectionId ? null : connectionId);
  }, [selectedConnection]);

  // Handle delete selected connection
  const handleDeleteConnection = useCallback(async () => {
    if (!selectedConnection) return;

    try {
      const pipelines = await listPipelinesForCanvas(canvasId);

      for (const pipeline of pipelines) {
        const connIndex = pipeline.connections.findIndex(c => c.id === selectedConnection);
        if (connIndex !== -1) {
          pipeline.connections.splice(connIndex, 1);

          // Save updated pipeline
          const result = await savePipeline(pipeline);
          if (result.success) {
            runtime.eventBus.emit({
              type: 'pipeline:saved',
              scope: 'canvas',
              payload: { pipeline }
            });

            setConnections(prev => prev.filter(c => c.id !== selectedConnection));
            setSelectedConnection(null);
          }
          break;
        }
      }
    } catch (err) {
      console.error('[WidgetConnectionOverlay] Error deleting connection:', err);
    }
  }, [selectedConnection, canvasId, runtime.eventBus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnection) {
        e.preventDefault();
        handleDeleteConnection();
      }
      if (e.key === 'Escape') {
        setSelectedConnection(null);
        setDragState({ isDragging: false, sourcePort: null, mousePos: { x: 0, y: 0 } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnection, handleDeleteConnection]);

  // Calculate connection path
  const getConnectionPath = (fromX: number, fromY: number, toX: number, toY: number): string => {
    const dx = toX - fromX;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);

    return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
  };

  // Render existing connections
  const renderConnections = () => {
    return connections.map(conn => {
      const fromWidget = widgets.find(w => w.id === conn.from.widgetId);
      const toWidget = widgets.find(w => w.id === conn.to.widgetId);
      if (!fromWidget || !toWidget) return null;

      const { outputs } = getWidgetPorts(fromWidget);
      const { inputs } = getWidgetPorts(toWidget);

      const fromPort = outputs.find(p => p.portName === conn.from.portName);
      const toPort = inputs.find(p => p.portName === conn.to.portName);

      if (!fromPort || !toPort) return null;

      const isSelected = selectedConnection === conn.id;

      return (
        <g key={conn.id}>
          {/* Invisible wider path for easier clicking */}
          <path
            d={getConnectionPath(fromPort.position.x, fromPort.position.y, toPort.position.x, toPort.position.y)}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleConnectionClick(conn.id, e)}
          />
          {/* Visible connection path */}
          <path
            d={getConnectionPath(fromPort.position.x, fromPort.position.y, toPort.position.x, toPort.position.y)}
            fill="none"
            stroke={isSelected ? '#f59e0b' : '#8b5cf6'}
            strokeWidth={isSelected ? 3 : 2}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleConnectionClick(conn.id, e)}
          />
        </g>
      );
    });
  };

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'all',
        zIndex: 500,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => setSelectedConnection(null)}
    >
      {/* Existing connections */}
      {renderConnections()}

      {/* Drag preview connection */}
      {dragState.isDragging && dragState.sourcePort && (
        <path
          d={getConnectionPath(
            dragState.sourcePort.position.x,
            dragState.sourcePort.position.y,
            dragState.mousePos.x,
            dragState.mousePos.y
          )}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5,5"
          pointerEvents="none"
        />
      )}

      {/* Port indicators on widgets */}
      {allPorts.map((port, index) => {
        const isHovered = hoveredPort?.widgetId === port.widgetId && hoveredPort?.portName === port.portName;
        const isValidTarget = dragState.isDragging &&
          port.direction === 'input' &&
          port.widgetId !== dragState.sourcePort?.widgetId;

        return (
          <g key={`${port.widgetId}-${port.portName}-${index}`}>
            {/* Port circle */}
            <circle
              cx={port.position.x}
              cy={port.position.y}
              r={PORT_SIZE / 2}
              fill={
                isHovered || isValidTarget
                  ? (port.direction === 'input' ? '#10b981' : '#f59e0b')
                  : (port.direction === 'input' ? '#3b82f6' : '#8b5cf6')
              }
              stroke="#fff"
              strokeWidth={2}
              style={{
                cursor: port.direction === 'output' ? 'crosshair' : (isValidTarget ? 'pointer' : 'default'),
                filter: isHovered || isValidTarget ? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' : 'none'
              }}
              onMouseEnter={() => setHoveredPort(port)}
              onMouseLeave={() => setHoveredPort(null)}
              onMouseDown={(e) => handlePortMouseDown(port, e)}
              onMouseUp={(e) => handlePortMouseUp(port, e)}
            />
            {/* Port label */}
            <text
              x={port.direction === 'input' ? port.position.x - 16 : port.position.x + 16}
              y={port.position.y + 4}
              textAnchor={port.direction === 'input' ? 'end' : 'start'}
              fill="#fff"
              fontSize={10}
              fontWeight={500}
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                pointerEvents: 'none'
              }}
            >
              {port.portName}
            </text>
          </g>
        );
      })}

      {/* Delete button for selected connection */}
      {selectedConnection && (
        <foreignObject x={10} y={10} width={150} height={40}>
          <button
            onClick={handleDeleteConnection}
            style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.9)',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Delete Connection
          </button>
        </foreignObject>
      )}

      {/* Instructions */}
      <foreignObject x={10} y="calc(100% - 40px)" width={400} height={30}>
        <div style={{
          fontSize: 11,
          color: '#94a3b8',
          background: 'rgba(0,0,0,0.6)',
          padding: '6px 10px',
          borderRadius: 4,
        }}>
          Drag from output (purple) to input (blue) to connect. Click connection to select, Delete to remove.
        </div>
      </foreignObject>
    </svg>
  );
};

export default WidgetConnectionOverlay;
