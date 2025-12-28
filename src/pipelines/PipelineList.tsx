/**
 * StickerNest v2 - PipelineList
 * Displays list of pipelines for a canvas
 * Allows create, select, enable/disable, and delete pipelines
 * Phase 8D implementation
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Pipeline } from '../types/domain';

interface PipelineListProps {
  pipelines: Pipeline[];
  selectedPipelineId?: string | null;
  onSelect: (pipeline: Pipeline) => void;
  onCreate: () => void;
  onDelete: (pipelineId: string) => void;
  onToggleEnabled: (pipelineId: string, enabled: boolean) => void;
  isLoading?: boolean;
}

export const PipelineList: React.FC<PipelineListProps> = ({
  pipelines,
  selectedPipelineId,
  onSelect,
  onCreate,
  onDelete,
  onToggleEnabled,
  isLoading = false
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = useCallback((e: React.MouseEvent, pipelineId: string) => {
    e.stopPropagation();
    if (confirmDelete === pipelineId) {
      onDelete(pipelineId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(pipelineId);
    }
  }, [confirmDelete, onDelete]);

  const handleToggle = useCallback((e: React.MouseEvent, pipeline: Pipeline) => {
    e.stopPropagation();
    onToggleEnabled(pipeline.id, !pipeline.enabled);
  }, [onToggleEnabled]);

  // Reset confirm delete when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setConfirmDelete(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 600 }}>
          Pipelines
          <span style={{ color: '#666', fontWeight: 400, marginLeft: 8 }}>
            ({pipelines.length})
          </span>
        </h3>
        <button
          onClick={onCreate}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            background: '#4a9eff',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 500,
            opacity: isLoading ? 0.6 : 1
          }}
        >
          + New
        </button>
      </div>

      {/* List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 8
      }}>
        {isLoading && pipelines.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: 12
          }}>
            Loading pipelines...
          </div>
        ) : pipelines.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: 12
          }}>
            <div style={{ marginBottom: 8 }}>No pipelines yet</div>
            <div style={{ color: '#888', fontSize: 11 }}>
              Create a pipeline to connect widgets
            </div>
          </div>
        ) : (
          pipelines.map(pipeline => (
            <div
              key={pipeline.id}
              onClick={() => onSelect(pipeline)}
              style={{
                padding: '10px 12px',
                marginBottom: 4,
                background: selectedPipelineId === pipeline.id ? '#333' : '#222',
                borderRadius: 6,
                cursor: 'pointer',
                border: selectedPipelineId === pipeline.id
                  ? '1px solid #4a9eff'
                  : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (selectedPipelineId !== pipeline.id) {
                  e.currentTarget.style.background = '#2a2a2a';
                }
              }}
              onMouseLeave={e => {
                if (selectedPipelineId !== pipeline.id) {
                  e.currentTarget.style.background = '#222';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4
                  }}>
                    <span style={{
                      color: pipeline.enabled ? '#fff' : '#888',
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {pipeline.name}
                    </span>
                    <span style={{
                      padding: '2px 6px',
                      background: pipeline.enabled ? '#1a3a1a' : '#3a1a1a',
                      color: pipeline.enabled ? '#6bcf6b' : '#cf6b6b',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 500,
                      flexShrink: 0
                    }}>
                      {pipeline.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: 11,
                    color: '#888'
                  }}>
                    <span>{pipeline.nodes.length} nodes</span>
                    <span>{pipeline.connections.length} connections</span>
                    {pipeline.updatedAt && (
                      <span>{formatDate(pipeline.updatedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: 4,
                  marginLeft: 8,
                  flexShrink: 0
                }}>
                  <button
                    onClick={(e) => handleToggle(e, pipeline)}
                    title={pipeline.enabled ? 'Disable pipeline' : 'Enable pipeline'}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      background: 'transparent',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: pipeline.enabled ? '#6bcf6b' : '#888',
                      cursor: 'pointer',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {pipeline.enabled ? '⚡' : '○'}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, pipeline.id)}
                    title={confirmDelete === pipeline.id ? 'Click again to confirm' : 'Delete pipeline'}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      background: confirmDelete === pipeline.id ? '#ff6b6b' : 'transparent',
                      border: confirmDelete === pipeline.id ? '1px solid #ff6b6b' : '1px solid #444',
                      borderRadius: 4,
                      color: confirmDelete === pipeline.id ? '#fff' : '#888',
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {pipeline.description && (
                <div style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {pipeline.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer info */}
      {pipelines.length > 0 && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid #333',
          background: '#222',
          fontSize: 10,
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>
            {pipelines.filter(p => p.enabled).length} active
          </span>
          <span>
            {pipelines.reduce((sum, p) => sum + p.connections.length, 0)} total connections
          </span>
        </div>
      )}
    </div>
  );
};

export default PipelineList;
