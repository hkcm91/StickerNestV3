/**
 * StickerNest v2 - PipelineEditor
 * Simple connection-based pipeline editor
 * Uses dropdowns to connect widget outputs to inputs
 * Phase 8D implementation - minimal UI for Phase 9 visual editor
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  Pipeline,
  PipelineNode,
  PipelineConnection,
  PipelinePort,
  WidgetInstance
} from '../types/domain';
import type { WidgetManifest } from '../types/manifest';
import {
  createEmptyPipeline,
  createWidgetNode,
  createConnection,
  validatePipeline
} from '../services/pipelinesClient';

interface PipelineEditorProps {
  pipeline: Pipeline | null;
  widgetInstances: WidgetInstance[];
  /** Map of widgetDefId -> manifest for port info */
  manifests: Map<string, WidgetManifest>;
  onSave: (pipeline: Pipeline) => void;
  onCancel: () => void;
  canvasId: string;
}

interface PortOption {
  nodeId: string;
  widgetInstanceId: string;
  widgetName: string;
  portName: string;
  portType: string;
  direction: 'input' | 'output';
}

export const PipelineEditor: React.FC<PipelineEditorProps> = ({
  pipeline: initialPipeline,
  widgetInstances,
  manifests,
  onSave,
  onCancel,
  canvasId
}) => {
  // Initialize pipeline state
  const [pipeline, setPipeline] = useState<Pipeline>(() => {
    if (initialPipeline) {
      return { ...initialPipeline };
    }
    return createEmptyPipeline(canvasId);
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Build nodes for widgets that don't have nodes yet
  const ensureWidgetNodes = useCallback((currentPipeline: Pipeline): Pipeline => {
    const existingWidgetIds = new Set(
      currentPipeline.nodes
        .filter(n => n.widgetInstanceId)
        .map(n => n.widgetInstanceId!)
    );

    const newNodes: PipelineNode[] = [];
    widgetInstances.forEach((instance, index) => {
      if (!existingWidgetIds.has(instance.id)) {
        const manifest = manifests.get(instance.widgetDefId);
        const node = createWidgetNode(
          instance.id,
          { x: 50 + (index * 200), y: 100 },
          manifest?.name || `Widget ${index + 1}`
        );

        // Add port info from manifest
        if (manifest) {
          node.inputs = Object.entries(manifest.inputs || {}).map(([name, schema]) => ({
            name,
            direction: 'input' as const,
            type: typeof schema === 'object' ? (schema as any).type || 'any' : 'any',
            description: typeof schema === 'object' ? (schema as any).description : undefined
          }));
          node.outputs = Object.entries(manifest.outputs || {}).map(([name, schema]) => ({
            name,
            direction: 'output' as const,
            type: typeof schema === 'object' ? (schema as any).type || 'any' : 'any',
            description: typeof schema === 'object' ? (schema as any).description : undefined
          }));
        }

        newNodes.push(node);
      }
    });

    if (newNodes.length > 0) {
      return {
        ...currentPipeline,
        nodes: [...currentPipeline.nodes, ...newNodes]
      };
    }

    return currentPipeline;
  }, [widgetInstances, manifests]);

  // Build list of available output ports
  const outputPorts = useMemo((): PortOption[] => {
    const ports: PortOption[] = [];

    for (const node of pipeline.nodes) {
      if (!node.widgetInstanceId) continue;

      const instance = widgetInstances.find(w => w.id === node.widgetInstanceId);
      if (!instance) continue;

      const manifest = manifests.get(instance.widgetDefId);
      const outputs = node.outputs || (manifest ? Object.entries(manifest.outputs || {}).map(([name, schema]) => ({
        name,
        direction: 'output' as const,
        type: typeof schema === 'object' ? (schema as any).type || 'any' : 'any'
      })) : []);

      for (const port of outputs) {
        ports.push({
          nodeId: node.id,
          widgetInstanceId: node.widgetInstanceId,
          widgetName: node.label || manifest?.name || 'Widget',
          portName: port.name,
          portType: port.type,
          direction: 'output'
        });
      }
    }

    return ports;
  }, [pipeline.nodes, widgetInstances, manifests]);

  // Build list of available input ports
  const inputPorts = useMemo((): PortOption[] => {
    const ports: PortOption[] = [];

    for (const node of pipeline.nodes) {
      if (!node.widgetInstanceId) continue;

      const instance = widgetInstances.find(w => w.id === node.widgetInstanceId);
      if (!instance) continue;

      const manifest = manifests.get(instance.widgetDefId);
      const inputs = node.inputs || (manifest ? Object.entries(manifest.inputs || {}).map(([name, schema]) => ({
        name,
        direction: 'input' as const,
        type: typeof schema === 'object' ? (schema as any).type || 'any' : 'any'
      })) : []);

      for (const port of inputs) {
        ports.push({
          nodeId: node.id,
          widgetInstanceId: node.widgetInstanceId,
          widgetName: node.label || manifest?.name || 'Widget',
          portName: port.name,
          portType: port.type,
          direction: 'input'
        });
      }
    }

    return ports;
  }, [pipeline.nodes, widgetInstances, manifests]);

  // Handle pipeline name change
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPipeline(prev => ({ ...prev, name: e.target.value }));
    setIsDirty(true);
  }, []);

  // Handle description change
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPipeline(prev => ({ ...prev, description: e.target.value || undefined }));
    setIsDirty(true);
  }, []);

  // Add a new connection
  const handleAddConnection = useCallback(() => {
    if (outputPorts.length === 0 || inputPorts.length === 0) return;

    const defaultFrom = outputPorts[0];
    const defaultTo = inputPorts[0];

    const newConnection = createConnection(
      defaultFrom.nodeId,
      defaultFrom.portName,
      defaultTo.nodeId,
      defaultTo.portName
    );

    setPipeline(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }));
    setIsDirty(true);
  }, [outputPorts, inputPorts]);

  // Update a connection
  const handleUpdateConnection = useCallback((
    connectionId: string,
    field: 'from' | 'to',
    nodeId: string,
    portName: string
  ) => {
    setPipeline(prev => ({
      ...prev,
      connections: prev.connections.map(conn => {
        if (conn.id !== connectionId) return conn;
        return {
          ...conn,
          [field]: { nodeId, portName }
        };
      })
    }));
    setIsDirty(true);
  }, []);

  // Toggle connection enabled
  const handleToggleConnection = useCallback((connectionId: string) => {
    setPipeline(prev => ({
      ...prev,
      connections: prev.connections.map(conn => {
        if (conn.id !== connectionId) return conn;
        return { ...conn, enabled: conn.enabled === false ? true : false };
      })
    }));
    setIsDirty(true);
  }, []);

  // Remove a connection
  const handleRemoveConnection = useCallback((connectionId: string) => {
    setPipeline(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId)
    }));
    setIsDirty(true);
  }, []);

  // Initialize nodes on mount
  React.useEffect(() => {
    setPipeline(prev => ensureWidgetNodes(prev));
  }, [widgetInstances.length]);

  // Validate and save
  const handleSave = useCallback(() => {
    const validationErrors = validatePipeline(pipeline);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSave({
      ...pipeline,
      updatedAt: new Date().toISOString()
    });
  }, [pipeline, onSave]);

  // Get port display name
  const getPortKey = (nodeId: string, portName: string) => `${nodeId}:${portName}`;

  const getPortDisplay = (ports: PortOption[], nodeId: string, portName: string): string => {
    const port = ports.find(p => p.nodeId === nodeId && p.portName === portName);
    if (!port) return `${nodeId.slice(0, 8)}:${portName}`;
    return `${port.widgetName} → ${portName}`;
  };

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: 8,
      border: '1px solid #333',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: '#2a2a2a',
        borderBottom: '1px solid #333'
      }}>
        <input
          type="text"
          value={pipeline.name}
          onChange={handleNameChange}
          placeholder="Pipeline name"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#111',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500
          }}
        />
        <textarea
          value={pipeline.description || ''}
          onChange={handleDescriptionChange}
          placeholder="Description (optional)"
          rows={2}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '8px 12px',
            background: '#111',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#aaa',
            fontSize: 12,
            resize: 'none'
          }}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          padding: '8px 16px',
          background: '#3a1a1a',
          borderBottom: '1px solid #ff6b6b'
        }}>
          {errors.map((error, i) => (
            <div key={i} style={{ color: '#ff6b6b', fontSize: 11, padding: '2px 0' }}>
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Connections */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <h4 style={{ margin: 0, color: '#fff', fontSize: 13 }}>
            Connections ({pipeline.connections.length})
          </h4>
          <button
            onClick={handleAddConnection}
            disabled={outputPorts.length === 0 || inputPorts.length === 0}
            style={{
              padding: '4px 10px',
              background: outputPorts.length > 0 && inputPorts.length > 0 ? '#4a9eff' : '#444',
              border: 'none',
              borderRadius: 4,
              color: outputPorts.length > 0 && inputPorts.length > 0 ? '#fff' : '#888',
              cursor: outputPorts.length > 0 && inputPorts.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 11
            }}
          >
            + Add Connection
          </button>
        </div>

        {pipeline.connections.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: 12,
            background: '#222',
            borderRadius: 6
          }}>
            {outputPorts.length === 0 || inputPorts.length === 0 ? (
              <div>
                <div style={{ marginBottom: 8 }}>No ports available</div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Add widgets with inputs/outputs to create connections
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 8 }}>No connections yet</div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Click "Add Connection" to route data between widgets
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pipeline.connections.map(conn => (
              <div
                key={conn.id}
                style={{
                  padding: 12,
                  background: conn.enabled !== false ? '#222' : '#1a1a1a',
                  borderRadius: 6,
                  border: `1px solid ${conn.enabled !== false ? '#333' : '#2a2a2a'}`,
                  opacity: conn.enabled !== false ? 1 : 0.6
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8
                }}>
                  {/* From port selector */}
                  <select
                    value={getPortKey(conn.from.nodeId, conn.from.portName)}
                    onChange={e => {
                      const [nodeId, portName] = e.target.value.split(':');
                      handleUpdateConnection(conn.id, 'from', nodeId, portName);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#333',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#9acd32',
                      fontSize: 11
                    }}
                  >
                    {outputPorts.map(port => (
                      <option
                        key={getPortKey(port.nodeId, port.portName)}
                        value={getPortKey(port.nodeId, port.portName)}
                      >
                        {port.widgetName} → {port.portName}
                      </option>
                    ))}
                  </select>

                  <span style={{ color: '#666', fontSize: 16 }}>→</span>

                  {/* To port selector */}
                  <select
                    value={getPortKey(conn.to.nodeId, conn.to.portName)}
                    onChange={e => {
                      const [nodeId, portName] = e.target.value.split(':');
                      handleUpdateConnection(conn.id, 'to', nodeId, portName);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#333',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#6bcfff',
                      fontSize: 11
                    }}
                  >
                    {inputPorts.map(port => (
                      <option
                        key={getPortKey(port.nodeId, port.portName)}
                        value={getPortKey(port.nodeId, port.portName)}
                      >
                        {port.widgetName} ← {port.portName}
                      </option>
                    ))}
                  </select>

                  {/* Actions */}
                  <button
                    onClick={() => handleToggleConnection(conn.id)}
                    title={conn.enabled !== false ? 'Disable' : 'Enable'}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      background: 'transparent',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: conn.enabled !== false ? '#6bcf6b' : '#888',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    {conn.enabled !== false ? '⚡' : '○'}
                  </button>
                  <button
                    onClick={() => handleRemoveConnection(conn.id)}
                    title="Remove connection"
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      background: 'transparent',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Connection info */}
                <div style={{ fontSize: 10, color: '#666' }}>
                  ID: {conn.id.slice(0, 8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nodes info */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #333',
        background: '#222'
      }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
          Nodes ({pipeline.nodes.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {pipeline.nodes.slice(0, 6).map(node => (
            <span
              key={node.id}
              style={{
                padding: '2px 8px',
                background: '#333',
                borderRadius: 3,
                fontSize: 10,
                color: '#aaa'
              }}
            >
              {node.label || node.id.slice(0, 8)}
            </span>
          ))}
          {pipeline.nodes.length > 6 && (
            <span style={{ fontSize: 10, color: '#666' }}>
              +{pipeline.nodes.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: '12px 16px',
        background: '#2a2a2a',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: 11, color: '#888' }}>
          {isDirty && <span style={{ color: '#ffd93d' }}>Unsaved changes</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#444',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty && initialPipeline !== null}
            style={{
              padding: '8px 16px',
              background: isDirty || !initialPipeline ? '#4a9eff' : '#333',
              border: 'none',
              borderRadius: 4,
              color: isDirty || !initialPipeline ? '#fff' : '#666',
              cursor: isDirty || !initialPipeline ? 'pointer' : 'not-allowed',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            Save Pipeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineEditor;
