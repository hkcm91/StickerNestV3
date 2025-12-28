/**
 * StickerNest v2 - Widget IO Ports
 * Renders colored circles with labels on widget edges to show IO ports
 *
 * Features:
 * - Input ports on left edge
 * - Output ports on right edge
 * - Color-coded by data type
 * - Connection status indicators
 * - Hover labels with descriptions
 * - Draggable for creating connections
 */

import React, { useState, useMemo } from 'react';
import type { WidgetManifest } from '../types/manifest';
import type { Pipeline } from '../types/domain';

// ============================================
// Types
// ============================================

export interface Port {
  name: string;
  type: string;
  description?: string;
}

export interface WidgetIOPortsProps {
  /** Widget instance ID */
  widgetId: string;
  /** Widget manifest */
  manifest: WidgetManifest | null;
  /** Widget dimensions */
  width: number;
  height: number;
  /** Pipelines to check for connections */
  pipelines?: Pipeline[];
  /** Whether ports are interactive */
  interactive?: boolean;
  /** Callback when user starts dragging from an output port */
  onStartConnection?: (widgetId: string, portName: string, portType: string) => void;
  /** Callback when user drops on an input port */
  onEndConnection?: (widgetId: string, portName: string, portType: string) => void;
  /** Callback when port is clicked */
  onPortClick?: (widgetId: string, portName: string, direction: 'input' | 'output') => void;
  /** Port size */
  portSize?: number;
  /** Whether to show labels */
  showLabels?: boolean;
  /** Whether in connect mode (highlight compatible ports) */
  connectMode?: {
    sourceWidgetId: string;
    sourcePort: string;
    sourceType: string;
  } | null;
}

interface PortNodeProps {
  port: Port;
  direction: 'input' | 'output';
  index: number;
  total: number;
  widgetHeight: number;
  widgetWidth: number;
  isConnected: boolean;
  connectionCount: number;
  portSize: number;
  showLabels: boolean;
  interactive: boolean;
  isCompatible: boolean;
  isHighlighted: boolean;
  onStartConnection?: () => void;
  onEndConnection?: () => void;
  onClick?: () => void;
}

// ============================================
// Type Colors
// ============================================

const typeColors: Record<string, string> = {
  any: '#94a3b8',
  string: '#22c55e',
  number: '#3b82f6',
  boolean: '#f59e0b',
  object: '#8b5cf6',
  array: '#ec4899',
  event: '#14b8a6',
  entity: '#f97316',
  image: '#06b6d4',
  audio: '#a855f7',
  video: '#f43f5e',
  file: '#84cc16',
  trigger: '#fbbf24',
  stream: '#6366f1',
};

// ============================================
// Type Compatibility
// ============================================

const isTypeCompatible = (sourceType: string, targetType: string): boolean => {
  if (sourceType === 'any' || targetType === 'any') return true;
  if (sourceType === targetType) return true;

  // Numeric compatibility
  if (['number', 'integer', 'float'].includes(sourceType) &&
      ['number', 'integer', 'float'].includes(targetType)) return true;

  // Event/trigger compatibility
  if (['event', 'trigger'].includes(sourceType) &&
      ['event', 'trigger'].includes(targetType)) return true;

  return false;
};

// ============================================
// Port Node Component
// ============================================

