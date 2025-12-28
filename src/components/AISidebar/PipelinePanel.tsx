/**
 * StickerNest v2 - Pipeline Panel
 * Sidebar panel for managing widget pipelines
 * Provides list view and editor for creating/modifying connections
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { RuntimeContext } from '../../runtime/RuntimeContext';
import type { Pipeline, WidgetInstance } from '../../types/domain';
import type { WidgetManifest } from '../../types/manifest';
import { PipelineEditor } from '../../pipelines/PipelineEditor';
import { PipelineList } from '../../pipelines/PipelineList';
import {
  listPipelinesForCanvas,
  savePipeline,
  deletePipeline,
  createEmptyPipeline
} from '../../services/pipelinesClient';
import { getWidgetLibrary } from '../../runtime/WidgetLibrary';

interface PipelinePanelProps {
  runtime: RuntimeContext;
}

type ViewMode = 'list' | 'editor';

export const PipelinePanel: React.FC<PipelinePanelProps> = ({ runtime }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get widget instances and manifests from runtime
  const widgetInstances = runtime.widgetInstances;
  const [manifests, setManifests] = useState<Map<string, WidgetManifest>>(new Map());

  // Load pipelines on mount
  useEffect(() => {
    loadPipelines();
  }, [runtime.canvasId]);

  // Load manifests for widgets from multiple sources
  useEffect(() => {
    const newManifests = new Map<string, WidgetManifest>();
    const library = getWidgetLibrary();

    widgetInstances.forEach(instance => {
      // Skip if we already have this manifest
      if (newManifests.has(instance.widgetDefId)) return;

      // Source 1: Try to get manifest from AI-generated widget metadata
      const generatedManifest = instance.metadata?.generatedContent?.manifest;
      if (generatedManifest) {
        newManifests.set(instance.widgetDefId, generatedManifest);
        return;
      }

      // Source 2: Try to get manifest from widget library
      const libraryWidget = library.get(instance.widgetDefId);
      if (libraryWidget?.manifest) {
        newManifests.set(instance.widgetDefId, libraryWidget.manifest);
        return;
      }

      // Source 3: Create a minimal manifest for unknown widgets
      // This ensures nodes are rendered even without full manifest data
      console.warn(`[PipelinePanel] No manifest found for widget ${instance.widgetDefId}, creating minimal manifest`);
      newManifests.set(instance.widgetDefId, {
        id: instance.widgetDefId,
        name: instance.widgetDefId.split('/').pop() || 'Unknown Widget',
        version: '1.0.0',
        entry: 'index.html',
        inputs: {},
        outputs: {},
      } as WidgetManifest);
    });

    setManifests(newManifests);
  }, [widgetInstances]);

  const loadPipelines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await listPipelinesForCanvas(runtime.canvasId);
      setPipelines(loaded);
    } catch (err) {
      setError('Failed to load pipelines');
      console.error('[PipelinePanel] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [runtime.canvasId]);

  const handleCreatePipeline = useCallback(() => {
    const newPipeline = createEmptyPipeline(runtime.canvasId, 'New Pipeline');
    setSelectedPipeline(newPipeline);
    setViewMode('editor');
  }, [runtime.canvasId]);

  const handleEditPipeline = useCallback((pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setViewMode('editor');
  }, []);

  const handleSavePipeline = useCallback(async (pipeline: Pipeline) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await savePipeline(pipeline);
      if (result.success) {
        // Update local state
        setPipelines(prev => {
          const exists = prev.find(p => p.id === pipeline.id);
          if (exists) {
            return prev.map(p => p.id === pipeline.id ? pipeline : p);
          }
          return [...prev, pipeline];
        });
        setViewMode('list');
        setSelectedPipeline(null);

        // Notify runtime to reload pipelines
        runtime.eventBus.emit({
          type: 'pipeline:saved',
          scope: 'canvas',
          payload: { pipeline }
        });
      } else {
        setError(result.error || 'Failed to save pipeline');
      }
    } catch (err) {
      setError('Failed to save pipeline');
      console.error('[PipelinePanel] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [runtime.eventBus]);

  const handleDeletePipeline = useCallback(async (pipelineId: string) => {
    if (!confirm('Delete this pipeline?')) return;

    try {
      const result = await deletePipeline(pipelineId);
      if (result.success) {
        setPipelines(prev => prev.filter(p => p.id !== pipelineId));
        
        // Notify runtime
        runtime.eventBus.emit({
          type: 'pipeline:deleted',
          scope: 'canvas',
          payload: { pipelineId }
        });
      } else {
        setError(result.error || 'Failed to delete pipeline');
      }
    } catch (err) {
      setError('Failed to delete pipeline');
    }
  }, [runtime.eventBus]);

  const handleCancel = useCallback(() => {
    setSelectedPipeline(null);
    setViewMode('list');
  }, []);

  // Styles
  const containerStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a2e',
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: viewMode === 'list' ? '16px' : '0',
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
          Loading pipelines...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem' }}>
            {viewMode === 'list' ? '🔗 Pipelines' : '✏️ Edit Pipeline'}
          </h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.75rem' }}>
            {viewMode === 'list' 
              ? `${pipelines.length} pipeline(s) • ${widgetInstances.length} widgets`
              : selectedPipeline?.name || 'New Pipeline'
            }
          </p>
        </div>
        {viewMode === 'list' && (
          <button style={buttonStyle} onClick={handleCreatePipeline}>
            + New Pipeline
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#fca5a5',
          fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={contentStyle}>
        {viewMode === 'list' ? (
          <PipelineListView
            pipelines={pipelines}
            onEdit={handleEditPipeline}
            onDelete={handleDeletePipeline}
            onCreate={handleCreatePipeline}
          />
        ) : (
          <PipelineEditor
            pipeline={selectedPipeline}
            widgetInstances={widgetInstances}
            manifests={manifests}
            onSave={handleSavePipeline}
            onCancel={handleCancel}
            canvasId={runtime.canvasId}
          />
        )}
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '8px 16px',
          background: 'rgba(139, 92, 246, 0.9)',
          borderRadius: '6px',
          color: 'white',
          fontSize: '0.85rem',
        }}>
          Saving...
        </div>
      )}
    </div>
  );
};

// Simple list view component
interface PipelineListViewProps {
  pipelines: Pipeline[];
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (pipelineId: string) => void;
  onCreate: () => void;
}

const PipelineListView: React.FC<PipelineListViewProps> = ({
  pipelines,
  onEdit,
  onDelete,
  onCreate
}) => {
  if (pipelines.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#64748b',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
        <div style={{ fontSize: '1rem', marginBottom: '8px', color: '#94a3b8' }}>
          No Pipelines Yet
        </div>
        <div style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
          Connect widgets together to create data flows
        </div>
        <button
          onClick={onCreate}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Create Your First Pipeline
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {pipelines.map(pipeline => (
        <div
          key={pipeline.id}
          style={{
            padding: '12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{
                fontWeight: 500,
                color: pipeline.enabled ? '#e2e8f0' : '#64748b',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {pipeline.name}
                {pipeline.enabled ? (
                  <span style={{
                    padding: '2px 6px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                  }}>
                    Active
                  </span>
                ) : (
                  <span style={{
                    padding: '2px 6px',
                    background: 'rgba(100, 116, 139, 0.2)',
                    color: '#64748b',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                  }}>
                    Disabled
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '4px',
              }}>
                {pipeline.connections.length} connection(s) • {pipeline.nodes.length} node(s)
              </div>
              {pipeline.description && (
                <div style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '6px',
                }}>
                  {pipeline.description}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onEdit(pipeline)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '4px',
                  color: '#a78bfa',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(pipeline.id)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '4px',
                  color: '#f87171',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PipelinePanel;

