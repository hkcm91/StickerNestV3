/**
 * StickerNest v2 - Pipeline Connection Overlay
 *
 * Visual overlay for drawing and managing pipeline connections between widgets.
 * Shows ports, connections, and allows creating new connections in connect mode.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { WidgetInstance } from '../../types/domain';
import type { WidgetManifest, IOPortDefinition } from '../../types/manifest';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineConnection {
  id: string;
  sourceWidgetId: string;
  sourcePort: string;
  targetWidgetId: string;
  targetPort: string;
}

interface ConnectionOverlayProps {
  widgets: WidgetInstance[];
  manifests: Map<string, WidgetManifest>;
  connections: PipelineConnection[];
  viewport: { zoom: number; offsetX: number; offsetY: number };
  onConnectionCreate?: (connection: Omit<PipelineConnection, 'id'>) => void;
  onConnectionDelete?: (connectionId: string) => void;
  selectedConnectionId?: string;
  onConnectionSelect?: (connectionId: string | null) => void;
}

interface Port {
  widgetId: string;
  widgetName: string;
  portId: string;
  portType: 'input' | 'output';
  dataType?: string;
  position: { x: number; y: number };
}

interface DragState {
  sourcePort: Port;
  currentPosition: { x: number; y: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PORT_RADIUS = 8;
const PORT_COLORS: Record<string, string> = {
  any: '#6b7280',
  string: '#3b82f6',
  number: '#22c55e',
  boolean: '#eab308',
  object: '#8b5cf6',
  array: '#f97316',
  event: '#ef4444',
  trigger: '#ec4899',
};

// ============================================================================
// CONNECTION OVERLAY COMPONENT
// ============================================================================

export function ConnectionOverlay({
  widgets,
  manifests,
  connections,
  viewport,
  onConnectionCreate,
  onConnectionDelete,
  selectedConnectionId,
  onConnectionSelect
}: ConnectionOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredPort, setHoveredPort] = useState<Port | null>(null);

  // Compute port positions for all widgets
  const ports = useMemo(() => {
    const allPorts: Port[] = [];

    widgets.forEach(widget => {
      const manifest = manifests.get(widget.widgetDefId);
      if (!manifest?.io) return;

      const inputs = manifest.io.inputs || [];
      const outputs = manifest.io.outputs || [];

      // Input ports on the left side
      inputs.forEach((port, index) => {
        const portDef = typeof port === 'string' ? { id: port } : port;
        allPorts.push({
          widgetId: widget.id,
          widgetName: widget.name || widget.widgetDefId,
          portId: portDef.id,
          portType: 'input',
          dataType: (portDef as IOPortDefinition).type,
          position: {
            x: widget.position.x,
            y: widget.position.y + 30 + index * 24
          }
        });
      });

      // Output ports on the right side
      outputs.forEach((port, index) => {
        const portDef = typeof port === 'string' ? { id: port } : port;
        allPorts.push({
          widgetId: widget.id,
          widgetName: widget.name || widget.widgetDefId,
          portId: portDef.id,
          portType: 'output',
          dataType: (portDef as IOPortDefinition).type,
          position: {
            x: widget.position.x + widget.width,
            y: widget.position.y + 30 + index * 24
          }
        });
      });
    });

    return allPorts;
  }, [widgets, manifests]);

  // Get port by widget ID and port ID
  const getPort = useCallback((widgetId: string, portId: string, portType: 'input' | 'output') => {
    return ports.find(p =>
      p.widgetId === widgetId &&
      p.portId === portId &&
      p.portType === portType
    );
  }, [ports]);

  // Check if connection is valid
  const isValidConnection = useCallback((source: Port, target: Port) => {
    // Can't connect to self
    if (source.widgetId === target.widgetId) return false;

    // Must be output to input
    if (source.portType !== 'output' || target.portType !== 'input') return false;

    // Check type compatibility
    if (source.dataType && target.dataType &&
        source.dataType !== 'any' && target.dataType !== 'any' &&
        source.dataType !== target.dataType) {
      return false;
    }

    // Check if connection already exists
    const exists = connections.some(c =>
      c.sourceWidgetId === source.widgetId &&
      c.sourcePort === source.portId &&
      c.targetWidgetId === target.widgetId &&
      c.targetPort === target.portId
    );
    if (exists) return false;

    return true;
  }, [connections]);

  // Generate bezier path for connection
  const getConnectionPath = useCallback((
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const dx = end.x - start.x;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 100);

    return `M ${start.x} ${start.y}
            C ${start.x + controlOffset} ${start.y},
              ${end.x - controlOffset} ${end.y},
              ${end.x} ${end.y}`;
  }, []);

  // Handle port mouse down
  const handlePortMouseDown = useCallback((e: React.MouseEvent, port: Port) => {
    e.stopPropagation();

    if (port.portType === 'output') {
      setDragState({
        sourcePort: port,
        currentPosition: { x: port.position.x, y: port.position.y }
      });
    }
  }, []);

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.offsetX) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.offsetY) / viewport.zoom;

      setDragState(prev => prev ? { ...prev, currentPosition: { x, y } } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragState && hoveredPort && isValidConnection(dragState.sourcePort, hoveredPort)) {
        onConnectionCreate?.({
          sourceWidgetId: dragState.sourcePort.widgetId,
          sourcePort: dragState.sourcePort.portId,
          targetWidgetId: hoveredPort.widgetId,
          targetPort: hoveredPort.portId
        });
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, hoveredPort, viewport, isValidConnection, onConnectionCreate]);

  // Handle connection click
  const handleConnectionClick = useCallback((e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    onConnectionSelect?.(connectionId);
  }, [onConnectionSelect]);

  // Handle delete key for selected connection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnectionId) {
        onConnectionDelete?.(selectedConnectionId);
        onConnectionSelect?.(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnectionId, onConnectionDelete, onConnectionSelect]);

  // Get port color
  const getPortColor = useCallback((port: Port) => {
    return PORT_COLORS[port.dataType || 'any'] || PORT_COLORS.any;
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible'
      }}
    >
      {/* Transform group for zoom/pan */}
      <g transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.zoom})`}>
        {/* Existing connections */}
        {connections.map(conn => {
          const sourcePort = getPort(conn.sourceWidgetId, conn.sourcePort, 'output');
          const targetPort = getPort(conn.targetWidgetId, conn.targetPort, 'input');

          if (!sourcePort || !targetPort) return null;

          const isSelected = conn.id === selectedConnectionId;
          const path = getConnectionPath(sourcePort.position, targetPort.position);

          return (
            <g key={conn.id}>
              {/* Hit area for selection */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={(e) => handleConnectionClick(e, conn.id)}
              />
              {/* Visible connection */}
              <path
                d={path}
                fill="none"
                stroke={isSelected ? '#f59e0b' : '#8b5cf6'}
                strokeWidth={isSelected ? 3 : 2}
                strokeDasharray={isSelected ? 'none' : 'none'}
                style={{ pointerEvents: 'none' }}
              />
              {/* Arrow at end */}
              <circle
                cx={targetPort.position.x}
                cy={targetPort.position.y}
                r={4}
                fill={isSelected ? '#f59e0b' : '#8b5cf6'}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}

        {/* Dragging connection preview */}
        {dragState && (
          <path
            d={getConnectionPath(dragState.sourcePort.position, dragState.currentPosition)}
            fill="none"
            stroke={hoveredPort && isValidConnection(dragState.sourcePort, hoveredPort)
              ? '#22c55e'
              : '#8b5cf6'}
            strokeWidth={2}
            strokeDasharray="5,5"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Port indicators */}
        {ports.map(port => {
          const isHovered = hoveredPort?.widgetId === port.widgetId &&
                           hoveredPort?.portId === port.portId;
          const isDragTarget = dragState &&
                              port.portType === 'input' &&
                              isValidConnection(dragState.sourcePort, port);
          const isInvalidTarget = dragState &&
                                  port.portType === 'input' &&
                                  !isValidConnection(dragState.sourcePort, port);

          return (
            <g key={`${port.widgetId}-${port.portId}-${port.portType}`}>
              {/* Port circle */}
              <circle
                cx={port.position.x}
                cy={port.position.y}
                r={isHovered || isDragTarget ? PORT_RADIUS + 2 : PORT_RADIUS}
                fill={isDragTarget ? '#22c55e' : getPortColor(port)}
                stroke={isHovered ? '#fff' : isInvalidTarget ? '#ef4444' : 'rgba(255,255,255,0.3)'}
                strokeWidth={2}
                style={{
                  pointerEvents: 'all',
                  cursor: port.portType === 'output' ? 'crosshair' : 'pointer',
                  opacity: isInvalidTarget ? 0.3 : 1
                }}
                onMouseDown={(e) => handlePortMouseDown(e, port)}
                onMouseEnter={() => setHoveredPort(port)}
                onMouseLeave={() => setHoveredPort(null)}
              />
              {/* Port type indicator */}
              <text
                x={port.portType === 'input'
                  ? port.position.x - PORT_RADIUS - 4
                  : port.position.x + PORT_RADIUS + 4}
                y={port.position.y + 4}
                fontSize={10}
                fill="#94a3b8"
                textAnchor={port.portType === 'input' ? 'end' : 'start'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {port.portId.split('.').pop()}
              </text>
            </g>
          );
        })}

        {/* Port tooltip */}
        {hoveredPort && (
          <g>
            <rect
              x={hoveredPort.position.x + (hoveredPort.portType === 'input' ? -140 : 20)}
              y={hoveredPort.position.y - 30}
              width={120}
              height={50}
              rx={4}
              fill="rgba(0, 0, 0, 0.9)"
              stroke="rgba(139, 92, 246, 0.3)"
            />
            <text
              x={hoveredPort.position.x + (hoveredPort.portType === 'input' ? -80 : 80)}
              y={hoveredPort.position.y - 12}
              fontSize={11}
              fill="#e2e8f0"
              textAnchor="middle"
              fontWeight="bold"
            >
              {hoveredPort.portId}
            </text>
            <text
              x={hoveredPort.position.x + (hoveredPort.portType === 'input' ? -80 : 80)}
              y={hoveredPort.position.y + 6}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {hoveredPort.portType} · {hoveredPort.dataType || 'any'}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}

// ============================================================================
// CONNECTION LIST PANEL
// ============================================================================

interface ConnectionListPanelProps {
  connections: PipelineConnection[];
  widgets: WidgetInstance[];
  manifests: Map<string, WidgetManifest>;
  selectedConnectionId?: string;
  onConnectionSelect?: (connectionId: string | null) => void;
  onConnectionDelete?: (connectionId: string) => void;
}

export function ConnectionListPanel({
  connections,
  widgets,
  manifests,
  selectedConnectionId,
  onConnectionSelect,
  onConnectionDelete
}: ConnectionListPanelProps) {
  const getWidgetName = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    return widget?.name || widget?.widgetDefId || widgetId;
  };

  return (
    <div style={{
      padding: 16,
      background: '#1a1a2e',
      borderRadius: 8,
      border: '1px solid rgba(139, 92, 246, 0.2)'
    }}>
      <h3 style={{
        margin: '0 0 12px 0',
        fontSize: 14,
        color: '#e2e8f0',
        fontWeight: 600
      }}>
        Connections ({connections.length})
      </h3>

      {connections.length === 0 ? (
        <p style={{
          fontSize: 12,
          color: '#64748b',
          margin: 0
        }}>
          No connections. Drag from an output port to an input port to create a connection.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connections.map(conn => (
            <div
              key={conn.id}
              onClick={() => onConnectionSelect?.(conn.id)}
              style={{
                padding: '10px 12px',
                background: selectedConnectionId === conn.id
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: selectedConnectionId === conn.id
                  ? '1px solid #8b5cf6'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <div style={{ flex: 1, fontSize: 12 }}>
                <div style={{ color: '#e2e8f0' }}>
                  {getWidgetName(conn.sourceWidgetId)}
                  <span style={{ color: '#8b5cf6', margin: '0 4px' }}>→</span>
                  {getWidgetName(conn.targetWidgetId)}
                </div>
                <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
                  {conn.sourcePort} → {conn.targetPort}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionDelete?.(conn.id);
                }}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConnectionOverlay;