const PortNode: React.FC<PortNodeProps> = ({
  port,
  direction,
  index,
  total,
  widgetHeight,
  widgetWidth,
  isConnected,
  connectionCount,
  portSize,
  showLabels,
  interactive,
  isCompatible,
  isHighlighted,
  onStartConnection,
  onEndConnection,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate vertical position
  const spacing = widgetHeight / (total + 1);
  const y = spacing * (index + 1);

  // Calculate horizontal position
  const x = direction === 'input' ? 0 : widgetWidth;

  // Get port color
  const color = typeColors[port.type] || typeColors.any;

  // Determine port state
  const isActive = isHovered || isDragging || isHighlighted;
  const baseSize = portSize;
  const displaySize = isActive ? baseSize * 1.3 : baseSize;

  // Handle drag start (outputs only)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive || direction !== 'output') return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    onStartConnection?.();
  };

  // Handle drag end
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    setIsDragging(false);
    if (direction === 'input') {
      onEndConnection?.();
    }
  };

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onClick?.();
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Connection indicator (glow) */}
      {isConnected && (
        <circle
          cx={0}
          cy={0}
          r={displaySize + 4}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.3}
        />
      )}

      {/* Compatibility highlight */}
      {isCompatible && (
        <circle
          cx={0}
          cy={0}
          r={displaySize + 6}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.8}
        />
      )}

      {/* Main port circle */}
      <circle
        cx={0}
        cy={0}
        r={displaySize}
        fill={isActive ? color : `${color}aa`}
        stroke={isConnected ? '#fff' : color}
        strokeWidth={isConnected ? 2 : 1}
        style={{
          transition: 'all 0.15s ease',
          filter: isActive ? `drop-shadow(0 0 6px ${color})` : 'none',
        }}
      />

      {/* Connection count badge */}
      {connectionCount > 1 && (
        <g transform={`translate(${direction === 'input' ? -12 : 12}, -8)`}>
          <circle
            cx={0}
            cy={0}
            r={8}
            fill="#0f0f19"
            stroke={color}
            strokeWidth={1}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize={8}
            fontWeight={600}
            fill={color}
          >
            {connectionCount}
          </text>
        </g>
      )}

      {/* Port type icon */}
      <text
        x={0}
        y={3}
        textAnchor="middle"
        fontSize={8}
        fontWeight={700}
        fill="#fff"
        style={{ pointerEvents: 'none' }}
      >
        {getTypeIcon(port.type)}
      </text>

      {/* Label */}
      {(showLabels || isHovered) && (
        <g transform={`translate(${direction === 'input' ? -8 : 8}, 0)`}>
          {/* Label background */}
          <rect
            x={direction === 'input' ? -60 : 4}
            y={-10}
            width={56}
            height={20}
            rx={4}
            fill="rgba(15, 15, 25, 0.95)"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={1}
          />
          {/* Label text */}
          <text
            x={direction === 'input' ? -32 : 32}
            y={4}
            textAnchor="middle"
            fontSize={9}
            fill="#e2e8f0"
            style={{ pointerEvents: 'none' }}
          >
            {port.name.length > 8 ? port.name.slice(0, 7) + '…' : port.name}
          </text>
        </g>
      )}

      {/* Tooltip on hover */}
      {isHovered && port.description && (
        <g transform={`translate(${direction === 'input' ? -80 : 80}, -30)`}>
          <foreignObject x={-100} y={-20} width={200} height={60}>
            <div
              style={{
                background: 'rgba(15, 15, 25, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 10,
                color: '#cbd5e1',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 600, color: color, marginBottom: 2 }}>
                {port.name}
              </div>
              <div style={{ color: '#94a3b8' }}>
                {port.type}
              </div>
              {port.description && (
                <div style={{ marginTop: 4, fontStyle: 'italic' }}>
                  {port.description}
                </div>
              )}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
};

// ============================================
// Type Icons
// ============================================

const getTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    any: '*',
    string: 'S',
    number: '#',
    boolean: '?',
    object: '{}',
    array: '[]',
    event: '⚡',
    entity: 'E',
    image: '🖼',
    audio: '♪',
    video: '▶',
    file: '📄',
    trigger: '→',
    stream: '~',
  };
  return icons[type] || type.charAt(0).toUpperCase();
};

// ============================================
// Main Component
// ============================================

export const WidgetIOPorts: React.FC<WidgetIOPortsProps> = ({
  widgetId,
  manifest,
  width,
  height,
  pipelines = [],
  interactive = true,
  onStartConnection,
  onEndConnection,
  onPortClick,
  portSize = 8,
  showLabels = false,
  connectMode = null,
}) => {
  // Extract ports from manifest
  const { inputs, outputs } = useMemo(() => {
    if (!manifest) return { inputs: [], outputs: [] };

    type PortDef = { name: string; type?: string; description?: string };

    // Helper to convert Record or array to PortDef array
    const toPortArray = (ports: unknown): PortDef[] => {
      if (!ports) return [];
      // If it's already an array, use it directly
      if (Array.isArray(ports)) {
        return ports.map((p: any) => ({
          // Support both 'id' (new format) and 'name' (legacy) for port identifier
          name: p.id || p.name || '',
          type: p.type || p.payloadType || 'any',
          description: p.description,
        }));
      }
      // If it's a Record/object, convert keys to port names
      if (typeof ports === 'object') {
        return Object.entries(ports).map(([name, def]: [string, any]) => ({
          name,
          type: def?.type || def?.payloadType || 'any',
          description: def?.description,
        }));
      }
      return [];
    };

    // Support both manifest formats: io.inputs (new) and manifest.inputs (legacy)
    const io = manifest.io as { inputs?: unknown; outputs?: unknown } | undefined;
    const inputList = toPortArray(io?.inputs || (manifest as any).inputs);
    const outputList = toPortArray(io?.outputs || (manifest as any).outputs);

    const inputs: Port[] = inputList.map((i: PortDef) => ({
      name: i.name,
      type: i.type || 'any',
      description: i.description,
    }));

    const outputs: Port[] = outputList.map((o: PortDef) => ({
      name: o.name,
      type: o.type || 'any',
      description: o.description,
    }));

    return { inputs, outputs };
  }, [manifest]);

  // Find connections for this widget
  const connectionMap = useMemo(() => {
    const map = new Map<string, { count: number; direction: 'input' | 'output' }>();

    for (const pipeline of pipelines) {
      const node = pipeline.nodes.find(n => n.widgetInstanceId === widgetId);
      if (!node) continue;

      for (const conn of pipeline.connections) {
        if (conn.from.nodeId === node.id) {
          // This is an output
          const key = `output:${conn.from.portName}`;
          const existing = map.get(key);
          map.set(key, { count: (existing?.count || 0) + 1, direction: 'output' });
        }
        if (conn.to.nodeId === node.id) {
          // This is an input
          const key = `input:${conn.to.portName}`;
          const existing = map.get(key);
          map.set(key, { count: (existing?.count || 0) + 1, direction: 'input' });
        }
      }
    }

    return map;
  }, [pipelines, widgetId]);

  // Check if port is connected
  const isPortConnected = (portName: string, direction: 'input' | 'output'): boolean => {
    return connectionMap.has(`${direction}:${portName}`);
  };

  // Get connection count
  const getConnectionCount = (portName: string, direction: 'input' | 'output'): number => {
    return connectionMap.get(`${direction}:${portName}`)?.count || 0;
  };

  // Check port compatibility with connect mode
  const isPortCompatible = (port: Port, direction: 'input' | 'output'): boolean => {
    if (!connectMode) return false;
    if (connectMode.sourceWidgetId === widgetId) return false;
    if (direction !== 'input') return false; // Can only connect to inputs
    return isTypeCompatible(connectMode.sourceType, port.type);
  };

  if (inputs.length === 0 && outputs.length === 0) {
    return null;
  }

  return (
    <svg
      width={width + 40}
      height={height + 20}
      style={{
        position: 'absolute',
        top: -10,
        left: -20,
        pointerEvents: interactive ? 'auto' : 'none',
        overflow: 'visible',
      }}
    >
      <g transform="translate(20, 10)">
        {/* Input ports (left side) */}
        {inputs.map((port, index) => (
          <PortNode
            key={`input-${port.name}`}
            port={port}
            direction="input"
            index={index}
            total={inputs.length}
            widgetHeight={height}
            widgetWidth={width}
            isConnected={isPortConnected(port.name, 'input')}
            connectionCount={getConnectionCount(port.name, 'input')}
            portSize={portSize}
            showLabels={showLabels}
            interactive={interactive}
            isCompatible={isPortCompatible(port, 'input')}
            isHighlighted={
              connectMode !== null &&
              connectMode.sourceWidgetId !== widgetId &&
              isTypeCompatible(connectMode.sourceType, port.type)
            }
            onEndConnection={() => onEndConnection?.(widgetId, port.name, port.type)}
            onClick={() => onPortClick?.(widgetId, port.name, 'input')}
          />
        ))}

        {/* Output ports (right side) */}
        {outputs.map((port, index) => (
          <PortNode
            key={`output-${port.name}`}
            port={port}
            direction="output"
            index={index}
            total={outputs.length}
            widgetHeight={height}
            widgetWidth={width}
            isConnected={isPortConnected(port.name, 'output')}
            connectionCount={getConnectionCount(port.name, 'output')}
            portSize={portSize}
            showLabels={showLabels}
            interactive={interactive}
            isCompatible={false}
            isHighlighted={false}
            onStartConnection={() => onStartConnection?.(widgetId, port.name, port.type)}
            onClick={() => onPortClick?.(widgetId, port.name, 'output')}
          />
        ))}
      </g>
    </svg>
  );
};

// ============================================
// Connection Line Preview
// ============================================

interface ConnectionLinePreviewProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  portType: string;
}

export const ConnectionLinePreview: React.FC<ConnectionLinePreviewProps> = ({
  startX,
  startY,
  endX,
  endY,
  portType,
}) => {
  const color = typeColors[portType] || typeColors.any;

  // Calculate bezier control points
  const dx = Math.abs(endX - startX);
  const controlOffset = Math.min(dx * 0.5, 100);

  const path = `M ${startX} ${startY}
                C ${startX + controlOffset} ${startY},
                  ${endX - controlOffset} ${endY},
                  ${endX} ${endY}`;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <defs>
        <linearGradient
          id={`connection-gradient-${portType}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
        </linearGradient>
      </defs>

      {/* Glow effect */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={6}
        opacity={0.2}
        strokeLinecap="round"
      />

      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={`url(#connection-gradient-${portType})`}
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-12"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </path>

      {/* End dot */}
      <circle
        cx={endX}
        cy={endY}
        r={6}
        fill={color}
        opacity={0.6}
      >
        <animate
          attributeName="r"
          values="4;8;4"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

export default WidgetIOPorts;
